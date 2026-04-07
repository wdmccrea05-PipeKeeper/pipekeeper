/**
 * CuratorPairingResults
 *
 * Renders structured pairing entries — not prose summaries.
 *
 * For pipe pairings (has blendBridge):
 *   Shows Pipe / Blend / Pour as an equal three-column trio.
 *
 * For other pairings (cigar + whiskey):
 *   Shows Left ↔ Right layout.
 */

import React from 'react';
import { HelpCircle, BookOpen, Star, ExternalLink } from 'lucide-react';
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

const TYPE_COLORS = {
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

const TRIO_LABELS = {
  pipe:    'Pipe',
  blend:   'Blend',
  tobacco: 'Blend',
  bottle:  'Pour',
  whiskey: 'Pour',
  cigar:   'Cigar',
};

// ─── Trio item column ─────────────────────────────────────────────────────────

function TrioItem({ item, slotLabel }) {
  const type   = item?.type || item?.recordType || 'default';
  const name   = item?.name || '—';
  const color  = TYPE_COLORS[type] || 'rgba(224,216,200,0.7)';
  const page   = TYPE_PAGE[type];
  const label  = slotLabel || TRIO_LABELS[type] || type;

  return (
    <div
      className="flex-1 min-w-0 rounded-lg px-2.5 py-2 text-center space-y-0.5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(140,105,65,0.15)' }}
    >
      <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'rgba(224,216,200,0.38)' }}>
        {label}
      </p>
      <p className="text-xs font-bold truncate leading-snug" style={{ color }} title={name}>
        {name}
      </p>
      {page && (
        <a
          href={createPageUrl(page)}
          className="inline-flex items-center gap-0.5 text-[9px]"
          style={{ color: 'rgba(224,216,200,0.3)' }}
        >
          <ExternalLink className="w-2 h-2" />
          open
        </a>
      )}
    </div>
  );
}

// ─── Two-item pairing layout (cigar + whiskey) ────────────────────────────────

function DuoItem({ item }) {
  const type   = item?.type || item?.recordType || 'default';
  const name   = item?.name || '—';
  const color  = TYPE_COLORS[type] || 'rgba(224,216,200,0.7)';

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
    <div className="space-y-2.5">
      {pairings.map((pairing, idx) => {
        const modeStyle   = PAIRING_MODE_STYLES[pairing.pairingMode] || PAIRING_MODE_STYLES[PAIRING_MODE.DIRECT_PAIRING];
        const modeLabel   = PAIRING_MODE_LABELS[pairing.pairingMode] || pairing.pairingMode;
        const isPipe      = pairing.leftItem?.type === 'pipe' || pairing.leftItem?.recordType === 'pipe';
        const hasTrio     = isPipe && pairing.blendBridge;

        return (
          <div
            key={pairing.id || idx}
            className="rounded-xl p-3"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(140,105,65,0.14)',
            }}
          >
            {/* Mode badge + score */}
            <div className="flex items-center justify-between mb-2">
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

            {/* Trio layout for pipe pairings — Pipe / Blend / Pour equally prominent */}
            {hasTrio ? (
              <div className="flex items-stretch gap-1.5 mb-2">
                <TrioItem item={pairing.leftItem}  slotLabel="Pipe" />
                <TrioItem item={pairing.blendBridge} slotLabel="Blend" />
                <TrioItem item={pairing.rightItem} slotLabel="Pour" />
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <DuoItem item={pairing.leftItem} />
                <span className="text-[10px] shrink-0" style={{ color: 'rgba(180,140,75,0.45)' }} aria-hidden="true">✕</span>
                <DuoItem item={pairing.rightItem} />
              </div>
            )}

            {/* Rationale */}
            {pairing.rationale && (
              <p className="text-xs leading-snug mb-2.5" style={{ color: 'rgba(224,216,200,0.55)' }}>
                {pairing.rationale}
              </p>
            )}

            {/* Action row */}
            <div
              className="flex flex-wrap items-center gap-1.5 pt-1.5"
              style={{ borderTop: '1px solid rgba(140,105,65,0.1)' }}
            >
              {onAction && (
                <button
                  type="button"
                  onClick={() => onAction('ask_curator', pairing)}
                  className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md font-medium"
                  style={{ background: 'rgba(74,124,156,0.12)', color: 'rgba(120,170,220,0.9)', border: '1px solid rgba(74,124,156,0.25)' }}
                >
                  <HelpCircle className="w-2.5 h-2.5" />
                  Ask Curator
                </button>
              )}

              {onAction && isPipe && (
                <button
                  type="button"
                  onClick={() => onAction('build_session', pairing)}
                  className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md font-medium"
                  style={{ background: 'rgba(74,124,92,0.1)', color: 'rgba(80,180,130,0.85)', border: '1px solid rgba(74,124,92,0.22)' }}
                >
                  <BookOpen className="w-2.5 h-2.5" />
                  Session
                </button>
              )}

              {onAction && (
                <button
                  type="button"
                  onClick={() => onAction('save_pairing', pairing)}
                  className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md font-medium"
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
