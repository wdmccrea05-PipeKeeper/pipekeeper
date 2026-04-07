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
  pipe:    'rgba(200,155,100,0.9)',
  blend:   'rgba(100,180,130,0.9)',
  tobacco: 'rgba(100,180,130,0.9)',
  bottle:  'rgba(120,170,220,0.9)',
  whiskey: 'rgba(120,170,220,0.9)',
  cigar:   'rgba(210,120,120,0.9)',
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
  const name = item?.name || '—';
  const type = item?.type || item?.recordType || 'default';
  const color = TYPE_ICON_COLORS[type] || 'rgba(224,216,200,0.7)';
  return (
    <div
      className="flex-1 min-w-0 px-3 py-2 rounded-lg text-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(140,105,65,0.15)' }}
    >
      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(224,216,200,0.4)' }}>
        {type}
      </p>
      <p className="text-sm font-semibold truncate" style={{ color }} title={name}>
        {name}
      </p>
    </div>
  );
}

/**
 * @param {object}   props
 * @param {object[]} props.pairings  - Array of pairing result items
 * @param {Function} [props.onAction] - (actionKey, pairing) => void — optional follow-up actions
 */
export default function CuratorPairingResults({ pairings = [], onAction }) {
  if (!pairings.length) return null;

  return (
    <div className="space-y-2.5">
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
            className="rounded-xl p-3"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(140,105,65,0.12)',
            }}
          >
            {/* Pairing mode badge */}
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                style={{ ...modeStyle }}
              >
                {modeLabel}
              </span>
            </div>

            {/* Left ↔ Right items */}
            <div className="flex items-center gap-2 mb-2">
              <ItemPill item={pairing.leftItem} />
              <ArrowLeftRight className="w-4 h-4 shrink-0" style={{ color: 'rgba(180,140,75,0.5)' }} />
              <ItemPill item={pairing.rightItem} />
            </div>

            {/* Bridge blend if present */}
            {pairing.blendBridge && (
              <p className="text-[11px] mb-1.5" style={{ color: 'rgba(224,216,200,0.45)' }}>
                via <span style={{ color: 'rgba(100,180,130,0.85)' }}>{pairing.blendBridge.name}</span>
              </p>
            )}

            {/* Rationale */}
            {pairing.rationale && (
              <p className="text-xs mb-2" style={{ color: 'rgba(224,216,200,0.55)' }}>
                {pairing.rationale}
              </p>
            )}

            {/* Follow-up actions */}
            <div
              className="flex flex-wrap gap-2 pt-2"
              style={{ borderTop: '1px solid rgba(140,105,65,0.1)' }}
            >
              {/* Open Items — link to each item's collection page */}
              {leftPage && (
                <a
                  href={createPageUrl(leftPage)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.6)', border: '1px solid rgba(140,105,65,0.15)' }}
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  {pairing.leftItem?.name ? `Open ${pairing.leftItem.name}` : `Open ${leftType}`}
                </a>
              )}
              {rightPage && rightPage !== leftPage && (
                <a
                  href={createPageUrl(rightPage)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.6)', border: '1px solid rgba(140,105,65,0.15)' }}
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  {pairing.rightItem?.name ? `Open ${pairing.rightItem.name}` : `Open ${rightType}`}
                </a>
              )}

              {/* Ask Curator */}
              {onAction && (
                <button
                  type="button"
                  onClick={() => onAction('ask_curator', pairing)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors"
                  style={{ background: 'rgba(74,124,156,0.12)', color: 'rgba(120,170,220,0.85)', border: '1px solid rgba(74,124,156,0.25)' }}
                >
                  <HelpCircle className="w-2.5 h-2.5" />
                  Ask Curator
                </button>
              )}

              {/* Build Session — only for pipe pairings */}
              {onAction && isPipePairing && (
                <button
                  type="button"
                  onClick={() => onAction('build_session', pairing)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors"
                  style={{ background: 'rgba(74,124,92,0.12)', color: 'rgba(80,180,130,0.85)', border: '1px solid rgba(74,124,92,0.25)' }}
                >
                  <BookOpen className="w-2.5 h-2.5" />
                  Build Session
                </button>
              )}

              {/* Save Pairing */}
              {onAction && (
                <button
                  type="button"
                  onClick={() => onAction('save_pairing', pairing)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors"
                  style={{ background: 'rgba(180,140,75,0.1)', color: 'rgba(212,165,116,0.8)', border: '1px solid rgba(180,140,75,0.22)' }}
                >
                  <Star className="w-2.5 h-2.5" />
                  Save Pairing
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
