/**
 * CuratorResultsBoard
 *
 * Renders grouped recommendation results.
 * One section per category, one card per recommendation goal.
 * No one-card-per-item anti-pattern.
 */

import React, { useMemo } from 'react';
import CuratorRecommendationGroup from './CuratorRecommendationGroup';
import CuratorSelectionBar from './CuratorSelectionBar';
import { CheckCircle2 } from 'lucide-react';

/**
 * @param {object}     props
 * @param {object[]}   props.sections          - Grouped sections from groupRecommendations()
 * @param {string[]}   props.activeCategories   - Active category filter (empty = all)
 * @param {Function}   props.onCategoryToggle   - (category) => void
 * @param {Function}   props.onReset            - () => void
 * @param {Function}   props.onAction           - (actionKey, rec, opts) => Promise
 * @param {Function}   props.onAskCurator       - (prompt) => void
 * @param {string}     props.runLabel           - What triggered this run
 */
export default function CuratorResultsBoard({
  sections = [],
  activeCategories = [],
  onCategoryToggle,
  onReset,
  onAction,
  onAskCurator,
  runLabel = 'Results',
}) {
  const visibleSections = useMemo(() => {
    if (!activeCategories.length) return sections;
    return sections.filter((s) => activeCategories.includes(s.category));
  }, [sections, activeCategories]);

  if (!sections.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <CheckCircle2 className="w-10 h-10" style={{ color: 'rgba(74,124,92,0.6)' }} />
        <p className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.6)' }}>
          No recommendations found
        </p>
        <p className="text-xs text-center max-w-xs" style={{ color: 'rgba(224,216,200,0.4)' }}>
          Your collection looks good — nothing to flag right now.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-2 text-xs px-4 py-2 rounded-lg"
          style={{ background: 'rgba(74,124,92,0.15)', color: 'rgba(80,180,130,0.9)', border: '1px solid rgba(74,124,92,0.3)' }}
        >
          Back to Curator Home
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CuratorSelectionBar
        sections={sections}
        activeCategories={activeCategories}
        onCategoryToggle={onCategoryToggle}
        onReset={onReset}
        runLabel={runLabel}
      />

      {visibleSections.map((section) => (
        <div key={section.category} className="space-y-3">
          {/* Section header */}
          <div className="flex items-center gap-2">
            <p
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(224,216,200,0.4)' }}
            >
              {section.label}
            </p>
            <div
              className="flex-1 h-px"
              style={{ background: 'rgba(140,105,65,0.15)' }}
            />
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.35)', border: '1px solid rgba(100,100,100,0.15)' }}
            >
              {section.recommendations.length}
            </span>
          </div>

          {/* Recommendation cards */}
          <div className="space-y-2.5">
            {section.recommendations.map((rec) => (
              <CuratorRecommendationGroup
                key={rec.id}
                recommendation={rec}
                onAction={onAction}
                onAskCurator={onAskCurator}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
