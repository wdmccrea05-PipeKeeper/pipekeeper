/**
 * ModuleAnalyticsSection — progressive disclosure for the analytical widgets on a
 * module homepage. Collapsed by default, so a collector lands on metrics,
 * shortcuts and highlights rather than a wall of analysis.
 */
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ModuleAnalyticsSection({
  title,
  description,
  children,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className="rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(180,140,75,0.18)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        style={{ minHeight: 48 }}
      >
        <span className="min-w-0">
          <span
            className="block text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'rgba(180,140,75,0.8)' }}
          >
            {title}
          </span>
          {description && (
            <span className="block text-xs mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
              {description}
            </span>
          )}
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform"
          style={{
            color: 'rgba(180,140,75,0.8)',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>

      {open && <div className="px-3 pb-3 sm:px-4 sm:pb-4">{children}</div>}
    </section>
  );
}