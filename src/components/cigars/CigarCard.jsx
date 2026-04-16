import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Cigarette, Heart, MoreVertical, Package, Star } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrency } from '@/lib/currency/useCurrency';
import { formatCigarStrengthLabel } from '@/platform/cigarCatalog';
import { getCigarQuickActionLabels } from '@/platform/cigarQuickActions';
import { calculateCigarValue } from '@/utils/cigarValuation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function MiniTag({ children, tone = 'default' }) {
  const tones = {
    default: {
      background: 'rgba(180,140,75,0.18)',
      border: '1px solid rgba(180,140,75,0.28)',
      color: '#F5F1E7',
    },
    gold: {
      background: 'rgba(180,140,75,0.25)',
      border: '1px solid rgba(180,140,75,0.45)',
      color: '#D4A574',
    },
    brown: {
      background: 'rgba(140,107,63,0.22)',
      border: '1px solid rgba(140,107,63,0.38)',
      color: '#D4A574',
    },
  };
  const style = tones[tone] || tones.default;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={style}>
      {children}
    </span>
  );
}

export default function CigarCard({
  cigar,
  onToggleFavorite,
  onQuickAction,
  onEdit,
  onDelete,
  onAssignHumidor,
  humidors = [],
  selectMode = false,
  isSelected = false,
  onToggleSelect,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const [imageFailed, setImageFailed] = React.useState(false);

  const photo = Array.isArray(cigar?.photos) ? cigar.photos[0] : cigar?.photos || '';

  const handleClick = () => {
    navigate(createPageUrl(`CigarDetail?id=${cigar.id}`));
  };

  const handleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onToggleFavorite === 'function') onToggleFavorite(cigar);
  };

  const fireQuickAction = (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onQuickAction === 'function') onQuickAction(cigar, action);
  };

  const runCardAction = (action) => {
    if (typeof onQuickAction === 'function') onQuickAction(cigar, action);
  };
  const actionLabels = getCigarQuickActionLabels(cigar);
  const quantityBadgePositionClass = selectMode ? 'top-12' : 'top-3';
  const valuation = calculateCigarValue(cigar);

  const handleSelectToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onToggleSelect === 'function') onToggleSelect(cigar);
  };

  const originLine = [cigar?.wrapper, cigar?.country_of_origin].filter(Boolean).join(' · ');

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-[rgba(180,140,75,0.42)] hover:-translate-y-0.5"
      onClick={handleClick}
      style={{
        background: 'linear-gradient(135deg, rgba(58,40,28,0.98), rgba(31,21,16,1))',
        border: '1px solid rgba(180,140,75,0.22)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.42)',
      }}
    >
      {/* Photo area */}
      <div className="relative h-44 bg-gradient-to-b from-[#3d2a1d] to-[#24160f]">
        {photo && !imageFailed ? (
          <img
            src={photo}
            alt={cigar?.name || 'Cigar'}
            className="w-full h-44 object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Cigarette className="w-10 h-10" style={{ color: 'rgba(180,140,75,0.35)' }} />
            <span className="text-xs text-[#E0D8C8]/40">{t('cigars.noPhoto', 'No photo')}</span>
          </div>
        )}

        {/* Quantity badge */}
        {cigar?.quantity > 0 && (
          <div
            className={`absolute ${quantityBadgePositionClass} left-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold`}
            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574' }}
          >
            <Package className="w-3 h-3" />
            {cigar.quantity}
          </div>
        )}

        {selectMode && (
          <button
            type="button"
            onClick={handleSelectToggle}
            className="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: isSelected ? 'rgba(76,175,130,0.9)' : 'rgba(0,0,0,0.45)',
              border: `1px solid ${isSelected ? 'rgba(76,175,130,1)' : 'rgba(255,255,255,0.22)'}`,
              color: '#fff',
            }}
            aria-label={isSelected ? 'Unselect cigar' : 'Select cigar'}
          >
            {isSelected && <Check className="w-4 h-4" />}
          </button>
        )}

        {/* Favorite button */}
        <button
          type="button"
          onClick={handleFavorite}
          className="absolute top-3 right-11 p-1.5 rounded-full transition-all"
          style={{
            background: cigar?.is_favorite ? 'rgba(163,92,92,0.85)' : 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
          aria-label={cigar?.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            className="w-4 h-4"
            style={{ color: cigar?.is_favorite ? '#fff' : 'rgba(255,255,255,0.55)' }}
            fill={cigar?.is_favorite ? 'currentColor' : 'none'}
          />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="absolute top-3 right-3 p-1.5 rounded-full transition-all"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.75)',
              }}
              aria-label="Open cigar actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => runCardAction('smoked_one')}>{actionLabels.smoked_one}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => runCardAction('bought_more')}>{actionLabels.bought_more}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => runCardAction('toggle_wishlist')}>{actionLabels.toggle_wishlist}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => runCardAction('toggle_shopping')}>{actionLabels.toggle_shopping}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => runCardAction('toggle_restock')}>{actionLabels.toggle_restock}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => runCardAction('toggle_not_for_me')}>{actionLabels.toggle_not_for_me}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => runCardAction('toggle_favorite')}>{actionLabels.toggle_favorite}</DropdownMenuItem>
            {typeof onAssignHumidor === 'function' && (
              <DropdownMenuItem onSelect={() => onAssignHumidor(cigar)}>Assign Humidor…</DropdownMenuItem>
            )}
            {Array.isArray(humidors) && humidors.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Assign To</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => runCardAction('unassign_humidor')}>{actionLabels.unassign_humidor}</DropdownMenuItem>
                {humidors.slice(0, 6).map((humidor) => (
                  <DropdownMenuItem key={humidor.id} onSelect={() => runCardAction({ type: 'assign_humidor', humidorId: humidor.id })}>
                    {humidor.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {(typeof onEdit === 'function' || typeof onDelete === 'function') && <DropdownMenuSeparator />}
            {typeof onEdit === 'function' && (
              <DropdownMenuItem onSelect={() => onEdit(cigar)}>Edit</DropdownMenuItem>
            )}
            {typeof onDelete === 'function' && (
              <DropdownMenuItem onSelect={() => onDelete(cigar)} className="text-red-500 focus:text-red-500">Delete</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A574]/70">
            {cigar?.brand || '—'}
          </p>
          <h3 className="text-base font-bold text-[#F5F1E7] leading-tight mt-0.5 line-clamp-2">
            {cigar?.name || t('cigars.untitled', 'Untitled Cigar')}
          </h3>
          {cigar?.vitola && (
            <p className="text-xs text-[#E0D8C8]/65 mt-0.5">{cigar.vitola}</p>
          )}
        </div>

        {originLine && (
          <p className="text-xs text-[#E0D8C8]/60 leading-relaxed line-clamp-1">{originLine}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {cigar?.body && <MiniTag tone="brown">{formatCigarStrengthLabel(cigar.body, { short: true })}</MiniTag>}
          {cigar?.strength && cigar.strength !== cigar.body && (
            <MiniTag>{formatCigarStrengthLabel(cigar.strength, { short: true })}</MiniTag>
          )}
        </div>

        {(valuation?.estimatedTotalValue > 0 || cigar?.purchase_price > 0) && (
          <div className="flex items-center justify-between pt-1 border-t border-[rgba(180,140,75,0.12)]">
            <span className="text-xs text-[#D8C7A6]/55">
              {valuation?.estimatedTotalValue > 0 ? 'Est. Total Value' : 'Purchase Basis'}
            </span>
            <span className="text-sm font-bold text-[#D4A574]">
              {formatFromBase(valuation?.estimatedTotalValue || valuation?.remainingCostBasis || cigar?.purchase_price || 0)}
            </span>
          </div>
        )}

        {cigar?.rating > 0 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="w-3 h-3"
                style={{ color: i < cigar.rating ? '#D4A574' : 'rgba(180,140,75,0.22)' }}
                fill={i < cigar.rating ? '#D4A574' : 'none'}
              />
            ))}
          </div>
        )}

        {typeof onQuickAction === 'function' && (
          <div className="hidden sm:flex flex-wrap gap-1 pt-1 border-t border-[rgba(180,140,75,0.12)]">
            <button type="button" onClick={(e) => fireQuickAction(e, 'smoked_one')} className="px-2 py-1 rounded text-[10px]" style={{ background: 'rgba(140,107,63,0.18)', color: '#E0D8C8' }}>Smoked 1</button>
            <button type="button" onClick={(e) => fireQuickAction(e, 'bought_more')} className="px-2 py-1 rounded text-[10px]" style={{ background: 'rgba(76,175,130,0.18)', color: '#E0D8C8' }}>Bought +</button>
            <button type="button" onClick={(e) => fireQuickAction(e, 'toggle_wishlist')} className="px-2 py-1 rounded text-[10px]" style={{ background: cigar?.wishlist ? 'rgba(180,140,75,0.3)' : 'rgba(255,255,255,0.08)', color: '#E0D8C8' }}>Wishlist</button>
            <button type="button" onClick={(e) => fireQuickAction(e, 'toggle_shopping')} className="px-2 py-1 rounded text-[10px]" style={{ background: cigar?.shopping_list ? 'rgba(180,140,75,0.3)' : 'rgba(255,255,255,0.08)', color: '#E0D8C8' }}>Shopping</button>
          </div>
        )}
      </div>
    </div>
  );
}
