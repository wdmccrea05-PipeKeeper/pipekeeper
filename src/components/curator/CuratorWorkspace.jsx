import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';
import { useTranslation } from '@/components/i18n/safeTranslation';

import LogTastingModal from '@/components/whiskey/LogTastingModal';
import LogSessionModal from '@/components/home/LogSessionModal';
import CigarSessionModal from '@/components/cigars/CigarSessionModal';
import CuratorResultsBoard from '@/components/curator/CuratorResultsBoard';
import CuratorPairingsTab from '@/components/curator/CuratorPairingsTab';
import CuratorPlanSession from '@/components/curator/CuratorPlanSession';
import CuratorPurchaseQueue from '@/components/curator/CuratorPurchaseQueue';
import CuratorGrowAndExpand from '@/components/curator/CuratorGrowAndExpand';
import CuratorSpecializationReview from '@/components/curator/CuratorSpecializationReview';
import ExpertTobacconistChat from '@/components/agent/ExpertTobacconistChat';

import { toast } from 'sonner';
import { generateRecommendations } from '@/lib/curator/recommendationEngine';
import { generatePairingRecommendations } from '@/lib/curator/pairingEngine';
import { executeRecommendationAction, buildViewItemsNavigation } from '@/lib/curator/recommendationActions';
import { groupRecommendations } from '@/lib/curator/recommendationGrouping';
import { CATEGORY } from '@/lib/curator/recommendationSchema';

const LOAD_TIMEOUT_MS = 10000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  if (payload?.pairingFamily && payload?.smokingSessionType === 'pipe_session' && payload?.leftItem && payload?.blendBridge && payload?.rightItem) {
    return `Explain why this pipe session pairing works: ${payload.leftItem.name}, ${payload.blendBridge.name}, and ${payload.rightItem.name}.`;
  }
  if (payload?.pairingFamily && payload?.smokingSessionType === 'cigar' && payload?.leftItem && payload?.rightItem) {
    return `Explain why this cigar pairing works: ${payload.leftItem.name} with ${payload.rightItem.name}.`;
  }
  const title = payload?.title || payload?.recordName || payload?.itemName || payload?.name || 'this recommendation';
  return `Evaluate ${title} in my collection`;
}

function buildEntityContextFromPayload(payload = {}) {
  if (!payload) return null;
  if (payload?.pairingType) return null; // pairings don't set a single entity
  const name = payload?.title || payload?.recordName || payload?.itemName || payload?.name;
  const id   = payload?.id || payload?.recordId || null;
  const type = payload?.recordType || payload?.itemType || payload?.linked_entity_type || 'item';
  if (!name) return null;
  return { id, name, type };
}

function buildSessionPrompt(pairing = {}) {
  if (pairing?.smokingSessionType === 'pipe_session' && pairing?.leftItem && pairing?.blendBridge && pairing?.rightItem) {
    return `Build a session plan around ${pairing.leftItem.name}, ${pairing.blendBridge.name}, and ${pairing.rightItem.name}. Include why this session fits my collection.`;
  }
  if (pairing?.smokingSessionType === 'cigar' && pairing?.leftItem && pairing?.rightItem) {
    return `Build a cigar session plan around ${pairing.leftItem.name} and ${pairing.rightItem.name}. Include pacing and why this fit works.`;
  }
  return 'Build me a session from my current collection.';
}

