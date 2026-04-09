import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';

import CuratorResultsBoard from '@/components/curator/CuratorResultsBoard';
import CuratorPairingsTab from '@/components/curator/CuratorPairingsTab';
import CuratorPlanSession from '@/components/curator/CuratorPlanSession';
import CuratorPurchaseQueue from '@/components/curator/CuratorPurchaseQueue';
import CuratorGrowAndExpand from '@/components/curator/CuratorGrowAndExpand';
import CuratorSpecializationReview from '@/components/curator/CuratorSpecializationReview';
import ExpertTobacconistChat from '@/components/agent/ExpertTobacconistChat';

import { generateRecommendations } from '@/lib/curator/recommendationEngine';
import { generatePairingRecommendations } from '@/lib/curator/pairingEngine';
import { executeRecommendationAction, buildViewItemsNavigation } from '@/lib/curator/recommendationActions';
import { groupRecommendations } from '@/lib/curator/recommendationGrouping';
import { CATEGORY } from '@/lib/curator/recommendationSchema';

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

function bucketSections(groupedSections = []) {
  return {
    record_optimization: groupedSections.filter((s) => s?.category === CATEGORY.RECORD_OPTIMIZATION),
    collection_optimization: groupedSections.filter((s) => s?.category === CATEGORY.COLLECTION_OPTIMIZATION),
    purchase_restock: groupedSections.filter((s) => s?.category === CATEGORY.PURCHASE),
    grow_expand: groupedSections.filter((s) => s?.category === CATEGORY.GROW_EXPAND),
  };
}

function countRecommendationItems(sections = []) {
  return (sections || [])
    .flatMap((section) => section?.recommendations || [])
    .reduce((sum, rec) => sum + ((rec?.items || []).length || 0), 0);
}

function extractSpecializationRecommendations(sections = []) {
  return (sections || [])
    .flatMap((section) => section?.recommendations || [])
    .filter((rec) => String(rec?.goal || '').toLowerCase().includes('special'));
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

function buildAskCuratorPrompt(payload = {}) {
  if (payload?.pairingType && payload?.leftItem && payload?.blendBridge && payload?.rightItem) {
    return `Explain why ${payload.leftItem.name}, ${payload.blendBridge.name}, and ${payload.rightItem.name} work together in my collection.`;
  }

  const title = payload?.title || payload?.recordName || payload?.itemName || payload?.name || 'this recommendation';
  const why = payload?.whyItMatters || payload?.narrative || payload?.summary || payload?.reason || '';
  return `Help me evaluate ${title}.${why ? ` ${why}` : ''}`;
}

function buildSessionPrompt(pairing = {}) {
  if (pairing?.leftItem && pairing?.blendBridge && pairing?.rightItem) {
    return `Build a session plan around ${pairing.leftItem.name}, ${pairing.blendBridge.name}, and ${pairing.rightItem.name}. Include why this session fits my collection.`;
  }
  return 'Build me a session from my current collection.';
}

export default function CuratorWorkspace({
  activeSurface,
  onSurfaceChange,
  onCountsChange,
}) {
  const { user } = useCurrentUser();
  const { enabled: moduleEnabled, enabledModuleKeys } = useEnabledModules();

  // Single-module mode: exactly 1 module enabled → no pairings, show Plan Session only
  const isSingleModuleMode = enabledModuleKeys.length <= 1;

  const mountedRef = useRef(true);
  const contextRef = useRef(null);
  const pairingsRef = useRef([]);

  const [loading, setLoading] = useState(true);
  const [pairingsLoading, setPairingsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawSections, setRawSections] = useState([]);
  const [pairings, setPairings] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [preFillMessage, setPreFillMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSpecializationReview, setShowSpecializationReview] = useState(false);

  const buckets = useMemo(() => bucketSections(rawSections), [rawSections]);

  const publishCounts = useCallback(
    (nextSections = [], nextPairings = []) => {
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
        wantListItems: [],
        preferences: {},
        activeModules: moduleEnabled,
      };
    }

    // Only fetch data for enabled modules to avoid polluting cross-module logic.
    const pipeActive    = moduleEnabled.pipekeeper    !== false;
    const whiskeyActive = moduleEnabled.whiskeykeeper !== false;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // Batch 1: core collection data
    const [pipes, blends, bottles] = await Promise.all([
      pipeActive    ? safeFilter(base44.entities.Pipe, { created_by: user.email }, '-updated_date', 500, 'pipes')       : Promise.resolve([]),
      pipeActive    ? safeFilter(base44.entities.TobaccoBlend, { created_by: user.email }, '-updated_date', 500, 'blends') : Promise.resolve([]),
      whiskeyActive ? safeFilter(base44.entities.Bottle, { created_by: user.email }, '-updated_date', 500, 'bottles')  : Promise.resolve([]),
    ]);

    await sleep(250);

    // Batch 2: logs
    const [smokingLogs, tastingLogs] = await Promise.all([
      pipeActive    ? safeFilter(base44.entities.SmokingLog, { created_by: user.email }, '-date', 1000, 'smokingLogs')           : Promise.resolve([]),
      whiskeyActive ? safeFilter(base44.entities.TastingLog, { created_by: user.email }, '-tasting_date', 500, 'tastingLogs')    : Promise.resolve([]),
    ]);

    await sleep(250);

    // Batch 3: inventory & acquisition
    const [inventoryUnits, acquisitionItems] = await Promise.all([
      whiskeyActive ? safeFilter(base44.entities.WhiskeyInventoryUnit, { created_by: user.email }, null, 2000, 'inventoryUnits') : Promise.resolve([]),
      safeFilter(base44.entities.AcquisitionItem, { created_by: user.email }, '-created_date', 1000, 'acquisitionItems'),
    ]);

      if (!result?.ok) {
        console.error('[Curator] action failed:', result?.error || 'unknown error');
        return result;
      }

      const resolvedIds = result.resolvedRecordIds || [];
      const resolvedRecommendationIds = result.resolvedRecommendationIds || [];

      setRawSections((prev) => {
        const next = reconcileSections(prev, resolvedIds, resolvedRecommendationIds);
        publishCounts(next, pairingsRef.current);
        return next;
      });

      if (actionKey === 'save_pairing') {
        setPairings((prev) => {
          const next = prev.filter((p) => p.id !== payload?.id);
          pairingsRef.current = next;
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
    [activeSurface, loadPairings, loadPrimaryData, onSurfaceChange, publishCounts, rawSections, user?.email]
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
      const nonSpecSections = buckets.collection_optimization
        .map((section) => ({
          ...section,
          recommendations: (section.recommendations || []).filter((rec) => !String(rec?.goal || '').toLowerCase().includes('special')),
        }))
        .filter((section) => (section.recommendations || []).length > 0);

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

    case 'plan_session':
      return (
        <CuratorPlanSession
          collectionContext={contextRef.current || {}}
          activeModules={moduleEnabled}
          onAction={handleAction}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
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
          isSingleModuleMode={isSingleModuleMode}
          activeModules={moduleEnabled}
        />
      );

    default:
      return null;
  }
}