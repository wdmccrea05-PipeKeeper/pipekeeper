import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Leaf, BookOpen, TrendingUp, Sparkles, List } from 'lucide-react';
import PipeIdentifier from '@/components/ai/PipeIdentifier';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { base44 } from '@/api/base44Client';
import { formatWeight } from '@/components/utils/localeFormatters';
import { useCurrency } from '@/lib/currency/useCurrency';
import { calculateCellaredOzFromBlend } from '@/components/utils/tobaccoQuantityHelpers';
import { checkFreeTierLimit } from '@/components/utils/freeTierLimits';
import PipeKeeperModuleNav from './PipeKeeperModuleNav';
import CatalogPlate from '@/components/home/CatalogPlate';
import ModuleQuickLaunch from './ModuleQuickLaunch';
import { useProfilePrivacy } from '@/components/hooks/useProfilePrivacy';
import AddFlowModal from '@/components/addflow/AddFlowModal';
import LogSessionModal from '@/components/home/LogSessionModal';
import FreeTierUpgradePrompt from '@/components/subscription/FreeTierUpgradePrompt';
import { hasModuleProAccess } from '@/components/utils/moduleEntitlements';

const CURATOR_ICON = "https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png";

export default function PipeKeeperModule() {
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const { user, isLoading: isUserLoading } = useCurrentUser();
  const { hideValues, hideCollectionCounts } = useProfilePrivacy();
  const queryClient = useQueryClient();
  
  const [showSmokingLog, setShowSmokingLog] = useState(false);
  const [showIdentifier, setShowIdentifier] = useState(params.get('action') === 'identify');
  const [addFlowOpen, setAddFlowOpen] = useState(false);
  const [addFlowType, setAddFlowType] = useState(null);

  // Fetch data
  const { data: pipes = [], isLoading: pipesLoading } = useQuery({
    queryKey: ['pipes-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Pipe.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: blends = [], isLoading: blendsLoading } = useQuery({
    queryKey: ['blends-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  // Open LogSessionModal from URL param only after user and collection data are ready
  const actionParam = params.get('action');
  useEffect(() => {
    const canShowModal = actionParam === 'log-smoke' && !isUserLoading && !!user?.email && !pipesLoading && !blendsLoading;
    if (canShowModal) {
      setShowSmokingLog(true);
    }
  }, [actionParam, isUserLoading, user?.email, pipesLoading, blendsLoading]);

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

  const totalCellaredOz = useMemo(() => blends.reduce((sum, b) => sum + calculateCellaredOzFromBlend(b), 0), [blends]);

  const hasPipekeeperPro = hasModuleProAccess(user, 'pipekeeper');
  const pipeLimit = checkFreeTierLimit('pipekeeper', 'pipes', pipes.length, user);
  const blendLimit = checkFreeTierLimit('pipekeeper', 'blends', blends.length, user);
  
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

  // Clear query param when modal closes
  const handleSmokingLogClose = () => {
    setShowSmokingLog(false);
    navigate(location.pathname, { replace: true });
  };

  const quickLaunchActions = [
    {
      key: 'addPipe',
      usePipeIcon: true,
      label: t('quickActions.addPipe'),
      onClick: () => { setAddFlowType('pipe'); setAddFlowOpen(true); }
    },
    {
      key: 'addBlend',
      Icon: Leaf,
      label: t('quickActions.addBlend'),
      onClick: () => { setAddFlowType('blend'); setAddFlowOpen(true); }
    },

    {
      key: 'logSession',
      Icon: BookOpen,
      label: t('quickActions.logSession'),
      onClick: () => {
        // Wait until collection data is loaded before opening the session modal.
        // If still loading, open anyway — the modal will show a loading state.
        setShowSmokingLog(true);
        navigate(location.pathname + '?action=log-smoke', { replace: true });
      }
    },
    {
      key: 'identifyPipe',
      Icon: Sparkles,
      label: t('quickActions.identifyPipe'),
      onClick: () => setShowIdentifier(true)
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
    },
    {
      key: 'wantList',
      Icon: List,
      label: t('nav.wantList'),
      onClick: () => navigate(createPageUrl('WantList'))
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
              alt={t('pipekeeper.title')}
              className="w-11 h-11 object-contain"
              style={{
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.28))',
                backgroundColor: 'transparent',
              }}
              draggable={false}
            />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif", textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}>
              {t('pipekeeper.title')}
            </h1>
          </div>
          <p className="text-base sm:pl-14" style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
            {t('pipekeeper.description')}
          </p>
        </div>
        <Button onClick={() => navigate('/CollectionHub')} variant="ghost" className="text-sm text-[#E0D8C8] hover:bg-white/10">
           {t('common.backToHub')}
        </Button>
      </div>

      {/* Module Navigation - landing has no active tab */}
      <PipeKeeperModuleNav currentPageName={null} />

      {/* Free Tier Limit Warnings */}
      {pipeLimit.atLimit && !hasPipekeeperPro && (
        <FreeTierUpgradePrompt
          moduleId="pipekeeper"
          title={t('pipekeeper.pipeLimitReachedTitle')}
          description={t('pipekeeper.pipeLimitReachedDescription', { limit: pipeLimit.limit })}
        />
      )}
      {blendLimit.atLimit && !hasPipekeeperPro && (
        <FreeTierUpgradePrompt
          moduleId="pipekeeper"
          title={t('pipekeeper.blendLimitReachedTitle')}
          description={t('pipekeeper.blendLimitReachedDescription', { limit: blendLimit.limit })}
        />
      )}

      {/* Summary Cards */}
      <div className="rounded-lg p-5" style={{
        background: 'linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))',
        border: '1px solid rgba(120, 90, 65, 0.3)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)'
      }}>
        <h2 className="text-sm uppercase tracking-[0.12em] font-semibold mb-4" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
          {t('home.collectionSummary')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('home.totalValue')}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#D4A574' }}>
              {hideValues ? '—' : formatFromBase(Math.round(totalPipeValue))}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('home.pipesInCollection')}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#B48C4B' }}>
              {hideCollectionCounts ? '—' : pipes.length}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('home.tobaccoBlends')}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#5A7C5A' }}>
              {hideCollectionCounts ? '—' : blends.length}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('home.cellared')}
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
            {t('home.highlights')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mostSmokedPipe && (
              <CatalogPlate
                title={t('home.mostSmoked')}
                value={mostSmokedPipe.name}
                subtitle={mostSmokedPipe.maker}
                heroImage={mostSmokedPipe.photos?.[0]}
                bgImage={mostSmokedPipe.photos?.[0]}
                accent="#C87941"
                onClick={() => navigate(createPageUrl(`PipeDetail?id=${encodeURIComponent(mostSmokedPipe.id)}`))}
              />
            )}
            {mostValuablePipe && !hideValues && (
              <CatalogPlate
                title={t('home.mostValuable')}
                value={formatFromBase(mostValuablePipe.estimated_value)}
                subtitle={mostValuablePipe.name}
                heroImage={mostValuablePipe.photos?.[0]}
                bgImage={mostValuablePipe.photos?.[0]}
                accent="#B4824B"
                onClick={() => navigate(createPageUrl(`PipeDetail?id=${encodeURIComponent(mostValuablePipe.id)}`))}
              />
            )}
            {favoriteBlends.length > 0 && (
              <CatalogPlate
                title={t('home.favoriteBlend')}
                value={favoriteBlends[0].name}
                subtitle={favoriteBlends[0].manufacturer}
                heroImage={favoriteBlends[0].logo || favoriteBlends[0].photo}
                bgImage={favoriteBlends[0].logo || favoriteBlends[0].photo}
                accent="#5A7C5A"
                onClick={() => navigate(createPageUrl(`TobaccoDetail?id=${encodeURIComponent(favoriteBlends[0].id)}`))}
              />
            )}
          </div>
        </div>
      )}

      {/* AI Pipe Identifier Modal */}
      {showIdentifier && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowIdentifier(false)}>
          <div className="flex items-center justify-center min-h-screen p-4" onClick={(e) => e.stopPropagation()}>
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#E0D8C8] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#F0C58A]" /> {t('quickPipeIdentifier.title')}
                </h2>
                <button onClick={() => setShowIdentifier(false)} className="text-[#E0D8C8]/70 hover:text-[#E0D8C8] text-2xl">×</button>
              </div>
              <PipeIdentifier />
            </div>
          </div>
        </div>
      )}

      <LogSessionModal
        isOpen={showSmokingLog}
        onClose={handleSmokingLogClose}
        pipes={pipes}
        blends={blends}
        user={user}
        isLoading={pipesLoading || blendsLoading}
      />

      {/* Add Flow Modal */}
      <AddFlowModal
        open={addFlowOpen}
        onClose={() => { setAddFlowOpen(false); setAddFlowType(null); }}
        initialItemType={addFlowType}
        onCreated={() => { 
          handlePipeAdded();
          setAddFlowOpen(false);
          setAddFlowType(null);
        }}
      />
    </div>
  );
}
