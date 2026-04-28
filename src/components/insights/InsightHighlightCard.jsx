/**
 * InsightHighlightCard — shared hero-style highlight card used by all module Insights pages.
 *
 * Canonical design: same dimensions, gradient overlay, typography, and hover behaviour
 * as the PipeKeeper Insights highlight cards.
 */
import React from 'react';

export default function InsightHighlightCard({
  title,
  value,
  subtitle,
  accent = '#D4A574',
  photo,
  icon: Icon,
  onClick,
  className = '',
}) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 aspect-[3/2] ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        border: `1px solid ${accent}44`,
        boxShadow: '0 12px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
        backgroundImage: photo
          ? `url('${photo}')`
          : `linear-gradient(135deg, rgba(42,28,18,0.97) 0%, rgba(28,18,12,0.99) 100%)`,
        backgroundSize: photo ? 'contain' : 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Accent radial spotlight + bottom vignette gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 10%, ${accent}28 0%, transparent 52%),
                      linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 55%, rgba(0,0,0,0.82) 100%)`,
        }}
      />

      {/* Edge vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.38) 100%)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.55)',
        }}
      />

      {/* Optional icon badge — top-left */}
      {Icon && (
        <div
          className="absolute top-3 left-3 z-10 w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: `${accent}22`,
            border: `1px solid ${accent}55`,
            backdropFilter: 'blur(6px)',
          }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      )}

      {/* Bottom-anchored text content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 z-10">
        <p
          className="text-[10px] sm:text-xs uppercase tracking-[0.1em] font-bold mb-1.5 drop-shadow-lg leading-tight"
          style={{ color: accent }}
        >
          {title}
        </p>
        <p
          className="text-lg sm:text-xl font-bold leading-tight line-clamp-2 drop-shadow-lg"
          style={{
            color: '#F5F1E7',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            fontFamily: "'Georgia', serif",
          }}
        >
          {value || '—'}
        </p>
        {subtitle && (
          <p
            className="text-xs mt-1.5 drop-shadow-md"
            style={{
              color: 'rgba(224,216,200,0.78)',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}