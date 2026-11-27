import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { executeActions, undoActionExecution } from '@/lib/actions/actionClient';
import { newIdempotencyKey } from '@/lib/actions/actionModel';

/**
 * One execution state machine for every feature that accepts an action.
 *
 * idle → executing → done | failed. Undo is a second call on the same run, and
 * affected records, dashboards and reports are refreshed from the server rather
 * than patched locally, so what the collector sees afterwards is what was stored.
 */
export default function useActionExecution({ onApplied } = {}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    queryClient.invalidateQueries();
    if (onApplied) onApplied();
  }, [queryClient, onApplied]);

  const execute = useCallback(async (actions, options = {}) => {
    setStatus('executing');
    setError('');
    setResult(null);
    try {
      const outcome = await executeActions(actions, {
        selections: options.selections,
        alternatives: options.alternatives,
        idempotencyKey: options.idempotencyKey || newIdempotencyKey(),
      });

      if (outcome.empty) {
        setStatus('idle');
        return outcome;
      }

      setResult(outcome);
      setStatus(outcome.ok ? 'done' : 'failed');
      if (outcome.completed > 0) refresh();
      return outcome;
    } catch (executionError) {
      setError(executionError?.message || 'The action could not be completed.');
      setStatus('failed');
      return null;
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