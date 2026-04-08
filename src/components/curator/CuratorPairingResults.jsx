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
  const color  = TYPE_COLORS[type] || '#F5F5F7';
  const label  = slotLabel || TRIO_LABELS[type] || type;

  return (
    <div
      className="flex-1 min-w-0 text-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px 12px' }}
    >
      <p style={{ color: '#71717A', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
        {label}
      </p>
      <p style={{ color, fontSize: '15px', fontWeight: 700, lineHeight: 1.3 }} title={name}>
        {name}
      </p>
      {item?.status && (
        <p style={{ color: '#71717A', fontSize: '13px', marginTop: '4px' }}>{item.status}</p>
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
            style={{
              background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
              borderRadius: '18px',
              padding: '24px',
            }}
          >
            {/* Header: confidence tag (top-left) + pairing type */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {pairing.confidenceLabel && (
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '3px 12px',
                    borderRadius: '999px',
                    background: pairing.confidenceLabel?.toLowerCase().includes('high') ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                    color: pairing.confidenceLabel?.toLowerCase().includes('high') ? '#22C55E' : '#F59E0B',
                    border: pairing.confidenceLabel?.toLowerCase().includes('high') ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(245,158,11,0.3)',
                  }}
                >
                  {pairing.confidenceLabel?.toLowerCase().includes('high') ? 'High Confidence' : 'Experimental'}
                </span>
              )}
              {typeStyle && (
                <span
                  style={{ background: typeStyle.bg, color: typeStyle.color, border: typeStyle.border, fontSize: '13px', fontWeight: 600, padding: '3px 12px', borderRadius: '999px' }}
                >
                  {typeStyle.label} Pairing
                </span>
              )}
            </div>

            {/* Trio layout for pipe pairings — Pipe / Blend / Pour equally prominent */}
            {hasTrio ? (
              <div className="flex items-stretch gap-2 mb-4">
                <TrioItem item={pairing.leftItem}    slotLabel="Pipe" />
                <TrioItem item={pairing.blendBridge} slotLabel="Blend" />
                <TrioItem item={pairing.rightItem}   slotLabel="Pour" />
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-4">
                <DuoItem item={pairing.leftItem} />
                <span className="text-[10px] shrink-0" style={{ color: 'rgba(180,140,75,0.45)' }} aria-hidden="true">✕</span>
                <DuoItem item={pairing.rightItem} />
              </div>
            )}

            {/* Main expert rationale */}
            {pairing.rationale && (
              <p style={{ color: '#F5F5F7', fontSize: '16px', lineHeight: 1.6, marginBottom: '16px' }}>
                {pairing.rationale}
              </p>
            )}

            {/* Structured FLAVOR / STRUCTURE / SESSION rows */}
            {(pairing.flavorInteraction || pairing.structuralCompatibility || pairing.outcome) && (
              <div
                className="space-y-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginBottom: '16px' }}
              >
                {pairing.flavorInteraction && (
                  <div className="flex items-start gap-3">
                    <span style={{ color: '#C6A15B', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: '72px', paddingTop: '2px', flexShrink: 0 }}>
                      FLAVOR:
                    </span>
                    <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
                      {pairing.flavorInteraction}
                    </p>
                  </div>
                )}
                {pairing.structuralCompatibility && (
                  <div className="flex items-start gap-3">
                    <span style={{ color: '#C6A15B', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: '72px', paddingTop: '2px', flexShrink: 0 }}>
                      STRUCTURE:
                    </span>
                    <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
                      {pairing.structuralCompatibility}
                    </p>
                  </div>
                )}
                {pairing.pipeInfluence && (
                  <div className="flex items-start gap-3">
                    <span style={{ color: '#C6A15B', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: '72px', paddingTop: '2px', flexShrink: 0 }}>
                      PIPE:
                    </span>
                    <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
                      {pairing.pipeInfluence}
                    </p>
                  </div>
                )}
                {pairing.outcome && (
                  <div className="flex items-start gap-3">
                    <span style={{ color: '#C6A15B', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: '72px', paddingTop: '2px', flexShrink: 0 }}>
                      SESSION:
                    </span>
                    <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
                      {pairing.outcome}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action row */}
            <div
              className="flex flex-wrap items-center gap-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}
            >
              {onAction && isPipe && (
                <button
                  type="button"
                  onClick={() => onAction('build_session', pairing)}
                  className="inline-flex items-center gap-2 font-semibold transition-all"
                  style={{ background: '#C6A15B', color: '#0B0B0C', height: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '14px', border: 'none' }}
                >
                  <BookOpen className="w-4 h-4" />
                  Build Session
                </button>
              )}

              {onAction && (
                <button
                  type="button"
                  onClick={() => onAction('save_pairing', pairing)}
                  className="inline-flex items-center gap-2 font-semibold transition-all"
                  style={{ background: 'transparent', color: '#F5F5F7', height: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '14px', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Star className="w-4 h-4" />
                  Save Pairing
                </button>
              )}

              {onAction && (
                <button
                  type="button"
                  onClick={() => onAction('ask_curator', pairing)}
                  className="inline-flex items-center gap-2 transition-all"
                  style={{ color: '#A1A1AA', background: 'transparent', border: 'none', fontSize: '14px', height: '40px', padding: '0 8px' }}
                >
                  <HelpCircle className="w-4 h-4" />
                  Ask Curator
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}