import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useEnabledKeeperModules } from '@/components/hooks/useEnabledKeeperModules';
import { createPageUrl } from '@/components/utils/createPageUrl';
import BrandLogo from '@/components/branding/BrandLogo';
import CatalogPlate from '@/components/home/CatalogPlate';
import RecentActivity from '@/components/hub/RecentActivity';
import { StatusCard, CATEGORY_COLORS } from '@/components/ui/HeroCard';
import {
  Plus,
  Leaf,
  Flame,
  Layers,
  Target,
  TrendingUp,
  CalendarDays,
  Clock3,
} from 'lucide-react';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';

const MODULE_META = {
  pipekeeper: {
    key: 'pipekeeper',
    label: 'PipeKeeper',
    description: 'Manage your pipe collection, tobacco cellar, smoking logs, and AI-powered pairings.',
    route: 'PipeKeeper',
    accent: '#c49a5a',
    accentBg: 'rgba(139,98,57,0.22)',
    accentBorder: 'rgba(180,140,75,0.4)',
    tagline: 'Your complete pipe & tobacco platform',
  },
  whiskeykeeper: {
    key: 'whiskeykeeper',
    label: 'WhiskeyKeeper',
    description: 'Track your whiskey collection with tasting notes, bottle inventory, and valuations.',
    route: null,
    accent: '#a35c5c',
    accentBg: 'rgba(163,92,92,0.15)',
    accentBorder: 'rgba(163,92,92,0.3)',
    tagline: 'Whiskey collection intelligence',
  },
  winekeeper: {
    key: 'winekeeper',
    label: 'WineKeeper',
    description: 'Wine cellar management — curate, age, and value your collection.',
    route: null,
    accent: '#7a5c8b',
    accentBg: 'rgba(122,92,139,0.12)',
    accentBorder: 'rgba(122,92,139,0.25)',
    tagline: 'Wine cellar intelligence',
  },
  cigarkeeper: {
    key: 'cigarkeeper',
    label: 'CigarKeeper',
    description: 'Cigar humidor curation and collection tracking.',
    route: null,
    accent: '#5c7a3a',
    accentBg: 'rgba(92,122,58,0.12)',
    accentBorder: 'rgba(92,122,58,0.25)',
    tagline: 'Cigar collection curation',
  },
};

