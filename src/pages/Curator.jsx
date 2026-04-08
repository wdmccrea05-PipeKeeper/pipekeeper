/**
 * Curator Page
 *
 * New Curator — collection intelligence workflow.
 *
 * Loads all collection data, then renders CuratorWorkspace which
 * drives quick actions → structured grouped recommendations.
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';
import CuratorWorkspace from '@/components/curator/CuratorWorkspace';

export default function Curator() {
  const { user } = useCurrentUser();
  const { enabledModuleKeys = [] } = useEnabledModules() || {};
  const email = user?.email || null;

  const cigarModuleActive = enabledModuleKeys.includes('cigarkeeper');

  // ─── Fetch all collection data ──────────────────────────────────────────────

  const { data: pipes = [],        isLoading: loadingPipes }    = useQuery({
    queryKey: ['curatorCollection', 'pipes', email],
    enabled:  !!email,
    staleTime: 60_000,
    queryFn:  async () =>
      base44.entities.Pipe.filter({ created_by: email }, '-updated_date', 500).catch(() => []),
  });

  const { data: blends = [],       isLoading: loadingBlends }   = useQuery({
    queryKey: ['curatorCollection', 'blends', email],
    enabled:  !!email,
    staleTime: 60_000,
    queryFn:  async () =>
      base44.entities.TobaccoBlend.filter({ created_by: email }, '-updated_date', 500).catch(() => []),
  });

  const { data: bottles = [],      isLoading: loadingBottles }  = useQuery({
    queryKey: ['curatorCollection', 'bottles', email],
    enabled:  !!email && enabledModuleKeys.includes('whiskeykeeper'),
    staleTime: 60_000,
    queryFn:  async () =>
      base44.entities.Bottle.filter({ created_by: email }, '-updated_date', 500).catch(() => []),
  });

  const { data: cigars = [],       isLoading: loadingCigars }   = useQuery({
    queryKey: ['curatorCollection', 'cigars', email],
    enabled:  !!email && cigarModuleActive,
    staleTime: 60_000,
    queryFn:  async () =>
      base44.entities.Cigar.filter({ created_by: email }, '-updated_date', 500).catch(() => []),
  });

  const { data: smokingLogs = [],  isLoading: loadingLogs }     = useQuery({
    queryKey: ['curatorCollection', 'smokingLogs', email],
    enabled:  !!email,
    staleTime: 60_000,
    queryFn:  async () =>
      base44.entities.SmokingLog.filter({ created_by: email }, '-date', 1000).catch(() => []),
  });

  const { data: tastingLogs = [],  isLoading: loadingTastings } = useQuery({
    queryKey: ['curatorCollection', 'tastingLogs', email],
    enabled:  !!email && enabledModuleKeys.includes('whiskeykeeper'),
    staleTime: 60_000,
    queryFn:  async () =>
      base44.entities.TastingLog.filter({ created_by: email }, '-tasting_date', 250).catch(() => []),
  });

  const { data: cigarSessions = [], isLoading: loadingCigarSessions } = useQuery({
    queryKey: ['curatorCollection', 'cigarSessions', email],
    enabled:  !!email && cigarModuleActive,
    staleTime: 60_000,
    queryFn:  async () =>
      base44.entities.CigarSession.filter({ created_by: email }, '-date', 250).catch(() => []),
  });

  const { data: wantListItems = [], isLoading: loadingWantList } = useQuery({
    queryKey: ['curatorCollection', 'wantList', email],
    enabled:  !!email,
    staleTime: 60_000,
    queryFn:  async () =>
      base44.entities.AcquisitionItem.filter({ created_by: email }, '-created_date', 500).catch(() => []),
  });

  // ─── Loading state ───────────────────────────────────────────────────────────

  const isLoading =
    loadingPipes || loadingBlends || loadingBottles || loadingCigars ||
    loadingLogs || loadingTastings || loadingCigarSessions || loadingWantList;

  // ─── Collection context for engine ──────────────────────────────────────────

  const collectionContext = useMemo(() => ({
    pipes,
    blends,
    bottles,
    cigars,
    smokingLogs,
    tastingLogs,
    cigarSessions,
    wantListItems,
    cigarModuleActive,
  }), [pipes, blends, bottles, cigars, smokingLogs, tastingLogs, cigarSessions, wantListItems, cigarModuleActive]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1
          className="font-bold tracking-tight"
          style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif", fontSize: 'var(--ck-text-2xl)' }}
        >
          Collection Curator
        </h1>
        <p
          className="text-sm"
          style={{ color: 'rgba(224,216,200,0.55)' }}
        >
          Operational intelligence across your collection — fix, optimize, pair, and grow.
        </p>
      </div>

      <CuratorWorkspace
        collectionContext={collectionContext}
        isLoading={isLoading}
      />
    </div>
  );
}
