/**
 * CuratorPairingResults — structured pairing cards
 */

import React from 'react';
import { HelpCircle, BookOpen, Star } from 'lucide-react';

const TYPE_COLORS = {
  pipe:    'rgba(200,155,100,0.95)',
  blend:   'rgba(100,180,130,0.95)',
  tobacco: 'rgba(100,180,130,0.95)',
  bottle:  'rgba(120,170,220,0.95)',
  whiskey: 'rgba(120,170,220,0.95)',
  cigar:   'rgba(210,120,120,0.95)',
};

const TRIO_LABELS = {
  pipe:    'Pipe',
  blend:   'Blend',
  tobacco: 'Blend',
  bottle:  'Pour',
  whiskey: 'Pour',
  cigar:   'Cigar',
};

const CONFIDENCE_STYLES = {
  high:         { bg: 'rgba(34,197,94,0.15)',   color: '#22C55E',            border: '1px solid rgba(34,197,94,0.3)',    label: 'High Confidence' },
  medium:       { bg: 'rgba(198,161,91,0.15)',   color: '#C6A15B',            border: '1px solid rgba(198,161,91,0.3)',   label: 'Medium Confidence' },
  experimental: { bg: 'rgba(220,140,90,0.15)',   color: 'rgba(220,140,90,1)', border: '1px solid rgba(220,140,90,0.3)',  label: 'Experimental' },
};

const PAIRING_TYPE_STYLES = {
  complement:    { bg: 'rgba(74,124,92,0.2)',    color: 'rgba(80,180,130,1)',    border: '1px solid rgba(74,124,92,0.35)',   label: 'Complement' },
  contrast:      { bg: 'rgba(180,100,50,0.2)',   color: 'rgba(220,140,90,1)',    border: '1px solid rgba(180,100,50,0.35)',  label: 'Contrast' },
  amplification: { bg: 'rgba(74,100,156,0.2)',   color: 'rgba(160,200,240,1)',   border: '1px solid rgba(74,100,156,0.35)', label: 'Amplification' },
  experimental:  { bg: 'rgba(80,80,80,0.15)',    color: 'rgba(180,180,180,0.8)', border: '1px solid rgba(100,100,100,0.25)', label: 'Experimental' },
};

function TrioItem({ item, slotLabel }) {
  const type  = item?.type || item?.recordType || 'default';
  const name  = item?.name || '—';
  const color = TYPE_COLORS[type] || '#F5F5F7';
  const label = slotLabel || TRIO_LABELS[type] || type;

  return (
    <div
      className="flex-1 min-w-0 text-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px 12px' }}
    >
      <p style={{ color: '#71717A', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
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

function DuoItem({ item }) {
  const type  = item?.type || item?.recordType || 'default';
  const name  = item?.name || '—';
  const color = TYPE_COLORS[type] || 'rgba(224,216,200,0.7)';

  return (
    <div
      className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p style={{ color: '#71717A', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{type}</p>
      <p style={{ color, fontSize: '14px', fontWeight: 700, lineHeight: 1.3 }} title={name}>{name}</p>
    </div>
  );
}

function getConfidenceStyle(confidenceLabel) {
  const key = (confidenceLabel || '').toLowerCase();
  if (key in CONFIDENCE_STYLES) return CONFIDENCE_STYLES[key];
  if (key.includes('high'))   return CONFIDENCE_STYLES.high;
  if (key.includes('med'))    return CONFIDENCE_STYLES.medium;
  return CONFIDENCE_STYLES.experimental;
}

function SupportLine({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span style={{ color: '#C6A15B', fontSize: '14px', fontWeight: 600, flexShrink: 0, lineHeight: 1.5 }}>
        {label}:
      </span>
      <p style={{ color: '#A1A1AA', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>{value}</p>
    </div>
  );
}

/**
 * @param {object}   props
 * @param {object[]} props.items     - Array of pairing items
 * @param {Function} [props.onAction] - (actionKey, pairing) => void
 */
export default function CuratorPairingResults({ items = [], onAction }) {
  if (!items.length) return null;

  return (
    <div className="space-y-3">
      {items.map((pairing, idx) => {
        const isPipe  = pairing.leftItem?.type === 'pipe' || pairing.leftItem?.recordType === 'pipe';
        const hasTrio = isPipe && pairing.blendBridge;

        // Confidence badge
        const confStyle = getConfidenceStyle(pairing.confidenceLabel);

        // Pairing type badge
        const ptKey   = (pairing.pairingType || '').toLowerCase();
        const ptStyle = PAIRING_TYPE_STYLES[ptKey] || null;

        // Content fields
        const narrative    = pairing.explanation?.narrative || pairing.rationale || pairing.explanation?.summary;
        const whyItWorks   = pairing.explanation?.whyItWorks;
        const whatToExpect = pairing.explanation?.whatToExpect;
        const bestMoment   = pairing.explanation?.bestMoment;

        return (
          <div
            key={pairing.id || idx}
            style={{
              background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '18px',
              padding: '24px',
            }}
          >
            {/* Header row: confidence + pairing type badge */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {pairing.confidenceLabel && (
                <span style={{ ...confStyle, fontSize: '13px', fontWeight: 600, padding: '3px 12px', borderRadius: '999px' }}>
                  {confStyle.label}
                </span>
              )}
              {ptStyle && (
                <span style={{ background: ptStyle.bg, color: ptStyle.color, border: ptStyle.border, fontSize: '13px', fontWeight: 600, padding: '3px 12px', borderRadius: '999px' }}>
                  {ptStyle.label}
                </span>
              )}
            </div>

            {/* 3-column or 2-column strip */}
            {hasTrio ? (
              <div className="flex items-stretch gap-2 mb-4">
                <TrioItem item={pairing.leftItem}    slotLabel="Pipe" />
                <TrioItem item={pairing.blendBridge} slotLabel="Blend" />
                <TrioItem item={pairing.rightItem}   slotLabel="Pour" />
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-4">
                <DuoItem item={pairing.leftItem} />
                <span style={{ color: 'rgba(180,140,75,0.45)', flexShrink: 0 }} aria-hidden="true">✕</span>
                <DuoItem item={pairing.rightItem} />
              </div>
            )}

            {/* Narrative paragraph */}
            {narrative && (
              <p style={{ color: '#F5F5F7', fontSize: '16px', lineHeight: 1.6, marginBottom: '16px' }}>
                {narrative}
              </p>
            )}

            {/* Support lines */}
            {(whyItWorks || whatToExpect || bestMoment) && (
              <div
                className="space-y-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginBottom: '16px' }}
              >
                <SupportLine label="Why it works"      value={whyItWorks} />
                <SupportLine label="What to expect"    value={whatToExpect} />
                <SupportLine label="Best moment for it" value={bestMoment} />
              </div>
            )}

            {/* Actions */}
            <div
              className="flex flex-wrap items-center gap-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}
            >
              {onAction && (
                <button
                  type="button"
                  onClick={() => onAction('mark_for_session', pairing)}
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
                  className="inline-flex items-center gap-1.5 transition-all"
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
