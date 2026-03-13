import React from 'react';
import { Star, Droplet, Calendar } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function BottleCard({ bottle, onClick }) {
  const { t } = useTranslation();

  if (!bottle) return null;

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className="w-3.5 h-3.5"
        style={{
          color: i < Math.round(rating || 0) ? '#D4AF37' : 'rgba(180,140,75,0.25)',
          fill: i < Math.round(rating || 0) ? '#D4AF37' : 'none',
        }}
      />
    ));
  };

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer group hover:-translate-y-1 transition-transform duration-300"
      style={{
        background: 'linear-gradient(155deg, rgba(38, 26, 18, 0.96), rgba(32, 22, 15, 0.99))',
        border: '1px solid rgba(120, 90, 65, 0.35)',
        boxShadow: '0 5px 20px rgba(0,0,0,0.75), inset 0 1px 0 rgba(180,140,100,0.14)',
      }}
    >
      {/* Background Image */}
      {bottle?.photo && (
        <div
          className="absolute inset-0 pointer-events-none"
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

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(155deg, rgba(32,22,15,0.8) 0%, rgba(28,18,10,0.6) 50%, rgba(100,70,45,0.15) 100%)',
        }}
      />

      {/* Hero Image */}
      {bottle?.photo && (
        <div
          className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden"
          style={{ width: '50%' }}
        >
          <img
            src={bottle.photo}
            alt={bottle.name}
            loading="lazy"
            className="absolute"
            style={{
              right: '-5%',
              top: '50%',
              transform: 'translateY(-50%) rotate(-8deg)',
              height: '110%',
              maxWidth: 'none',
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 16px rgba(212,175,55,0.6))',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, rgba(28,18,10,1) 0%, rgba(28,18,10,0.3) 50%, transparent 100%)',
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative p-5 h-64 flex flex-col justify-between">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3
                className="font-bold text-lg line-clamp-2"
                style={{ color: '#F5F1E7', textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}
              >
                {bottle.name || 'Unnamed Bottle'}
              </h3>
              <p
                className="text-xs mt-1"
                style={{ color: 'rgba(180,140,75,0.85)' }}
              >
                {bottle.distillery || 'Unknown Distillery'}
              </p>
            </div>
          </div>

          {/* Type and Region */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {bottle.type && (
              <span
                className="px-2 py-1 rounded-full"
                style={{
                  background: 'rgba(180,140,75,0.15)',
                  border: '1px solid rgba(180,140,75,0.3)',
                  color: 'rgba(224,216,200,0.8)',
                }}
              >
                {bottle.type}
              </span>
            )}
            {bottle.age && (
              <span
                className="px-2 py-1 rounded-full"
                style={{
                  background: 'rgba(212,175,55,0.15)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: '#D4AF37',
                }}
              >
                {bottle.age}y
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-3 pt-3 border-t border-[rgba(180,140,75,0.2)]">
          {/* Rating */}
          {bottle.rating && (
            <div className="flex items-center gap-1">
              {renderStars(bottle.rating)}
              <span
                className="text-xs ml-2"
                style={{ color: 'rgba(224,216,200,0.6)' }}
              >
                {bottle.rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Fill Level and Info */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1" style={{ color: 'rgba(180,140,75,0.75)' }}>
              {bottle.fill_level && (
                <>
                  <Droplet className="w-3 h-3" />
                  {bottle.fill_level}
                </>
              )}
            </div>
            {bottle.purchase_date && (
              <div className="flex items-center gap-1" style={{ color: 'rgba(180,140,75,0.6)' }}>
                <Calendar className="w-3 h-3" />
                {new Date(bottle.purchase_date).getFullYear()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}