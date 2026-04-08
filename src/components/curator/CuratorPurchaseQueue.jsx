/**
 * CuratorPurchaseQueue — Surface 3: Purchase & Restock
 *
 * 3 queue types:
 *   1. Restock Now  — low stock / depleted
 *   2. Wishlist Ready — wishlist_ready goal
 *   3. Gap-Fill Buys — catch-all + cigar_aging_stock_up
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ShoppingCart, Check, Loader2, CheckCircle2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import CuratorItemPreviewList from './CuratorItemPreviewList';
import { PRIORITY_STYLES } from '@/lib/curator/recommendationSchema.js';
import { executeRecommendationAction } from '@/lib/curator/recommendationActions.js';

// ─── Queue type definitions ───────────────────────────────────────────────────

const RESTOCK_GOALS = new Set([
  'low_stock_favorites', 'low_stock_blends', 'depleted_favorites',
  'discontinued_low_stock', 'low_stock_bottles', 'depleted_bottles',
  'cigar_low_inventory',
]);
const WISHLIST_GOALS = new Set(['wishlist_ready']);
// Gap-Fill = cigar_aging_stock_up + anything not in the above two sets

const QUEUE_GROUPS = [
  { id: 'restock',  label: 'Restock Now',     color: 'rgba(220,140,140,0.9)' },
  { id: 'wishlist', label: 'Wishlist Ready',   color: 'rgba(160,200,240,0.9)' },
  { id: 'gap_fill', label: 'Gap-Fill Buys',    color: 'rgba(180,180,180,0.7)' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQueueGroups(sections) {
  const allRecs = sections.flatMap((s) => s.recommendations || []);

  const restockRecs  = allRecs.filter((r) => RESTOCK_GOALS.has(r.goal));
  const wishlistRecs = allRecs.filter((r) => WISHLIST_GOALS.has(r.goal));
  const gapFillRecs  = allRecs.filter((r) => !RESTOCK_GOALS.has(r.goal) && !WISHLIST_GOALS.has(r.goal));

  return [
    { id: 'restock',  label: 'Restock Now',   color: 'rgba(220,140,140,0.9)', recommendations: restockRecs  },
    { id: 'wishlist', label: 'Wishlist Ready', color: 'rgba(160,200,240,0.9)', recommendations: wishlistRecs },
    { id: 'gap_fill', label: 'Gap-Fill Buys',  color: 'rgba(180,180,180,0.7)', recommendations: gapFillRecs  },
  ].filter((g) => g.recommendations.length > 0);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const s = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function StatChip({ value, label, color }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}33` }}>
      <span style={{ color, fontSize: '18px', fontWeight: 700 }}>{value}</span>
      <span style={{ color: '#A1A1AA', fontSize: '13px' }}>{label}</span>
    </div>
  );
}

function PurchaseGroupCard({ rec, userEmail }) {
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState(null);

  const items      = rec.items || [];
  const allChecked = items.length > 0 && selected.size === items.length;

  const toggleAll  = useCallback(() => {
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
      await executeRecommendationAction({ ...rec, items: subset }, 'add_to_shopping_list', { userEmail });
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
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.18)' }}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
            <PriorityBadge priority={rec.priority} />
            <span className="text-[10px] px-2 py-0.5 rounded-full tabular-nums" style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.45)', border: '1px solid rgba(100,100,100,0.18)' }}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
            {done && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(80,180,130,0.9)' }}>
                <CheckCircle2 className="w-3 h-3" />
                Added
              </span>
            )}
          </div>
          <p style={{ color: '#F5F5F7', fontSize: '15px', fontWeight: 600 }}>{rec.title}</p>
          {rec.whyItMatters && (
            <p className="text-xs mt-1" style={{ color: '#A1A1AA' }}>{rec.whyItMatters}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 p-1.5 rounded-lg transition-colors"
          style={{ color: 'rgba(224,216,200,0.35)', border: '1px solid rgba(140,105,65,0.15)' }}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!expanded && <CuratorItemPreviewList items={items} maxPreview={4} />}

      {expanded && (
        <div className="space-y-1.5 pt-1" style={{ borderTop: '1px solid rgba(140,105,65,0.12)' }}>
          <label className="flex items-center gap-2 cursor-pointer py-1.5" style={{ borderBottom: '1px solid rgba(140,105,65,0.1)' }}>
            <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-3.5 h-3.5 rounded accent-amber-600" />
            <span className="text-xs font-medium" style={{ color: 'rgba(224,216,200,0.55)' }}>Select all</span>
          </label>
          {items.map((item) => {
            const id = item.id || item.recordId;
            return (
              <label key={id} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-white/5 transition-colors">
                <input type="checkbox" checked={selected.has(id)} onChange={() => toggleItem(id)} className="w-3.5 h-3.5 rounded accent-amber-600 shrink-0" />
                <span className="text-xs flex-1 truncate" style={{ color: 'rgba(224,216,200,0.8)' }}>
                  {item.itemName || item.recordName || item.name || '—'}
                </span>
                {item.brand && <span className="text-[10px] shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }}>{item.brand}</span>}
              </label>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-xs rounded px-2 py-1" style={{ background: 'rgba(139,58,58,0.15)', color: 'rgba(220,140,140,1)' }}>{error}</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={handleAddAll}
          disabled={applying || done}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          style={{ background: '#C6A15B', color: '#0B0B0C', border: 'none' }}
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
            style={{ background: 'transparent', color: '#F5F5F7', border: '1px solid rgba(255,255,255,0.1)' }}
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
        <span className="text-[11px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(224,216,200,0.45)' }}>
          {section.label}
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(140,105,65,0.15)' }} />
        <span className="text-[11px] px-2 py-0.5 rounded-full tabular-nums shrink-0" style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(100,100,100,0.18)' }}>
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

function EmptyState() {
  return (
    <div className="py-16 text-center space-y-3">
      <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: 'rgba(74,124,92,0.35)' }} />
      <p className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.6)' }}>No purchase or restock actions needed</p>
      <p className="text-xs max-w-xs mx-auto" style={{ color: 'rgba(224,216,200,0.35)' }}>
        All tracked items appear to be adequately stocked.
      </p>
    </div>
  );
}

/**
 * @param {object}   props
 * @param {object[]} props.sections
 * @param {Function} props.onAction
 * @param {string}   props.userEmail
 */
