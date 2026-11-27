import React from 'react';

/**
 * PageHeader — the single, consistent header for every screen.
 * One title, one short subtitle, and at most a primary plus one secondary action.
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1
          className="text-2xl sm:text-3xl font-bold leading-tight"
          style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm mt-1 leading-relaxed" style={{ color: 'rgba(224,216,200,0.68)' }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div> : null}
    </header>
  );
}