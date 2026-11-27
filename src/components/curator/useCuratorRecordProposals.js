import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Confirmation, cancellation and reversal for changes Curator proposes.
 *
 * The proposal a collector sees is never the authority: every action goes back
 * through the backend, which re-checks ownership and field rules, and reports
 * what it actually did. A failure is shown as a failure — never as a success.
 */
export default function useCuratorRecordProposals({ setMessages, setEntityContext, lastActionRunRef }) {
  const patchMessage = useCallback((messageId, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m)));
  }, [setMessages]);

  const confirmProposal = useCallback(async (message) => {
    const proposal = message?.proposal;
    if (!proposal || message.proposalState !== 'proposed') return;

    patchMessage(message.id, { proposalState: 'applying' });

    try {
      let data;
      if (proposal.actionType === 'merge') {
        const response = await base44.functions.invoke('collectionItemMerge', {
          entityName: proposal.entityName,
          targetId: proposal.targetId,
          sourceIds: proposal.sourceIds,
          confirm: true,
        });
        data = response?.data || {};
      } else {
        const response = await base44.functions.invoke('curatorRecordChange', {
          mode: 'apply',
          entityName: proposal.entityName,
          ids: proposal.ids,
          patch: proposal.patch,
        });
        data = response?.data || {};
      }

      const appliedCount = Array.isArray(data.applied) ? data.applied.length : 0;
      const succeeded = proposal.actionType === 'merge' ? !data?.error : appliedCount > 0;

      if (!succeeded) {
        patchMessage(message.id, {
          proposalState: 'failed',
          proposalResult: {
            error: data?.error || data?.skipped?.[0]?.reason || 'No record was changed',
          },
        });
        return;
      }

      if (data?.action_run_id) lastActionRunRef.current = data.action_run_id;

      setEntityContext((prev) => ({
        ...prev,
        appliedChanges: [
          ...(Array.isArray(prev?.appliedChanges) ? prev.appliedChanges : []),
          {
            name: proposal.recordName,
            fields: (proposal.changes || []).map((change) => change.label),
            at: new Date().toISOString(),
          },
        ],
      }));

      patchMessage(message.id, {
        proposalState: 'applied',
        proposalResult: data,
        actionRunId: data?.action_run_id || null,
      });
    } catch (error) {
      patchMessage(message.id, {
        proposalState: 'failed',
        proposalResult: { error: error?.message || 'The change could not be saved' },
      });
    }
  }, [patchMessage, setEntityContext, lastActionRunRef]);

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
      const response = await base44.functions.invoke('curatorRecordChange', {
        mode: 'undo',
        action_run_id: runId,
      });
      const data = response?.data || {};
      const undone = Array.isArray(data.undone) ? data.undone : [];

      if (undone.length === 0) {
        const reason = data?.error || data?.skipped?.[0]?.reason || 'nothing could be reversed';
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