function formatCurrency(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function calcLongestStreak(logs) {
  if (!Array.isArray(logs) || logs.length === 0) return 0;
  const dayKeys = [...new Set(
    logs
      .map((l) => {
        const d = l?.date ? new Date(l.date) : null;
        return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
      })
      .filter(Boolean)
  )].sort();

  if (!dayKeys.length) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dayKeys.length; i++) {
    const prev = new Date(dayKeys[i - 1]);
    const curr = new Date(dayKeys[i]);
    const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

function calcAveragePerWeek(logs) {
  if (!Array.isArray(logs) || logs.length === 0) return 0;
  const dates = logs
    .map((l) => (l?.date ? new Date(l.date) : null))
    .filter((d) => d && !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);

  if (!dates.length) return 0;
  const first = dates[0];
  const last = dates[dates.length - 1];
  const spanDays = Math.max(1, Math.ceil((last - first) / (1000 * 60 * 60 * 24)) + 1);
  const weeks = Math.max(1, spanDays / 7);
  return (logs.length / weeks).toFixed(1);
}

function pickImage(...candidates) {
  for (const c of candidates.flat()) {
    if (typeof c === 'string' && c.trim()) return c;
  }
  return null;
}

function getPipeHighlights(pipes, blends, logs) {
  const pipeMap = new Map((pipes || []).map((p) => [p.id, p]));
  const blendMap = new Map((blends || []).map((b) => [b.id, b]));

  const pipeCounts = new Map();
  const blendCounts = new Map();

  for (const log of logs || []) {
    if (log?.pipe_id) {
      pipeCounts.set(log.pipe_id, (pipeCounts.get(log.pipe_id) || 0) + (Number(log?.bowls_used) || 1));
    }
    if (log?.blend_id) {
      blendCounts.set(log.blend_id, (blendCounts.get(log.blend_id) || 0) + (Number(log?.bowls_used) || 1));
    }
  }

  let mostSmokedPipe = null;
  if (pipeCounts.size) {
    const [pipeId, bowls] = [...pipeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const pipe = pipeMap.get(pipeId);
    if (pipe) {
      mostSmokedPipe = {
        title: 'Most Smoked Pipe',
        value: pipe.name || pipe.brand || 'Unnamed Pipe',
        subtitle: `${bowls} bowls`,
        image: pickImage(pipe.photos, pipe.photo),
      };
    }
  }

  let favoriteBlend = null;
  if (blendCounts.size) {
    const [blendId, bowls] = [...blendCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const blend = blendMap.get(blendId);
    if (blend) {
      favoriteBlend = {
        title: 'Favorite Blend',
        value: blend.name || blend.brand || 'Unnamed Blend',
        subtitle: `${bowls} bowls`,
        image: pickImage(blend.logo, blend.photo, blend.photos),
      };
    }
  } else {
    const favorite = (blends || []).find((b) => b?.is_favorite);
    if (favorite) {
      favoriteBlend = {
        title: 'Favorite Blend',
        value: favorite.name || favorite.brand || 'Favorite Blend',
        subtitle: favorite.manufacturer || favorite.brand || 'Cellar favorite',
        image: pickImage(favorite.logo, favorite.photo, favorite.photos),
      };
    }
  }

  return { mostSmokedPipe, favoriteBlend };
}

function SectionTitle({ children, muted = false }) {
  return (
    <h2
      className="text-sm uppercase tracking-[0.14em] font-semibold mb-4"
      style={{ color: muted ? 'rgba(224,216,200,0.34)' : 'rgba(180, 140, 75, 0.88)' }}
    >
      {children}
    </h2>
  );
}

function ActiveModuleCard({ meta, stats, onNavigate, bgImage = null }) {
  const icon = MODULE_ICONS?.[meta.key];
  return (
    <div
      className="relative rounded-2xl overflow-hidden p-6 flex flex-col gap-4 cursor-pointer transition-all duration-200 hover:translate-y-[-2px]"
      onClick={onNavigate}
      style={{
        background: `linear-gradient(145deg, ${meta.accentBg}, rgba(20,14,10,0.97))`,
        border: `1px solid ${meta.accentBorder}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 ${meta.accent}18`,
      }}
    >
      {bgImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(22px) brightness(0.18) saturate(0.55) sepia(0.18)',
            opacity: 0.8,
            transform: 'scale(1.12)',
          }}
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, rgba(24,16,10,0.94) 0%, rgba(24,16,10,0.88) 50%, rgba(24,16,10,0.55) 100%)',
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: meta.accentBg, border: `1px solid ${meta.accentBorder}` }}
          >
            <img src={icon} alt={meta.label} className="w-7 h-7 object-contain" />
          </div>
          <div>
            <h3 className="text-xl font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
              {meta.label}
            </h3>
            <p className="text-sm" style={{ color: `${meta.accent}dd` }}>{meta.tagline}</p>
          </div>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${meta.accent}22`, border: `1px solid ${meta.accent}44` }}
        >
          <TrendingUp className="w-4 h-4" style={{ color: meta.accent }} />
        </div>
      </div>

      <p className="relative text-base leading-relaxed" style={{ color: 'rgba(224,216,200,0.82)' }}>
        {meta.description}
      </p>

      {!!stats?.length && (
        <div
          className="relative grid grid-cols-3 gap-4 pt-3 border-t"
          style={{ borderColor: `${meta.accent}22` }}
        >
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-lg font-bold" style={{ color: '#F5F1E7' }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'rgba(224,216,200,0.56)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <button
        className="relative w-full rounded-xl py-3 text-sm font-semibold"
        style={{
          background: `linear-gradient(135deg, ${meta.accent}33, ${meta.accent}20)`,
          border: `1px solid ${meta.accent}44`,
          color: meta.accent,
        }}
      >
        Open {meta.label} →
      </button>
    </div>
  );
}

function ExpandingSoonRow({ meta }) {
  const icon = MODULE_ICONS?.[meta.key];
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        opacity: 0.82,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: meta.accentBg, border: `1px solid ${meta.accentBorder}` }}
      >
        <img src={icon} alt={meta.label} className="w-7 h-7 object-contain opacity-70" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="text-base font-semibold" style={{ color: 'rgba(224,216,200,0.72)' }}>{meta.label}</h3>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(224,216,200,0.45)',
            }}
          >
            Expanding Soon
          </span>
        </div>
        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.42)' }}>{meta.description}</p>
      </div>
      <Clock3 className="w-4 h-4" style={{ color: 'rgba(224,216,200,0.28)' }} />
    </div>
  );
}

function QuickAction({ label, icon: Icon, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-150 active:scale-95 hover:opacity-90 text-center"
      style={{
        background: 'linear-gradient(145deg, rgba(42,30,20,0.92), rgba(28,20,14,0.96))',
        border: `1px solid ${accent}35`,
        minWidth: 84,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}22`, border: `1px solid ${accent}35` }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <span className="text-xs font-medium leading-tight" style={{ color: 'rgba(224,216,200,0.8)' }}>
        {label}
      </span>
    </button>
  );
}

