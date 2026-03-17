import React, { forwardRef, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, Copy } from 'lucide-react';
import { toast } from 'sonner';
import BrandLogo from '@/components/branding/BrandLogo';

const TONE = {
  pipes: '#A35C5C',
  blends: '#5A7C5A',
  bottles: '#C87941',
  value: '#10B981',
  whiskey: '#C87941',
  sessions: '#8B5CF6',
};

function StatBox({ label, value, color }) {
  return (
    <div
      className="flex flex-col items-center justify-center p-4 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(180,140,75,0.12)',
      }}
    >
      <div
        className="text-2xl font-bold tabular-nums leading-none mb-1"
        style={{
          color,
          fontFamily: "'Georgia', serif",
          textShadow: `0 0 12px ${color}33`,
        }}
      >
        {value}
      </div>
      <div
        className="text-xs uppercase tracking-widest text-center"
        style={{ color: 'rgba(224,216,200,0.5)', letterSpacing: '0.1em' }}
      >
        {label}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="w-full h-px"
      style={{ background: 'linear-gradient(to right, transparent, rgba(180,140,75,0.2), transparent)' }}
    />
  );
}

function HighlightRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span
        className="text-xs uppercase tracking-widest flex-shrink-0 pt-0.5"
        style={{ color: 'rgba(180,140,75,0.6)', letterSpacing: '0.1em' }}
      >
        {label}
      </span>
      <span
        className="text-sm font-semibold text-right truncate"
        style={{ color: '#F5F1E7', maxWidth: '60%' }}
      >
        {value}
      </span>
    </div>
  );
}

const CollectionInsightsCard = forwardRef(({ summary, userProfile, variant = 'hub' }, ref) => {
  if (!summary) return null;

  const pipeStats = [
    { label: 'Pipes', value: summary?.pipes?.count ?? 0, color: TONE.pipes },
    { label: 'Blends', value: summary?.tobacco?.count ?? 0, color: TONE.blends },
    { label: 'Bowls', value: summary?.total?.sessions ?? 0, color: TONE.sessions },
    {
      label: 'oz Cellared',
      value: summary?.raw?.tobaccos?.reduce((sum, b) => {
        return sum + (Number(b?.tin_total_quantity_oz) || 0) + (Number(b?.bulk_total_quantity_oz) || 0) + (Number(b?.pouch_total_quantity_oz) || 0);
      }, 0)?.toFixed?.(0) ?? '0',
      color: TONE.value,
    },
  ];

  const whiskeyStats = [
    { label: 'Bottles', value: summary?.whiskey?.count ?? 0, color: TONE.bottles },
    { label: 'Tastings', value: summary?.total?.tastings ?? 0, color: TONE.sessions },
    {
      label: 'Value',
      value: `$${Number(summary?.whiskey?.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      color: TONE.value,
    },
    { label: 'Avg Rating', value: summary?.whiskey?.avgRating || '—', color: '#F59E0B' },
  ];

  const hubStats = [
    { label: 'Pipes', value: summary?.pipes?.count ?? 0, color: TONE.pipes },
    { label: 'Blends', value: summary?.tobacco?.count ?? 0, color: TONE.blends },
    { label: 'Bottles', value: summary?.whiskey?.count ?? 0, color: TONE.bottles },
    {
      label: 'Total Value',
      value: `$${Number(summary?.total?.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      color: TONE.value,
    },
  ];

  const stats = variant === 'whiskey' ? whiskeyStats : variant === 'pipekeeper' ? pipeStats : hubStats;

  const title = variant === 'whiskey'
    ? 'Whiskey Insights'
    : variant === 'pipekeeper'
    ? 'PipeKeeper Insights'
    : 'Collection Insights';

  const subtitle = variant === 'whiskey'
    ? "A Collector's Snapshot"
    : 'My Collection at a Glance';

  // Highlight row data
  const hl = summary?.highlights || {};
  const bottleLabel = hl.mostValuedBottle?.category === 'wine'
    ? 'Top Wine'
    : hl.mostValuedBottle?.category === 'whiskey'
    ? 'Top Whiskey'
    : 'Top Bottle';

  return (
    <div ref={ref} className="flex justify-center py-4">
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #2a1f18 0%, #1a1210 60%, #1f1510 100%)',
          border: '2px solid rgba(180,140,75,0.28)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(180,140,75,0.1)',
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center space-y-4">
          <div className="flex justify-center">
            <BrandLogo showWordmark={false} imageClassName="w-14 h-14" />
          </div>
          <div>
            <h2
              className="text-xl font-bold tracking-tight"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              {title}
            </h2>
            <p
              className="text-xs uppercase tracking-widest mt-1"
              style={{ color: 'rgba(180,140,75,0.55)', letterSpacing: '0.12em' }}
            >
              {subtitle}
            </p>
          </div>
          {userProfile?.display_name && (
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {userProfile.display_name}
            </p>
          )}
        </div>

        <Divider />

        {/* Stats */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <StatBox key={s.label} label={s.label} value={s.value} color={s.color} />
            ))}
          </div>
        </div>

        {/* Highlights */}
        {(hl.mostUsedPipe || hl.mostValuedBottle) && (
          <>
            <Divider />
            <div className="px-8 py-4">
              {variant !== 'whiskey' && hl.mostUsedPipe && (
                <HighlightRow label="Most Used Pipe" value={hl.mostUsedPipe.name} />
              )}
              {variant === 'whiskey' && hl.mostValuedBottle && (
                <HighlightRow label="Top Bottle" value={hl.mostValuedBottle.name} />
              )}
              {variant === 'hub' && hl.mostValuedBottle && (
                <HighlightRow label={bottleLabel} value={hl.mostValuedBottle.name} />
              )}
            </div>
          </>
        )}

        <Divider />

        {/* Footer */}
        <div
          className="px-8 py-4 text-center text-xs"
          style={{ color: 'rgba(224,216,200,0.28)', letterSpacing: '0.08em' }}
        >
          Tracked with CollectionKeeper
        </div>
      </div>
    </div>
  );
});

