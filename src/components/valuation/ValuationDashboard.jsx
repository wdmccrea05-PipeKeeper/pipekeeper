import React from 'react';
import { AlertTriangle, Camera, ClipboardList, FileCheck, History, Percent, Wallet } from 'lucide-react';
import { summariseBuckets } from '@/lib/valuation/valuationCenter';

const CARD_STYLE = {
  background: 'rgba(255,255,255,0.035)',
  border: '1px solid rgba(180,140,75,0.2)',
  boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
};

function formatValue(metric, formatCurrency) {
  if (metric.format === 'currency') return formatCurrency ? formatCurrency(Number(metric.value) || 0) : `${metric.value}`;
  if (metric.format === 'percent') return `${Math.round(Number(metric.value) || 0)}%`;
  return Number(metric.value || 0).toLocaleString();
}

function MetricCard({ metric, formatCurrency, onDrilldown }) {
  const Icon = metric.icon;
  return (
    <div className="rounded-2xl p-3" style={CARD_STYLE}>
      <button
        type="button"
        onClick={() => onDrilldown?.(metric.drilldown || {})}
        className="w-full text-left"
        style={{ minHeight: 44 }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.6)' }}>
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
          {metric.label}
        </p>
        <p className="mt-1 text-2xl font-bold" style={{ color: metric.accent || '#D4A574' }}>
          {formatValue(metric, formatCurrency)}
        </p>
        <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.55)' }}>{metric.caption}</p>
      </button>
    </div>
  );
}

function BreakdownList({ title, rows, formatCurrency, onSelect }) {
  const buckets = summariseBuckets(rows || []).slice(0, 6);
  if (!buckets.length) return null;
  const max = buckets.reduce((m, row) => Math.max(m, row.amount || 0), 0);

  return (
    <div className="rounded-2xl p-3" style={CARD_STYLE}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.55)' }}>
        {title}
      </p>
      <div className="mt-2 space-y-1">
        {buckets.map((row) => (
          <button
            key={`${title}-${row.label}`}
            type="button"
            onClick={() => onSelect?.(row.label)}
            className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-white/5"
            style={{ minHeight: 28 }}
          >
            <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: 'rgba(224,216,200,0.78)' }} title={row.label}>
              {row.label}
            </span>
            <span className="shrink-0 text-[11px] font-semibold" style={{ color: 'rgba(224,216,200,0.9)' }}>
              {formatCurrency ? formatCurrency(row.amount) : row.amount}
            </span>
            <span className="h-1 w-10 shrink-0 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <span
                className="block h-full rounded-full"
                style={{ width: `${max > 0 ? Math.max(6, Math.round((row.amount / max) * 100)) : 0}%`, background: '#D4A574' }}
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Valuation and documentation dashboard.
 *
 * Every card and every bucket opens the records behind it. Figures are the
 * collector's own records; the disclosure is shown with them.
 */
export default function ValuationDashboard({ summary, formatCurrency, onDrilldown, onBucket }) {
  const s = summary || {};
  const latest = (s.valueOverTime || []).slice(-1)[0];

  const metrics = [
    {
      key: 'recordedCost',
      label: 'Recorded acquisition cost',
      value: s.recordedCost || 0,
      format: 'currency',
      caption: 'Documented historical cost',
      icon: Wallet,
      accent: '#8CBF9E',
      drilldown: { kind: 'acquisition_cost' },
    },
    {
      key: 'estimatedValue',
      label: 'Documented or estimated value',
      value: s.estimatedValue || 0,
      format: 'currency',
      caption: latest?.date ? `As recorded to ${latest.date}` : 'No valuation recorded yet',
      icon: FileCheck,
      accent: '#D4A574',
      drilldown: { valuedOnly: true },
    },
    {
      key: 'percentValued',
      label: 'Collection with valuation records',
      value: s.percentValued || 0,
      format: 'percent',
      caption: `${s.valuedRecords || 0} of ${s.items || 0} records`,
      icon: Percent,
      drilldown: { valuedOnly: true },
    },
    {
      key: 'appraisalCoverage',
      label: 'Documented appraisal coverage',
      value: s.appraisalCoverage || 0,
      format: 'percent',
      caption: `${s.insuranceReady || 0} ready for insurance schedule`,
      icon: ClipboardList,
      drilldown: { missingDocs: (s.missingDocumentation || []).map((row) => row.id) },
    },
    {
      key: 'unknown',
      label: 'No valuation recorded',
      value: s.unknownRecords || 0,
      format: 'count',
      caption: `${s.costOnlyRecords || 0} have cost only`,
      icon: AlertTriangle,
      accent: '#C4904A',
      drilldown: { needsUpdate: (s.needingUpdate || []).map((row) => row.id) },
    },
    {
      key: 'lowConfidence',
      label: 'Low or unknown confidence',
      value: s.lowConfidenceRecords || 0,
      format: 'count',
      caption: `${s.unconvertibleEntries || 0} entries could not be converted`,
      icon: History,
      accent: '#B66565',
      drilldown: { valuedOnly: true },
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#F5F1E7' }}>Valuation overview</h2>
          <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Every figure opens the records it was built from.
          </p>
        </div>
        {(s.needingUpdate || []).length > 0 && (
          <button
            type="button"
            onClick={() => onDrilldown?.({ needsUpdate: (s.needingUpdate || []).map((row) => row.id) })}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
            style={{ background: 'rgba(196,144,74,0.14)', border: '1px solid rgba(196,144,74,0.3)', color: '#C4904A', minHeight: 36 }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {s.needingUpdate.length} records need updated documentation
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} formatCurrency={formatCurrency} onDrilldown={onDrilldown} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <BreakdownList title="Value by module" rows={s.byModule} formatCurrency={formatCurrency} onSelect={(label) => onBucket?.({ moduleLabel: label })} />
        <BreakdownList title="Value by maker or producer" rows={s.byMaker} formatCurrency={formatCurrency} onSelect={(label) => onBucket?.({ maker: label })} />
        <BreakdownList title="Value by category" rows={s.byCategory} formatCurrency={formatCurrency} onSelect={(label) => onBucket?.({ category: label })} />
        <BreakdownList title="Value by storage location" rows={s.byStorage} formatCurrency={formatCurrency} onSelect={(label) => onBucket?.({ storageLocationName: label })} />
      </div>

      {(s.valueOverTime || []).length > 1 && (
        <div className="rounded-2xl p-3" style={CARD_STYLE}>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.55)' }}>
            <History className="h-3.5 w-3.5" /> Documented value over time
          </p>
          <div className="mt-2 flex items-end gap-1.5" style={{ height: 64 }}>
            {(() => {
              const series = s.valueOverTime.slice(-12);
              const max = series.reduce((m, point) => Math.max(m, point.total || 0), 0);
              return series.map((point) => (
                <div key={point.date} className="flex-1" title={`${point.date}: ${formatCurrency ? formatCurrency(point.total) : point.total}`}>
                  <div
                    style={{
                      height: `${max > 0 ? Math.max(4, Math.round(((point.total || 0) / max) * 56)) : 4}px`,
                      background: 'rgba(212,165,116,0.55)',
                      borderRadius: 3,
                    }}
                  />
                </div>
              ));
            })()}
          </div>
          <p className="mt-1 text-[10px]" style={{ color: 'rgba(224,216,200,0.45)' }}>
            Each bar is the collection value documented as of that date.
          </p>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[10px] leading-relaxed" style={{ color: 'rgba(224,216,200,0.45)' }}>
        <Camera className="mt-0.5 h-3 w-3 shrink-0" />
        {s.disclosure}
      </p>
    </section>
  );
}