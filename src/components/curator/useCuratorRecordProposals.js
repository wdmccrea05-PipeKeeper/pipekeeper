import { useCallback } from 'react';
import { executeActions, undoActionExecution } from '@/lib/actions/actionClient';
import { createAction } from '@/lib/actions/actionModel';

/**
 * Confirmation, cancellation and reversal for changes Curator proposes.
 *
 * Curator no longer has its own write path: a proposal becomes a framework action
 * and goes through the same executor as every other feature, which re-checks
 * ownership, the field allowlist and whether the record still holds the value the
 * proposal was built from. A failure is shown as a failure — never as a success.
 */
export default function useCuratorRecordProposals({ setMessages, setEntityContext, lastActionRunRef }) {
  const patchMessage = useCallback((messageId, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m)));
  }, [setMessages]);

  const buildCuratorAction = useCallback((proposal, messageId) => {
    const change = (proposal.changes || [])[0] || {};
    const patchFields = Object.keys(proposal.patch || {});
    const isStorage = patchFields.length > 0
      && patchFields.every((field) => field === 'storage_location_id' || field === 'humidor_id');

    const type = proposal.actionType === 'merge'
      ? 'record_merge'
      : isStorage
        ? 'storage_assign'
        : 'record_update';

    const targets = proposal.actionType === 'merge'
      ? [
        {
          entity: proposal.entityName,
          recordId: proposal.targetId,
          name: proposal.targetName,
          role: 'survivor',
        },
        ...(proposal.sourceIds || []).map((id, index) => ({
          entity: proposal.entityName,
          recordId: id,
          name: (proposal.sourceNames || [])[index] || '',
          role: 'source',
        })),
      ]
      : (proposal.ids || []).map((id, index) => ({
        entity: proposal.entityName,
        recordId: id,
        name: (proposal.recordNames || [])[index] || proposal.recordName,
        // The value the proposal was built against, so a record edited in the
        // meantime is reported stale instead of being overwritten.
        expected: change.field && change.fromRaw !== undefined
          ? { [change.field]: change.fromRaw }
          : null,
        patch: proposal.patch,
      }));

    return createAction({
      id: `curator_${messageId}`,
      type,
      origin: 'curator',
      module: proposal.moduleKey,
      title: proposal.summary || '',
      targets,
      currentValues: (proposal.changes || []).map((entry) => ({
        label: entry.label,
        from: entry.from,
        to: entry.to,
      })),
      undoEligible: proposal.undoable === true,
    });
  }, []);

  const confirmProposal = useCallback(async (message) => {
    const proposal = message?.proposal;
    if (!proposal || message.proposalState !== 'proposed') return;

    patchMessage(message.id, { proposalState: 'applying' });

    try {
      const action = buildCuratorAction(proposal, message.id);
      const outcome = await executeActions([action], { idempotencyKey: `curator_${message.id}` });

      if (!outcome || outcome.completed === 0) {
        const failure = (outcome?.rows || []).find((row) => row.status === 'failed');
        patchMessage(message.id, {
          proposalState: 'failed',
          proposalResult: {
            error: failure?.reason || outcome?.message || 'No record was changed',
          },
        });
        return;
      }

      const runId = (outcome.undoableExecutionIds || [])[0] || null;
      if (runId) lastActionRunRef.current = runId;

      setEntityContext((prev) => ({
        ...prev,
        appliedChanges: [
          ...(Array.isArray(prev?.appliedChanges) ? prev.appliedChanges : []),
          {
            name: proposal.recordName || proposal.targetName,
            fields: (proposal.changes || []).map((change) => change.label),
            at: new Date().toISOString(),
          },
        ],
      }));

      patchMessage(message.id, {
        proposalState: 'applied',
        proposalResult: {
          applied: (outcome.rows || []).filter((row) => row.status === 'completed'),
          skipped: (outcome.rows || []).filter((row) => row.status !== 'completed'),
        },
        actionRunId: runId,
      });
    } catch (error) {
      patchMessage(message.id, {
        proposalState: 'failed',
        proposalResult: { error: error?.message || 'The change could not be saved' },
      });
    }
  }, [buildCuratorAction, patchMessage, setEntityContext, lastActionRunRef]);

  const cancelProposal = useCallback((message) => {
    if (!message || message.proposalState !== 'proposed') return;
    patchMessage(message.id, { proposalState: 'cancelled' });
  }, [patchMessage]);

  const runUndo = useCallback(async (messageId, runId) => {
    if (!runId) {
      patchMessage(messageId, {
        proposalState: 'failed',
        content: 'There is no change from this conversation for me to reverse. Nothing was touched.',
        proposalResult: { error: 'There is no change from this conversation to reverse' },
      });
      return;
    }

    patchMessage(messageId, { proposalState: 'applying' });

    try {
      const data = await undoActionExecution(runId);
      const reversed = Array.isArray(data?.reversed) ? data.reversed : [];

      if (reversed.length === 0) {
        const reason = data?.skipped?.[0]?.reason || 'nothing could be reversed';
        patchMessage(messageId, {
          proposalState: 'failed',
          content: `I could not reverse that change (${reason}). Your records are unchanged.`,
          proposalResult: { error: reason },
        });
        return;
      }

      if (lastActionRunRef.current === runId) lastActionRunRef.current = null;
      patchMessage(messageId, {
        proposalState: 'undone',
        content: 'That change has been reversed — the record holds its previous values again.',
        proposalResult: data,
      });
    } catch (error) {
      patchMessage(messageId, {
        proposalState: 'failed',
        content: 'I could not reach the server to reverse that change, so nothing was altered. Try again in a moment.',
        proposalResult: { error: error?.message || 'The change could not be reversed' },
      });
    }
  }, [patchMessage, lastActionRunRef]);

  const undoProposal = useCallback((message) => {
    if (!message?.actionRunId) return;
    return runUndo(message.id, message.actionRunId);
  }, [runUndo]);

  return { confirmProposal, cancelProposal, undoProposal, runUndo };
}