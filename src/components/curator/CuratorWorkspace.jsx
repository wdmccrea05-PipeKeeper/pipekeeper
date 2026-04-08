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

const LOAD_TIMEOUT_MS = 10000;

function withTimeout(promise, label, ms = LOAD_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms);
    }),
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
  const [pipes, blends, bottles, smokingLogs] = await Promise.all([
    safeList('Pipe', 'pipes'),
    safeList('TobaccoBlend', 'tobacco blends'),
    safeList('Bottle', 'bottles'),
    safeList('SmokingLog', 'smoking logs'),
  ]);

  return {
    pipes: pipes || [],
    blends: blends || [],
    bottles: bottles || [],
    smokingLogs: smokingLogs || [],
  };
}

export default function CuratorWorkspace({
  activeSurface,
  onSurfaceChange,
  onCountsChange,
}) {
  const mountedRef = useRef(true);
  const contextRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [pairingsLoading, setPairingsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sections, setSections] = useState([]);
  const [pairings, setPairings] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [preFillMessage, setPreFillMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const loadPrimaryData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setError('');
      } else {
        setIsRefreshing(true);
      }

      try {
        const context = await buildContext();
        contextRef.current = context;

        let recs = [];
        try {
          recs = generateRecommendations(context) || [];
        } catch (engineErr) {
          console.error('[Curator] recommendation engine failed:', engineErr);
          recs = [];
        }

        if (!mountedRef.current) return;

        setSections(recs);

        // IMPORTANT: do not generate pairings here
        publishCounts(recs, pairings);
      } catch (err) {
        console.error('[Curator] primary load failed:', err);

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
    [publishCounts, pairings]
  );

  const loadPairings = useCallback(async () => {
    if (pairingsLoading) return;
    if (pairings.length > 0) return;

    setPairingsLoading(true);
    try {
      const context = contextRef.current || (await buildContext());
      contextRef.current = context;

      let nextPairings = [];
      try {
        nextPairings = generatePairingRecommendations(context) || [];
      } catch (pairErr) {
        console.error('[Curator] pairing engine failed:', pairErr);
        nextPairings = [];
      }

      if (!mountedRef.current) return;

      setPairings(nextPairings);
      publishCounts(sections, nextPairings);
    } finally {
      if (mountedRef.current) {
        setPairingsLoading(false);
      }
    }
  }, [pairingsLoading, pairings.length, publishCounts, sections]);

  useEffect(() => {
    mountedRef.current = true;
    loadPrimaryData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadPrimaryData]);

  useEffect(() => {
    if (activeSurface === 'pairings') {
      loadPairings();
    }
  }, [activeSurface, loadPairings]);

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
        setPairings((prev) => {
          const next = prev.filter((p) => p.id !== payload?.id);
          publishCounts(sections, next);
          return next;
        });
      }

      // Hard reload the lightweight data only after mutations that change records
      if (
        actionKey === 'apply_fix' ||
        actionKey === 'approve_changes' ||
        actionKey === 'move_to_shopping_list' ||
        actionKey === 'add_to_want_list'
      ) {
        await loadPrimaryData({ silent: true });

        // only refresh pairings if currently on pairings tab
        if (activeSurface === 'pairings') {
          setPairings([]);
          await loadPairings();
        }
      }

      return result;
    },
    [activeSurface, loadPairings, loadPrimaryData, onSurfaceChange, pairings, publishCounts, sections]
  );

  const handleRefresh = useCallback(async () => {
    setPairings([]);
    await loadPrimaryData({ silent: true });
    if (activeSurface === 'pairings') {
      await loadPairings();
    }
  }, [activeSurface, loadPairings, loadPrimaryData]);

  const renderSurface = () => {
    switch (activeSurface) {
      case 'record_optimization':
        return (
          <CuratorResultsBoard
            sections={sections.filter((s) => s?.title === 'Record Optimization')}
            onAction={handleAction}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        );

      case 'collection_optimization':
        return (
          <CuratorResultsBoard
            sections={sections.filter((s) => s?.title === 'Collection Optimization')}
            onAction={handleAction}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        );

      case 'purchase_restock':
        return (
          <CuratorPurchaseQueue
            sections={sections}
            onAction={handleAction}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        );

      case 'pairings':
        if (pairingsLoading) {
          return (
            <div className="py-20 text-center">
              <div className="text-[20px]" style={{ color: '#A1A1AA' }}>
                Loading pairings…
              </div>
            </div>
          );
        }

        return (
          <CuratorPairingsTab
            pairings={pairings}
            onAction={handleAction}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        );

      case 'grow_expand':
        return (
          <CuratorGrowAndExpand
            sections={sections}
            onAction={handleAction}
            onRefresh={handleRefresh}
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
          onClick={() => loadPrimaryData()}
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
