import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cigarette, Heart, Package, Star } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';

const BODY_LABELS = {
  mild: 'Mild',
  mild_medium: 'Mild-Med',
  medium: 'Medium',
  medium_full: 'Med-Full',
  full: 'Full',
};

export default function CigarListItem({ cigar, onToggleFavorite, onQuickAction }) {
  const navigate = useNavigate();

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
        className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: 'rgba(58,40,28,0.8)', border: '1px solid rgba(180,140,75,0.18)' }}
      >
        {photo ? (
          <img src={photo} alt={cigar?.name} className="w-full h-full object-cover" />
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
              <span className="text-xs text-[#D4A574]/65">{BODY_LABELS[cigar.body] || cigar.body}</span>
            </>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
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
      </div>
    </div>
  );
}
