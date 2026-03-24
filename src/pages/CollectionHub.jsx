import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  Plus,
  Leaf,
  Flame,
  Clock3,
  Activity,
  TrendingUp,
  Target,
  Layers,
} from 'lucide-react';
import WhiskeyKeeperIcon from '@/components/icons/WhiskeyKeeperIcon';
import PipeIcon from '@/components/icons/PipeIcon';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useEnabledKeeperModules } from '@/components/hooks/useEnabledKeeperModules';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';
import BrandLogo from '@/components/branding/BrandLogo';
import CatalogPlate from '@/components/home/CatalogPlate';
import { getPipeValue, getBottleValue } from '@/components/keeper-core/value/valueAggregation';
import { calculateTobaccoCollectionValue } from '@/components/utils/tobaccoQuantityHelpers';

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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function SectionTitle({ children, muted = false }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] px-1" style={{ color: muted ? 'rgba(224,216,200,0.34)' : '#8B6239' }}>
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
        <div className="text-2xl sm:text-4xl font-bold leading-none break-words" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{value}</div>
        {sub ? <p className="text-sm mt-2" style={{ color: 'rgba(224,216,200,0.68)' }}>{sub}</p> : null}
      </div>
    </div>
  );
}

function ModuleCard({ moduleKey, stats = [], onOpen }) {
  const meta = MODULE_META[moduleKey];
  const icon = MODULE_ICONS?.[moduleKey];

  return (
    <div
      className="rounded-[26px] p-5 sm:p-6 flex flex-col gap-5"
      style={{
        background: `linear-gradient(145deg, ${meta.accent}18, rgba(26,18,12,0.98))`,
        border: `1px solid ${meta.accent}55`,
        boxShadow: `0 14px 36px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${meta.accent}1E`, border: `1px solid ${meta.accent}44` }}>
            {icon ? <img src={icon} alt={meta.label} className="w-11 h-11 sm:w-12 sm:h-12 object-contain" /> : null}
          </div>
          <div className="min-w-0">
            <h3 className="text-2xl sm:text-[30px] leading-tight font-bold mb-1" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{meta.label}</h3>
            <p className="text-xs sm:text-sm" style={{ color: `${meta.accent}E8` }}>{meta.tagline}</p>
          </div>
        </div>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${meta.accent}22`, border: `1px solid ${meta.accent}44` }}>
          <ChevronRight className="w-5 h-5" style={{ color: meta.accent }} />
        </div>
      </div>

      <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgba(224,216,200,0.82)' }}>{meta.description}</p>

      {stats.length > 0 && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t" style={{ borderColor: `${meta.accent}26` }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold" style={{ color: '#F5F1E7' }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.62)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

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
        Open {meta.label}
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
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', opacity: 0.82 }}
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${meta.accent}1C`, border: `1px solid ${meta.accent}30` }}>
        {icon ? <img src={icon} alt={meta.label} className="w-10 h-10 object-contain opacity-70" /> : null}
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

