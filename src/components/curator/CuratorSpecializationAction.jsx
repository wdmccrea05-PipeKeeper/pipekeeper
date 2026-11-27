import React, { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { specializationLabel } from '@/lib/collection/specialization';

/**
 * In-chat specialization change proposed by Curator.
 *
 * The change is never applied on the model's word: the collector confirms it
 * first, and only then is the pipe updated and a dated history entry written.
 */
export default function CuratorSpecializationAction({ action, state = 'idle', note = null, onApply }) {
  const [confirming, setConfirming] = useState(false);
  const applying = state === 'applying';
  const applied = state === 'applied';
  const failed = state === 'failed';
  const target = specializationLabel(action?.focus?.[0]);

  if (applied || failed) {
    return (
      <p className="text-[12px] mt-2" style={{ color: failed ? '#D8A657' : '#8FD3B4' }}>
        {note || (applied ? 'Specialization updated.' : 'That change could not be saved.')}
      </p>
    );
  }

  if (!confirming) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-[12px] text-[13px] font-semibold"
          style={{ background: '#C6A15B', color: '#0B0B0C', border: '1px solid transparent' }}
        >
          Set specialization to {target}
        </button>
        <p className="text-[11px] mt-2" style={{ color: '#6F675C' }}>
          {action?.current?.length ? `Currently ${action.current.join(', ')}. ` : ''}
          Confidence: {action?.confidence || 'low'}. You will be asked to confirm.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-[13px]" style={{ color: '#E4C88A' }}>
        Change {action?.pipeName || 'this pipe'} to {target}?
      </span>
      <button
        type="button"
        onClick={onApply}
        disabled={applying}
        className="inline-flex items-center gap-1.5 h-11 px-4 rounded-[12px] text-[13px] font-semibold"
        style={{ background: '#C6A15B', color: '#0B0B0C', opacity: applying ? 0.7 : 1 }}
      >
        {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Confirm
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={applying}
        className="inline-flex items-center gap-1.5 h-11 px-4 rounded-[12px] text-[13px] font-semibold"
        style={{ background: 'transparent', color: '#E0D8C8', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <X className="w-4 h-4" /> Cancel
      </button>
    </div>
  );
}