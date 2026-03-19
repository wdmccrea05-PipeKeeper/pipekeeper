import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Share2, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BrandLogo from '@/components/branding/BrandLogo';
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

function resolveItemPhoto(item) {
  if (!item) return null;

  const candidates = [
    ...(Array.isArray(item.photos) ? item.photos : []),
    item.heroImage,
    item.logo,
    item.photo,
    item.image,
    item.image_url,
    item.thumbnail,
    item.thumbnail_url,
    item.label_photo,
    item.cover_photo,
  ].filter((v) => typeof v === 'string' && v.trim());

  return candidates[0] || null;
}

function getHighlightRecord(highlight) {
  return highlight?._record || highlight || null;
}

function getHighlightPhoto(highlight) {
  return resolveItemPhoto(getHighlightRecord(highlight));
}

function getHighlightRoute(highlight) {
  if (!highlight) return null;

  const id = highlight.id || highlight?._record?.id;
  const recordType = highlight.recordType || highlight?._recordType || highlight.type;

  if (!id) return null;

  if (recordType === 'pipe') return `/PipeDetail?id=${encodeURIComponent(id)}`;
  if (recordType === 'blend') return `/TobaccoDetail?id=${encodeURIComponent(id)}`;
  if (recordType === 'bottle' || recordType === 'whiskey') {
    return `/BottleDetail?id=${encodeURIComponent(id)}`;
  }

  return null;
}

async function enrichStoryHighlights(story) {
  // Backend now returns highlights with full photo fields
  // This function is kept for backward compatibility but is essentially a pass-through
  return story;
}

