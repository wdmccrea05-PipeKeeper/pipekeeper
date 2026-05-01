import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Leaf, BookOpen, TrendingUp, Sparkles, List } from 'lucide-react';
import PipeIcon from '@/components/icons/PipeIcon';
import PipeIdentifier from '@/components/ai/PipeIdentifier';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { base44 } from '@/api/base44Client';
import { formatWeight } from '@/components/utils/localeFormatters';
import { useCurrency } from '@/lib/currency/useCurrency';
import { calculateCellaredOzFromBlend } from '@/components/utils/tobaccoQuantityHelpers';
import { checkFreeTierLimit } from '@/components/utils/freeTierLimits';
import PipeKeeperModuleNav from './PipeKeeperModuleNav';
import ModuleHighlightsSection from './ModuleHighlightsSection';
import ModuleQuickLaunch from './ModuleQuickLaunch';
import ModulePageShell from './ModulePageShell';
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
  const { hideValues, hideCollectionCounts, personalHideTotals } = useProfilePrivacy();
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

  const pipeHighlights = useMemo(() => {
    const items = [];
    if (mostSmokedPipe) {
      items.push({
        key: 'mostSmoked',
        title: t('home.mostSmoked'),
        value: mostSmokedPipe.name,
        subtitle: mostSmokedPipe.maker,
        accent: '#C87941',
        photo: mostSmokedPipe.photos?.[0] || null,
        onClick: () => navigate(createPageUrl(`PipeDetail?id=${encodeURIComponent(mostSmokedPipe.id)}`)),
      });
    }
    if (mostValuablePipe && !personalHideTotals) {
      items.push({
        key: 'mostValuable',
        title: t('home.mostValuable'),
        value: formatFromBase(mostValuablePipe.estimated_value),
        subtitle: mostValuablePipe.name,
        accent: '#B4824B',
        photo: mostValuablePipe.photos?.[0] || null,
        onClick: () => navigate(createPageUrl(`PipeDetail?id=${encodeURIComponent(mostValuablePipe.id)}`)),
      });
    }
    if (favoriteBlends.length > 0) {
      items.push({
        key: 'favoriteBlend',
        title: t('home.favoriteBlend'),
        value: favoriteBlends[0].name,
        subtitle: favoriteBlends[0].manufacturer,
        accent: '#5A7C5A',
        photo: favoriteBlends[0].logo || favoriteBlends[0].photo || null,
        onClick: () => navigate(createPageUrl(`TobaccoDetail?id=${encodeURIComponent(favoriteBlends[0].id)}`)),
      });
    }
    return items;
  }, [mostSmokedPipe, mostValuablePipe, personalHideTotals, favoriteBlends, formatFromBase, navigate, t]);

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

  const pipeStats = [
    { label: t('home.totalValue'), value: personalHideTotals ? '—' : formatFromBase(Math.round(totalPipeValue)) },
    { label: t('home.pipesInCollection'), value: personalHideTotals ? '—' : pipes.length },
    { label: t('home.tobaccoBlends'), value: personalHideTotals ? '—' : blends.length },
    { label: t('home.cellared'), value: formatWeight(totalCellaredOz, 'oz') },
  ];

  return (
    <ModulePageShell
      title={t('pipekeeper.title')}
      subtitle={t('pipekeeper.description')}
      icon={<PipeIcon className="w-6 h-6" style={{ color: '#C89752' }} />}
      accentColor="#C89752"
      onBackToHub={() => navigate('/CollectionHub')}
      stats={pipeStats}
      moduleNav={<PipeKeeperModuleNav currentPageName={null} />}
      actions={<ModuleQuickLaunch actions={quickLaunchActions} />}
    >
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

      {/* Highlights */}
      <ModuleHighlightsSection highlights={pipeHighlights} />

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
    </ModulePageShell>
  );
}