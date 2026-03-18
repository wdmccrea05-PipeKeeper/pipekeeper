import React from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      className="relative rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg"
      style={{
        background: backgroundImage 
          ? `linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${backgroundImage}) center/cover`
          : 'linear-gradient(135deg, rgba(42,30,20,0.95), rgba(28,18,12,0.98))',
        border: '1px solid rgba(180,140,75,0.25)',
        minHeight: '240px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      {/* Icon Badge */}
      <div 
        className="absolute top-4 left-4 w-12 h-12 rounded-xl flex items-center justify-center"
        style={{
          background: colors.bg,
          boxShadow: `0 4px 12px ${colors.bg}40`,
        }}
      >
        <span className="text-xl">{colors.icon}</span>
      </div>

      {/* Share Button */}
      {onShare && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare?.();
          }}
          className="absolute top-4 right-4 p-2 rounded-lg bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
          title="Share"
        >
          <Share2 className="w-4 h-4" style={{ color: '#D4A574' }} />
        </button>
      )}

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-4 pt-20">
        <div>
          <p 
            className="text-xs uppercase tracking-widest font-bold mb-2"
            style={{ color: colors.bg }}
          >
            {title}
          </p>
          <p 
            className="text-2xl font-bold leading-tight break-words"
            style={{ color: '#F5F1E7' }}
          >
            {value}
          </p>
          {subtitle && (
            <p 
              className="text-xs mt-2"
              style={{ color: 'rgba(224,216,200,0.65)' }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Module Badge */}
        <div className="flex items-center justify-between">
          <span 
            className="text-xs opacity-70"
            style={{ color: 'rgba(224,216,200,0.5)' }}
          >
            {module}
          </span>
          <Share2 
            className="w-3 h-3 opacity-40" 
            style={{ color: 'rgba(180,140,75,0.5)' }} 
          />
        </div>
      </div>
    </div>
  );
}