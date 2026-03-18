import React from 'react';
import { cn } from '@/lib/utils';

const LOGO_URL = 'https://media.base44.com/images/public/694956e18d119cc497192525/b9b1fc2c7_CollectionKeeperUpdated.png';

export default function BrandLogo({
  className,
  imageClassName,
  showWordmark = true,
  compact = false,
  hoverable = false,
}) {
  const sizeClass = compact ? 'w-8 h-8' : 'w-12 h-12';

  const logoNode = (
    <img
      src={LOGO_URL}
      alt="CollectionKeeper"
      className={cn(
        'object-contain flex-shrink-0 bg-transparent select-none',
        sizeClass,
        imageClassName
      )}
      style={{
        backgroundColor: 'transparent',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
        transition: 'filter 0.25s ease, transform 0.25s ease',
      }}
      draggable={false}
    />
  );

  const handleEnter = hoverable
    ? (e) => {
        const img = e.currentTarget.querySelector('img');
        if (img) {
          img.style.transform = 'translateY(-1px)';
          img.style.filter =
            'drop-shadow(0 4px 10px rgba(0,0,0,0.35)) drop-shadow(0 0 8px rgba(180,140,75,0.28))';
        }
      }
    : undefined;

  const handleLeave = hoverable
    ? (e) => {
        const img = e.currentTarget.querySelector('img');
        if (img) {
          img.style.transform = '';
          img.style.filter = 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))';
        }
      }
    : undefined;

  if (!showWordmark) {
    return (
      <div
        className={cn('flex items-center bg-transparent', className)}
        style={hoverable ? { cursor: 'pointer' } : undefined}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {logoNode}
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-center gap-2 min-w-0 bg-transparent', className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {logoNode}
      <span
        className="font-semibold whitespace-nowrap leading-none truncate"
        style={{
          color: '#F5F1E7',
          fontFamily: "'Georgia', serif",
        }}
      >
        CollectionKeeper
      </span>
    </div>
  );
}