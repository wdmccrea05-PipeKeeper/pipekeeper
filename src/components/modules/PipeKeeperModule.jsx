import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Leaf, BookOpen, TrendingUp, Plus, Search, Camera, Target } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatWeight } from '@/components/utils/localeFormatters';
import { calculateCellaredOzFromLogs } from '@/components/utils/tobaccoQuantityHelpers';
import PipeKeeperModuleNav from './PipeKeeperModuleNav';
import CatalogPlate from '@/components/home/CatalogPlate';
import ModuleQuickLaunch from './ModuleQuickLaunch';
import QuickSearchPipe from '@/components/ai/QuickSearchPipe';
import { useProfilePrivacy } from '@/components/hooks/useProfilePrivacy';

const CURATOR_ICON = "https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png";

export default function PipeKeeperModule() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const { hideValues, hideCollectionCounts } = useProfilePrivacy();
  const queryClient = useQueryClient();
  
  const [showQuickSearch, setShowQuickSearch] = useState(false);



  // Fetch data
  const { data: pipes = [] } = useQuery({
    queryKey: ['pipes-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Pipe.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['blends-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: cellarLogs = [] } = useQuery({
    queryKey: ['cellar-logs', user?.email],
    queryFn: () => base44.entities.CellarLog.filter({ created_by: user?.email }),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: smokingLogs = [] } = useQuery({
    queryKey: ['smoking-logs-summary', user?.email],
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date'),
    enabled: !!user?.email,
    staleTime: 60000,
  });

  // Calculate metrics
  const totalPipeValue = useMemo(() => {
    return pipes.reduce((sum, p) => {
      const val = Number(p?.estimated_value) || 0;
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
  }, [pipes]);

  const totalCellaredOz = useMemo(() => calculateCellaredOzFromLogs(cellarLogs), [cellarLogs]);
  
  const mostSmokedPipe = useMemo(() => {
    if (!smokingLogs.length || !pipes.length) return null;
    const pipeCounts = {};
    smokingLogs.forEach((log) => {
      pipeCounts[log.pipe_id] = (pipeCounts[log.pipe_id] || 0) + (log.bowls_used || 1);
    });
    const topId = Object.entries(pipeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return pipes.find((p) => p.id === topId);
  }, [pipes, smokingLogs]);

  const mostValuablePipe = useMemo(() => {
    const withValue = pipes.filter(p => (Number(p?.estimated_value) || 0) > 0);
    if (!withValue.length) return null;
    return withValue.sort((a, b) => (Number(b.estimated_value) || 0) - (Number(a.estimated_value) || 0))[0] || null;
  }, [pipes]);

  const favoriteBlends = useMemo(() => blends.filter(b => b?.is_favorite), [blends]);

  const handlePipeAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['pipes-summary'] });
    queryClient.invalidateQueries({ queryKey: ['pipes'] });
  };

  const quickLaunchActions = [
    {
      key: 'addPipe',
      usePipeIcon: true,
      label: t('quickActions.addPipe'),
      onClick: () => navigate('/Pipes?action=add')
    },
    {
      key: 'addBlend',
      Icon: Leaf,
      label: t('quickActions.addBlend'),
      onClick: () => navigate('/Tobacco?action=add')
    },
    {
      key: 'quickSearch',
      Icon: Search,
      label: t('quickActions.quickSearchPipe'),
      onClick: () => setShowQuickSearch(true)
    },
    {
      key: 'logSession',
      Icon: BookOpen,
      label: t('quickActions.logSession'),
      onClick: () => navigate('/Home')
    },
    {
      key: 'curator',
      iconImage: CURATOR_ICON,
      label: t('quickActions.collectionCurator'),
      onClick: () => navigate('/Curator')
    },
    {
      key: 'insights',
      Icon: TrendingUp,
      label: t('quickActions.insights'),
      onClick: () => navigate('/Insights')
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <img
              src="/branding/pipekeeper-logo.png?v=1"
              alt="PipeKeeper"
              className="w-11 h-11 object-contain"
              style={{
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.28))',
                backgroundColor: 'transparent',
              }}
              draggable={false}
            />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif", textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}>
              {t('pipekeeper.title') || 'PipeKeeper'}
            </h1>
          </div>
          <p className="text-base sm:pl-14" style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
            {t('pipekeeper.description') || 'Organize and explore your pipe and tobacco collection'}
          </p>
        </div>
        <Button onClick={() => navigate('/CollectionHub')} variant="ghost" className="text-sm text-[#E0D8C8] hover:bg-white/10">
           {t('common.backToHub') || 'Back to Hub'}
        </Button>
      </div>

      {/* Module Navigation - landing has no active tab */}
      <PipeKeeperModuleNav currentPageName={null} />

      {/* Summary Cards */}
      <div className="rounded-lg p-5" style={{
        background: 'linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))',
        border: '1px solid rgba(120, 90, 65, 0.3)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)'
      }}>
        <h2 className="text-sm uppercase tracking-[0.12em] font-semibold mb-4" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
          {t('home.collectionSummary') || 'Collection Summary'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('home.totalValue') || 'Total Value'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#D4A574' }}>
              {hideValues ? '—' : formatCurrency(Math.round(totalPipeValue))}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('home.pipesInCollection') || 'Pipes'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#B48C4B' }}>
              {hideCollectionCounts ? '—' : pipes.length}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('home.tobaccoBlends') || 'Blends'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#5A7C5A' }}>
              {hideCollectionCounts ? '—' : blends.length}
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

      {/* Quick Launch */}
      <ModuleQuickLaunch actions={quickLaunchActions} />

      {/* Highlights */}
      {(mostSmokedPipe || mostValuablePipe || favoriteBlends.length > 0) && (
        <div>
          <h2 className="text-sm uppercase tracking-[0.12em] font-semibold mb-4" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
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
            {mostValuablePipe && !hideValues && (
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

      {/* Quick Search Modal */}
      <QuickSearchPipe 
        open={showQuickSearch} 
        onOpenChange={setShowQuickSearch}
        onAdd={handlePipeAdded}
      />
    </div>
  );
}