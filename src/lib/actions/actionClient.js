import { base44 } from '@/api/base44Client';
import {
  buildExecutionPayload,
  newIdempotencyKey,
  summarizeExecution,
} from './actionModel';

/**
 * The only way the interface writes through the Universal Action Framework.
 *
 * Nothing here decides what is allowed: the executor re-checks ownership,
 * entitlement, the field allowlist and whether the proposal is still current.
 * This module exists so every feature sends the same shape and reads the same
 * result, including partial failures.
 *
 * A refusal (not entitled, not permitted, already reversed) arrives as an HTTP
 * error carrying the server's own sentence. That sentence is what the collector
 * sees — never "Request failed with status code 403".
 */
function serverMessage(error, fallback) {
  const data = error?.response?.data || error?.data || null;
  const message = data?.reason || data?.error || error?.message || '';
  if (!message || /status code/i.test(message)) return fallback;
  return message;
}

export async function executeActions(actions, { selections, alternatives, idempotencyKey } = {}) {
  const payload = buildExecutionPayload(actions, {
    selections,
    alternatives,
    idempotencyKey: idempotencyKey || newIdempotencyKey(),
  });

  if (payload.actions.length === 0) {
    return {
      ok: false,
      empty: true,
      message: 'Nothing was selected.',
      ...summarizeExecution({ actions: [] }),
    };
  }

  let response;
  try {
    response = await base44.functions.invoke('actionExecute', payload);
  } catch (error) {
    throw new Error(serverMessage(error, 'The change could not be saved.'));
  }

  const data = response?.data || {};
  if (data?.error) {
    throw new Error(data.reason || data.error);
  }

  const summary = summarizeExecution(data);
  return { ok: summary.status === 'completed' || summary.status === 'partial', ...summary, raw: data };
}

export async function undoActionExecution(executionId) {
  let response;
  try {
    response = await base44.functions.invoke('actionExecute', {
      mode: 'undo',
      execution_id: executionId,
    });
  } catch (error) {
    throw new Error(serverMessage(error, 'That change could not be reversed.'));
  }

  const data = response?.data || {};
  if (data?.error) throw new Error(data.error);
  return data;
}

export { newIdempotencyKey };