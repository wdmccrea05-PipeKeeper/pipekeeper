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
import { seedInitialSnapshotIfMissing } from '@/components/valuation/valueRefreshService';
import { executeRecommendationAction, buildViewItemsNavigation } from '@/lib/curator/recommendationActions';
import { CATEGORY, MODULE_KEY } from '@/lib/curator/recommendationSchema';

const LOAD_TIMEOUT_MS = 12000;

function withTimeout(promise, label, ms = LOAD_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
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

function moduleLabel(moduleKey) {
  switch (moduleKey) {
    case MODULE_KEY.PIPE:
      return 'Pipe';
    case MODULE_KEY.TOBACCO:
      return 'Tobacco';
    case MODULE_KEY.WHISKEY:
      return 'Whiskey';
    case MODULE_KEY.CIGAR:
      return 'Cigar';
    default:
      return 'Multi';
  }
}

function titleForCategory(category, moduleKey) {
  const prefix = moduleLabel(moduleKey);
  switch (category) {
    case CATEGORY.RECORD_OPTIMIZATION:
      return `${prefix} Record Intelligence`;
    case CATEGORY.COLLECTION_OPTIMIZATION:
      return `${prefix} Collection Intelligence`;
    case CATEGORY.PURCHASE:
      return `${prefix} Purchase Queue`;
    case CATEGORY.GROW_EXPAND:
      return `${prefix} Discoveries`;
    default:
      return `${prefix} Recommendations`;
  }
}

function sectionizeRecommendations(recommendations = [], category) {
  const filtered = recommendations.filter((rec) => rec?.category === category);
  const groups = new Map();

  for (const rec of filtered) {
    const moduleKey = rec?.moduleKey || MODULE_KEY.MULTI;
    if (!groups.has(moduleKey)) {
      groups.set(moduleKey, {
        id: `${category}_${moduleKey}`,
        title: titleForCategory(category, moduleKey),
        moduleKey,
        recommendations: [],
      });
    }
    groups.get(moduleKey).recommendations.push(rec);
  }

  return Array.from(groups.values()).filter((section) => section.recommendations.length > 0);
}

function countRecommendationItems(list = []) {
  return list.reduce((sum, rec) => sum + (Array.isArray(rec?.items) ? rec.items.length : 0), 0);
}

function removeResolvedFromRecommendation(rec, resolvedIds = []) {
  const nextItems = (rec?.items || []).filter((item) => !resolvedIds.includes(item.recordId || item.id));
  return {
    ...rec,
    items: nextItems,
    previewItems: nextItems.slice(0, 5),
    remainingCount: Math.max(0, nextItems.length - 5),
  };
}

function reconcileRecommendations(prevRecommendations, resolvedIds = [], resolvedRecommendationIds = []) {
  return (prevRecommendations || [])
    .filter((rec) => !resolvedRecommendationIds.includes(rec.id))
    .map((rec) => removeResolvedFromRecommendation(rec, resolvedIds))
    .filter((rec) => {
      if (rec?.category === CATEGORY.GROW_EXPAND) return true;
      if (rec?.category === CATEGORY.PAIRING) return true;
      return (rec?.items || []).length > 0;
    });
}

export default function CuratorWorkspace({ activeSurface, onSurfaceChange, onCountsChange }) {
  const { user } = useCurrentUser();
  const mountedRef = useRef(true);
  const contextRef = useRef(null);

  const pairingsRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [pairingsLoading, setPairingsLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [pairings, _setPairings] = useState([]);
  const setPairings = useCallback((valOrFn) => {
    _setPairings((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      pairingsRef.current = next;
      return next;
    });
  }, []);
  const [threadId, setThreadId] = useState(null);
  const [preFillMessage, setPreFillMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSpecReview, setShowSpecReview] = useState(false);
  const [specItems, setSpecItems] = useState([]);

  const recordSections = useMemo(
    () => sectionizeRecommendations(recommendations, CATEGORY.RECORD_OPTIMIZATION),
    [recommendations]
  );
  const collectionSections = useMemo(
    () => sectionizeRecommendations(recommendations, CATEGORY.COLLECTION_OPTIMIZATION),
    [recommendations]
  );
  const purchaseSections = useMemo(
    () => sectionizeRecommendations(recommendations, CATEGORY.PURCHASE),
    [recommendations]
  );
  const growSections = useMemo(
    () => sectionizeRecommendations(recommendations, CATEGORY.GROW_EXPAND),
    [recommendations]
  );

  const publishCounts = useCallback(
    (nextRecommendations, nextPairings) => {
      const nextRecord = nextRecommendations.filter((rec) => rec?.category === CATEGORY.RECORD_OPTIMIZATION);
      const nextCollection = nextRecommendations.filter((rec) => rec?.category === CATEGORY.COLLECTION_OPTIMIZATION);
      const nextPurchase = nextRecommendations.filter((rec) => rec?.category === CATEGORY.PURCHASE);
      const nextGrow = nextRecommendations.filter((rec) => rec?.category === CATEGORY.GROW_EXPAND);

      onCountsChange?.({
        record_optimization: countRecommendationItems(nextRecord),
        collection_optimization: countRecommendationItems(nextCollection),
        purchase_restock: countRecommendationItems(nextPurchase),
        pairings: Array.isArray(nextPairings) ? nextPairings.length : 0,
        grow_expand: nextGrow.length,
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
        cigars: [],
        smokingLogs: [],
        tastingLogs: [],
        inventoryUnits: [],
        wantListItems: [],
        preferences: {},
      };
    }

    const [
      pipes,
      blends,
      bottles,
      cigars,
      smokingLogs,
      tastingLogs,
      inventoryUnits,
      wantListItems,
      shoppingListItems,
      userPrefs,
    ] = await Promise.all([
      safeFilter(base44.entities.Pipe, { created_by: user.email }, '-updated_date', 500, 'pipes'),
      safeFilter(base44.entities.TobaccoBlend, { created_by: user.email }, '-updated_date', 500, 'blends'),
      safeFilter(base44.entities.Bottle, { created_by: user.email }, '-updated_date', 500, 'bottles'),
      safeFilter(base44.entities.Cigar, { created_by: user.email }, '-updated_date', 500, 'cigars'),
      safeFilter(base44.entities.SmokingLog, { created_by: user.email }, '-date', 1000, 'smokingLogs'),
      safeFilter(base44.entities.TastingLog, { created_by: user.email }, '-tasting_date', 500, 'tastingLogs'),
      safeFilter(base44.entities.WhiskeyInventoryUnit, { created_by: user.email }, null, 2000, 'inventoryUnits'),
      safeFilter(base44.entities.AcquisitionItem, { created_by: user.email }, '-updated_date', 500, 'wantListItems'),
      safeFilter(base44.entities.ShoppingListItem, { created_by: user.email }, '-updated_date', 500, 'shoppingListItems'),
      safeFilter(base44.entities.User, { email: user.email }, '-updated_date', 1, 'userPrefs'),
    ]);

    return {
      pipes,
      blends,
      bottles,
      cigars,
      smokingLogs,
      tastingLogs,
      inventoryUnits,
      wantListItems: [...wantListItems, ...shoppingListItems],
      preferences: userPrefs?.[0] || {},
      cigarModuleActive: cigars.length > 0,
    };
  }, [user?.email]);

  const loadPrimaryDataRef = useRef(null);

  // Auto-enrich: silently fill missing metadata + seed valuations
  const autoEnrichRecords = useCallback(async (context, userEmail) => {
    if (!userEmail || !context) return;

    const sessionKey = `pk_curator_autoenrich_${userEmail}`;
    const lastRun = sessionStorage.getItem(sessionKey);
    const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
    if (lastRun && Date.now() - Number(lastRun) < INTERVAL_MS) return;
    sessionStorage.setItem(sessionKey, String(Date.now()));

    // 1. Metadata enrichment for bottles missing core fields
    const bottlesMissingMeta = (context.bottles || []).filter(
      (b) => !b.distillery || !b.region || !b.country || !b.abv || !(b.type || b.whiskey_type)
    );
    if (bottlesMissingMeta.length > 0) {
      try {
        await base44.functions.invoke('autoEnrichBottleMetadata', {
          bottles: bottlesMissingMeta.map((b) => ({
            id: b.id, name: b.name, distillery: b.distillery, type: b.type,
            whiskey_type: b.whiskey_type, region: b.region, country: b.country, abv: b.abv,
          })),
        });
        // Trigger a silent refresh so updated metadata is reflected
        if (mountedRef.current && loadPrimaryDataRef.current) {
          await loadPrimaryDataRef.current({ silent: true });
        }
      } catch (err) {
        console.warn('[Curator] autoEnrichBottleMetadata failed (non-fatal):', err?.message);
      }
    }

    // 2. Auto-seed valuations for bottles missing pricing data but with a purchase price
    const bottlesMissingValuation = (context.bottles || []).filter(
      (b) => !b.retail_price && !b.aftermarket_price && !b.collector_value && b.purchase_price
    );
    for (const bottle of bottlesMissingValuation.slice(0, 20)) {
      try {
        await seedInitialSnapshotIfMissing(
          bottle, 'whiskeykeeper', 'bottle', userEmail, base44, [], { bottles: context.bottles }
        );
        if (!bottle.retail_price) {
          await base44.entities.Bottle.update(bottle.id, { retail_price: bottle.purchase_price });
        }
      } catch (err) {
        console.warn('[Curator] valuation seed failed for bottle', bottle.id, '(non-fatal):', err?.message);
      }
    }
  }, []);

  const loadPrimaryData = useCallback(
    async ({ silent = false } = {}) => {
      if (!user?.email) {
        setLoading(false);
        setRecommendations([]);
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

        const generated = generateRecommendations(context) || [];
        const nextRecommendations = generated.filter((rec) => rec?.category !== CATEGORY.PAIRING);

        if (!mountedRef.current) return;

        setRecommendations(nextRecommendations);
        publishCounts(nextRecommendations, pairingsRef.current);

        // Auto-enrich records silently after a short delay (don't block render)
        setTimeout(() => {
          if (!mountedRef.current) return;
          autoEnrichRecords(context, user?.email);
        }, 1500);
      } catch (err) {
        console.error('[Curator] primary load failed:', err);
        if (!mountedRef.current) return;
        setRecommendations([]);
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
      setPairings(nextPairings);
      publishCounts(recommendations, nextPairings);
    } catch (err) {
      console.error('[Curator] pairing load failed:', err);
      if (!mountedRef.current) return;
      setPairings([]);
      publishCounts(recommendations, []);
    } finally {
      if (mountedRef.current) setPairingsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildContext, publishCounts, user?.email]);

  // Keep a stable ref to loadPrimaryData so autoEnrichRecords can call it without circular deps
  useEffect(() => {
    loadPrimaryDataRef.current = loadPrimaryData;
  }, [loadPrimaryData]);

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
      if (actionKey === 'review_specializations') {
        setSpecItems(Array.isArray(payload) ? payload : payload?.items || [payload]);
        setShowSpecReview(true);
        return { ok: true };
      }

      if (actionKey === 'ask_curator') {
        const title = payload?.title || payload?.recordName || payload?.name || 'this';
        setPreFillMessage(`Help me with ${title}.`);
        onSurfaceChange?.('chat');
        return { ok: true };
      }

      if (actionKey === 'build_session') {
        const pipeName = payload?.leftItem?.name || 'a pipe';
        const blendName = payload?.blendBridge?.name || 'a blend';
        const bottleName = payload?.rightItem?.name || 'a pour';
        setPreFillMessage(`Build me a session around ${pipeName}, ${blendName}, and ${bottleName}.`);
        onSurfaceChange?.('chat');
        return { ok: true };
      }

      if (actionKey === 'view_items' || actionKey === 'view_details' || actionKey === 'open_records') {
        const nav = buildViewItemsNavigation(payload);
        if (nav?.navigate?.path) window.location.href = nav.navigate.path;
        return nav;
      }

      const normalizedAction = actionKey === 'add_to_shopping_list' ? 'move_to_shopping_list' : actionKey;
      const result = await executeRecommendationAction(payload, normalizedAction, {
        ...opts,
        userEmail: user?.email,
      });

      if (!result?.ok) {
        console.error('[Curator] action failed:', result?.error || 'unknown error');
        return result;
      }

      const resolvedIds = result.resolvedRecordIds || [];
      const resolvedRecommendationIds = result.resolvedRecommendationIds || [];

      setRecommendations((prev) => {
        const next = reconcileRecommendations(prev, resolvedIds, resolvedRecommendationIds);
        publishCounts(next, pairings);
        return next;
      });

      if (normalizedAction === 'save_pairing') {
        setPairings((prev) => {
          const next = prev.filter((p) => p.id !== payload?.id);
          publishCounts(recommendations, next);
          return next;
        });
      }

      if (
        normalizedAction === 'apply_fix' ||
        normalizedAction === 'approve_changes' ||
        normalizedAction === 'move_to_shopping_list' ||
        normalizedAction === 'add_to_want_list'
      ) {
        await loadPrimaryData({ silent: true });
        if (activeSurface === 'pairings') await loadPairings();
      }

      return result;
    },
    [activeSurface, loadPairings, loadPrimaryData, onSurfaceChange, pairings, publishCounts, recommendations, user?.email]
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
        <>
          {showSpecReview ? (
            <CuratorSpecializationReview
              specRecs={specItems}
              collectionSections={collectionSections}
              onAction={handleAction}
              onDone={() => setShowSpecReview(false)}
              onAskCurator={(pipe) => {
                setPreFillMessage(`Tell me about specializing my ${pipe?.recordName || 'pipe'}.`);
                setShowSpecReview(false);
                onSurfaceChange?.('chat');
              }}
              onOpenGrowExpand={() => {
                setShowSpecReview(false);
                onSurfaceChange?.('grow_expand');
              }}
            />
          ) : (
            <CuratorResultsBoard
              sections={recordSections}
              onAction={handleAction}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          )}
        </>
      );
    case 'collection_optimization':
      return (
        <>
          {showSpecReview ? (
            <CuratorSpecializationReview
              specRecs={specItems}
              collectionSections={collectionSections}
              onAction={handleAction}
              onDone={() => setShowSpecReview(false)}
              onAskCurator={(pipe) => {
                setPreFillMessage(`Tell me about specializing my ${pipe?.recordName || 'pipe'}.`);
                setShowSpecReview(false);
                onSurfaceChange?.('chat');
              }}
              onOpenGrowExpand={() => {
                setShowSpecReview(false);
                onSurfaceChange?.('grow_expand');
              }}
            />
          ) : (
            <CuratorResultsBoard
              sections={collectionSections}
              onAction={handleAction}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          )}
        </>
      );
    case 'purchase_restock':
      return (
        <CuratorPurchaseQueue
          sections={purchaseSections}
          onAction={handleAction}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          userEmail={user?.email}
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
          sections={growSections}
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
          collectionContext={contextRef.current}
        />
      );
    default:
      return null;
  }
}