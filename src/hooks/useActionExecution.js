import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { executeActions, undoActionExecution } from '@/lib/actions/actionClient';
import { newIdempotencyKey } from '@/lib/actions/actionModel';

/**
 * One execution state machine for every feature that accepts an action.
 *
 * idle → executing → done | failed. Three guarantees live here so no surface has
 * to reimplement them:
 *
 *   - A second press cannot submit twice: while a request is in flight the
 *     caller joins it rather than starting another.
 *   - A dropped connection is retried once with the SAME idempotency key, so the
 *     executor answers with the run it already recorded instead of writing the
 *     change a second time. If it still cannot be confirmed, the outcome is
 *     reported as unknown — never as a success — and the data is reloaded so the
 *     collector sees what the server actually holds.
 *   - Every outcome refreshes the affected records, dashboards and reports from
 *     the server instead of patching them locally.
 */
export default function useActionExecution({ onApplied } = {}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inFlight = useRef(null);
  const attemptKey = useRef(null);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries();
    if (onApplied) onApplied();
  }, [queryClient, onApplied]);

  const execute = useCallback(async (actions, options = {}) => {
    if (inFlight.current) return inFlight.current;

    const run = (async () => {
      setStatus('executing');
      setError('');
      setResult(null);

      const idempotencyKey = options.idempotencyKey || attemptKey.current || newIdempotencyKey();
      attemptKey.current = idempotencyKey;

      const send = () =>
        executeActions(actions, {
          selections: options.selections,
          alternatives: options.alternatives,
          idempotencyKey,
        });

      let outcome;
      try {
        outcome = await send();
      } catch {
        try {
          outcome = await send();
        } catch {
          attemptKey.current = null;
          setError(
            'The connection dropped before this could be confirmed. Your records have been reloaded — check the record before trying again.'
          );
          setStatus('failed');
          refresh();
          return null;
        }
      }

      attemptKey.current = null;

      if (outcome.empty) {
        setError(outcome.message || 'Nothing was selected, so nothing was changed.');
        setStatus('idle');
        return outcome;
      }

      setResult(outcome);
      setStatus(outcome.ok ? 'done' : 'failed');
      // Any outcome refreshes: a refused or partial run usually means the record
      // moved, and a stale proposal must not be offered again as if it were current.
      refresh();
      return outcome;
    })();

    inFlight.current = run;
    try {
      return await run;
    } finally {
      inFlight.current = null;
    }
  }, [refresh]);

  const undo = useCallback(async (executionId) => {
    if (!executionId) return null;
    setStatus('executing');
    try {
      const outcome = await undoActionExecution(executionId);
      setStatus('idle');
      setResult((prev) => (prev ? { ...prev, undone: true, undoMessage: outcome?.message || '' } : prev));
      refresh();
      return outcome;
    } catch (undoError) {
      setError(undoError?.message || 'The change could not be reversed.');
      setStatus('failed');
      return null;
    }
  }, [refresh]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError('');
  }, []);

  return { status, result, error, execute, undo, reset };
}