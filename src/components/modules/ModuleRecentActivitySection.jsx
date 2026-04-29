/**
 * ModuleRecentActivitySection — shared recent-activity wrapper used by module homepages.
 *
 * Provides a consistent section heading above any recent-activity content
 * (e.g. recent tastings, recent sessions, humidor alerts) so all modules
 * use the same heading typography and spacing.
 *
 * Props:
 *   title     string      — section heading text (e.g. "Recent Tastings")
 *   accent    string      — heading colour (defaults to gold)
 *   children  ReactNode   — activity rows / cards rendered inside
 */
import React from 'react';

export default function ModuleRecentActivitySection({ title, accent, children }) {
  if (!children) return null;

  return (
    <div>
      <h2
        className="text-xs font-semibold uppercase tracking-[0.14em] mb-4"
        style={{ color: accent || 'rgba(180,140,75,0.8)' }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
