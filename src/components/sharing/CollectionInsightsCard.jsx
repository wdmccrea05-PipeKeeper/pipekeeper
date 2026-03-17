import React, { forwardRef } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, Copy } from 'lucide-react';
import { toast } from 'sonner';
import BrandLogo from '@/components/branding/BrandLogo';

function statBox(label, value, tone = '#D4A574') {
  return (
    <div
      className="p-4 rounded-lg"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(180,140,75,0.18)',
      }}
    >
      <div className="text-2xl font-bold" style={{ color: tone }}>
        {value}
      </div>
      <div
        className="text-xs uppercase tracking-wider mt-1"
        style={{ color: 'rgba(224,216,200,0.62)' }}
      >
        {label}
      </div>
    </div>
  );
}

const CollectionInsightsCard = forwardRef(({ summary, userProfile, variant = 'hub' }, ref) => {
  if (!summary) return null;

  const pipeStats = [
    { label: 'Pipes', value: summary?.pipes?.count ?? 0, tone: '#A35C5C' },
    { label: 'Blends', value: summary?.tobacco?.count ?? 0, tone: '#5A7C5A' },
    { label: 'Bowls Logged', value: summary?.total?.sessions ?? 0, tone: '#B48C4B' },
    {
      label: 'oz Cellared',
      value:
        summary?.raw?.tobaccos?.reduce((sum, b) => {
          const tinOz = Number(b?.tin_total_quantity_oz) || 0;
          const bulkOz = Number(b?.bulk_total_quantity_oz) || 0;
          const pouchOz = Number(b?.pouch_total_quantity_oz) || 0;
          return sum + tinOz + bulkOz + pouchOz;
        }, 0)?.toFixed?.(0) ?? '0',
      tone: '#C87941',
    },
  ];

  const whiskeyStats = [
    { label: 'Bottles', value: summary?.whiskey?.count ?? 0, tone: '#D4A574' },
    { label: 'Tastings', value: summary?.total?.tastings ?? 0, tone: '#B48C4B' },
    {
      label: 'Collection Value',
      value: `$${Number(summary?.whiskey?.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      tone: '#10B981',
    },
    {
      label: 'Avg Rating',
      value: summary?.whiskey?.avgRating || '—',
      tone: '#8B5CF6',
    },
  ];

  const hubStats = [
    { label: 'Pipes', value: summary?.pipes?.count ?? 0, tone: '#A35C5C' },
    { label: 'Blends', value: summary?.tobacco?.count ?? 0, tone: '#5A7C5A' },
    { label: 'Bottles', value: summary?.whiskey?.count ?? 0, tone: '#D4A574' },
    {
      label: 'Total Value',
      value: `$${Number(summary?.total?.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      tone: '#10B981',
    },
  ];

  const stats = variant === 'whiskey' ? whiskeyStats : variant === 'pipekeeper' ? pipeStats : hubStats;

  return (
    <div ref={ref} className="flex justify-center py-4">
      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6"
        style={{
          background: 'linear-gradient(135deg, #2a1f18 0%, #1f1510 100%)',
          border: '2px solid rgba(180, 140, 75, 0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div
              className="p-2 rounded-xl"
              style={{
                background: 'rgba(180,140,75,0.10)',
                border: '1px solid rgba(180,140,75,0.25)',
              }}
            >
              <BrandLogo showWordmark={false} compact imageClassName="w-10 h-10" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#F5F1E7' }}>
            {variant === 'whiskey' ? 'Whiskey Insights' : variant === 'pipekeeper' ? 'PipeKeeper Insights' : 'Collection Insights'}
          </h2>
          <p className="text-sm" style={{ color: 'rgba(224, 216, 200, 0.7)' }}>
            {userProfile?.display_name || 'My Collection'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {stats.map((s) => (
            <React.Fragment key={s.label}>{statBox(s.label, s.value, s.tone)}</React.Fragment>
          ))}
        </div>

        <div className="space-y-3 pt-4 border-t border-[rgba(180,140,75,0.2)]">
          {variant !== 'whiskey' && summary?.highlights?.mostUsedPipe ? (
            <div>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(180,140,75,0.8)' }}>
                Most Used Pipe
              </div>
              <div className="font-semibold text-sm" style={{ color: '#F5F1E7' }}>
                {summary.highlights.mostUsedPipe.name}
              </div>
            </div>
          ) : null}

          {variant === 'whiskey' && summary?.highlights?.mostValuedBottle ? (
            <div>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(180,140,75,0.8)' }}>
                Top Bottle
              </div>
              <div className="font-semibold text-sm" style={{ color: '#F5F1E7' }}>
                {summary.highlights.mostValuedBottle.name}
              </div>
            </div>
          ) : null}

          {variant === 'hub' && summary?.highlights?.mostValuedBottle ? (
            <div>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(180,140,75,0.8)' }}>
                Collection Highlight
              </div>
              <div className="font-semibold text-sm" style={{ color: '#F5F1E7' }}>
                {summary.highlights.mostValuedBottle.name}
              </div>
            </div>
          ) : null}
        </div>

        <div className="text-center text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
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
        backgroundColor: '#0f0b08',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `collectionkeeper-insights-${Date.now()}.png`;
      link.click();
      toast.success('Image downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download image');
    }
  };

  const handleCopyText = async () => {
    const text =
      variant === 'whiskey'
        ? `My WhiskeyKeeper stats: ${summary?.whiskey?.count || 0} bottles, ${summary?.total?.tastings || 0} tastings, value $${Math.round(summary?.whiskey?.value || 0)}`
        : variant === 'pipekeeper'
        ? `My PipeKeeper stats: ${summary?.pipes?.count || 0} pipes, ${summary?.tobacco?.count || 0} blends, ${summary?.total?.sessions || 0} bowls`
        : `My CollectionKeeper stats: ${summary?.pipes?.count || 0} pipes, ${summary?.tobacco?.count || 0} blends, ${summary?.whiskey?.count || 0} bottles, value $${Math.round(summary?.total?.value || 0)}`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Summary copied');
    } catch {
      toast.error('Failed to copy summary');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div
        className="w-full max-w-xl rounded-2xl p-6 space-y-6"
        style={{
          background: 'linear-gradient(145deg, rgba(50,35,22,0.96), rgba(24,16,10,0.98))',
          border: '1px solid rgba(180,140,75,0.2)',
        }}
      >
        <CollectionInsightsCard ref={cardRef} summary={summary} userProfile={userProfile} variant={variant} />

        <div className="flex flex-wrap gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" onClick={handleCopyText}>
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button onClick={handleDownloadImage}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CollectionInsightsCard;