function QuickAction({ icon: Icon, label, accent, onClick }) {
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
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${accent}24`, border: `1px solid ${accent}45` }}>
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <span className="text-sm font-semibold text-left" style={{ color: '#F5F1E7' }}>{label}</span>
    </button>
  );
}

function getRecentLabel(dateString) {
  if (!dateString) return '';
  const dt = new Date(dateString);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString();
}

export default function CollectionHub() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { enabledModules, expandingSoonModules, isModuleEnabled } = useEnabledKeeperModules();
  const whiskeyOpenable = isModuleEnabled('whiskeykeeper');

  const { data, isLoading } = useQuery({
    queryKey: ['collection-hub-dashboard', user?.email, whiskeyOpenable],
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const [pipes, blends, smokeLogs, bottles, tastings] = await Promise.all([
        base44.entities.Pipe.filter({ created_by: user.email }, '-updated_date', 500).catch(() => []),
        base44.entities.TobaccoBlend.filter({ created_by: user.email }, '-updated_date', 500).catch(() => []),
        base44.entities.SmokingLog.filter({ created_by: user.email }, '-date', 1000).catch(() => []),
        whiskeyOpenable
          ? base44.entities.Bottle.filter({ created_by: user.email }, '-updated_date', 500).catch(() => [])
          : Promise.resolve([]),
        whiskeyOpenable
          ? base44.entities.TastingLog.filter({ created_by: user.email }, '-date', 100).catch(() => [])
          : Promise.resolve([]),
      ]);
      return { pipes, blends, smokeLogs, bottles, tastings };
    },
  });

  const pipes = data?.pipes || [];
  const blends = data?.blends || [];
  const smokeLogs = data?.smokeLogs || [];
  const bottles = data?.bottles || [];
  const tastings = data?.tastings || [];

  const metrics = useMemo(() => {
    // Only include whiskey value if whiskey is openable
    const pipeValue = pipes.reduce((sum, p) => sum + Number(getPipeValue(p) || 0), 0);
    const tobaccoValue = calculateTobaccoCollectionValue(blends);
    const whiskeyValue = whiskeyOpenable
      ? bottles.reduce((sum, b) => sum + Number(getBottleValue(b) || 0), 0)
      : 0;
    const totalValue = pipeValue + tobaccoValue + whiskeyValue;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentSessionsCount = smokeLogs.filter((log) => {
      const dt = new Date(log.date || log.created_date || 0).getTime();
      return Number.isFinite(dt) && dt >= weekAgo;
    }).length;

    const logsByPipe = smokeLogs.reduce((acc, log) => {
      if (log.pipe_id) acc[log.pipe_id] = (acc[log.pipe_id] || 0) + 1;
      return acc;
    }, {});
    const logsByBlend = smokeLogs.reduce((acc, log) => {
      if (log.blend_id) acc[log.blend_id] = (acc[log.blend_id] || 0) + 1;
      return acc;
    }, {});

    const mostSmokedPipe = [...pipes]
      .map((p) => ({ ...p, __count: logsByPipe[p.id] || 0 }))
      .sort((a, b) => b.__count - a.__count)
      .find((p) => p.__count > 0) || null;

    const favoriteBlend = [...blends]
      .map((b) => ({ ...b, __count: logsByBlend[b.id] || 0 }))
      .sort((a, b) => b.__count - a.__count)
      .find((b) => b.__count > 0) || null;

    const mostValuablePipe = [...pipes]
      .sort((a, b) => Number(getPipeValue(b) || 0) - Number(getPipeValue(a) || 0))[0] || null;

    const mostValuableBottle = whiskeyOpenable
      ? [...bottles].sort((a, b) => Number(getBottleValue(b) || 0) - Number(getBottleValue(a) || 0))[0] || null
      : null;

    const recentActivity = smokeLogs.slice(0, 5).map((log) => ({
      id: log.id,
      title: log.blend_name || log.pipe_name || 'Recent session',
      subtitle: `${log.pipe_name ? log.pipe_name : 'Session'}${log.date ? ` · ${getRecentLabel(log.date)}` : ''}`,
      pipeId: log.pipe_id,
    }));

    return {
      totalValue,
      recentSessionsCount,
      mostSmokedPipe,
      favoriteBlend,
      mostValuablePipe,
      mostValuableBottle,
      recentActivity,
    };
  }, [pipes, blends, bottles, smokeLogs, whiskeyOpenable]);

  const openableModuleKeys = enabledModules.map((m) => m.moduleKey);
  const expandingKeys = expandingSoonModules.map((m) => m.moduleKey);

  const pipeStats = [
    { label: 'Pipes', value: pipes.length },
    { label: 'Blends', value: blends.length },
    { label: 'This Week', value: isLoading ? '—' : metrics.recentSessionsCount },
  ];

  const whiskeyStats = [
    { label: 'Bottles', value: bottles.length },
    { label: 'Tastings', value: tastings.length },
    { label: 'Value', value: currency(bottles.reduce((s, b) => s + Number(getBottleValue(b) || 0), 0)) },
  ];

  const hasHighlights = metrics.mostSmokedPipe || metrics.favoriteBlend || metrics.mostValuablePipe || metrics.mostValuableBottle;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

      {/* Hero */}
      <section
        className="rounded-[28px] p-5 sm:p-8"
        style={{
          background: 'linear-gradient(145deg, rgba(35,24,16,0.94), rgba(22,15,10,0.98))',
          border: '1px solid rgba(180,140,75,0.16)',
          boxShadow: '0 18px 46px rgba(0,0,0,0.36)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <BrandLogo compact showWordmark={false} imageClassName="w-14 h-14 sm:w-20 sm:h-20 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
              CollectionKeeper
            </h1>
            <p className="text-sm sm:text-base lg:text-lg mt-1 sm:mt-2" style={{ color: 'rgba(224,216,200,0.78)' }}>
              Your unified ecosystem for tracking, curating, and understanding your collections.
            </p>
          </div>
        </div>
      </section>

      {/* Collection Overview */}
      <section className="space-y-4">
        <SectionTitle>Collection Overview</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={TrendingUp} label="Total Value" value={isLoading ? '—' : currency(metrics.totalValue)} sub="Across active collections" accent="#C89752" />
          <StatCard icon={PipeIcon} label="Pipes" value={isLoading ? '—' : pipes.length} sub="In collection" accent="#B48C4B" />
          <StatCard icon={Leaf} label="Blends" value={isLoading ? '—' : blends.length} sub="Tracked blends" accent="#6E8A57" />
          <StatCard icon={Flame} label="Recent Sessions" value={isLoading ? '—' : metrics.recentSessionsCount} sub="This week" accent="#B56A5F" />
        </div>
      </section>

      {/* Quick Actions — directly below Overview */}
      <section className="space-y-4">
        <SectionTitle>Quick Actions</SectionTitle>
        <div className="flex flex-wrap gap-4">
          <QuickAction icon={Plus} label="Add Pipe" accent="#C89752" onClick={() => navigate('/Pipes?action=add')} />
          <QuickAction icon={Plus} label="Add Blend" accent="#8E7E60" onClick={() => navigate('/Tobacco?action=add')} />
          <QuickAction icon={Flame} label="Log Smoke" accent="#B56A5F" onClick={() => navigate(createPageUrl('PipeKeeper?action=log-smoke'))} />
          <QuickAction icon={Layers} label="View Pipes" accent="#B48C4B" onClick={() => navigate(createPageUrl('PipeKeeper'))} />
          {whiskeyOpenable && (
            <>
              <QuickAction icon={WhiskeyKeeperIcon} label="Add Bottle" accent="#B66565" onClick={() => navigate('/BottleForm')} />
              <QuickAction icon={WhiskeyKeeperIcon} label="My Whiskey" accent="#A35050" onClick={() => navigate(createPageUrl('WhiskeyKeeper'))} />
            </>
          )}
          <QuickAction icon={Target} label="Open Curator" accent="#B66565" onClick={() => navigate(createPageUrl('Curator'))} />
        </div>
      </section>

      {/* Your Collections */}
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

      {/* Collection Intelligence */}
      <section className="space-y-4">
        <SectionTitle>Collection Intelligence</SectionTitle>
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
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(163,92,92,0.14)', border: '1px solid rgba(163,92,92,0.30)' }}>
              <Target className="w-7 h-7" style={{ color: '#D47C7C' }} />
            </div>
            <div>
              <div className="text-2xl font-bold mb-1" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>AI Curator</div>
              <p className="text-base leading-relaxed" style={{ color: 'rgba(224,216,200,0.72)' }}>
                Get personalized insights, rotation advice, and collection recommendations tailored to your actual collection.
              </p>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(163,92,92,0.22)', border: '1px solid rgba(163,92,92,0.38)' }}>
            <ChevronRight className="w-5 h-5" style={{ color: '#D47C7C' }} />
          </div>
        </button>
      </section>

      {/* Top Highlights */}
      {hasHighlights && (
        <section className="space-y-4">
          <SectionTitle>Top Highlights</SectionTitle>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {metrics.mostSmokedPipe && (
              <CatalogPlate
                title="Most Smoked Pipe"
                value={metrics.mostSmokedPipe.name}
                subtitle={`${metrics.mostSmokedPipe.__count || 0} bowls`}
                heroImage={metrics.mostSmokedPipe.photos?.[0]}
                bgImage={metrics.mostSmokedPipe.photos?.[0]}
                accent="#C87941"
                onClick={() => navigate(`/PipeDetail?id=${encodeURIComponent(metrics.mostSmokedPipe.id)}`)}
              />
            )}
            {metrics.favoriteBlend && (
              <CatalogPlate
                title="Favorite Blend"
                value={metrics.favoriteBlend.name}
                subtitle={`${metrics.favoriteBlend.__count || 0} bowls`}
                heroImage={metrics.favoriteBlend.logo || metrics.favoriteBlend.photo}
                bgImage={metrics.favoriteBlend.logo || metrics.favoriteBlend.photo}
                accent="#5A7C5A"
                onClick={() => navigate(`/TobaccoDetail?id=${encodeURIComponent(metrics.favoriteBlend.id)}`)}
              />
            )}
            {metrics.mostValuablePipe && (
              <CatalogPlate
                title="Most Valuable Pipe"
                value={metrics.mostValuablePipe.name}
                subtitle={currency(getPipeValue(metrics.mostValuablePipe))}
                heroImage={metrics.mostValuablePipe.photos?.[0]}
                bgImage={metrics.mostValuablePipe.photos?.[0]}
                accent="#B4824B"
                onClick={() => navigate(`/PipeDetail?id=${encodeURIComponent(metrics.mostValuablePipe.id)}`)}
              />
            )}
            {metrics.mostValuableBottle && whiskeyOpenable && (
              <CatalogPlate
                title="Top Whiskey"
                value={metrics.mostValuableBottle.name}
                subtitle={currency(getBottleValue(metrics.mostValuableBottle))}
                heroImage={metrics.mostValuableBottle.photo || metrics.mostValuableBottle.photos?.[0]}
                bgImage={metrics.mostValuableBottle.photo || metrics.mostValuableBottle.photos?.[0]}
                accent="#B66565"
                onClick={() => navigate(`/BottleDetail?id=${encodeURIComponent(metrics.mostValuableBottle.id)}`)}
              />
            )}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {metrics.recentActivity.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>Recent Activity</SectionTitle>
          <div className="space-y-3">
            {metrics.recentActivity.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => navigate(activity.pipeId ? `/PipeDetail?id=${encodeURIComponent(activity.pipeId)}` : '/PipeKeeper')}
                className="w-full rounded-[22px] p-5 flex items-center gap-4 text-left"
                style={{
                  background: 'linear-gradient(145deg, rgba(40,28,18,0.92), rgba(24,17,11,0.98))',
                  border: '1px solid rgba(180,140,75,0.18)',
                }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(180,140,75,0.14)', border: '1px solid rgba(180,140,75,0.24)' }}>
                  <Activity className="w-5 h-5" style={{ color: '#D4A574' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold break-words line-clamp-1" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{activity.title}</p>
                  <p className="text-sm mt-1 break-words line-clamp-1" style={{ color: 'rgba(224,216,200,0.7)' }}>{activity.subtitle}</p>
                </div>
                <span className="text-sm shrink-0" style={{ color: '#D4A574' }}>View</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Expanding Soon — bottom of page */}
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