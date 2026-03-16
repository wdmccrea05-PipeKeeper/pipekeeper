import React from 'react';
import { Star, Shield, Wine, Droplets } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/components/utils/localeFormatters';

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

export default function BottleListItem({ bottle, onClick }) {
  if (!bottle) return null;

  const renderStars = (rating) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className="w-3 h-3"
        style={{
          color: i < Math.round(rating || 0) ? '#D4AF37' : 'rgba(180,140,75,0.25)',
          fill: i < Math.round(rating || 0) ? '#D4AF37' : 'none',
        }}
      />
    ));

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-lg cursor-pointer group hover:bg-opacity-80 transition-all"
      style={{
        background: 'linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(32, 22, 15, 0.8))',
        border: '1px solid rgba(120, 90, 65, 0.2)',
      }}
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden" style={{ background: 'rgba(100,70,45,0.2)' }}>
        {bottle.photo ? (
          <img src={bottle.photo} alt={bottle.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(180,140,75,0.3)' }}>
            🥃
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base line-clamp-2" style={{ color: '#F5F1E7' }}>
              {bottle.name}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(180,140,75,0.85)' }}>
              {bottle.distillery || bottle.region || bottle.country || '—'}
            </p>
            <div className="flex items-center gap-2 text-xs mt-2 flex-wrap">
              {bottle.type && <span style={{ color: 'rgba(224,216,200,0.7)' }}>{bottle.type}</span>}
              {bottle.age && <span style={{ color: '#D4A574' }}>{bottle.age}y</span>}
              {bottle.abv && <span style={{ color: 'rgba(224,216,200,0.7)' }}>{bottle.abv}%</span>}
            </div>
          </div>

          {/* Rating & Value */}
          <div className="flex flex-col items-end gap-2">
            {bottle.rating && (
              <div className="flex items-center gap-1">
                {renderStars(bottle.rating)}
              </div>
            )}
            <div style={{ color: '#D4A574', fontWeight: 'bold' }}>
              {formatCurrency(bottle.average_market_value || bottle.purchase_price || 0)}
            </div>
          </div>
        </div>

        {/* Inventory Badges */}
        <div className="mt-3">
          <InventoryBadges bottleId={bottle.id} />
        </div>
      </div>
    </div>
  );
}