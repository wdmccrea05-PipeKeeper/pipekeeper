/**
 * CuratorPairingResults
 *
 * Renders structured pairing entries — not prose summaries.
 * Shows: left item ↔ right item, pairing mode badge, rationale.
 */

import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { PAIRING_MODE, PAIRING_MODE_LABELS } from '@/lib/curator/pairingEngine.js';

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
 * @param {object[]} props.pairings - Array of pairing result items
 */
export default function CuratorPairingResults({ pairings = [] }) {
  if (!pairings.length) return null;

  return (
    <div className="space-y-2.5">
      {pairings.map((pairing, idx) => {
        const modeStyle = PAIRING_MODE_STYLES[pairing.pairingMode] || PAIRING_MODE_STYLES[PAIRING_MODE.DIRECT_PAIRING];
        const modeLabel = PAIRING_MODE_LABELS[pairing.pairingMode] || pairing.pairingMode;

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
              <p className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>
                {pairing.rationale}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
