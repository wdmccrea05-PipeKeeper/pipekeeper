import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Wind, Leaf, BookOpen, TrendingUp, Database, Heart, Sparkles, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatWeight } from '@/components/utils/localeFormatters';
import { calculateCellaredOzFromLogs } from '@/components/utils/tobaccoQuantityHelpers';
import CatalogPlate from '@/components/home/CatalogPlate';

const PIPE_ICON = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/15563e4ee_PipeiconUpdated-fotor-20260110195319.png";

export default function PipeKeeper() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const [showAddPipe, setShowAddPipe] = useState(false);

  // Module navigation items
  const moduleNavigation = [
    { name: t('nav.pipes') || 'Pipes', path: '/Pipes', icon: Wind },
    { name: t('nav.tobacco') || 'Tobacco', path: '/Tobacco', icon: Leaf },
    { name: t('nav.smokingLog') || 'Sessions', path: '/Sessions', icon: BookOpen },
    { name: t('nav.insights') || 'Insights', path: '/Insights', icon: TrendingUp },
  ];

  // Fetch pipes
  const { data: pipes = [] } = useQuery({
    queryKey: ['pipes-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Pipe.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  // Fetch blends
  const { data: blends = [] } = useQuery({
    queryKey: ['blends-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  // Fetch cellar logs
  const { data: cellarLogs = [] } = useQuery({
    queryKey: ['cellar-logs', user?.email],
    queryFn: () => base44.entities.CellarLog.filter({ created_by: user?.email }),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  // Fetch smoking logs
  const { data: smokingLogs = [] } = useQuery({
    queryKey: ['smoking-logs-summary', user?.email],
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date'),
    enabled: !!user?.email,
    staleTime: 60000,
  });

  // Calculate summary metrics
  const totalPipeValue = useMemo(() => {
    return pipes.reduce((sum, p) => {
      const val = Number(p?.estimated_value) || 0;
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
  }, [pipes]);

  const totalCellaredOz = useMemo(() => calculateCellaredOzFromLogs(cellarLogs), [cellarLogs]);
  const favoritePipes = useMemo(() => pipes.filter(p => p?.is_favorite), [pipes]);
  const favoriteBlends = useMemo(() => blends.filter(b => b?.is_favorite), [blends]);

  // Most smoked pipe
  const mostSmokedPipe = useMemo(() => {
    if (!smokingLogs.length || !pipes.length) return null;
    const pipeCounts = {};
    smokingLogs.forEach((log) => {
      pipeCounts[log.pipe_id] = (pipeCounts[log.pipe_id] || 0) + (log.bowls_used || 1);
    });
    const topId = Object.entries(pipeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return pipes.find((p) => p.id === topId);
  }, [pipes, smokingLogs]);

  // Most valuable pipe
  const mostValuablePipe = useMemo(() => {
    const withValue = pipes.filter(p => (Number(p?.estimated_value) || 0) > 0);
    if (!withValue.length) return null;
    return withValue.sort((a, b) => (Number(b.estimated_value) || 0) - (Number(a.estimated_value) || 0))[0] || null;
  }, [pipes]);

  return (
    <div className="space-y-8">
      {/* 1. HERO SECTION */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(100, 70, 45, 0.45), rgba(80, 55, 35, 0.55))',
                  border: '1px solid rgba(120, 90, 65, 0.45)',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.2)',
                }}
              >
                <Wind
                  className="w-5 h-5"
                  style={{
                    color: 'rgba(180, 140, 75, 1)',
                    filter: 'drop-shadow(0 0 4px rgba(180,140,75,0.7))',
                  }}
                />
              </div>
              <h1
                className="text-4xl font-bold tracking-tight"
                style={{
                  color: '#F5F1E7',
                  fontFamily: "'Georgia', serif",
                  textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                }}
              >
                {t('pipekeeper.title') || 'PipeKeeper'}
              </h1>
            </div>
            <p
              className="text-base pl-14"
              style={{ color: 'rgba(224, 216, 200, 0.75)' }}
            >
              {t('pipekeeper.description') || 'Organize and explore your pipe and tobacco collection'}
            </p>
          </div>
          <Button
            onClick={() => navigate('/CollectionHub')}
            variant="outline"
            className="text-sm"
          >
            {t('common.backToHub') || 'Back to Hub'}
          </Button>
        </div>
      </div>

      {/* 2. COLLECTION SUMMARY CARDS */}
      <div
        className="rounded-lg p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))',
          border: '1px solid rgba(120, 90, 65, 0.3)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)'
        }}
      >
        <h2
          className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
          style={{ color: 'rgba(180, 140, 75, 0.8)' }}
        >
          {t('home.collectionSummary') || 'Collection Summary'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('home.totalValue') || 'Total Value'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#D4A574' }}>
              {formatCurrency(Math.round(totalPipeValue))}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('home.pipesInCollection') || 'Pipes'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#B48C4B' }}>
              {pipes.length}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('home.tobaccoBlends') || 'Blends'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#5A7C5A' }}>
              {blends.length}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('home.cellared') || 'Cellared'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#B4824B' }}>
              {formatWeight(totalCellaredOz, 'oz')}
            </p>
          </div>
        </div>
      </div>

      {/* 3. COLLECTION HIGHLIGHTS */}
      {(mostSmokedPipe || mostValuablePipe || favoriteBlends.length > 0) && (
        <div>
          <h2
            className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
            style={{ color: 'rgba(180, 140, 75, 0.8)' }}
          >
            {t('home.highlights') || 'Collection Highlights'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mostSmokedPipe && (
              <CatalogPlate
                title={t('home.mostSmoked') || 'Most Smoked'}
                value={mostSmokedPipe.name}
                subtitle={mostSmokedPipe.maker}
                heroImage={mostSmokedPipe.photos?.[0]}
                bgImage={mostSmokedPipe.photos?.[0]}
                accent="#C87941"
                onClick={() => window.location.href = createPageUrl(`PipeDetail?id=${encodeURIComponent(mostSmokedPipe.id)}`)}
              />
            )}
            {mostValuablePipe && (
              <CatalogPlate
                title={t('home.mostValuable') || 'Most Valuable'}
                value={formatCurrency(mostValuablePipe.estimated_value)}
                subtitle={mostValuablePipe.name}
                heroImage={mostValuablePipe.photos?.[0]}
                bgImage={mostValuablePipe.photos?.[0]}
                accent="#B4824B"
                onClick={() => window.location.href = createPageUrl(`PipeDetail?id=${encodeURIComponent(mostValuablePipe.id)}`)}
              />
            )}
            {favoriteBlends.length > 0 && (
              <CatalogPlate
                title={t('home.favoriteBlend') || 'Favorite Blend'}
                value={favoriteBlends[0].name}
                subtitle={favoriteBlends[0].manufacturer}
                heroImage={favoriteBlends[0].logo || favoriteBlends[0].photo}
                bgImage={favoriteBlends[0].logo || favoriteBlends[0].photo}
                accent="#5A7C5A"
                onClick={() => window.location.href = createPageUrl(`TobaccoDetail?id=${encodeURIComponent(favoriteBlends[0].id)}`)}
              />
            )}
          </div>
        </div>
      )}

      {/* 4. QUICK ACTIONS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/Pipes')}
          className="p-4 rounded-xl text-left transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
            border: '1px solid rgba(180, 140, 75, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(180, 140, 75, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.2)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Wind className="w-5 h-5 mb-2" style={{ color: '#D4A574' }} />
          <p className="text-sm font-semibold text-[#E0D8C8]">{t('pipekeeper.addPipe') || 'Add Pipe'}</p>
          <p className="text-xs text-[#E0D8C8]/60 mt-1">{t('pipekeeper.expandPipeCollection') || 'Expand your collection'}</p>
        </button>

        <button
          onClick={() => navigate('/Tobacco')}
          className="p-4 rounded-xl text-left transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
            border: '1px solid rgba(180, 140, 75, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(180, 140, 75, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.2)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Leaf className="w-5 h-5 mb-2" style={{ color: '#5A7C5A' }} />
          <p className="text-sm font-semibold text-[#E0D8C8]">{t('pipekeeper.addBlend') || 'Add Blend'}</p>
          <p className="text-xs text-[#E0D8C8]/60 mt-1">{t('pipekeeper.expandTobaccoCollection') || 'Grow your cellar'}</p>
        </button>

        <button
          onClick={() => window.location.href = createPageUrl('Home')}
          className="p-4 rounded-xl text-left transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
            border: '1px solid rgba(180, 140, 75, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(180, 140, 75, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.2)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <BookOpen className="w-5 h-5 mb-2" style={{ color: '#C87941' }} />
          <p className="text-sm font-semibold text-[#E0D8C8]">{t('pipekeeper.logSession') || 'Log Session'}</p>
          <p className="text-xs text-[#E0D8C8]/60 mt-1">{t('pipekeeper.recordSmokingNotes') || 'Record your sessions'}</p>
        </button>

        <button
          onClick={() => window.location.href = createPageUrl('Curator')}
          className="p-4 rounded-xl text-left transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
            border: '1px solid rgba(180, 140, 75, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(180, 140, 75, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.2)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Sparkles className="w-5 h-5 mb-2" style={{ color: '#D4AF37' }} />
          <p className="text-sm font-semibold text-[#E0D8C8]">{t('pipekeeper.openCurator') || 'Open Curator'}</p>
          <p className="text-xs text-[#E0D8C8]/60 mt-1">{t('pipekeeper.optimizeCollection') || 'Get insights'}</p>
        </button>
      </div>

      {/* 5. FAVORITES */}
      {favoritePipes.length + favoriteBlends.length > 0 && (
        <div
          className="rounded-lg p-5"
          style={{
            background: 'linear-gradient(145deg, rgba(50, 35, 22, 0.68), rgba(38, 26, 18, 0.82))',
            border: '1px solid rgba(120, 90, 65, 0.28)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(180,140,100,0.09)'
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Heart className="w-4 h-4 fill-current" style={{ color: '#9B6B5F' }} />
            <h2
              className="text-base font-semibold"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              {t('home.favorites') || 'Favorites'}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {favoritePipes.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(60, 42, 28, 0.6), rgba(50, 35, 25, 0.7))',
                  border: '1px solid rgba(120, 90, 65, 0.25)',
                  borderRadius: '0.375rem',
                  color: '#F5F1E7',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}
              >
                <img
                  src={PIPE_ICON}
                  alt="pipe"
                  className="w-3.5 h-3.5 object-contain"
                  style={{
                    filter: 'brightness(0) invert(1) sepia(0.7) saturate(2.2) hue-rotate(20deg) brightness(0.9)',
                  }}
                />
                {item.name}
              </span>
            ))}
            {favoriteBlends.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(60, 42, 28, 0.6), rgba(50, 35, 25, 0.7))',
                  border: '1px solid rgba(120, 90, 65, 0.25)',
                  borderRadius: '0.375rem',
                  color: '#F5F1E7',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}
              >
                <Leaf className="w-3.5 h-3.5" style={{ color: 'rgba(90, 124, 90, 0.95)' }} />
                {item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 6. MODULE NAVIGATION */}
      <div>
        <h2
          className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
          style={{ color: 'rgba(180, 140, 75, 0.8)' }}
        >
          {t('pipekeeper.explore') || 'Explore'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moduleNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="p-6 rounded-2xl text-left transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
                  border: '1px solid rgba(180, 140, 75, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(180, 140, 75, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'rgba(212, 165, 116, 0.15)',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: '#D4A574' }} />
                  </div>
                  <h3 className="text-lg font-semibold text-[#E0D8C8]">{item.name}</h3>
                </div>
                <p className="text-sm text-[#E0D8C8]/60">
                  {t(`pipekeeper.${item.path.slice(1).toLowerCase()}Desc`) || t('pipekeeper.explore')}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. INSIGHTS REFERENCE */}
      {smokingLogs.length > 0 && (
        <a href={createPageUrl('Insights')} className="block">
          <div
            className="p-5 flex items-center gap-4 rounded-lg transition-all hover:scale-[1.01]"
            style={{
              background: 'linear-gradient(145deg, rgba(52, 37, 24, 0.7), rgba(40, 28, 18, 0.84))',
              border: '1px solid rgba(120, 90, 65, 0.3)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.1)'
            }}
          >
            <TrendingUp className="w-5 h-5 shrink-0" style={{ color: 'rgba(180, 140, 75, 0.85)' }} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm" style={{ color: '#F5F1E7' }}>
                {t('insights.title') || 'Collection Insights'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(224, 216, 200, 0.6)' }}>
                {smokingLogs.length} {t('pipekeeper.sessions') || 'sessions logged'}
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(180, 140, 75, 0.6)' }} />
          </div>
        </a>
      )}
    </div>
  );
}