import React, { useEffect, useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

import CuratorResultsBoard from '@/components/curator/CuratorResultsBoard';
import CuratorPairingsTab from '@/components/curator/CuratorPairingsTab';
import CuratorPurchaseQueue from '@/components/curator/CuratorPurchaseQueue';
import CuratorGrowAndExpand from '@/components/curator/CuratorGrowAndExpand';
import ExpertTobacconistChat from '@/components/agent/ExpertTobacconistChat';

import { generateRecommendations } from '@/lib/curator/recommendationEngine';
import { generatePairingRecommendations } from '@/lib/curator/pairingEngine';
import { executeRecommendationAction, buildViewItemsNavigation } from '@/lib/curator/recommendationActions';

const LOAD_TIMEOUT_MS = 12000;

function withTimeout(promise, label, ms = LOAD_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function safeList(entityName, label) {
  try {
    const entity = base44?.entities?.[entityName];
    if (!entity || typeof entity.list !== 'function') {
      console.warn(`[Curator] Missing entity or list(): ${entityName}`);
      return [];
    }

    const result = await withTimeout(entity.list(), label);
    return Array.isArray(result) ? result : [];
  } catch (err) {
    console.error(`[Curator] Failed loading ${label}:`, err);
    return [];
  }
}

function countItemsByTitle(sections, title) {
  return (sections || [])
    .filter((s) => s?.title === title)
    .flatMap((s) => s?.recommendations || [])
    .reduce((sum, rec) => sum + ((rec?.items || []).length || 0), 0);
}

function removeResolvedFromRecommendation(rec, resolvedIds = []) {
  const nextItems = (rec?.items || []).filter(
    (item) => !resolvedIds.includes(item.recordId || item.id)
  );

  return {
    ...rec,
    items: nextItems,
    previewItems: nextItems.slice(0, 5),
    remainingCount: Math.max(0, nextItems.length - 5),
  };
}

function reconcileSections(prevSections, resolvedIds = [], resolvedRecommendationIds = []) {
  return (prevSections || [])
    .map((section) => {
      const nextRecommendations = (section?.recommendations || [])
        .filter((rec) => !resolvedRecommendationIds.includes(rec.id))
        .map((rec) => removeResolvedFromRecommendation(rec, resolvedIds))
        .filter((rec) => (rec?.items || []).length > 0);

      return {
        ...section,
        recommendations: nextRecommendations,
      };
    })
    .filter((section) => (section?.recommendations || []).length > 0);
}

async function buildContext() {
  const [pipes, blends, bottles, logs] = await Promise.all([
    safeList('Pipe', 'pipes'),
    safeList('TobaccoBlend', 'tobacco blends'),
    safeList('Bottle', 'bottles'),
    safeList('SmokingLog', 'smoking logs'),
  ]);

  return {
    pipes,
    blends,
    bottles,
    smokingLogs: logs,
  };
}

export default function CuratorWorkspace({
  activeSurface,
  onSurfaceChange,
  onCountsChange,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sections, setSections] = useState([]);
  const [pairings, setPairings] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [preFillMessage, setPreFillMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mountedRef = useRef(true);

  const publishCounts = useCallback(
    (recs, pairingRecs) => {
      onCountsChange?.({
        record_optimization: countItemsByTitle(recs, 'Record Optimization'),
        collection_optimization: countItemsByTitle(recs, 'Collection Optimization'),
        purchase_restock: countItemsByTitle(recs, 'Purchase & Restock'),
        pairings: Array.isArray(pairingRecs) ? pairingRecs.length : 0,
        grow_expand: countItemsByTitle(recs, 'Grow & Expand'),
        chat: 0,
      });
    },
    [onCountsChange]
  );

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setError('');
      } else {
        setIsRefreshing(true);
      }

      try {
        const context = await buildContext();

        const recs = generateRecommendations(context) || [];
        const pairingRecs = generatePairingRecommendations(context) || [];

        if (!mountedRef.current) return;

        setSections(recs);
        setPairings(pairingRecs);
        publishCounts(recs, pairingRecs);
      } catch (err) {
        console.error('[Curator] loadData failed:', err);
        if (!mountedRef.current) return;

        setSections([]);
        setPairings([]);
        setError(err?.message || 'Curator could not load.');
        publishCounts([], []);
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [publishCounts]
  );

  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  const handleAction = useCallback(
    async (actionKey, payload, opts = {}) => {
      if (actionKey === 'ask_curator') {
        const title = payload?.title || payload?.recordName || payload?.name || 'this';
        setPreFillMessage(`Help me with ${title}.`);
        onSurfaceChange?.('chat');
        return;
      }

      if (actionKey === 'view_items' || actionKey === 'view_details') {
        const nav = buildViewItemsNavigation(payload);
        if (nav?.navigate?.path) {
          window.location.href = nav.navigate.path;
        }
        return;
      }

      const result = await executeRecommendationAction(payload, actionKey, opts);

      if (!result?.ok) {
        console.error('[Curator] action failed:', result?.error || 'unknown error');
        return result;
      }

      const resolvedIds = result.resolvedRecordIds || [];
      const resolvedRecommendationIds = result.resolvedRecommendationIds || [];

      setSections((prev) => {
        const next = reconcileSections(prev, resolvedIds, resolvedRecommendationIds);
        publishCounts(next, pairings);
        return next;
      });

      if (actionKey === 'save_pairing') {
        setPairings((prev) => prev.filter((p) => p.id !== payload?.id));
      }

      if (
        actionKey === 'apply_fix' ||
        actionKey === 'approve_changes' ||
        actionKey === 'move_to_shopping_list' ||
        actionKey === 'add_to_want_list'
      ) {
        await loadData({ silent: true });
      }

      return result;
    },
    [loadData, onSurfaceChange, pairings, publishCounts]
  );

  const renderSurface = () => {
    switch (activeSurface) {
      case 'record_optimization':
        return (
          <CuratorResultsBoard
            sections={sections.filter((s) => s?.title === 'Record Optimization')}
            onAction={handleAction}
            onRefresh={() => loadData({ silent: true })}
            isRefreshing={isRefreshing}
          />
        );

      case 'collection_optimization':
        return (
          <CuratorResultsBoard
            sections={sections.filter((s) => s?.title === 'Collection Optimization')}
            onAction={handleAction}
            onRefresh={() => loadData({ silent: true })}
            isRefreshing={isRefreshing}
          />
        );

      case 'purchase_restock':
        return (
          <CuratorPurchaseQueue
            sections={sections}
            onAction={handleAction}
            onRefresh={() => loadData({ silent: true })}
            isRefreshing={isRefreshing}
          />
        );

      case 'pairings':
        return (
          <CuratorPairingsTab
            pairings={pairings}
            onAction={handleAction}
            onRefresh={() => loadData({ silent: true })}
            isRefreshing={isRefreshing}
          />
        );

      case 'grow_expand':
        return (
          <CuratorGrowAndExpand
            sections={sections}
            onAction={handleAction}
            onRefresh={() => loadData({ silent: true })}
            isRefreshing={isRefreshing}
          />
        );

      case 'chat':
        return (
          <ExpertTobacconistChat
            threadId={threadId}
            setThreadId={setThreadId}
            preFillMessage={preFillMessage}
            onPreFillConsumed={() => setPreFillMessage('')}
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="text-[20px]" style={{ color: '#A1A1AA' }}>
          Loading curator intelligence…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-[18px] p-8"
        style={{
          background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)',
          border: '1px solid rgba(239,68,68,0.28)',
        }}
      >
        <div className="text-[22px] font-semibold mb-3" style={{ color: '#F5F5F7' }}>
          Curator could not load
        </div>
        <div className="text-[16px] mb-6" style={{ color: '#A1A1AA' }}>
          {error}
        </div>
        <button
          type="button"
          onClick={() => loadData()}
          className="h-12 px-6 rounded-[14px] font-medium"
          style={{ background: '#C6A15B', color: '#0B0B0C' }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return <div className="space-y-8">{renderSurface()}</div>;
}
