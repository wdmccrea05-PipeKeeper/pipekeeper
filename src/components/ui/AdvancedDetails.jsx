import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * AdvancedDetails — progressive disclosure for secondary information.
 *
 * Everything essential stays on screen; methods, breakdowns and extra
 * detail live behind one quiet row. Collapsed by default.
 *
 *   <AdvancedDetails label={t('common.moreDetails')}>
 *     ...secondary content...
 *   </AdvancedDetails>
 */
export default function AdvancedDetails({ label, hint, defaultOpen = false, children, variant = 'dark' }) {
  const [open, setOpen] = useState(defaultOpen);
  const isPaper = variant === 'paper';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${isPaper ? 'rgba(167,124,63,0.28)' : 'rgba(180,140,75,0.16)'}`,
        background: isPaper ? '#fbf5e9' : 'rgba(255,255,255,0.02)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        style={{ minHeight: 44 }}
      >
        <span className="text-sm font-semibold min-w-0" style={{ color: isPaper ? 'var(--ck-espresso)' : 'rgba(224,216,200,0.85)' }}>
          {label}
          {!open && hint ? (
            <span className="ml-2 text-xs font-normal" style={{ color: isPaper ? 'rgba(52,37,29,0.72)' : 'rgba(224,216,200,0.42)' }}>
              {hint}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform duration-200"
          style={{
            color: isPaper ? 'var(--ck-antique-brass)' : 'rgba(180,140,75,0.7)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {open ? <div className="px-4 pb-4 space-y-4">{children}</div> : null}
    </div>
  );
}