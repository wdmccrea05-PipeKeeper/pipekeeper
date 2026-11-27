import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { buildDashboardMetrics, groupDashboardMetrics } from '@/lib/cigars/cigarDashboard';
import FeatureAvailabilityBadge from '@/components/entitlements/FeatureAvailabilityBadge';

const GROUP_ACCENT = {
  composition: '#D4A574',
  storage: '#8CBF9E',
  documentation: '#B48C4B',
  aging: '#C4904A',
  environment: '#6F9FCF',
  ratings: '#D4A574',
  value: '#A9C0D8',
};

function formatMetricValue(value, format, formatCurrency) {
  if (value === null || value === undefined) return '—';
  switch (format) {
    case 'percent':
      return `${Math.round(Number(value))}%`;
    case 'currency':
      return formatCurrency ? formatCurrency(Number(value)) : `${Math.round(Number(value))}`;
    case 'rating':
      return `${Number(value).toFixed(1)}/5`;
    default:
      return Number(value).toLocaleString();
  }
}

function MetricCard({ metric, formatCurrency, onDrilldown }) {
  const accent = GROUP_ACCENT[metric.group] || '#D4A574';
  const breakdown = (metric.breakdown || []).filter((row) => row.value !== 0 && row.value !== null);
  const max = breakdown.reduce((m, row) => Math.max(m, Number(row.value) || 0), 0);

  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(180,140,75,0.2)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
      }}
    >
      <button
        type="button"
        onClick={() => onDrilldown?.(metric.params || {})}
        className="w-full text-left"
        style={{ minHeight: 44 }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.6)' }}>
          {metric.label}
        </p>
        <p className="mt-1 text-2xl font-bold" style={{ color: accent }}>
          {formatMetricValue(metric.value, metric.format, formatCurrency)}
        </p>
        <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.55)' }}>{metric.caption}</p>
      </button>

      {breakdown.length > 0 && (
        <div className="mt-2 space-y-1">
          {breakdown.slice(0, 5).map((row, index) => (
            <button
              key={`${metric.id}-${row.label}-${index}`}
              type="button"
              onClick={() => onDrilldown?.(row.params || {})}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-white/5"
              style={{ minHeight: 28 }}
            >
              <span
                className="min-w-0 flex-1 truncate text-[11px]"
                style={{ color: 'rgba(224,216,200,0.78)' }}
                title={row.label}
              >
                {row.label}
              </span>
              <span className="shrink-0 text-[11px] font-semibold" style={{ color: 'rgba(224,216,200,0.9)' }}>
                {formatMetricValue(row.value, row.format || metric.format, formatCurrency)}
              </span>
              <span className="h-1 w-10 shrink-0 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${max > 0 ? Math.max(6, Math.round(((Number(row.value) || 0) / max) * 100)) : 0}%`,
                    background: accent,
                  }}
                />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * CigarKeeper dashboard.
 *
 * Every number opens the records it was built from, so a collector can move from
 * a summary straight to the underlying cigars.
 */
export default function CigarKeeperDashboard({
  cigars = [],
  humidors = [],
  readingsByHumidor = {},
  ratings = [],
  formatCurrency,
  tier = 'free',
  onDrilldown,
  brief = null,
}) {
  const [showBrief, setShowBrief] = useState(false);

  const metrics = useMemo(
    () => buildDashboardMetrics({ cigars, humidors, readingsByHumidor, ratings }),
    [cigars, humidors, readingsByHumidor, ratings]
  );
  const groups = useMemo(() => groupDashboardMetrics(metrics), [metrics]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#F5F1E7' }}>Collection overview</h2>
          <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Every figure opens the records it was built from.
          </p>
        </div>
        {brief && (
          <button
            type="button"
            onClick={() => setShowBrief((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs"
            style={{
              background: 'rgba(180,140,75,0.12)',
              border: '1px solid rgba(180,140,75,0.25)',
              color: '#D4A574',
              minHeight: 36,
            }}
          >
            <Info className="h-3.5 w-3.5" />
            Collection brief
            {showBrief ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {showBrief && brief && (
        <div
          className="rounded-2xl p-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>{brief.headline}</p>
          <div className="mt-2 space-y-2">
            {brief.sections.map((section) => (
              <div key={section.title}>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(212,165,116,0.85)' }}>
                  {section.title}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {section.lines.map((line, index) => (
                    <li key={`${section.title}-${index}`} className="text-xs" style={{ color: 'rgba(224,216,200,0.72)' }}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.key}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {group.label}
            </p>
            {group.key === 'environment' && (
              <FeatureAvailabilityBadge featureId="cigars.environment_history" tier={tier} />
            )}
            {group.key === 'documentation' && (
              <FeatureAvailabilityBadge featureId="cigars.advanced_reports" tier={tier} />
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.metrics.map((metric) => (
              <MetricCard
                key={metric.id}
                metric={metric}
                formatCurrency={formatCurrency}
                onDrilldown={onDrilldown}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}