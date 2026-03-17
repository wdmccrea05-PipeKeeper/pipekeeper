import React, { forwardRef, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/components/i18n/safeTranslation';

const COLLECTIONKEEPER_LOGO = 
  "https://media.base44.com/images/public/694956e18d119cc497192525/0cc662018_CollectionKeeperUpdated.png";

/**
 * CollectionInsightsCard Component
 * Displays collection statistics in a shareable card format
 */
const CollectionInsightsCard = forwardRef(({ insights, userProfile }, ref) => {
  const { t } = useTranslation();

  if (!insights) {
    return null;
  }

  const cardContent = (
    <div 
      className="w-full max-w-sm rounded-2xl p-8 space-y-6"
      style={{
        background: 'linear-gradient(135deg, #2a1f18 0%, #1f1510 100%)',
        border: '2px solid rgba(180, 140, 75, 0.35)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <img 
          src={COLLECTIONKEEPER_LOGO} 
          alt="CollectionKeeper" 
          className="w-12 h-12 mx-auto object-contain"
          style={{ mixBlendMode: 'screen' }}
        />
        <h2 
          className="text-2xl font-bold tracking-tight"
          style={{ color: '#F5F1E7' }}
        >
          Collection Insights
        </h2>
        <p 
          className="text-sm"
          style={{ color: 'rgba(224, 216, 200, 0.7)' }}
        >
          {userProfile?.display_name || 'My Collection'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Pipes */}
        <div 
          className="p-4 rounded-lg"
          style={{
            background: 'rgba(163, 92, 92, 0.15)',
            border: '1px solid rgba(163, 92, 92, 0.3)',
          }}
        >
          <div 
            className="text-2xl font-bold"
            style={{ color: '#A35C5C' }}
          >
            {insights.totalPipes}
          </div>
          <div 
            className="text-xs uppercase tracking-wider mt-1"
            style={{ color: 'rgba(224, 216, 200, 0.6)' }}
          >
            Pipes
          </div>
        </div>

        {/* Total Blends */}
        <div 
          className="p-4 rounded-lg"
          style={{
            background: 'rgba(90, 124, 90, 0.15)',
            border: '1px solid rgba(90, 124, 90, 0.3)',
          }}
        >
          <div 
            className="text-2xl font-bold"
            style={{ color: '#5A7C5A' }}
          >
            {insights.totalBlends}
          </div>
          <div 
            className="text-xs uppercase tracking-wider mt-1"
            style={{ color: 'rgba(224, 216, 200, 0.6)' }}
          >
            Blends
          </div>
        </div>

        {/* Bowls Logged */}
        <div 
          className="p-4 rounded-lg"
          style={{
            background: 'rgba(180, 140, 75, 0.15)',
            border: '1px solid rgba(180, 140, 75, 0.3)',
          }}
        >
          <div 
            className="text-2xl font-bold"
            style={{ color: '#B48C4B' }}
          >
            {insights.totalBowlsLogged}
          </div>
          <div 
            className="text-xs uppercase tracking-wider mt-1"
            style={{ color: 'rgba(224, 216, 200, 0.6)' }}
          >
            Bowls Logged
          </div>
        </div>

        {/* Cellar Size */}
        <div 
          className="p-4 rounded-lg"
          style={{
            background: 'rgba(100, 80, 60, 0.15)',
            border: '1px solid rgba(100, 80, 60, 0.3)',
          }}
        >
          <div 
            className="text-2xl font-bold"
            style={{ color: '#C87941' }}
          >
            {insights.cellarSize > 0 ? Math.round(insights.cellarSize) : '—'}
          </div>
          <div 
            className="text-xs uppercase tracking-wider mt-1"
            style={{ color: 'rgba(224, 216, 200, 0.6)' }}
          >
            oz Cellared
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="space-y-3 pt-4 border-t border-[rgba(180,140,75,0.2)]">
        {insights.mostUsedPipe && (
          <div>
            <div 
              className="text-xs uppercase tracking-wider mb-1"
              style={{ color: 'rgba(180, 140, 75, 0.8)' }}
            >
              Most Used Pipe
            </div>
            <div 
              className="font-semibold text-sm"
              style={{ color: '#F5F1E7' }}
            >
              {insights.mostUsedPipe.name}
            </div>
          </div>
        )}

        {insights.mostUsedPipeShape && (
          <div>
            <div 
              className="text-xs uppercase tracking-wider mb-1"
              style={{ color: 'rgba(180, 140, 75, 0.8)' }}
            >
              Top Pipe Shape
            </div>
            <div 
              className="font-semibold text-sm"
              style={{ color: '#F5F1E7' }}
            >
              {insights.mostUsedPipeShape}
            </div>
          </div>
        )}

        {insights.mostSmokedBlend && (
          <div>
            <div 
              className="text-xs uppercase tracking-wider mb-1"
              style={{ color: 'rgba(180, 140, 75, 0.8)' }}
            >
              Most Smoked Blend
            </div>
            <div 
              className="font-semibold text-sm"
              style={{ color: '#F5F1E7' }}
            >
              {insights.mostSmokedBlend.name}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div 
        className="text-center text-xs"
        style={{ color: 'rgba(224, 216, 200, 0.5)' }}
      >
        Tracked with CollectionKeeper
      </div>
    </div>
  );

  return (
    <div ref={ref} className="flex justify-center py-4">
      {cardContent}
    </div>
  );
});

CollectionInsightsCard.displayName = 'CollectionInsightsCard';

/**
 * CollectionInsightsShareModal Component
 * Provides download and copy options for the insights card
 */
export function CollectionInsightsShareModal({ 
  isOpen, 
  onClose, 
  insights, 
  userProfile 
}) {
  const { t } = useTranslation();
  const cardRef = React.useRef(null);

  const handleDownloadImage = async () => {
    if (!cardRef.current) {
      toast.error('Failed to generate image');
      return;
    }

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

      toast.success('Image downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download image');
    }
  };

  const handleCopyText = () => {
    const text = `My collection stats from CollectionKeeper:

${insights?.totalPipes || 0} pipes
${insights?.totalBlends || 0} tobacco blends
${insights?.totalBowlsLogged || 0} sessions logged${
  insights?.mostUsedPipe ? `\nMost used pipe: ${insights.mostUsedPipe.name}` : ''
}${
  insights?.mostSmokedBlend ? `\nTop blend: ${insights.mostSmokedBlend.name}` : ''
}

Tracked with CollectionKeeper.`;

    navigator.clipboard.writeText(text).then(() => {
      toast.success('Text copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy text');
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="w-full max-w-2xl rounded-2xl p-8 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, #2a1f18 0%, #1f1510 100%)',
          border: '1px solid rgba(180, 140, 75, 0.25)',
        }}
      >
        <h2 
          className="text-2xl font-bold mb-6"
          style={{ color: '#F5F1E7' }}
        >
          Share Your Collection
        </h2>

        {/* Card Preview */}
        <div className="mb-8 flex justify-center">
          <CollectionInsightsCard ref={cardRef} insights={insights} userProfile={userProfile} />
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          <Button 
            onClick={handleDownloadImage}
            className="w-full justify-start bg-[rgba(180,140,75,0.2)] hover:bg-[rgba(180,140,75,0.3)] border border-[rgba(180,140,75,0.3)]"
            style={{ color: '#E0D8C8' }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download as Image
          </Button>

          <Button 
            onClick={handleCopyText}
            className="w-full justify-start bg-[rgba(180,140,75,0.2)] hover:bg-[rgba(180,140,75,0.3)] border border-[rgba(180,140,75,0.3)]"
            style={{ color: '#E0D8C8' }}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Share Text
          </Button>
        </div>

        {/* Close */}
        <div className="mt-6">
          <Button 
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CollectionInsightsCard;