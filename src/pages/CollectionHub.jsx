import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';
import { shouldShowModuleInNav, isInternalModuleTester } from '@/components/utils/moduleReleaseState';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Clock, Plus, BookOpen, Target, Layers, TrendingUp, Flame, Star, Activity } from 'lucide-react';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';
import BrandLogo from '@/components/branding/BrandLogo';

const ALL_MODULES = ['pipekeeper', 'whiskeykeeper', 'winekeeper', 'cigarkeeper'];

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
    route: 'WhiskeyKeeper',
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

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent = '#c49a5a', loading }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2 min-w-0"
      style={{
        background: 'linear-gradient(145deg, rgba(42,30,20,0.95), rgba(28,20,14,0.98))',
        border: `1px solid ${accent}28`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}22` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
        <span className="text-xs font-medium truncate" style={{ color: 'rgba(224,216,200,0.6)' }}>
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: '#F5F1E7' }}>
        {loading ? (
          <div className="h-6 w-12 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
        ) : value}
      </div>
    </div>
  );
}

// ─── Openable Module Card ────────────────────────────────────────────────────
function ActiveModuleCard({ meta, stats, onNavigate }) {
  const icon = MODULE_ICONS?.[meta.key];
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 cursor-pointer transition-all duration-200 hover:scale-[1.01]"
      style={{
        background: `linear-gradient(145deg, ${meta.accentBg}, rgba(20,14,10,0.97))`,
        border: `1px solid ${meta.accentBorder}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 ${meta.accent}18`,
      }}
      onClick={onNavigate}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon ? (
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${meta.accentBg}`, border: `1px solid ${meta.accentBorder}` }}
            >
              <img src={icon} alt={meta.label} className="w-7 h-7 object-contain" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl flex-shrink-0" style={{ background: meta.accentBg }} />
          )}
          <div>
            <h3 className="text-base font-bold" style={{ color: '#F5F1E7' }}>{meta.label}</h3>
            <p className="text-xs" style={{ color: `${meta.accent}cc` }}>{meta.tagline}</p>
          </div>
        </div>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${meta.accent}22`, border: `1px solid ${meta.accent}44` }}
        >
          <ChevronRight className="w-4 h-4" style={{ color: meta.accent }} />
        </div>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.65)' }}>
        {meta.description}
      </p>

      {/* Stats row */}
      {stats && stats.length > 0 && (
        <div
          className="flex gap-3 pt-1 border-t"
          style={{ borderColor: `${meta.accent}20` }}
        >
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <span className="text-xs font-bold" style={{ color: '#F5F1E7' }}>{s.value}</span>
              <span className="text-[11px]" style={{ color: 'rgba(224,216,200,0.5)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div
        className="text-xs font-semibold py-2 px-4 rounded-lg text-center transition-all"
        style={{
          background: `linear-gradient(135deg, ${meta.accent}33, ${meta.accent}22)`,
          border: `1px solid ${meta.accent}44`,
          color: meta.accent,
        }}
      >
        Open {meta.label} →
      </div>
    </div>
  );
}

// ─── Expanding Soon Card ─────────────────────────────────────────────────────
function ExpandingSoonCard({ meta }) {
  const icon = MODULE_ICONS?.[meta.key];
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        opacity: 0.72,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${meta.accentBg}`, border: `1px solid ${meta.accentBorder}` }}
      >
        {icon ? (
          <img src={icon} alt={meta.label} className="w-6 h-6 object-contain opacity-60" />
        ) : (
          <div className="w-5 h-5 rounded-full" style={{ background: meta.accent + '44' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.6)' }}>{meta.label}</h3>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(224,216,200,0.45)',
            }}
          >
            Expanding Soon
          </span>
        </div>
        <p className="text-xs truncate" style={{ color: 'rgba(224,216,200,0.38)' }}>{meta.description}</p>
      </div>
      <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(224,216,200,0.25)' }} />
    </div>
  );
}

