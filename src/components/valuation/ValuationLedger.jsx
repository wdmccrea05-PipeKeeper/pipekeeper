import React from 'react';
import { Trash2, FileText, AlertTriangle } from 'lucide-react';
import { CONFIDENCE_LABELS } from '@/lib/valuation/valuationCenter';

const EVIDENCE_COLOR = {
  documented: '#8CBF9E',
  user_entered: '#C4904A',
  reference: '#9AA7B8',
  none: 'rgba(224,216,200,0.5)',
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * The valuation ledger: every entry, newest first, with its evidence class
 * visible so a documented appraisal is never confused with an owner estimate.
 */
export default function ValuationLedger({ entries = [], formatCurrency, onDelete, onAdd, filterLabel, onClearFilter, canEdit = true }) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold" style={{ color: '#F5F1E7' }}>Valuation ledger</h2>
          <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · append-only history
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filterLabel && (
            <button
              type="button"
              onClick={onClearFilter}
              className="rounded-lg px-2.5 py-1.5 text-[11px]"
              style={{ background: 'rgba(180,140,75,0.14)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574', minHeight: 36 }}
            >
              {filterLabel} · clear
            </button>
          )}
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{ background: '#A35C5C', color: '#fff', minHeight: 40 }}
          >
            Add valuation
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}>
          <FileText className="mx-auto mb-2 h-6 w-6" style={{ color: 'rgba(212,165,116,0.6)' }} />
          <p className="text-sm" style={{ color: '#F5F1E7' }}>No valuation entries yet</p>
          <p className="mt-1 text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>
            Record an acquisition cost, an owner estimate or a documented appraisal to start the history.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl p-2.5"
              style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(180,140,75,0.18)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold" style={{ color: '#F5F1E7' }}>
                    <span className="break-words">{entry.recordName || 'Record'}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ background: 'rgba(255,255,255,0.06)', color: EVIDENCE_COLOR[entry.evidence] }}
                    >
                      {entry.kindShort}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: 'rgba(224,216,200,0.6)' }}>
                    {formatDate(entry.valuationDate)} · {entry.evidenceLabel} · {CONFIDENCE_LABELS[entry.confidence] || 'Unknown'}
                    {entry.source ? ` · ${entry.source}` : ''}
                  </p>
                  {entry.disclosure && (
                    <p className="mt-1 flex items-start gap-1 text-[10px]" style={{ color: '#C4904A' }}>
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      {entry.disclosure}
                    </p>
                  )}
                  {entry.documentCount > 0 && (
                    <p className="mt-0.5 text-[10px]" style={{ color: 'rgba(224,216,200,0.5)' }}>
                      {entry.documentCount} supporting {entry.documentCount === 1 ? 'document' : 'documents'} (stored privately)
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold" style={{ color: entry.verified ? '#8CBF9E' : '#D4A574' }}>
                    {entry.amountBase !== null && formatCurrency ? formatCurrency(entry.amountBase) : entry.amount !== null ? `${entry.currency} ${Number(entry.amount).toLocaleString()}` : '—'}
                  </p>
                  {entry.currency !== 'USD' && entry.amountBase !== null && (
                    <p className="text-[10px]" style={{ color: 'rgba(224,216,200,0.45)' }}>
                      {entry.currency} {Number(entry.amount).toLocaleString()}
                    </p>
                  )}
                  {entry.amountBase === null && (
                    <p className="text-[10px]" style={{ color: '#C4904A' }}>Not convertible</p>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onDelete?.(entry)}
                      className="mt-1 inline-flex items-center gap-1 text-[10px]"
                      style={{ color: '#B66565', minHeight: 28 }}
                      aria-label={`Delete entry for ${entry.recordName}`}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}