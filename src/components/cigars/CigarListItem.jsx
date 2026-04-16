import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Cigarette, Heart, MoreVertical, Package, Star } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { formatCigarStrengthLabel } from '@/platform/cigarCatalog';
import { getCigarQuickActionLabels } from '@/platform/cigarQuickActions';
import { useCurrency } from '@/lib/currency/useCurrency';
import { calculateCigarValue } from '@/utils/cigarValuation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CigarListItem({
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
  const [imageFailed, setImageFailed] = React.useState(false);
  const { formatFromBase } = useCurrency();
  const valuation = calculateCigarValue(cigar);

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

  const runAction = (action) => {
    if (typeof onQuickAction === 'function') onQuickAction(cigar, action);
  };
  const actionLabels = getCigarQuickActionLabels(cigar);

  const handleSelectToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onToggleSelect === 'function') onToggleSelect(cigar);
  };

  const photo = Array.isArray(cigar?.photos) ? cigar.photos[0] : cigar?.photos || '';

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:border-[rgba(180,140,75,0.35)]"
      onClick={handleClick}
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(180,140,75,0.18)',
      }}
    >
      {/* Thumbnail */}
      <div
        className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center relative"
        style={{ background: 'rgba(58,40,28,0.8)', border: '1px solid rgba(180,140,75,0.18)' }}
      >
        {photo && !imageFailed ? (
          <img src={photo} alt={cigar?.name} className="w-full h-full object-cover" onError={() => setImageFailed(true)} />
        ) : (
          <Cigarette className="w-5 h-5" style={{ color: 'rgba(180,140,75,0.4)' }} />
        )}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-[#D4A574]/75 uppercase tracking-wide truncate max-w-[80px]">
            {cigar?.brand || '—'}
          </span>
          <span className="text-sm font-semibold text-[#F5F1E7] truncate">
            {cigar?.name || 'Untitled'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {cigar?.vitola && (
            <span className="text-xs text-[#E0D8C8]/55 truncate">{cigar.vitola}</span>
          )}
          {cigar?.wrapper && (
            <>
              <span className="text-[#E0D8C8]/30">·</span>
              <span className="text-xs text-[#E0D8C8]/45 truncate">{cigar.wrapper}</span>
            </>
          )}
          {cigar?.body && (
            <>
              <span className="text-[#E0D8C8]/30">·</span>
              <span className="text-xs text-[#D4A574]/65">{formatCigarStrengthLabel(cigar.body, { short: true })}</span>
            </>
          )}
        </div>
        {valuation?.estimatedTotalValue > 0 && (
          <div className="mt-1 text-xs text-[#D4A574]/80">
            Value {formatFromBase(valuation.estimatedTotalValue)}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {selectMode && (
          <button
            type="button"
            onClick={handleSelectToggle}
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: isSelected ? 'rgba(76,175,130,0.9)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isSelected ? 'rgba(76,175,130,1)' : 'rgba(180,140,75,0.25)'}`,
              color: '#fff',
            }}
            aria-label={isSelected ? 'Unselect cigar' : 'Select cigar'}
          >
            {isSelected && <Check className="w-3.5 h-3.5" />}
          </button>
        )}

        {cigar?.rating > 0 && (
          <div className="flex items-center gap-0.5 hidden sm:flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="w-3 h-3"
                style={{ color: i < cigar.rating ? '#D4A574' : 'rgba(180,140,75,0.2)' }}
                fill={i < cigar.rating ? '#D4A574' : 'none'}
              />
            ))}
          </div>
        )}

        {cigar?.quantity > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#D4A574]/75">
            <Package className="w-3.5 h-3.5" />
            <span className="font-semibold">{cigar.quantity}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleFavorite}
          className="p-1 rounded-full transition-all"
          style={{ color: cigar?.is_favorite ? '#F0B4B4' : 'rgba(255,255,255,0.3)' }}
          aria-label={cigar?.is_favorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Heart
            className="w-4 h-4"
            fill={cigar?.is_favorite ? 'currentColor' : 'none'}
          />
        </button>
        {typeof onQuickAction === 'function' && (
          <div className="hidden xl:flex items-center gap-1">
            <button type="button" onClick={(e) => fireQuickAction(e, 'smoked_one')} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(140,107,63,0.18)', color: '#E0D8C8' }}>-1</button>
            <button type="button" onClick={(e) => fireQuickAction(e, 'bought_more')} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(76,175,130,0.18)', color: '#E0D8C8' }}>+buy</button>
            <button type="button" onClick={(e) => fireQuickAction(e, 'toggle_shopping')} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: cigar?.shopping_list ? 'rgba(180,140,75,0.3)' : 'rgba(255,255,255,0.08)', color: '#E0D8C8' }}>shop</button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.08)]"
              style={{ color: 'rgba(224,216,200,0.65)' }}
              aria-label="Open cigar actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => runAction('smoked_one')}>{actionLabels.smoked_one}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => runAction('bought_more')}>{actionLabels.bought_more}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => runAction('toggle_wishlist')}>{actionLabels.toggle_wishlist}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => runAction('toggle_shopping')}>{actionLabels.toggle_shopping}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => runAction('toggle_restock')}>{actionLabels.toggle_restock}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => runAction('toggle_not_for_me')}>{actionLabels.toggle_not_for_me}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => runAction('toggle_favorite')}>{actionLabels.toggle_favorite}</DropdownMenuItem>
            {typeof onAssignHumidor === 'function' && (
              <DropdownMenuItem onSelect={() => onAssignHumidor(cigar)}>Assign Humidor…</DropdownMenuItem>
            )}
            {Array.isArray(humidors) && humidors.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Assign To</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => runAction('unassign_humidor')}>{actionLabels.unassign_humidor}</DropdownMenuItem>
                {humidors.slice(0, 6).map((humidor) => (
                  <DropdownMenuItem key={humidor.id} onSelect={() => runAction({ type: 'assign_humidor', humidorId: humidor.id })}>
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
    </div>
  );
}