// ─── Quick Action Button ─────────────────────────────────────────────────────
function QuickAction({ label, icon: Icon, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-150 active:scale-95 hover:opacity-90 text-center"
      style={{
        background: `linear-gradient(145deg, rgba(42,30,20,0.9), rgba(28,20,14,0.95))`,
        border: `1px solid ${accent}30`,
        minWidth: 72,
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}20`, border: `1px solid ${accent}35` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color: accent }} />
      </div>
      <span className="text-xs font-medium leading-tight" style={{ color: 'rgba(224,216,200,0.75)' }}>
        {label}
      </span>
    </button>
  );
}

// ─── Curator Insight Card ────────────────────────────────────────────────────
function CuratorCard({ onOpen }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 hover:opacity-90"
      style={{
        background: 'linear-gradient(135deg, rgba(163,92,92,0.12), rgba(28,20,14,0.97))',
        border: '1px solid rgba(163,92,92,0.28)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
      onClick={onOpen}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(163,92,92,0.18)', border: '1px solid rgba(163,92,92,0.3)' }}
        >
          <Target className="w-6 h-6" style={{ color: '#c46a6a' }} />
        </div>
        <div>
          <h3 className="text-sm font-bold mb-0.5" style={{ color: '#F5F1E7' }}>AI Curator</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Get personalized insights, rotation advice, and collection recommendations.
          </p>
        </div>
      </div>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(163,92,92,0.18)', border: '1px solid rgba(163,92,92,0.3)' }}
      >
        <ChevronRight className="w-4 h-4" style={{ color: '#c46a6a' }} />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function CollectionHub() {
  const navigate = useNavigate();
  const { user, isAdmin } = useCurrentUser();
  const { isModuleEnabled, isLoading: moduleLoading } = useModuleVisibility();

  // Fetch pipe count
  const { data: pipes = [], isLoading: pipesLoading } = useQuery({
    queryKey: ['hub-pipes'],
    queryFn: () => base44.entities.Pipe.list('-created_date', 200),
    staleTime: 3 * 60 * 1000,
  });

  // Fetch blend count
  const { data: blends = [], isLoading: blendsLoading } = useQuery({
    queryKey: ['hub-blends'],
    queryFn: () => base44.entities.TobaccoBlend.list('-created_date', 200),
    staleTime: 3 * 60 * 1000,
  });

  // Fetch recent smoke logs
  const { data: smokeLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['hub-smokelogs'],
    queryFn: () => base44.entities.SmokingLog.list('-date', 5),
    staleTime: 3 * 60 * 1000,
  });

  const statsLoading = pipesLoading || blendsLoading || logsLoading || moduleLoading;

  // Module bucketing — release-state-aware
  const { accessible, expandingSoon } = useMemo(() => {
    const accessible = [];
    const expandingSoon = [];

    for (const key of ALL_MODULES) {
      const canAccess = shouldShowModuleInNav(key, user) || (isAdmin && isInternalModuleTester(user));
      const meta = MODULE_META[key];
      if (!meta) continue;

      if (canAccess && meta.route) {
        accessible.push({ meta });
      } else {
        expandingSoon.push({ meta });
      }
    }

    return { accessible, expandingSoon };
  }, [user, isAdmin, isModuleEnabled]);

  // Stat helpers
  const totalPipes = pipes.length;
  const totalBlends = blends.length;
  const activeModuleCount = accessible.length;
  const recentLog = smokeLogs[0];

  const pipeKeeperStats = [
    { value: totalPipes, label: 'Pipes' },
    { value: totalBlends, label: 'Blends' },
    { value: smokeLogs.length > 0 ? `${smokeLogs.length}` : '—', label: 'Recent Logs' },
  ];

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">

      {/* ── SECTION 1: HERO ── */}
      <div className="flex items-center gap-4 pt-1 pb-2">
        <BrandLogo
          compact
          showWordmark={false}
          imageClassName="w-12 h-12 flex-shrink-0"
        />
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#F5F1E7', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}
          >
            CollectionKeeper
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(224,216,200,0.55)' }}>
            Your premium collector ecosystem
          </p>
        </div>
      </div>

      {/* ── SECTION 2: COLLECTION OVERVIEW ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: '#8b6239' }}>
          Collection Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Pipes" value={totalPipes} icon={Layers} accent="#c49a5a" loading={statsLoading} />
          <StatCard label="Blends" value={totalBlends} icon={BookOpen} accent="#9a8b6a" loading={statsLoading} />
          <StatCard label="Active Modules" value={activeModuleCount} icon={Star} accent="#a35c5c" loading={moduleLoading} />
          <StatCard label="Recent Sessions" value={smokeLogs.length > 0 ? smokeLogs.length : '—'} icon={Flame} accent="#7a8b5c" loading={logsLoading} />
        </div>
      </section>

      {/* ── SECTION 3: YOUR COLLECTIONS ── */}
      {accessible.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: '#8b6239' }}>
            Your Collections
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {accessible.map(({ meta }) => (
              <ActiveModuleCard
                key={meta.key}
                meta={meta}
                stats={meta.key === 'pipekeeper' ? pipeKeeperStats : []}
                onNavigate={() => navigate(createPageUrl(meta.route))}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 4: EXPANDING SOON ── */}
      {expandingSoon.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: 'rgba(224,216,200,0.28)' }}>
            Expanding Soon
          </h2>
          <div className="flex flex-col gap-2">
            {expandingSoon.map(({ meta }) => (
              <ExpandingSoonCard key={meta.key} meta={meta} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 5: QUICK ACTIONS ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: '#8b6239' }}>
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction
            label="Add Pipe"
            icon={Plus}
            accent="#c49a5a"
            onClick={() => navigate('/PipeKeeper?action=add_pipe')}
          />
          <QuickAction
            label="Add Blend"
            icon={Plus}
            accent="#9a8b6a"
            onClick={() => navigate('/PipeKeeper?action=add_blend')}
          />
          <QuickAction
            label="Log Smoke"
            icon={Flame}
            accent="#a35c5c"
            onClick={() => navigate('/PipeKeeper?action=log_smoke')}
          />
          <QuickAction
            label="View Pipes"
            icon={Layers}
            accent="#c49a5a"
            onClick={() => navigate(createPageUrl('PipeKeeper'))}
          />
          <QuickAction
            label="Open Curator"
            icon={Target}
            accent="#c46a6a"
            onClick={() => navigate(createPageUrl('Curator'))}
          />
        </div>
      </section>

      {/* ── SECTION 6: CURATOR / INSIGHT PANEL ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: '#8b6239' }}>
          Collection Intelligence
        </h2>
        <CuratorCard onOpen={() => navigate(createPageUrl('Curator'))} />
      </section>

      {/* ── SECTION 7: RECENT ACTIVITY ── */}
      {recentLog && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: '#8b6239' }}>
            Recent Activity
          </h2>
          <div
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{
              background: 'linear-gradient(145deg, rgba(42,30,20,0.8), rgba(28,20,14,0.95))',
              border: '1px solid rgba(180,140,75,0.18)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(180,140,75,0.12)', border: '1px solid rgba(180,140,75,0.2)' }}
            >
              <Activity className="w-5 h-5" style={{ color: 'rgba(180,140,75,0.8)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#F5F1E7' }}>
                {recentLog.blend_name || 'Recent session'}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(224,216,200,0.5)' }}>
                {recentLog.pipe_name
                  ? `In ${recentLog.pipe_name}`
                  : 'Pipe session logged'}
                {recentLog.date
                  ? ` · ${new Date(recentLog.date).toLocaleDateString()}`
                  : ''}
              </p>
            </div>
            <button
              className="text-xs flex items-center gap-1 flex-shrink-0"
              style={{ color: 'rgba(180,140,75,0.7)' }}
              onClick={() => navigate(createPageUrl('PipeKeeper'))}
            >
              View <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}