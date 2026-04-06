import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * FormSection — collapsible accordion-style section for manual entry forms.
 *
 * Usage:
 *   <FormSection title="Identity" defaultOpen>
 *     ...fields...
 *   </FormSection>
 *
 *   <FormSection title="Construction" summary="Briar, 9mm filter">
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
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(180,140,75,0.18)',
      }}
    >
      {/* Header — always visible, click to toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{
          background: open ? 'rgba(180,140,75,0.08)' : 'transparent',
          borderBottom: open ? '1px solid rgba(180,140,75,0.15)' : 'none',
        }}
      >
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: open ? 'rgba(224,216,200,0.9)' : 'rgba(224,216,200,0.7)', fontFamily: "'Georgia', serif" }}
          >
            {title}
          </span>
          {!open && summary && (
            <span className="ml-3 text-xs truncate" style={{ color: 'rgba(224,216,200,0.45)' }}>
              {summary}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: 'rgba(180,140,75,0.7)' }} />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: 'rgba(180,140,75,0.5)' }} />
        )}
      </button>

      {/* Body — shown only when open */}
      {open && (
        <div className="px-4 py-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
