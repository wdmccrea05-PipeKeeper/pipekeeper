/**
 * RarityBadge — 5-dot rarity indicator for whiskey bottles.
 *
 * Shows: ●●●○○  Limited
 * Optionally shows a short explanation line.
 */

import React from 'react';
import { getRarityLevel } from './utils/bottleValue';
import { useTranslation } from '@/components/i18n/safeTranslation';

const COLOR_MAP = {
  5: { dot: 'rgba(220,100,100,0.95)', label: 'rgba(220,100,100,0.9)',  bg: 'rgba(220,100,100,0.1)',  border: 'rgba(220,100,100,0.25)' },
  4: { dot: 'rgba(200,130,70,0.95)',  label: 'rgba(200,130,70,0.9)',   bg: 'rgba(200,130,70,0.1)',   border: 'rgba(200,130,70,0.25)' },
  3: { dot: 'rgba(180,140,75,0.95)',  label: 'rgba(212,165,116,0.9)',  bg: 'rgba(180,140,75,0.1)',   border: 'rgba(180,140,75,0.25)' },
  2: { dot: 'rgba(120,170,220,0.85)', label: 'rgba(120,170,220,0.8)',  bg: 'rgba(74,124,156,0.08)',  border: 'rgba(74,124,156,0.2)' },
  1: { dot: 'rgba(160,160,160,0.6)',  label: 'rgba(180,180,180,0.7)',  bg: 'rgba(80,80,80,0.08)',    border: 'rgba(100,100,100,0.18)' },
};

/**
 * @param {object}  props
 * @param {object}  props.bottle             - Bottle record
 * @param {boolean} [props.showExplanation]  - Show the explanation line
 * @param {string}  [props.className]        - Additional class names
 */
export default function RarityBadge({ bottle, showExplanation = false, className = '' }) {
  const { t } = useTranslation();
  const rarity = getRarityLevel(bottle);
  const colors = COLOR_MAP[rarity.level] || COLOR_MAP[2];

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg"
        style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
      >
        <span
          className="text-sm tracking-widest select-none"
          style={{ color: colors.dot }}
          aria-hidden="true"
        >
          {rarity.dots}
        </span>
        <span className="text-xs font-semibold" style={{ color: colors.label }}>
          {t(rarity.labelKey, rarity.label)}
        </span>
      </div>
      {showExplanation && rarity.explanation && (
        <span className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
          {t(rarity.explanationKey, rarity.explanation)}
        </span>
      )}
    </div>
  );
}
