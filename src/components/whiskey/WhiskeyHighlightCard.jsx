import React from 'react';
import { cn } from '@/lib/utils';

/**
 * WhiskeyHighlightCard - Compact highlight card for multi-card grid
 * Optimized for responsive display (mobile stacked, desktop grid)
 */
export default function WhiskeyHighlightCard({
  title,
  value,
  subtitle,
  accent = '#B4824B',
  photo,
  onClick,
  className,
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-lg overflow-hidden transition-all duration-300 p-5',
        'min-h-[180px] flex flex-col justify-between',
        onClick && 'cursor-pointer hover:shadow-xl hover:translate-y-[-2px]',
        className
      )}
      style={{
        background: `linear-gradient(135deg, rgba(42, 30, 22, 0.85), rgba(35, 24, 16, 0.92))`,
        border: `1px solid rgba(120, 90, 65, 0.32)`,
        boxShadow: `0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)`,
      }}
    >
      {/* Background photo if exists */}
      {photo && (
        <div
          className='absolute inset-0 pointer-events-none'
          style={{
            backgroundImage: `url(${photo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(6px) brightness(0.35) saturate(0.7)',
            opacity: 1,
            transform: 'scale(1.05)',
          }}
        />
      )}

      {/* Gradient overlay */}
      <div
        className='absolute inset-0 pointer-events-none'
        style={{
          background: photo
            ? `linear-gradient(135deg, rgba(22,14,8,0.78) 0%, rgba(22,14,8,0.65) 100%)`
            : `linear-gradient(135deg, rgba(32,22,15,0.96) 0%, rgba(32,22,15,0.85) 100%)`,
        }}
      />

      {/* Top accent line */}
      <div
        className='absolute top-0 left-0 right-0 h-[1px]'
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accent}60 50%, transparent 100%)`,
        }}
      />

      {/* Content */}
      <div className='relative z-10 flex flex-col h-full justify-between'>
        {/* Label */}
        <div
          className='text-[10px] uppercase tracking-[0.12em] font-semibold mb-3'
          style={{ color: `${accent}b8` }}
        >
          {title}
        </div>

        {/* Main value */}
        <div className='flex-1 flex items-start'>
          <div
            className='text-2xl sm:text-3xl font-bold leading-tight'
            style={{
              color: '#F5F1E7',
              textShadow: '0 2px 6px rgba(0,0,0,0.8)',
              fontFamily: "'Georgia', serif",
            }}
          >
            {value ?? '—'}
          </div>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div
            className='text-xs sm:text-sm font-semibold leading-snug mt-3'
            style={{
              color: `${accent}c8`,
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}