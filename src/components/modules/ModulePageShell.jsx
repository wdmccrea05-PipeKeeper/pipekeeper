/**
 * ModulePageShell — the shared homepage architecture for every module.
 *
 * PipeKeeper, CigarKeeper, WhiskeyKeeper and WineKeeper all render through this
 * shell so the page hierarchy never drifts again:
 *
 *   1. module name, icon and description
 *   2. module-specific navigation
 *   3. two to four summary metrics (each may drill into its records)
 *   4. primary collection shortcuts
 *   5. notices / modals (children)
 *   6. collection highlights
 *   7. optional analytics, behind progressive disclosure
 *   8. recent activity
 *
 * Props:
 *   title, subtitle, icon, accentColor, badge
 *   moduleNav    ReactNode
 *   stats        Array<{ label, value, onClick? }>
 *   actions      ReactNode
 *   highlights   ReactNode
 *   analytics    ReactNode  (collapsed by default)
 *   activity     ReactNode
 *   children     ReactNode  (notices and modals, rendered before highlights)
 *   isEmpty      bool
 *   emptyState   ReactNode
 */

import React from 'react';
import ComplimentaryProBanner from '@/components/subscription/ComplimentaryProBanner';
import AppreciationOfferCard from '@/components/campaign/AppreciationOfferCard';

function SectionLabel({ children, color }) {
  return (
    <h2
      className="text-xs font-semibold uppercase tracking-[0.14em]"
      style={{ color: color || '#6b4c29' }}
    >
      {children}
    </h2>
  );
}

function StatCard({ label, value, accent, onClick }) {
  const surface = {
    background: '#fbf5e9',
    border: '1px solid rgba(167,124,63,0.28)',
    minHeight: '80px',
  };

  const content = (
    <>
      <div
        className="text-2xl sm:text-3xl font-bold leading-none break-words"
        style={{ color: 'var(--ck-paper-action)' }}
      >
        {value}
      </div>
      <div
        className="text-[11px] uppercase tracking-[0.1em] font-medium mt-1"
        style={{ color: 'rgba(52,37,29,0.72)' }}
      >
        {label}
      </div>
    </>
  );

  if (!onClick) {
    return (
      <div className="rounded-2xl p-4 text-center flex flex-col justify-center gap-1" style={surface}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}`}
      className="rounded-2xl p-4 text-center flex flex-col justify-center gap-1 transition-all hover:brightness-110 active:scale-[0.99]"
      style={{ ...surface, cursor: 'pointer' }}
    >
      {content}
    </button>
  );
}

export function ModuleStatsGrid({ stats = [], accent = '#D4A574' }) {
  if (!stats.length) return null;
  const columns =
    stats.length === 1
      ? 'grid-cols-1'
      : stats.length === 2
        ? 'grid-cols-2'
        : stats.length === 3
          ? 'grid-cols-2 sm:grid-cols-3'
          : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className={`grid gap-3 ${columns}`}>
      {stats.map(({ label, value, onClick }) => (
        <StatCard key={label} label={label} value={value} accent={accent} onClick={onClick} />
      ))}
    </div>
  );
}

export function ModuleSectionTitle({ children, accent }) {
  return <SectionLabel color={accent}>{children}</SectionLabel>;
}

export default function ModulePageShell({
  title,
  subtitle,
  icon,
  accentColor = '#D4A574',
  badge,
  stats = [],
  moduleNav,
  actions,
  highlights,
  analytics,
  activity,
  children,
  isEmpty,
  emptyState,
}) {
  return (
    <div className="ck-paper-workspace ck-module-home space-y-6 sm:space-y-8">
      <ComplimentaryProBanner />
      <AppreciationOfferCard surface="module_dashboard" />

      {/* 1 — Module name, icon and description */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {icon && (
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: `${accentColor}26`,
                  border: `1px solid ${accentColor}45`,
                }}
              >
                {icon}
              </div>
            )}
            <h1
              className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight"
              style={{
                color: 'var(--ck-espresso)',
                fontFamily: 'var(--ck-font-display)',
              }}
            >
              {title}
            </h1>
            {badge && (
              <span
                className="text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider"
                style={{
                  background: `${accentColor}20`,
                  border: `1px solid ${accentColor}40`,
                  color: 'var(--ck-paper-action)',
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p
              className="text-sm sm:text-base sm:pl-14"
              style={{ color: 'rgba(52,37,29,0.72)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* 2 — Module navigation */}
      {moduleNav && <div className="ck-module-nav-surface min-w-0">{moduleNav}</div>}

      {/* 3 — Summary metrics */}
      {stats.length > 0 && <ModuleStatsGrid stats={stats} accent={accentColor} />}

      {/* 4 — Primary shortcuts stay available for empty collections too */}
      {actions && <div>{actions}</div>}

      {/* 5 — Notices and stateful overlays */}
      {children}

      {isEmpty ? (
        emptyState ? <div>{emptyState}</div> : null
      ) : (
        <>
          {/* 6 — Collection highlights */}
          {highlights}

          {/* 7 — Optional analytics */}
          {analytics}

          {/* 8 — Recent activity */}
          {activity}
        </>
      )}
    </div>
  );
}