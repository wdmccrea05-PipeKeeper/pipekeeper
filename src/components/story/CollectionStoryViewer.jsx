/**
 * CollectionStoryViewer
 * Full-screen story slideshow for the Hub Collection Story.
 * Renders cards in the same visual format as PipeKeeper stories
 * (bgImage hero + overlay + accent colour + icon + label/value/sub).
 */

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import BrandLogo from '@/components/branding/BrandLogo';

function CollectionStorySlide({ card }) {
  const Icon = card.icon || Heart;
  const accent = card.accent || '#D4A574';
  const hasBg = !!(card.bgImage || card.heroImage);
  const bg = card.bgImage || card.heroImage || null;
  const isClosing = !!card.isClosingCard;

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: hasBg
          ? 'transparent'
          : `radial-gradient(circle at 30% 20%, ${accent}18, transparent 50%),
             linear-gradient(145deg, rgba(38,24,16,0.96), rgba(18,12,8,0.99))`,
        border: `2px solid ${accent}30`,
        boxShadow: `0 8px 40px rgba(0,0,0,0.65), inset 0 1px 0 ${accent}18`,
      }}
    >
      {/* Background image + gradient overlay */}
      {hasBg && (
        <>
          <img
            src={bg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.18) 100%)',
            }}
          />
        </>
      )}

      {/* Ambient glow for non-image cards */}
      {!hasBg && (
        <>
          <div
            className="absolute bottom-0 right-0 w-48 h-48 rounded-full opacity-20 pointer-events-none"
            style={{ background: accent, filter: 'blur(60px)' }}
          />
          <div
            className="absolute top-1/3 left-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
            style={{ background: accent, filter: 'blur(80px)' }}
          />
        </>
      )}

      {/* Progress pill */}
      <div
        className="absolute top-5 right-5 z-20 text-xs font-bold px-2.5 py-1 rounded-full"
        style={{ background: `${accent}25`, color: accent, border: `1px solid ${accent}45` }}
      >
        {card.index} / {card.total}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top area — label + icon (non-bg cards) */}
        {!hasBg && !isClosing && (
          <div className="flex flex-col items-center justify-center flex-1 px-8 text-center gap-6">
            {/* Icon badge */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: `${accent}22`, border: `2px solid ${accent}44` }}
            >
              <Icon className="w-10 h-10" style={{ color: accent }} />
            </div>

            {card.label && (
              <p
                className="text-xs font-bold uppercase tracking-[0.18em]"
                style={{ color: accent }}
              >
                {card.label}
              </p>
            )}

            {card.title && (
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70"
                style={{ color: accent }}
              >
                {card.title}
              </p>
            )}

            <h2
               className="font-bold leading-tight text-center w-full"
               style={{
                 fontSize:
                   String(card.value).length > 30
                     ? 'clamp(1.4rem, 5vw, 2rem)'
                     : String(card.value).length > 20
                     ? 'clamp(1.6rem, 5.5vw, 2.4rem)'
                     : String(card.value).length > 12
                     ? 'clamp(2rem, 7vw, 3rem)'
                     : 'clamp(2.4rem, 8vw, 3.8rem)',
                 color: '#F5F1E7',
                 fontFamily: "'Georgia', serif",
                 wordBreak: 'break-word',
                 overflowWrap: 'anywhere',
                 hyphens: 'none',
                 whiteSpace: 'normal',
               }}
             >
               {card.value}
             </h2>

            {card.sub && (
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(224,216,200,0.72)' }}>
                {card.sub}
              </p>
            )}
          </div>
        )}

        {/* Image cards — label at top, name at bottom */}
        {hasBg && !isClosing && (
          <>
            <div className="pt-10 px-6">
              <p
                className="text-xs font-bold uppercase tracking-[0.18em]"
                style={{ color: '#F5F1E7', textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
              >
                {card.label || card.title}
              </p>
            </div>
            <div className="mt-auto pb-10 px-6">
              <h2
                 className="font-bold leading-snug"
                 style={{
                   fontSize:
                     String(card.value).length > 30
                       ? 'clamp(1.3rem, 4.5vw, 1.8rem)'
                       : String(card.value).length > 20
                       ? 'clamp(1.6rem, 5.5vw, 2.2rem)'
                       : 'clamp(2rem, 7vw, 2.8rem)',
                   color: '#F5F1E7',
                   fontFamily: "'Georgia', serif",
                   textShadow: '0 3px 14px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.7)',
                   wordBreak: 'break-word',
                   overflowWrap: 'anywhere',
                   hyphens: 'none',
                 }}
               >
                 {card.value}
               </h2>
              {card.sub && (
                <p
                  className="text-sm mt-2 leading-relaxed"
                  style={{ color: 'rgba(224,216,200,0.75)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
                >
                  {card.sub}
                </p>
              )}
            </div>
          </>
        )}

        {/* Closing card */}
        {isClosing && (
          <div className="flex flex-col items-center justify-center flex-1 px-6 text-center gap-5">
            <BrandLogo compact showWordmark={false} imageClassName="w-16 h-16" />
            <h2
               className="font-bold w-full"
               style={{
                 color: accent,
                 fontFamily: "'Georgia', serif",
                 fontSize: 'clamp(1.4rem, 6vw, 2.4rem)',
                 wordBreak: 'break-word',
                 overflowWrap: 'anywhere',
                 hyphens: 'none',
                 lineHeight: 1.2,
               }}
             >
               {card.value}
             </h2>
            <p className="text-base" style={{ color: 'rgba(224,216,200,0.7)' }}>
              {card.sub}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CollectionStoryViewer({ cards, onClose }) {
  const [idx, setIdx] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const current = cards[idx];

  const prev = () => { if (idx > 0) setIdx(idx - 1); };
  const next = () => { if (idx < cards.length - 1) setIdx(idx + 1); };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, cards.length]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
      onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart === null) return;
        const dist = touchStart - e.changedTouches[0].clientX;
        if (dist > 50) next();
        else if (dist < -50) prev();
        setTouchStart(null);
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        e.clientX - rect.left > rect.width / 2 ? next() : prev();
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-6 left-6 z-10 p-2 rounded-lg hover:bg-white/10 transition-all"
        aria-label="Close story"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Card */}
      <div
        className="w-full max-w-sm"
        style={{ aspectRatio: '9/16', maxHeight: 'calc(100vh - 120px)' }}
        data-story-card
        role="region"
        aria-label={`Story card ${idx + 1} of ${cards.length}`}
      >
        <CollectionStorySlide card={current} />
      </div>

      {/* Nav */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4">
        <button
          onClick={prev}
          disabled={idx === 0}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Previous"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        <span className="text-white text-sm font-semibold">{idx + 1} / {cards.length}</span>

        <button
          onClick={next}
          disabled={idx === cards.length - 1}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Next"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{ width: `${((idx + 1) / cards.length) * 100}%` }}
        />
      </div>

      <p className="absolute bottom-20 text-white/30 text-xs hidden sm:block">
        Use arrow keys or swipe to navigate · ESC to close
      </p>
    </div>
  );
}