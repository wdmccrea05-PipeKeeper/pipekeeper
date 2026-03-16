import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Share2, BookOpen, Loader, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function CollectionStoryCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStory();
  }, []);

  async function loadStory() {
    setLoading(true);
    setError(null);

    try {
      const result = await base44.functions.invoke('generateCollectionStory', {});
      if (result?.data) {
        setStory(result.data);
      }
    } catch (e) {
      console.error('Story load error:', e);
      setError(t('story.loadError', 'Could not load collection story'));
    } finally {
      setLoading(false);
    }
  }

  if (loading || !story) {
    return (
      <div
        className="rounded-2xl p-6 border backdrop-blur-sm flex items-center justify-center gap-3"
        style={{
          background: 'linear-gradient(145deg, rgba(50,35,25,0.6), rgba(30,20,15,0.8))',
          border: '1px solid rgba(120,90,65,0.25)',
          minHeight: '200px',
        }}
      >
        <Loader className="w-4 h-4 animate-spin" style={{ color: 'rgba(180,140,75,0.6)' }} />
        <span className="text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>
          {t('story.loading', 'Loading your collection story...')}
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-6 border backdrop-blur-sm overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(50,35,25,0.6), rgba(30,20,15,0.8))',
        border: '1px solid rgba(120,90,65,0.25)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(180,140,75,0.25), rgba(140,105,50,0.35))',
              border: '1px solid rgba(180,140,75,0.4)',
            }}
          >
            <BookOpen className="w-5 h-5" style={{ color: 'rgba(180,140,75,1)' }} />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: '#F5F1E7', fontFamily: 'Georgia, serif' }}>
              {t('story.title', 'Your Collection Story')}
            </h3>
            <p className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {t('story.subtitle', "A narrative of your collector's journey")}
            </p>
          </div>
        </div>
        <button
           onClick={loadStory}
           disabled={loading}
           className="p-2 rounded-lg transition-all hover:bg-white/5 flex-shrink-0"
           title={t('story.refresh', 'Refresh story')}
         >
           <Sparkles className="w-4 h-4 animate-pulse" style={{ color: 'rgba(180,140,75,0.7)' }} />
         </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <div className="text-lg font-bold" style={{ color: '#D4AF37' }}>
            {story.metrics.pipes}
          </div>
          <div className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Pipes
          </div>
          </div>
          <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <div className="text-lg font-bold" style={{ color: '#D4AF37' }}>
            {story.metrics.blends}
          </div>
          <div className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Blends
          </div>
          </div>
          <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <div className="text-lg font-bold" style={{ color: '#D4AF37' }}>
            {story.metrics.bottles}
          </div>
          <div className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Bottles
          </div>
          </div>
          <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <div className="text-lg font-bold" style={{ color: '#D4AF37' }}>
            ${(story.metrics.totalValue / 1000).toFixed(1)}k
          </div>
          <div className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Value
          </div>
          </div>
      </div>

      {/* Narrative */}
      <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(224,216,200,0.8)' }}>
        {story.narrative}
      </p>

      {/* Highlights */}
      {(story.highlights.mostUsedPipe || story.highlights.favoritePipe || story.highlights.favoriteBlend) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
          {story.highlights.mostUsedPipe && (
            <div className="p-3 rounded-lg" style={{ background: 'rgba(180,140,75,0.1)', borderLeft: '2px solid rgba(180,140,75,0.4)' }}>
              <div style={{ color: 'rgba(180,140,75,0.8)' }} className="font-semibold mb-1">
                Most Used
              </div>
              <div style={{ color: '#F5F1E7' }} className="truncate">
                {story.highlights.mostUsedPipe.name}
              </div>
              <div style={{ color: 'rgba(224,216,200,0.5)' }}>
                {story.highlights.mostUsedPipe.uses} sessions
              </div>
            </div>
          )}
          {story.highlights.favoriteBlend && (
            <div className="p-3 rounded-lg" style={{ background: 'rgba(180,140,75,0.1)', borderLeft: '2px solid rgba(180,140,75,0.4)' }}>
              <div style={{ color: 'rgba(180,140,75,0.8)' }} className="font-semibold mb-1">
                Favorite Blend
              </div>
              <div style={{ color: '#F5F1E7' }} className="truncate">
                {story.highlights.favoriteBlend.name}
              </div>
              <div style={{ color: 'rgba(224,216,200,0.5)' }}>
                ★ {story.highlights.favoriteBlend.rating}/5
              </div>
            </div>
          )}
          {story.highlights.mostValuableItem && (
            <div className="p-3 rounded-lg" style={{ background: 'rgba(180,140,75,0.1)', borderLeft: '2px solid rgba(180,140,75,0.4)' }}>
              <div style={{ color: 'rgba(180,140,75,0.8)' }} className="font-semibold mb-1">
                Crown Jewel
              </div>
              <div style={{ color: '#F5F1E7' }} className="truncate">
                {story.highlights.mostValuableItem.name}
              </div>
              <div style={{ color: 'rgba(224,216,200,0.5)' }}>
                ${Math.round(story.highlights.mostValuableItem.value)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
       <div className="flex gap-2 pt-2">
         <Button
           onClick={() => navigate('/CollectionInsightsShare', { state: { story } })}
           size="sm"
           variant="outline"
           className="flex-1"
         >
           <Share2 className="w-3.5 h-3.5 mr-1.5" />
           {t('story.share', 'Share Story')}
         </Button>
         <Button
           onClick={loadStory}
           className="flex-1"
           style={{
             background: 'linear-gradient(135deg, rgba(180,140,75,0.9), rgba(140,105,75,1))',
             border: 'none',
           }}
         >
           <Sparkles className="w-3.5 h-3.5 mr-1.5" />
           {t('story.regenerate', 'Regenerate')}
           <ChevronRight className="w-3 h-3 ml-1" />
         </Button>
       </div>
    </div>
  );
}