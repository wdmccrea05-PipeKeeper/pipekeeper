import React, { useState, useMemo, useCallback } from 'react';
import { TrendingUp, Plus, CheckCircle2, Loader2, HelpCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generateGrowExpandRecommendations } from '@/lib/curator/growExpandEngine.js';
import { useTranslation } from '@/components/i18n/safeTranslation';

const MODULE_COLORS = {
  tobacco: { bg: 'rgba(74,124,92,0.12)', text: 'rgba(100,180,130,0.9)', border: 'rgba(74,124,92,0.25)', label: 'Tobacco' },
  whiskey: { bg: 'rgba(74,124,156,0.12)', text: 'rgba(120,170,220,0.9)', border: 'rgba(74,124,156,0.25)', label: 'Whiskey' },
  cigar: { bg: 'rgba(180,100,50,0.12)', text: 'rgba(220,140,90,0.9)', border: 'rgba(180,100,50,0.25)', label: 'Cigar' },
  pipe: { bg: 'rgba(180,140,75,0.12)', text: 'rgba(212,165,116,1)', border: 'rgba(180,140,75,0.26)', label: 'Pipe' },
  wine: { bg: 'rgba(120,40,80,0.14)', text: 'rgba(210,130,160,0.95)', border: 'rgba(140,50,90,0.30)', label: 'Wine' },
};

function normalizeModuleKey(value) {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('whiskey') || raw.includes('bottle')) return 'whiskey';
  if (raw.includes('cigar')) return 'cigar';
  if (raw.includes('pipe')) return 'pipe';
  if (raw.includes('wine')) return 'wine';
  return 'tobacco';
}

function buildCollectionReason(rec, item) {
  return item?.rationale || rec?.whyItMatters || rec?.recommendationText || rec?.summary || '';
}

function normalizeSectionSuggestions(sections = []) {
  const rows = [];

  for (const section of sections || []) {
    for (const rec of section?.recommendations || []) {
      const recItems = Array.isArray(rec?.items) && rec.items.length ? rec.items : [null];
      for (const item of recItems) {
        const moduleKey = normalizeModuleKey(item?.itemType || item?.recordType || rec?.moduleKey);
        const itemType = item?.itemType || item?.recordType || (moduleKey === 'whiskey' ? 'bottle' : moduleKey === 'pipe' ? 'pipe' : 'blend');
        const title = item?.recordName || item?.itemName || rec?.title || rec?.summary || 'Curator suggestion';
        rows.push({
          id: `${rec.id}_${item?.id || item?.recordName || title}`,
          title,
          summary: rec?.summary || '',
          whyFit: buildCollectionReason(rec, item),
          moduleKey,
          itemType,
          name: title,
          reason: rec?.goal || 'growth',
          fitBadge: rec?.fitBadge || 'Medium Fit',
          priorityBadge: rec?.priorityBadge || 'Medium Priority',
          sourceRecommendation: rec,
        });
      }
    }
  }

  const dedupe = new Set();
  return rows.filter((row) => {
    const key = `${row.moduleKey}:${row.name}`.toLowerCase();
    if (dedupe.has(key)) return false;
    dedupe.add(key);
    return true;
  });
}

function fallbackSuggestions(context = {}) {
  const generated = generateGrowExpandRecommendations(context) || [];
  return generated.map((s, idx) => ({
    id: s.id || `generated_${idx}`,
    title: s.title || s.name || 'Curator suggestion',
    summary: s.summary || '',
    whyFit: s.whyFit || s.summary || '',
    moduleKey: normalizeModuleKey(s.moduleKey || s.itemType),
    itemType: s.itemType || 'blend',
    name: s.name || s.title || 'Curator suggestion',
    reason: s.gapFilled || s.reason || 'growth',
    fitBadge: s.fitBadge || 'Medium Fit',
    priorityBadge: s.priorityBadge || 'Medium Priority',
    sourceRecommendation: s,
  }));
}

