/**
 * CuratorWorkspace
 *
 * Five-surface operations workspace.
 *
 * Surfaces:
 *   1. Optimize Board        — main landing, analysis auto-runs on mount
 *   2. Specialization Review — per-pipe specialization workflow
 *   3. Purchase & Restock    — actionable queue with batch shopping list actions
 *   4. Pairings              — structured pairing entries with follow-up actions
 *   5. Chat                  — expert tobacconist chat (secondary, not the landing)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LayoutDashboard, Award, ShoppingCart, Sparkles, MessageCircle } from 'lucide-react';
import CuratorResultsBoard from './CuratorResultsBoard';
import CuratorSpecializationReview from './CuratorSpecializationReview';
import CuratorPurchaseQueue from './CuratorPurchaseQueue';
import CuratorPairingsTab from './CuratorPairingsTab';
import ExpertTobacconistChat from '@/components/agent/ExpertTobacconistChat';
import { generateRecommendations } from '@/lib/curator/recommendationEngine.js';
import { groupRecommendations } from '@/lib/curator/recommendationGrouping.js';
import { executeRecommendationAction, buildViewItemsNavigation } from '@/lib/curator/recommendationActions.js';
import { generatePairingRecommendations } from '@/lib/curator/pairingEngine.js';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';
import { CATEGORY } from '@/lib/curator/recommendationSchema.js';

const SURFACES = [
  { key: 'board',          label: 'Optimize Board',        icon: LayoutDashboard },
  { key: 'specialization', label: 'Specialization Review', icon: Award },
  { key: 'purchase',       label: 'Purchase & Restock',    icon: ShoppingCart },
  { key: 'pairings',       label: 'Pairings',              icon: Sparkles },
  { key: 'chat',           label: 'Chat',                  icon: MessageCircle },
];

const PURCHASE_CATEGORIES = [CATEGORY.PURCHASE, CATEGORY.CIGAR_DISCOVERY];

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
    setPairingRecs(generatePairingRecommendations(collectionContext));
    setDismissedIds(new Set());
    setAnalysisRun(true);
  }, [collectionContext]);

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
  const specCandidateCount = specRecs
    .flatMap((r) => r.items || [])
    .filter((i) => i.hasLogData).length;
  const purchaseCount = visiblePurchaseSections.reduce((s, g) => s + g.recommendations.length, 0);
  const pairingCount  = visiblePairingRecs.reduce((s, r) => s + (r.items?.length || 0), 0);

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
            key === 'specialization' && specCandidateCount > 0 ? specCandidateCount :
            key === 'purchase'       && purchaseCount > 0       ? purchaseCount       :
            key === 'pairings'       && pairingCount  > 0       ? pairingCount        : null;

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
          sections={visibleSections}
          onAction={handleAction}
          onOpenSpecialization={() => setSurface('specialization')}
          onOpenPurchase={() => setSurface('purchase')}
          onRefresh={runAnalysis}
        />
      )}

      {surface === 'specialization' && (
        <CuratorSpecializationReview
          specRecs={specRecs}
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

      {surface === 'chat' && (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#F5F1E7' }}>
              Ask the Curator
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
              Expert tobacconist chat — explore collection questions, pairing deep-dives, and more
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
