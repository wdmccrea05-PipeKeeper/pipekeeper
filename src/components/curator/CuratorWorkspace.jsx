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

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, LayoutDashboard, Award, ShoppingCart, Sparkles, MessageCircle } from 'lucide-react';
import CuratorResultsBoard from './CuratorResultsBoard';
import CuratorSpecializationReview from './CuratorSpecializationReview';
import CuratorPurchaseQueue from './CuratorPurchaseQueue';
import CuratorPairingsTab from './CuratorPairingsTab';
import ExpertTobacconistChat from '@/components/agent/ExpertTobacconistChat';
import { generateRecommendations } from '@/lib/curator/recommendationEngine.js';
import { groupRecommendations } from '@/lib/curator/recommendationGrouping.js';
import { executeRecommendationAction } from '@/lib/curator/recommendationActions.js';
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

/**
 * @param {object}  props
 * @param {object}  props.collectionContext  - { pipes, blends, bottles, cigars, smokingLogs, tastingLogs, cigarSessions, wantListItems, cigarModuleActive }
 * @param {boolean} props.isLoading         - Whether data is still loading
 */
export default function CuratorWorkspace({ collectionContext = {}, isLoading = false }) {
  const { user }   = useCurrentUser();
  const queryClient = useQueryClient();

  const [surface, setSurface]           = useState('board');
  const [allSections, setAllSections]   = useState([]);
  const [purchaseSections, setPurchaseSections] = useState([]);
  const [specRecs, setSpecRecs]         = useState([]);
  const [pairingRecs, setPairingRecs]   = useState([]);
  const [analysisRun, setAnalysisRun]   = useState(false);

  // Chat state
  const [threadId, setThreadId]           = useState(null);
  const [preFillMessage, setPreFillMessage] = useState('');

  const runAnalysis = useCallback(() => {
    const recs = generateRecommendations(collectionContext);
    setAllSections(groupRecommendations(recs));
    setPurchaseSections(groupRecommendations(recs.filter((r) => PURCHASE_CATEGORIES.includes(r.category))));
    setSpecRecs(recs.filter((r) => r.category === CATEGORY.SPECIALIZATION));
    setPairingRecs(generatePairingRecommendations(collectionContext));
    setAnalysisRun(true);
  }, [collectionContext]);

  // Run analysis once data loads
  useEffect(() => {
    if (!isLoading && !analysisRun) runAnalysis();
  }, [isLoading, analysisRun, runAnalysis]);

  // Re-run when collection changes
  useEffect(() => { setAnalysisRun(false); }, [collectionContext]);

  const handleAction = useCallback(async (actionKey, recommendation, opts = {}) => {
    const result = await executeRecommendationAction(recommendation, actionKey, {
      ...opts,
      userEmail: user?.email,
    });
    if (['apply_fix', 'approve_changes', 'apply_specialization'].includes(actionKey)) {
      queryClient.invalidateQueries({ queryKey: ['curatorCollection'] });
    }
    if (actionKey === 'add_to_shopping_list') {
      queryClient.invalidateQueries({ queryKey: ['shoppingListItems'] });
    }
    return result;
  }, [user?.email, queryClient]);

  // Pairings "Ask Curator" — switch to Chat tab with context pre-filled
  const handlePairingAction = useCallback((actionKey, pairing) => {
    if (actionKey === 'ask_curator') {
      const left  = pairing.leftItem?.name  || pairing.leftItem?.type  || 'item';
      const right = pairing.rightItem?.name || pairing.rightItem?.type || 'item';
      const rationale = pairing.rationale ? ` — ${pairing.rationale}` : '';
      setPreFillMessage(`Tell me more about pairing ${left} with ${right}${rationale}`);
      setSurface('chat');
    }
    // build_session and save_pairing are handled by the main action handler
  }, []);

  // Clear pre-fill once chat has consumed it
  const handlePreFillConsumed = useCallback(() => {
    setPreFillMessage('');
  }, []);

  // Badge counts
  const specCandidateCount = specRecs
    .flatMap((r) => r.items || [])
    .filter((i) => i.hasLogData).length;
  const purchaseCount = purchaseSections.reduce((s, g) => s + g.recommendations.length, 0);
  const pairingCount  = pairingRecs.reduce((s, r) => s + (r.items?.length || 0), 0);

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
          sections={allSections}
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
        />
      )}

      {surface === 'purchase' && (
        <CuratorPurchaseQueue
          sections={purchaseSections}
          onAction={handleAction}
          userEmail={user?.email}
        />
      )}

      {surface === 'pairings' && (
        <CuratorPairingsTab
          pairingRecs={pairingRecs}
          onAction={handlePairingAction}
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
