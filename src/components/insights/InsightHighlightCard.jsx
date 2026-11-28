import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

export default function InsightHighlightCard({
  title,
  value,
  subtitle,
  accent = '#D4A574',
  photo,
  photos = [],
  icon: Icon,
  onClick,
  className = '',
  objectMode = 'cover',
}) {
  const [failedUrls, setFailedUrls] = useState([]);
  const image = [...photos, photo].find((url) => typeof url === 'string' && url.trim() && !failedUrls.includes(url));
  const Card = onClick ? 'button' : 'div';
  const Placeholder = Icon || ImageOff;

  return (
    <Card
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`block w-full overflow-hidden rounded-2xl border bg-[#292c2e] text-left text-[#f7f6f2] shadow-md ${onClick ? 'hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2' : ''} ${className}`}
      style={{ borderColor: accent }}
    >
      <div className="relative aspect-[16/9] bg-[#34383a]">
        {image ? (
          <img
            key={image}
            src={image}
            alt=""
            loading="lazy"
            onError={() => setFailedUrls((failed) => [...failed, image])}
            className={`absolute inset-0 h-full w-full ${objectMode === 'contain' ? 'object-contain' : 'object-cover'}`}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-[#dfb77e]" aria-hidden="true">
            <Placeholder className="h-8 w-8" />
          </span>
        )}
      </div>
      <div className="space-y-1 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[#e0c99b]">{title}</p>
        <p className="break-words text-xl font-bold leading-tight" style={{ fontFamily: 'var(--ck-font-display)' }}>
          {value || '—'}
        </p>
        {subtitle && <p className="break-words text-sm text-[#e1e0da]">{subtitle}</p>}
      </div>
    </Card>
  );
}
