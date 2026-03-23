import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  Plus,
  Leaf,
  Flame,
  Layers,
  Clock3,
  Activity,
  TrendingUp,
  Wine,
  GlassWater,
  Star,
  Sparkles,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useEnabledKeeperModules } from '@/components/hooks/useEnabledKeeperModules';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';
import BrandLogo from '@/components/branding/BrandLogo';
import CatalogPlate from '@/components/home/CatalogPlate';
import { getPipeValue, getTobaccoValue, getBottleValue } from '@/components/keeper-core/value/valueAggregation';
import { getWhiskeyHighlights } from '@/components/whiskey/getWhiskeyHighlights';
import RecentActivity from '@/components/hub/RecentActivity';

const MODULE_META = {
  pipekeeper: {
    label: 'PipeKeeper',
    route: 'PipeKeeper',
    accent: '#C89752',
    description: 'Manage your pipe collection, tobacco cellar, smoking logs, and AI-powered pairings.',
    tagline: 'Your complete pipe & tobacco platform',
  },
  whiskeykeeper: {
    label: 'WhiskeyKeeper',
    route: 'WhiskeyKeeper',
    accent: '#B66565',
    description: 'Track your whiskey collection with tasting notes, bottle inventory, and valuations.',
    tagline: 'Whiskey collection intelligence',
  },
  winekeeper: {
    label: 'WineKeeper',
    route: null,
    accent: '#8F6BAA',
    description: 'Wine cellar management — curate, age, and value your collection.',
    tagline: 'Expanding Soon',
  },
  cigarkeeper: {
    label: 'CigarKeeper',
    route: null,
    accent: '#7F9156',
    description: 'Cigar humidor curation and collection tracking.',
    tagline: 'Expanding Soon',
  },
};

