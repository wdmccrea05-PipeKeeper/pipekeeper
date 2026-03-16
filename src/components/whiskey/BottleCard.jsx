import React from 'react';
import { Star, Shield, Wine, Droplets, Edit2, Trash2, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';

function InventoryBadges({ bottleId }) {
  const { data: units = [] } = useQuery({
    queryKey: ['inventory-units', bottleId],
    queryFn: async () => {
      const r = await base44.entities.WhiskeyInventoryUnit.filter({ bottle_id: bottleId });
      return Array.isArray(r) ? r : [];
    },
    enabled: !!bottleId,
    staleTime: 30000,
  });

  if (!units.length) return null;

  const reserve = units.filter(u => u.status === 'reserve').length;
  const drinking = units.filter(u => u.status === 'drinking').length;
  const open = units.filter(u => u.status === 'open').length;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {reserve > 0 && (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
          style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
          <Shield className="w-2.5 h-2.5" />{reserve} reserve
        </span>
      )}
      {drinking > 0 && (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
          style={{ background: 'rgba(123,155,91,0.15)', border: '1px solid rgba(123,155,91,0.3)', color: '#7B9B5B' }}>
          <Wine className="w-2.5 h-2.5" />{drinking} drinking
        </span>
      )}
      {open > 0 && (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
          style={{ background: 'rgba(163,92,92,0.15)', border: '1px solid rgba(163,92,92,0.3)', color: '#A35C5C' }}>
          <Droplets className="w-2.5 h-2.5" />{open} open
        </span>
      )}
    </div>
  );
}

export default function BottleCard({ bottle, onClick, onEdit, onDelete, onShare }) {
  const { t } = useTranslation();
  if (!bottle) return null;
  
  // onClick is no longer used since the card is wrapped in an anchor tag
  // but kept for backward compatibility

  const getPurchaseTypeBgColor = (type) => {
    switch (type) {
      case 'retail':
        return 'rgba(180,140,75,0.15)';
      case 'aftermarket':
        return 'rgba(212,175,55,0.15)';
      case 'gift':
        return 'rgba(123,155,91,0.15)';
      default:
        return 'rgba(180,140,75,0.15)';
    }
  };

  const getPurchaseTypeTextColor = (type) => {
    switch (type) {
      case 'retail':
        return 'rgba(224,216,200,0.8)';
      case 'aftermarket':
        return '#D4AF37';
      case 'gift':
        return '#7B9B5B';
      default:
        return 'rgba(224,216,200,0.8)';
    }
  };

  const getPurchaseTypeLabel = (type) => {
    const typeMap = {
      retail: t('whiskey.purchaseTypeRetail'),
      aftermarket: t('whiskey.purchaseTypeAftermarket'),
      gift: t('whiskey.purchaseTypeGift'),
      trade: t('whiskey.purchaseTypeTrade'),
      other: t('whiskey.purchaseTypeOther'),
    };
    return typeMap[type] || type;
  };

  const renderStars = (rating) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className="w-3.5 h-3.5"
        style={{
          color: i < Math.round(rating || 0) ? '#D4AF37' : 'rgba(180,140,75,0.25)',
          fill: i < Math.round(rating || 0) ? '#D4AF37' : 'none',
        }}
      />
    ));

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group hover:-translate-y-1 transition-transform duration-300"
      style={{
        background: 'linear-gradient(155deg, rgba(38, 26, 18, 0.96), rgba(32, 22, 15, 0.99))',
        border: '1px solid rgba(120, 90, 65, 0.35)',
        boxShadow: '0 5px 20px rgba(0,0,0,0.75), inset 0 1px 0 rgba(180,140,100,0.14)',
      }}
    >
      {/* Background blur image */}
      {bottle?.photo && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${bottle.photo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px) brightness(0.25) saturate(0.55)',
            opacity: 0.95,
            transform: 'scale(1.12)',
          }}
        />
      )}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(155deg, rgba(32,22,15,0.8) 0%, rgba(28,18,10,0.6) 50%, rgba(100,70,45,0.15) 100%)' }}
      />

      {/* Hero image */}
      {bottle?.photo && (
        <div className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden" style={{ width: '50%' }}>
          <img src={bottle.photo} alt={bottle.name} loading="lazy" className="absolute"
            style={{
              right: '-5%', top: '50%', transform: 'translateY(-50%) rotate(-8deg)',
              height: '110%', maxWidth: 'none', width: 'auto', objectFit: 'contain',
              filter: 'drop-shadow(0 0 16px rgba(212,175,55,0.6))',
            }}
          />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, rgba(28,18,10,1) 0%, rgba(28,18,10,0.3) 50%, transparent 100%)' }}
          />
        </div>
      )}

      <div className="relative p-5 flex flex-col justify-between" style={{ minHeight: '240px' }}>
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-bold text-lg line-clamp-2" style={{ color: '#F5F1E7', textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}>
                {bottle.name}
              </h3>
              <p className="text-xs mt-1" style={{ color: 'rgba(180,140,75,0.85)' }}>
                {bottle.distillery || bottle.region || bottle.country || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {bottle.type && (
              <span className="px-2 py-1 rounded-full"
                style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.3)', color: 'rgba(224,216,200,0.8)' }}>
                {bottle.type}
              </span>
            )}
            {bottle.age && (
              <span className="px-2 py-1 rounded-full"
                style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                {bottle.age}y
              </span>
            )}
            {bottle.purchase_type && bottle.purchase_type !== 'retail' && (
              <span className="px-2 py-1 rounded-full text-xs"
                style={{ background: getPurchaseTypeBgColor(bottle.purchase_type), border: '1px solid', borderColor: getPurchaseTypeTextColor(bottle.purchase_type), color: getPurchaseTypeTextColor(bottle.purchase_type), opacity: 0.8 }}>
                {getPurchaseTypeLabel(bottle.purchase_type)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-[rgba(180,140,75,0.2)]">
          {/* Inventory badges */}
          <InventoryBadges bottleId={bottle.id} />

          {bottle.rating && (
            <div className="flex items-center gap-1">
              {renderStars(bottle.rating)}
              <span className="text-xs ml-2" style={{ color: 'rgba(224,216,200,0.6)' }}>{Number(bottle.rating).toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}