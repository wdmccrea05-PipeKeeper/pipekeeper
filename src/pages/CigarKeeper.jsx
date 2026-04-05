import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { Cigarette, Plus, BarChart3, BookOpen, Grid3X3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import CigarKeeperModuleNav from '@/components/modules/CigarKeeperModuleNav';
import ModuleQuickLaunch from '@/components/modules/ModuleQuickLaunch';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import CigarHighlightCard from '@/components/cigars/CigarHighlightCard';
import CigarSessionModal from '@/components/cigars/CigarSessionModal';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function RecentSessionCard({ session }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(140,107,63,0.28)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
            {session.external_cigar_name || session.cigar_name || 'Unnamed Cigar'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {formatDate(session.date)}
            {session.occasion ? ` · ${session.occasion}` : ''}
          </p>
          {session.notes && (
            <p
              className="text-xs mt-2 line-clamp-2"
              style={{ color: 'rgba(224,216,200,0.72)' }}
            >
              {session.notes}
            </p>
          )}
        </div>
        {session.overall_enjoyment > 0 && (
          <div className="shrink-0 text-right">
            <span className="text-base font-bold" style={{ color: '#D4A574' }}>
              {session.overall_enjoyment}
            </span>
            <span className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>/10</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CigarKeeperInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  const { data: cigars = [] } = useQuery({
    queryKey: ['cigars-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Cigar.filter(
        { created_by: user?.email },
        '-created_date'
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['cigar-sessions-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.CigarSession.filter(
        { created_by: user?.email },
        '-date',
        10
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: humidors = [] } = useQuery({
    queryKey: ['humidors-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.HumidorLocation.filter(
        { created_by: user?.email }
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const recentSessions = sessions.slice(0, 5);

  const quickLaunchActions = [
    {
      key: 'addCigar',
      Icon: Plus,
      label: t('cigars.addCigar', 'Add Cigar'),
      onClick: () => navigate('/Cigars?action=add'),
    },
    {
      key: 'browseCollection',
      Icon: Cigarette,
      label: t('cigars.collection', 'Browse Collection'),
      onClick: () => navigate('/Cigars'),
    },
    {
      key: 'logSession',
      Icon: BookOpen,
      label: t('cigars.logSession', 'Log Session'),
      onClick: () => setSessionModalOpen(true),
    },
    {
      key: 'humidorManager',
      Icon: Grid3X3,
      label: t('cigars.humidors', 'Humidor Manager'),
      onClick: () => navigate('/Cigars?tab=humidors'),
    },
    {
      key: 'insights',
      Icon: BarChart3,
      label: t('nav.insights', 'Insights'),
      onClick: () => navigate('/CigarInsights'),
    },
  ];

  return (
    <div className="space-y-8 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(140,107,63,0.4), rgba(100,74,45,0.5))',
                border: '1px solid rgba(140,107,63,0.45)',
              }}
            >
              <Cigarette className="w-6 h-6" style={{ color: '#D4A574' }} />
            </div>
            <h1
              className="text-2xl sm:text-4xl font-bold tracking-tight"
              style={{
                color: '#F5F1E7',
                fontFamily: "'Georgia', serif",
                textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                whiteSpace: 'nowrap',
              }}
            >
              {t('cigarkeeper.title', 'CigarKeeper')}
            </h1>
          </div>
          <p className="text-sm sm:text-base" style={{ color: 'rgba(224,216,200,0.75)' }}>
            {t('cigarkeeper.description', 'Track your cigar collection, humidors, and smoke sessions')}
          </p>
        </div>
        <Button
          onClick={() => navigate('/CollectionHub')}
          variant="outline"
          className="text-sm shrink-0"
        >
          {t('common.backToHub', 'Back to Hub')}
        </Button>
      </div>

      <CigarKeeperModuleNav currentPageName={null} />

      <CigarHighlightCard cigars={cigars} sessions={sessions} humidors={humidors} />

      <ModuleQuickLaunch actions={quickLaunchActions} />

      {recentSessions.length > 0 && (
        <div>
          <h2
            className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
            style={{ color: 'rgba(180,140,75,0.8)' }}
          >
            {t('cigars.recentSessions', 'Recent Sessions')}
          </h2>
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <RecentSessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      <CigarSessionModal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        onSessionSaved={() => setSessionModalOpen(false)}
      />
    </div>
  );
}

export default function CigarKeeper() {
  return (
    <LockedModuleGuard moduleKey="cigarkeeper">
      <CigarKeeperInner />
    </LockedModuleGuard>
  );
}
