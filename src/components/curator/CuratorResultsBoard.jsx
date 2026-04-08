import React, { useMemo } from 'react';
import CuratorRecommendationGroup from '@/components/curator/CuratorRecommendationGroup';

const SCOPE_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'pipe', label: 'Pipe' },
  { key: 'tobacco', label: 'Tobacco' },
  { key: 'whiskey', label: 'Whiskey' },
  { key: 'cigar', label: 'Cigar' },
];

function normalizeScope(value) {
  return String(value || 'all').toLowerCase();
}

function normalizeModuleKey(value) {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('pipe')) return 'pipe';
  if (raw.includes('tobacco') || raw.includes('blend')) return 'tobacco';
  if (raw.includes('whiskey') || raw.includes('bottle')) return 'whiskey';
  if (raw.includes('cigar')) return 'cigar';
  return raw;
}

function filterRecommendationsByScope(recommendations = [], scope = 'all') {
  const normalizedScope = normalizeScope(scope);
  if (normalizedScope === 'all') return recommendations;

  return recommendations.filter((rec) => {
    const moduleKey = normalizeModuleKey(rec?.moduleKey);
    if (moduleKey === normalizedScope) return true;

    const items = Array.isArray(rec?.items) ? rec.items : [];
    return items.some((item) => normalizeModuleKey(item?.recordType) === normalizedScope);
  });
}

function deriveStats(sections = []) {
  let autoFixable = 0;
  let reviewNeeded = 0;
  let totalRecords = 0;

  for (const section of sections) {
    const recs = Array.isArray(section?.recommendations) ? section.recommendations : [];
    for (const rec of recs) {
      const itemCount = Array.isArray(rec?.items) ? rec.items.length : 0;
      totalRecords += itemCount;

      if (String(rec?.actionType || '').toLowerCase() === 'auto_fix') {
        autoFixable += itemCount;
      } else if (String(rec?.actionType || '').toLowerCase() === 'review_required') {
        reviewNeeded += itemCount;
      }
    }
  }

  return { autoFixable, reviewNeeded, totalRecords };
}

function ScopePill({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 px-5 rounded-full text-[15px] font-medium transition"
      style={{
        background: active ? '#C6A15B' : 'transparent',
        color: active ? '#0B0B0C' : '#D8D0C2',
        border: active ? '1px solid #C6A15B' : '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {label}
    </button>
  );
}

function SummaryTile({ value, label, meta, tone = 'default' }) {
  const valueColor =
    tone === 'success' ? '#46D38A'
      : tone === 'warning' ? '#E7BE7A'
      : '#B9D7FF';

  return (
    <div
      className="rounded-[18px] p-8"
      style={{
        background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)',
        border: '1px solid rgba(140,105,65,0.16)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      }}
    >
      <div className="text-[52px] leading-none font-semibold mb-4" style={{ color: valueColor }}>
        {value}
      </div>
      <div className="text-[18px] font-semibold mb-2" style={{ color: '#F5F5F7' }}>
        {label}
      </div>
      <div className="text-[15px]" style={{ color: '#7F7F8A' }}>
        {meta}
      </div>
    </div>
  );
}

function SectionHeader({ title, count }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-5">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className="text-[13px] uppercase tracking-[0.18em] whitespace-nowrap"
          style={{ color: '#8F846D' }}
        >
          {title}
        </div>
        <div className="h-px flex-1" style={{ background: 'rgba(140,105,65,0.18)' }} />
      </div>

      <div className="flex items-center gap-3">
        <div
          className="min-w-[34px] h-[34px] px-3 rounded-full text-[14px] font-medium inline-flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#C8C0B4',
          }}
        >
          {count}
        </div>
      </div>
    </div>
  );
}

export default function CuratorResultsBoard(props) {
  const {
    sections: rawSections,
    recommendationSections,
    activeScope: controlledScope,
    selectedScope,
    onScopeChange,
    onFilterChange,
    onAction,
    onRefresh,
    isRefreshing = false,
  } = props;

  const sectionsInput = rawSections || recommendationSections || [];
  const activeScope = normalizeScope(controlledScope || selectedScope || 'all');

  const filteredSections = useMemo(() => {
    return (sectionsInput || [])
      .map((section) => {
        const filteredRecs = filterRecommendationsByScope(section?.recommendations || [], activeScope);
        return {
          ...section,
          recommendations: filteredRecs,
        };
      })
      .filter((section) => Array.isArray(section.recommendations) && section.recommendations.length > 0);
  }, [sectionsInput, activeScope]);

  const stats = useMemo(() => deriveStats(filteredSections), [filteredSections]);

  const boardKey = useMemo(() => {
    const countSignature = filteredSections
      .flatMap((section) => section.recommendations || [])
      .map((rec) => `${rec.id}:${(rec.items || []).length}`)
      .join('|');

    return `${activeScope}::${countSignature}`;
  }, [filteredSections, activeScope]);

  const changeScope = (nextScope) => {
    if (typeof onScopeChange === 'function') onScopeChange(nextScope);
    if (typeof onFilterChange === 'function') onFilterChange(nextScope);
  };

  return (
    <div key={boardKey} className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          {SCOPE_OPTIONS.map((scope) => (
            <ScopePill
              key={scope.key}
              label={scope.label}
              active={activeScope === scope.key}
              onClick={() => changeScope(scope.key)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => onRefresh?.()}
          className="h-12 px-6 rounded-[14px] inline-flex items-center gap-3 text-[15px] font-medium"
          style={{
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#D8D0C2',
            background: 'transparent',
            opacity: isRefreshing ? 0.65 : 1,
          }}
          disabled={isRefreshing}
        >
          <span className={isRefreshing ? 'animate-spin' : ''}>⟳</span>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SummaryTile
          value={stats.autoFixable}
          label="Auto-Fixable"
          meta="apply in one click"
          tone="success"
        />
        <SummaryTile
          value={stats.reviewNeeded}
          label="Review Needed"
          meta="require your input"
          tone="warning"
        />
        <SummaryTile
          value={stats.totalRecords}
          label="Total Records"
          meta="across all issues"
        />
      </div>

      <div className="space-y-8">
        {filteredSections.map((section) => {
          const recs = section?.recommendations || [];
          const sectionCount = recs.reduce((sum, rec) => sum + ((rec.items || []).length || 0), 0);

          return (
            <section key={section.id || section.title}>
              <SectionHeader title={section.title || 'Recommendations'} count={sectionCount} />
              <div className="space-y-4">
                {recs.map((recommendation) => (
                  <CuratorRecommendationGroup
                    key={`${recommendation.id}:${(recommendation.items || []).length}`}
                    recommendation={recommendation}
                    onAction={onAction}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
