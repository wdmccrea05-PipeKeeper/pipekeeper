import React, { useMemo, useState, useCallback, useEffect } from 'react';
import CuratorWorkspace from '@/components/curator/CuratorWorkspace';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';
import { useTranslation } from '@/components/i18n/safeTranslation';

const CURATOR_ICON = 'https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png';

// ─── Static surfaces (always present) ────────────────────────────────────────

const SURFACES_BASE = [
  { key: 'record_optimization', labelKey: 'curatorPage.surfaces.recordOptimization' },
  { key: 'collection_optimization', labelKey: 'curatorPage.surfaces.collectionOptimization' },
  { key: 'purchase_restock', labelKey: 'curatorPage.surfaces.purchaseRestock' },
  { key: 'plan_session', labelKey: 'curatorPage.surfaces.planSession' },
];

// These appear only when 2+ modules are active
const MULTI_MODULE_SURFACES = [
  { key: 'pairings', labelKey: 'curatorPage.surfaces.pairings' },
];

const SURFACES_TAIL = [
  { key: 'grow_expand', labelKey: 'curatorPage.surfaces.growExpand' },
  { key: 'chat', labelKey: 'curatorPage.surfaces.chat' },
];

// All valid surface keys (used for URL deep-link validation before SURFACES is computed)
const ALL_VALID_KEYS = new Set([
  ...SURFACES_BASE,
  ...MULTI_MODULE_SURFACES,
  ...SURFACES_TAIL,
].map((s) => s.key));

function SurfaceTab({ active, label, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-[50px] sm:h-[58px] px-4 sm:px-7 rounded-[14px] sm:rounded-[18px] inline-flex items-center gap-2 sm:gap-3 text-[13px] sm:text-[16px] font-medium transition whitespace-nowrap"
      style={{
        background: active ? 'rgba(198,161,91,0.18)' : 'transparent',
        color: active ? '#F5F5F7' : '#C8B898',
        border: active ? '1px solid rgba(198,161,91,0.35)' : '1px solid transparent',
      }}
    >
      <span>{label}</span>
      {typeof badge === 'number' && badge > 0 ? (
        <span
          className="min-w-[24px] h-[24px] px-2 rounded-full text-[12px] inline-flex items-center justify-center"
          style={{
            background: 'rgba(154,67,67,0.45)',
            color: '#F3C7C7',
            border: '1px solid rgba(154,67,67,0.28)',
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function CuratorPage() {
  const { enabledModuleKeys } = useEnabledModules();
  const { t } = useTranslation();

  // Multi-module mode when 2+ modules are enabled
  const isMultiModuleMode = enabledModuleKeys.length >= 2;

  // Build the active surfaces list depending on module mode
  const SURFACES = useMemo(() => {
    return [
      ...SURFACES_BASE,
      ...(isMultiModuleMode ? MULTI_MODULE_SURFACES : []),
      ...SURFACES_TAIL,
    ].map((surface) => ({
      ...surface,
      label: t(surface.labelKey),
    }));
  }, [isMultiModuleMode, t]);

  // Support URL deep-links like ?surface=pairings — validate against all known keys
  const initialSurface = (() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('surface');
    return s && ALL_VALID_KEYS.has(s) ? s : 'record_optimization';
  })();

  const [surface, setSurface] = useState(initialSurface);

  // If pairings is active but we switched to single-module mode, redirect to plan_session
  useEffect(() => {
    if (!isMultiModuleMode && surface === 'pairings') {
      setSurface('plan_session');
    }
  }, [isMultiModuleMode, surface]);

  const [counts, setCounts] = useState({
    record_optimization: 0,
    collection_optimization: 0,
    purchase_restock: 0,
    plan_session: 0,
    pairings: 0,
    grow_expand: 0,
    chat: 0,
  });

  const handleCountsChange = useCallback((nextCounts) => {
    setCounts((prev) => ({ ...prev, ...nextCounts }));
  }, []);

  const progressWidth = useMemo(() => {
    const index = SURFACES.findIndex((s) => s.key === surface);
    return `${((index + 1) / SURFACES.length) * 100}%`;
  }, [surface, SURFACES]);

  return (
    <div className="min-h-[100dvh] pt-[env(safe-area-inset-top)]" style={{ background: '#0B0B0C' }}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 py-4 sm:py-6 md:py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <img src={CURATOR_ICON} alt="" className="w-9 h-9 object-cover rounded" style={{ filter: 'hue-rotate(35deg) saturate(0.8) brightness(1.1)' }} aria-hidden="true" />
            <h1
              className="text-[32px] leading-none font-semibold"
              style={{ color: '#F5F5F7', letterSpacing: '-0.5px' }}
            >
              {t('curatorPage.title')}
            </h1>
          </div>
          <p className="text-[18px] leading-8" style={{ color: '#9C968C' }}>
            {t('curatorPage.description')}
          </p>
        </header>

        <div
          className="rounded-[22px] p-3 mb-9"
          style={{
            background: 'linear-gradient(145deg, rgba(23,23,26,0.92) 0%, rgba(17,17,19,0.92) 100%)',
            border: '1px solid rgba(140,105,65,0.16)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          }}
        >
          <div className="flex flex-wrap gap-3">
            {SURFACES.map((tab) => (
              <SurfaceTab
                key={tab.key}
                label={tab.label}
                badge={counts[tab.key]}
                active={surface === tab.key}
                onClick={() => setSurface(tab.key)}
              />
            ))}
          </div>

          <div
            className="h-[10px] rounded-full mt-3 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: progressWidth,
                background: 'linear-gradient(90deg, rgba(198,161,91,0.65) 0%, rgba(198,161,91,0.35) 100%)',
              }}
            />
          </div>
        </div>

        <CuratorWorkspace
          activeSurface={surface}
          onSurfaceChange={setSurface}
          onCountsChange={handleCountsChange}
        />
      </div>
    </div>
  );
}
