/**
 * CuratorWorkspace — Six-surface operations workspace
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
  { key: 'board',         label: 'Record Optimization',    icon: LayoutDashboard },
  { key: 'collectionopt', label: 'Collection Optimization', icon: Layers },
  { key: 'purchase',      label: 'Purchase & Restock',      icon: ShoppingCart },
  { key: 'pairings',      label: 'Pairings',                icon: Sparkles },
  { key: 'grow',          label: 'Grow & Expand',           icon: TrendingUp },
  { key: 'chat',          label: 'Chat',                    icon: MessageCircle },
];

const PURCHASE_CATEGORIES = [CATEGORY.PURCHASE, CATEGORY.CIGAR_DISCOVERY];
const COLLECTION_OPTIMIZATION_CATEGORIES = [CATEGORY.BALANCE, CATEGORY.UTILIZATION];

function buildPreferences(collectionContext, tasteProfile) {
  const { blends = [], bottles = [] } = collectionContext;

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
    preferred_blend_types:   tasteProfile?.preferred_blend_types   || [],
    preferred_whiskey_types: tasteProfile?.preferred_whiskey_types || [],
    disliked_blend_types,
    disliked_whiskey_types,
  };
}

function buildRecAskCuratorContext(recommendation) {
  const parts = [recommendation.title];
  if (recommendation.summary) parts.push(recommendation.summary);
  if (recommendation.whyItMatters) parts.push(`Why it matters: ${recommendation.whyItMatters}`);
  const names = (recommendation.items || []).slice(0, 5).map((i) => i.itemName || i.recordName).filter(Boolean);
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
 * @param {object}  props.collectionContext
 * @param {boolean} props.isLoading
 */
