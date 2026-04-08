import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

import CuratorResultsBoard from '@/components/curator/CuratorResultsBoard';
import CuratorPairingsTab from '@/components/curator/CuratorPairingsTab';
import CuratorPurchaseQueue from '@/components/curator/CuratorPurchaseQueue';
import CuratorGrowAndExpand from '@/components/curator/CuratorGrowAndExpand';
import ExpertTobacconistChat from '@/components/agent/ExpertTobacconistChat';

import { generateRecommendations } from '@/lib/curator/recommendationEngine';
import { generatePairingRecommendations } from '@/lib/curator/pairingEngine';

export default function CuratorWorkspace({
  activeSurface,
  onSurfaceChange,
  onCountsChange,
}) {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [pairings, setPairings] = useState([]);
  const [threadId, setThreadId] = useState(null);

  // 🔥 FULL DATA LOADER (FIXED — NO EMPTY STATE)
  const buildContext = async () => {
    try {
      const [pipes, blends, bottles, logs] = await Promise.all([
        base44.entities.Pipe.list(),
        base44.entities.TobaccoBlend.list(),
        base44.entities.Bottle.list(),
        base44.entities.SmokingLog?.list?.() || [],
      ]);

      return {
        pipes: pipes || [],
        blends: blends || [],
        bottles: bottles || [],
        smokingLogs: logs || [],
      };
    } catch (err) {
      console.error('Failed to load curator data', err);
      return {
        pipes: [],
        blends: [],
        bottles: [],
        smokingLogs: [],
      };
    }
  };

  // 🔥 LOAD EVERYTHING
  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const context = await buildContext();

      const recs = generateRecommendations(context);
      const pairingRecs = generatePairingRecommendations(context);

      setSections(recs);
      setPairings(pairingRecs);

      // update badges
      const counts = {
        record_optimization: countItems(recs, 'Record Optimization'),
        collection_optimization: countItems(recs, 'Collection Optimization'),
        purchase_restock: countItems(recs, 'Purchase & Restock'),
        pairings: pairingRecs.length,
        grow_expand: countItems(recs, 'Grow & Expand'),
      };

      onCountsChange?.(counts);
    } catch (e) {
      console.error('Curator load failed', e);
    }

    setLoading(false);
  }, [onCountsChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 🔥 ACTION HANDLER — FORCE REFRESH (no stale state)
  const handleAction = async () => {
    await loadData();
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-zinc-400">
        Loading curator intelligence…
      </div>
    );
  }

  // 🔥 SINGLE SURFACE RENDER (NO DUPLICATE NAV)
  switch (activeSurface) {
    case 'record_optimization':
    case 'collection_optimization':
      return (
        <CuratorResultsBoard
          sections={sections.filter((s) =>
            activeSurface === 'record_optimization'
              ? s.title === 'Record Optimization'
              : s.title === 'Collection Optimization'
          )}
          onAction={handleAction}
        />
      );

    case 'purchase_restock':
      return (
        <CuratorPurchaseQueue
          sections={sections}
          onAction={handleAction}
        />
      );

    case 'pairings':
      return (
        <CuratorPairingsTab
          pairings={pairings}
          onAction={handleAction}
        />
      );

    case 'grow_expand':
      return (
        <CuratorGrowAndExpand
          sections={sections}
          onAction={handleAction}
        />
      );

    case 'chat':
      return (
        <ExpertTobacconistChat
          threadId={threadId}
          setThreadId={setThreadId}
        />
      );

    default:
      return null;
  }
}

/* ---------------- HELPERS ---------------- */

function countItems(sections, title) {
  return sections
    .filter((s) => s.title === title)
    .flatMap((s) => s.recommendations || [])
    .reduce((sum, r) => sum + (r.items?.length || 0), 0);
}