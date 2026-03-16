import React from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Share2, Sparkles, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

/**
 * WhiskeyHighlightCard
 * Whiskey-specific insight highlight cards matching PipeKeeper design
 */

function BottleTexture({ accent = '#C87941', uid = '0' }) {
  const safeId = `bottle-tex-${accent.replace('#', '')}-${uid}`;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id={safeId}
          x="0"
          y="0"
          width="120"
          height="120"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="8" cy="13" r="0.48" fill={accent} fillOpacity="0.075" />
          <circle cx="23" cy="5" r="0.32" fill={accent} fillOpacity="0.055" />
          <circle cx="42" cy="19" r="0.52" fill={accent} fillOpacity="0.07" />
          <circle cx="58" cy="8" r="0.38" fill={accent} fillOpacity="0.075" />
          <circle cx="74" cy="25" r="0.44" fill={accent} fillOpacity="0.06" />
          <circle cx="92" cy="11" r="0.34" fill={accent} fillOpacity="0.07" />
          <circle cx="105" cy="30" r="0.52" fill={accent} fillOpacity="0.075" />
          <circle cx="14" cy="39" r="0.38" fill={accent} fillOpacity="0.065" />
          <circle cx="34" cy="45" r="0.48" fill={accent} fillOpacity="0.06" />
          <circle cx="55" cy="52" r="0.34" fill={accent} fillOpacity="0.075" />
          <circle cx="77" cy="41" r="0.52" fill={accent} fillOpacity="0.065" />
          <circle cx="96" cy="58" r="0.38" fill={accent} fillOpacity="0.06" />
          <circle cx="111" cy="47" r="0.30" fill={accent} fillOpacity="0.075" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${safeId})`} />
    </svg>
  );
}

export function WhiskeyHighlightCard({
  title,
  value,
  sub,
  accent = '#C87941',
  icon: Icon,
  onShare,
  onStory,
  cardRef,
  patternIndex = 0,
  bottleImage,
  heroImage,
}) {
  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl overflow-hidden flex flex-col justify-between min-h-[220px] cursor-default group hover:-translate-y-1 transition-transform duration-300"
      style={{
        background:
          'linear-gradient(155deg, rgba(38, 26, 18, 0.96), rgba(32, 22, 15, 0.99))',
        border: '1px solid rgba(120, 90, 65, 0.42)',
        boxShadow:
          '0 5px 20px rgba(0,0,0,0.75), inset 0 1px 0 rgba(180,140,100,0.14), inset 0 -3px 4px rgba(0,0,0,0.3)',
      }}
    >
      {bottleImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${bottleImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: heroImage
              ? 'blur(22px) brightness(0.28) saturate(0.65) sepia(0.2)'
              : 'blur(20px) brightness(0.25) saturate(0.55) sepia(0.2)',
            opacity: 0.95,
            transform: 'scale(1.12)',
          }}
        />
      )}

      {heroImage && (
        <div
          className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden"
          style={{ width: '55%' }}
        >
          <img
            src={heroImage}
            alt=""
            loading="lazy"
            className="absolute"
            style={{
              right: '-8%',
              top: '50%',
              transform: 'translateY(-50%) rotate(12deg)',
              height: '115%',
              maxWidth: 'none',
              width: 'auto',
              objectFit: 'contain',
              filter: `drop-shadow(0 0 18px ${accent}70) drop-shadow(0 6px 14px rgba(0,0,0,0.7))`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, rgba(28,18,10,1) 0%, rgba(28,18,10,0.42) 38%, transparent 72%)',
            }}
          />
        </div>
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: bottleImage || heroImage
            ? 'linear-gradient(to right, rgba(28,18,10,0.92) 0%, rgba(28,18,10,0.72) 45%, rgba(28,18,10,0.28) 75%, transparent 100%)'
            : 'linear-gradient(155deg, rgba(32,22,15,0.72) 0%, rgba(28,18,10,0.52) 45%, rgba(100,70,45,0.15) 100%)',
        }}
      />

      {(bottleImage || heroImage) && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '58%',
            background:
              'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.30) 50%, transparent 100%)',
          }}
        />
      )}

      <BottleTexture accent={accent} uid={String(patternIndex)} />

      <div
        className="absolute bottom-0 right-0 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
          transform: 'translate(30%, 30%)',
        }}
      />
      <div
        className="absolute top-0 left-0 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
          transform: 'translate(-30%, -30%)',
        }}
      />

      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, ${accent}00 0%, ${accent}ee 35%, ${accent}ff 50%, ${accent}ee 65%, ${accent}00 100%)`,
          boxShadow: `0 0 8px ${accent}cc`,
        }}
      />

      <div className="relative p-6 pb-4 flex flex-col gap-5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div
            className="rounded-2xl flex items-center justify-center shrink-0"
            style={{
              width: '3.5rem',
              height: '3.5rem',
              background:
                'linear-gradient(135deg, rgba(100, 70, 45, 0.5) 0%, rgba(80, 55, 35, 0.6) 100%)',
              border: '1px solid rgba(120, 90, 65, 0.45)',
              boxShadow:
                '0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.22)',
            }}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: accent, filter: `drop-shadow(0 0 7px ${accent}dd)` }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {onStory && (
              <button
                onClick={onStory}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all duration-200 opacity-0 group-hover:opacity-100 active:opacity-100"
                style={{
                  background: `${accent}30`,
                  border: `1px solid ${accent}50`,
                  color: accent,
                }}
              >
                <Sparkles className="w-3 h-3" />
                Story
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 opacity-40 hover:opacity-100 active:opacity-100"
                style={{
                  background: `${accent}25`,
                  border: `1px solid ${accent}45`,
                }}
              >
                <Share2 className="w-3.5 h-3.5" style={{ color: accent }} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.16em] font-bold leading-tight"
            style={{
              color: 'rgba(180,140,75,0.9)',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              hyphens: 'none',
            }}
          >
            {title}
          </div>
          <div
            className="text-[2.25rem] font-extrabold leading-tight tracking-tight"
            style={{
              color: '#F5F1E7',
              textShadow:
                '0 2px 10px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)',
              WebkitTextStroke: '0.4px rgba(255,255,255,0.12)',
              fontFamily: "'Georgia', serif",
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              hyphens: 'none',
            }}
          >
            {value ?? '—'}
          </div>
          {sub && (
            <div
              className="text-sm leading-snug pt-1 font-semibold"
              style={{
                color: 'rgba(180,140,75,0.85)',
                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>

      <div
        className="relative px-5 py-2.5 flex items-center justify-between"
        style={{ borderTop: `1px solid ${accent}20` }}
      >
        <span
          className="text-[9px] uppercase tracking-[0.18em] font-bold select-none whitespace-nowrap"
          style={{ color: 'rgba(180,140,75,0.6)' }}
        >
          WhiskeyKeeper
        </span>
        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 text-[9px] uppercase tracking-wide font-semibold rounded-md px-2 py-1 transition-all duration-200 opacity-50 hover:opacity-100 active:opacity-100"
            style={{
              color: 'rgba(180,140,75,0.9)',
              border: '1px solid rgba(120,90,65,0.3)',
              background: 'rgba(100,70,45,0.15)',
            }}
          >
            <Share2 className="w-2.5 h-2.5" />
            Share
          </button>
        )}
      </div>
    </div>
  );
}

export function WhiskeyStoryCardModal({
  title,
  value,
  sub,
  accent,
  icon: Icon,
  onClose,
  onExport,
  storyRef,
  bottleImage,
  heroImage,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
        style={{
          background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <X className="w-5 h-5" />
      </button>

      <div
        ref={storyRef}
        onClick={(e) => e.stopPropagation()}
        className="relative overflow-hidden"
        style={{
          width: 'min(340px, 90vw)',
          height: 'min(560px, 85vh)',
          borderRadius: '16px',
          background:
            'linear-gradient(165deg, rgba(32, 22, 15, 0.98), rgba(42, 30, 20, 0.95))',
          border: '1px solid rgba(120, 90, 65, 0.4)',
          boxShadow:
            '0 4px 16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(180,140,100,0.1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {bottleImage && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${bottleImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(30px) brightness(0.3) saturate(0.65) sepia(0.25)',
              opacity: 0.95,
              transform: 'scale(1.12)',
            }}
          />
        )}

        {heroImage && (
          <div
            className="absolute left-0 right-0 pointer-events-none overflow-hidden"
            style={{ top: '28%', bottom: '18%' }}
          >
            <img
              src={heroImage}
              alt=""
              loading="lazy"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%) rotate(8deg)',
                height: '105%',
                maxWidth: 'none',
                width: 'auto',
                objectFit: 'contain',
                filter:
                  'drop-shadow(0 0 20px rgba(180,140,75,0.4)) drop-shadow(0 8px 24px rgba(0,0,0,0.7))',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(28,18,10,1) 0%, rgba(28,18,10,0.2) 18%, transparent 40%, rgba(28,18,10,0.2) 78%, rgba(20,12,8,0.90) 100%)',
              }}
            />
          </div>
        )}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: bottleImage
              ? 'linear-gradient(165deg, rgba(28,18,10,0.92) 0%, rgba(28,18,10,0.70) 30%, rgba(28,18,10,0.35) 60%, transparent 90%)'
              : 'linear-gradient(165deg, rgba(32,22,15,0.85) 0%, rgba(35,24,16,0.65) 30%, rgba(40,28,18,0.3) 70%, transparent 100%)',
          }}
        />

        <BottleTexture accent={accent} uid="story" />

        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-60px',
            right: '-60px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(180,140,75,0.2) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-40px',
            left: '-40px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(180,140,75,0.15) 0%, transparent 65%)',
          }}
        />

        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(180,140,75,0.6) 50%, transparent 100%)',
            boxShadow: '0 0 6px rgba(180,140,75,0.4)',
          }}
        />

        <div className="relative flex items-center justify-between px-7 pt-7 pb-0">
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-bold whitespace-nowrap"
            style={{ color: 'rgba(180,140,75,0.7)' }}
          >
            WhiskeyKeeper
          </div>
          <div
            className="text-[9px] uppercase tracking-[0.14em] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(100,70,45,0.2)',
              border: '1px solid rgba(120,90,65,0.35)',
              color: 'rgba(180,140,75,0.9)',
            }}
          >
            Highlight
          </div>
        </div>

        <div
          className="relative flex flex-col items-center px-7 text-center gap-5"
          style={{
            justifyContent: heroImage ? 'flex-start' : 'center',
            flex: 1,
            paddingTop: heroImage ? '1.25rem' : undefined,
            paddingBottom: heroImage ? '0' : undefined,
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: heroImage ? '64px' : '90px',
              height: heroImage ? '64px' : '90px',
              borderRadius: '20px',
              background:
                'linear-gradient(135deg, rgba(100,70,45,0.5) 0%, rgba(80,55,35,0.6) 100%)',
              border: '1.5px solid rgba(120,90,65,0.5)',
              boxShadow:
                '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.2)',
            }}
          >
            <Icon
              style={{
                width: heroImage ? '30px' : '44px',
                height: heroImage ? '30px' : '44px',
                color: accent,
                filter: 'drop-shadow(0 0 8px rgba(180,140,75,0.7))',
              }}
            />
          </div>

          <div
            className="text-[11px] uppercase tracking-[0.22em] font-bold whitespace-nowrap"
            style={{
              color: 'rgba(180,140,75,0.85)',
              fontFamily: "'Georgia', serif",
            }}
          >
            {title}
          </div>

          <div
            className="font-extrabold leading-none tracking-tighter px-4"
            style={{
              fontSize: 'clamp(2.8rem, 11vw, 4.2rem)',
              color: '#F5F1E7',
              textShadow:
                '0 3px 12px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)',
              WebkitTextStroke: '0.4px rgba(255,255,255,0.08)',
              fontFamily: "'Georgia', serif",
              maxWidth: '100%',
              wordBreak: 'break-word',
              hyphens: 'auto',
            }}
          >
            {value ?? '—'}
          </div>

          {sub && (
            <div
              className="text-sm font-semibold leading-snug px-4"
              style={{
                color: 'rgba(180,140,75,0.8)',
                maxWidth: '90%',
              }}
            >
              {sub}
            </div>
          )}
        </div>

        <div
          className="relative flex items-center justify-center gap-3 px-7 pb-7 pt-4"
          style={{ borderTop: '1px solid rgba(120,90,65,0.25)' }}
        >
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background:
                'linear-gradient(135deg, rgba(180,140,75,1) 0%, rgba(160,120,65,1) 100%)',
              color: 'rgba(28,18,10,1)',
              boxShadow:
                '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
              border: '1px solid rgba(140,105,60,0.8)',
            }}
          >
            <Share2 className="w-4 h-4" />
            Share & Export
          </button>
        </div>
      </div>
    </div>
  );
}

export async function captureAndShareWhiskeyCard(node, filename) {
  const canvas = await html2canvas(node, {
    backgroundColor: '#0f0b08',
    scale: 3,
    useCORS: true,
    logging: false,
  });

  const dataUrl = canvas.toDataURL('image/png');

  if (navigator.share && navigator.canShare) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${filename}.png`, { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My WhiskeyKeeper Highlight',
        });
        return;
      }
    } catch (shareErr) {
      if (shareErr?.name === 'AbortError') return;
    }
  }

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}