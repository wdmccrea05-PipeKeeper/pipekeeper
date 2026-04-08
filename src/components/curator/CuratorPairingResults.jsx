import React from 'react';
import { HelpCircle, BookOpen, Star, ExternalLink } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';

const TYPE_COLORS = {
  pipe: 'rgba(200,155,100,0.95)',
  blend: 'rgba(100,180,130,0.95)',
  bottle: 'rgba(120,170,220,0.95)',
};

const TYPE_PAGE = {
  pipe: 'Pipes',
  blend: 'Tobacco',
  bottle: 'Whiskey',
};

function TrioItem({ item, label }) {
  const type = item?.recordType || item?.type;
  const color = TYPE_COLORS[type] || 'rgba(224,216,200,0.7)';
  const page = TYPE_PAGE[type];
  return (
    <div
      className="flex-1 min-w-0 rounded-lg px-4 py-3 text-center space-y-1"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(140,105,65,0.15)' }}
    >
      <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(224,216,200,0.35)' }}>{label}</div>
      <div className="text-base font-semibold leading-snug" style={{ color }} title={item?.name || '—'}>
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
      className="text-[11px] px-3 py-1 rounded-full font-medium"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      {text}
    </span>
  );
}

export default function CuratorPairingResults({ pairings = [], onAction }) {
  if (!pairings.length) return null;

  return (
    <div className="space-y-6">
      {pairings.map((pairing) => (
        <div
          key={pairing.id}
          className="rounded-[18px] p-6"
          style={{ background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)', border: '1px solid rgba(140,105,65,0.16)' }}
        >
          <div className="flex items-center gap-3 mb-5">
            <Badge text={pairing.confidenceLabel || 'Medium Confidence'} tone={(pairing.confidenceLabel || '').includes('High') ? 'success' : 'gold'} />
            <Badge text={pairing.pairingType || 'Complement'} tone="neutral" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <TrioItem item={pairing.leftItem} label="Pipe" />
            <TrioItem item={pairing.blendBridge} label="Blend" />
            <TrioItem item={pairing.rightItem} label="Pour" />
          </div>

          <p className="text-[17px] leading-8 mb-5" style={{ color: '#F5F5F7' }}>
            {pairing.narrative}
          </p>

          <div className="space-y-3 border-t pt-4" style={{ borderColor: 'rgba(140,105,65,0.10)' }}>
            <div className="text-[15px] leading-7">
              <span style={{ color: '#C6A15B', fontWeight: 600 }}>Why it works:</span>
              <span style={{ color: '#D8D0C2' }}> {pairing.whyItWorks}</span>
            </div>
            <div className="text-[15px] leading-7">
              <span style={{ color: '#C6A15B', fontWeight: 600 }}>What to expect:</span>
              <span style={{ color: '#D8D0C2' }}> {pairing.whatToExpect}</span>
            </div>
            <div className="text-[15px] leading-7">
              <span style={{ color: '#C6A15B', fontWeight: 600 }}>Best moment for it:</span>
              <span style={{ color: '#D8D0C2' }}> {pairing.bestMomentForIt}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-5 mt-5 border-t" style={{ borderColor: 'rgba(140,105,65,0.10)' }}>
            <button
              type="button"
              onClick={() => onAction?.('build_session', pairing)}
              className="inline-flex items-center gap-2 px-5 h-12 rounded-xl font-medium"
              style={{ background: '#C6A15B', color: '#0B0B0C' }}
            >
              <BookOpen className="w-4 h-4" />
              Build Session
            </button>

            <button
              type="button"
              onClick={() => onAction?.('save_pairing', pairing)}
              className="inline-flex items-center gap-2 px-5 h-12 rounded-xl font-medium"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#F5F5F7' }}
            >
              <Star className="w-4 h-4" />
              Save Pairing
            </button>

            <button
              type="button"
              onClick={() => onAction?.('ask_curator', pairing)}
              className="inline-flex items-center gap-2 px-5 h-12 rounded-xl font-medium"
              style={{ color: '#A1A1AA' }}
            >
              <HelpCircle className="w-4 h-4" />
              Ask Curator
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
