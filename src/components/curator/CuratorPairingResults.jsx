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
import { createPageUrl } from '@/components/utils/createPageUrl';

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
      className="flex-1 min-w-0 rounded-lg px-3 py-2.5 text-center space-y-1"
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
    <div className="space-y-3">
      {pairings.map((pairing, idx) => {
        const isPipe      = pairing.leftItem?.type === 'pipe' || pairing.leftItem?.recordType === 'pipe';
        const hasTrio     = isPipe && pairing.blendBridge;

        // Prefer structured pairingType field; fall back to extracting from rationale text
        const pairingType = pairing.pairingType || null;
        const typeStyle = pairingType === 'complement'
          ? { bg: 'rgba(46,125,92,0.15)', color: 'rgba(80,180,130,1)', border: '1px solid rgba(46,125,92,0.3)', label: 'Complement' }
          : pairingType === 'contrast'
            ? { bg: 'rgba(74,124,156,0.15)', color: 'rgba(120,170,220,1)', border: '1px solid rgba(74,124,156,0.3)', label: 'Contrast' }
            : null;

        return (
          <div
            key={pairing.id || idx}
            className="rounded-xl p-4"
            style={{
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(140,105,65,0.16)',
            }}
          >
            {/* Header: complement/contrast badge */}
            {typeStyle && (
              <div className="mb-3">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                  style={{ background: typeStyle.bg, color: typeStyle.color, border: typeStyle.border }}
                >
                  {typeStyle.label} Pairing
                </span>
              </div>
            )}

            {/* Trio layout for pipe pairings — Pipe / Blend / Pour equally prominent */}
            {hasTrio ? (
              <div className="flex items-stretch gap-2 mb-3">
                <TrioItem item={pairing.leftItem}  slotLabel="Pipe" />
                <TrioItem item={pairing.blendBridge} slotLabel="Blend" />
                <TrioItem item={pairing.rightItem} slotLabel="Pour" />
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-3">
                <DuoItem item={pairing.leftItem} />
                <span className="text-[10px] shrink-0" style={{ color: 'rgba(180,140,75,0.45)' }} aria-hidden="true">✕</span>
                <DuoItem item={pairing.rightItem} />
              </div>
            )}

            {/* Rationale */}
            {pairing.rationale && (
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(224,216,200,0.72)' }}>
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