CollectionInsightsCard.displayName = 'CollectionInsightsCard';

export function CollectionInsightsShareModal({ isOpen, onClose, summary, userProfile, variant = 'hub' }) {
  const cardRef = React.useRef(null);

  if (!isOpen) return null;

  const handleDownloadImage = async () => {
    if (!cardRef.current) return toast.error('Failed to generate image');
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#1a1210',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `collectionkeeper-${variant}-${Date.now()}.png`;
      link.click();
      toast.success('Image downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download image');
    }
  };

  const handleCopyText = async () => {
    const pipes = summary?.pipes?.count || 0;
    const blends = summary?.tobacco?.count || 0;
    const bottles = summary?.whiskey?.count || 0;
    const value = Math.round(summary?.total?.value || summary?.whiskey?.value || 0);

    const text = variant === 'whiskey'
      ? `My WhiskeyKeeper collection:\n${bottles} bottle${bottles !== 1 ? 's' : ''}, ${summary?.total?.tastings || 0} tasting${(summary?.total?.tastings || 0) !== 1 ? 's' : ''}.\nCollection value: $${value.toLocaleString()}.`
      : variant === 'pipekeeper'
      ? `My PipeKeeper collection:\n${pipes} pipe${pipes !== 1 ? 's' : ''}, ${blends} blend${blends !== 1 ? 's' : ''}, ${summary?.total?.sessions || 0} sessions logged.`
      : `My CollectionKeeper stats:\n${pipes} pipe${pipes !== 1 ? 's' : ''}, ${blends} blend${blends !== 1 ? 's' : ''}, ${bottles} bottle${bottles !== 1 ? 's' : ''}.\nTotal collection value: $${value.toLocaleString()}.`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Summary copied');
    } catch {
      toast.error('Failed to copy summary');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div
        className="w-full max-w-xl rounded-2xl p-6 space-y-5"
        style={{
          background: 'linear-gradient(145deg, rgba(42,30,20,0.97), rgba(22,14,10,0.99))',
          border: '1px solid rgba(180,140,75,0.2)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.8)',
        }}
      >
        <CollectionInsightsCard ref={cardRef} summary={summary} userProfile={userProfile} variant={variant} />

        <div className="flex flex-wrap gap-3 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyText}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Text
          </Button>
          <Button size="sm" onClick={handleDownloadImage}>
            <Download className="w-4 h-4 mr-2" />
            Download Image
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CollectionInsightsCard;