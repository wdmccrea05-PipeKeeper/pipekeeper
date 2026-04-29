import React from 'react';

/**
 * HeroHighlightCard — Premium highlight card supporting multiple image presentations.
 *
 * objectMode options:
 * - "cover": Full-card image (PipeKeeper, CigarKeeper, Tobacco, WineKeeper highlights)
 * - "contain": Simple centered image (detail/gallery where full bottle visibility matters)
 * - "bottle": Alias for "cover" — full-card cover treatment, no foreground thumbnail
 */
export default function HeroHighlightCard({
  title,
  value,
  subtitle,
  photo,
  accent = '#B48C4B',
  onClick,
  objectMode = 'cover',
  className,
}) {
  const useCssCover = objectMode === 'cover' || objectMode === 'bottle';

  return (
    <div
      className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl aspect-[3/2] ${className || ''}`}
      onClick={onClick}
      style={{
        border: `1px solid ${accent}44`,
        boxShadow: '0 12px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
        ...(useCssCover && photo
          ? {
              backgroundImage: `url('${photo}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : {}),
      }}
    >
      {/* Background layer — contain mode only uses img; cover/bottle use CSS backgroundImage */}
      {!useCssCover && photo ? (
        <img
          src={photo}
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ objectFit: 'contain', objectPosition: 'center' }}
        />
      ) : !photo ? (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(42,28,18,0.97) 0%, rgba(28,18,12,0.99) 100%)' }}
        />
      ) : null}

      {/* Accent radial gradient for depth */}
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

      {/* Top brass accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accent}90 40%, ${accent} 50%, ${accent}90 60%, transparent 100%)`,
          boxShadow: `0 0 4px ${accent}60`,
        }}
      />

      {/* Content overlay */}
      <div className="relative p-4 sm:p-6 flex flex-col justify-start h-full z-10">
        {/* Category label */}
        <div
          className="text-[10px] uppercase tracking-[0.15em] font-bold mb-3"
          style={{ color: `${accent}e5` }}
        >
          {title}
        </div>

        {/* Bottom-anchored text */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 sm:p-6"
        >
          {/* Main value */}
          <div
            className="text-lg sm:text-2xl font-bold leading-tight line-clamp-2 mb-1"
            style={{
              color: '#F5F1E7',
              textShadow: '0 2px 10px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)',
              fontFamily: "'Georgia', serif",
            }}
          >
            {value ?? '—'}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <div
              className="text-xs sm:text-sm font-semibold leading-snug line-clamp-2 break-normal"
              style={{
                color: `${accent}dd`,
                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}