import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import CigarKeeperModuleNav from '@/components/modules/CigarKeeperModuleNav';
import CigarInsights from '@/components/cigars/CigarInsights';

function CigarInsightsInner() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();

  const { data: cigars = [], isLoading: cigarsLoading } = useQuery({
    queryKey: ['cigars-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.Cigar.filter(
        { created_by: user?.email },
        '-created_date'
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['cigar-sessions-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.CigarSession.filter(
        { created_by: user?.email },
        '-date'
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: humidors = [] } = useQuery({
    queryKey: ['humidors-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.HumidorLocation.filter(
        { created_by: user?.email }
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const isLoading = cigarsLoading || sessionsLoading;

  return (
    <div className="space-y-6 text-[#F5F1E7]">
      <CigarKeeperModuleNav currentPageName="CigarInsights" />

      <div>
        <h1 className="text-4xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>
          {t('nav.insights', 'Cigar Insights')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
          {t('cigars.insightsDescription', 'Analytics and trends from your cigar collection and sessions')}
        </p>
      </div>

      {isLoading ? (
        <p style={{ color: 'rgba(224,216,200,0.6)' }}>Loading…</p>
      ) : (
        <CigarInsights cigars={cigars} sessions={sessions} humidors={humidors} />
      )}
    </div>
  );
}

export default function CigarInsightsPage() {
  return (
    <LockedModuleGuard moduleKey="cigarkeeper">
      <CigarInsightsInner />
    </LockedModuleGuard>
  );
}