function currency(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

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
      className="rounded-[22px] p-5 min-h-[132px] flex flex-col justify-between"
      style={{
        background: 'linear-gradient(145deg, rgba(39,27,18,0.96), rgba(25,17,11,0.98))',
        border: `1px solid ${accent}40`,
        boxShadow: '0 10px 26px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${accent}26`, border: `1px solid ${accent}55` }}>
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-2" style={{ color: `${accent}D8` }}>{label}</p>
        <div className="text-4xl font-bold leading-none" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{value}</div>
        {sub ? <p className="text-sm mt-2" style={{ color: 'rgba(224,216,200,0.68)' }}>{sub}</p> : null}
      </div>
    </div>
  );
}

function ModuleCard({ moduleKey, stats = [], onOpen, openable = true }) {
  const meta = MODULE_META[moduleKey];
  const icon = MODULE_ICONS?.[moduleKey];

  return (
    <div
      className="rounded-[26px] p-6 flex flex-col gap-5"
      style={{
        background: `linear-gradient(145deg, ${meta.accent}18, rgba(26,18,12,0.98))`,
        border: `1px solid ${meta.accent}55`,
        boxShadow: `0 14px 36px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${meta.accent}1E`, border: `1px solid ${meta.accent}44` }}>
            {icon ? <img src={icon} alt={meta.label} className="w-9 h-9 object-contain" /> : null}
          </div>
          <div>
            <h3 className="text-[32px] leading-none font-bold mb-1" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{meta.label}</h3>
            <p className="text-sm" style={{ color: `${meta.accent}E8` }}>{meta.tagline}</p>
          </div>
        </div>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${meta.accent}22`, border: `1px solid ${meta.accent}44` }}>
          <ChevronRight className="w-5 h-5" style={{ color: meta.accent }} />
        </div>
      </div>

      <p className="text-lg leading-relaxed" style={{ color: 'rgba(224,216,200,0.82)' }}>
        {meta.description}
      </p>

      {stats.length > 0 ? (
        <div className={`grid gap-4 pt-4 border-t ${stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 xl:grid-cols-3'}`} style={{ borderColor: `${meta.accent}26` }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold" style={{ color: '#F5F1E7' }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.62)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={!openable}
        onClick={openable ? onOpen : undefined}
        className="w-full rounded-2xl py-3 text-sm font-semibold transition-all"
        style={{
          background: openable
            ? `linear-gradient(135deg, ${meta.accent}42, ${meta.accent}22)`
            : 'rgba(255,255,255,0.06)',
          border: openable
            ? `1px solid ${meta.accent}58`
            : '1px solid rgba(255,255,255,0.08)',
          color: openable ? meta.accent : 'rgba(224,216,200,0.45)',
        }}
      >
        {openable ? `Open ${meta.label} →` : meta.tagline}
      </button>
    </div>
  );
}

function ExpandingSoonCard({ moduleKey }) {
  const meta = MODULE_META[moduleKey];
  const icon = MODULE_ICONS?.[moduleKey];

  return (
    <div
      className="rounded-[24px] p-5 flex items-center gap-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        opacity: 0.82,
      }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${meta.accent}1C`, border: `1px solid ${meta.accent}30` }}>
        {icon ? <img src={icon} alt={meta.label} className="w-8 h-8 object-contain opacity-70" /> : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="text-xl font-bold" style={{ color: 'rgba(245,241,231,0.65)', fontFamily: "'Georgia', serif" }}>{meta.label}</h3>
          <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(224,216,200,0.5)' }}>Expanding Soon</span>
        </div>
        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.42)' }}>{meta.description}</p>
      </div>
      <Clock3 className="w-4 h-4 shrink-0" style={{ color: 'rgba(224,216,200,0.28)' }} />
    </div>
  );
}

function QuickAction({ icon: Icon, image, label, accent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[18px] p-4 flex flex-col items-start gap-3 min-w-[118px] transition-transform hover:translate-y-[-1px]"
      style={{
        background: 'linear-gradient(145deg, rgba(40,28,18,0.95), rgba(27,19,13,0.98))',
        border: `1px solid ${accent}30`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: `${accent}24`, border: `1px solid ${accent}45` }}>
        {image ? <img src={image} alt="" className="w-7 h-7 object-contain" /> : <Icon className="w-5 h-5" style={{ color: accent }} />}
      </div>
      <span className="text-sm font-semibold text-left" style={{ color: '#F5F1E7' }}>{label}</span>
    </button>
  );
}

function CuratorBanner({ title, body, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[24px] p-6 flex items-center justify-between gap-5 text-left"
      style={{
        background: 'linear-gradient(135deg, rgba(163,92,92,0.16), rgba(36,24,17,0.98))',
        border: '1px solid rgba(163,92,92,0.35)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: 'rgba(163,92,92,0.18)', border: '1px solid rgba(163,92,92,0.32)' }}>
          <img src={MODULE_ICONS.curator} alt="Curator" className="w-9 h-9 object-contain" />
        </div>
        <div>
          <div className="text-2xl font-bold mb-1" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{title}</div>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(224,216,200,0.72)' }}>{body}</p>
        </div>
      </div>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(163,92,92,0.22)', border: '1px solid rgba(163,92,92,0.38)' }}>
        <ChevronRight className="w-5 h-5" style={{ color: '#D47C7C' }} />
      </div>
    </button>
  );
}

function getRecentLabel(dateString) {
  if (!dateString) return '';
  const dt = new Date(dateString);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString();
}

function getPipePhoto(pipe) {
  return Array.isArray(pipe?.photos) ? pipe.photos[0] : pipe?.photos?.[0] || pipe?.photo || '';
}

function getBlendPhoto(blend) {
  return blend?.logo || blend?.photo || blend?.image || '';
}

function getBottlePhoto(bottle) {
  return bottle?.photo || (Array.isArray(bottle?.photos) ? bottle.photos[0] : '') || bottle?.image || bottle?.image_url || '';
}

function getBottleTypesCount(bottles = []) {
  const set = new Set(
    bottles
      .map((b) => b?.type || b?.bottle_type || b?.whiskey_type || b?.style || b?.category)
      .filter(Boolean)
      .map((v) => String(v).trim().toLowerCase())
  );
  return set.size;
}

function buildRecentActivity(smokeLogs = [], tastingLogs = []) {
  const smoke = smokeLogs.map((log) => ({
    id: `smoke-${log.id}`,
    type: 'smoke',
    title: log.blend_name || log.blend || 'Smoking session',
    subtitle: `${log.pipe_name ? `In ${log.pipe_name}` : 'Pipe session'}${log.date ? ` • ${getRecentLabel(log.date)}` : ''}`,
    date: log.date || log.created_date,
    targetUrl: log.pipe_id ? `/PipeDetail?id=${encodeURIComponent(log.pipe_id)}` : createPageUrl('PipeKeeper'),
  }));

  const tastings = tastingLogs.map((log) => ({
    id: `taste-${log.id}`,
    type: 'tasting',
    title: log.bottle_name || 'Whiskey tasting',
    subtitle: `${typeof log.rating === 'number' ? `${log.rating.toFixed(1)} / 5` : 'Tasting note'}${log.tasting_date ? ` • ${getRecentLabel(log.tasting_date)}` : ''}`,
    date: log.tasting_date || log.created_date,
    targetUrl: log.bottle_id ? `/WhiskeyKeeper?bottle=${encodeURIComponent(log.bottle_id)}` : createPageUrl('WhiskeyKeeper'),
  }));

  return [...smoke, ...tastings]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 6);
}

export default function CollectionHub() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { enabledModules, expandingSoonModules, isModuleEnabled } = useEnabledKeeperModules();
  const whiskeyOpenable = isModuleEnabled('whiskeykeeper');

  const { data, isLoading } = useQuery({
    queryKey: ['collection-hub-dashboard-v2', user?.email, whiskeyOpenable],
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const [pipes, blends, smokeLogs, bottles, tastingLogs, inventoryUnits] = await Promise.all([
        base44.entities.Pipe.filter({ created_by: user.email }, '-updated_date', 500).catch(() => []),
        base44.entities.TobaccoBlend.filter({ created_by: user.email }, '-updated_date', 500).catch(() => []),
        base44.entities.SmokingLog.filter({ created_by: user.email }, '-date', 1000).catch(() => []),
        whiskeyOpenable ? base44.entities.Bottle.filter({ created_by: user.email }, '-updated_date', 500).catch(() => []) : Promise.resolve([]),
        whiskeyOpenable ? base44.entities.TastingLog.filter({ created_by: user.email }, '-tasting_date', 1000).catch(() => []) : Promise.resolve([]),
        whiskeyOpenable ? base44.entities.WhiskeyInventoryUnit.filter({ created_by: user.email }).catch(() => []) : Promise.resolve([]),
      ]);
      return { pipes, blends, smokeLogs, bottles, tastingLogs, inventoryUnits };
    },
  });

  const pipes = data?.pipes || [];
  const blends = data?.blends || [];
  const smokeLogs = data?.smokeLogs || [];
  const bottles = data?.bottles || [];
  const tastingLogs = data?.tastingLogs || [];
  const inventoryUnits = data?.inventoryUnits || [];

  const metrics = useMemo(() => {
    const pipeValue = pipes.reduce((sum, pipe) => sum + Number(getPipeValue(pipe) || 0), 0);
    const tobaccoValue = blends.reduce((sum, blend) => sum + Number(getTobaccoValue(blend) || 0), 0);
    const whiskeyValue = whiskeyOpenable ? bottles.reduce((sum, bottle) => sum + Number(getBottleValue(bottle) || 0), 0) : 0;
    const totalValue = pipeValue + tobaccoValue + whiskeyValue;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const smokeThisWeek = smokeLogs.filter((log) => {
      const dt = new Date(log.date || log.created_date || 0).getTime();
      return Number.isFinite(dt) && dt >= weekAgo;
    }).length;
    const tastingsThisWeek = tastingLogs.filter((log) => {
      const dt = new Date(log.tasting_date || log.created_date || 0).getTime();
      return Number.isFinite(dt) && dt >= weekAgo;
    }).length;

    const logsByPipe = smokeLogs.reduce((acc, log) => {
      const id = log.pipe_id;
      if (!id) return acc;
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

    const logsByBlend = smokeLogs.reduce((acc, log) => {
      const id = log.blend_id;
      if (!id) return acc;
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

    const mostSmokedPipe = [...pipes]
      .map((pipe) => ({ ...pipe, __count: logsByPipe[pipe.id] || Number(pipe.times_smoked) || 0 }))
      .sort((a, b) => b.__count - a.__count)[0] || null;

    const favoriteBlend = [...blends]
      .map((blend) => ({ ...blend, __count: logsByBlend[blend.id] || Number(blend.times_smoked) || 0 }))
      .sort((a, b) => b.__count - a.__count)[0] || null;

    const mostValuablePipe = [...pipes]
      .sort((a, b) => Number(getPipeValue(b) || 0) - Number(getPipeValue(a) || 0))[0] || null;

    const whiskeyHighlights = whiskeyOpenable ? getWhiskeyHighlights(bottles, inventoryUnits) : [];
    const recentActivity = buildRecentActivity(smokeLogs, whiskeyOpenable ? tastingLogs : []);

    return {
      totalValue,
      pipeValue,
      tobaccoValue,
      whiskeyValue,
      smokeThisWeek,
      tastingsThisWeek,
      recentActivityCount: smokeThisWeek + tastingsThisWeek,
      mostSmokedPipe,
      favoriteBlend,
      mostValuablePipe,
      whiskeyHighlights,
      recentActivity,
      totalBottles: bottles.reduce((sum, b) => sum + (Number(b.bottle_count) || 1), 0),
      bottleTypes: getBottleTypesCount(bottles),
      tastingCount: tastingLogs.length,
    };
  }, [pipes, blends, bottles, smokeLogs, tastingLogs, inventoryUnits, whiskeyOpenable]);

  const openableModuleKeys = enabledModules.map((m) => m.moduleKey);
  const expandingKeys = expandingSoonModules.map((m) => m.moduleKey).filter((k) => !openableModuleKeys.includes(k));

  const pipeStats = [
    { label: 'Pipes', value: pipes.length },
    { label: 'Blends', value: blends.length },
    { label: 'Recent Logs', value: smokeLogs.length || '—' },
  ];

  const whiskeyStats = [
    { label: 'Bottle Types', value: metrics.bottleTypes || 0 },
    { label: 'Total Bottles', value: metrics.totalBottles || 0 },
    { label: 'Total Value', value: currency(metrics.whiskeyValue) },
  ];

  const highlightCards = [];
  if (metrics.mostSmokedPipe) {
    highlightCards.push(
      <CatalogPlate
        key="most-smoked-pipe"
        title="Most Smoked Pipe"
        value={metrics.mostSmokedPipe.name}
        subtitle={`${metrics.mostSmokedPipe.__count || 0} bowls`}
        heroImage={getPipePhoto(metrics.mostSmokedPipe)}
        bgImage={getPipePhoto(metrics.mostSmokedPipe)}
        accent="#C87941"
        onClick={() => navigate(`/PipeDetail?id=${encodeURIComponent(metrics.mostSmokedPipe.id)}`)}
      />
    );
  }
  if (metrics.favoriteBlend) {
    highlightCards.push(
      <CatalogPlate
        key="favorite-blend"
        title="Favorite Blend"
        value={metrics.favoriteBlend.name}
        subtitle={`${metrics.favoriteBlend.__count || 0} bowls`}
        heroImage={getBlendPhoto(metrics.favoriteBlend)}
        bgImage={getBlendPhoto(metrics.favoriteBlend)}
        accent="#5A7C5A"
        onClick={() => navigate(`/TobaccoDetail?id=${encodeURIComponent(metrics.favoriteBlend.id)}`)}
      />
    );
  }
  if (metrics.mostValuablePipe) {
    highlightCards.push(
      <CatalogPlate
        key="most-valuable-pipe"
        title="Most Valuable Pipe"
        value={metrics.mostValuablePipe.name}
        subtitle={currency(getPipeValue(metrics.mostValuablePipe))}
        heroImage={getPipePhoto(metrics.mostValuablePipe)}
        bgImage={getPipePhoto(metrics.mostValuablePipe)}
        accent="#B4824B"
        onClick={() => navigate(`/PipeDetail?id=${encodeURIComponent(metrics.mostValuablePipe.id)}`)}
      />
    );
  }

  if (whiskeyOpenable) {
    metrics.whiskeyHighlights.slice(0, 2).forEach((h) => {
      highlightCards.push(
        <CatalogPlate
          key={`whiskey-${h.key}`}
          title={`WhiskeyKeeper • ${h.title}`}
          value={h.subtitle || h.value}
          subtitle={h.subtitle && h.value ? h.value : h.subtitle || h.value}
          heroImage={h.photo || ''}
          bgImage={h.photo || ''}
          accent={h.accent || '#B66565'}
          onClick={() => navigate(h.bottleId ? `/WhiskeyKeeper?bottle=${encodeURIComponent(h.bottleId)}` : createPageUrl('WhiskeyKeeper'))}
        />
      );
    });
  }

  const quickActions = [
    { key: 'add-pipe', label: 'Add Pipe', icon: Plus, accent: '#C89752', onClick: () => navigate('/PipeKeeper?action=add_pipe') },
    { key: 'add-blend', label: 'Add Blend', icon: Plus, accent: '#8E7E60', onClick: () => navigate('/PipeKeeper?action=add_blend') },
    { key: 'log-smoke', label: 'Log Smoke', icon: Flame, accent: '#B56A5F', onClick: () => navigate('/PipeKeeper?action=log_smoke') },
    { key: 'view-pipes', label: 'View Pipes', icon: Layers, accent: '#B48C4B', onClick: () => navigate(createPageUrl('PipeKeeper')) },
  ];

  if (whiskeyOpenable) {
    quickActions.push(
      { key: 'add-bottle', label: 'Add Bottle', icon: Wine, accent: '#B66565', onClick: () => navigate(createPageUrl('WhiskeyKeeper')) },
      { key: 'log-tasting', label: 'Log Tasting', icon: GlassWater, accent: '#C47A6C', onClick: () => navigate(createPageUrl('Tastings')) },
    );
  }

  quickActions.push({ key: 'curator', label: 'Open Curator', image: MODULE_ICONS.curator, icon: Sparkles, accent: '#B66565', onClick: () => navigate(createPageUrl('Curator')) });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <section
        className="rounded-[28px] p-6 sm:p-8"
        style={{
          background: 'linear-gradient(145deg, rgba(35,24,16,0.94), rgba(22,15,10,0.98))',
          border: '1px solid rgba(180,140,75,0.16)',
          boxShadow: '0 18px 46px rgba(0,0,0,0.36)',
        }}
      >
        <div className="flex items-center gap-5">
          <BrandLogo compact showWordmark={false} imageClassName="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0" />
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
              CollectionKeeper
            </h1>
            <p className="text-lg sm:text-xl mt-2 max-w-3xl" style={{ color: 'rgba(224,216,200,0.78)' }}>
              Your unified ecosystem for tracking, curating, and understanding your collections.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>Collection Overview</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard icon={TrendingUp} label="Total Value" value={isLoading ? '—' : currency(metrics.totalValue)} sub={whiskeyOpenable ? 'Across open modules' : 'Across active collections'} accent="#C89752" />
          <StatCard icon={Layers} label="Pipes" value={isLoading ? '—' : pipes.length} sub="In collection" accent="#B48C4B" />
          <StatCard icon={Leaf} label="Blends" value={isLoading ? '—' : blends.length} sub="Tracked blends" accent="#6E8A57" />
          {whiskeyOpenable ? <StatCard icon={Wine} label="Bottles" value={isLoading ? '—' : metrics.totalBottles} sub={`${metrics.bottleTypes || 0} types`} accent="#B66565" /> : null}
          <StatCard icon={Activity} label="Recent Activity" value={isLoading ? '—' : metrics.recentActivityCount} sub="This week" accent="#B56A5F" />
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>Quick Actions</SectionTitle>
        <div className="flex flex-wrap gap-4">
          {quickActions.map((action) => (
            <QuickAction key={action.key} icon={action.icon} image={action.image} label={action.label} accent={action.accent} onClick={action.onClick} />
          ))}
        </div>
      </section>

      {openableModuleKeys.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>Your Collections</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {openableModuleKeys.map((moduleKey) => (
              <ModuleCard
                key={moduleKey}
                moduleKey={moduleKey}
                stats={moduleKey === 'pipekeeper' ? pipeStats : moduleKey === 'whiskeykeeper' ? whiskeyStats : []}
                onOpen={() => navigate(createPageUrl(MODULE_META[moduleKey].route))}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <SectionTitle>Collection Intelligence</SectionTitle>
        <CuratorBanner
          title="AI Curator"
          body="Get personalized insights, rotation advice, and collection recommendations tailored to your actual collection."
          onOpen={() => navigate(createPageUrl('Curator'))}
        />
      </section>

      {highlightCards.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>Top Highlights</SectionTitle>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {highlightCards}
          </div>
        </section>
      )}

      {metrics.recentActivity.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>Recent Activity</SectionTitle>
          <RecentActivity
            items={metrics.recentActivity}
            onSelect={(item) => navigate(item.targetUrl)}
          />
        </section>
      )}

      {expandingKeys.length > 0 && (
        <section className="space-y-4">
          <SectionTitle muted>Expanding Soon</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {expandingKeys.map((moduleKey) => (
              <ExpandingSoonCard key={moduleKey} moduleKey={moduleKey} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
