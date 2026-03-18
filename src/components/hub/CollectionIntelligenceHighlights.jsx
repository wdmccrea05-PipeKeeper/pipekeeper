import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/components/i18n/safeTranslation';

/**
 * Helper to resolve the best photo URL for an item record.
 * Priority: photos[0] > logo > photo > null
 */
function resolveItemPhoto(item) {
  if (!item) return null;
  if (Array.isArray(item.photos) && item.photos.length > 0) return item.photos[0];
  if (item.logo) return item.logo;
  if (item.photo) return item.photo;
  return null;
}

function HighlightCard({ title, label, photo, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl aspect-[3/2]"
      style={{
        border: '1px solid rgba(180,140,75,0.25)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* Background image or fallback gradient */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: photo ? `url('${photo}')` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          background: !photo
            ? 'linear-gradient(135deg, rgba(60,40,25,0.9), rgba(40,25,15,0.95))'
            : undefined,
        }}
      />

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 30% 20%, rgba(180,140,100,0.25) 0%, transparent 40%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.5) 0%, transparent 50%)',
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-5 z-10">
        <div>
          <p
            className="text-xs uppercase tracking-wider font-bold"
            style={{ color: 'rgba(180,140,75,0.8)' }}
          >
            {label}
          </p>
        </div>
        <div>
          <p
            className="text-sm md:text-base font-bold line-clamp-2"
            style={{
              color: '#F5F1E7',
              textShadow: '0 2px 8px rgba(0,0,0,0.7)',
            }}
          >
            {title}
          </p>
        </div>
      </div>

      {/* Hover effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle at center, rgba(180,140,75,0.15) 0%, transparent 70%)',
        }}
      />
    </button>
  );
}

export default function CollectionIntelligenceHighlights({ pipes = [], blends = [], bottles = [] }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Find featured items
  const mostUsedPipe = pipes.find((p) => Array.isArray(p?.photos) && p.photos.length > 0) || pipes[0];
  const favoriteBlend = blends.find((b) => b?.is_favorite) || blends[0];
  const mostTastedBottle = bottles.find((b) => b?.photo) || bottles[0];

  if (!mostUsedPipe && !favoriteBlend && !mostTastedBottle) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2
        className="text-sm uppercase tracking-[0.12em] font-semibold"
        style={{ color: 'rgba(180, 140, 75, 0.8)' }}
      >
        {t('hub.collectionHighlights', 'Collection Highlights')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {mostUsedPipe && (
          <HighlightCard
            label={t('hub.mostUsedPipe', 'Most Used Pipe')}
            title={mostUsedPipe.name || '—'}
            photo={resolveItemPhoto(mostUsedPipe)}
            onClick={() => navigate(`/PipeDetail?id=${encodeURIComponent(mostUsedPipe.id)}`)}
          />
        )}
        {favoriteBlend && (
          <HighlightCard
            label={t('hub.topBlend', 'Top Blend')}
            title={favoriteBlend.name || '—'}
            photo={resolveItemPhoto(favoriteBlend)}
            onClick={() => navigate(`/TobaccoDetail?id=${encodeURIComponent(favoriteBlend.id)}`)}
          />
        )}
        {mostTastedBottle && (
          <HighlightCard
            label={t('hub.mostTasted', 'Most Tasted')}
            title={mostTastedBottle.name || '—'}
            photo={resolveItemPhoto(mostTastedBottle)}
            onClick={() => navigate(`/BottleDetail?bottleId=${encodeURIComponent(mostTastedBottle.id)}`)}
          />
        )}
      </div>
    </div>
  );
}