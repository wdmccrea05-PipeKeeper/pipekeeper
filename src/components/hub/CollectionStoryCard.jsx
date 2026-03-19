import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RotateCcw, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import BrandLogo from '@/components/branding/BrandLogo';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useEnabledKeeperModules } from '@/components/hooks/useEnabledKeeperModules';
import { getAIEligibleModuleIds } from '@/components/utils/moduleAccess';

function resolvePhoto(record, recordType) {
  if (!record) return null;

  if (recordType === 'pipe') {
    const photos = Array.isArray(record.photos) ? record.photos : [];
    return photos[0] || record.photo || record.image || record.image_url || null;
  }

  if (recordType === 'blend') {
    const photos = Array.isArray(record.photos) ? record.photos : [];
    return record.photo || record.image || record.image_url || record.logo || photos[0] || null;
  }

  if (recordType === 'bottle') {
    return record.photo || record.image || record.image_url || null;
  }

  return null;
}

function getRoute(recordType, id) {
  if (!id) return null;
  if (recordType === 'pipe') return `/PipeDetail?id=${encodeURIComponent(id)}`;
  if (recordType === 'blend') return `/TobaccoDetail?id=${encodeURIComponent(id)}`;
  if (recordType === 'bottle') return `/BottleDetail?id=${encodeURIComponent(id)}`;
  return null;
}

async function getEntityRecord(recordType, id) {
  if (!recordType || !id) return null;

  const entity =
    recordType === 'pipe'
      ? base44.entities.Pipe
      : recordType === 'blend'
        ? base44.entities.TobaccoBlend
        : recordType === 'bottle'
          ? base44.entities.Bottle
          : null;

  if (!entity) return null;

  try {
    return await entity.get(id);
  } catch {
    try {
      const rows = await entity.filter({ id });
      return rows?.[0] || null;
    } catch {
      return null;
    }
  }
}

async function enrichHighlights(story) {
  if (!story?.highlights) return story;

  const next = { ...story.highlights };

  const configs = [
    ['mostUsedPipe', 'pipe'],
    ['favoritePipe', 'pipe'],
    ['favoriteBlend', 'blend'],
    ['mostTastedBottle', 'bottle'],
  ];

  await Promise.all(
    configs.map(async ([key, recordType]) => {
      const item = next[key];
      if (!item?.id) return;
      const record = await getEntityRecord(recordType, item.id);
      next[key] = {
        ...item,
        recordType,
        _record: record,
      };
    })
  );

  if (next.mostValuableItem?.id) {
    const type = next.mostValuableItem.recordType || next.mostValuableItem.type || 'bottle';
    const normalizedType =
      type === 'whiskey' || type === 'bottle' ? 'bottle' : type === 'tobacco' ? 'blend' : type;

    const record = await getEntityRecord(normalizedType, next.mostValuableItem.id);
    next.mostValuableItem = {
      ...next.mostValuableItem,
      recordType: normalizedType,
      _record: record,
    };
  }

  return {
    ...story,
    highlights: next,
  };
}

function StoryCard({ title, label, item, navigate }) {
  const record = item?._record || null;
  const photo = resolvePhoto(record, item?.recordType);
  const route = getRoute(item?.recordType, item?.id);

  return (
    <button
      type="button"
      onClick={() => route && navigate(route)}
      className="relative min-h-[240px] rounded-2xl overflow-hidden text-left group"
      style={{
        border: '1px solid rgba(180,140,75,0.24)',
        background: 'linear-gradient(135deg, rgba(52,34,22,0.96), rgba(27,18,12,0.98))',
        boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
      }}
    >
      {photo ? (
        <>
          <img
            src={photo}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.40) 50%, rgba(0,0,0,0.10) 100%)',
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(62,40,26,0.95), rgba(30,20,14,0.98))',
          }}
        />
      )}

      <div className="relative z-10 h-full p-5 flex flex-col justify-between">
        <p
          className="text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: 'rgba(205,160,91,0.92)' }}
        >
          {label}
        </p>

        <p
          className="text-xl sm:text-2xl font-bold leading-tight break-words"
          style={{
            color: '#F5F1E7',
            textShadow: '0 2px 10px rgba(0,0,0,0.65)',
            fontFamily: "'Georgia', serif",
          }}
        >
          {title}
        </p>
      </div>
    </button>
  );
}

