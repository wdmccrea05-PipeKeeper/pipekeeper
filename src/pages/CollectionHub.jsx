import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';
import { shouldShowModuleInNav, isInternalModuleTester } from '@/components/utils/moduleReleaseState';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { Button } from '@/components/ui/button';
import { Home, ChevronRight, Clock } from 'lucide-react';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';

const MODULE_META = {
  pipekeeper: {
    key: 'pipekeeper',
    label: 'PipeKeeper',
    description: 'Manage your pipe collection, tobacco cellar, smoking logs, and AI pairings.',
    route: 'PipeKeeper',
    accent: '#8b6239',
    accentBg: 'rgba(139,98,57,0.18)',
    accentBorder: 'rgba(139,98,57,0.35)',
  },
  whiskeykeeper: {
    key: 'whiskeykeeper',
    label: 'WhiskeyKeeper',
    description: 'Track your whiskey collection with tasting notes, bottle inventory, and valuations.',
    route: 'WhiskeyKeeper',
    accent: '#a35c5c',
    accentBg: 'rgba(163,92,92,0.18)',
    accentBorder: 'rgba(163,92,92,0.35)',
  },
  winekeeper: {
    key: 'winekeeper',
    label: 'WineKeeper',
    description: 'Wine cellar management coming soon.',
    route: null,
    accent: '#7a5c8b',
    accentBg: 'rgba(122,92,139,0.18)',
    accentBorder: 'rgba(122,92,139,0.35)',
  },
  cigarkeeper: {
    key: 'cigarkeeper',
    label: 'CigarKeeper',
    description: 'Cigar collection curation coming soon.',
    route: null,
    accent: '#5c7a3a',
    accentBg: 'rgba(92,122,58,0.18)',
    accentBorder: 'rgba(92,122,58,0.35)',
  },
};

const ALL_MODULES = ['pipekeeper', 'whiskeykeeper', 'winekeeper', 'cigarkeeper'];

function ModuleCard({ meta, isEnabled, isAccessible, onNavigate }) {
  const isExpandingSoon = !isAccessible;
  const icon = MODULE_ICONS?.[meta.key];

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200"
      style={{
        background: isExpandingSoon
          ? 'rgba(255,255,255,0.03)'
          : `linear-gradient(135deg, ${meta.accentBg}, rgba(0,0,0,0.1))`,
        border: `1px solid ${isExpandingSoon ? 'rgba(255,255,255,0.08)' : meta.accentBorder}`,
        opacity: isExpandingSoon ? 0.6 : 1,
        cursor: isAccessible ? 'pointer' : 'default',
      }}
      onClick={isAccessible && meta.route ? onNavigate : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon ? (
            <img src={icon} alt={meta.label} className="w-8 h-8 object-contain" style={{ opacity: isExpandingSoon ? 0.5 : 1 }} />
          ) : (
            <div className="w-8 h-8 rounded-full" style={{ background: meta.accentBg }} />
          )}
          <div>
            <h3 className="font-semibold text-sm" style={{ color: isExpandingSoon ? 'rgba(224,216,200,0.5)' : '#F5F1E7' }}>
              {meta.label}
            </h3>
            {isExpandingSoon && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'rgba(224,216,200,0.4)' }}>
                <Clock className="w-3 h-3" /> Expanding Soon
              </span>
            )}
          </div>
        </div>
        {isAccessible && meta.route && (
          <ChevronRight className="w-4 h-4" style={{ color: meta.accent }} />
        )}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: isExpandingSoon ? 'rgba(224,216,200,0.35)' : 'rgba(224,216,200,0.7)' }}>
        {meta.description}
      </p>
    </div>
  );
}

export default function CollectionHub() {
  const navigate = useNavigate();
  const { user, isAdmin } = useCurrentUser();
  const { isModuleEnabled, isLoading } = useModuleVisibility();

  const { accessible, expandingSoon } = useMemo(() => {
    const accessible = [];
    const expandingSoon = [];

    for (const key of ALL_MODULES) {
      const canAccess = shouldShowModuleInNav(key, user) || (isAdmin && isInternalModuleTester(user));
      const meta = MODULE_META[key];
      if (!meta) continue;

      if (canAccess && meta.route) {
        accessible.push({ meta, isEnabled: isModuleEnabled(key) });
      } else {
        expandingSoon.push({ meta });
      }
    }

    return { accessible, expandingSoon };
  }, [user, isAdmin, isModuleEnabled]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8b6239]/40 border-t-[#8b6239] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,98,57,0.2)' }}>
          <Home className="w-4 h-4" style={{ color: '#D4A574' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F5F1E7' }}>Collection Hub</h1>
          <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>Your collections at a glance</p>
        </div>
      </div>

      {/* Active Modules */}
      {accessible.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: '#8b6239' }}>
            Your Collections
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {accessible.map(({ meta, isEnabled }) => (
              <ModuleCard
                key={meta.key}
                meta={meta}
                isEnabled={isEnabled}
                isAccessible
                onNavigate={() => navigate(createPageUrl(meta.route))}
              />
            ))}
          </div>
        </section>
      )}

      {/* Expanding Soon */}
      {expandingSoon.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: 'rgba(224,216,200,0.35)' }}>
            Expanding Soon
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {expandingSoon.map(({ meta }) => (
              <ModuleCard
                key={meta.key}
                meta={meta}
                isEnabled={false}
                isAccessible={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Quick nav to Curator */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all duration-200 hover:opacity-90"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(180,140,75,0.2)',
        }}
        onClick={() => navigate(createPageUrl('Curator'))}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>AI Curator</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.6)' }}>Get personalized collection insights</p>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#D4A574' }} />
      </div>
    </div>
  );
}