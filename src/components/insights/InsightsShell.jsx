/**
 * Shared Insights Shell
 * Canonical layout used by all four module insights pages.
 * Provides: header, tab bar, KPI grid, and panel wrapper.
 */
import React from 'react';
import InsightHighlightCard from './InsightHighlightCard';

export { InsightHighlightCard };

// ── Page Shell ──────────────────────────────────────────────────────────────

export function InsightsPageShell({ children }) {
  return (
    <div className="space-y-6 text-[#F5F1E7]">
      {children}
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

export function InsightsHeader({ title, subtitle }) {
  return (
    <div>
      <h1
        className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 break-words"
        style={{
          color: '#F5F1E7',
          fontFamily: "'Georgia', serif",
          textShadow: '0 2px 6px rgba(0,0,0,0.7)',
        }}
      >
        {title}
      </h1>
      <p style={{ color: 'rgba(224,216,200,0.75)', fontSize: '0.9375rem' }}>
        {subtitle}
      </p>
    </div>
  );
}

// ── Tab Bar ──────────────────────────────────────────────────────────────────

export function InsightsTabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div
      className="flex gap-1 flex-wrap"
      style={{ borderBottom: '1px solid rgba(180,140,75,0.2)' }}
    >
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className="px-4 py-2 rounded-t-lg font-medium transition-all text-sm"
          style={{
            color: activeTab === key ? '#D4A574' : 'rgba(224,216,200,0.72)',
            background: activeTab === key ? 'rgba(180,140,75,0.13)' : 'transparent',
            borderBottom: activeTab === key ? '2px solid #D4A574' : '2px solid transparent',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── KPI Grid ─────────────────────────────────────────────────────────────────

export function InsightsKpiGrid({ children }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {children}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

export function InsightStatCard({ label, value, sub, icon: Icon, accent = '#D4A574' }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(180,140,75,0.18)',
      }}
    >
      {Icon && (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 self-start"
          style={{
            background: `${accent}22`,
            border: `1px solid ${accent}44`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      )}
      <div>
        <p
          className="text-xs uppercase tracking-wider font-semibold"
          style={{ color: 'rgba(224,216,200,0.62)' }}
        >
          {label}
        </p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: '#F5F1E7' }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.52)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Panel (tab content card) ─────────────────────────────────────────────────

export function InsightPanel({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(42,31,24,0.5), rgba(31,21,16,0.5))',
        border: '1px solid rgba(180,140,75,0.15)',
      }}
    >
      {children}
    </div>
  );
}

// ── Section Heading inside a panel ──────────────────────────────────────────

export function InsightSectionHeading({ children, accent }) {
  return (
    <h3
      className="text-base font-semibold mb-3"
      style={{ color: accent || '#F5F1E7', fontFamily: "'Georgia', serif" }}
    >
      {children}
    </h3>
  );
}

// ── Highlights Grid (3-col card row) ─────────────────────────────────────────

export function InsightsHighlightGrid({ children }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3" style={{ color: '#F5F1E7' }}>
        Collection Highlights
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

// ── Highlight Card ────────────────────────────────────────────────────────────
// Re-exported from the canonical shared component so all module Insights pages
// receive the same hero-style card (aspect-[3/2], photo BG, gradient, vignette).

export { InsightHighlightCard as InsightsHighlightCard };

// ── Empty State ───────────────────────────────────────────────────────────────

export function InsightsEmptyState({ message = 'No data yet. Add items to see insights.', icon: Icon }) {
  return (
    <div
      className="rounded-2xl p-12 text-center"
      style={{
        background: 'linear-gradient(145deg, rgba(38,22,12,0.65) 0%, rgba(25,15,10,0.9) 100%)',
        border: '1px solid rgba(140,105,65,0.18)',
      }}
    >
      {Icon && <Icon className="w-12 h-12 mx-auto mb-4 opacity-25" style={{ color: '#D4A574' }} />}
      <p className="text-lg font-semibold mb-2" style={{ color: '#F5F1E7' }}>
        No Insights Yet
      </p>
      <p style={{ color: 'rgba(224,216,200,0.6)', fontSize: '0.9375rem' }}>
        {message}
      </p>
    </div>
  );
}

// ── Session Calendar Panel ────────────────────────────────────────────────────

export function InsightsSessionPanel({ calendar, selectedDate, onSelectDate, dayRows, emptyLabel }) {
  // calendar is the <Calendar> JSX — passed as prop so parent controls modifiers
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div
        className="rounded-2xl p-3"
        style={{ border: '1px solid rgba(180,140,75,0.2)', background: 'rgba(25,17,11,0.7)' }}
      >
        {calendar}
      </div>
      <div
        className="rounded-2xl p-5"
        style={{ border: '1px solid rgba(180,140,75,0.2)', background: 'rgba(25,17,11,0.7)' }}
      >
        <h2 className="text-lg font-semibold mb-3" style={{ color: '#F5F1E7' }}>
          {selectedDate}
        </h2>
        {dayRows.length === 0 ? (
          <p style={{ color: 'rgba(224,216,200,0.65)' }}>{emptyLabel || 'No sessions logged for this day.'}</p>
        ) : (
          <div className="space-y-3">
            {dayRows.map((row) => (
              <div
                key={row.id}
                className="rounded-xl p-3"
                style={{ border: '1px solid rgba(180,140,75,0.2)', background: 'rgba(255,255,255,0.03)' }}
              >
                <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>{row.itemLabel}</p>
                {row.rating != null && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(216,199,166,0.7)' }}>Rating: {row.rating}</p>
                )}
                {row.notes ? (
                  <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: 'rgba(224,216,200,0.85)' }}>
                    {row.notes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}