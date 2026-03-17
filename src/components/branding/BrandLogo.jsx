import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * BrandLogo
 * Uses a clean local transparent logo if available.
 * Falls back to text-only branding instead of showing a broken checkerboard asset.
 *
 * Drop a real transparent file at:
 *   /public/logos/collectionkeeper-transparent.svg
 * or
 *   /public/logos/collectionkeeper-transparent.png
 */
const PRIMARY_LOGO = '/logos/collectionkeeper-transparent.svg';
const FALLBACK_LOGO = '/logos/collectionkeeper-transparent.png';

export default function BrandLogo({
  className,
  imageClassName,
  showWordmark = true,
  compact = false,
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const logoNode = !imgFailed ? (
    <img
      src={PRIMARY_LOGO}
      onError={(e) => {
        if (e.currentTarget.src.endsWith('.svg')) {
          e.currentTarget.src = FALLBACK_LOGO;
          return;
        }
        setImgFailed(true);
      }}
      alt="CollectionKeeper"
      className={cn('object-contain bg-transparent', compact ? 'w-8 h-8' : 'w-12 h-12', imageClassName)}
      style={{ background: 'transparent', mixBlendMode: 'normal' }}
      draggable={false}
    />
  ) : (
    <div
      className={cn(
        'rounded-lg border flex items-center justify-center text-[#F5F1E7] bg-[rgba(180,140,75,0.12)] border-[rgba(180,140,75,0.25)]',
        compact ? 'w-8 h-8 text-[10px] font-bold' : 'w-12 h-12 text-xs font-bold'
      )}
      aria-label="CollectionKeeper"
    >
      CK
    </div>
  );

  if (!showWordmark) {
    return <div className={className}>{logoNode}</div>;
  }

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      {logoNode}
      <span
        className="font-semibold text-[#F5F1E7] whitespace-nowrap leading-none"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        CollectionKeeper
      </span>
    </div>
  );
}