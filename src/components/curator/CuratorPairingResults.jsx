/**
 * CuratorPairingResults
 *
 * Renders structured pairing entries — not prose summaries.
 * Shows: left item ↔ right item, pairing mode badge, rationale, follow-up actions.
 */

import React from 'react';
import { ArrowLeftRight, HelpCircle, BookOpen, Star, ExternalLink } from 'lucide-react';
import { PAIRING_MODE, PAIRING_MODE_LABELS } from '@/lib/curator/pairingEngine.js';
import { createPageUrl } from '@/components/utils/createPageUrl';

const PAIRING_MODE_STYLES = {
  [PAIRING_MODE.DIRECT_PAIRING]: {
    bg:     'rgba(46,125,92,0.15)',
    color:  'rgba(80,180,130,1)',
    border: '1px solid rgba(46,125,92,0.3)',
  },
  [PAIRING_MODE.COLLECTION_MIX_MATCH]: {
    bg:     'rgba(180,140,75,0.15)',
    color:  'rgba(212,165,116,1)',
    border: '1px solid rgba(180,140,75,0.3)',
  },
};

const TYPE_ICON_COLORS = {
  pipe:    'rgba(200,155,100,0.95)',
  blend:   'rgba(100,180,130,0.95)',
  tobacco: 'rgba(100,180,130,0.95)',
  bottle:  'rgba(120,170,220,0.95)',
  whiskey: 'rgba(120,170,220,0.95)',
  cigar:   'rgba(210,120,120,0.95)',
};

const TYPE_PAGE = {
  pipe:    'Pipes',
  blend:   'Tobacco',
  tobacco: 'Tobacco',
  bottle:  'Whiskey',
  whiskey: 'Whiskey',
  cigar:   'Cigars',
};

function ItemPill({ item }) {
  const name  = item?.name || '—';
  const type  = item?.type || item?.recordType || 'default';
  const color = TYPE_ICON_COLORS[type] || 'rgba(224,216,200,0.7)';
  return (
    <div
      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(140,105,65,0.15)' }}
    >
      <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(224,216,200,0.38)' }}>
        {type}
      </p>
      <p className="text-xs font-bold truncate leading-tight" style={{ color }} title={name}>
        {name}
      </p>
    </div>
  );
}

/**
 * @param {object}   props
 * @param {object[]} props.pairings  - Array of pairing result items
 * @param {Function} [props.onAction] - (actionKey, pairing) => void
 */
export default function CuratorPairingResults({ pairings = [], onAction }) {
  if (!pairings.length) return null;

  return (
    <div className="space-y-2">
      {pairings.map((pairing, idx) => {
        const modeStyle = PAIRING_MODE_STYLES[pairing.pairingMode] || PAIRING_MODE_STYLES[PAIRING_MODE.DIRECT_PAIRING];
        const modeLabel = PAIRING_MODE_LABELS[pairing.pairingMode] || pairing.pairingMode;

        const leftType  = pairing.leftItem?.type  || pairing.leftItem?.recordType;
        const rightType = pairing.rightItem?.type || pairing.rightItem?.recordType;
        const leftPage  = leftType  ? TYPE_PAGE[leftType]  : null;
        const rightPage = rightType ? TYPE_PAGE[rightType] : null;
        const isPipePairing = leftType === 'pipe';

        return (
          <div
            key={pairing.id || idx}
            className="rounded-xl p-2.5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(140,105,65,0.12)',
            }}
          >
            {/* Header: mode badge only */}
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                style={{ ...modeStyle }}
              >
                {modeLabel}
              </span>
              {pairing.score != null && (
                <span className="text-[9px]" style={{ color: 'rgba(224,216,200,0.25)' }}>
                  {pairing.score}/10
                </span>
              )}
            </div>

            {/* Left ↔ Right items */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <ItemPill item={pairing.leftItem} />
              <ArrowLeftRight className="w-3 h-3 shrink-0" style={{ color: 'rgba(180,140,75,0.45)' }} />
              <ItemPill item={pairing.rightItem} />
            </div>

            {/* Bridge blend */}
            {pairing.blendBridge && (
              <p className="text-[10px] mb-1" style={{ color: 'rgba(224,216,200,0.38)' }}>
                via <span style={{ color: 'rgba(100,180,130,0.8)' }}>{pairing.blendBridge.name}</span>
              </p>
            )}

            {/* Rationale */}
            {pairing.rationale && (
              <p className="text-[11px] leading-snug mb-2" style={{ color: 'rgba(224,216,200,0.5)' }}>
                {pairing.rationale}
              </p>
            )}

            {/* Action row */}
            <div
              className="flex flex-wrap items-center gap-1.5 pt-1.5"
              style={{ borderTop: '1px solid rgba(140,105,65,0.1)' }}
            >
              {leftPage && (
                <a
                  href={createPageUrl(leftPage)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.55)', border: '1px solid rgba(140,105,65,0.14)' }}
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  {pairing.leftItem?.name ? pairing.leftItem.name.split(' ').slice(0, 2).join(' ') : leftType}
                </a>
              )}
              {rightPage && rightPage !== leftPage && (
                <a
                  href={createPageUrl(rightPage)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.55)', border: '1px solid rgba(140,105,65,0.14)' }}
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  {pairing.rightItem?.name ? pairing.rightItem.name.split(' ').slice(0, 2).join(' ') : rightType}
                </a>
              )}

              {onAction && (
                <button
                  type="button"
                  onClick={() => onAction('ask_curator', pairing)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-medium"
                  style={{ background: 'rgba(74,124,156,0.1)', color: 'rgba(120,170,220,0.8)', border: '1px solid rgba(74,124,156,0.22)' }}
                >
                  <HelpCircle className="w-2.5 h-2.5" />
                  Ask
                </button>
              )}

              {onAction && isPipePairing && (
                <button
                  type="button"
                  onClick={() => onAction('build_session', pairing)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-medium"
                  style={{ background: 'rgba(74,124,92,0.1)', color: 'rgba(80,180,130,0.8)', border: '1px solid rgba(74,124,92,0.22)' }}
                >
                  <BookOpen className="w-2.5 h-2.5" />
                  Session
                </button>
              )}

              {onAction && (
                <button
                  type="button"
                  onClick={() => onAction('save_pairing', pairing)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-medium"
                  style={{ background: 'rgba(180,140,75,0.08)', color: 'rgba(212,165,116,0.75)', border: '1px solid rgba(180,140,75,0.2)' }}
                >
                  <Star className="w-2.5 h-2.5" />
                  Save
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
