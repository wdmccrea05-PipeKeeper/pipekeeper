import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * ModuleRow — one compact, fully clickable row for a collection module.
 * Replaces large module cards: icon, name, one summary line, one chevron.
 */
export default function ModuleRow({ icon: Icon, image, accent = '#C89752', label, summary, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.03)]"
      style={{
        background: 'linear-gradient(145deg, rgba(39,27,18,0.9), rgba(24,17,11,0.96))',
        border: `1px solid ${accent}3D`,
        minHeight: 64,
      }}
    >
      <span
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: `${accent}1F`, border: `1px solid ${accent}44` }}
      >
        {image ? (
          <img src={image} alt="" className="w-7 h-7 object-contain" />
        ) : Icon ? (
          <Icon className="w-5 h-5" style={{ color: accent }} />
        ) : null}
      </span>
      <span className="flex-1 min-w-0">
        <span
          className="block text-base font-semibold truncate"
          style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
        >
          {label}
        </span>
        {summary ? (
          <span className="block text-xs mt-0.5 truncate" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {summary}
          </span>
        ) : null}
      </span>
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: accent }} />
    </button>
  );
}