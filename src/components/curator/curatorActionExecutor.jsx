/**
 * curatorActionExecutor.jsx
 *
 * Low-level LLM call layer for Curator action workflows.
 *
 * Strategy:
 *   1. Call base44.functions.invoke('invokeCuratorLLM', payload) — the dedicated
 *      server-side function with prompt caching, rate-limiting, and telemetry.
 *   2. On failure, surface the error directly. No fallback direct InvokeLLM —
 *      credit exhaustion and provider failures must not trigger a second
 *      paid integration attempt.
 *
 * The result is always parsed JSON matching:
 *   { summary: string, items: ActionItem[] }
 *
 * Throws with a user-facing message when no usable response is produced.
 */

import { base44 } from '@/api/base44Client';
import { buildSafeCollectionContext, buildPromptBlock } from './collectionContextBudget';

const inflightCuratorRequests = new Map();
const INFLIGHT_DEDUPE_WINDOW_MS = 15_000;
const DEDUPE_CONTEXT_SAMPLE_LENGTH = 1_200;

function getInFlightRequestKey(actionType, contextBlock) {
  return `${actionType || 'unknown'}::${String(contextBlock || '').slice(0, DEDUPE_CONTEXT_SAMPLE_LENGTH)}`;
}

/**
 * Execute a Curator action against the LLM and return the parsed result.
 *
 * @param {{
 *   actionType: string,
 *   context:    object,   // raw collection context { pipes, blends, bottles, ... }
 *   requestId:  string,
 * }} options
 *
 * @returns {Promise<{ summary: string, items: object[] }>}
 */
export default async function curatorActionExecutor({ actionType, context, requestId } = {}) {
  // Build a token-safe compressed context block for the prompt
  const safeContext = buildSafeCollectionContext(context || {});
  const contextBlock = buildPromptBlock(safeContext);
  const inFlightKey = getInFlightRequestKey(actionType, contextBlock);

  const existing = inflightCuratorRequests.get(inFlightKey);
  if (existing && Date.now() - existing.startedAt < INFLIGHT_DEDUPE_WINDOW_MS) {
    return existing.promise;
  }

  const payload = {
    actionType,
    contextBlock,
    requestId: requestId || `req_${Date.now()}`,
  };

  const requestPromise = (async () => {
    let responseText;

    // ── Single path: dedicated server function ───────────────────────────────
    // The backend function handles prompt caching, rate-limiting, telemetry,
    // and error classification. No fallback — one Curator question = one LLM call.
    try {
      const fnResult = await base44.functions.invoke('invokeCuratorLLM', payload);
      const fnPayload = fnResult?.data ?? fnResult;
      responseText = typeof fnPayload === 'string'
        ? fnPayload
        : fnPayload?.result || fnPayload?.text || fnPayload?.content;
    } catch (err) {
      throw new Error(`Curator LLM call failed: ${err?.message || err}`);
    }

    if (!responseText) {
      throw new Error('Curator returned no response.');
    }

    // ── Parse JSON ────────────────────────────────────────────────────────────
    const text = typeof responseText === 'string' ? responseText.trim() : '';
    if (!text) {
      throw new Error('Curator returned no response.');
    }

    try {
      return JSON.parse(text);
    } catch {
      // Try fenced code block
      const fenced = text.match(/```json\s*([\s\S]*?)```/i);
      if (fenced?.[1]) return JSON.parse(fenced[1].trim());

      // Try bare object
      const bare = text.match(/\{[\s\S]*\}$/);
      if (bare?.[0]) return JSON.parse(bare[0]);

      throw new Error('Curator response was not valid JSON.');
    }
  })();

  inflightCuratorRequests.set(inFlightKey, { startedAt: Date.now(), promise: requestPromise });

  try {
    return await requestPromise;
  } finally {
    inflightCuratorRequests.delete(inFlightKey);
  }
}