export default function CuratorWorkspace({
  activeSurface,
  onSurfaceChange,
  onCountsChange,
}) {
  const { t } = useTranslation();
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
  const [chatEntityContext, setChatEntityContext] = useState(null);

  // Build Session modals — opened by plan_session "Build Session" button
  const [tastingModal, setTastingModal] = useState(null);   // { bottle }
  const [sessionModal, setSessionModal] = useState(null);   // { pipeId, blendId }
  const [cigarModal, setCigarModal] = useState(null);       // { cigar }

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
        pipes: [], blends: [], bottles: [], wines: [], smokingLogs: [], tastingLogs: [],
        cigars: [], cigarSessions: [], inventoryUnits: [], acquisitionItems: [], wantListItems: [],
        preferences: {}, activeModules: stableModuleEnabled, cigarModuleActive: false,
      };
    }

    // §1.2 MODULE GATE: determine which modules are active BEFORE any fetch
    const pipeActive    = stableModuleEnabled.pipekeeper    === true;
    const whiskeyActive = stableModuleEnabled.whiskeykeeper === true;
    const wineActive    = stableModuleEnabled.winekeeper    === true;
    const cigarActive   = stableModuleEnabled.cigarkeeper   === true;

    // Batch all fetches in parallel — §9.1 single Promise.all per load
    const [
      pipes, blends, bottles, wines,
      smokingLogs, tastingLogs,
      cigars, cigarSessions,
      inventoryUnits, acquisitionItems,
    ] = await Promise.all([
      // §1.2: if module disabled, return empty array — NO data leakage
      pipeActive    ? safeFilter(base44.entities.Pipe,           { created_by: user.email }, '-updated_date',  200, 'pipes')          : Promise.resolve([]),
      pipeActive    ? safeFilter(base44.entities.TobaccoBlend,   { created_by: user.email }, '-updated_date',  200, 'blends')         : Promise.resolve([]),
      whiskeyActive ? safeFilter(base44.entities.Bottle,         { created_by: user.email }, '-updated_date',  200, 'bottles')        : Promise.resolve([]),
      wineActive    ? safeFilter(base44.entities.Wine,           { created_by: user.email }, '-updated_date',  200, 'wines')          : Promise.resolve([]),
      pipeActive    ? safeFilter(base44.entities.SmokingLog,     { created_by: user.email }, '-date',           300, 'smokingLogs')    : Promise.resolve([]),
      whiskeyActive ? safeFilter(base44.entities.TastingLog,     { created_by: user.email }, '-tasting_date',   200, 'tastingLogs')   : Promise.resolve([]),
      cigarActive   ? safeFilter(base44.entities.Cigar,          { created_by: user.email }, '-updated_date',   200, 'cigars')        : Promise.resolve([]),
      cigarActive   ? safeFilter(base44.entities.CigarSession,   { created_by: user.email }, '-date',           300, 'cigarSessions') : Promise.resolve([]),
      whiskeyActive ? safeFilter(base44.entities.WhiskeyInventoryUnit, { created_by: user.email }, null,        500, 'inventoryUnits') : Promise.resolve([]),
      safeFilter(base44.entities.AcquisitionItem, { created_by: user.email }, '-created_date', 300, 'acquisitionItems'),
    ]);

    // §5.1 Normalize AcquisitionItem status: live records use status:'active' + category:'wishlist'
    // Map to canonical status values the engines expect.
    const normalizedAcquisitions = acquisitionItems.map((item) => {
      const rawStatus   = String(item.status   || '').trim().toLowerCase();
      const rawCategory = String(item.category || item.list_type || '').trim().toLowerCase();
      let canonicalStatus;
      if (rawStatus === 'archived') {
        canonicalStatus = 'archived';
      } else if (rawStatus === 'active') {
        // Legacy schema: semantic meaning in category
        canonicalStatus = rawCategory === 'want_list' ? 'wishlist' : (rawCategory || 'wishlist');
      } else if (rawStatus === 'want_list') {
        canonicalStatus = 'wishlist';
      } else {
        canonicalStatus = rawStatus || (rawCategory === 'want_list' ? 'wishlist' : rawCategory) || 'wishlist';
      }
      return { ...item, status: canonicalStatus };
    });

    return {
      // §1.2 enforce zero-arrays for disabled modules
      pipes:          pipeActive    ? pipes    : [],
      blends:         pipeActive    ? blends   : [],
      bottles:        whiskeyActive ? bottles  : [],
      wines:          wineActive    ? wines    : [],
      smokingLogs:    pipeActive    ? smokingLogs  : [],
      tastingLogs:    whiskeyActive ? tastingLogs  : [],
      cigars:         cigarActive   ? cigars : [],
      cigarSessions:  cigarActive   ? cigarSessions : [],
      inventoryUnits: whiskeyActive ? inventoryUnits : [],
      acquisitionItems: normalizedAcquisitions,
      wantListItems:    normalizedAcquisitions,
      preferences: {},
      activeModules: stableModuleEnabled,
      cigarModuleActive: cigarActive,
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

  const loadPairings = useCallback(async ({ reshuffle = false } = {}) => {
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

      // When user clicks "New Pairings", shuffle input arrays so the engine
      // produces a different combination ordering each time.
      const pairingContext = reshuffle
        ? {
            ...context,
            pipes:       shuffleArray(context.pipes       || []),
            blends:      shuffleArray(context.blends      || []),
            bottles:     shuffleArray(context.bottles     || []),
            wines:       shuffleArray(context.wines       || []),
            smokingLogs: shuffleArray(context.smokingLogs || []),
            tastingLogs: shuffleArray(context.tastingLogs || []),
          }
        : context;

      const nextPairings = generatePairingRecommendations(pairingContext) || [];

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
        setChatEntityContext(buildEntityContextFromPayload(payload));
        onSurfaceChange?.('chat');
        return;
      }

      if (actionKey === 'build_session') {
        const candidate = payload?._sessionCandidate;
        const moduleKey = candidate?.moduleKey || '';
        if (moduleKey === 'whiskey' || candidate?.itemType === 'bottle') {
          setTastingModal({ bottle: payload?.leftItem || candidate?.item || null });
        } else if (moduleKey === 'cigar' || candidate?.itemType === 'cigar') {
          setCigarModal({ cigar: payload?.cigarItem || candidate?.item || null });
        } else if (moduleKey === 'pipe' || moduleKey === 'tobacco' || candidate?.itemType === 'pipe' || candidate?.itemType === 'blend') {
          const pipeId  = (moduleKey === 'pipe'    ? candidate?.item?.id : '') || payload?.leftItem?.id || '';
          const blendId = (moduleKey === 'tobacco' ? candidate?.item?.id : '') || payload?.blendBridge?.id || '';
          setSessionModal({ pipeId, blendId });
        } else {
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
        const errMsg = result?.error || 'Action could not be completed.';
        console.error('[Curator] action failed:', errMsg);
        toast.error(errMsg);
        return result;
      }

      if (result?.appliedCount > 0) {
        toast.success(`${result.appliedCount} record${result.appliedCount !== 1 ? 's' : ''} updated.`);
      } else if (actionKey === 'acknowledge' || actionKey === 'mark_reviewed') {
        toast.success('Marked as reviewed.');
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
        actionKey === 'apply_suggestion' ||
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
      await loadPairings({ reshuffle: true });
      return;
    }
    await loadPrimaryData({ silent: true });
  }, [activeSurface, loadPairings, loadPrimaryData]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="text-[20px]" style={{ color: '#A1A1AA' }}>
          {t('curator.workspaceLoading')}
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
          {t('curator.workspaceLoadErrorTitle')}
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
          {t('common.retry')}
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
      {cigarModal && (
        <CigarSessionModal
          isOpen={true}
          defaultCigar={cigarModal.cigar || null}
          onClose={() => setCigarModal(null)}
          onSessionSaved={() => { setCigarModal(null); loadPrimaryData({ silent: true }); }}
        />
      )}
    </>
  );

  switch (activeSurface) {
    case 'record_optimization':
      return (
        <>{modals}<CuratorResultsBoard sections={buckets.record_optimization} onAction={handleAction} onRefresh={handleRefresh} isRefreshing={isRefreshing} activeModules={moduleEnabled} /></>
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
        <>{modals}<CuratorResultsBoard sections={buckets.collection_optimization} onAction={handleAction} onRefresh={handleRefresh} isRefreshing={isRefreshing} activeModules={moduleEnabled} /></>
      );
    }

    case 'purchase_restock':
      return (
        <>{modals}<CuratorPurchaseQueue sections={buckets.purchase_restock} onAction={handleAction} onRefresh={handleRefresh} isRefreshing={isRefreshing} /></>
      );

    case 'pairings':
      return (
        <>{modals}<CuratorPairingsTab pairings={pairings} onAction={handleAction} onRefresh={handleRefresh} isRefreshing={isRefreshing} activeModules={moduleEnabled} collectionStats={{
          pipes: (ctx.pipes || []).length,
          blends: (ctx.blends || []).length,
          bottles: (ctx.bottles || []).length,
          wines: (ctx.wines || []).length,
          cigars: (ctx.cigars || []).length,
        }} /></>
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
        <>{modals}<ExpertTobacconistChat threadId={threadId} setThreadId={setThreadId} preFillMessage={preFillMessage} onPreFillConsumed={() => setPreFillMessage('')} collectionContext={ctx} isSingleModuleMode={isSingleModuleMode} activeModules={moduleEnabled} initialEntityContext={chatEntityContext} /></>
      );

    default:
      return modals;
  }
}