export default function CuratorWorkspace({ collectionContext = {}, isLoading = false }) {
  const { user }    = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate    = useNavigate();

  const [surface, setSurface]             = useState('board');
  const [allSections, setAllSections]     = useState([]);
  const [purchaseSections, setPurchaseSections] = useState([]);
  const [specRecs, setSpecRecs]           = useState([]);
  const [pairingRecs, setPairingRecs]     = useState([]);
  const [analysisRun, setAnalysisRun]     = useState(false);

  // resolvedRecIds — immediately removes resolved recs without waiting for re-analysis
  const [resolvedRecIds, setResolvedRecIds] = useState(new Set());

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

  const [threadId, setThreadId]             = useState(null);
  const [preFillMessage, setPreFillMessage] = useState('');

  const runAnalysis = useCallback(() => {
    const recs = generateRecommendations(collectionContext);
    setAllSections(groupRecommendations(recs));
    setPurchaseSections(groupRecommendations(recs.filter((r) => PURCHASE_CATEGORIES.includes(r.category))));
    setSpecRecs(recs.filter((r) => r.goal === 'specialization_candidates'));
    setPairingRecs(generatePairingRecommendations({ ...collectionContext, preferences }));
    setResolvedRecIds(new Set());
    setAnalysisRun(true);
  }, [collectionContext, preferences]);

  useEffect(() => {
    if (!isLoading && !analysisRun) runAnalysis();
  }, [isLoading, analysisRun, runAnalysis]);

  useEffect(() => { setAnalysisRun(false); }, [collectionContext]);

  // Helper: filter resolved recs out of any section list
  const filterResolved = useCallback((sections) => {
    if (resolvedRecIds.size === 0) return sections;
    return sections
      .map((section) => ({
        ...section,
        recommendations: section.recommendations.filter((r) => !resolvedRecIds.has(r.id)),
      }))
      .filter((section) => section.recommendations.length > 0);
  }, [resolvedRecIds]);

  const visibleSections = useMemo(() => filterResolved(allSections), [allSections, filterResolved]);

  // Board: record optimization + metadata (legacy alias)
  const boardSections = useMemo(
    () => visibleSections.filter(
      (s) => s.category === CATEGORY.RECORD_OPTIMIZATION || s.category === CATEGORY.METADATA
    ),
    [visibleSections]
  );

  const collectionOptSections = useMemo(
    () => visibleSections.filter((s) => COLLECTION_OPTIMIZATION_CATEGORIES.includes(s.category)),
    [visibleSections]
  );

  const visiblePurchaseSections = useMemo(() => filterResolved(purchaseSections), [purchaseSections, filterResolved]);

  const visiblePairingRecs = useMemo(() => {
    if (resolvedRecIds.size === 0) return pairingRecs;
    return pairingRecs.filter((r) => !resolvedRecIds.has(r.id));
  }, [pairingRecs, resolvedRecIds]);

  const openChat = useCallback((contextMessage) => {
    setPreFillMessage(contextMessage || '');
    setSurface('chat');
  }, []);

  const handleAction = useCallback(async (actionKey, recommendation, opts = {}) => {
    if (actionKey === 'ask_curator') {
      openChat(buildRecAskCuratorContext(recommendation));
      return { ok: true };
    }

    if (actionKey === 'view_items' || actionKey === 'view_details') {
      const navResult = buildViewItemsNavigation(recommendation);
      if (navResult.navigate?.path) navigate(navResult.navigate.path);
      return navResult;
    }

    const result = await executeRecommendationAction(recommendation, actionKey, {
      ...opts,
      userEmail: user?.email,
    });

    // Immediately remove resolved rec from display
    if (result?.ok && (
      result?.dismissed ||
      ['apply_fix', 'approve_changes', 'apply_specialization', 'acknowledge', 'add_to_shopping_list',
       'add_to_rotation', 'mark_for_session', 'add_to_want_list'].includes(actionKey)
    )) {
      if (recommendation?.id) {
        setResolvedRecIds((prev) => new Set([...prev, recommendation.id]));
      }
    }

    if (['apply_fix', 'approve_changes', 'apply_specialization'].includes(actionKey) && result?.applied > 0) {
      queryClient.invalidateQueries({ queryKey: ['curatorCollection'] });
      // Schedule re-analysis after DB writes settle
      setTimeout(() => runAnalysis(), 800);
    }
    if (actionKey === 'add_to_shopping_list') {
      queryClient.invalidateQueries({ queryKey: ['shoppingListItems'] });
    }
    if (actionKey === 'add_to_want_list') {
      queryClient.invalidateQueries({ queryKey: ['curatorCollection', 'wantList'] });
    }
    return result;
  }, [user?.email, queryClient, navigate, openChat, runAnalysis]);

  const handlePairingAction = useCallback((actionKey, pairing) => {
    if (actionKey === 'ask_curator') {
      const left    = pairing.leftItem?.name  || pairing.leftItem?.type  || 'item';
      const blend   = pairing.blendBridge?.name;
      const right   = pairing.rightItem?.name || pairing.rightItem?.type || 'item';
      const trio    = blend ? `${left} / ${blend} / ${right}` : `${left} and ${right}`;
      const rationale = pairing.rationale ? ` — ${pairing.rationale}` : '';
      openChat(`Tell me more about this pairing: ${trio}${rationale}`);
    }
  }, [openChat]);

  const handleSpecAskCurator = useCallback((pipe) => {
    openChat(buildSpecAskCuratorContext(pipe));
  }, [openChat]);

  const handlePairingsTabAskCurator = useCallback(() => {
    openChat('I have questions about my pairing suggestions and how to make the most of them.');
  }, [openChat]);

  const handlePreFillConsumed = useCallback(() => {
    setPreFillMessage('');
  }, []);

  const specCandidateCount = specRecs.flatMap((r) => r.items || []).filter((i) => i.hasLogData).length;
  const collectionOptCount = collectionOptSections.reduce((s, g) => s + g.recommendations.length, 0) + specCandidateCount;
  const purchaseCount      = visiblePurchaseSections.reduce((s, g) => s + g.recommendations.length, 0);
  const pairingCount       = visiblePairingRecs.reduce((s, r) => s + (r.items?.length || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(140,105,65,0.6)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Surface tabs */}
      <div
        className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
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
              className="flex-shrink-0 flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
              style={
                isActive
                  ? { background: 'rgba(140,105,65,0.28)', color: '#F5F1E7', border: '1px solid rgba(140,105,65,0.45)' }
                  : { background: 'transparent', color: 'rgba(224,216,200,0.48)', border: '1px solid transparent' }
              }
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
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
          onOpenGrowExpand={() => setSurface('grow')}
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
          onAskCurator={() => setSurface('chat')}
        />
      )}

      {surface === 'chat' && (
        <div
          style={{
            background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '18px',
            padding: '24px',
          }}
        >
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
