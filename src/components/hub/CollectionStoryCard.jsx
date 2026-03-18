import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Share2, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BrandLogo from '@/components/branding/BrandLogo';
import HighlightCard from '@/components/hub/HighlightCard';
import { useEnabledKeeperModules } from '@/components/hooks/useEnabledKeeperModules';
import { getAIEligibleModuleIds } from '@/components/utils/moduleAccess';
import { useTranslation } from '@/components/i18n/safeTranslation';

const METRIC_COLORS = {
  pipes: '#C87941',
  blends: '#4A9C6A',
  bottles: '#C87941',
  totalBottles: '#C87941',
  value: '#10B981',
};

function MetricBox({ value, label, color }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-4 px-2">
      <span
        className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none"
        style={{
          color,
          textShadow: `0 0 16px ${color}50`,
          fontFamily: "'Georgia', serif",
          WebkitTextStroke: '0.3px rgba(255,255,255,0.08)',
        }}
      >
        {value}
      </span>
      <span
        className="text-xs uppercase tracking-[0.1em] font-bold"
        style={{ color: 'rgba(180,140,75,0.75)' }}
      >
        {label}
      </span>
    </div>
  );
}



function Divider() {
  return (
    <div
      className="w-full h-px my-2"
      style={{ background: 'linear-gradient(to right, transparent, rgba(180,140,75,0.2), transparent)' }}
    />
  );
}

