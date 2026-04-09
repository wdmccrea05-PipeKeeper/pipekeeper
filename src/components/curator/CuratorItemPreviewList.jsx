/**
 * CuratorItemPreviewList
 *
 * Compact inline list of items for recommendation cards.
 * Shows up to `previewCount` items as chips, then "+N more".
 * Chips with a known record type are clickable/navigable.
 */

import React from 'react';

const TYPE_COLORS = {
  blend:   { bg: 'rgba(74,124,92,0.15)',   text: 'rgba(100,180,130,0.9)', border: 'rgba(74,124,92,0.3)' },
  tobacco: { bg: 'rgba(74,124,92,0.15)',   text: 'rgba(100,180,130,0.9)', border: 'rgba(74,124,92,0.3)' },
  pipe:    { bg: 'rgba(139,94,58,0.15)',   text: 'rgba(200,155,100,0.9)', border: 'rgba(139,94,58,0.3)' },
  bottle:  { bg: 'rgba(74,124,156,0.15)',  text: 'rgba(120,170,220,0.9)', border: 'rgba(74,124,156,0.3)' },
  whiskey: { bg: 'rgba(74,124,156,0.15)',  text: 'rgba(120,170,220,0.9)', border: 'rgba(74,124,156,0.3)' },
  cigar:   { bg: 'rgba(139,58,58,0.15)',   text: 'rgba(210,120,120,0.9)', border: 'rgba(139,58,58,0.3)' },
  default: { bg: 'rgba(80,80,80,0.12)',    text: 'rgba(180,180,180,0.85)', border: 'rgba(100,100,100,0.2)' },
};

function getTypeColors(recordType) {
  return TYPE_COLORS[recordType] || TYPE_COLORS.default;
}

function buildItemPath(item) {
  const rt = String(item?.recordType || '').toLowerCase();
  const id  = item?.recordId || item?.id;
  if (!id) return null;
  // Always navigate to exact record detail page — never module list/collection page
  if (rt === 'bottle' || rt === 'whiskey') return `/BottleDetail?id=${encodeURIComponent(id)}`;
  if (rt === 'blend'  || rt === 'tobacco') return `/TobaccoDetail?id=${encodeURIComponent(id)}`;
  if (rt === 'pipe')                       return `/PipeDetail?id=${encodeURIComponent(id)}`;
  return null;
}

/**
 * @param {object}   props
 * @param {object[]} props.items        - Full item list
 * @param {number}   [props.maxPreview=4] - Max items to show before "+N more"
 * @param {string}   [props.className]
 */
export default function CuratorItemPreviewList({ items = [], maxPreview = 4, className = '' }) {
  if (!items.length) return null;

  const preview = items.slice(0, maxPreview);
  const remaining = items.length - preview.length;

  return (
    <div className={`flex flex-wrap gap-1.5 items-center ${className}`}>
      {preview.map((item, idx) => {
        const name = item.recordName || item.itemName || item.name || 'Item';
        const type = item.recordType || item.type || 'default';
        const colors = getTypeColors(type);
        const path = buildItemPath(item);
        const chipStyle = {
          background: colors.bg,
          color:      colors.text,
          border:     `1px solid ${colors.border}`,
        };
        if (path) {
          return (
            <a
              key={item.id || item.recordId || idx}
              href={path}
              className="px-2 py-0.5 rounded text-[11px] font-medium leading-tight max-w-[140px] truncate"
              title={name}
              style={{ ...chipStyle, textDecoration: 'none', cursor: 'pointer' }}
            >
              {name}
            </a>
          );
        }
        return (
          <span
            key={item.id || item.recordId || idx}
            className="px-2 py-0.5 rounded text-[11px] font-medium leading-tight max-w-[140px] truncate"
            title={name}
            style={chipStyle}
          >
            {name}
          </span>
        );
      })}
      {remaining > 0 && (
        <span
          className="px-2 py-0.5 rounded text-[11px] font-medium"
          style={{
            background: 'rgba(255,255,255,0.05)',
            color:      'rgba(224,216,200,0.5)',
            border:     '1px solid rgba(140,105,65,0.15)',
          }}
        >
          +{remaining} more
        </span>
      )}
    </div>
  );
}