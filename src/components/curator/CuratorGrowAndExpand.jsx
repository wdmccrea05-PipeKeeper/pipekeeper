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
 */

import React, { useState, useMemo, useCallback } from 'react';
import { TrendingUp, Plus, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// ─── Specific product catalogs for concrete suggestions ──────────────────────

const BLEND_TYPE_PRODUCTS = {
  'Virginia':            ['Samuel Gawith Golden Glow', 'Mac Baren Virginia No. 1', 'Peter Stokkebye Luxury Bullseye Flake'],
  'Virginia/Perique':    ['G.L. Pease Odyssey', 'Esoterica Penzance', 'Samuel Gawith Full Virginia Flake'],
  'Virginia/Burley':     ['Lane Limited 1-Q', 'C&D Old Joe Krantz', 'Mac Baren Classic Burley Blend'],
  'Virginia/Oriental':   ['G.L. Pease Abingdon', 'Peterson University Flake', 'Germain Flake Mixture'],
  'English':             ['Esoterica Dunbar', 'G.L. Pease Union Square', 'Samuel Gawith Squadron Leader'],
  'English/Balkan':      ['Peterson Elizabethan Mixture', 'Dunhill London Mixture', "Rattray's Old Gowrie"],
  'Balkan':              ['Esoterica Stonehaven', 'G.L. Pease Cairo', 'Balkan Sobranie Original'],
  'Burley':              ['Solani Aged Burley Flake', 'C&D Billy Budd', 'Mac Baren Burley London Blend'],
  'Aromatic':            ['Lane Limited RLP-6', 'Captain Black White', 'Mac Baren Plumcake'],
  'Oriental':            ["Rattray's Marlin Flake", 'G.L. Pease Abingdon', 'Sutliff Vanilla Custard'],
  'Cavendish':           ['Mac Baren HH Burley Flake', 'Samuel Gawith Black Cherry Flake'],
  'Dark Fired Kentucky': ['Cornell & Diehl Old Dark Fired', 'C&D Haunted Bookshop', 'Gawith Hoggarth Dark Flake'],
};

const WHISKEY_TYPE_PRODUCTS = {
  'Bourbon':            ['Buffalo Trace', 'Eagle Rare 10 Year', 'Wild Turkey 101', 'Four Roses Small Batch'],
  'Rye':                ['Rittenhouse Rye 100', 'WhistlePig 10 Year', 'Sazerac 6 Year Rye'],
  'Single Malt Scotch': ['GlenDronach 12', 'Balvenie DoubleWood 12', 'Glenfarclas 15'],
  'Blended Scotch':     ['Famous Grouse', 'Monkey Shoulder', 'Johnnie Walker Black'],
  'Islay Single Malt':  ['Laphroaig 10 Year', 'Ardbeg 10 Year', 'Bowmore 12 Year'],
  'Irish Whiskey':      ['Redbreast 12', 'Jameson Black Barrel', 'Green Spot'],
  'Japanese Whisky':    ['Nikka From The Barrel', 'Suntory Toki', 'Hakushu 12 Year'],
  'Tennessee Whiskey':  ['George Dickel No. 12', "Jack Daniel's Single Barrel"],
};

/** Pick a deterministic specific product for a given type string.
 *  Uses a prime-multiplier string hash (31 is the standard Java/JS choice)
 *  to select consistently without randomness. */
function pickProduct(catalog, typeKey, fallback) {
  const products = catalog[typeKey];
  if (!products || products.length === 0) return fallback;
  // Use a stable hash of the type string to pick consistently
  let hash = 0;
  for (let i = 0; i < typeKey.length; i++) hash = (hash * 31 + typeKey.charCodeAt(i)) & 0xffff;
  return products[hash % products.length];
}

// ─── Blend types in the ecosystem ────────────────────────────────────────────

const ALL_BLEND_TYPES = [
  'Virginia', 'Virginia/Perique', 'Virginia/Burley', 'Virginia/Oriental',
  'English', 'English/Balkan', 'Balkan', 'Burley', 'Aromatic', 'Oriental',
  'Cavendish', 'Dark Fired Kentucky',
];

const ALL_WHISKEY_TYPES = [
  'Bourbon', 'Rye', 'Single Malt Scotch', 'Blended Scotch', 'Islay Single Malt',
  'Irish Whiskey', 'Japanese Whisky', 'Tennessee Whiskey',
];

const ALL_CIGAR_STRENGTHS = ['Mild', 'Mild-Medium', 'Medium', 'Medium-Full', 'Full'];

// ─── Gap analysis ─────────────────────────────────────────────────────────────

function analyzeGaps(collectionContext, preferences) {
  const {
    blends = [],
    bottles = [],
    cigars = [],
    smokingLogs = [],
    tastingLogs = [],
    cigarModuleActive = false,
  } = collectionContext;

  const suggestions = [];

  // ── Tobacco gap analysis ────────────────────────────────────────────────────
  const ownedBlendTypes = new Set(blends.map((b) => b.blend_type || b.blend_family).filter(Boolean));

  // Preferred blend types from preferences (computed from rated blends)
  const preferredTypes = new Set(preferences?.preferred_blend_types || []);
  const dislikedTypes  = new Set(preferences?.disliked_blend_types  || []);

  for (const type of ALL_BLEND_TYPES) {
    if (ownedBlendTypes.has(type)) continue;
    if (dislikedTypes.has(type)) continue;

    const isPreferred = preferredTypes.has(type);
    const specificProduct = pickProduct(BLEND_TYPE_PRODUCTS, type, `${type} Blend`);
    suggestions.push({
      id:         `gap_blend_${type.replace(/[\s/]/g, '_')}`,
      type:       'blend_type_gap',
      moduleKey:  'tobacco',
      title:      `Explore ${specificProduct}`,
      summary:    isPreferred
        ? `A ${type} blend — fits your taste profile but isn't in your collection yet`
        : `${specificProduct} is a ${type} blend not represented in your cellar`,
      reason:     isPreferred ? 'preference_match' : 'collection_gap',
      priority:   isPreferred ? 'high' : 'medium',
      searchHint: specificProduct,
      blendFamily: type,
      itemType:   'blend',
    });
  }

  // ── Whiskey gap analysis ────────────────────────────────────────────────────
  const ownedWhiskeyTypes = new Set(
    bottles.map((b) => b.type || b.whiskey_type || b.spirit_type).filter(Boolean)
  );
  const preferredWhiskeyTypes = new Set(preferences?.preferred_whiskey_types || []);
  const dislikedWhiskeyTypes  = new Set(preferences?.disliked_whiskey_types  || []);

  for (const type of ALL_WHISKEY_TYPES) {
    if (ownedWhiskeyTypes.has(type)) continue;
    if (dislikedWhiskeyTypes.has(type)) continue;

    const isPreferred = preferredWhiskeyTypes.has(type);
    const specificProduct = pickProduct(WHISKEY_TYPE_PRODUCTS, type, type);
    suggestions.push({
      id:         `gap_whiskey_${type.replace(/[\s/]/g, '_')}`,
      type:       'whiskey_type_gap',
      moduleKey:  'whiskey',
      title:      `Explore ${specificProduct}`,
      summary:    isPreferred
        ? `A ${type} — fits your whiskey profile but you don't have any yet`
        : `${specificProduct} (${type}) would add whiskey diversity to your collection`,
      reason:     isPreferred ? 'preference_match' : 'collection_gap',
      priority:   isPreferred ? 'high' : 'low',
      searchHint: specificProduct,
      whiskeyStyle: type,
      itemType:   'bottle',
    });
  }

  // ── Cigar gap analysis (if active) ─────────────────────────────────────────
  if (cigarModuleActive && cigars.length > 0) {
    const ownedStrengths = new Set(cigars.map((c) => c.strength || c.body).filter(Boolean));

    const CIGAR_STRENGTH_DESCRIPTIONS = {
      'Mild':         'a mild Connecticut cigar for a lighter session',
      'Mild-Medium':  'a mild-to-medium Honduran or Dominican for approachable complexity',
      'Medium':       'a medium-bodied Nicaraguan for balanced depth',
      'Medium-Full':  'a medium-full Nicaraguan or Peruvian for greater intensity',
      'Full':         'a full-bodied Ligero blend for a robust session',
    };

    for (const strength of ALL_CIGAR_STRENGTHS) {
      if (ownedStrengths.has(strength)) continue;
      const productDesc = CIGAR_STRENGTH_DESCRIPTIONS[strength] || `${strength} strength cigar`;
      suggestions.push({
        id:         `gap_cigar_${strength.replace(/[\s-]/g, '_')}`,
        type:       'cigar_strength_gap',
        moduleKey:  'cigar',
        title:      `Explore ${productDesc}`,
        summary:    `${strength} strength cigars aren't represented in your humidor`,
        reason:     'collection_gap',
        priority:   'low',
        searchHint: `${strength} cigar`,
        itemType:   'cigar',
      });
    }
  }

  // Sort: preference matches first, then high priority
  return suggestions.sort((a, b) => {
    const order = { preference_match: 0, collection_gap: 1 };
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (order[a.reason] !== order[b.reason]) return order[a.reason] - order[b.reason];
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ─── Module colors ─────────────────────────────────────────────────────────────

const MODULE_COLORS = {
  tobacco: { bg: 'rgba(74,124,92,0.12)',  text: 'rgba(100,180,130,0.9)',  border: 'rgba(74,124,92,0.25)',  label: 'Tobacco' },
  whiskey: { bg: 'rgba(74,124,156,0.12)', text: 'rgba(120,170,220,0.9)', border: 'rgba(74,124,156,0.25)', label: 'Whiskey' },
  cigar:   { bg: 'rgba(180,100,50,0.12)', text: 'rgba(220,140,90,0.9)',  border: 'rgba(180,100,50,0.25)', label: 'Cigar'   },
};

// ─── Single grow suggestion card ──────────────────────────────────────────────

function GrowCard({ suggestion, userEmail }) {
  const [adding, setAdding]   = useState(false);
  const [added, setAdded]     = useState(false);
  const [error, setError]     = useState(null);

  const mc = MODULE_COLORS[suggestion.moduleKey] || MODULE_COLORS.tobacco;

  // Use the specific product name (searchHint) for the Want List item; fall back to title
  const wantListName = suggestion.searchHint || suggestion.title;

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

      {/* Action */}
      <div className="flex items-center gap-2">
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

function GrowSection({ label, suggestions, userEmail }) {
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
            <GrowCard key={s.id} suggestion={s} userEmail={userEmail} />
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
 */
export default function CuratorGrowAndExpand({ collectionContext = {}, preferences = null, userEmail }) {
  const suggestions = useMemo(
    () => analyzeGaps(collectionContext, preferences),
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
