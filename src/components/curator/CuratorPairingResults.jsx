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

export default function CuratorPairingResults({ pairings = [], onAction, onRefresh }) {
  if (!pairings.length) return null;

  return (