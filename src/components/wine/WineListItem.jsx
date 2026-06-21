import React from 'react';
import { BookmarkPlus, Edit2, List, Star, Trash2, Wine } from 'lucide-react';
import EnrichButton from '@/components/shared/EnrichButton';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { getWineDrinkWindowStatus, getWinePrimaryImage, getWineQuantity, getWineTotalValue, getWineValuationConfidence } from '@/lib/collection/wineSelectors';

const DRINK_WINDOW_COLORS = {
  drink_now: '#2E7D5C',
  too_young: '#6B8FC4',
  past_peak: '#A35C5C',
};

function MiniBadge({ children, tone = 'default' }) {
  const styles = {
    default: {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(180,140,75,0.18)',
      color: '#F5F1E7',
    },
    accent: {
      background: 'rgba(139,58,58,0.18)',
      border: '1px solid rgba(139,58,58,0.28)',
      color: '#C47070',
    },
  };

  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-medium"
      style={styles[tone] || styles.default}
    >
      {children}
    </span>
  );
}

export default function WineListItem({
  wine,
  onOpen,
  onEdit,
  onDelete,
  onLogTasting,
  onEnriched,
  onAddToWantList,
  formatFromBase,
}) {
  const { t } = useTranslation();
  const photo = getWinePrimaryImage(wine);
  const quantity = getWineQuantity(wine);
  const totalValue = getWineTotalValue(wine);
  const confidence = getWineValuationConfidence(wine);
  const drinkWindowStatus = getWineDrinkWindowStatus(wine);
  const drinkWindowLabel = drinkWindowStatus ? t(`wine.${drinkWindowStatus === 'drink_now' ? 'drinkNow' : drinkWindowStatus === 'too_young' ? 'tooYoung' : 'pastPeak'}`) : null;
  const styleLabel = wine?.style ? t(`wine.styles.${wine.style}`, wine.style) : null;

  return (
    <div
      className="rounded-2xl p-4 md:p-5 cursor-pointer transition-all hover:border-[rgba(139,58,58,0.38)] hover:-translate-y-0.5"
      onClick={onOpen}
      style={{
        background: 'linear-gradient(145deg, rgba(58,40,28,0.98), rgba(31,21,16,0.98))',
        border: '1px solid rgba(139,58,58,0.18)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.32)',
      }}
    >
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
        <div
          className="w-full lg:w-28 h-32 rounded-xl overflow-hidden flex-shrink-0"
          style={{
            background: 'linear-gradient(180deg, rgba(35,25,18,0.96), rgba(20,14,10,0.98))',
            border: '1px solid rgba(139,58,58,0.16)',
          }}
        >
          {photo ? (
            <img src={photo} alt={wine?.name || t('wine.untitledWine')} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Wine className="w-8 h-8" style={{ color: 'rgba(139,58,58,0.28)' }} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-[#F5F1E7] break-words leading-tight">
                {wine?.name || t('wine.untitledWine')}
              </h3>
              <p className="text-sm text-[#E0D8C8] break-words mt-1">
                {[wine?.producer, wine?.vintage ? String(wine.vintage) : null, wine?.appellation || wine?.region]
                  .filter(Boolean)
                  .join(' • ') || t('wine.noOriginDetails')}
              </p>
              <p className="text-sm text-[#E0D8C8]/70 break-words mt-1">
                {[wine?.varietal, styleLabel].filter(Boolean).join(' • ') || t('wine.noVarietalOrStyle')}
              </p>
            </div>

            <div className="text-left xl:text-right shrink-0">
              <div className="text-xs uppercase tracking-wide text-[#D4A574] font-semibold">
                {totalValue > 0 ? (confidence === 'low' ? t('wine.estimatedValueApprox') : t('wine.collectionValue')) : t('wine.notValued')}
              </div>
              <div className="text-2xl font-bold text-[#F5F1E7] mt-1">
                {totalValue > 0 ? formatFromBase(totalValue) : '—'}
              </div>
              {quantity > 0 && (
                <div className="text-sm text-[#D8C7A6] mt-1">
                  {t('wine.quantityBottles', { count: quantity })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {drinkWindowStatus && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  background: `${DRINK_WINDOW_COLORS[drinkWindowStatus]}22`,
                  border: `1px solid ${DRINK_WINDOW_COLORS[drinkWindowStatus]}44`,
                  color: DRINK_WINDOW_COLORS[drinkWindowStatus],
                }}
              >
                {drinkWindowLabel}
              </span>
            )}
            {styleLabel && <MiniBadge>{styleLabel}</MiniBadge>}
            {wine?.varietal && <MiniBadge>{wine.varietal}</MiniBadge>}
            {wine?.rating > 0 && (
              <MiniBadge tone="accent">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {wine.rating}
                </span>
              </MiniBadge>
            )}
          </div>

          <p className="text-sm text-[#E0D8C8]/88 break-words leading-relaxed">
            {wine?.notes ? `${wine.notes.slice(0, 180)}${wine.notes.length > 180 ? '…' : ''}` : t('whiskey.noNotesYet')}
          </p>
        </div>

        <div className="flex lg:flex-col gap-2 lg:w-[148px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onLogTasting(wine)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1"
            style={{
              background: 'rgba(139,58,58,0.16)',
              border: '1px solid rgba(139,58,58,0.28)',
              color: '#C47070',
            }}
          >
            <List className="w-4 h-4" />
            {t('wine.listLog')}
          </button>
          <EnrichButton itemType="wine" record={wine} onEnriched={onEnriched} />
          <button
            type="button"
            onClick={() => onAddToWantList(wine)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(180,140,75,0.18)',
              color: 'rgba(224,216,200,0.75)',
            }}
          >
            <BookmarkPlus className="w-4 h-4" />
            {t('wine.wantShort')}
          </button>
          <button
            type="button"
            onClick={() => onEdit(wine)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(180,140,75,0.18)',
              color: '#D4A574',
            }}
          >
            <Edit2 className="w-4 h-4" />
            {t('common.edit')}
          </button>
          <button
            type="button"
            onClick={() => onDelete(wine)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(180,140,75,0.18)',
              color: '#F0B4B4',
            }}
          >
            <Trash2 className="w-4 h-4" />
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