export default function CuratorPurchaseQueue({ sections = [], onAction, userEmail }) {
  const queueGroups = useMemo(() => buildQueueGroups(sections), [sections]);

  // Stats from rendered grouped arrays — computed in a single pass
  const { restockItems, wishlistItems, gapFillItems } = useMemo(() => {
    const find = (id) => (queueGroups.find((g) => g.id === id)?.recommendations || []).flatMap((r) => r.items || []);
    return { restockItems: find('restock'), wishlistItems: find('wishlist'), gapFillItems: find('gap_fill') };
  }, [queueGroups]);

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 style={{ color: '#F5F5F7', fontSize: '20px', fontWeight: 600, margin: 0 }}>
          Purchase &amp; Restock
        </h2>
        <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, marginTop: '4px' }}>
          Actionable queue — add candidates directly to your shopping list
        </p>
      </div>

      {/* 3 stat chips */}
      {queueGroups.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <StatChip value={restockItems.length}  label="Restock Now"   color="rgba(220,140,140,0.9)" />
          <StatChip value={wishlistItems.length} label="Wishlist Ready" color="rgba(160,200,240,0.9)" />
          <StatChip value={gapFillItems.length}  label="Gap-Fill Buys" color="rgba(180,180,180,0.7)" />
        </div>
      )}

      {queueGroups.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-5">
          {queueGroups.map((section) => (
            <QueueSection key={section.id} section={section} userEmail={userEmail} />
          ))}
        </div>
      )}
    </div>
  );
}