export default function CollectionStoryCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { moduleStates } = useEnabledKeeperModules();

  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);

  const enabledModules = useMemo(
    () => getAIEligibleModuleIds(moduleStates),
    [moduleStates]
  );

  async function loadStory() {
    setLoading(true);
    try {
      const result = await base44.functions.invoke('generateCollectionStory', {
        enabledModules,
      });

      const raw = result?.data || null;
      const enriched = raw ? await enrichHighlights(raw) : null;
      setStory(enriched);
    } catch (error) {
      console.warn('[CollectionStoryCard] failed to load story', error);
      setStory(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStory();
  }, [enabledModules.join('|')]);

  if (loading) {
    return (
      <div className="rounded-2xl p-8" style={{ border: '1px solid rgba(180,140,75,0.22)' }}>
        <p className="text-[#E0D8C8]">{t('hub.storyLoading', 'Composing your collection story…')}</p>
      </div>
    );
  }

  if (!story) return null;

  const h = story.highlights || {};
  const m = story.metrics || {};
  const valueDisplay =
    Number(m.totalValue || 0) >= 1000
      ? `$${(Number(m.totalValue) / 1000).toFixed(1)}k`
      : `$${Number(m.totalValue || 0).toFixed(0)}`;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(155deg, rgba(38,26,18,0.96), rgba(32,22,15,0.99))',
        border: '1px solid rgba(120,90,65,0.42)',
        boxShadow: '0 5px 20px rgba(0,0,0,0.75)',
      }}
    >
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] font-bold mb-1 text-[#B48C4B]">
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
          type="button"
          onClick={loadStory}
          className="p-2 rounded-lg opacity-70 hover:opacity-100"
        >
          <RotateCcw className="w-4 h-4 text-[#B48C4B]" />
        </button>
      </div>

      <div className="px-6 py-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <div className="rounded-xl p-4 border border-[rgba(200,121,65,0.22)] bg-[rgba(200,121,65,0.10)]">
          <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/70">{t('hub.pipes', 'Pipes')}</p>
          <p className="text-2xl font-bold mt-2 text-[#C87941]">{m.pipes || 0}</p>
        </div>
        <div className="rounded-xl p-4 border border-[rgba(74,156,106,0.22)] bg-[rgba(74,156,106,0.10)]">
          <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/70">{t('hub.blends', 'Blends')}</p>
          <p className="text-2xl font-bold mt-2 text-[#4A9C6A]">{m.blends || 0}</p>
        </div>
        <div className="rounded-xl p-4 border border-[rgba(200,121,65,0.22)] bg-[rgba(200,121,65,0.10)]">
          <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/70">{t('hub.bottleTypesShort', 'Btl. Types')}</p>
          <p className="text-2xl font-bold mt-2 text-[#C87941]">{m.bottleTypes || 0}</p>
        </div>
        <div className="rounded-xl p-4 border border-[rgba(200,121,65,0.22)] bg-[rgba(200,121,65,0.10)]">
          <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/70">{t('hub.totalBottlesShort', 'Total Btls')}</p>
          <p className="text-2xl font-bold mt-2 text-[#C87941]">{m.totalBottles || 0}</p>
        </div>
        <div className="rounded-xl p-4 border border-[rgba(16,185,129,0.22)] bg-[rgba(16,185,129,0.10)]">
          <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/70">{t('hub.totalValueShort', 'Value')}</p>
          <p className="text-2xl font-bold mt-2 text-[#10B981]">{valueDisplay}</p>
        </div>
      </div>

      <div className="px-6 py-6 border-t border-[rgba(120,90,65,0.25)]">
        <p className="text-sm sm:text-base leading-7 text-[#E0D8C8]/85 whitespace-pre-wrap">
          {story.narrative}
        </p>
      </div>

      <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {h.mostUsedPipe ? (
          <StoryCard
            label={t('hub.mostUsedPipe', 'Most Used Pipe')}
            title={h.mostUsedPipe.name}
            item={h.mostUsedPipe}
            navigate={navigate}
          />
        ) : null}

        {h.favoriteBlend ? (
          <StoryCard
            label={t('hub.topBlend', 'Top Blend')}
            title={h.favoriteBlend.name}
            item={h.favoriteBlend}
            navigate={navigate}
          />
        ) : null}

        {h.mostTastedBottle ? (
          <StoryCard
            label={t('hub.mostTasted', 'Most Tasted')}
            title={h.mostTastedBottle.name}
            item={h.mostTastedBottle}
            navigate={navigate}
          />
        ) : null}

        {h.mostValuableItem ? (
          <StoryCard
            label={t('hub.crownJewel', 'Crown Jewel')}
            title={h.mostValuableItem.name}
            item={h.mostValuableItem}
            navigate={navigate}
          />
        ) : null}
      </div>

      <div className="px-6 pb-6 pt-2 flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            const url = window.location.href;
            if (navigator.share) {
              navigator.share({
                title: t('hub.collectorSnapshot', "Your Collector's Snapshot"),
                text: story?.narrative || '',
                url,
              }).catch(() => {
                navigator.clipboard.writeText(url);
              });
            } else {
              navigator.clipboard.writeText(url);
            }
          }}
        >
          <Share2 className="w-4 h-4 mr-2" />
          {t('common.share', 'Share')}
        </Button>
        <Button
          className="flex-1"
          onClick={loadStory}
          style={{
            background: 'linear-gradient(135deg, rgba(180,140,75,1), rgba(160,120,65,1))',
            color: '#1b130d',
          }}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {t('hub.regenerate', 'Regenerate')}
        </Button>
      </div>

      <div className="px-6 py-3 flex items-center justify-center gap-2 border-t border-[rgba(120,90,65,0.25)]">
        <BrandLogo compact showWordmark={false} imageClassName="w-5 h-5" />
        <span className="text-xs text-[#E0D8C8]/55">
          {t('hub.trackedWithCollectionKeeper', 'Tracked with CollectionKeeper')}
        </span>
      </div>
    </div>
  );
}