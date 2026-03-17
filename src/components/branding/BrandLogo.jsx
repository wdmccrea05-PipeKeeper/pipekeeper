import React from 'react';
import { cn } from '@/lib/utils';

const LOGO_URL = 'https://media.base44.com/images/public/694956e18d119cc497192525/b9b1fc2c7_CollectionKeeperUpdated.png';

/**
 * BrandLogo — single source of truth for CollectionKeeper branding.
 * Uses the official logo PNG. No fallbacks. No placeholders.
 *
 * Props:
 *   compact        — smaller size variant (nav / footer)
 *   showWordmark   — show "CollectionKeeper" text beside logo
 *   hoverable      — enable gold lift+glow hover effect (for nav/header use)
 *   className      — wrapper class
 *   imageClassName — override image size/class
 */
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
      className={cn('object-contain flex-shrink-0', sizeClass, imageClassName)}
      style={{
        background: 'transparent',
        transition: hoverable ? 'filter 0.25s ease, transform 0.25s ease' : undefined,
      }}
      draggable={false}
    />
  );

  if (!showWordmark) {
    return (
      <div
        className={cn('flex items-center', className)}
        style={hoverable ? { cursor: 'pointer' } : undefined}
        onMouseEnter={hoverable ? (e) => {
          const img = e.currentTarget.querySelector('img');
          if (img) {
            img.style.transform = 'translateY(-1px)';
            img.style.filter = 'drop-shadow(0 0 6px rgba(180,140,75,0.45))';
          }
        } : undefined}
        onMouseLeave={hoverable ? (e) => {
          const img = e.currentTarget.querySelector('img');
          if (img) {
            img.style.transform = '';
            img.style.filter = '';
          }
        } : undefined}
      >
        {logoNode}
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-center gap-2 min-w-0', className)}
      onMouseEnter={hoverable ? (e) => {
        const img = e.currentTarget.querySelector('img');
        if (img) {
          img.style.transform = 'translateY(-1px)';
          img.style.filter = 'drop-shadow(0 0 6px rgba(180,140,75,0.45))';
        }
      } : undefined}
      onMouseLeave={hoverable ? (e) => {
        const img = e.currentTarget.querySelector('img');
        if (img) {
          img.style.transform = '';
          img.style.filter = '';
        }
      } : undefined}
    >
      {logoNode}
      <span
        className="font-semibold whitespace-nowrap leading-none truncate"
        style={{
          color: '#F5F1E7',
          fontFamily: "'Georgia', serif",
          transition: hoverable ? 'text-shadow 0.25s ease' : undefined,
        }}
      >
        CollectionKeeper
      </span>
    </div>
  );
}