export default function CollectionStoryCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const { moduleStates } = useEnabledKeeperModules();

  useEffect(() => {
    loadStory();
  }, [moduleStates]);

  async function loadStory() {
    setLoading(true);
    try {
      const enabledModules = getAIEligibleModuleIds(moduleStates);
      const result = await base44.functions.invoke('generateCollectionStory', { enabledModules });
      if (result?.data) setStory(result.data);
    } catch (e) {
      console.warn('[CollectionStoryCard] Story generation unavailable:', e?.message);
      // Silently fail - story is optional
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-2xl p-8 flex flex-col items-center justify-center gap-3"
        style={{
          background: 'linear-gradient(145deg, rgba(42,30,20,0.85), rgba(28,18,12,0.95))',
          border: '1px solid rgba(180,140,75,0.18)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          minHeight: '260px',
        }}
      >
        <Sparkles className="w-5 h-5 animate-pulse" style={{ color: 'rgba(180,140,75,0.6)' }} />
        <span className="text-sm" style={{ color: 'rgba(224,216,200,0.45)' }}>
          {t('hub.storyLoading', 'Composing your collection story…')}
        </span>
      </div>
    );
  }

  if (!story) return null;

  const h = story.highlights || {};
  const m = story.metrics || {};

  const valueDisplay =
    m.totalValue >= 1000 ? `$${(m.totalValue / 1000).toFixed(1)}k` : `$${m.totalValue || 0}`;

  const bottleTypes = m.bottleTypes ?? m.bottles ?? 0;
  const totalBottles = m.totalBottles ?? 0;
  const hasHighlights = h.mostUsedPipe || h.favoriteBlend || h.mostTastedBottle || h.mostValuableItem;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(155deg, rgba(38, 26, 18, 0.96), rgba(32, 22, 15, 0.99))',
        border: '1px solid rgba(120, 90, 65, 0.42)',
        boxShadow: '0 5px 20px rgba(0,0,0,0.75), inset 0 1px 0 rgba(180,140,100,0.14)',
      }}
    >
      <div
        className="absolute inset-0 top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        style={{
          background: 'linear-gradient(90deg, rgba(180,140,75,0) 0%, rgba(180,140,75,0.8) 50%, rgba(180,140,75,0) 100%)',
          boxShadow: '0 0 8px rgba(180,140,75,0.5)',
        }}
      />

      <div className="px-6 pt-6 pb-4 flex items-center justify-between relative z-10">
        <div>
          <p
            className="text-xs uppercase tracking-[0.12em] font-bold mb-1"
            style={{ color: 'rgba(180,140,75,0.7)' }}
          >
            {t('hub.collectionStory', 'Collection Story')}
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            {t('hub.collectorSnapshot', "Your Collector's Snapshot")}
          </h3>
        </div>
        <button
          onClick={loadStory}
          disabled={loading}
          className="p-2 rounded-lg transition-all opacity-60 hover:opacity-100"
          title={t('hub.regenerateStory', 'Regenerate story')}
        >
          <RotateCcw className="w-4 h-4" style={{ color: 'rgba(180,140,75,0.8)' }} />
        </button>
      </div>

      <Divider />

      <div className="grid gap-0" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))', borderColor: 'rgba(120, 90, 65, 0.2)' }}>
        {m.pipes > 0 && <MetricBox value={m.pipes} label={t('hub.pipes', 'Pipes')} color={METRIC_COLORS.pipes} />}
        {m.blends > 0 && <MetricBox value={m.blends} label={t('hub.blends', 'Blends')} color={METRIC_COLORS.blends} />}
        {bottleTypes > 0 && (
          <MetricBox
            value={bottleTypes}
            label={
              totalBottles > bottleTypes
                ? t('hub.bottleTypesShort', 'Btl. Types')
                : t('hub.bottles', 'Bottles')
            }
            color={METRIC_COLORS.bottles}
          />
        )}
        {totalBottles > bottleTypes && (
          <MetricBox value={totalBottles} label={t('hub.totalBottlesShort', 'Total Btls')} color={METRIC_COLORS.totalBottles} />
        )}
        <MetricBox value={valueDisplay} label={t('hub.totalValueShort', 'Value')} color={METRIC_COLORS.value} />
      </div>

      <Divider />

      <div className="px-6 py-6 relative z-10">
        <p 
          className="text-sm leading-relaxed" 
          style={{ color: 'rgba(224,216,200,0.78)' }}
        >
          {story.narrative}
        </p>
      </div>

      {hasHighlights && (
        <>
          <Divider />
          <div className="px-6 pb-6 pt-4 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {h.mostUsedPipe && (
                <HighlightCard
                  icon="pipe"
                  title={t('hub.mostUsedPipe', 'Most Used Pipe')}
                  value={h.mostUsedPipe.name}
                  subtitle={h.mostUsedPipe.uses > 0 ? `${h.mostUsedPipe.uses} ${t('hub.sessions', 'sessions')}` : null}
                  module="PIPEKEEPER"
                />
              )}
              {h.favoriteBlend && (
                <HighlightCard
                  icon="blend"
                  title={t('hub.topBlend', 'Top Blend')}
                  value={h.favoriteBlend.name}
                  subtitle={h.favoriteBlend.rating ? `★ ${h.favoriteBlend.rating} / 5` : null}
                  module="PIPEKEEPER"
                />
              )}
              {h.mostTastedBottle && (
                <HighlightCard
                  icon="bottle"
                  title={t('hub.mostTasted', 'Most Tasted')}
                  value={h.mostTastedBottle.name}
                  subtitle={
                    h.mostTastedBottle.tastings > 0
                      ? `${h.mostTastedBottle.tastings} ${t('hub.tastings', 'tastings')}`
                      : null
                  }
                  module="WHISKEYKEEPER"
                />
              )}
              {h.mostValuableItem && (
                <HighlightCard
                  icon="value"
                  title={t('hub.crownJewel', 'Crown Jewel')}
                  value={h.mostValuableItem.name}
                  subtitle={
                    h.mostValuableItem.value > 0
                      ? `$${h.mostValuableItem.value.toLocaleString()}`
                      : null
                  }
                  module="COLLECTION"
                />
              )}
            </div>
          </div>
        </>
      )}

      <Divider />

      <div className="px-6 pb-6 pt-4 flex gap-3 relative z-10">
        <Button 
          onClick={() => navigate('/CollectionInsightsShare', { state: { story } })} 
          size="sm" 
          variant="outline" 
          className="flex-1"
        >
          <Share2 className="w-3.5 h-3.5 mr-1.5" />
          {t('common.share', 'Share')}
        </Button>
        <Button
          onClick={loadStory}
          size="sm"
          className="flex-1"
          style={{
            background: 'linear-gradient(135deg, rgba(180,140,75,1) 0%, rgba(160,120,65,1) 100%)',
            border: '1px solid rgba(140,105,60,0.8)',
            color: 'rgba(28,18,10,1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          {t('hub.regenerate', 'Regenerate')}
        </Button>
      </div>

      <div
        className="px-6 py-3 flex items-center justify-center gap-2 border-t relative z-10"
        style={{ borderColor: 'rgba(120,90,65,0.25)' }}
      >
        <BrandLogo compact showWordmark={false} imageClassName="w-5 h-5" />
        <span className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
          {t('hub.trackedWithCollectionKeeper', 'Tracked with CollectionKeeper')}
        </span>
      </div>
    </div>
  );
}