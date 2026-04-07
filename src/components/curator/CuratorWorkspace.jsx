/**
 * CuratorWorkspace
 *
 * Six-surface operations workspace.
 *
 * Surfaces:
 *   1. Optimize Board          — record quality / metadata landing
 *   2. Collection Optimization — rotation, balance, pipe specialization
 *   3. Purchase & Restock      — actionable queue with batch shopping list actions
 *   4. Pairings                — structured pairing entries with result sub-tabs
 *   5. Grow & Expand           — outside-collection exploration / Add to Want List
 *   6. Chat                    — expert tobacconist chat (free-form questions)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LayoutDashboard, Layers, ShoppingCart, Sparkles, TrendingUp, MessageCircle } from 'lucide-react';
import CuratorResultsBoard from './CuratorResultsBoard';
import CuratorSpecializationReview from './CuratorSpecializationReview';
import CuratorPurchaseQueue from './CuratorPurchaseQueue';
import CuratorPairingsTab from './CuratorPairingsTab';
import CuratorGrowAndExpand from './CuratorGrowAndExpand';
import ExpertTobacconistChat from '@/components/agent/ExpertTobacconistChat';
import { generateRecommendations } from '@/lib/curator/recommendationEngine.js';
import { groupRecommendations } from '@/lib/curator/recommendationGrouping.js';
import { executeRecommendationAction, buildViewItemsNavigation } from '@/lib/curator/recommendationActions.js';
import { generatePairingRecommendations } from '@/lib/curator/pairingEngine.js';
import { useTasteProfile } from '@/components/curator/useTasteProfile.jsx';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';
import { CATEGORY } from '@/lib/curator/recommendationSchema.js';

const SURFACES = [
  { key: 'board',         label: 'Optimize Board',         icon: LayoutDashboard },
  { key: 'collectionopt', label: 'Collection Optimization', icon: Layers },
  { key: 'purchase',      label: 'Purchase & Restock',      icon: ShoppingCart },
  { key: 'pairings',      label: 'Pairings',                icon: Sparkles },
  { key: 'grow',          label: 'Grow & Expand',           icon: TrendingUp },
  { key: 'chat',          label: 'Chat',                    icon: MessageCircle },
];

const PURCHASE_CATEGORIES = [CATEGORY.PURCHASE, CATEGORY.CIGAR_DISCOVERY];
const COLLECTION_OPT_CATEGORIES = [CATEGORY.BALANCE, CATEGORY.UTILIZATION];

// ─── Preference builder from collection data ──────────────────────────────────

function buildPreferences(collectionContext, tasteProfile) {
  const { blends = [], bottles = [] } = collectionContext;

  // Compute per-type average ratings to find disliked types (avg < 2.5 with ≥2 samples)
  const blendTypeRatings = {};
  const blendTypeCounts  = {};
  for (const b of blends) {
    if (!b.rating || !b.blend_type) continue;
    blendTypeRatings[b.blend_type] = (blendTypeRatings[b.blend_type] || 0) + Number(b.rating);
    blendTypeCounts[b.blend_type]  = (blendTypeCounts[b.blend_type]  || 0) + 1;
  }
  const disliked_blend_types = Object.entries(blendTypeRatings)
    .filter(([type, total]) => blendTypeCounts[type] >= 2 && total / blendTypeCounts[type] < 2.5)
    .map(([type]) => type);

  const whiskeyTypeRatings = {};
  const whiskeyTypeCounts  = {};
  for (const b of bottles) {
    const type = b.type || b.whiskey_type;
    if (!b.rating || !type) continue;
    whiskeyTypeRatings[type] = (whiskeyTypeRatings[type] || 0) + Number(b.rating);
    whiskeyTypeCounts[type]  = (whiskeyTypeCounts[type]  || 0) + 1;
  }
  const disliked_whiskey_types = Object.entries(whiskeyTypeRatings)
    .filter(([type, total]) => whiskeyTypeCounts[type] >= 2 && total / whiskeyTypeCounts[type] < 2.5)
    .map(([type]) => type);

  return {
    preferred_blend_types:  tasteProfile?.preferred_blend_types  || [],
    preferred_whiskey_types: tasteProfile?.preferred_whiskey_types || [],
    disliked_blend_types,
    disliked_whiskey_types,
  };
}

// ─── Ask Curator context builders ─────────────────────────────────────────────

function buildRecAskCuratorContext(recommendation) {
  const parts = [recommendation.title];
  if (recommendation.summary) parts.push(recommendation.summary);
  if (recommendation.whyItMatters) parts.push(`Why it matters: ${recommendation.whyItMatters}`);
  const names = (recommendation.items || [])
    .slice(0, 5)
    .map((i) => i.itemName || i.recordName)
    .filter(Boolean);
  if (names.length > 0) parts.push(`Affected items: ${names.join(', ')}`);
  return parts.join('. ');
}

function buildSpecAskCuratorContext(pipe) {
  const pct = pipe.dominanceRatio != null ? `${Math.round(pipe.dominanceRatio * 100)}%` : null;
  return [
    `I need advice on specializing my pipe "${pipe.recordName || pipe.itemName}".`,
    pipe.suggestedSpec && `Session history suggests "${pipe.suggestedSpec}" as the dominant blend type${pct ? ` (${pct} of sessions)` : ''}.`,
    `Should I specialize it, and what are the trade-offs?`,
  ].filter(Boolean).join(' ');
}

/**
 * @param {object}  props
 * @param {object}  props.collectionContext  - { pipes, blends, bottles, cigars, smokingLogs, tastingLogs, cigarSessions, wantListItems, cigarModuleActive }
 * @param {boolean} props.isLoading         - Whether data is still loading
 */
