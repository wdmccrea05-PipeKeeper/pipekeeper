/**
 * CuratorPurchaseQueue
 *
 * Purchase & Restock surface — Surface 3.
 *
 * Displays grouped purchase/restock recommendations from the engine.
 * Each group supports:
 *   - Per-item checkboxes for selection
 *   - "Add All to Shopping List" for the group
 *   - "Add Selected to Shopping List" for checked items
 *   - Priority and item count badges
 *
 * No "Acknowledge-only" actions. Every entry is actionable.
 */

import React, { useState, useCallback } from 'react';
import { ShoppingCart, Check, Loader2, CheckCircle2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import CuratorItemPreviewList from './CuratorItemPreviewList';
import { PRIORITY_STYLES } from '@/lib/curator/recommendationSchema.js';
import { executeRecommendationAction } from '@/lib/curator/recommendationActions.js';

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const s = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
}

// ─── Single purchase group card ────────────────────────────────────────────────

function PurchaseGroupCard({ rec, userEmail, onAdded }) {
  const [selected, setSelected]     = useState(new Set());
  const [expanded, setExpanded]     = useState(false);
  const [applying, setApplying]     = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState(null);
  const [addedCount, setAddedCount] = useState(0);

  const items = rec.items || [];
  const allSelected = items.length > 0 && selected.size === items.length;

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id || i.recordId)));
  }, [allSelected, items]);

  const toggleItem = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addItems = useCallback(async (itemSubset) => {
    if (!userEmail || !itemSubset.length || applying) return;
    setApplying(true);
    setError(null);
    try {
      const pseudoRec = { ...rec, items: itemSubset };
      const result = await executeRecommendationAction(pseudoRec, 'add_to_shopping_list', { userEmail });
      setAddedCount((c) => c + (result.added || 0));
      if (itemSubset.length === items.length) setDone(true);
      setSelected(new Set());
      onAdded?.();
    } catch (err) {
      setError(err?.message || 'Failed to add items.');
    } finally {
      setApplying(false);
    }
  }, [rec, items, userEmail, applying, onAdded]);

  const handleAddAll     = () => addItems(items);
  const handleAddSelected = () => {
    const subset = items.filter((i) => selected.has(i.id || i.recordId));
    if (subset.length) addItems(subset);
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.18)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <PriorityBadge priority={rec.priority} />
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(80,80,80,0.12)', color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(100,100,100,0.2)' }}
            >
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
            {done && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(80,180,130,0.9)' }}>
                <CheckCircle2 className="w-3 h-3" />
                Added to list
              </span>
            )}
          </div>
          <p className="text-sm font-bold" style={{ color: '#F5F1E7' }}>{rec.title}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.6)' }}>{rec.whyItMatters}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 p-1.5 rounded-lg transition-colors"
          style={{ color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(140,105,65,0.15)' }}
          aria-label={expanded ? 'Collapse items' : 'Expand items'}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Compact preview (collapsed) */}
      {!expanded && <CuratorItemPreviewList items={items} previewCount={4} />}

      {/* Expanded item list with checkboxes */}
      {expanded && (
        <div className="space-y-1.5">
          {/* Select all row */}
          <label className="flex items-center gap-2 cursor-pointer py-1 border-b" style={{ borderColor: 'rgba(140,105,65,0.15)' }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-3.5 h-3.5 rounded accent-amber-600"
            />
            <span className="text-xs font-medium" style={{ color: 'rgba(224,216,200,0.6)' }}>
              Select all
            </span>
          </label>
          {items.map((item) => {
            const id = item.id || item.recordId;
            return (
              <label
                key={id}
                className="flex items-center gap-2 cursor-pointer py-1 rounded px-1 hover:bg-white/5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(id)}
                  onChange={() => toggleItem(id)}
                  className="w-3.5 h-3.5 rounded accent-amber-600"
                />
                <span className="text-xs flex-1 truncate" style={{ color: 'rgba(224,216,200,0.8)' }}>
                  {item.itemName || item.recordName || item.name || '—'}
                </span>
                {item.brand && (
                  <span className="text-[10px] shrink-0" style={{ color: 'rgba(224,216,200,0.35)' }}>
                    {item.brand}
                  </span>
                )}
                {item.quantityOz != null && (
                  <span className="text-[10px] shrink-0" style={{ color: 'rgba(224,216,200,0.35)' }}>
                    {item.quantityOz.toFixed(1)} oz
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs rounded px-2 py-1" style={{ background: 'rgba(139,58,58,0.15)', color: 'rgba(220,140,140,1)' }}>
          {error}
        </p>
      )}

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
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
        {selected.size > 0 && (
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
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(140,105,65,0.12)' }}
          >
            <Package className="w-3 h-3" />
            Review Items
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Section group ─────────────────────────────────────────────────────────────

function PurchaseSection({ section, userEmail, onAdded }) {
  return (
    <div className="space-y-3">
      <h3
        className="text-xs font-bold uppercase tracking-widest pt-1"
        style={{ color: 'rgba(224,216,200,0.4)' }}
      >
        {section.label}
      </h3>
      {section.recommendations.map((rec) => (
        <PurchaseGroupCard
          key={rec.id}
          rec={rec}
          userEmail={userEmail}
          onAdded={onAdded}
        />
      ))}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="py-16 text-center space-y-3">
      <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: 'rgba(74,124,92,0.4)' }} />
      <p className="text-sm font-medium" style={{ color: 'rgba(224,216,200,0.6)' }}>
        No purchase or restock actions needed.
      </p>
      <p className="text-xs" style={{ color: 'rgba(224,216,200,0.35)' }}>
        All tracked items appear to be stocked. Add blends or bottles to your collection to get restock reminders.
      </p>
    </div>
  );
}

// ─── CuratorPurchaseQueue ──────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object[]} props.sections   - Grouped purchase/restock sections from recommendation engine
 * @param {Function} props.onAction   - (actionKey, rec, opts) => Promise<result>
 * @param {string}   props.userEmail  - Current user email (for shopping list creates)
 */
export default function CuratorPurchaseQueue({ sections = [], onAction, userEmail }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAdded = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const totalItems = sections.reduce(
    (s, g) => s + g.recommendations.reduce((r, rec) => r + (rec.items?.length || 0), 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Surface header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold" style={{ color: '#F5F1E7' }}>
            Purchase &amp; Restock
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            Actionable queue — add items to your shopping list or review candidates.
          </p>
        </div>
        {totalItems > 0 && (
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ background: 'rgba(74,124,156,0.15)', color: 'rgba(160,200,240,0.9)', border: '1px solid rgba(74,124,156,0.3)' }}
          >
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {sections.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6" key={refreshKey}>
          {sections.map((section) => (
            <PurchaseSection
              key={section.category}
              section={section}
              userEmail={userEmail}
              onAdded={handleAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
