import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import CuratorWorkspace from '@/components/curator/CuratorWorkspace';
import AdvancedDetails from '@/components/ui/AdvancedDetails';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { trackAppreciationFeatureUse } from '@/components/campaign/featureUsage';

const CURATOR_ICON = 'https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png';

// ─── Secondary surfaces — one conversation first, these on request ───────────

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

const ALL_VALID_KEYS = new Set(
  [...SURFACES_BASE, ...MULTI_MODULE_SURFACES, ...SURFACES_TAIL].map((s) => s.key)
);

export default function CuratorPage() {
  const { enabledModuleKeys } = useEnabledModules();
  const { t } = useTranslation();

  // Multi-module mode when 2+ modules are enabled
  const isMultiModuleMode = enabledModuleKeys.length >= 2;

  const SURFACES = useMemo(
    () =>
      [...SURFACES_BASE, ...(isMultiModuleMode ? MULTI_MODULE_SURFACES : []), ...SURFACES_TAIL].map(
        (surface) => ({ ...surface, label: t(surface.labelKey) })
      ),
    [isMultiModuleMode, t]
  );

  const tools = useMemo(() => SURFACES.filter((surface) => surface.key !== 'chat'), [SURFACES]);

  // Conversation is the default. Deep links (?surface=pairings) still work.
  const initialSurface = (() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('surface');
    return s && ALL_VALID_KEYS.has(s) ? s : 'chat';
  })();

  const [surface, setSurface] = useState(initialSurface);

  // If pairings is active but we switched to single-module mode, fall back to chat
  useEffect(() => {
    if (!isMultiModuleMode && surface === 'pairings') {
      setSurface('chat');
    }
  }, [isMultiModuleMode, surface]);

  // Campaign attribution: only recorded while a complimentary grant is live.
  useEffect(() => {
    trackAppreciationFeatureUse('curator_ai', 'cross_module');
  }, []);

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

  return (
    <div className="min-h-[100dvh] pt-[env(safe-area-inset-top)]" style={{ background: '#0B0B0C' }}>
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <header className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={CURATOR_ICON}
              alt=""
              aria-hidden="true"
              className="w-8 h-8 object-cover rounded shrink-0"
              style={{ filter: 'hue-rotate(35deg) saturate(0.8) brightness(1.1)' }}
            />
            <h1
              className="text-[22px] sm:text-[26px] leading-tight font-semibold truncate"
              style={{ color: '#F5F5F7', letterSpacing: '-0.4px' }}
            >
              {t('curatorPage.title')}
            </h1>
          </div>

          {surface !== 'chat' ? (
            <button
              type="button"
              onClick={() => setSurface('chat')}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 rounded-lg shrink-0"
              style={{ color: '#C6A15B', border: '1px solid rgba(198,161,91,0.28)', minHeight: 40 }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('curatorPage.backToChat')}
            </button>
          ) : null}
        </header>

        <CuratorWorkspace
          activeSurface={surface}
          onSurfaceChange={setSurface}
          onCountsChange={handleCountsChange}
        />

        {surface === 'chat' ? (
          <div className="mt-3">
            <AdvancedDetails label={t('curatorPage.moreTools')} hint={t('curatorPage.moreToolsHint')}>
              <div className="flex flex-wrap gap-2">
                {tools.map((tool) => {
                  const badge = counts[tool.key] || 0;
                  return (
                    <button
                      key={tool.key}
                      type="button"
                      onClick={() => setSurface(tool.key)}
                      className="inline-flex items-center gap-2 px-3 rounded-xl text-[13px] font-medium break-words"
                      style={{
                        border: '1px solid rgba(180,140,75,0.24)',
                        color: '#E0D8C8',
                        background: 'rgba(255,255,255,0.02)',
                        minHeight: 44,
                      }}
                    >
                      {tool.label}
                      {badge > 0 ? (
                        <span
                          className="min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] inline-flex items-center justify-center"
                          style={{ background: 'rgba(198,161,91,0.22)', color: '#E8D3A8' }}
                        >
                          {badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </AdvancedDetails>
          </div>
        ) : null}
      </div>
    </div>
  );
}