export default function CuratorWorkspace({ collectionContext = {}, isLoading = false }) {
  const { user }    = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate    = useNavigate();

  const [surface, setSurface]           = useState('board');
  const [allSections, setAllSections]   = useState([]);
  const [purchaseSections, setPurchaseSections] = useState([]);
  const [specRecs, setSpecRecs]         = useState([]);
  const [pairingRecs, setPairingRecs]   = useState([]);
  const [analysisRun, setAnalysisRun]   = useState(false);

  // Taste profile — derived from collection data, used for preference-aware filtering
  const tasteProfile = useTasteProfile({
    pipes:       collectionContext.pipes       || [],
    blends:      collectionContext.blends      || [],
    bottles:     collectionContext.bottles     || [],
    smokingLogs: collectionContext.smokingLogs || [],
    tastingLogs: collectionContext.tastingLogs || [],
  });

  const preferences = useMemo(
    () => buildPreferences(collectionContext, tasteProfile),
    [collectionContext, tasteProfile]
  );

  // Track dismissed/applied recommendation IDs for this session
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // Chat state
  const [threadId, setThreadId]           = useState(null);
  const [preFillMessage, setPreFillMessage] = useState('');

  const runAnalysis = useCallback(() => {
    const recs = generateRecommendations(collectionContext);
    setAllSections(groupRecommendations(recs));
    setPurchaseSections(groupRecommendations(recs.filter((r) => PURCHASE_CATEGORIES.includes(r.category))));
    setSpecRecs(recs.filter((r) => r.category === CATEGORY.SPECIALIZATION));
    setPairingRecs(generatePairingRecommendations({ ...collectionContext, preferences }));
    setDismissedIds(new Set());
    setAnalysisRun(true);
  }, [collectionContext, preferences]);

  // Run analysis once data loads
  useEffect(() => {
    if (!isLoading && !analysisRun) runAnalysis();
  }, [isLoading, analysisRun, runAnalysis]);

  // Re-run when collection changes
  useEffect(() => { setAnalysisRun(false); }, [collectionContext]);

  // Filter out dismissed recommendations from sections
  const visibleSections = useMemo(() => {
    if (dismissedIds.size === 0) return allSections;
    return allSections
      .map((section) => ({
        ...section,
        recommendations: section.recommendations.filter((r) => !dismissedIds.has(r.id)),
      }))
      .filter((section) => section.recommendations.length > 0);
  }, [allSections, dismissedIds]);

  // Board: only record-quality / metadata sections
  const boardSections = useMemo(
    () => visibleSections.filter((s) => s.category === CATEGORY.METADATA),
    [visibleSections]
  );

  // Collection Optimization: balance + utilization (spec handled separately)
  const collectionOptSections = useMemo(
    () => visibleSections.filter((s) => COLLECTION_OPT_CATEGORIES.includes(s.category)),
    [visibleSections]
  );

  const visiblePurchaseSections = useMemo(() => {
    if (dismissedIds.size === 0) return purchaseSections;
    return purchaseSections
      .map((section) => ({
        ...section,
        recommendations: section.recommendations.filter((r) => !dismissedIds.has(r.id)),
      }))
      .filter((section) => section.recommendations.length > 0);
  }, [purchaseSections, dismissedIds]);

  const visiblePairingRecs = useMemo(() => {
    if (dismissedIds.size === 0) return pairingRecs;
    return pairingRecs.filter((r) => !dismissedIds.has(r.id));
  }, [pairingRecs, dismissedIds]);

  // Dismiss a recommendation by ID
  const dismissRec = useCallback((recId) => {
    if (recId) setDismissedIds((prev) => new Set([...prev, recId]));
  }, []);

  // Switch to chat with pre-filled context
  const openChat = useCallback((contextMessage) => {
    setPreFillMessage(contextMessage || '');
    setSurface('chat');
  }, []);

  const handleAction = useCallback(async (actionKey, recommendation, opts = {}) => {
    // ── Intercept: Ask Curator ─────────────────────────────────────────────────
    if (actionKey === 'ask_curator') {
      openChat(buildRecAskCuratorContext(recommendation));
      return { ok: true };
    }

    // ── Intercept: View Items / View Details ───────────────────────────────────
    if (actionKey === 'view_items' || actionKey === 'view_details') {
      const navResult = buildViewItemsNavigation(recommendation);
      if (navResult.navigate?.path) {
        navigate(navResult.navigate.path);
      }
      return navResult;
    }

    const result = await executeRecommendationAction(recommendation, actionKey, {
      ...opts,
      userEmail: user?.email,
    });

    // ── Dismiss on completion ──────────────────────────────────────────────────
    if (
      result?.ok &&
      ['apply_fix', 'approve_changes', 'apply_specialization', 'acknowledge', 'add_to_shopping_list'].includes(actionKey)
    ) {
      dismissRec(recommendation?.id);
    }

    // ── Handle navigation results from engine (e.g. apply_fix fallback) ───────
    if (result?.navigate?.path) {
      navigate(result.navigate.path);
    }

    if (['apply_fix', 'approve_changes', 'apply_specialization'].includes(actionKey)) {
      queryClient.invalidateQueries({ queryKey: ['curatorCollection'] });
    }
    if (actionKey === 'add_to_shopping_list') {
      queryClient.invalidateQueries({ queryKey: ['shoppingListItems'] });
    }
    return result;
  }, [user?.email, queryClient, navigate, dismissRec, openChat]);

  // Pairings "Ask Curator" — switch to Chat tab with context pre-filled
  const handlePairingAction = useCallback((actionKey, pairing) => {
    if (actionKey === 'ask_curator') {
      const left     = pairing.leftItem?.name  || pairing.leftItem?.type  || 'item';
      const blend    = pairing.blendBridge?.name;
      const right    = pairing.rightItem?.name || pairing.rightItem?.type || 'item';
      const trio     = blend ? `${left} / ${blend} / ${right}` : `${left} and ${right}`;
      const rationale = pairing.rationale ? ` — ${pairing.rationale}` : '';
      openChat(`Tell me more about this pairing: ${trio}${rationale}`);
    }
  }, [openChat]);

  // Specialization "Ask Curator"
  const handleSpecAskCurator = useCallback((pipe) => {
    openChat(buildSpecAskCuratorContext(pipe));
  }, [openChat]);

  // Pairings-tab Ask Curator (no specific pairing selected)
  const handlePairingsTabAskCurator = useCallback(() => {
    openChat('I have questions about my pairing suggestions and how to make the most of them.');
  }, [openChat]);

  // Clear pre-fill once chat has consumed it
  const handlePreFillConsumed = useCallback(() => {
    setPreFillMessage('');
  }, []);

  // Badge counts
  const specCandidateCount    = specRecs
    .flatMap((r) => r.items || [])
    .filter((i) => i.hasLogData).length;
  const collectionOptCount    = collectionOptSections.reduce((s, g) => s + g.recommendations.length, 0)
    + specCandidateCount;
  const purchaseCount         = visiblePurchaseSections.reduce((s, g) => s + g.recommendations.length, 0);
  const pairingCount          = visiblePairingRecs.reduce((s, r) => s + (r.items?.length || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(140,105,65,0.6)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Surface tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.15)' }}
      >
        {SURFACES.map(({ key, label, icon: Icon }) => {
          const isActive = surface === key;
          const badge =
            key === 'collectionopt' && collectionOptCount > 0 ? collectionOptCount :
            key === 'purchase'      && purchaseCount > 0      ? purchaseCount       :
            key === 'pairings'      && pairingCount  > 0      ? pairingCount        : null;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSurface(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all"
              style={
                isActive
                  ? { background: 'rgba(140,105,65,0.25)', color: '#F5F1E7', border: '1px solid rgba(140,105,65,0.4)' }
                  : { background: 'transparent', color: 'rgba(224,216,200,0.5)', border: '1px solid transparent' }
              }
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
              {badge != null && (
                <span
                  className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(139,58,58,0.3)', color: 'rgba(220,140,140,1)' }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Surface content */}
      {surface === 'board' && (
        <CuratorResultsBoard
          sections={boardSections}
          onAction={handleAction}
          onOpenSpecialization={() => setSurface('collectionopt')}
          onOpenPurchase={() => setSurface('purchase')}
          onRefresh={runAnalysis}
        />
      )}

      {surface === 'collectionopt' && (
        <CuratorSpecializationReview
          specRecs={specRecs}
          collectionSections={collectionOptSections}
          onAction={handleAction}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ['curatorCollection'] });
            setSurface('board');
          }}
          onAskCurator={handleSpecAskCurator}
        />
      )}

      {surface === 'purchase' && (
        <CuratorPurchaseQueue
          sections={visiblePurchaseSections}
          onAction={handleAction}
          userEmail={user?.email}
        />
      )}

      {surface === 'pairings' && (
        <CuratorPairingsTab
          pairingRecs={visiblePairingRecs}
          onAction={handlePairingAction}
          onRefresh={runAnalysis}
          onAskCurator={handlePairingsTabAskCurator}
        />
      )}

      {surface === 'grow' && (
        <CuratorGrowAndExpand
          collectionContext={collectionContext}
          preferences={preferences}
          userEmail={user?.email}
        />
      )}

      {surface === 'chat' && (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#F5F1E7' }}>
              Ask the Curator
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
              Expert tobacconist chat — collection questions, pairing deep-dives, and more
            </p>
          </div>
          <ExpertTobacconistChat
            threadId={threadId}
            setThreadId={setThreadId}
            preFillMessage={preFillMessage}
            onPreFillConsumed={handlePreFillConsumed}
          />
        </div>
      )}
    </div>
  );
}
