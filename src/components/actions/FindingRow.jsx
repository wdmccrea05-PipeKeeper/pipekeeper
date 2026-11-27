import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Clock, ExternalLink, X } from 'lucide-react';
import { ACTION_LABELS } from '@/lib/actions/actionLabels';

/**
 * One finding in a review list.
 *
 * Selectable when it can be fixed here, a plain row with links when it can only
 * be documented on the record. Defer and dismiss are always available and never
 * change the record.
 */
export default function FindingRow({
  finding,
  selected = false,
  onSelect,
  status = null,
  busy = false,
  onDefer,
  onDismiss,
}) {
  const [showWhy, setShowWhy] = useState(false);
  const actionable = (finding?.actions || []).length > 0;
  const deferred = status === 'deferred';

  return (
    <div
      className="rounded-[14px] p-3 sm:p-4 min-w-0"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: `1px solid ${selected ? 'rgba(198,161,91,0.5)' : 'rgba(180,140,75,0.18)'}`,
      }}
    >
      <div className="flex items-start gap-3 min-w-0">
        {actionable && onSelect ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(!selected)}
            disabled={busy}
            className="mt-1 shrink-0"
            style={{ width: 20, height: 20 }}
            aria-label={finding?.title}
          />
        ) : (
          <span className="mt-1 shrink-0" style={{ width: 20 }} aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] sm:text-[15px] font-semibold break-words" style={{ color: '#F5F1E7' }}>
              {finding?.title}
            </p>
            {deferred && (
              <span
                className="text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(198,161,91,0.16)', color: '#D4A574' }}
              >
                {ACTION_LABELS.deferred}
              </span>
            )}
            {!actionable && (
              <span
                className="text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(224,216,200,0.6)' }}
              >
                On the record
              </span>
            )}
          </div>

          {finding?.description && (
            <p className="text-[13px] leading-6 mt-1 break-words" style={{ color: '#B8B2A5' }}>
              {finding.description}
            </p>
          )}
          {finding?.hint && (
            <p className="text-[12px] leading-5 mt-1 break-words" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {finding.hint}
            </p>
          )}

          {actionable && (
            <>
              <button
                type="button"
                onClick={() => setShowWhy((open) => !open)}
                aria-expanded={showWhy}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold"
                style={{ color: '#C6A15B', background: 'transparent', border: 'none', padding: 0, minHeight: 32 }}
              >
                <ChevronDown
                  className="w-3.5 h-3.5"
                  style={{ transform: showWhy ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
                />
                {showWhy ? ACTION_LABELS.hideExplanation : ACTION_LABELS.explain}
              </button>
              {showWhy && (
                <div className="mt-1.5 space-y-1">
                  {(finding.actions || []).map((action) => (
                    <p key={action.id} className="text-[12.5px] leading-6 break-words" style={{ color: '#B8B2A5' }}>
                      {action.rationale || action.description}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {(finding?.links || []).map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="inline-flex items-center gap-1 text-[12px] font-semibold min-h-[40px] py-2"
                style={{ color: '#C6A15B' }}
              >
                <ExternalLink className="w-3.5 h-3.5" /> {link.label || ACTION_LABELS.viewRecords}
              </Link>
            ))}
            {onDefer && (
              <button
                type="button"
                onClick={() => onDefer(finding)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold min-h-[40px]"
                style={{ background: 'transparent', color: '#E0D8C8', border: '1px solid rgba(180,140,75,0.28)' }}
              >
                <Clock className="w-3.5 h-3.5" /> {ACTION_LABELS.defer}
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(finding)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold min-h-[40px]"
                style={{ background: 'transparent', color: 'rgba(224,216,200,0.7)', border: '1px solid rgba(180,140,75,0.18)' }}
              >
                <X className="w-3.5 h-3.5" /> {ACTION_LABELS.dismiss}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}