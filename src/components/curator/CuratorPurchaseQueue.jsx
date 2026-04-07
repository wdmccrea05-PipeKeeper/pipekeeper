/**
 * CuratorPurchaseQueue — Surface 3
 *
 * Purchase & Restock operations queue.
 *
 * Layout:
 *   Title + subtitle
 *   4 summary cards: Restock Now | Wishlist Ready | Gap-Fill | Cigar Discovery
 *   Grouped collapsible sections:
 *     1. Restock Now               (low stock / depleted favorites)
 *     2. Move Wishlist to Shopping List
 *     3. Gap-Fill Purchases        (catch-all)
 *     4. Cigar Discovery
 *
 * Each group card:
 *   Header: checkbox + title + priority badge + item count
 *   Why it matters
 *   Item preview list
 *   Footer: Add All to Shopping List (primary) | Add Selected (when items checked) | Review Items
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ShoppingCart, Check, Loader2, CheckCircle2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import CuratorItemPreviewList from './CuratorItemPreviewList';
import { PRIORITY_STYLES } from '@/lib/curator/recommendationSchema.js';
import { executeRecommendationAction } from '@/lib/curator/recommendationActions.js';

// ─── Spec section groups (maps engine goals to named queue sections) ──────────

const SPEC_SECTIONS = [
  {
    id:      'restock',
    label:   'Restock Now',
    goals:   ['low_stock_blends', 'depleted_favorites', 'low_stock_bottles', 'depleted_bottles'],
    reason:  'Low stock, depleted, or running out',
  },
  {
    id:      'wishlist',
    label:   'Move Wishlist to Shopping List',
    goals:   ['wishlist_ready'],
    reason:  'Repeated interest and collection gap',
  },
  {
    id:      'cigar',
    label:   'Cigar Discovery',
    goals:   ['cigar_low_inventory', 'cigar_aging_stock_up'],
    reason:  'Based on your smoking preferences and collection inventory',
  },
  {
    id:      'gap_fill',
    label:   'Gap-Fill Purchases',
    goals:   [], // catch-all for unrecognized purchase goals
    reason:  'Fills gaps or underrepresented categories in your collection',
  },
];

const ALL_KNOWN_GOALS = new Set(SPEC_SECTIONS.flatMap((s) => s.goals));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSpecSections(sections) {
  const allRecs = sections.flatMap((s) => s.recommendations || []);

  return SPEC_SECTIONS.map((spec) => {
    const recs = spec.goals.length > 0
      ? allRecs.filter((r) => spec.goals.includes(r.goal))
      : allRecs.filter((r) => !ALL_KNOWN_GOALS.has(r.goal));  // gap_fill catch-all
    return { ...spec, recommendations: recs };
  }).filter((s) => s.recommendations.length > 0);
}

function computePurchaseSummary(specSections) {
  const countItems = (id) =>
    specSections
      .filter((s) => s.id === id)
      .flatMap((s) => s.recommendations)
      .reduce((sum, r) => sum + (r.items?.length || 0), 0);

  return {
    restock:  countItems('restock'),
    wishlist: countItems('wishlist'),
    gapFill:  countItems('gap_fill'),
    cigar:    countItems('cigar'),
  };
}

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const s = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ value, label, color }) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1 min-w-0"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}22` }}
    >
      <span className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
        {value}
      </span>
      <span className="text-[10px] font-semibold leading-tight" style={{ color: 'rgba(224,216,200,0.65)' }}>
        {label}
      </span>
    </div>
  );
}

// ─── Single purchase group card ───────────────────────────────────────────────

function PurchaseGroupCard({ rec, userEmail }) {
  const [selected, setSelected]     = useState(new Set());
  const [expanded, setExpanded]     = useState(false);
  const [applying, setApplying]     = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState(null);

  const items     = rec.items || [];
  const allChecked = items.length > 0 && selected.size === items.length;

  const toggleAll = useCallback(() => {
    setSelected(allChecked ? new Set() : new Set(items.map((i) => i.id || i.recordId)));
  }, [allChecked, items]);

  const toggleItem = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const addItems = useCallback(async (subset) => {
    if (!userEmail || !subset.length || applying) return;
    setApplying(true);
    setError(null);
    try {
      const pseudoRec = { ...rec, items: subset };
      await executeRecommendationAction(pseudoRec, 'add_to_shopping_list', { userEmail });
      if (subset.length === items.length) setDone(true);
      setSelected(new Set());
    } catch (err) {
      setError(err?.message || 'Failed to add items.');
    } finally {
      setApplying(false);
    }
  }, [rec, items, userEmail, applying]);

  const handleAddAll      = () => addItems(items);
  const handleAddSelected = () => {
    const subset = items.filter((i) => selected.has(i.id || i.recordId));
    if (subset.length) addItems(subset);
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.18)' }}
    >
      {/* Card header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
            <PriorityBadge priority={rec.priority} />
            <span
              className="text-[10px] px-2 py-0.5 rounded-full tabular-nums"
              style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.45)', border: '1px solid rgba(100,100,100,0.18)' }}
            >
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
            {done && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(80,180,130,0.9)' }}>
                <CheckCircle2 className="w-3 h-3" />
                Added
              </span>
            )}
          </div>
          <p className="text-sm font-bold" style={{ color: '#F5F1E7' }}>{rec.title}</p>
          {rec.whyItMatters && (
            <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.6)' }}>
              {rec.whyItMatters}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 p-1.5 rounded-lg transition-colors"
          style={{ color: 'rgba(224,216,200,0.35)', border: '1px solid rgba(140,105,65,0.15)' }}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Compact preview (collapsed) */}
      {!expanded && <CuratorItemPreviewList items={items} maxPreview={4} />}

      {/* Expanded item list with checkboxes */}
      {expanded && (
        <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: 'rgba(140,105,65,0.12)' }}>
          <label
            className="flex items-center gap-2 cursor-pointer py-1.5"
            style={{ borderBottom: '1px solid rgba(140,105,65,0.1)' }}
          >
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              className="w-3.5 h-3.5 rounded accent-amber-600"
            />
            <span className="text-xs font-medium" style={{ color: 'rgba(224,216,200,0.55)' }}>
              Select all
            </span>
          </label>
          {items.map((item) => {
            const id = item.id || item.recordId;
            return (
              <label
                key={id}
                className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-white/5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(id)}
                  onChange={() => toggleItem(id)}
                  className="w-3.5 h-3.5 rounded accent-amber-600 shrink-0"
                />
                <span className="text-xs flex-1 truncate" style={{ color: 'rgba(224,216,200,0.8)' }}>
                  {item.itemName || item.recordName || item.name || '—'}
                </span>
                {item.brand && (
                  <span className="text-[10px] shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }}>
                    {item.brand}
                  </span>
                )}
                {item.quantityOz != null && (
                  <span className="text-[10px] shrink-0 tabular-nums" style={{ color: 'rgba(224,216,200,0.3)' }}>
                    {Number(item.quantityOz).toFixed(1)} oz
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          className="text-xs rounded px-2 py-1"
          style={{ background: 'rgba(139,58,58,0.15)', color: 'rgba(220,140,140,1)' }}
        >
          {error}
        </p>
      )}

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={handleAddAll}
          disabled={applying || done}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          style={{ background: 'rgba(74,124,156,0.2)', color: 'rgba(160,200,240,1)', border: '1px solid rgba(74,124,156,0.35)' }}
        >
          {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />}
          {applying ? 'Adding…' : done ? 'Added' : 'Add All to Shopping List'}
        </button>
        {selected.size > 0 && !done && (
          <button
            type="button"
            onClick={handleAddSelected}
            disabled={applying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: 'rgba(74,124,92,0.2)', color: 'rgba(80,180,130,1)', border: '1px solid rgba(74,124,92,0.35)' }}
          >
            <Check className="w-3 h-3" />
            Add Selected ({selected.size})
          </button>
        )}
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.45)', border: '1px solid rgba(140,105,65,0.12)' }}
          >
            <Package className="w-3 h-3" />
            Review Items
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Collapsible spec section ─────────────────────────────────────────────────

function QueueSection({ section, userEmail }) {
  const [collapsed, setCollapsed] = useState(false);

  const totalItems = section.recommendations.reduce((s, r) => s + (r.items?.length || 0), 0);

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
          {section.label}
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(140,105,65,0.15)' }} />
        <span
          className="text-[11px] px-2 py-0.5 rounded-full tabular-nums shrink-0"
          style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(100,100,100,0.18)' }}
        >
          {totalItems}
        </span>
        {collapsed
          ? <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} />
          : <ChevronUp   className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} />}
      </button>

      {!collapsed && (
        <div className="space-y-2.5">
          {section.recommendations.map((rec) => (
            <PurchaseGroupCard key={rec.id} rec={rec} userEmail={userEmail} />
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
      <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: 'rgba(74,124,92,0.35)' }} />
      <p className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.6)' }}>
        No purchase or restock actions needed
      </p>
      <p className="text-xs max-w-xs mx-auto" style={{ color: 'rgba(224,216,200,0.35)' }}>
        All tracked items appear to be adequately stocked. Add blends or bottles to your collection to get restock reminders.
      </p>
    </div>
  );
}

