import React, { useMemo, useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import CuratorPairingResults from '@/components/curator/CuratorPairingResults';
import { useTranslation } from '@/components/i18n/safeTranslation';

const PAIRING_MODES = [
  {
    key: 'whiskey_cigar',
    label: 'Whiskey + Cigar',
    empty: 'No whiskey + cigar pairings available yet.',
    needs: {
      liquidModule: 'whiskeykeeper',
      liquidInventory: 'bottles',
      smokeModule: 'cigarkeeper',
      smokeInventory: ['cigars'],
    },
  },
  {
    key: 'whiskey_pipe_session',
    label: 'Whiskey + Pipe Session',
    empty: 'No whiskey + pipe session pairings available yet.',
    needs: {
      liquidModule: 'whiskeykeeper',
      liquidInventory: 'bottles',
      smokeModule: 'pipekeeper',
      smokeInventory: ['pipes', 'blends'],
    },
  },
  {
    key: 'wine_cigar',
    label: 'Wine + Cigar',
    empty: 'No wine + cigar pairings available yet.',
    needs: {
      liquidModule: 'winekeeper',
      liquidInventory: 'wines',
      smokeModule: 'cigarkeeper',
      smokeInventory: ['cigars'],
    },
  },
  {
    key: 'wine_pipe_session',
    label: 'Wine + Pipe Session',
    empty: 'No wine + pipe session pairings available yet.',
    needs: {
      liquidModule: 'winekeeper',
      liquidInventory: 'wines',
      smokeModule: 'pipekeeper',
      smokeInventory: ['pipes', 'blends'],
    },
  },
];

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function groupPairings(pairings = []) {
  return pairings.reduce((acc, pairing) => {
    const key = normalizeKey(pairing?.pairingFamily || pairing?.subTab || pairing?.tab || pairing?.group);
    if (!key) return acc;
    acc[key] = acc[key] || [];
    acc[key].push(pairing);
    return acc;
  }, {});
}

function isModeAvailable(mode, activeModules = {}, collectionStats = {}) {
  const hasLiquidModule = activeModules?.[mode.needs.liquidModule] === true;
  const hasLiquidInventory = Number(collectionStats?.[mode.needs.liquidInventory] || 0) > 0;
  const hasSmokeModule = activeModules?.[mode.needs.smokeModule] === true;
  const smokeRequirements = mode.needs.smokeInventory || [];
  const hasSmokeInventory = smokeRequirements.every((key) => Number(collectionStats?.[key] || 0) > 0);

  if (!hasLiquidModule || !hasLiquidInventory) return false;

  return hasSmokeModule && hasSmokeInventory;
}

function ModeButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 px-5 rounded-full text-[15px] font-medium"
      style={{
        background: active ? '#C6A15B' : 'transparent',
        color: active ? '#0B0B0C' : '#D8D0C2',
        border: active ? '1px solid #C6A15B' : '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {label}
    </button>
  );
}

export default function CuratorPairingsTab({
  pairings = [],
  onAction,
  onRefresh,
  isRefreshing = false,
  activeModules = {},
  collectionStats = {},
}) {
  const { t } = useTranslation();
  const grouped = useMemo(() => groupPairings(pairings), [pairings]);

  const availableModes = useMemo(
    () => PAIRING_MODES.filter((mode) => isModeAvailable(mode, activeModules, collectionStats)),
    [activeModules, collectionStats]
  );

  const [activeMode, setActiveMode] = useState(availableModes[0]?.key || null);

  useEffect(() => {
    if (!availableModes.length) {
      setActiveMode(null);
      return;
    }

    if (activeMode && availableModes.some((mode) => mode.key === activeMode)) return;

    setActiveMode(availableModes[0].key);
  }, [activeMode, availableModes]);

  const activePairings = activeMode ? (grouped[activeMode] || []) : [];
  const activeModeMeta = availableModes.find((mode) => mode.key === activeMode);

  if (!availableModes.length) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-[20px] font-semibold mb-2" style={{ color: '#F5F5F7' }}>{t("auto.components_curator_CuratorPairingsTab.pairings_xdq25e")}</h2>
          <p className="text-[16px]" style={{ color: '#A1A1AA' }}>
            {t("auto.components_curator_CuratorPairingsTab.pairings_appear_when_you_have_matching_kfv6hw")}
          </p>
        </div>
        <div className="py-14 text-center rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-[18px] mb-2" style={{ color: '#A1A1AA' }}>{t("auto.components_curator_CuratorPairingsTab.no_pairing_modes_are_currently_available_1ik3n8")}</div>
          <div className="text-[14px]" style={{ color: '#6F6F78' }}>
            {t("auto.components_curator_CuratorPairingsTab.add_inventory_in_the_required_modules_1kk237")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-semibold mb-2" style={{ color: '#F5F5F7' }}>{t("auto.components_curator_CuratorPairingsTab.pairings_xdq25e")}</h2>
          <p className="text-[16px]" style={{ color: '#A1A1AA' }}>
            {t("auto.components_curator_CuratorPairingsTab.choose_your_session_family_liquid_cigar_1hu5cp")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRefresh?.()}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl font-medium"
          style={{
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#D8D0C2',
            opacity: isRefreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t("auto.components_curator_CuratorPairingsTab.new_pairings_lhhwuk")}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {availableModes.map((mode) => (
          <ModeButton
            key={mode.key}
            label={mode.label}
            active={activeMode === mode.key}
            onClick={() => setActiveMode(mode.key)}
          />
        ))}
      </div>

      {isRefreshing ? (
        <div className="py-16 text-center">
          <div className="text-[18px]" style={{ color: '#A1A1AA' }}>{t("auto.components_curator_CuratorPairingsTab.loading_pairings_h69jfq")}</div>
        </div>
      ) : activePairings.length > 0 ? (
        <CuratorPairingResults pairings={activePairings} onAction={onAction} />
      ) : (
        <div className="py-20 text-center">
          <div className="text-[18px] mb-2" style={{ color: '#A1A1AA' }}>{activeModeMeta?.empty || 'No pairings available yet.'}</div>
          <div className="text-[15px]" style={{ color: '#6F6F78' }}>
            {t("auto.components_curator_CuratorPairingsTab.add_more_eligible_inventory_to_strengthen_wqvp9f")}
          </div>
        </div>
      )}
    </div>
  );
}
