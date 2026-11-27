import React, { useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { effectiveTargets, requiresExplicitConfirm } from '@/lib/actions/actionModel';
import { actionTypeLabel } from '@/lib/actions/actionRegistry';
import { ACTION_LABELS } from '@/lib/actions/actionLabels';

/**
 * The confirmation step for accepted actions.
 *
 * Review-level actions show what will change and need one press. Actions that are
 * destructive, financial or privacy-sensitive additionally require an explicit
 * acknowledgement, because those are the ones a collector cannot simply undo by
 * changing their mind later.
 */
export default function ActionReviewDialog({
  open,
  actions = [],
  alternatives = {},
  busy = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (open) setAcknowledged(false);
  }, [open]);

  const explicit = actions.some((action) => requiresExplicitConfirm(action));
  const blocked = explicit && !acknowledged;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actions.length === 1 ? 'Confirm this change' : `Confirm ${actions.length} changes`}</DialogTitle>
          <DialogDescription>
            Nothing has been written yet. These are the exact changes that will be applied.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {actions.map((action) => {
            const targets = effectiveTargets(action, alternatives[action.id]);
            return (
              <div
                key={action.id}
                className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.18)' }}
              >
                <p className="text-[13px] font-semibold break-words" style={{ color: '#F5F1E7' }}>
                  {action.title || actionTypeLabel(action.type)}
                </p>

                {(action.proposedValues || []).length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    {action.proposedValues.map((row, index) => (
                      <p key={index} className="text-[12.5px] leading-6 break-words" style={{ color: '#B8B2A5' }}>
                        <span style={{ color: 'rgba(224,216,200,0.7)' }}>{row.label}: </span>
                        {row.from !== undefined && (
                          <>
                            <span className="line-through" style={{ color: '#8A8578' }}>{row.from}</span>
                            <span style={{ color: '#8A8578' }}> → </span>
                          </>
                        )}
                        <span style={{ color: '#C6A15B' }}>{row.to ?? row.value}</span>
                      </p>
                    ))}
                  </div>
                )}

                <p className="mt-1.5 text-[11.5px] break-words" style={{ color: 'rgba(224,216,200,0.5)' }}>
                  {targets.length} record{targets.length === 1 ? '' : 's'}
                  {targets.length <= 3 && targets.length > 0
                    ? `: ${targets.map((target) => target.name || target.recordId).join(', ')}`
                    : ''}
                </p>
              </div>
            );
          })}
        </div>

        {explicit && (
          <label className="mt-4 flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-1 shrink-0"
              style={{ width: 18, height: 18 }}
            />
            <span className="text-[12.5px] leading-5 break-words" style={{ color: '#E0D8C8' }}>
              I understand this is hard to reverse and want to apply it.
            </span>
          </label>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 text-[12.5px]" style={{ color: '#E0A0A0' }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {ACTION_LABELS.cancel}
          </Button>
          <Button onClick={onConfirm} disabled={busy || blocked}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {busy ? 'Applying…' : ACTION_LABELS.accept}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}