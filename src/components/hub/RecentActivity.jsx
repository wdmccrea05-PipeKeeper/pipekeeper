import React from 'react';
import { Activity, GlassWater, ChevronRight } from 'lucide-react';

export default function RecentActivity({ items = [], onSelect }) {
  if (!items.length) return null;

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isWhiskey = item.type === 'tasting';
        const Icon = isWhiskey ? GlassWater : Activity;
        const accent = isWhiskey ? '#B66565' : '#D4A574';

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item)}
            className="w-full rounded-[22px] p-4 flex items-center gap-4 text-left"
            style={{
              background: 'linear-gradient(145deg, rgba(40,28,18,0.92), rgba(24,17,11,0.98))',
              border: `1px solid ${accent}33`,
            }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${accent}20`, border: `1px solid ${accent}3D` }}
            >
              <Icon className="w-5 h-5" style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold truncate" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
                {item.title}
              </p>
              <p className="text-sm mt-1 truncate" style={{ color: 'rgba(224,216,200,0.7)' }}>
                {item.subtitle}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: accent }} />
          </button>
        );
      })}
    </div>
  );
}