// ─── CuratorPurchaseQueue ─────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object[]} props.sections   - Grouped purchase sections from recommendation engine
 * @param {Function} props.onAction   - (actionKey, rec, opts) => Promise — kept for parity
 * @param {string}   props.userEmail  - Current user email (for shopping list creates)
 */
export default function CuratorPurchaseQueue({ sections = [], onAction, userEmail }) {
  const specSections = useMemo(() => buildSpecSections(sections), [sections]);
  const summary      = useMemo(() => computePurchaseSummary(specSections), [specSections]);

  const totalItems = specSections.reduce(
    (s, sec) => s + sec.recommendations.reduce((r, rec) => r + (rec.items?.length || 0), 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: '#F5F1E7' }}>
            Purchase & Restock
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            Actionable queue — add candidates directly to your shopping list
          </p>
        </div>
        {totalItems > 0 && (
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
            style={{ background: 'rgba(74,124,156,0.15)', color: 'rgba(160,200,240,0.9)', border: '1px solid rgba(74,124,156,0.3)' }}
          >
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* 4 summary cards */}
      {specSections.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard value={summary.restock}  label="Restock Now"       color="rgba(220,140,140,0.9)" />
          <SummaryCard value={summary.wishlist} label="Wishlist Ready"    color="rgba(160,200,240,0.9)" />
          <SummaryCard value={summary.gapFill}  label="Gap-Fill Buys"    color="rgba(180,180,180,0.7)" />
          <SummaryCard value={summary.cigar}    label="Cigar Discovery"   color="rgba(220,160,120,0.9)" />
        </div>
      )}

      {/* Queue sections */}
      {specSections.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-5">
          {specSections.map((section) => (
            <QueueSection
              key={section.id}
              section={section}
              userEmail={userEmail}
            />
          ))}
        </div>
      )}
    </div>
  );
}
