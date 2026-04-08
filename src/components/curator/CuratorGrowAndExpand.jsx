/**
 * CuratorGrowAndExpand — Surface 5
 *
 * Outside-of-collection exploration tab.
 * Surfaces ideas the user doesn't already own, based on:
 *   - collection gaps (missing blend types, whiskey styles)
 *   - preference alignment (preferred types not fully explored)
 *   - extension of highly-rated items
 *
 * Primary action: Add to Want List
 * Distinct from Purchase & Restock (which is for already-owned/tracked items).
 *
 * All suggestion logic lives in growthEngine.js — this component only renders.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { TrendingUp, Plus, CheckCircle2, Loader2, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generateGrowthSuggestions } from '@/lib/curator/growthEngine.js';

// ─── Module colors ─────────────────────────────────────────────────────────────

const MODULE_COLORS = {
  tobacco: { bg: 'rgba(74,124,92,0.12)',  text: 'rgba(100,180,130,0.9)',  border: 'rgba(74,124,92,0.25)',  label: 'Tobacco' },
  whiskey: { bg: 'rgba(74,124,156,0.12)', text: 'rgba(120,170,220,0.9)', border: 'rgba(74,124,156,0.25)', label: 'Whiskey' },
  cigar:   { bg: 'rgba(180,100,50,0.12)', text: 'rgba(220,140,90,0.9)',  border: 'rgba(180,100,50,0.25)', label: 'Cigar'   },
};

// ─── Single grow suggestion card ──────────────────────────────────────────────

function GrowCard({ suggestion, userEmail, onAskCurator }) {
  const [adding, setAdding]   = useState(false);
  const [added, setAdded]     = useState(false);
  const [error, setError]     = useState(null);

  const mc = MODULE_COLORS[suggestion.moduleKey] || MODULE_COLORS.tobacco;

  // Use the specific product name for the Want List item
  const wantListName = suggestion.name || suggestion.title;

  const handleAdd = useCallback(async () => {
    if (!userEmail || adding || added) return;
    setAdding(true);
    setError(null);
    try {
      await base44.entities.AcquisitionItem.create({
        name:       wantListName,
        item_type:  suggestion.itemType || 'blend',
        notes:      suggestion.summary || '',
        priority:   suggestion.priority || 'medium',
        category:   'wishlist',
        status:     'active',
        is_manual:  false,
        created_by: userEmail,
      });
      setAdded(true);
    } catch (err) {
      setError(err?.message || 'Failed to add to Want List');
    } finally {
      setAdding(false);
    }
  }, [suggestion, wantListName, userEmail, adding, added]);

  // Sub-label: blend family or whiskey style
  const subLabel = suggestion.blendFamily || suggestion.whiskeyStyle || null;

  return (
    <div
      className="rounded-xl p-3.5 space-y-2.5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.16)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: mc.bg, color: mc.text, border: `1px solid ${mc.border}` }}
            >
              {mc.label}
            </span>
            {subLabel && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(100,100,100,0.15)' }}
              >
                {subLabel}
              </span>
            )}
            {suggestion.reason === 'preference_match' && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(140,105,65,0.15)', color: 'rgba(212,165,116,0.9)', border: '1px solid rgba(140,105,65,0.3)' }}
              >
                Matches your profile
              </span>
            )}
          </div>
          <p className="text-sm font-bold leading-tight" style={{ color: '#F5F1E7' }}>
            {suggestion.title}
          </p>
          <p className="text-xs mt-0.5 leading-snug" style={{ color: 'rgba(224,216,200,0.55)' }}>
            {suggestion.summary}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          className="text-xs rounded px-2 py-1"
          style={{ background: 'rgba(139,58,58,0.15)', color: 'rgba(220,140,140,1)' }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {added ? (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(80,180,130,0.9)' }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Added to Want List
          </span>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !userEmail}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{ background: 'rgba(140,105,65,0.2)', color: 'rgba(212,165,116,1)', border: '1px solid rgba(140,105,65,0.35)' }}
          >
            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            {adding ? 'Adding…' : 'Add to Want List'}
          </button>
        )}
        {onAskCurator && (
          <button
            type="button"
            onClick={() => onAskCurator(suggestion)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(74,124,156,0.1)', color: 'rgba(120,170,220,0.8)', border: '1px solid rgba(74,124,156,0.2)' }}
          >
            <HelpCircle className="w-3 h-3" />
            Ask Curator
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Section with collapsible ─────────────────────────────────────────────────

const GROW_SECTIONS = [
  { key: 'tobacco', label: 'Tobacco Discoveries', moduleKey: 'tobacco' },
  { key: 'whiskey', label: 'Whiskey Discoveries', moduleKey: 'whiskey' },
  { key: 'cigar',   label: 'Cigar Discoveries',   moduleKey: 'cigar'   },
];

function GrowSection({ label, suggestions, userEmail, onAskCurator }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!suggestions.length) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 py-1"
        aria-expanded={!collapsed}
      >
        <span
          className="text-[11px] font-bold uppercase tracking-widest shrink-0"
          style={{ color: 'rgba(224,216,200,0.45)' }}
        >
          {label}
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(140,105,65,0.15)' }} />
        <span
          className="text-[11px] px-2 py-0.5 rounded-full tabular-nums shrink-0"
          style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(100,100,100,0.18)' }}
        >
          {suggestions.length}
        </span>
        {collapsed
          ? <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} />
          : <ChevronUp   className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} />}
      </button>
      {!collapsed && (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <GrowCard key={s.id} suggestion={s} userEmail={userEmail} onAskCurator={onAskCurator} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="py-16 text-center space-y-3">
      <TrendingUp className="w-10 h-10 mx-auto" style={{ color: 'rgba(140,105,65,0.3)' }} />
      <p className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.6)' }}>
        Collection looks well-rounded
      </p>
      <p className="text-xs max-w-xs mx-auto" style={{ color: 'rgba(224,216,200,0.35)' }}>
        Add and rate more items across all categories to surface personalized expansion ideas.
      </p>
    </div>
  );
}

// ─── CuratorGrowAndExpand ─────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object}   props.collectionContext  - Full collection context
 * @param {object}   [props.preferences]     - Taste profile / preferences (from useTasteProfile)
 * @param {string}   [props.userEmail]       - Current user email (for Want List creates)
 * @param {Function} [props.onAskCurator]    - () => void — switch to chat tab
 */
