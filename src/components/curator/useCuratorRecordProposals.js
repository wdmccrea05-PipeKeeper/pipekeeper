import { useCallback } from 'react';
import { executeActions, undoActionExecution } from '@/lib/actions/actionClient';

/**
 * Execution, reversal and audit bookkeeping for the actions Curator presents.
 *
 * Curator has no writer of its own: an accepted proposal is a framework action
 * and goes through the same executor as every other feature, which re-checks
 * ownership, entitlement, the field allowlist and whether the record still holds
 * the value the proposal was built from. A failure is reported as a failure.
 *
 * The idempotency key is derived from the message that carries the actions, so
 * pressing accept twice — or replying "apply" after already applying — cannot
 * write the same change twice.
 */
export default function useCuratorRecordProposals({ setMessages, setEntityContext, lastActionRunRef }) {
  const patchMessage = useCallback((messageId, patch) => {
    setMessages((prev) => prev.map((message) => {
      if (message.id !== messageId) return message;
      return typeof patch === 'function' ? { ...message, ...patch(message) } : { ...message, ...patch };
    }));
  }, [setMessages]);

  const applyActions = useCallback(async (message, { selections, alternatives } = {}) => {
    const actions = Array.isArray(message?.actions) ? message.actions : [];
    if (actions.length === 0) return null;

    patchMessage(message.id, { actionState: 'applying', actionError: '' });

    try {
      const outcome = await executeActions(actions, {
        selections: selections || message.actionSelections || {},
        alternatives: alternatives || message.actionAlternatives || {},
        idempotencyKey: `curator_${message.id}`,
      });

      if (!outcome || outcome.empty) {
        patchMessage(message.id, { actionState: 'idle' });
        return outcome;
      }

      const runIds = outcome.undoableExecutionIds || [];
      if (runIds.length > 0) lastActionRunRef.current = runIds[0];

      if (outcome.completed > 0) {
        const applied = (outcome.rows || []).filter((row) => row.status === 'completed');
        setEntityContext((prev) => ({
          ...prev,
          appliedChanges: [
            ...(Array.isArray(prev?.appliedChanges) ? prev.appliedChanges : []),
            ...applied.map((row) => ({
              name: row.name || row.recordId,
              fields: row.changedFields || [],
              at: new Date().toISOString(),
            })),
          ],
        }));
      }

      patchMessage(message.id, {
        actionState: outcome.ok ? 'applied' : 'failed',
        actionResult: outcome,
        actionRunIds: runIds,
      });

      return outcome;
    } catch (error) {
      patchMessage(message.id, {
        actionState: 'failed',
        actionError: error?.message || 'The change could not be saved.',
      });
      return null;
    }
  }, [patchMessage, setEntityContext, lastActionRunRef]);

  const runUndo = useCallback(async (messageId, runId) => {
    if (!runId) {
      patchMessage(messageId, {
        actionError: 'There is no change from this conversation for me to reverse. Nothing was touched.',
      });
      return null;
    }

    patchMessage(messageId, { actionState: 'applying', actionError: '' });

    try {
      const data = await undoActionExecution(runId);
      const reversed = Array.isArray(data?.reversed) ? data.reversed : [];

      if (reversed.length === 0) {
        const reason = String(data?.skipped?.[0]?.reason || 'nothing could be reversed').replace(/_/g, ' ');
        patchMessage(messageId, {
          actionState: 'failed',
          actionError: `I could not reverse that change (${reason}). Your records are unchanged.`,
        });
        return data;
      }

      if (lastActionRunRef.current === runId) lastActionRunRef.current = null;
      patchMessage(messageId, (current) => ({
        actionState: 'applied',
        actionRunIds: [],
        actionError: '',
        actionResult: {
          ...(current.actionResult || {}),
          undone: true,
          undoMessage: data?.message || 'The change was reversed — the record holds its previous values again.',
        },
      }));
      return data;
    } catch (error) {
      patchMessage(messageId, {
        actionState: 'failed',
        actionError: 'I could not reach the server to reverse that change, so nothing was altered.',
      });
      return null;
    }
  }, [patchMessage, lastActionRunRef]);

  const undoMessage = useCallback((message) => {
    const runId = message?.actionRunIds?.[0] || lastActionRunRef.current;
    return runUndo(message.id, runId);
  }, [runUndo, lastActionRunRef]);

  return { applyActions, undoMessage, runUndo };
}