function GrowCard({ suggestion, userEmail, onAskCurator }) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);
  const mc = MODULE_COLORS[suggestion.moduleKey] || MODULE_COLORS.tobacco;

  const handleAdd = useCallback(async () => {
    if (!userEmail || adding || added) return;
    setAdding(true);
    setError(null);
    try {
      const itemName = suggestion.name || suggestion.title;
      const existing = await base44.entities.AcquisitionItem.filter({ created_by: userEmail }).catch(() => []);
      const alreadyExists = existing.some(
        (r) => r.name && r.name.toLowerCase() === (itemName || '').toLowerCase() && r.status !== 'archived'
      );
      if (!alreadyExists) {
        await base44.entities.AcquisitionItem.create({
          name: itemName,
          item_type: suggestion.itemType || 'blend',
          notes: suggestion.whyFit || suggestion.summary || '',
          priority: 'medium',
          status: 'wishlist',
          category: 'wishlist',
          is_manual: false,
          created_by: userEmail,
        });
      }
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
        <span style={{ background: 'rgba(100,150,100,0.15)', color: 'rgba(150,220,150,0.85)', fontSize: '13px', fontWeight: 500, padding: '2px 10px', borderRadius: '999px', border: '1px solid rgba(100,150,100,0.25)' }}>{suggestion.fitBadge}</span>
        <span style={{ background: 'rgba(180,150,100,0.15)', color: 'rgba(220,180,120,0.85)', fontSize: '13px', fontWeight: 500, padding: '2px 10px', borderRadius: '999px', border: '1px solid rgba(180,150,100,0.25)' }}>{suggestion.priorityBadge}</span>
      </div>
      <p style={{ color: '#F5F5F7', fontSize: '18px', fontWeight: 600, lineHeight: 1.3, margin: '0 0 10px 0' }}>{suggestion.title}</p>
      {suggestion.summary ? <p style={{ color: '#D8D0C2', fontSize: '15px', lineHeight: 1.6, margin: '0 0 8px 0' }}>{suggestion.summary}</p> : null}
      {suggestion.whyFit ? <p style={{ color: '#A1A1AA', fontSize: '15px', lineHeight: 1.6, margin: '0 0 16px 0' }}>{suggestion.whyFit}</p> : null}
      {error && <p className="text-xs rounded px-2 py-1 mb-3" style={{ background: 'rgba(139,58,58,0.15)', color: 'rgba(220,140,140,1)' }}>{error}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        {added ? <span className="inline-flex items-center gap-2" style={{ color: '#22C55E', fontSize: '16px', fontWeight: 600 }}><CheckCircle2 className="w-5 h-5" />{t("auto.components_curator_CuratorGrowAndExpand.added_to_want_list_e42gts")}</span> : <button type="button" onClick={handleAdd} disabled={adding || !userEmail} className="inline-flex items-center gap-2 font-semibold transition-all disabled:opacity-50" style={{ background: '#C6A15B', color: '#0B0B0C', height: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '14px', border: 'none' }}>{adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{adding ? 'Adding…' : 'Add to Want List'}</button>}
        {onAskCurator && <button type="button" onClick={() => onAskCurator(suggestion.sourceRecommendation || suggestion)} className="inline-flex items-center gap-1.5 transition-all" style={{ color: '#A1A1AA', background: 'transparent', border: 'none', fontSize: '14px', height: '40px', padding: '0 8px' }}><HelpCircle className="w-4 h-4" />{t("auto.components_curator_CuratorGrowAndExpand.ask_curator_4c37lw")}</button>}
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

export default function CuratorGrowAndExpand({ sections = [], collectionContext = {}, userEmail, onAskCurator, onRefresh, isRefreshing = false, activeModules = {} }) {
  const { t } = useTranslation();
  const suggestions = useMemo(() => {
    const fromSections = normalizeSectionSuggestions(sections);
    return fromSections.length ? fromSections : fallbackSuggestions(collectionContext);
  }, [sections, collectionContext]);

  const wineActive = !!activeModules.winekeeper;

  const groups = useMemo(() => ({
    tobacco: suggestions.filter((s) => s.moduleKey === 'tobacco'),
    whiskey: suggestions.filter((s) => s.moduleKey === 'whiskey'),
    cigar: suggestions.filter((s) => s.moduleKey === 'cigar'),
    pipe: suggestions.filter((s) => s.moduleKey === 'pipe'),
    wine: wineActive ? suggestions.filter((s) => s.moduleKey === 'wine') : [],
  }), [suggestions, wineActive]);

  if (!suggestions.length) {
    return <div className="py-16 text-center"><TrendingUp className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(140,105,65,0.3)' }} /><p className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.6)' }}>{t("auto.components_curator_CuratorGrowAndExpand.no_growth_suggestions_yet_13fk75")}</p></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 style={{ color: '#F5F5F7', fontSize: '20px', fontWeight: 600, margin: 0 }}>{t("auto.components_curator_CuratorGrowAndExpand.grow_and_expand_1osn16")}</h2>
          <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, marginTop: '4px' }}>{t("auto.components_curator_CuratorGrowAndExpand.discover_what_s_missing_and_move_1hzsdi")}</p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={() => onRefresh?.()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl font-medium shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.10)', color: '#D8D0C2', opacity: isRefreshing ? 0.6 : 1 }}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      <GrowSection label="Tobacco Discoveries" suggestions={groups.tobacco} userEmail={userEmail} onAskCurator={onAskCurator} />
      <GrowSection label="Whiskey Discoveries" suggestions={groups.whiskey} userEmail={userEmail} onAskCurator={onAskCurator} />
      <GrowSection label="Pipe Discoveries" suggestions={groups.pipe} userEmail={userEmail} onAskCurator={onAskCurator} />
      <GrowSection label="Cigar Discoveries" suggestions={groups.cigar} userEmail={userEmail} onAskCurator={onAskCurator} />
      {wineActive && <GrowSection label="Wine Discoveries" suggestions={groups.wine} userEmail={userEmail} onAskCurator={onAskCurator} />}
    </div>
  );
}