export default function CuratorGrowAndExpand({ collectionContext = {}, preferences = null, userEmail, onAskCurator }) {
  const suggestions = useMemo(
    () => generateGrowthSuggestions(collectionContext, preferences),
    [collectionContext, preferences]
  );

  const hasAny = suggestions.length > 0;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold" style={{ color: '#F5F1E7' }}>
          Grow &amp; Expand
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
          Discover what's missing — explore new categories outside your current collection
        </p>
      </div>

      {/* Distinction note */}
      <div
        className="rounded-xl p-3 text-xs"
        style={{ background: 'rgba(140,105,65,0.07)', border: '1px solid rgba(140,105,65,0.18)' }}
      >
        <span className="font-semibold" style={{ color: 'rgba(212,165,116,0.85)' }}>
          Add to Want List
        </span>
        <span style={{ color: 'rgba(224,216,200,0.5)' }}>
          {' '}— track items to explore. Items already owned or tracked are in{' '}
        </span>
        <span className="font-semibold" style={{ color: 'rgba(160,200,240,0.85)' }}>
          Purchase &amp; Restock
        </span>
        <span style={{ color: 'rgba(224,216,200,0.5)' }}>.</span>
      </div>

      {!hasAny ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {GROW_SECTIONS.map(({ key, label, moduleKey }) => (
            <GrowSection
              key={key}
              label={label}
              suggestions={suggestions.filter((s) => s.moduleKey === moduleKey)}
              userEmail={userEmail}
              onAskCurator={onAskCurator}
            />
          ))}
        </div>
      )}
    </div>
  );
}
