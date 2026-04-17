import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useNavigate } from '@/components/utils/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import LogSessionSelector from '@/components/session/LogSessionSelector';
import {
  ChevronRight,
  Leaf,
  Flame,
  Clock3,
  Activity,
  TrendingUp,
  GlassWater,
  Cigarette,
} from 'lucide-react';
import WhiskeyKeeperIcon from '@/components/icons/WhiskeyKeeperIcon';
import PipeIcon from '@/components/icons/PipeIcon';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';
import BrandLogo from '@/components/branding/BrandLogo';
import CatalogPlate from '@/components/home/CatalogPlate';
import { getPipeValue } from '@/components/keeper-core/value/valueAggregation';
import { buildUnifiedActivityFeed } from '@/components/utils/activityNormalizer';
import CollectionStoryCard from '@/components/hub/CollectionStoryCard';
import CombinedSessionModal from '@/components/session/CombinedSessionModal';
import SmokingLogEditor from '@/components/home/SmokingLogEditor';
import LogTastingModal from '@/components/whiskey/LogTastingModal';
import { useCurrency } from '@/lib/currency/useCurrency';
import CigarSessionModal from '@/components/cigars/CigarSessionModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { safeUpdate } from '@/components/utils/safeUpdate';
import QuickActions from '@/components/home/QuickActions';
import {
  selectWhiskeyMetrics,
  getBottleUnitValue as getBottleValue,
} from '@/lib/collection/whiskeySelectors';
import { selectTotalSticks, getCigarAvailableQuantity, getCigarUnitValue } from '@/lib/collection/cigarSelectors';
import { selectCellarValue as calculateTobaccoCollectionValue } from '@/lib/collection/tobaccoSelectors';
import { selectPipeCollectionValue } from '@/lib/collection/pipeSelectors';
import { buildHubHighlightCandidates } from '@/components/hub/highlightSelection';


const safe = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

const MODULE_META = {
  pipekeeper: {
    labelKey: 'hub.pipekeeper',
    route: 'PipeKeeper',
    accent: '#C89752',
    descriptionKey: 'hub.pipekeeperDescription',
    taglineKey: 'hub.pipekeeperTagline',
  },
  whiskeykeeper: {
    labelKey: 'hub.whiskeykeeper',
    route: 'WhiskeyKeeper',
    accent: '#B66565',
    descriptionKey: 'hub.whiskeyDescription',
    taglineKey: 'hub.whiskeyTagline',
  },
  winekeeper: {
    labelKey: 'hub.winekeeper',
    route: null,
    accent: '#8F6BAA',
    descriptionKey: 'hub.winekeeperDescription',
    taglineKey: 'hub.comingSoon',
  },
  cigarkeeper: {
    labelKey: 'hub.cigarkeeper',
    route: 'CigarKeeper',
    accent: '#8C6B3F',
    descriptionKey: 'hub.cigarkeeperDescription',
    taglineKey: 'hub.cigarkeeperTagline',
  },
};

