/**
 * ModulePageShell — unified module landing page layout system.
 *
 * Used by PipeKeeper, WhiskeyKeeper, CigarKeeper, WineKeeper.
 *
 * Props:
 *   title          string
 *   subtitle       string
 *   icon           ReactNode  (icon element already rendered)
 *   accentColor    string     (hex)
 *   onBackToHub    fn
 *   badge          string|null  e.g. "Beta", "Internal", "Pro"
 *   stats          Array<{ label, value }>  — 4 items recommended
 *   moduleNav      ReactNode  (module-specific nav bar)
 *   actions        ReactNode  (ModuleQuickLaunch or custom grid)
 *   children       ReactNode  (smart content section: highlights, alerts, activity)
 *   isEmpty        bool
 *   emptyState     ReactNode
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';

function SectionLabel({ children, color }) {
  return (
    <h2
      className="text-xs font-semibold uppercase tracking-[0.14em]"
      style={{ color: color || 'rgba(180,140,75,0.8)' }}
    >
      {children}
    </h2>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div
      className="rounded-2xl p-4 text-center flex flex-col justify-center gap-1"
      style={{
        background: `${accent}12`,
        border: `1px solid ${accent}30`,
        minHeight: '80px',
      }}
    >
      <div
        className="text-2xl sm:text-3xl font-bold leading-none break-words"
        style={{ color: accent }}
      >
        {value}
      </div>
      <div
        className="text-[11px] uppercase tracking-[0.1em] font-medium mt-1"
        style={{ color: 'rgba(224,216,200,0.6)' }}
      >
        {label}
      </div>
    </div>
  );
}

export function ModuleStatsGrid({ stats = [], accent = '#D4A574' }) {
  if (!stats.length) return null;
  return (
    <div className={`grid gap-3 ${stats.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
      {stats.map(({ label, value }) => (
        <StatCard key={label} label={label} value={value} accent={accent} />
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
  onBackToHub,
  badge,
  stats = [],
  moduleNav,
  actions,
  children,
  isEmpty,
  emptyState,
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {/* Icon */}
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
            {/* Title */}
            <h1
              className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight"
              style={{
                color: '#F5F1E7',
                fontFamily: "'Georgia', serif",
                textShadow: '0 2px 6px rgba(0,0,0,0.6)',
              }}
            >
              {title}
            </h1>
            {/* Badge */}
            {badge && (
              <span
                className="text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider"
                style={{
                  background: `${accentColor}20`,
                  border: `1px solid ${accentColor}40`,
                  color: accentColor,
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p
              className="text-sm sm:text-base sm:pl-14"
              style={{ color: 'rgba(224,216,200,0.75)' }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {onBackToHub && (
          <Button
            onClick={onBackToHub}
            variant="outline"
            size="sm"
            className="shrink-0 text-sm"
          >
            {t('common.backToHub')}
          </Button>
        )}
      </div>

      {/* ── Module Nav ── */}
      {moduleNav && <div>{moduleNav}</div>}

      {/* ── Stats ── */}
      {stats.length > 0 && (
        <ModuleStatsGrid stats={stats} accent={accentColor} />
      )}

      {/* ── Actions ── */}
      {actions && <div>{actions}</div>}

      {/* ── Smart Content / Empty State ── */}
      {isEmpty ? (
        emptyState ? (
          <div>{emptyState}</div>
        ) : null
      ) : (
        children
      )}
    </div>
  );
}