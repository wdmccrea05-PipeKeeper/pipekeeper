/**
 * CuratorSelectionBar
 *
 * Stats and filter bar shown above the results board.
 * Displays recommendation counts per category and active filter state.
 */

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/curator/recommendationSchema.js';

/**
 * @param {object}     props
 * @param {object[]}   props.sections          - Grouped recommendation sections
 * @param {string[]}   props.activeCategories   - Currently active category filters (empty = all)
 * @param {Function}   props.onCategoryToggle   - (category) => void
 * @param {Function}   props.onReset            - () => void — go back to home
 * @param {string}     props.runLabel           - What triggered this run (e.g. "Optimize Collection")
 */
export default function CuratorSelectionBar({
  sections = [],
  activeCategories = [],
  onCategoryToggle,
  onReset,
  runLabel = 'Results',
}) {
  const totalRecs  = sections.reduce((s, g) => s + g.recommendations.length, 0);
  const totalItems = sections.reduce(
    (s, g) => s + g.recommendations.reduce((r, rec) => r + (rec.items?.length || 0), 0),
    0
  );

  return (
    <div
      className="rounded-xl px-4 py-3 space-y-3"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(140,105,65,0.15)' }}
    >
      {/* Top row: label + stats + reset */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
            {runLabel}
          </p>
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(74,124,92,0.15)', color: 'rgba(80,180,130,0.9)', border: '1px solid rgba(74,124,92,0.3)' }}
          >
            {totalRecs} recommendation{totalRecs !== 1 ? 's' : ''}
          </span>
          {totalItems > 0 && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(100,100,100,0.2)' }}
            >
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(140,105,65,0.15)' }}
        >
          <RotateCcw className="w-3 h-3" />
          New Run
        </button>
      </div>

      {/* Category filters */}
      {sections.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {sections.map((section) => {
            const isActive = activeCategories.length === 0 || activeCategories.includes(section.category);
            const count = section.recommendations.length;
            return (
              <button
                key={section.category}
                type="button"
                onClick={() => onCategoryToggle?.(section.category)}
                className="text-[11px] px-2.5 py-1 rounded-lg transition-all font-medium"
                style={
                  isActive
                    ? { background: 'rgba(140,105,65,0.2)', color: 'rgba(224,216,200,0.85)', border: '1px solid rgba(140,105,65,0.35)' }
                    : { background: 'rgba(255,255,255,0.03)', color: 'rgba(224,216,200,0.35)', border: '1px solid rgba(140,105,65,0.1)' }
                }
              >
                {CATEGORY_LABELS[section.category] || section.label}
                <span className="ml-1.5 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
