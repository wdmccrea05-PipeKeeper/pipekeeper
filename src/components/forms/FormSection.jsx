import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * FormSection — collapsible accordion-style section for manual entry forms.
 *
 * Usage:
 *   <FormSection title={t('form.identity')} defaultOpen>
 *     ...fields...
 *   </FormSection>
 *
 *   <FormSection title={t('form.construction')} summary="Briar, 9mm filter">
 *     ...fields...
 *   </FormSection>
 *
 * Props:
 *   title        — section heading string
 *   summary      — short summary shown when collapsed (optional)
 *   defaultOpen  — open by default (boolean, default false)
 *   children     — section body content
 */
export default function FormSection({ title, summary, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: open ? 'rgba(42,30,22,0.55)' : 'rgba(30,22,16,0.4)',
        border: `1px solid ${open ? 'rgba(180,140,75,0.22)' : 'rgba(180,140,75,0.13)'}`,
        transition: 'background 0.18s ease, border-color 0.18s ease',
      }}
    >
      {/* Header — always visible, click to toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        style={{
          borderBottom: open ? '1px solid rgba(180,140,75,0.15)' : 'none',
          minHeight: '3rem',
        }}
      >
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: open ? 'rgba(212,165,116,0.95)' : 'rgba(212,165,116,0.65)' }}
          >
            {title}
          </span>
          {!open && summary && (
            <span
              className="text-xs truncate max-w-[200px] sm:max-w-xs"
              style={{ color: 'rgba(224,216,200,0.38)' }}
            >
              {summary}
            </span>
          )}
        </div>
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 ml-2 transition-transform duration-200"
          style={{
            color: open ? 'rgba(180,140,75,0.8)' : 'rgba(180,140,75,0.4)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </button>

      {/* Body — shown only when open */}
      {open && (
        <div className="px-5 py-5 space-y-5">
          {children}
        </div>
      )}
    </div>
  );
}
