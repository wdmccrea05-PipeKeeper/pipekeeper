import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';

import CuratorResultsBoard from '@/components/curator/CuratorResultsBoard';
import CuratorPairingsTab from '@/components/curator/CuratorPairingsTab';
import CuratorPurchaseQueue from '@/components/curator/CuratorPurchaseQueue';
import CuratorGrowAndExpand from '@/components/curator/CuratorGrowAndExpand';
import CuratorSpecializationReview from '@/components/curator/CuratorSpecializationReview';
import ExpertTobacconistChat from '@/components/agent/ExpertTobacconistChat';

import { generateRecommendations } from '@/lib/curator/recommendationEngine';
import { generatePairingRecommendations } from '@/lib/curator/pairingEngine';
import { executeRecommendationAction, buildViewItemsNavigation } from '@/lib/curator/recommendationActions';

const LOAD_TIMEOUT_MS = 10000;

function withTimeout(promise, label, ms = LOAD_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function safeFilter(entityHandle, filter, sort, limit, label) {
  try {
    if (!entityHandle || typeof entityHandle.filter !== 'function') return [];
    const rows = await withTimeout(entityHandle.filter(filter, sort, limit), label);
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error(`[Curator] ${label} failed`, err);
    return [];
  }
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function isRecordOptimizationSection(section) {
  const title = normalizeText(section?.title);
  const category = normalizeText(section?.category);
  return (
    title.includes('record optimization') ||
    title.includes('collection health') ||
    title.includes('metadata') ||
    title.includes('valuation') ||
    category.includes('record')
  );
}

function isCollectionOptimizationSection(section) {
  const title = normalizeText(section?.title);
  const category = normalizeText(section?.category);
  return (
    title.includes('collection optimization') ||
    title.includes('utilization') ||
    title.includes('rotation') ||
    title.includes('specialization') ||
    title.includes('collection balance') ||
    category.includes('collection')
  );
}

function isPurchaseRestockSection(section) {
  const title = normalizeText(section?.title);
  const category = normalizeText(section?.category);
  return (
    title.includes('purchase') ||
    title.includes('restock') ||
    title.includes('shopping') ||
    title.includes('wishlist') ||
    category.includes('purchase')
  );
}

function isGrowExpandSection(section) {
  const title = normalizeText(section?.title);
  const category = normalizeText(section?.category);
  return (
    title.includes('grow') ||
    title.includes('expand') ||
    title.includes('discovery') ||
    title.includes('discoveries') ||
    title.includes('outside') ||
    category.includes('grow')
  );
}

function bucketSections(rawSections = []) {
  const buckets = {
    record_optimization: [],
    collection_optimization: [],
    purchase_restock: [],
    grow_expand: [],
  };

  for (const section of rawSections) {
    if (!section || !Array.isArray(section.recommendations) || section.recommendations.length === 0) continue;

    if (isRecordOptimizationSection(section)) {
      buckets.record_optimization.push(section);
      continue;
    }
    if (isCollectionOptimizationSection(section)) {
      buckets.collection_optimization.push(section);
      continue;
    }
    if (isPurchaseRestockSection(section)) {
      buckets.purchase_restock.push(section);
      continue;
    }
    if (isGrowExpandSection(section)) {
      buckets.grow_expand.push(section);
      continue;
    }

    buckets.collection_optimization.push(section);
  }

  return buckets;
}


function extractSpecializationRecommendations(sections = []) {
  return (sections || [])
    .flatMap((section) => section?.recommendations || [])
    .filter((rec) => String(rec?.goal || '').toLowerCase().includes('special'));
}

function countRecommendationItems(sections = []) {
  return sections
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

export default function CuratorWorkspace({
  activeSurface,
  onSurfaceChange,
  onCountsChange,
}) {
  const { user } = useCurrentUser();

  const mountedRef = useRef(true);
  const contextRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [pairingsLoading, setPairingsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawSections, setRawSections] = useState([]);
  const [pairings, setPairings] = useState([]);
  const pairingsRef = useRef([]);
  const [threadId, setThreadId] = useState(null);
  const [preFillMessage, setPreFillMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSpecializationReview, setShowSpecializationReview] = useState(false);

  const buckets = useMemo(() => bucketSections(rawSections), [rawSections]);

  const publishCounts = useCallback(
    (nextSections, nextPairings) => {
      const nextBuckets = bucketSections(nextSections);
      onCountsChange?.({
        record_optimization: countRecommendationItems(nextBuckets.record_optimization),
        collection_optimization: countRecommendationItems(nextBuckets.collection_optimization),
        purchase_restock: countRecommendationItems(nextBuckets.purchase_restock),
        pairings: Array.isArray(nextPairings) ? nextPairings.length : 0,
        grow_expand: countRecommendationItems(nextBuckets.grow_expand),
        chat: 0,
      });
    },
    [onCountsChange]
  );

  const buildContext = useCallback(async () => {
    if (!user?.email) {
      return {
        pipes: [],
        blends: [],
        bottles: [],
        smokingLogs: [],
        tastingLogs: [],
        inventoryUnits: [],
        acquisitionItems: [],
      };
    }

    const [pipes, blends, bottles, smokingLogs, tastingLogs, inventoryUnits, acquisitionItems] = await Promise.all([
      safeFilter(base44.entities.Pipe, { created_by: user.email }, '-updated_date', 500, 'pipes'),
      safeFilter(base44.entities.TobaccoBlend, { created_by: user.email }, '-updated_date', 500, 'blends'),
      safeFilter(base44.entities.Bottle, { created_by: user.email }, '-updated_date', 500, 'bottles'),
      safeFilter(base44.entities.SmokingLog, { created_by: user.email }, '-date', 1000, 'smokingLogs'),
      safeFilter(base44.entities.TastingLog, { created_by: user.email }, '-tasting_date', 500, 'tastingLogs'),
      safeFilter(base44.entities.WhiskeyInventoryUnit, { created_by: user.email }, null, 2000, 'inventoryUnits'),
      safeFilter(base44.entities.AcquisitionItem, { created_by: user.email }, '-created_date', 1000, 'acquisitionItems'),
    ]);

    return {
      pipes,
      blends,
      bottles,
      smokingLogs,
      tastingLogs,
      inventoryUnits,
      acquisitionItems,
    };
  }, [user?.email]);

  const loadPrimaryData = useCallback(
    async ({ silent = false } = {}) => {
      if (!user?.email) {
        setLoading(false);
        setRawSections([]);
        setPairings([]);
        publishCounts([], []);
        return;
      }

      if (!silent) {
        setLoading(true);
        setError('');
      } else {
        setIsRefreshing(true);
      }

      try {
        const context = await buildContext();
        contextRef.current = context;

        const recs = generateRecommendations(context) || [];

        if (!mountedRef.current) return;

        setRawSections(recs);
        publishCounts(recs, pairingsRef.current);
      } catch (err) {
        console.error('[Curator] primary load failed:', err);

        if (!mountedRef.current) return;

        setRawSections([]);
        setPairings([]);
        setError(err?.message || 'Curator could not load.');
        publishCounts([], []);
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [buildContext, publishCounts, user?.email]
  );

  const loadPairings = useCallback(async () => {
    if (!user?.email) {
      setPairings([]);
      return;
    }

    setPairingsLoading(true);
    try {
      const context = contextRef.current || (await buildContext());
      contextRef.current = context;

      const nextPairings = generatePairingRecommendations(context) || [];

      if (!mountedRef.current) return;

      pairingsRef.current = nextPairings;
      setPairings(nextPairings);
      publishCounts(rawSections, nextPairings);
    } catch (err) {
      console.error('[Curator] pairing load failed:', err);
      if (!mountedRef.current) return;
      setPairings([]);
      publishCounts(rawSections, []);
    } finally {
      if (mountedRef.current) setPairingsLoading(false);
    }
  }, [buildContext, publishCounts, rawSections, user?.email]);

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
        const title = payload?.title || payload?.recordName || payload?.name || 'this recommendation';
        const reason = payload?.whyItMatters || payload?.narrative || payload?.summary || '';
        setPreFillMessage(`Help me evaluate ${title}.${reason ? ` ${reason}` : ''}`);
        onSurfaceChange?.('chat');
        return;
      }

      if (actionKey === 'review_specializations') {
        setShowSpecializationReview(true);
        return;
      }

      if (actionKey === 'view_items' || actionKey === 'view_details' || actionKey === 'open_records') {
        const nav = buildViewItemsNavigation(payload);
        if (nav?.navigate?.path) {
          window.location.href = nav.navigate.path;
        }
        return;
      }

      const result = await executeRecommendationAction(payload, actionKey, {
        ...opts,
        userEmail: user?.email,
      });

      if (!result?.ok) {
        console.error('[Curator] action failed:', result?.error || 'unknown error');
        return result;
      }

      const resolvedIds = result.resolvedRecordIds || [];
      const resolvedRecommendationIds = result.resolvedRecommendationIds || [];

      setRawSections((prev) => {
        const next = reconcileSections(prev, resolvedIds, resolvedRecommendationIds);
        publishCounts(next, pairings);
        return next;
      });

      if (actionKey === 'save_pairing') {
        setPairings((prev) => {
          const next = prev.filter((p) => p.id !== payload?.id);
          publishCounts(rawSections, next);
          return next;
        });
      }

      if (
        actionKey === 'apply_fix' ||
        actionKey === 'approve_changes' ||
        actionKey === 'move_to_shopping_list' ||
        actionKey === 'add_to_want_list'
      ) {
        await loadPrimaryData({ silent: true });
        if (activeSurface === 'pairings') {
          await loadPairings();
        }
      }

      return result;
    },
    [activeSurface, loadPairings, loadPrimaryData, onSurfaceChange, pairings, publishCounts, rawSections, user?.email]
  );

  const handleRefresh = useCallback(async () => {
    if (activeSurface === 'pairings') {
      await loadPairings();
      return;
    }
    await loadPrimaryData({ silent: true });
  }, [activeSurface, loadPairings, loadPrimaryData]);

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

  switch (activeSurface) {
    case 'record_optimization':
      return (
        <CuratorResultsBoard
          sections={buckets.record_optimization}
          onAction={handleAction}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      );

    case 'collection_optimization': {
      const specRecs = extractSpecializationRecommendations(buckets.collection_optimization);
      const nonSpecSections = buckets.collection_optimization.map((section) => ({
        ...section,
        recommendations: (section.recommendations || []).filter((rec) => !String(rec?.goal || '').toLowerCase().includes('special')),
      })).filter((section) => (section.recommendations || []).length > 0);

      return showSpecializationReview || specRecs.length > 0 ? (
        <CuratorSpecializationReview
          specRecs={specRecs}
          collectionSections={nonSpecSections}
          onAction={handleAction}
          onAskCurator={(pipe) => handleAction('ask_curator', pipe)}
          onOpenGrowExpand={() => onSurfaceChange?.('grow_expand')}
          onDone={() => setShowSpecializationReview(false)}
        />
      ) : (
        <CuratorResultsBoard
          sections={buckets.collection_optimization}
          onAction={handleAction}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      );
    }

    case 'purchase_restock':
      return (
        <CuratorPurchaseQueue
          sections={buckets.purchase_restock}
          onAction={handleAction}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      );

    case 'pairings':
      return (
        <CuratorPairingsTab
          pairings={pairings}
          onAction={handleAction}
          onRefresh={handleRefresh}
          isRefreshing={pairingsLoading || isRefreshing}
        />
      );

    case 'grow_expand':
      return (
        <CuratorGrowAndExpand
          sections={buckets.grow_expand}
          collectionContext={contextRef.current || {}}
          userEmail={user?.email}
          onAskCurator={(item) => handleAction('ask_curator', item)}
        />
      );

    case 'chat':
      return (
        <ExpertTobacconistChat
          threadId={threadId}
          setThreadId={setThreadId}
          preFillMessage={preFillMessage}
          onPreFillConsumed={() => setPreFillMessage('')}
          collectionContext={contextRef.current || {}}
        />
      );

    default:
      return null;
  }
}