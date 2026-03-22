import React from 'react';

export default function WhiskeyHighlightCard({
  title,
  value,
  subtitle,
  accent = '#C87941',
  photo,
  onClick,
  className,
}) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl overflow-hidden group transition-all duration-300 hover:shadow-2xl aspect-[3/2] ${onClick ? 'cursor-pointer' : ''} ${className || ''}`}
      style={{
        border: '1px solid rgba(180,140,75,0.25)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        backgroundImage: photo
          ? `url('${photo}')`
          : 'linear-gradient(135deg, rgba(60,40,25,0.9), rgba(40,25,15,0.95))',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Hero gradient overlay — transparent top, dark bottom */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 10%, ${accent}28 0%, transparent 50%),
                      linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.82) 100%)`,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)',
        }}
      />

      {/* Content — bottom anchored like PipeKeeper */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 z-10">
        <p
          className="text-xs uppercase tracking-[0.15em] font-bold mb-2 drop-shadow-lg"
          style={{ color: accent }}
        >
          {title}
        </p>
        <p
          className="text-xl sm:text-2xl font-bold leading-tight break-words drop-shadow-lg"
          style={{
            color: '#F5F1E7',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            fontFamily: "'Georgia', serif",
          }}
        >
          {value ?? '—'}
        </p>
        {subtitle && (
          <p
            className="text-xs mt-2 drop-shadow-md"
            style={{
              color: 'rgba(224,216,200,0.75)',
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