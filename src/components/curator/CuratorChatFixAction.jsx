import { Check, Loader2 } from 'lucide-react';

/**
 * In-chat apply button for a Curator-suggested change (e.g. estimated drinking
 * windows). Renders the applied/failed state inline so the answer and its result
 * stay in one place.
 */
export default function CuratorChatFixAction({ count = 0, state = 'idle', note = null, onApply }) {
  const applying = state === 'applying';
  const applied = state === 'applied';
  const failed = state === 'failed';

  const label = applied
    ? 'Applied'
    : applying
    ? 'Saving…'
    : `Estimate drinking windows for ${count} wine${count === 1 ? '' : 's'}`;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onApply}
        disabled={applying || applied}
        className="inline-flex items-center gap-2 h-11 px-4 rounded-[12px] text-[13px] font-semibold"
        style={{
          background: applied ? 'rgba(46,125,92,0.18)' : '#C6A15B',
          color: applied ? '#8FD3B4' : '#0B0B0C',
          border: applied ? '1px solid rgba(46,125,92,0.45)' : '1px solid transparent',
          opacity: applying ? 0.7 : 1,
          cursor: applying || applied ? 'default' : 'pointer',
        }}
      >
        {applying && <Loader2 className="w-4 h-4 animate-spin" />}
        {applied && <Check className="w-4 h-4" />}
        {label}
      </button>
      {note && (
        <p className="text-[12px] mt-2" style={{ color: failed ? '#D8A657' : '#8FD3B4' }}>
          {note}
        </p>
      )}
    </div>
  );
}