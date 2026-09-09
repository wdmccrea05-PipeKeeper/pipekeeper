import React from 'react';
import { COLLECTION_FILTERS, COLLECTION_FILTER_LABELS } from '@/lib/collection/inventoryLifecycle';

const FILTER_ORDER = [
  COLLECTION_FILTERS.ALL,
  COLLECTION_FILTERS.IN_STOCK,
  COLLECTION_FILTERS.EMPTY,
  COLLECTION_FILTERS.ARCHIVED,
];

/**
 * WhiskeyCollectionFilter — filter tabs for All / In Stock / Empty / Archived.
 * Mobile-first: each tab is a ≥44px touch target.
 */
export default function WhiskeyCollectionFilter({ value, onChange, counts = {} }) {
  return (
    <div
      className="flex rounded-xl overflow-x-auto nav-scroll-bar"
      style={{ border: '1px solid rgba(180,140,75,0.18)' }}
    >
      {FILTER_ORDER.map((filter) => {
        const isActive = value === filter;
        const count = counts[filter] ?? null;
        return (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all"
            style={{
              minHeight: 44,
              minWidth: 44,
              background: isActive ? 'rgba(180,140,75,0.18)' : 'rgba(255,255,255,0.03)',
              color: isActive ? '#F5F1E7' : 'rgba(224,216,200,0.6)',
            }}
          >
            {COLLECTION_FILTER_LABELS[filter]}
            {count != null && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: isActive ? 'rgba(180,140,75,0.25)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? '#D4A574' : 'rgba(224,216,200,0.5)',
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}