function StoryHighlightCard({ title, label, photo, onClick }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!photo) {
      setImageLoaded(false);
      return;
    }

    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => {
      console.warn('[StoryHighlightCard] Failed to load photo:', photo);
      setImageLoaded(false);
    };
    img.src = photo;
  }, [photo]);

  const backgroundStyle =
    imageLoaded && photo
      ? {
          backgroundImage: `url("${photo}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : {
          background:
            'linear-gradient(135deg, rgba(60,40,25,0.9), rgba(40,25,15,0.95))',
        };

  return (
    <button
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl aspect-[3/2]"
      style={{
        border: '1px solid rgba(180,140,75,0.25)',
        boxShadow:
          '0 12px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <div className="absolute inset-0" style={backgroundStyle} />

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.10) 100%)',
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, rgba(180,140,100,0.18) 0%, transparent 40%)',
        }}
      />

      <div className="absolute inset-0 flex flex-col justify-between p-5">
        <div>
          <p
            className="text-xs uppercase tracking-wider font-bold"
            style={{ color: 'rgba(180,140,75,0.9)' }}
          >
            {label}
          </p>
        </div>

        <div>
          <p
              className="text-sm md:text-base font-bold"
              style={{
                color: '#F5F1E7',
                textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 16px rgba(0,0,0,0.6)',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
                hyphens: 'auto',
              }}
            >
              {title}
            </p>
        </div>
      </div>

      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(180,140,75,0.18) 0%, transparent 70%)',
        }}
      />
    </button>
  );
}

function Divider() {
  return (
    <div
      className="w-full h-px my-2"
      style={{
        background:
          'linear-gradient(to right, transparent, rgba(180,140,75,0.2), transparent)',
      }}
    />
  );
}

export default function CollectionStoryCard({ pipes = [], blends = [], bottles = [] }) {
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
      const result = await base44.functions.invoke('generateCollectionStory', {
        enabledModules,
      });

      if (result?.data) {
        const enriched = await enrichStoryHighlights(result.data);
        setStory(enriched);
      }
    } catch (e) {
      console.warn(
        '[CollectionStoryCard] Story generation unavailable:',
        e?.message
      );
    } finally {
      setLoading(false);
    }
  }

  // Fallback highlights from collection data if story doesn't provide them
  // Attach recordType so routing works correctly, and enrich with all photo fields
  const fallbackMostUsedPipe = (() => {
    const p = pipes.find((p) => Array.isArray(p?.photos) && p.photos.length > 0)
      || pipes.find((p) => p?.photo)
      || pipes[0];
    if (!p) return null;
    return { ...p, recordType: 'pipe', _photoResolved: p.photos?.[0] || p.photo || p.image || p.image_url || null };
  })();
  const fallbackFavoriteBlend = (() => {
    const b = blends.find((b) => b?.is_favorite && (b.photo || b.logo || (Array.isArray(b.photos) && b.photos.length > 0)))
      || blends.find((b) => b?.is_favorite)
      || blends.find((b) => b?.photo || b?.logo)
      || blends[0];
    if (!b) return null;
    return { ...b, recordType: 'blend', _photoResolved: b.photos?.[0] || b.photo || b.logo || b.image || b.image_url || null };
  })();
  const fallbackMostTastedBottle = (() => {
    const b = bottles.find((b) => b?.photo || b?.image || b?.image_url)
      || bottles.find((b) => b?.favorite)
      || bottles[0];
    if (!b) return null;
    return { ...b, recordType: 'bottle', _photoResolved: b.photos?.[0] || b.photo || b.image || b.image_url || null };
  })();

  if (loading) {
    return (
      <div
        className="rounded-2xl p-8 flex flex-col items-center justify-center gap-3"
        style={{
          background:
            'linear-gradient(145deg, rgba(42,30,20,0.85), rgba(28,18,12,0.95))',
          border: '1px solid rgba(180,140,75,0.18)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          minHeight: '260px',
        }}
      >
        <Sparkles
          className="w-5 h-5 animate-pulse"
          style={{ color: 'rgba(180,140,75,0.6)' }}
        />
        <span className="text-sm" style={{ color: 'rgba(224,216,200,0.45)' }}>
          {t('hub.storyLoading', 'Composing your collection story…')}
        </span>
      </div>
    );
  }

  if (!story) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background:
            'linear-gradient(155deg, rgba(38, 26, 18, 0.96), rgba(32, 22, 15, 0.99))',
          border: '1px solid rgba(120, 90, 65, 0.42)',
          boxShadow:
            '0 5px 20px rgba(0,0,0,0.75), inset 0 1px 0 rgba(180,140,100,0.14)',
        }}
      >
        <div className="px-6 pt-6 pb-4 relative z-10">
          <p
            className="text-xs uppercase tracking-[0.12em] font-bold mb-1"
            style={{ color: 'rgba(180,140,75,0.7)' }}
          >
            {t('hub.collectionStory', 'Collection Story')}
          </p>
          <h3
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
          >
            {t('hub.collectorSnapshot', "Your Collector's Snapshot")}
          </h3>
        </div>
        <Divider />
        <div
          className="px-6 py-6 text-center"
          style={{ color: 'rgba(224,216,200,0.6)' }}
        >
          <p className="text-sm">
            {t('hub.storyUnavailable', 'Story unavailable. Try again later.')}
          </p>
        </div>
      </div>
    );
  }

  const h = story.highlights || {};
  const m = story.metrics || {};
  const valueDisplay =
    m.totalValue >= 1000
      ? `$${(m.totalValue / 1000).toFixed(1)}k`
      : `$${m.totalValue || 0}`;

  const bottleTypes = m.bottleTypes ?? m.bottles ?? 0;
  const totalBottles = m.totalBottles ?? 0;
  const hasHighlights =
    h.mostUsedPipe || h.favoriteBlend || h.mostTastedBottle || h.mostValuableItem;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:
          'linear-gradient(155deg, rgba(38, 26, 18, 0.96), rgba(32, 22, 15, 0.99))',
        border: '1px solid rgba(120, 90, 65, 0.42)',
        boxShadow:
          '0 5px 20px rgba(0,0,0,0.75), inset 0 1px 0 rgba(180,140,100,0.14)',
      }}
    >
      <div
        className="absolute inset-0 top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        style={{
          background:
            'linear-gradient(90deg, rgba(180,140,75,0) 0%, rgba(180,140,75,0.8) 50%, rgba(180,140,75,0) 100%)',
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
          <h3
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
          >
            {t('hub.collectorSnapshot', "Your Collector's Snapshot")}
          </h3>
        </div>
        <button
          onClick={loadStory}
          disabled={loading}
          className="p-2 rounded-lg transition-all opacity-60 hover:opacity-100"
          title={t('hub.regenerateStory', 'Regenerate story')}
        >
          <RotateCcw
            className="w-4 h-4"
            style={{ color: 'rgba(180,140,75,0.8)' }}
          />
        </button>
      </div>

      <Divider />

      <div className="px-6 py-6 relative z-10">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {m.pipes > 0 && (
            <div
              className="rounded-xl p-4"
              style={{
                background: 'rgba(200, 121, 65, 0.12)',
                border: '1px solid rgba(200, 121, 65, 0.25)',
              }}
            >
              <p
                className="text-xs uppercase tracking-wider"
                style={{ color: 'rgba(180, 140, 75, 0.6)' }}
              >
                {t('hub.pipes', 'Pipes')}
              </p>
              <p
                className="text-2xl font-bold mt-2"
                style={{ color: '#C87941' }}
              >
                {m.pipes}
              </p>
            </div>
          )}

          {m.blends > 0 && (
            <div
              className="rounded-xl p-4"
              style={{
                background: 'rgba(74, 156, 106, 0.12)',
                border: '1px solid rgba(74, 156, 106, 0.25)',
              }}
            >
              <p
                className="text-xs uppercase tracking-wider"
                style={{ color: 'rgba(180, 140, 75, 0.6)' }}
              >
                {t('hub.blends', 'Blends')}
              </p>
              <p
                className="text-2xl font-bold mt-2"
                style={{ color: '#4A9C6A' }}
              >
                {m.blends}
              </p>
            </div>
          )}

          {bottleTypes > 0 && (
            <div
              className="rounded-xl p-4"
              style={{
                background: 'rgba(200, 121, 65, 0.12)',
                border: '1px solid rgba(200, 121, 65, 0.25)',
              }}
            >
              <p
                className="text-xs uppercase tracking-wider"
                style={{ color: 'rgba(180, 140, 75, 0.6)' }}
              >
                {totalBottles > bottleTypes
                  ? t('hub.bottleTypesShort', 'Btl. Types')
                  : t('hub.bottles', 'Bottles')}
              </p>
              <p
                className="text-2xl font-bold mt-2"
                style={{ color: '#C87941' }}
              >
                {bottleTypes}
              </p>
            </div>
          )}

          {totalBottles > bottleTypes && (
            <div
              className="rounded-xl p-4"
              style={{
                background: 'rgba(200, 121, 65, 0.12)',
                border: '1px solid rgba(200, 121, 65, 0.25)',
              }}
            >
              <p
                className="text-xs uppercase tracking-wider"
                style={{ color: 'rgba(180, 140, 75, 0.6)' }}
              >
                {t('hub.totalBottlesShort', 'Total Btls')}
              </p>
              <p
                className="text-2xl font-bold mt-2"
                style={{ color: '#C87941' }}
              >
                {totalBottles}
              </p>
            </div>
          )}

          <div
            className="rounded-xl p-4"
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <p
              className="text-xs uppercase tracking-wider"
              style={{ color: 'rgba(180, 140, 75, 0.6)' }}
            >
              {t('hub.totalValueShort', 'Value')}
            </p>
            <p
              className="text-2xl font-bold mt-2"
              style={{ color: '#10B981' }}
            >
              {valueDisplay}
            </p>
          </div>
        </div>
      </div>

      <Divider />

      <div className="px-6 py-6 relative z-10">
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'rgba(224,216,200,0.78)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        >
          {story.narrative}
        </p>
      </div>

      {/* Highlights Section - either from story or fallback collection data */}
      {(hasHighlights || fallbackMostUsedPipe || fallbackFavoriteBlend || fallbackMostTastedBottle) && (
        <>
          <Divider />
          <div className="px-6 pb-6 pt-6 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(h.mostUsedPipe || fallbackMostUsedPipe) && (
                <StoryHighlightCard
                  label={t('hub.mostUsedPipe', 'Most Used Pipe')}
                  title={(h.mostUsedPipe || fallbackMostUsedPipe).name}
                  photo={getHighlightPhoto(h.mostUsedPipe) || resolveItemPhoto(fallbackMostUsedPipe)}
                  onClick={() => {
                    const item = h.mostUsedPipe || fallbackMostUsedPipe;
                    const route = getHighlightRoute(item);
                    if (route) navigate(route);
                  }}
                />
              )}

              {(h.favoriteBlend || fallbackFavoriteBlend) && (
                <StoryHighlightCard
                  label={t('hub.topBlend', 'Top Blend')}
                  title={(h.favoriteBlend || fallbackFavoriteBlend).name}
                  photo={getHighlightPhoto(h.favoriteBlend) || resolveItemPhoto(fallbackFavoriteBlend)}
                  onClick={() => {
                    const item = h.favoriteBlend || fallbackFavoriteBlend;
                    const route = getHighlightRoute(item);
                    if (route) navigate(route);
                  }}
                />
              )}

              {(h.mostTastedBottle || fallbackMostTastedBottle) && (
                <StoryHighlightCard
                  label={t('hub.mostTasted', 'Most Tasted')}
                  title={(h.mostTastedBottle || fallbackMostTastedBottle).name}
                  photo={getHighlightPhoto(h.mostTastedBottle) || resolveItemPhoto(fallbackMostTastedBottle)}
                  onClick={() => {
                    const item = h.mostTastedBottle || fallbackMostTastedBottle;
                    const route = getHighlightRoute(item);
                    if (route) navigate(route);
                  }}
                />
              )}

              {h.mostValuableItem && (
                <StoryHighlightCard
                  label={t('hub.crownJewel', 'Crown Jewel')}
                  title={h.mostValuableItem.name}
                  photo={getHighlightPhoto(h.mostValuableItem)}
                  onClick={() => {
                    const route = getHighlightRoute(h.mostValuableItem);
                    if (route) navigate(route);
                  }}
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
            background:
              'linear-gradient(135deg, rgba(180,140,75,1) 0%, rgba(160,120,65,1) 100%)',
            border: '1px solid rgba(140,105,60,0.8)',
            color: 'rgba(28,18,10,1)',
            boxShadow:
              '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
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