export default function CollectionHub() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const {
    enabledModules,
    expandingSoonModules,
    isLoading: modulesLoading,
  } = useEnabledKeeperModules();

  const userEmail = user?.email || null;

  const { data: pipes = [], isLoading: pipesLoading } = useQuery({
    queryKey: ['hub-pipes', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const result = await base44.entities.Pipe.filter({ created_by: userEmail }, '-created_date', 500);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!userEmail,
    staleTime: 60000,
  });

  const { data: blends = [], isLoading: blendsLoading } = useQuery({
    queryKey: ['hub-blends', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const result = await base44.entities.TobaccoBlend.filter({ created_by: userEmail }, '-created_date', 500);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!userEmail,
    staleTime: 60000,
  });

  const { data: smokingLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['hub-smoking-logs', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const result = await base44.entities.SmokingLog.filter({ created_by: userEmail }, '-date', 5000);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!userEmail,
    staleTime: 60000,
  });

  const statsLoading = pipesLoading || blendsLoading || logsLoading || modulesLoading;

  const totalValue = useMemo(
    () => pipes.reduce((sum, p) => sum + (Number(p?.estimated_value) || 0), 0),
    [pipes]
  );

  const longestStreak = useMemo(() => calcLongestStreak(smokingLogs), [smokingLogs]);
  const avgPerWeek = useMemo(() => calcAveragePerWeek(smokingLogs), [smokingLogs]);
  const { mostSmokedPipe, favoriteBlend } = useMemo(
    () => getPipeHighlights(pipes, blends, smokingLogs),
    [pipes, blends, smokingLogs]
  );

  const ambientImage = useMemo(
    () =>
      pickImage(
        mostSmokedPipe?.image,
        favoriteBlend?.image,
        pipes.find((p) => pickImage(p.photos, p.photo))?.photos,
        blends.find((b) => pickImage(b.logo, b.photo, b.photos))?.logo,
      ),
    [mostSmokedPipe, favoriteBlend, pipes, blends]
  );

  const openableCards = useMemo(() => {
    return enabledModules
      .filter((m) => m.moduleKey === 'pipekeeper')
      .map((m) => ({
        meta: MODULE_META[m.moduleKey],
        stats: [
          { label: 'Pipes', value: pipes.length },
          { label: 'Blends', value: blends.length },
          { label: 'Sessions', value: smokingLogs.length },
        ],
      }))
      .filter((c) => c.meta);
  }, [enabledModules, pipes.length, blends.length, smokingLogs.length]);

  const expandingCards = useMemo(() => {
    return expandingSoonModules
      .map((m) => MODULE_META[m.moduleKey])
      .filter(Boolean)
      .sort((a, b) => {
        const order = ['whiskeykeeper', 'winekeeper', 'cigarkeeper'];
        return order.indexOf(a.key) - order.indexOf(b.key);
      });
  }, [expandingSoonModules]);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-8">
      <div
        className="rounded-3xl p-6 sm:p-8"
        style={{
          background: 'linear-gradient(145deg, rgba(42,30,20,0.72), rgba(28,20,14,0.9))',
          border: '1px solid rgba(139,98,57,0.26)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.32), inset 0 1px 0 rgba(180,140,100,0.08)',
        }}
      >
        <div className="flex items-center gap-4">
          <BrandLogo compact showWordmark={false} imageClassName="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0" />
          <div>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif", textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}
            >
              CollectionKeeper
            </h1>
            <p className="text-base mt-1" style={{ color: 'rgba(224,216,200,0.74)' }}>
              Your premium collector ecosystem
            </p>
          </div>
        </div>
      </div>

      <section>
        <SectionTitle>Collection Overview</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatusCard
            label="Total Sessions"
            value={statsLoading ? '—' : smokingLogs.length}
            sub={`${Math.max(0, smokingLogs.filter((l) => {
              if (!l?.date) return false;
              const d = new Date(l.date);
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              return d >= oneWeekAgo;
            }).length)} this week`}
            icon={Flame}
            accent={CATEGORY_COLORS.activity}
            bgImage={ambientImage}
          />
          <StatusCard
            label="Pipes"
            value={statsLoading ? '—' : pipes.length}
            icon={Layers}
            accent={CATEGORY_COLORS.pipe}
            bgImage={ambientImage}
          />
          <StatusCard
            label="Blends"
            value={statsLoading ? '—' : blends.length}
            sub="In cellar"
            icon={Leaf}
            accent={CATEGORY_COLORS.tobacco}
            bgImage={ambientImage}
          />
          <StatusCard
            label="Total Value"
            value={statsLoading ? '—' : formatCurrency(totalValue)}
            icon={TrendingUp}
            accent={CATEGORY_COLORS.value}
            bgImage={ambientImage}
            className="md:col-span-1 xl:col-span-1"
          />
          <StatusCard
            label="Longest Streak"
            value={statsLoading ? '—' : `${longestStreak}d`}
            sub="consecutive days"
            icon={Clock3}
            accent="#9B6B5F"
            bgImage={ambientImage}
          />
          <StatusCard
            label="Avg / Week"
            value={statsLoading ? '—' : avgPerWeek}
            sub="sessions / week"
            icon={CalendarDays}
            accent="#B48C4B"
            bgImage={ambientImage}
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <SectionTitle>Your Collections</SectionTitle>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {openableCards.map(({ meta, stats }) => (
            <ActiveModuleCard
              key={meta.key}
              meta={meta}
              stats={stats}
              bgImage={ambientImage}
              onNavigate={() => navigate(createPageUrl(meta.route))}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle muted>Expanding Soon</SectionTitle>
        <div className="space-y-3">
          {expandingCards.map((meta) => (
            <ExpandingSoonRow key={meta.key} meta={meta} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Quick Actions</SectionTitle>
        <div className="flex flex-wrap gap-3">
          <QuickAction label="Add Pipe" icon={Plus} accent="#c49a5a" onClick={() => navigate('/Pipes?action=add')} />
          <QuickAction label="Add Blend" icon={Plus} accent="#9a8b6a" onClick={() => navigate('/Tobacco?action=add')} />
          <QuickAction label="Log Smoke" icon={Flame} accent="#a35c5c" onClick={() => navigate('/Home')} />
          <QuickAction label="View Pipes" icon={Layers} accent="#c49a5a" onClick={() => navigate(createPageUrl('PipeKeeper'))} />
          <QuickAction label="Open Curator" icon={Target} accent="#c46a6a" onClick={() => navigate(createPageUrl('Curator'))} />
        </div>
      </section>

      {(mostSmokedPipe || favoriteBlend) && (
        <section>
          <div className="flex items-center justify-between gap-4 mb-4">
            <SectionTitle>Top Highlights</SectionTitle>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(180,140,75,0.34)',
                  color: '#F5F1E7',
                }}
                onClick={() => navigate(createPageUrl('Story'))}
              >
                View Story
              </button>
              <button
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, rgba(196,154,90,0.92), rgba(180,140,75,0.92))',
                  border: '1px solid rgba(180,140,75,0.44)',
                  color: '#2B1D12',
                }}
                onClick={() => navigate(createPageUrl('Insights'))}
              >
                Share Insights
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {mostSmokedPipe && (
              <CatalogPlate
                title={mostSmokedPipe.title}
                value={mostSmokedPipe.value}
                subtitle={mostSmokedPipe.subtitle}
                heroImage={mostSmokedPipe.image}
                bgImage={mostSmokedPipe.image}
                accent="#C87941"
                onClick={() => navigate(createPageUrl('Insights'))}
              />
            )}
            {favoriteBlend && (
              <CatalogPlate
                title={favoriteBlend.title}
                value={favoriteBlend.value}
                subtitle={favoriteBlend.subtitle}
                heroImage={favoriteBlend.image}
                bgImage={favoriteBlend.image}
                accent="#5A7C5A"
                onClick={() => navigate(createPageUrl('Insights'))}
              />
            )}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Collection Intelligence</SectionTitle>
        <div
          className="rounded-2xl p-5 flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, rgba(163,92,92,0.12), rgba(28,20,14,0.97))',
            border: '1px solid rgba(163,92,92,0.28)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
          onClick={() => navigate(createPageUrl('Curator'))}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(163,92,92,0.18)', border: '1px solid rgba(163,92,92,0.3)' }}
            >
              <Target className="w-6 h-6" style={{ color: '#c46a6a' }} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-0.5" style={{ color: '#F5F1E7' }}>AI Curator</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.72)' }}>
                Get personalized insights, rotation advice, and collection recommendations.
              </p>
            </div>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(163,92,92,0.18)', border: '1px solid rgba(163,92,92,0.3)' }}
          >
            <TrendingUp className="w-5 h-5" style={{ color: '#c46a6a' }} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Recent Activity</SectionTitle>
        <RecentActivity />
      </section>
    </div>
  );
}
