import React, { useMemo, useState } from 'react';
import { TrendingUp, Plus, HelpCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const MODULE_COLORS = {
  tobacco: { bg: 'rgba(74,124,92,0.12)', text: 'rgba(100,180,130,0.9)', border: 'rgba(74,124,92,0.25)', label: 'Tobacco' },
  whiskey: { bg: 'rgba(74,124,156,0.12)', text: 'rgba(120,170,220,0.9)', border: 'rgba(74,124,156,0.25)', label: 'Whiskey' },
  cigar: { bg: 'rgba(180,100,50,0.12)', text: 'rgba(220,140,90,0.9)', border: 'rgba(180,100,50,0.25)', label: 'Cigar' },
  pipe: { bg: 'rgba(139,94,58,0.12)', text: 'rgba(212,165,116,0.95)', border: 'rgba(139,94,58,0.25)', label: 'Pipe' },
  multi: { bg: 'rgba(120,120,120,0.12)', text: 'rgba(205,205,205,0.9)', border: 'rgba(120,120,120,0.25)', label: 'Multi' },
};

function flattenRecommendations(sections = []) {
  return sections.flatMap((section) => section?.recommendations || []);
}

function formatTags(recommendation) {
  const tags = [];
  if (recommendation?.moduleKey) tags.push(MODULE_COLORS[recommendation.moduleKey]?.label || recommendation.moduleKey);
  if (recommendation?.priority) tags.push(String(recommendation.priority).replace(/^./, (c) => c.toUpperCase()));
  if (recommendation?.confidence) tags.push(`${recommendation.confidence} confidence`);
  return tags;
}

function GrowCard({ recommendation, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const items = recommendation?.items || [];
  const color = MODULE_COLORS[recommendation?.moduleKey] || MODULE_COLORS.multi;
  const tags = formatTags(recommendation);

  return (
    <div style={{ background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '24px' }}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}`, fontSize: '13px', fontWeight: 600, padding: '2px 10px', borderRadius: '999px' }}>
          {color.label}
        </span>
        {tags.map((tag) => (
          <span key={tag} style={{ background: 'rgba(255,255,255,0.06)', color: '#A1A1AA', fontSize: '13px', fontWeight: 500, padding: '2px 10px', borderRadius: '999px' }}>
            {tag}
          </span>
        ))}
      </div>

      <div className="text-[18px] font-semibold mb-2" style={{ color: '#F5F5F7' }}>{recommendation.title}</div>
      {recommendation.summary ? <p style={{ color: '#D8D0C2', fontSize: '16px', lineHeight: 1.6, margin: '0 0 12px 0' }}>{recommendation.summary}</p> : null}
      {recommendation.whyItMatters ? <p style={{ color: '#A1A1AA', fontSize: '15px', lineHeight: 1.6, margin: '0 0 16px 0' }}>{recommendation.whyItMatters}</p> : null}

      {items.length > 0 ? (
        <div className="mb-4">
          <button type="button" onClick={() => setExpanded((v) => !v)} className="inline-flex items-center gap-2 text-sm" style={{ color: '#C6A15B' }}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {expanded ? 'Hide suggested items' : `Show suggested items (${items.length})`}
          </button>

          {expanded ? (
            <div className="mt-3 space-y-2">
              {items.map((item) => (
                <div key={item.id || item.recordId} className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="text-sm font-medium" style={{ color: '#F5F5F7' }}>{item.itemName || item.recordName || item.name || '—'}</div>
                  <div className="text-xs" style={{ color: '#A1A1AA' }}>{item.brand || item.manufacturer || item.recordType || item.itemType || ''}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onAction?.('add_to_want_list', recommendation)}
          className="inline-flex items-center gap-2 font-semibold"
          style={{ background: '#C6A15B', color: '#0B0B0C', height: '40px', padding: '0 16px', borderRadius: '12px', border: 'none', fontSize: '14px' }}
        >
          <Plus className="w-4 h-4" />
          Add to Want List
        </button>
        <button
          type="button"
          onClick={() => onAction?.('ask_curator', recommendation)}
          className="inline-flex items-center gap-2 font-semibold"
          style={{ background: 'transparent', color: '#A1A1AA', height: '40px', padding: '0 8px', border: 'none', fontSize: '14px' }}
        >
          <HelpCircle className="w-4 h-4" />
          Ask Curator
        </button>
      </div>
    </div>
  );
}

function RecommendationSection({ title, recommendations, onAction }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!recommendations.length) return null;

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setCollapsed((v) => !v)} className="w-full flex items-center gap-2 py-1" aria-expanded={!collapsed}>
        <span style={{ color: '#71717A', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }} className="shrink-0">{title}</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(140,105,65,0.15)' }} />
        <span className="text-[11px] px-2 py-0.5 rounded-full tabular-nums shrink-0" style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(100,100,100,0.18)' }}>
          {recommendations.length}
        </span>
        {collapsed ? <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} /> : <ChevronUp className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} />}
      </button>

      {!collapsed ? (
        <div className="space-y-3">
          {recommendations.map((recommendation) => (
            <GrowCard key={recommendation.id} recommendation={recommendation} onAction={onAction} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center space-y-3">
      <TrendingUp className="w-10 h-10 mx-auto" style={{ color: 'rgba(140,105,65,0.3)' }} />
      <p className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.6)' }}>Collection looks well-rounded</p>
      <p className="text-xs max-w-xs mx-auto" style={{ color: 'rgba(224,216,200,0.35)' }}>
        Add and rate more items across your modules to surface personalized expansion ideas.
      </p>
    </div>
  );
}

export default function CuratorGrowAndExpand({ sections = [], onAction, onRefresh, isRefreshing = false }) {
  const recommendations = useMemo(() => flattenRecommendations(sections), [sections]);
  const grouped = useMemo(() => {
    return {
      tobacco: recommendations.filter((rec) => rec.moduleKey === 'tobacco'),
      whiskey: recommendations.filter((rec) => rec.moduleKey === 'whiskey'),
      cigar: recommendations.filter((rec) => rec.moduleKey === 'cigar'),
      pipe: recommendations.filter((rec) => rec.moduleKey === 'pipe'),
      multi: recommendations.filter((rec) => !['tobacco', 'whiskey', 'cigar', 'pipe'].includes(rec.moduleKey)),
    };
  }, [recommendations]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 style={{ color: '#F5F5F7', fontSize: '20px', fontWeight: 600, margin: 0 }}>Grow &amp; Expand</h2>
          <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, marginTop: '4px' }}>
            Discover what is missing and turn exploration into tracked want-list action.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRefresh?.()}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl font-medium"
          style={{ border: '1px solid rgba(255,255,255,0.10)', color: '#D8D0C2', opacity: isRefreshing ? 0.6 : 1 }}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div style={{ background: 'rgba(198,161,91,0.08)', border: '1px solid rgba(198,161,91,0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#A1A1AA' }}>
        These are outside-of-collection recommendations. Use <span style={{ color: '#C6A15B', fontWeight: 600 }}>Add to Want List</span> to keep the Curator focused on future buys.
      </div>

      {recommendations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <RecommendationSection title="Tobacco Discoveries" recommendations={grouped.tobacco} onAction={onAction} />
          <RecommendationSection title="Whiskey Discoveries" recommendations={grouped.whiskey} onAction={onAction} />
          <RecommendationSection title="Cigar Discoveries" recommendations={grouped.cigar} onAction={onAction} />
          <RecommendationSection title="Pipe Discoveries" recommendations={grouped.pipe} onAction={onAction} />
          <RecommendationSection title="Cross-Collection Ideas" recommendations={grouped.multi} onAction={onAction} />
        </div>
      )}
    </div>
  );
}
