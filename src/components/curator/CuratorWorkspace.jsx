import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';

import LogTastingModal from '@/components/whiskey/LogTastingModal';
import LogSessionModal from '@/components/home/LogSessionModal';
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
      return { ...section, recommendations: nextRecommendations };
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

  // Single-module mode: exactly 1 module enabled → no pairings
  const isSingleModuleMode = enabledModuleKeys.length <= 1;

  const mountedRef = useRef(true);
  const contextRef = useRef(null);
  const pairingsRef = useRef([]);
  const rawSectionsRef = useRef([]);

  const [loading, setLoading] = useState(true);
  const [pairingsLoading, setPairingsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawSections, setRawSections] = useState([]);
  const [pairings, setPairings] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [preFillMessage, setPreFillMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSpecializationReview, setShowSpecializationReview] = useState(false);

  // Build Session modals — opened by plan_session "Build Session" button
  const [tastingModal, setTastingModal] = useState(null);   // { bottle }
  const [sessionModal, setSessionModal] = useState(null);   // { pipeId, blendId }

  // Stabilize moduleEnabled so object-identity changes don't trigger effect loops
  const moduleEnabledStr = JSON.stringify(moduleEnabled);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableModuleEnabled = useMemo(() => moduleEnabled, [moduleEnabledStr]);

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
        pipes: [], blends: [], bottles: [], smokingLogs: [], tastingLogs: [],
        inventoryUnits: [], acquisitionItems: [], wantListItems: [],
        preferences: {}, activeModules: stableModuleEnabled,
      };
    }

    // §1.2 MODULE GATE: determine which modules are active BEFORE any fetch
    const pipeActive    = stableModuleEnabled.pipekeeper    === true;
    const whiskeyActive = stableModuleEnabled.whiskeykeeper === true;

    // Batch all fetches in parallel — §9.1 single Promise.all per load
    const [
      pipes, blends, bottles,
      smokingLogs, tastingLogs,
      inventoryUnits, acquisitionItems,
    ] = await Promise.all([
      // §1.2: if module disabled, return empty array — NO data leakage
      pipeActive    ? safeFilter(base44.entities.Pipe,           { created_by: user.email }, '-updated_date',  200, 'pipes')          : Promise.resolve([]),
      pipeActive    ? safeFilter(base44.entities.TobaccoBlend,   { created_by: user.email }, '-updated_date',  200, 'blends')         : Promise.resolve([]),
      whiskeyActive ? safeFilter(base44.entities.Bottle,         { created_by: user.email }, '-updated_date',  200, 'bottles')        : Promise.resolve([]),
      pipeActive    ? safeFilter(base44.entities.SmokingLog,     { created_by: user.email }, '-date',           300, 'smokingLogs')    : Promise.resolve([]),
      whiskeyActive ? safeFilter(base44.entities.TastingLog,     { created_by: user.email }, '-tasting_date',   200, 'tastingLogs')   : Promise.resolve([]),
      whiskeyActive ? safeFilter(base44.entities.WhiskeyInventoryUnit, { created_by: user.email }, null,        500, 'inventoryUnits') : Promise.resolve([]),
      safeFilter(base44.entities.AcquisitionItem, { created_by: user.email }, '-created_date', 300, 'acquisitionItems'),
    ]);

    // §5.1 Normalize AcquisitionItem status: null or "want_list" → "wishlist"
    const normalizedAcquisitions = acquisitionItems.map((item) => ({
      ...item,
      status: item.status === 'want_list' || item.status == null ? 'wishlist' : item.status,
    }));

    return {
      // §1.2 enforce zero-arrays for disabled modules
      pipes:          pipeActive    ? pipes    : [],
      blends:         pipeActive    ? blends   : [],
      bottles:        whiskeyActive ? bottles  : [],
      smokingLogs:    pipeActive    ? smokingLogs  : [],
      tastingLogs:    whiskeyActive ? tastingLogs  : [],
      inventoryUnits: whiskeyActive ? inventoryUnits : [],
      acquisitionItems: normalizedAcquisitions,
      wantListItems:    normalizedAcquisitions,
      preferences: {},
      activeModules: stableModuleEnabled,
    };
  }, [user?.email, stableModuleEnabled]);

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

        const flatRecommendations = generateRecommendations(context) || [];
        const groupedSections = groupRecommendations(
          flatRecommendations.filter((rec) => rec?.category !== CATEGORY.PAIRING)
        );

        if (!mountedRef.current) return;

        rawSectionsRef.current = groupedSections;
        setRawSections(groupedSections);
        publishCounts(groupedSections, pairingsRef.current);
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
    // §9.2 + pairings rule: skip entirely in single-module mode
    if (isSingleModuleMode || !user?.email) {
      setPairings([]);
      return;
    }

    setPairingsLoading(true);
    try {
      // §9.3 Always reuse cached context — never rebuild on tab switch
      const context = contextRef.current || (await buildContext());
      if (!contextRef.current) contextRef.current = context;

      const nextPairings = generatePairingRecommendations(context) || [];

      if (!mountedRef.current) return;

      pairingsRef.current = nextPairings;
      setPairings(nextPairings);
      publishCounts(rawSectionsRef.current, nextPairings);
    } catch (err) {
      console.error('[Curator] pairing load failed:', err);
      if (!mountedRef.current) return;
      setPairings([]);
      publishCounts(rawSectionsRef.current, []);
    } finally {
      if (mountedRef.current) setPairingsLoading(false);
    }
  }, [buildContext, isSingleModuleMode, publishCounts, user?.email]);

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
        setPreFillMessage(buildAskCuratorPrompt(payload));
        onSurfaceChange?.('chat');
        return;
      }

      if (actionKey === 'build_session') {
        // Spec: Build Session must open the correct modal, NOT chat.
        const candidate = payload?._sessionCandidate;
        const moduleKey = candidate?.moduleKey || '';
        if (moduleKey === 'whiskey' || candidate?.itemType === 'bottle') {
          setTastingModal({ bottle: payload?.leftItem || candidate?.item || null });
        } else if (moduleKey === 'pipe' || moduleKey === 'tobacco' || candidate?.itemType === 'pipe' || candidate?.itemType === 'blend') {
          const pipeId  = (moduleKey === 'pipe'    ? candidate?.item?.id : '') || payload?.leftItem?.id || '';
          const blendId = (moduleKey === 'tobacco' ? candidate?.item?.id : '') || payload?.blendBridge?.id || '';
          setSessionModal({ pipeId, blendId });
        } else {
          // Indeterminate — fall back to chat prefill
          setPreFillMessage(buildSessionPrompt(payload));
          onSurfaceChange?.('chat');
        }
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
        publishCounts(next, pairingsRef.current);
        return next;
      });

      if (actionKey === 'save_pairing') {
        setPairings((prev) => {
          const next = prev.filter((p) => p.id !== payload?.id);
          pairingsRef.current = next;
          publishCounts(rawSectionsRef.current, next);
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
    [activeSurface, loadPairings, loadPrimaryData, onSurfaceChange, publishCounts, user?.email]
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

  const ctx = contextRef.current || {};

  const modals = (
    <>
      {tastingModal && (
        <LogTastingModal
          bottle={tastingModal.bottle}
          bottles={ctx.bottles || []}
          onClose={() => setTastingModal(null)}
          onSaved={() => { setTastingModal(null); loadPrimaryData({ silent: true }); }}
        />
      )}
      {sessionModal && (
        <LogSessionModal
          isOpen={true}
          pipes={ctx.pipes || []}
          blends={ctx.blends || []}
          initialPipeId={sessionModal.pipeId || ''}
          initialBlendId={sessionModal.blendId || ''}
          onClose={() => setSessionModal(null)}
        />
      )}
    </>
  );

  switch (activeSurface) {
    case 'record_optimization':
      return (
        <>{modals}<CuratorResultsBoard sections={buckets.record_optimization} onAction={handleAction} onRefresh={handleRefresh} isRefreshing={isRefreshing} /></>
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
        <>{modals}<CuratorSpecializationReview specRecs={specRecs} collectionSections={nonSpecSections} onAction={handleAction} onAskCurator={(pipe) => handleAction('ask_curator', pipe)} onOpenGrowExpand={() => onSurfaceChange?.('grow_expand')} onDone={() => setShowSpecializationReview(false)} /></>
      ) : (
        <>{modals}<CuratorResultsBoard sections={buckets.collection_optimization} onAction={handleAction} onRefresh={handleRefresh} isRefreshing={isRefreshing} /></>
      );
    }

    case 'purchase_restock':
      return (
        <>{modals}<CuratorPurchaseQueue sections={buckets.purchase_restock} onAction={handleAction} onRefresh={handleRefresh} isRefreshing={isRefreshing} /></>
      );

    case 'pairings':
      return (
        <>{modals}<CuratorPairingsTab pairings={pairings} onAction={handleAction} onRefresh={handleRefresh} isRefreshing={pairingsLoading || isRefreshing} /></>
      );

    case 'plan_session':
      return (
        <>{modals}<CuratorPlanSession collectionContext={ctx} activeModules={moduleEnabled} onAction={handleAction} onRefresh={handleRefresh} isRefreshing={isRefreshing} /></>
      );

    case 'grow_expand':
      return (
        <>{modals}<CuratorGrowAndExpand sections={buckets.grow_expand} collectionContext={ctx} userEmail={user?.email} onAskCurator={(item) => handleAction('ask_curator', item)} /></>
      );

    case 'chat':
      return (
        <>{modals}<ExpertTobacconistChat threadId={threadId} setThreadId={setThreadId} preFillMessage={preFillMessage} onPreFillConsumed={() => setPreFillMessage('')} collectionContext={ctx} isSingleModuleMode={isSingleModuleMode} activeModules={moduleEnabled} /></>
      );

    default:
      return modals;
  }
}