function SectionTitle({ children, muted = false }) {
  return (
    <h2
      className="text-xs font-semibold uppercase tracking-[0.18em] px-1"
      style={{ color: muted ? 'rgba(224,216,200,0.34)' : '#8B6239' }}
    >
      {children}
    </h2>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent = '#C89752' }) {
  return (
    <div
      className="rounded-[22px] p-4 sm:p-5 min-h-[120px] sm:min-h-[132px] flex flex-col justify-between"
      style={{
        background: 'linear-gradient(145deg, rgba(39,27,18,0.96), rgba(25,17,11,0.98))',
        border: `1px solid ${accent}40`,
        boxShadow: '0 10px 26px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ background: `${accent}26`, border: `1px solid ${accent}55` }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div>
        <p
          className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-2"
          style={{ color: `${accent}D8` }}
        >
          {label}
        </p>
        <div
          className="text-xl sm:text-3xl font-bold leading-none break-words"
          style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
        >
          {value}
        </div>
        {sub ? (
          <p className="text-sm mt-2" style={{ color: 'rgba(224,216,200,0.68)' }}>
            {sub}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ModuleCard({ moduleKey, stats = [], onOpen }) {
  const meta = MODULE_META[moduleKey];
  const icon = MODULE_ICONS?.[moduleKey];
  const { t } = useTranslation();

  return (
    <div
      className="rounded-[26px] p-5 sm:p-6 flex flex-col gap-5"
      style={{
        background: `linear-gradient(145deg, ${meta.accent}18, rgba(26,18,12,0.98))`,
        border: `1px solid ${meta.accent}55`,
        boxShadow: `0 14px 36px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: `${meta.accent}22`, border: `1px solid ${meta.accent}44` }}
          >
            {icon ? (
              <img
                src={icon}
                alt={t(meta.labelKey)}
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain"
              />
            ) : moduleKey === 'pipekeeper' ? (
              <PipeIcon className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: meta.accent }} />
            ) : moduleKey === 'whiskeykeeper' ? (
              <WhiskeyKeeperIcon className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: meta.accent }} />
            ) : null}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className="text-xl sm:text-3xl font-bold leading-tight truncate"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              {t(meta.labelKey)}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: meta.accent }}>{t(meta.taglineKey)}</p>
          </div>
        </div>

        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: `${meta.accent}18`, border: `1px solid ${meta.accent}44` }}
        >
          <ChevronRight className="w-5 h-5" style={{ color: meta.accent }} />
        </div>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.82)' }}>
        {t(meta.descriptionKey)}
      </p>

      {stats.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 pt-4 border-t" style={{ borderColor: `${meta.accent}26` }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-xl sm:text-2xl font-bold break-words" style={{ color: '#F5F1E7' }}>
                {s.value}
              </div>
              <div className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.62)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-2xl py-3 text-sm font-semibold transition-all"
        style={{
          background: `linear-gradient(135deg, ${meta.accent}42, ${meta.accent}22)`,
          border: `1px solid ${meta.accent}58`,
          color: meta.accent,
        }}
      >
        {t('common.openModule', { module: t(meta.labelKey) })}
      </button>
    </div>
  );
}

function ExpandingSoonCard({ moduleKey }) {
  const meta = MODULE_META[moduleKey];
  const icon = MODULE_ICONS?.[moduleKey];
  const { t } = useTranslation();

  return (
    <div
      className="rounded-[24px] p-5 flex items-center gap-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        opacity: 0.82,
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${meta.accent}1C`, border: `1px solid ${meta.accent}30` }}
      >
        {icon ? (
          <img src={icon} alt={t(meta.labelKey)} className="w-10 h-10 object-contain opacity-70" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3
            className="text-xl font-bold"
            style={{ color: 'rgba(245,241,231,0.65)', fontFamily: "'Georgia', serif" }}
          >
            {t(meta.labelKey)}
          </h3>
          <span
            className="text-[11px] px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(224,216,200,0.5)',
            }}
          >
            {t('hub.comingSoon')}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.42)' }}>
          {t(meta.descriptionKey)}
        </p>
      </div>
      <Clock3 className="w-4 h-4 shrink-0" style={{ color: 'rgba(224,216,200,0.28)' }} />
    </div>
  );
}

export default function CollectionHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();

  const [showLogSelector, setShowLogSelector] = useState(false);
  const [showCombinedModal, setShowCombinedModal] = useState(false);
  const [editingSmokingLog, setEditingSmokingLog] = useState(null);
  const [editingTastingLog, setEditingTastingLog] = useState(null);
  const [editingCigarSession, setEditingCigarSession] = useState(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState(null);

  const updateLogMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate('SmokingLog', id, data, user?.email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-hub-dashboard'] });
      setEditingSmokingLog(null);
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (id) => base44.entities.SmokingLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-hub-dashboard'] });
      setEditingSmokingLog(null);
      setConfirmDeleteLog(null);
    },
  });

  const { enabledModuleKeys, enabled } = useEnabledModules();
  const whiskeyOpenable = enabled.whiskeykeeper;
  const pipekeeperOpenable = enabled.pipekeeper;
  const cigarOpenable = enabled.cigarkeeper;

  const { data, isLoading } = useQuery({
    queryKey: ['collection-hub-dashboard', user?.email, pipekeeperOpenable, whiskeyOpenable, cigarOpenable],
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const [pipes, blends, smokeLogs, bottles, tastings, cigars, cigarSessions, whiskeyInventory] = await Promise.all([
        pipekeeperOpenable
          ? base44.entities.Pipe.filter({ created_by: user.email }, '-updated_date', 500).catch(() => [])
          : Promise.resolve([]),
        pipekeeperOpenable
          ? base44.entities.TobaccoBlend.filter({ created_by: user.email }, '-updated_date', 500).catch(() => [])
          : Promise.resolve([]),
        pipekeeperOpenable
          ? base44.entities.SmokingLog.filter({ created_by: user.email }, '-date', 1000).catch(() => [])
          : Promise.resolve([]),
        whiskeyOpenable
          ? base44.entities.Bottle.filter({ created_by: user.email }, '-updated_date', 500).catch(() => [])
          : Promise.resolve([]),
        whiskeyOpenable
          ? base44.entities.TastingLog.filter({ created_by: user.email }, '-tasting_date', 250).catch(() => [])
          : Promise.resolve([]),
        cigarOpenable
          ? base44.entities.Cigar.filter({ created_by: user.email }, '-updated_date', 500).catch(() => [])
          : Promise.resolve([]),
        cigarOpenable
          ? base44.entities.CigarSession.filter({ created_by: user.email }, '-date', 250).catch(() => [])
          : Promise.resolve([]),
        whiskeyOpenable
          ? base44.entities.WhiskeyInventoryUnit.filter({ created_by: user.email }).catch(() => [])
          : Promise.resolve([]),
      ]);

      return { pipes, blends, smokeLogs, bottles, tastings, cigars, cigarSessions, whiskeyInventory };
    },
  });

  const pipes = pipekeeperOpenable ? data?.pipes || [] : [];
  const blends = pipekeeperOpenable ? data?.blends || [] : [];
  const smokeLogs = pipekeeperOpenable ? data?.smokeLogs || [] : [];
  const bottles = whiskeyOpenable ? data?.bottles || [] : [];
  const tastings = whiskeyOpenable ? data?.tastings || [] : [];
  const cigars = cigarOpenable ? data?.cigars || [] : [];
  const cigarSessions = cigarOpenable ? data?.cigarSessions || [] : [];
  const whiskeyInventory = whiskeyOpenable ? data?.whiskeyInventory || [] : [];

  // Canonical whiskey metrics via shared selector layer
  const whiskeyMetrics = useMemo(
    () => selectWhiskeyMetrics(bottles, whiskeyInventory, tastings),
    [bottles, whiskeyInventory, tastings]
  );

  const metrics = useMemo(() => {
    const pipeValue = pipekeeperOpenable
      ? selectPipeCollectionValue(pipes)
      : 0;
    const tobaccoValue = pipekeeperOpenable
      ? calculateTobaccoCollectionValue(blends)
      : 0;
    const whiskeyValue = whiskeyOpenable
      ? whiskeyMetrics.collection_value
      : 0;

    const totalValue = pipeValue + tobaccoValue + whiskeyValue;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const recentSmokeCount = smokeLogs.filter((log) => {
      const dt = new Date(log.date || log.created_date || 0).getTime();
      return Number.isFinite(dt) && dt >= weekAgo;
    }).length;

    const recentTastingCount = tastings.filter((log) => {
      const dt = new Date(log.tasting_date || log.date || log.created_date || 0).getTime();
      return Number.isFinite(dt) && dt >= weekAgo;
    }).length;

    const recentCigarSessionCount = cigarSessions.filter((log) => {
      const dt = new Date(log.date || log.created_date || 0).getTime();
      return Number.isFinite(dt) && dt >= weekAgo;
    }).length;

    const recentSessionsCount = recentSmokeCount + recentTastingCount + recentCigarSessionCount;

    const logsByPipe = smokeLogs.reduce((acc, log) => {
      if (log.pipe_id) acc[log.pipe_id] = (acc[log.pipe_id] || 0) + 1;
      return acc;
    }, {});

    const logsByBlend = smokeLogs.reduce((acc, log) => {
      if (log.blend_id) acc[log.blend_id] = (acc[log.blend_id] || 0) + 1;
      return acc;
    }, {});

    const logsByCigar = cigarSessions.reduce((acc, log) => {
      if (log.cigar_id) acc[log.cigar_id] = (acc[log.cigar_id] || 0) + 1;
      return acc;
    }, {});

    const mostSmokedPipe = pipekeeperOpenable
      ? [...pipes]
          .map((p) => ({ ...p, __count: logsByPipe[p.id] || 0 }))
          .sort((a, b) => b.__count - a.__count)
          .find((p) => p.__count > 0) || null
      : null;

    const favoriteBlend = pipekeeperOpenable
      ? [...blends]
          .map((b) => ({ ...b, __count: logsByBlend[b.id] || 0 }))
          .sort((a, b) => b.__count - a.__count)
          .find((b) => b.__count > 0) || null
      : null;

    const mostValuablePipe = pipekeeperOpenable
      ? [...pipes].sort((a, b) => Number(getPipeValue(b) || 0) - Number(getPipeValue(a) || 0))[0] || null
      : null;

    const mostValuableBottle = whiskeyOpenable
      ? [...bottles].sort((a, b) => Number(getBottleValue(b) || 0) - Number(getBottleValue(a) || 0))[0] || null
      : null;

    const mostSmokedCigar = cigarOpenable
      ? [...cigars]
          .map((c) => ({ ...c, __count: logsByCigar[c.id] || 0 }))
          .sort((a, b) => b.__count - a.__count)
          .find((c) => c.__count > 0) || null
      : null;

    const favoriteCigar = cigarOpenable
      ? [...cigars]
          .filter((c) => c?.is_favorite && getCigarAvailableQuantity(c) > 0)
          .sort((a, b) => (Number(b.rating || 0) - Number(a.rating || 0)) || ((logsByCigar[b.id] || 0) - (logsByCigar[a.id] || 0)))[0] || null
      : null;

    const topRatedCigar = cigarOpenable
      ? [...cigars]
          .filter((c) => Number(c?.rating || 0) >= 4 && getCigarAvailableQuantity(c) > 0)
          .sort((a, b) => (Number(b.rating || 0) - Number(a.rating || 0)) || ((logsByCigar[b.id] || 0) - (logsByCigar[a.id] || 0)))[0] || null
      : null;

    const highestValueCigar = cigarOpenable
      ? [...cigars]
          .map((c) => ({ ...c, __totalValue: getCigarUnitValue(c) * getCigarAvailableQuantity(c) }))
          .sort((a, b) => Number(b.__totalValue || 0) - Number(a.__totalValue || 0))
          .find((c) => Number(c.__totalValue || 0) > 0) || null
      : null;

    const humidorFavoriteCigar = cigarOpenable
      ? [...cigars]
          .filter((c) => c?.humidor_id && getCigarAvailableQuantity(c) > 0)
          .map((c) => ({ ...c, __usage: logsByCigar[c.id] || 0 }))
          .sort((a, b) => {
            const scoreA = (a.is_favorite ? 1000 : 0) + Number(a.rating || 0) * 100 + Number(a.__usage || 0) * 10;
            const scoreB = (b.is_favorite ? 1000 : 0) + Number(b.rating || 0) * 100 + Number(b.__usage || 0) * 10;
            return scoreB - scoreA;
          })[0] || null
      : null;

    const restockPriorityCigar = cigarOpenable
      ? [...cigars]
          .filter((c) => c?.restock_flag && getCigarAvailableQuantity(c) > 0 && getCigarAvailableQuantity(c) <= 2)
          .sort((a, b) => {
            const qtyA = getCigarAvailableQuantity(a);
            const qtyB = getCigarAvailableQuantity(b);
            if (qtyA !== qtyB) return qtyA - qtyB;
            return (logsByCigar[b.id] || 0) - (logsByCigar[a.id] || 0);
          })[0] || null
      : null;

    const cigarCrownJewel = cigarOpenable
      ? highestValueCigar
      : null;

    const recentActivity = buildUnifiedActivityFeed(smokeLogs, tastings, cigarSessions, { limit: 5 });

    // Cigar sticks: canonical selector (single-stick equivalents)
    const totalCigarSticks = selectTotalSticks(cigars);

    // Blend quantity: canonical selector (sum all container types)
    const totalBlendOz = blends.reduce((sum, b) => {
      const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
      return sum + n(b.tin_total_quantity_oz) + n(b.bulk_total_quantity_oz) + n(b.pouch_total_quantity_oz);
    }, 0);

    // Bottle count: via canonical whiskey selector (uses inventory units when available)
    const totalBottleCount = whiskeyMetrics.total_bottles;

    return {
      totalValue,
      recentSessionsCount,
      recentSmokeCount,
      recentTastingCount,
      recentCigarSessionCount,
      mostSmokedPipe,
      favoriteBlend,
      mostValuablePipe,
      mostValuableBottle,
      mostSmokedCigar,
      favoriteCigar,
      topRatedCigar,
      highestValueCigar,
      humidorFavoriteCigar,
      restockPriorityCigar,
      cigarCrownJewel,
      recentActivity,
      totalCigarSticks,
      totalBlendOz,
      totalBottleCount,
    };
  }, [pipes, blends, bottles, whiskeyInventory, smokeLogs, tastings, cigars, cigarSessions, pipekeeperOpenable, whiskeyOpenable, cigarOpenable, whiskeyMetrics]);

  const openableModuleKeys = (enabledModuleKeys || []).filter((k) => MODULE_META[k]?.route && k !== 'winekeeper');
  const expandingKeys = (enabledModuleKeys || []).filter((k) => MODULE_META[k] && !MODULE_META[k].route && k !== 'winekeeper');

  const totalBlendOzDisplay = isLoading ? '—' : (metrics.totalBlendOz % 1 === 0 ? String(metrics.totalBlendOz) : metrics.totalBlendOz.toFixed(1)) + ' oz';

  const pipeStats = [
    { label: t('hub.pipes'), value: isLoading ? '—' : pipes.length },
    { label: t('hub.blendTypesLabel'), value: isLoading ? '—' : blends.length },
    { label: t('hub.blendQtyLabel'), value: totalBlendOzDisplay },
  ];

  const whiskeyStats = [
    { label: t('hub.bottleTypes'), value: isLoading ? '—' : whiskeyMetrics.bottle_types },
    { label: t('hub.totalBottles'), value: isLoading ? '—' : whiskeyMetrics.total_bottles },
    { label: t('whiskey.collectionValue', 'Est. value'), value: isLoading ? '—' : formatFromBase(whiskeyMetrics.collection_value) },
  ];

  const cigarStats = [
    { label: t('hub.cigarTypesLabel'), value: isLoading ? '—' : cigars.length },
    { label: t('hub.sticksOwnedLabel'), value: isLoading ? '—' : metrics.totalCigarSticks },
    { label: t('hub.sessionsLoggedLabel'), value: isLoading ? '—' : cigarSessions.length },
  ];

  const topHighlights = useMemo(() => buildHubHighlightCandidates({
    pipekeeperOpenable,
    whiskeyOpenable,
    cigarOpenable,
    metrics,
    t,
    formatFromBase,
    getPipeValue,
    getBottleValue,
  }), [pipekeeperOpenable, whiskeyOpenable, cigarOpenable, metrics, t, formatFromBase]);

  const hasHighlights = topHighlights.length > 0;

  const handleOpenCombinedSessionFlow = () => {
    setShowLogSelector(false);
    setShowCombinedModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <section
        className="rounded-[28px] p-5 sm:p-8"
        style={{
          background: 'linear-gradient(145deg, rgba(35,24,16,0.94), rgba(22,15,10,0.98))',
          border: '1px solid rgba(180,140,75,0.16)',
          boxShadow: '0 18px 46px rgba(0,0,0,0.36)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <BrandLogo
            compact
            showWordmark={false}
            imageClassName="w-14 h-14 sm:w-20 sm:h-20 flex-shrink-0"
          />
          <div className="min-w-0">
            <h1
              className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              {t('hub.title')}
            </h1>
            <p
              className="text-sm sm:text-base lg:text-lg mt-1 sm:mt-2"
              style={{ color: 'rgba(224,216,200,0.78)' }}
            >
              {t('hub.hubDescription')}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>{t('hub.collectionSummary')}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            label={t('hub.totalValue')}
            value={isLoading ? '—' : formatFromBase(metrics.totalValue)}
            sub={t('hub.acrossActiveCollections')}
            accent="#C89752"
          />
          {pipekeeperOpenable ? (
            <StatCard
              icon={PipeIcon}
              label={t('hub.pipes')}
              value={isLoading ? '—' : pipes.length}
              sub={t('hub.pipeRecords')}
              accent="#B48C4B"
            />
          ) : null}
          {pipekeeperOpenable ? (
            <StatCard
              icon={Leaf}
              label={t('hub.blends')}
              value={isLoading ? '—' : blends.length}
              sub={isLoading ? '' : `${totalBlendOzDisplay} ${t('hub.blendTotal', 'total')}`}
              accent="#6E8A57"
            />
          ) : null}
          {pipekeeperOpenable || whiskeyOpenable || cigarOpenable ? (
            <StatCard
              icon={Flame}
              label={t('hub.recentSessions')}
              value={isLoading ? '—' : metrics.recentSessionsCount}
              sub={t('hub.sessionsThisWeek')}
              accent="#B56A5F"
            />
          ) : null}
          {whiskeyOpenable ? (
            <StatCard
              icon={WhiskeyKeeperIcon}
              label={t('hub.whiskey')}
              value={isLoading ? '—' : whiskeyMetrics.bottle_types}
              sub={isLoading ? '' : `${whiskeyMetrics.total_bottles} ${t('hub.bottlesOwnedLabel')}`}
              accent="#B66565"
            />
          ) : null}
          {whiskeyOpenable ? (
            <StatCard
              icon={GlassWater}
              label={t('hub.tastings')}
              value={isLoading ? '—' : tastings.length}
              sub={t('hub.tastingLogsLabel')}
              accent="#A35050"
            />
          ) : null}
          {cigarOpenable ? (
            <StatCard
              icon={Cigarette}
              label={t('hub.cigars')}
              value={isLoading ? '—' : cigars.length}
              sub={isLoading ? '' : `${metrics.totalCigarSticks} ${t('hub.sticksOwnedLabel')}`}
              accent="#8C6B3F"
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <QuickActions
          onLogSession={() => setShowLogSelector(true)}
          onIdentify={() => navigate('/PipeKeeper?action=identify')}
          onOptimize={() => {
            try {
              sessionStorage.setItem('pk_curator_context', JSON.stringify({ mode: 'optimize', scope: 'all_modules' }));
            } catch {}
            navigate(createPageUrl('Curator'));
          }}
          onAskCurator={() => navigate(createPageUrl('Curator?surface=chat'))}
          onWantList={() => navigate(createPageUrl('WantList'))}
        />
      </section>

      <LogSessionSelector
        isOpen={showLogSelector}
        onClose={() => setShowLogSelector(false)}
        pipeEnabled={pipekeeperOpenable}
        whiskeyEnabled={whiskeyOpenable}
        cigarEnabled={cigarOpenable}
        onSelectPipe={() => navigate('/PipeKeeper?action=log-smoke')}
        onSelectWhiskey={() => navigate('/Tastings?action=log')}
        onSelectCigar={() => navigate('/CigarKeeper')}
        onSelectCombined={handleOpenCombinedSessionFlow}
      />

      {openableModuleKeys.length > 0 ? (
        <section className="space-y-4">
          <SectionTitle>{t('hub.yourModules')}</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {openableModuleKeys.map((moduleKey) => (
              <ModuleCard
                key={moduleKey}
                moduleKey={moduleKey}
                stats={
                  moduleKey === 'pipekeeper'
                    ? pipeStats
                    : moduleKey === 'whiskeykeeper'
                    ? whiskeyStats
                    : moduleKey === 'cigarkeeper'
                    ? cigarStats
                    : []
                }
                onOpen={() => navigate(createPageUrl(MODULE_META[moduleKey].route))}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionTitle>{t('hub.collectionIntelligence')}</SectionTitle>
        <button
          type="button"
          onClick={() => navigate(createPageUrl('Curator'))}
          className="w-full rounded-[24px] p-5 sm:p-6 flex items-center justify-between gap-4 sm:gap-5 text-left"
          style={{
            background: 'linear-gradient(135deg, rgba(163,92,92,0.16), rgba(36,24,17,0.98))',
            border: '1px solid rgba(163,92,92,0.35)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(163,92,92,0.14)',
                border: '1px solid rgba(163,92,92,0.30)',
              }}
            >
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                <img
                  src="https://media.base44.com/images/public/694956e18d119cc497192525/0ece2e1f0_inappcurator.png"
                  className="w-full h-full object-cover"
                  alt={t('hub.curatorTitle')}
                />
              </div>
            </div>
            <div>
              <div
                className="text-2xl font-bold mb-1"
                style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
              >
                {t('hub.curatorTitle')}
              </div>
              <p className="text-base leading-relaxed" style={{ color: 'rgba(224,216,200,0.72)' }}>
                {t('hub.aiCuratorDescription')}
              </p>
            </div>
          </div>
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(163,92,92,0.22)',
              border: '1px solid rgba(163,92,92,0.38)',
            }}
          >
            <ChevronRight className="w-5 h-5" style={{ color: '#D47C7C' }} />
          </div>
        </button>
      </section>

      {hasHighlights ? (
        <section className="space-y-4">
          <SectionTitle>{t('hub.topHighlights')}</SectionTitle>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {topHighlights.map((card) => (
              <CatalogPlate
                key={card.id}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                heroImage={card.heroImage}
                bgImage={card.bgImage}
                accent={card.accent}
                onClick={() => navigate(card.route)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {metrics.recentActivity.length > 0 ? (
        <section className="space-y-4">
          <SectionTitle>{t('hub.recentActivity')}</SectionTitle>
          <div className="space-y-3">
            {metrics.recentActivity.map((activity) => {
              const rawSmokingLog = activity.type === 'session'
                ? smokeLogs.find(l => l.id === activity.id)
                : null;
              const rawTastingLog = activity.type === 'tasting'
                ? tastings.find(l => l.id === activity.id)
                : null;
              const rawCigarSession = activity.type === 'cigar_session'
                ? cigarSessions.find(l => l.id === activity.id)
                : null;
              const isCigar = activity.type === 'cigar_session';
              return (
              <div
                key={activity.id}
                className="w-full rounded-[22px] p-5 flex items-center gap-4"
                style={{
                  background: 'linear-gradient(145deg, rgba(40,28,18,0.92), rgba(24,17,11,0.98))',
                  border: `1px solid ${
                    activity.type === 'tasting'
                      ? 'rgba(182,101,101,0.24)'
                      : isCigar
                      ? 'rgba(140,107,63,0.24)'
                      : 'rgba(180,140,75,0.18)'
                  }`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      activity.type === 'tasting'
                        ? 'rgba(182,101,101,0.14)'
                        : isCigar
                        ? 'rgba(140,107,63,0.14)'
                        : 'rgba(180,140,75,0.14)',
                    border:
                      activity.type === 'tasting'
                        ? '1px solid rgba(182,101,101,0.24)'
                        : isCigar
                        ? '1px solid rgba(140,107,63,0.24)'
                        : '1px solid rgba(180,140,75,0.24)',
                  }}
                >
                  {activity.type === 'tasting' ? (
                    <WhiskeyKeeperIcon className="w-5 h-5" style={{ color: '#D47C7C' }} />
                  ) : isCigar ? (
                    <Cigarette className="w-5 h-5" style={{ color: '#C4956A' }} />
                  ) : (
                    <Activity className="w-5 h-5" style={{ color: '#D4A574' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-base font-bold break-words line-clamp-1"
                    style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
                  >
                    {activity.title}
                  </p>
                  <p className="text-sm mt-1 break-words line-clamp-1" style={{ color: 'rgba(224,216,200,0.7)' }}>
                    {activity.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {rawSmokingLog && (
                    <button
                      type="button"
                      onClick={() => setEditingSmokingLog(rawSmokingLog)}
                      className="text-sm px-3 py-1 rounded-lg"
                      style={{ background: 'rgba(180,140,75,0.15)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.25)' }}
                    >
                      {t('common.edit')}
                    </button>
                  )}
                  {rawTastingLog && (
                    <button
                      type="button"
                      onClick={() => setEditingTastingLog(rawTastingLog)}
                      className="text-sm px-3 py-1 rounded-lg"
                      style={{ background: 'rgba(182,101,101,0.15)', color: '#D47C7C', border: '1px solid rgba(182,101,101,0.25)' }}
                    >
                      {t('common.edit')}
                    </button>
                  )}
                  {rawCigarSession && (
                    <button
                      type="button"
                      onClick={() => setEditingCigarSession(rawCigarSession)}
                      className="text-sm px-3 py-1 rounded-lg"
                      style={{ background: 'rgba(140,107,63,0.15)', color: '#C4956A', border: '1px solid rgba(140,107,63,0.25)' }}
                    >
                      {t('common.edit')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(activity.destination)}
                    className="text-sm"
                    style={{ color: activity.type === 'tasting' ? '#D47C7C' : isCigar ? '#C4956A' : '#D4A574' }}
                  >
                    {t('common.view')}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionTitle>{t('hub.collectionStory')}</SectionTitle>
        <CollectionStoryCard />
      </section>

      {expandingKeys.length > 0 ? (
        <section className="space-y-4">
          <SectionTitle muted>{t('hub.comingSoon')}</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {expandingKeys.map((moduleKey) => (
              <ExpandingSoonCard key={moduleKey} moduleKey={moduleKey} />
            ))}
          </div>
        </section>
      ) : null}

      <CombinedSessionModal
        isOpen={showCombinedModal}
        onClose={() => setShowCombinedModal(false)}
        pipes={pipes}
        blends={blends}
        bottles={bottles}
        onSaved={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['collection-hub-dashboard'] }),
            queryClient.invalidateQueries({ queryKey: ['smokingLogs', user?.email] }),
          ]);
        }}
      />

      <Sheet open={!!editingSmokingLog} onOpenChange={(open) => !open && setEditingSmokingLog(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{t('hub.editSession')}</SheetTitle>
          </SheetHeader>
          {editingSmokingLog && (
            <SmokingLogEditor
              log={editingSmokingLog}
              pipes={pipes}
              blends={blends}
              onSave={async (data) => {
                await updateLogMutation.mutateAsync({ id: editingSmokingLog.id, data });
              }}
              onDelete={() => setConfirmDeleteLog(editingSmokingLog.id)}
              onCancel={() => setEditingSmokingLog(null)}
              isLoading={updateLogMutation.isPending || deleteLogMutation.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      {editingTastingLog && (
        <LogTastingModal
          isOpen={!!editingTastingLog}
          editLog={editingTastingLog}
          bottles={bottles}
          onClose={() => setEditingTastingLog(null)}
          onSaved={() => {
            setEditingTastingLog(null);
            queryClient.invalidateQueries({ queryKey: ['collection-hub-dashboard'] });
          }}
        />
      )}

      <CigarSessionModal
        isOpen={!!editingCigarSession}
        editSession={editingCigarSession}
        onClose={() => setEditingCigarSession(null)}
        onSessionSaved={() => {
          setEditingCigarSession(null);
          queryClient.invalidateQueries({ queryKey: ['collection-hub-dashboard'] });
        }}
      />

      <AlertDialog open={!!confirmDeleteLog} onOpenChange={(open) => !open && setConfirmDeleteLog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('hub.deleteSession')}</AlertDialogTitle>
            <AlertDialogDescription>{t('hub.deleteSessionConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => confirmDeleteLog && deleteLogMutation.mutate(confirmDeleteLog)}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
