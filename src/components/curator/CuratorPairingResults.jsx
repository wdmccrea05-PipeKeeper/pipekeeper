import React from 'react';
import { ExternalLink } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';

const TYPE_COLORS = {
  pipe: 'rgba(200,155,100,0.95)',
  blend: 'rgba(100,180,130,0.95)',
  bottle: 'rgba(120,170,220,0.95)',
  wine: 'rgba(184,118,142,0.95)',
  cigar: 'rgba(212,165,116,0.98)',
};

const TYPE_PAGE = {
  pipe: 'Pipes',
  blend: 'Tobacco',
  bottle: 'Whiskey',
  wine: 'CollectionHub',
  cigar: 'CigarKeeper',
};

function TrioItem({ item, label }) {
  const type = item?.recordType || item?.type;
  const color = TYPE_COLORS[type] || 'rgba(224,216,200,0.7)';
  const page = TYPE_PAGE[type];

  return (
    <div
      className="min-w-0 rounded-lg px-4 py-3 text-center space-y-1"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(140,105,65,0.15)' }}
    >
      <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(224,216,200,0.35)' }}>{label}</div>
      <div
        className="text-base font-semibold leading-snug"
        style={{ color, hyphens: 'none', overflowWrap: 'break-word', wordBreak: 'normal' }}
        title={item?.name || '—'}
      >
        {item?.name || '—'}
      </div>
      {page && (
        <a
          href={createPageUrl(page)}
          className="inline-flex items-center gap-1 text-[10px]"
          style={{ color: 'rgba(224,216,200,0.35)' }}
        >
          <ExternalLink className="w-2.5 h-2.5" />
          open
        </a>
      )}
    </div>
  );
}

function Badge({ text, tone = 'neutral' }) {
  const style =
    tone === 'success'
      ? { bg: 'rgba(46,125,92,0.16)', color: 'rgba(80,180,130,1)', border: 'rgba(46,125,92,0.28)' }
      : tone === 'gold'
        ? { bg: 'rgba(180,140,75,0.14)', color: 'rgba(212,165,116,1)', border: 'rgba(180,140,75,0.26)' }
        : { bg: 'rgba(74,124,156,0.14)', color: 'rgba(120,170,220,1)', border: 'rgba(74,124,156,0.26)' };

  return (
    <span
      className="text-[11px] px-3 py-1 rounded-full font-medium whitespace-nowrap leading-none"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      {text}
    </span>
  );
}

function getPairingItems(pairing) {
  if (pairing?.smokingSessionType === 'cigar') {
    return [
      { label: 'Cigar', item: pairing.cigar || pairing.cigarItem || pairing.leftItem },
      { label: pairing?.liquidType === 'wine' ? 'Wine' : 'Whiskey', item: pairing.liquid || pairing.wine || pairing.bottle || pairing.rightItem },
    ];
  }

  return [
    { label: 'Pipe', item: pairing.pipe || pairing.leftItem },
    { label: 'Tobacco', item: pairing.blend || pairing.blendBridge },
    { label: pairing?.liquidType === 'wine' ? 'Wine' : 'Whiskey', item: pairing.liquid || pairing.wine || pairing.bottle || pairing.rightItem },
  ];
}

export default function CuratorPairingResults({ pairings = [] }) {
  if (!pairings.length) return null;

  return (
    <div className="space-y-3">
      {pairings.map((pairing) => {
        const items = getPairingItems(pairing);

        return (
          <div key={pairing.id} className="rounded-xl p-4" style={{ background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold" style={{ color: '#F5F5F7' }}>{pairing.narrative || pairing.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {pairing.overlayLabel && <Badge text={pairing.overlayLabel} tone="gold" />}
                  {pairing.confidenceLabel && <Badge text={pairing.confidenceLabel} tone={pairing.pairingType === 'Reinforcing' ? 'success' : 'neutral'} />}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              {items.map((entry) => (
                <TrioItem key={`${pairing.id}_${entry.label}`} item={entry.item} label={entry.label} />
              ))}
            </div>

            {(pairing.whyItWorks || pairing.whatToExpect) && (
              <p className="text-sm mb-3" style={{ color: '#D8D0C2' }}>{pairing.whyItWorks || pairing.whatToExpect}</p>
            )}

            {pairing.bestMomentForIt && (
              <p className="text-xs mb-3" style={{ color: '#A1A1AA' }}><strong>When:</strong> {pairing.bestMomentForIt}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}