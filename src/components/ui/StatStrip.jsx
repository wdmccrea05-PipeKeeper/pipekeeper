import React from 'react';

/**
 * StatStrip — a compact row of key numbers.
 * Replaces grids of individual stat cards: label and value only, tap to drill down.
 *
 * items: [{ label, value, onClick? }]
 */
export default function StatStrip({ items = [] }) {
  if (!items.length) return null;

  return (
    <div
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl"
      style={{ background: 'rgba(180,140,75,0.16)', border: '1px solid rgba(180,140,75,0.18)' }}
    >
      {items.map((item) => {
        const content = (
          <>
            <span
              className="block text-xl font-bold leading-none break-words"
              style={{ color: '#F5F1E7' }}
            >
              {item.value}
            </span>
            <span
              className="block text-[11px] uppercase tracking-[0.14em] mt-1.5"
              style={{ color: 'rgba(224,216,200,0.55)' }}
            >
              {item.label}
            </span>
          </>
        );

        if (item.onClick) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="text-left px-4 py-3.5 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
              style={{ background: 'rgba(29,21,17,0.92)', minHeight: 56 }}
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={item.label}
            className="px-4 py-3.5"
            style={{ background: 'rgba(29,21,17,0.92)', minHeight: 56 }}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}