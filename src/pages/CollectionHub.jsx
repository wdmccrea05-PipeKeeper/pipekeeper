import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useNavigate } from '@/components/utils/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { countAttentionFindings } from '@/lib/actions/collectionFindings';
import { healthUrl } from '@/lib/navigation/returnTo';
import CollectionHealthRow from '@/components/hub/CollectionHealthRow';
import { Calendar } from '@/components/ui/calendar';
import { buildSessionCalendarData } from '@/lib/sessionHistory/calendarData';
import { toLocalDateYmd } from '@/components/utils/schemaCompatibility';
import LogSessionSelector from '@/components/session/LogSessionSelector';
import {
  ChevronRight,
  Flame,
  Activity,
  Cigarette,
  CalendarDays,
  List,
  Wine,
  FileBarChart2,
  Target,
} from 'lucide-react';
import WhiskeyKeeperIcon from '@/components/icons/WhiskeyKeeperIcon';
import PipeIcon from '@/components/icons/PipeIcon';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';
import ComplimentaryProBanner from '@/components/subscription/ComplimentaryProBanner';
import AppreciationBanner from '@/components/campaign/AppreciationBanner';
import AppreciationExpiredDialog from '@/components/campaign/AppreciationExpiredDialog';
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
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { safeUpdate } from '@/components/utils/safeUpdate';
import PageHeader from '@/components/ui/PageHeader';
import StatStrip from '@/components/ui/StatStrip';
import AdvancedDetails from '@/components/ui/AdvancedDetails';
import ModuleRow from '@/components/modules/ModuleRow';
import {
  selectWhiskeyMetrics,
  getBottleUnitValue as getBottleValue,
} from '@/lib/collection/whiskeySelectors';
import { selectTotalSticks, selectCigarCollectionValue, getCigarAvailableQuantity, getCigarUnitValue } from '@/lib/collection/cigarSelectors';
import { selectCellarValue as calculateTobaccoCollectionValue } from '@/lib/collection/tobaccoSelectors';
import { selectPipeCollectionValue } from '@/lib/collection/pipeSelectors';
import { selectWineCollectionValue, selectTotalWineBottles, getWineTotalValue, getWinePrimaryImage } from '@/lib/collection/wineSelectors';
import { buildHubHighlightCandidates } from '@/components/hub/highlightSelection';
import { fetchAllEntities } from '@/lib/base44/fetchAllEntities';


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
    route: 'WineKeeper',
    accent: '#8F6BAA',
    descriptionKey: 'hub.winekeeperDescription',
    taglineKey: 'hub.winekeeperTagline',
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
      style={{ color: muted ? 'var(--ck-paper-muted)' : 'var(--ck-paper-action)' }}
    >
      {children}
    </h2>
  );
}



