import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Clock, HelpCircle, ChevronDown, AlertTriangle, ExternalLink } from 'lucide-react';
import { actionTypeLabel, isHighImpact } from '@/lib/actions/actionRegistry';
import { ACTION_LABELS } from '@/lib/actions/actionLabels';

/**
 * One actionable proposal, in the same shape wherever it appears: Curator, the
 * hub, a report finding or a module panel. Shows what would change and offers
 * accept, defer, reject, explain and open-the-record — nothing is written here.
 */
export default function ActionCard({
  action,
  mode = 'checkbox',
  selected = false,
  onSelect,
  alternativeId = null,
  onAlternative,
  onReview,
  onDefer,
  onReject,
  deferred = false,
  rejected = false,
  disabled = false,
}) {
  const [showWhy, setShowWhy] = useState(false);
  const inert = deferred || rejected;
  const alternatives = action?.alternatives || [];

  return (
    <div
      className="rounded-[14px] p-3 sm:p-4 min-w-0"
      style={{
        background: 'rgba(198,161,91,0.07)',
        border: '1px solid rgba(198,161,91,0.24)',
        opacity: inert ? 0.62 : 1,
      }}
    >
      <div className="flex items-start gap-3 min-w-0">
        {onSelect && (
          <input
            type={mode === 'radio' ? 'radio' : 'checkbox'}
            checked={selected}
            onChange={() => onSelect(!selected)}
            disabled={disabled || inert}
            className="mt-1 shrink-0"
            style={{ width: 20, height: 20 }}
            aria-label={action?.title || actionTypeLabel(action?.type)}
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] sm:text-[15px] font-semibold break-words" style={{ color: '#F5F1E7' }}>
              {action?.title || actionTypeLabel(action?.type)}
            </p>
            {isHighImpact(action?.type) && (
              <span
                className="text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(179,95,95,0.18)', color: '#E0A0A0' }}
              >
                <AlertTriangle className="inline w-3 h-3 mr-1" />Needs confirmation
              </span>
            )}
          </div>

          {action?.description && (
            <p className="text-[13px] leading-6 mt-1 break-words" style={{ color: '#B8B2A5' }}>
              {action.description}
            </p>
          )}

          {(action?.currentValues?.length > 0 || action?.proposedValues?.length > 0) && (
            <div className="mt-2 space-y-1">
              {(action.proposedValues.length > 0 ? action.proposedValues : action.currentValues).map((row, index) => (
                <div key={`${row.label}-${index}`} className="text-[12.5px] leading-6 break-words" style={{ color: '#B8B2A5' }}>
                  <span style={{ color: 'rgba(224,216,200,0.7)' }}>{row.label}: </span>
                  {row.from !== undefined && (
                    <>
                      <span className="line-through" style={{ color: '#8A8578' }}>{row.from}</span>
                      <span style={{ color: '#8A8578' }}> → </span>
                    </>
                  )}
                  <span style={{ color: '#C6A15B' }}>{row.to ?? row.value}</span>
                </div>
              ))}
            </div>
          )}

          {alternatives.length > 1 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-[11px] uppercase tracking-[0.1em]" style={{ color: 'rgba(224,216,200,0.5)' }}>
                Choose one
              </p>
              {alternatives.map((alternative) => (
                <label key={alternative.id} className="flex items-start gap-2 cursor-pointer min-w-0">
                  <input
                    type="radio"
                    name={`alt-${action.id}`}
                    checked={alternativeId === alternative.id}
                    onChange={() => onAlternative && onAlternative(alternative.id)}
                    disabled={disabled || inert}
                    className="mt-1 shrink-0"
                  />
                  <span className="text-[12.5px] leading-5 break-words" style={{ color: '#E0D8C8' }}>
                    {alternative.label}
                    {alternative.description ? (
                      <span style={{ color: 'rgba(224,216,200,0.55)' }}> — {alternative.description}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          )}

          {(action?.rationale || action?.evidence?.length > 0) && (
            <>
              <button
                type="button"
                onClick={() => setShowWhy((open) => !open)}
                aria-expanded={showWhy}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold"
                style={{ color: '#C6A15B', background: 'transparent', border: 'none', padding: 0 }}
              >
                <ChevronDown
                  className="w-3.5 h-3.5"
                  style={{ transform: showWhy ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
                />
                {showWhy ? ACTION_LABELS.hideExplanation : ACTION_LABELS.explain}
              </button>
              {showWhy && (
                <div className="mt-2 space-y-1.5">
                  {action.rationale && (
                    <p className="text-[12.5px] leading-6 break-words" style={{ color: '#B8B2A5' }}>
                      {action.rationale}
                    </p>
                  )}
                  {action.evidence.map((item, index) => (
                    <p key={index} className="text-[12px] leading-5 break-words" style={{ color: 'rgba(224,216,200,0.55)' }}>
                      • {typeof item === 'string' ? item : item?.label || ''}
                    </p>
                  ))}
                  {action.confidence && (
                    <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.45)' }}>
                      Confidence: {action.confidence}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {onReview && !inert && (
              <button
                type="button"
                onClick={() => onReview(action)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold min-h-[40px]"
                style={{ background: '#A35C5C', color: '#fff', border: 'none' }}
              >
                <Check className="w-3.5 h-3.5" /> {ACTION_LABELS.reviewChanges}
              </button>
            )}
            {onDefer && !inert && (
              <button
                type="button"
                onClick={() => onDefer(action)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold min-h-[40px]"
                style={{ background: 'transparent', color: '#E0D8C8', border: '1px solid rgba(180,140,75,0.3)' }}
              >
                <Clock className="w-3.5 h-3.5" /> {ACTION_LABELS.defer}
              </button>
            )}
            {onReject && !inert && (
              <button
                type="button"
                onClick={() => onReject(action)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold min-h-[40px]"
                style={{ background: 'transparent', color: 'rgba(224,216,200,0.7)', border: '1px solid rgba(180,140,75,0.18)' }}
              >
                <X className="w-3.5 h-3.5" /> {ACTION_LABELS.dismiss}
              </button>
            )}
            {(action?.recordLinks || []).slice(0, 2).map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="inline-flex items-center gap-1 text-[12px] font-semibold"
                style={{ color: '#C6A15B' }}
              >
                <ExternalLink className="w-3.5 h-3.5" /> {link.label || ACTION_LABELS.viewRecords}
              </Link>
            ))}
          </div>

          {deferred && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[12px]" style={{ color: 'rgba(224,216,200,0.55)' }}>
              <HelpCircle className="w-3.5 h-3.5" /> Set aside for now. Nothing was changed.
            </p>
          )}
          {rejected && (
            <p className="mt-2 text-[12px]" style={{ color: 'rgba(224,216,200,0.55)' }}>
              Dismissed. Nothing was changed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}