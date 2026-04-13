import React, { useMemo, useState } from 'react';
import { ShoppingCart, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, Package } from 'lucide-react';
import CuratorItemPreviewList from './CuratorItemPreviewList';
import { PRIORITY_STYLES } from '@/lib/curator/recommendationSchema.js';

const RESTOCK_GOALS = new Set([
  'low_stock_favorites',
  'low_stock_blends',
  'depleted_favorites',
  'discontinued_low_stock',
  'low_stock_bottles',
  'depleted_bottles',
  'cigar_low_inventory',
]);

const WISHLIST_GOALS = new Set(['wishlist_ready']);

function buildQueueGroups(sections = []) {
  const allRecs = sections.flatMap((section) => section?.recommendations || []);

  const restock = allRecs.filter((rec) => RESTOCK_GOALS.has(rec.goal));
  const wishlist = allRecs.filter((rec) => WISHLIST_GOALS.has(rec.goal));
  const gapFill = allRecs.filter((rec) => !RESTOCK_GOALS.has(rec.goal) && !WISHLIST_GOALS.has(rec.goal));

  return [
    { id: 'restock', label: 'Restock Now', recommendations: restock, tone: 'rgba(220,140,140,0.9)' },
    { id: 'wishlist', label: 'Wishlist Ready', recommendations: wishlist, tone: 'rgba(160,200,240,0.9)' },
    { id: 'gap_fill', label: 'Gap-Fill Buys', recommendations: gapFill, tone: 'rgba(180,180,180,0.75)' },
  ].filter((group) => group.recommendations.length > 0);
}

function StatChip({ value, label, color }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}33` }}>
      <span style={{ color, fontSize: '18px', fontWeight: 700 }}>{value}</span>
      <span style={{ color: '#A1A1AA', fontSize: '13px' }}>{label}</span>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
      {style.label}
    </span>
  );
}

function PurchaseRecommendationCard({ recommendation, onAction, groupId }) {
  const [expanded, setExpanded] = useState(false);
  const items = recommendation?.items || [];

  const isWishlist = groupId === 'wishlist';
  const itemActionLabel = isWishlist ? 'Move to List' : 'Add';
  const bulkActionLabel = isWishlist ? 'Move All to Shopping List' : 'Add All to Shopping List';

  return (
    <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.18)' }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <PriorityBadge priority={recommendation.priority} />
            <span className="text-[10px] px-2 py-0.5 rounded-full tabular-nums" style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.45)', border: '1px solid rgba(100,100,100,0.18)' }}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="text-[16px] font-semibold" style={{ color: '#F5F5F7' }}>
            {recommendation.title}
          </div>
          {recommendation.summary ? (
            <p className="text-sm mt-2" style={{ color: '#D8D0C2' }}>{recommendation.summary}</p>
          ) : null}
          {recommendation.whyItMatters ? (
            <p className="text-xs mt-2" style={{ color: '#A1A1AA' }}>{recommendation.whyItMatters}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 p-1.5 rounded-lg"
          style={{ color: 'rgba(224,216,200,0.35)', border: '1px solid rgba(140,105,65,0.15)' }}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded ? (
        <div className="space-y-2 pt-1" style={{ borderTop: '1px solid rgba(140,105,65,0.12)' }}>
          {items.map((item) => (
            <div key={item.id || item.recordId} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate" style={{ color: '#F5F5F7' }}>
                  {item.itemName || item.recordName || item.name || '—'}
                </div>
                <div className="text-xs" style={{ color: '#A1A1AA' }}>
                  {item.brand || item.manufacturer || item.recordType || item.itemType || ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAction?.('move_to_shopping_list', recommendation, { itemId: item.recordId || item.id })}
                className="px-3 h-9 rounded-lg text-xs font-semibold"
                style={{ background: '#C6A15B', color: '#0B0B0C' }}
              >
                {itemActionLabel}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <CuratorItemPreviewList items={items} maxPreview={4} />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onAction?.('move_to_shopping_list', recommendation)}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl font-medium"
          style={{ background: '#C6A15B', color: '#0B0B0C' }}
        >
          <ShoppingCart className="w-4 h-4" />
          {bulkActionLabel}
        </button>

        <button
          type="button"
          onClick={() => onAction?.('ask_curator', recommendation)}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl font-medium"
          style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#F5F5F7' }}
        >
          <Package className="w-4 h-4" />
          Ask Curator
        </button>
      </div>
    </div>
  );
}

function QueueSection({ group, onAction }) {
  const [collapsed, setCollapsed] = useState(false);
  const totalItems = group.recommendations.reduce((sum, rec) => sum + ((rec?.items || []).length || 0), 0);

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setCollapsed((v) => !v)} className="w-full flex items-center gap-2 py-1" aria-expanded={!collapsed}>
        <span className="text-[11px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(224,216,200,0.45)' }}>
          {group.label}
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(140,105,65,0.15)' }} />
        <span className="text-[11px] px-2 py-0.5 rounded-full tabular-nums shrink-0" style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.4)', border: '1px solid rgba(100,100,100,0.18)' }}>
          {totalItems}
        </span>
        {collapsed ? <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} /> : <ChevronUp className="w-3 h-3 shrink-0" style={{ color: 'rgba(224,216,200,0.3)' }} />}
      </button>

      {!collapsed ? (
        <div className="space-y-3">
          {group.recommendations.map((rec) => (
            <PurchaseRecommendationCard key={rec.id} recommendation={rec} onAction={onAction} groupId={group.id} />
          ))}
        </div>
      ) : null}
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

export default function CuratorPurchaseQueue({ sections = [], onAction, onRefresh, isRefreshing = false }) {
  const queueGroups = useMemo(() => buildQueueGroups(sections), [sections]);

  const counts = useMemo(() => {
    const restockNow = queueGroups.find((g) => g.id === 'restock')?.recommendations || [];
    const wishlistReady = queueGroups.find((g) => g.id === 'wishlist')?.recommendations || [];
    const gapFillBuys = queueGroups.find((g) => g.id === 'gap_fill')?.recommendations || [];
    return {
      restock: restockNow.length,
      wishlist: wishlistReady.length,
      gapFill: gapFillBuys.length,
    };
  }, [queueGroups]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 style={{ color: '#F5F5F7', fontSize: '20px', fontWeight: 600, margin: 0 }}>Purchase &amp; Restock</h2>
          <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, marginTop: '4px' }}>
            Actionable queue — add candidates directly to your shopping list
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

      {queueGroups.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          <StatChip value={counts.restock} label="Restock Now" color="rgba(220,140,140,0.9)" />
          <StatChip value={counts.wishlist} label="Wishlist Ready" color="rgba(160,200,240,0.9)" />
          <StatChip value={counts.gapFill} label="Gap-Fill Buys" color="rgba(180,180,180,0.7)" />
        </div>
      ) : null}

      {queueGroups.length === 0 ? <EmptyState /> : (
        <div className="space-y-5">
          {queueGroups.map((group) => (
            <QueueSection key={group.id} group={group} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  );
}