export default function CollectionHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const [curatorIconFailed, setCuratorIconFailed] = useState(false);

  const [showLogSelector, setShowLogSelector] = useState(false);
  const [showCombinedModal, setShowCombinedModal] = useState(false);
  const [showWhiskeyCigarTasting, setShowWhiskeyCigarTasting] = useState(false);
  const [showWhiskeyCigarCigar, setShowWhiskeyCigarCigar] = useState(false);
  const [editingSmokingLog, setEditingSmokingLog] = useState(null);
  const [editingTastingLog, setEditingTastingLog] = useState(null);
  const [editingCigarSession, setEditingCigarSession] = useState(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState(null);
  const [activityView, setActivityView] = useState('list'); // 'list' | 'calendar'
  const [calSelectedDate, setCalSelectedDate] = useState(toLocalDateYmd(new Date()));

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

  const { enabledModuleKeys, enabled, isLoading: modulesLoading } = useEnabledModules();
  const whiskeyOpenable = enabled.whiskeykeeper;
  const pipekeeperOpenable = enabled.pipekeeper;
  const cigarOpenable = enabled.cigarkeeper;
  const wineOpenable = enabled.winekeeper;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['collection-hub-dashboard', user?.email],
    enabled: !!user?.email && !modulesLoading,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [
        pipes, blends, smokeLogs, bottles, tastings, cigars, cigarSessions,
        whiskeyInventory, wines, wineTastings
      ] = await Promise.all([
        pipekeeperOpenable
          ? fetchAllEntities(base44.entities.Pipe, { created_by: user.email }, '-updated_date', 5000, 200, 'CollectionHub:Pipe')
          : Promise.resolve([]),
        pipekeeperOpenable
          ? fetchAllEntities(base44.entities.TobaccoBlend, { created_by: user.email }, '-updated_date', 5000, 200, 'CollectionHub:TobaccoBlend')
          : Promise.resolve([]),
        pipekeeperOpenable
          ? fetchAllEntities(base44.entities.SmokingLog, { created_by: user.email }, '-date', 5000, 200, 'CollectionHub:SmokingLog')
          : Promise.resolve([]),
        whiskeyOpenable
          ? fetchAllEntities(base44.entities.Bottle, { created_by: user.email }, '-updated_date', 5000, 200, 'CollectionHub:Bottle')
          : Promise.resolve([]),
        whiskeyOpenable
          ? fetchAllEntities(base44.entities.TastingLog, { created_by: user.email }, '-tasting_date', 5000, 200, 'CollectionHub:TastingLog')
          : Promise.resolve([]),
        cigarOpenable
          ? fetchAllEntities(base44.entities.Cigar, { created_by: user.email }, '-updated_date', 5000, 200, 'CollectionHub:Cigar')
          : Promise.resolve([]),
        cigarOpenable
          ? fetchAllEntities(base44.entities.CigarSession, { created_by: user.email }, '-date', 5000, 200, 'CollectionHub:CigarSession')
          : Promise.resolve([]),
        whiskeyOpenable
          ? fetchAllEntities(base44.entities.WhiskeyInventoryUnit, { created_by: user.email }, '-updated_date', 5000, 200, 'CollectionHub:WhiskeyInventoryUnit')
          : Promise.resolve([]),
        wineOpenable
          ? fetchAllEntities(base44.entities.Wine, { created_by: user.email }, '-updated_date', 5000, 200, 'CollectionHub:Wine')
          : Promise.resolve([]),
        wineOpenable
          ? fetchAllEntities(base44.entities.WineTasting, { created_by: user.email }, '-date', 5000, 200, 'CollectionHub:WineTasting')
          : Promise.resolve([]),
      ]);

      return { pipes, blends, smokeLogs, bottles, tastings, cigars, cigarSessions, whiskeyInventory, wines, wineTastings };
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
  const wines = wineOpenable ? data?.wines || [] : [];

  // One number for the dashboard row: the findings a collector can act on.
  const healthCount = useMemo(
    () =>
      isLoading
        ? 0
        : countAttentionFindings([
            { moduleKey: 'pipekeeper', records: pipes },
            { moduleKey: 'tobacco', records: blends },
            { moduleKey: 'cigarkeeper', records: cigars },
            { moduleKey: 'whiskeykeeper', records: bottles },
            { moduleKey: 'winekeeper', records: wines },
          ]),
    [isLoading, pipes, blends, cigars, bottles, wines]
  );
  const wineTastings = wineOpenable ? data?.wineTastings || [] : [];

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
    const cigarValue = cigarOpenable
      ? selectCigarCollectionValue(cigars)
      : 0;
    const wineValue = wineOpenable
      ? selectWineCollectionValue(wines)
      : 0;

    const totalValue = pipeValue + tobaccoValue + whiskeyValue + cigarValue + wineValue;

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

    const recentWineTastingCount = wineTastings.filter((wt) => {
      const dt = new Date(wt.date || wt.tasting_date || wt.created_date || 0).getTime();
      return Number.isFinite(dt) && dt >= weekAgo;
    }).length;

    const recentSessionsCount = recentSmokeCount + recentTastingCount + recentCigarSessionCount + recentWineTastingCount;

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

    const mostValuableWine = wineOpenable
      ? [...wines]
          .map((w) => ({ ...w, value: getWineTotalValue(w), __primaryImage: getWinePrimaryImage(w) }))
          .sort((a, b) => b.value - a.value)
          .find((w) => w.value > 0) || null
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
       ? [...cigars]
           .filter((c) => getCigarAvailableQuantity(c) > 0)
           .map((c) => {
             const totalValue = getCigarUnitValue(c) * getCigarAvailableQuantity(c);
             const score =
               totalValue * 0.6 +
               Number(c.rating || 0) * 25 +
               (c.is_favorite ? 30 : 0) +
               (logsByCigar[c.id] || 0) * 2;
             return { ...c, __totalValue: totalValue, __crownScore: score };
           })
           .sort((a, b) => Number(b.__crownScore || 0) - Number(a.__crownScore || 0))[0] || null
       : null;

    const topRatedWine = wineOpenable
      ? [...wines]
          .map((w) => ({ ...w, __primaryImage: getWinePrimaryImage(w) }))
          .filter((w) => Number(w.rating || 0) >= 4)
          .sort((a, b) => (Number(b.rating || 0) - Number(a.rating || 0)) || (getWineTotalValue(b) - getWineTotalValue(a)))[0] || null
      : null;

    const readyToDrinkWine = wineOpenable
      ? wines
          .map((w) => ({ ...w, __primaryImage: getWinePrimaryImage(w) }))
          .find((w) => {
            const start = w.drink_window_start || w.drinking_window_start;
            const end = w.drink_window_end || w.drinking_window_end;
            if (!start || !end) return false;
            const now = new Date();
            return now >= new Date(start) && now <= new Date(end);
          }) || null
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
      wineValue,
      recentSessionsCount,
      recentSmokeCount,
      recentTastingCount,
      recentCigarSessionCount,
      recentWineTastingCount,
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
      mostValuableWine,
      topRatedWine,
      readyToDrinkWine,
      recentActivity,
      totalCigarSticks,
      totalBlendOz,
      totalBottleCount,
    };
  }, [pipes, blends, bottles, whiskeyInventory, smokeLogs, tastings, cigars, cigarSessions, wines, wineTastings, pipekeeperOpenable, whiskeyOpenable, cigarOpenable, wineOpenable, whiskeyMetrics]);

  const openableModuleKeys = (enabledModuleKeys || []).filter((k) => MODULE_META[k]?.route);
  const expandingKeys = (enabledModuleKeys || []).filter((k) => MODULE_META[k] && !MODULE_META[k].route);

  const topHighlights = useMemo(() => buildHubHighlightCandidates({
    pipekeeperOpenable,
    whiskeyOpenable,
    cigarOpenable,
    winekeeperOpenable: wineOpenable,
    metrics,
    t,
    formatFromBase,
    getPipeValue,
    getBottleValue,
    getWineTotalValue,
  }), [pipekeeperOpenable, whiskeyOpenable, cigarOpenable, wineOpenable, metrics, t, formatFromBase]);

  const hasHighlights = topHighlights.length > 0;

  // All-module session rows for the calendar view
  const allSessionRows = useMemo(() => {
    const rows = [];
    for (const log of smokeLogs) {
      rows.push({ id: `pipe_${log.id}`, moduleType: 'pipe', date: log.date, itemLabel: [log.blend_name, log.pipe_name].filter(Boolean).join(' · ') || 'Pipe session', rating: log.rating ?? null, notes: log.notes || '' });
    }
    for (const log of tastings) {
      rows.push({ id: `whiskey_${log.id}`, moduleType: 'whiskey', date: log.tasting_date || log.date, itemLabel: log.bottle_name || log.notes || 'Whiskey tasting', rating: log.rating ?? null, notes: log.notes || '' });
    }
    for (const log of cigarSessions) {
      rows.push({ id: `cigar_${log.id}`, moduleType: 'cigar', date: log.date, itemLabel: log.cigar_name || [log.external_cigar_brand, log.external_cigar_name].filter(Boolean).join(' ') || 'Cigar session', rating: log.overall_enjoyment ?? null, notes: log.notes || '' });
    }
    for (const wt of wineTastings) {
      rows.push({ id: `wine_${wt.id}`, moduleType: 'wine', date: wt.date || wt.tasting_date || wt.created_date, itemLabel: wt.wine_name || wt.name || wt.producer || 'Wine tasting', rating: wt.rating ?? null, notes: wt.notes || '' });
    }
    return rows;
  }, [smokeLogs, tastings, cigarSessions, wineTastings]);

  const { byDate: sessionsByDate, highlightedDates: calHighlights } = useMemo(
    () => buildSessionCalendarData(allSessionRows, 'all'),
    [allSessionRows]
  );
  const calSelectedDayRows = useMemo(() => sessionsByDate[calSelectedDate] || [], [sessionsByDate, calSelectedDate]);

  const handleOpenCombinedSessionFlow = () => {
    setShowLogSelector(false);
    setShowCombinedModal(true);
  };

  const handleOpenWhiskeyCigarFlow = () => {
    setShowLogSelector(false);
    setShowWhiskeyCigarTasting(true);
  };

  return (
    <div className="ck-paper-workspace ck-hub-workspace max-w-5xl mx-auto space-y-6">
      <ComplimentaryProBanner />
      <AppreciationBanner surface="hub" />
      <AppreciationExpiredDialog />
      <PageHeader
        title={t('hub.title')}
        subtitle={t('hub.hubDescription')}
        variant="paper"
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowLogSelector(true)}
              className="flex items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, rgba(200,151,82,0.92), rgba(163,110,52,0.92))',
                color: '#1a1109',
                minHeight: 44,
              }}
            >
              <Flame className="w-4 h-4" />
              {t('session.recordSession')}
            </button>
            <button
              type="button"
              onClick={() => navigate(createPageUrl('ReportingCenter'))}
              className="flex items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold"
              style={{
                background: 'rgba(180,140,75,0.12)',
                border: '1px solid rgba(180,140,75,0.32)',
                color: 'var(--ck-paper-action)',
                minHeight: 44,
              }}
            >
              <FileBarChart2 className="w-4 h-4" />
              {t('nav.reports')}
            </button>
          </>
        }
      />

      {isError ? (
        <div className="rounded-2xl p-5 flex items-center justify-between gap-4" style={{ background: 'rgba(179,95,95,0.12)', border: '1px solid rgba(179,95,95,0.32)' }}>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>{t('common.errorLoadingData')}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>{t('common.retryPrompt')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} style={{ borderColor: 'rgba(179,95,95,0.4)', color: '#E0D8C8', minHeight: 44, flexShrink: 0 }}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      <section className="space-y-4">
        <StatStrip
          variant="paper"
          items={[
            {
              label: t('hub.totalValue'),
              value: isLoading ? '—' : formatFromBase(metrics.totalValue),
              onClick: () => navigate(createPageUrl('ValuationCenter')),
            },
            {
              label: t('hub.recentSessions'),
              value: isLoading ? '—' : metrics.recentSessionsCount,
              onClick: () => navigate(createPageUrl('SessionHistory')),
            },
          ]}
        />

        <CollectionHealthRow
          variant="paper"
          count={healthCount}
          isLoading={isLoading}
          onOpen={() => navigate(healthUrl({ origin: 'hub' }))}
        />
      </section>

      <LogSessionSelector
        isOpen={showLogSelector}
        onClose={() => setShowLogSelector(false)}
        pipeEnabled={pipekeeperOpenable}
        whiskeyEnabled={whiskeyOpenable}
        cigarEnabled={cigarOpenable}
        wineEnabled={wineOpenable}
        onSelectPipe={() => navigate('/PipeKeeper?action=log-smoke')}
        onSelectWhiskey={() => navigate('/Tastings?action=log')}
        onSelectCigar={() => navigate('/CigarKeeper')}
        onSelectWine={() => navigate('/Wines?action=log')}
        onSelectCombined={handleOpenCombinedSessionFlow}
        onSelectWhiskeyCigar={handleOpenWhiskeyCigarFlow}
      />

      {openableModuleKeys.length > 0 ? (
        <section className="space-y-4">
          <SectionTitle>{t('hub.yourModules')}</SectionTitle>
          <div className="space-y-2.5">
            {openableModuleKeys.map((moduleKey) => {
              const meta = MODULE_META[moduleKey];
              const summaries = {
                pipekeeper: `${pipes.length} ${t('hub.pipes')} · ${blends.length} ${t('hub.blends')}`,
                whiskeykeeper: `${whiskeyMetrics.total_bottles} ${t('hub.totalBottles')}`,
                cigarkeeper: `${cigars.length} ${t('hub.cigars')} · ${metrics.totalCigarSticks} ${t('hub.sticksOwnedLabel')}`,
                winekeeper: `${selectTotalWineBottles(wines)} ${t('hub.totalBottles')}`,
              };
              const Icon =
                moduleKey === 'pipekeeper'
                  ? PipeIcon
                  : moduleKey === 'whiskeykeeper'
                  ? WhiskeyKeeperIcon
                  : moduleKey === 'cigarkeeper'
                  ? Cigarette
                  : Wine;
              return (
                <ModuleRow
                  key={moduleKey}
                  icon={Icon}
                  image={MODULE_ICONS?.[moduleKey]}
                  accent={meta.accent}
                  label={t(meta.labelKey)}
                  summary={isLoading ? '' : summaries[moduleKey]}
                  onOpen={() => navigate(createPageUrl(meta.route))}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => navigate(createPageUrl('Curator'))}
        className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.03)]"
        style={{
          background: 'linear-gradient(135deg, #401c24, #25171a)',
          border: '1px solid rgba(163,92,92,0.3)',
          minHeight: 64,
        }}
      >
        <span
          className="w-11 h-11 rounded-xl overflow-hidden shrink-0"
          style={{ border: '1px solid rgba(163,92,92,0.3)' }}
        >
          {curatorIconFailed ? (
            <Target className="w-6 h-6 m-auto mt-2.5" style={{ color: 'var(--ck-antique-brass)' }} aria-hidden="true" />
          ) : (
            <img
              src="https://media.base44.com/images/public/694956e18d119cc497192525/0ece2e1f0_inappcurator.png"
              className="w-full h-full object-cover"
              alt=""
              onError={() => setCuratorIconFailed(true)}
            />
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span
            className="block text-base font-semibold"
            style={{ color: '#F5F1E7', fontFamily: 'var(--ck-font-display)' }}
          >
            {t('hub.curatorTitle')}
          </span>
          <span className="block text-xs mt-0.5 break-words" style={{ color: 'var(--ck-nav-text)' }}>
            {t('hub.aiCuratorDescription')}
          </span>
        </span>
        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#D47C7C' }} />
      </button>

      {(metrics.recentActivity.length > 0 || allSessionRows.length > 0) ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionTitle>{t('hub.recentActivity')}</SectionTitle>
            <div className="flex gap-1 rounded-xl overflow-hidden border border-[rgba(180,140,75,0.2)]">
              <button
                type="button"
                onClick={() => setActivityView('list')}
                aria-pressed={activityView === 'list'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: activityView === 'list' ? 'rgba(180,140,75,0.22)' : 'transparent',
                  color: 'var(--ck-paper-action)',
                }}
              >
                <List className="w-3.5 h-3.5" />
                {t('hub.listView')}
              </button>
              <button
                type="button"
                onClick={() => setActivityView('calendar')}
                aria-pressed={activityView === 'calendar'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: activityView === 'calendar' ? 'rgba(180,140,75,0.22)' : 'transparent',
                  color: 'var(--ck-paper-action)',
                }}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                {t('hub.calendarView')}
              </button>
            </div>
          </div>

          {activityView === 'calendar' && (
            <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
              <div className="rounded-[22px] border border-[rgba(180,140,75,0.2)] bg-[rgba(25,17,11,0.85)] p-3">
                <Calendar
                  mode="single"
                  selected={new Date(`${calSelectedDate}T12:00:00`)}
                  onSelect={(date) => { if (date) setCalSelectedDate(toLocalDateYmd(date)); }}
                  modifiers={{ hasSessions: calHighlights }}
                  modifiersClassNames={{ hasSessions: 'ring-1 ring-[#B48C4B] ring-offset-0' }}
                />
              </div>
              <div className="rounded-[22px] border border-[rgba(180,140,75,0.2)] bg-[rgba(25,17,11,0.85)] p-5">
                <p className="text-sm font-semibold text-[#F5F1E7] mb-3">{calSelectedDate}</p>
                {calSelectedDayRows.length === 0 ? (
                  <p style={{ color: 'rgba(224,216,200,0.5)' }} className="text-sm">No sessions logged for this day.</p>
                ) : (
                  <div className="space-y-3">
                    {calSelectedDayRows.map((row) => {
                      const moduleColor = row.moduleType === 'whiskey' ? '#D47C7C' : row.moduleType === 'cigar' ? '#C4956A' : '#D4A574';
                      const rawId = row.id.replace(/^(pipe|whiskey|cigar)_/, '');
                      const handleDrill = () => {
                        if (row.moduleType === 'pipe') {
                          const log = smokeLogs.find(l => l.id === rawId);
                          if (log) setEditingSmokingLog(log);
                        } else if (row.moduleType === 'whiskey') {
                          const log = tastings.find(l => l.id === rawId);
                          if (log) setEditingTastingLog(log);
                        } else if (row.moduleType === 'cigar') {
                          const log = cigarSessions.find(l => l.id === rawId);
                          if (log) setEditingCigarSession(log);
                        }
                      };
                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={handleDrill}
                          className="w-full text-left rounded-xl p-3 border border-[rgba(180,140,75,0.18)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full" style={{ background: `${moduleColor}22`, color: moduleColor }}>
                                {row.moduleType}
                              </span>
                              {row.rating != null && <span className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>★ {row.rating}</span>}
                            </div>
                            <span className="text-xs" style={{ color: moduleColor }}>Edit →</span>
                          </div>
                          <p className="text-sm font-semibold text-[#F5F1E7] mt-1">{row.itemLabel}</p>
                          {row.notes ? <p className="text-xs text-[#E0D8C8]/60 mt-1 line-clamp-2">{row.notes}</p> : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activityView === 'list' && <div className="space-y-3">
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
                    style={{ color: '#F5F1E7', fontFamily: 'var(--ck-font-display)' }}
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
          </div>}
        </section>
      ) : null}

      <AdvancedDetails variant="paper" label={t('hub.topHighlights')} hint={t('hub.collectionStory')}>
        {hasHighlights ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {topHighlights.map((card) => (
              <CatalogPlate
                key={card.id}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                heroImage={card.heroImage}
                bgImage={card.bgImage}
                accent={card.accent}
                objectMode={card.objectMode || 'cover'}
                onClick={() => navigate(card.route)}
              />
            ))}
          </div>
        ) : null}
        <CollectionStoryCard />
      </AdvancedDetails>

      {expandingKeys.length > 0 ? (
        <p className="text-xs px-1" style={{ color: 'var(--ck-paper-muted)' }}>
          {t('hub.comingSoon')}: {expandingKeys.map((key) => t(MODULE_META[key].labelKey)).join(' · ')}
        </p>
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

      {/* Whiskey + Cigar flow: log whiskey tasting first, then cigar session */}
      {showWhiskeyCigarTasting && (
        <LogTastingModal
          isOpen={true}
          bottles={bottles}
          onClose={() => setShowWhiskeyCigarTasting(false)}
          onSaved={() => {
            setShowWhiskeyCigarTasting(false);
            queryClient.invalidateQueries({ queryKey: ['collection-hub-dashboard'] });
            setShowWhiskeyCigarCigar(true);
          }}
        />
      )}

      {showWhiskeyCigarCigar && (
        <CigarSessionModal
          isOpen={true}
          onClose={() => setShowWhiskeyCigarCigar(false)}
          onSessionSaved={() => {
            setShowWhiskeyCigarCigar(false);
            queryClient.invalidateQueries({ queryKey: ['collection-hub-dashboard'] });
          }}
        />
      )}

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