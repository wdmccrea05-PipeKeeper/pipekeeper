/**
 * CuratorGrowAndExpand — works from either prebuilt curator sections or direct collection context.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { TrendingUp, Plus, CheckCircle2, Loader2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generateGrowthSuggestions } from '@/lib/curator/growthEngine.js';

const MODULE_COLORS = {
  tobacco: { bg: 'rgba(74,124,92,0.12)',  text: 'rgba(100,180,130,0.9)',  border: 'rgba(74,124,92,0.25)',  label: 'Tobacco' },
  whiskey: { bg: 'rgba(74,124,156,0.12)', text: 'rgba(120,170,220,0.9)', border: 'rgba(74,124,156,0.25)', label: 'Whiskey' },
  cigar:   { bg: 'rgba(180,100,50,0.12)', text: 'rgba(220,140,90,0.9)',  border: 'rgba(180,100,50,0.25)', label: 'Cigar'   },
};

function normalizeSectionSuggestions(sections = []) {
  return (sections || []).flatMap((section) =>
    (section?.recommendations || []).map((rec) => ({
      id: rec.id,
      title: rec.title || rec.summary || 'Curator suggestion',
      summary: rec.summary || rec.recommendationText || '',
      whyFit: rec.whyItMatters || rec.recommendationText || '',
      moduleKey: rec.moduleKey === 'whiskey' ? 'whiskey' : rec.moduleKey === 'cigar' ? 'cigar' : 'tobacco',
      itemType: rec.moduleKey === 'whiskey' ? 'bottle' : rec.moduleKey === 'cigar' ? 'cigar' : 'blend',
      name: rec.title || rec.summary || 'Curator suggestion',
      reason: rec.goal || 'growth',
      tags: [rec.confidence, rec.priority].filter(Boolean),
      sourceRecommendation: rec,
    }))
  );
}

function fallbackSuggestions(context = {}) {
  const generated = generateGrowthSuggestions(context, null) || [];
  return generated.map((s, idx) => ({
    id: s.id || `generated_${idx}`,
    title: s.title || s.name || 'Curator suggestion',
    summary: s.summary || '',
    whyFit: s.whyFit || s.summary || '',
    moduleKey: s.moduleKey || 'tobacco',
    itemType: s.itemType || 'blend',
    name: s.name || s.title || 'Curator suggestion',
    reason: s.gapFilled || s.reason || 'growth',
    tags: s.tags || [],
  }));
}

function GrowCard({ suggestion, userEmail, onAskCurator }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);
  const mc = MODULE_COLORS[suggestion.moduleKey] || MODULE_COLORS.tobacco;
  const tags = suggestion.tags?.length ? suggestion.tags : [suggestion.reason].filter(Boolean);

  const handleAdd = useCallback(async () => {
    if (!userEmail || adding || added) return;
    setAdding(true);
    setError(null);
    try {
      await base44.entities.AcquisitionItem.create({
        name: suggestion.name || suggestion.title,
        item_type: suggestion.itemType || 'blend',
        notes: suggestion.summary || suggestion.whyFit || '',
        priority: 'medium',
        category: 'wishlist',
        status: 'wishlist',
        is_manual: false,
        created_by: userEmail,
      });
      setAdded(true);
    } catch (err) {
      setError(err?.message || 'Failed to add to Want List');
    } finally {
      setAdding(false);
    }
  }, [suggestion, userEmail, adding, added]);

  return (
    <div style={{ background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '24px' }}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span style={{ background: mc.bg, color: mc.text, border: `1px solid ${mc.border}`, fontSize: '13px', fontWeight: 600, padding: '2px 10px', borderRadius: '999px' }}>{mc.label}</span>
        {tags.map((tag, i) => <span key={i} style={{ background: 'rgba(255,255,255,0.06)', color: '#A1A1AA', fontSize: '13px', fontWeight: 500, padding: '2px 10px', borderRadius: '999px' }}>{tag}</span>)}
      </div>
      <p style={{ color: '#F5F5F7', fontSize: '18px', fontWeight: 600, lineHeight: 1.3, margin: '0 0 10px 0' }}>{suggestion.title}</p>
      {(suggestion.whyFit || suggestion.summary) && <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, margin: '0 0 16px 0' }}>{suggestion.whyFit || suggestion.summary}</p>}
      {error && <p className="text-xs rounded px-2 py-1 mb-3" style={{ background: 'rgba(139,58,58,0.15)', color: 'rgba(220,140,140,1)' }}>{error}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        {added ? <span className="inline-flex items-center gap-2" style={{ color: '#22C55E', fontSize: '16px', fontWeight: 600 }}><CheckCircle2 className="w-5 h-5" />Added to Want List</span> : <button type="button" onClick={handleAdd} disabled={adding || !userEmail} className="inline-flex items-center gap-2 font-semibold transition-all disabled:opacity-50" style={{ background: '#C6A15B', color: '#0B0B0C', height: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '14px', border: 'none' }}>{adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{adding ? 'Adding…' : 'Add to Want List'}</button>}
        {onAskCurator && <button type="button" onClick={() => onAskCurator(suggestion.sourceRecommendation || suggestion)} className="inline-flex items-center gap-1.5 transition-all" style={{ color: '#A1A1AA', background: 'transparent', border: 'none', fontSize: '14px', height: '40px', padding: '0 8px' }}><HelpCircle className="w-4 h-4" />Ask Curator</button>}
      </div>
    </div>
  );
}

function GrowSection({ label, suggestions, userEmail, onAskCurator }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!suggestions.length) return null;
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setCollapsed((v) => !v)} className="w-full flex items-center gap-2 py-1" aria-expanded={!collapsed}>
        <span style={{ color: '#71717A', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }} className="shrink-0">{label}</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(140,105,65,0.15)' }} />
        <span className="text-[11px] px-2 py-0.5 rounded-full tabular-nums shrink-0" style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(100,100,100,0.18)' }}>{suggestions.length}</span>
        {collapsed ? <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} /> : <ChevronUp className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} />}
      </button>
      {!collapsed && <div className="space-y-2">{suggestions.map((s) => <GrowCard key={s.id} suggestion={s} userEmail={userEmail} onAskCurator={onAskCurator} />)}</div>}
    </div>
  );
}

export default function CuratorGrowAndExpand({ sections = [], collectionContext = {}, userEmail, onAskCurator }) {
  const suggestions = useMemo(() => {
    const fromSections = normalizeSectionSuggestions(sections);
    return fromSections.length ? fromSections : fallbackSuggestions(collectionContext);
  }, [sections, collectionContext]);

  const groups = useMemo(() => ({
    tobacco: suggestions.filter((s) => s.moduleKey === 'tobacco'),
    whiskey: suggestions.filter((s) => s.moduleKey === 'whiskey'),
    cigar: suggestions.filter((s) => s.moduleKey === 'cigar'),
  }), [suggestions]);

  if (!suggestions.length) {
    return <div className="py-16 text-center"><TrendingUp className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(140,105,65,0.3)' }} /><p className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.6)' }}>No growth suggestions yet</p></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 style={{ color: '#F5F5F7', fontSize: '20px', fontWeight: 600, margin: 0 }}>Grow &amp; Expand</h2>
        <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, marginTop: '4px' }}>Discover what&apos;s missing and move strong candidates directly onto your Want List.</p>
      </div>
      <GrowSection label="Tobacco Discoveries" suggestions={groups.tobacco} userEmail={userEmail} onAskCurator={onAskCurator} />
      <GrowSection label="Whiskey Discoveries" suggestions={groups.whiskey} userEmail={userEmail} onAskCurator={onAskCurator} />
      <GrowSection label="Cigar Discoveries" suggestions={groups.cigar} userEmail={userEmail} onAskCurator={onAskCurator} />
    </div>
  );
}
