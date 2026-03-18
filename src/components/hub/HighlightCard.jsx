import React from 'react';
import { Share2 } from 'lucide-react';

const ICON_COLORS = {
  pipe: { bg: '#C87941', icon: '🔥' },
  blend: { bg: '#4A9C6A', icon: '🍃' },
  bottle: { bg: '#E8A968', icon: '🥃' },
  value: { bg: '#D4A574', icon: '💎' },
};

export default function HighlightCard({ 
  icon = 'pipe',
  title, 
  value, 
  subtitle,
  backgroundImage,
  module = 'PIPEKEEPER',
  onShare
}) {
  const colors = ICON_COLORS[icon] || ICON_COLORS.pipe;
  
  return (
    <div
      className="relative rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl aspect-[3/2]"
      style={{
        border: '1px solid rgba(180,140,75,0.25)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        background: backgroundImage ? `url(${backgroundImage}) center/cover` : 'linear-gradient(135deg, rgba(60,40,25,0.9), rgba(40,25,15,0.95))',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Hero Spotlight Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 10%, ${colors.bg}30 0%, transparent 50%),
                      linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.8) 100%)`,
        }}
      />

      {/* Icon Badge */}
      <div 
        className="absolute top-4 left-4 w-12 h-12 rounded-xl flex items-center justify-center z-20"
        style={{
          background: colors.bg,
          boxShadow: `0 8px 20px ${colors.bg}60, inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}
      >
        <span className="text-xl">{colors.icon}</span>
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)',
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-5 z-10">
        <div></div>

        <div>
          <p 
            className="text-xs uppercase tracking-[0.15em] font-bold mb-2 drop-shadow-lg"
            style={{ color: colors.bg }}
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
            {value}
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

        {/* Module Badge */}
        <div className="flex items-center justify-between">
          <span 
            className="text-xs font-semibold drop-shadow-md"
            style={{ color: 'rgba(224,216,200,0.65)' }}
          >
            {module}
          </span>
          <Share2 
            className="w-3 h-3 opacity-50 drop-shadow-md" 
            style={{ color: 'rgba(180,140,75,0.7)' }} 
          />
        </div>
      </div>

      {/* Share Button */}
      {onShare && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare?.();
          }}
          className="absolute top-4 right-4 p-2 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-30"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          title="Share"
        >
          <Share2 className="w-4 h-4" style={{ color: '#D4A574' }} />
        </button>
      )}
    </div>
  );
}