/**
 * CuratorWorkspace
 *
 * Three-surface operations workspace. No chat shell. No ForYou panel.
 *
 * Surfaces:
 *   1. Optimize Board        — main landing, grouped operational recommendations
 *   2. Specialization Review — per-pipe specialization workflow
 *   3. Purchase & Restock    — actionable queue with batch shopping list actions
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Loader2, LayoutDashboard, Award, ShoppingCart } from 'lucide-react';
import CuratorResultsBoard from './CuratorResultsBoard';
import CuratorSpecializationReview from './CuratorSpecializationReview';
import CuratorPurchaseQueue from './CuratorPurchaseQueue';
import { generateRecommendations } from '@/lib/curator/recommendationEngine.js';
import { groupRecommendations } from '@/lib/curator/recommendationGrouping.js';
import { executeRecommendationAction } from '@/lib/curator/recommendationActions.js';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';
import { CATEGORY } from '@/lib/curator/recommendationSchema.js';

const SURFACES = [
  { key: 'board',          label: 'Optimize Board',      icon: LayoutDashboard },
  { key: 'specialization', label: 'Specialization Review', icon: Award },
  { key: 'purchase',       label: 'Purchase & Restock',  icon: ShoppingCart },
];

const OPTIMIZE_CATEGORIES = [
  CATEGORY.METADATA,
  CATEGORY.BALANCE,
  CATEGORY.UTILIZATION,
  CATEGORY.SPECIALIZATION,
];

const PURCHASE_CATEGORIES = [
  CATEGORY.PURCHASE,
  CATEGORY.CIGAR_DISCOVERY,
];

/**
 * @param {object}   props
 * @param {object}   props.collectionContext   - { pipes, blends, bottles, cigars, smokingLogs, tastingLogs, cigarSessions, wantListItems, cigarModuleActive }
 * @param {boolean}  props.isLoading           - Whether data is still loading
 */
export default function CuratorWorkspace({ collectionContext = {}, isLoading = false }) {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [surface, setSurface]           = useState('board');
  const [boardSections, setBoardSections] = useState([]);
  const [purchaseSections, setPurchaseSections] = useState([]);
  const [specItems, setSpecItems]       = useState([]);
  const [analysisRun, setAnalysisRun]   = useState(false);

  // Run analysis once data is loaded
  useEffect(() => {
    if (isLoading || analysisRun) return;
    const recs = generateRecommendations(collectionContext);

    const boardRecs    = recs.filter((r) => OPTIMIZE_CATEGORIES.includes(r.category));
    const purchaseRecs = recs.filter((r) => PURCHASE_CATEGORIES.includes(r.category));
    const specRecs     = recs.filter((r) => r.category === CATEGORY.SPECIALIZATION);

    setBoardSections(groupRecommendations(boardRecs));
    setPurchaseSections(groupRecommendations(purchaseRecs));

    // Flatten all specialization candidate items
    const allSpecItems = specRecs.flatMap((r) => r.items || []).filter((i) => i.hasLogData);
    setSpecItems(allSpecItems);

    setAnalysisRun(true);
  }, [isLoading, collectionContext, analysisRun]);

  // Re-run when collection changes
  useEffect(() => {
    setAnalysisRun(false);
  }, [collectionContext]);

  const handleAction = useCallback(async (actionKey, recommendation, opts = {}) => {
    const result = await executeRecommendationAction(
      recommendation,
      actionKey,
      { ...opts, userEmail: user?.email }
    );
    if (actionKey === 'apply_fix' || actionKey === 'approve_changes' || actionKey === 'apply_specialization') {
      queryClient.invalidateQueries({ queryKey: ['curatorCollection'] });
    }
    if (actionKey === 'add_to_shopping_list') {
      queryClient.invalidateQueries({ queryKey: ['shoppingListItems'] });
    }
    return result;
  }, [user?.email, queryClient]);

  const specCandidateCount = specItems.length;
  const purchaseCount = purchaseSections.reduce((s, g) => s + g.recommendations.length, 0);

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
            key === 'purchase'       && purchaseCount > 0       ? purchaseCount       : null;

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
          onOpenSpecialization={() => setSurface('specialization')}
          onOpenPurchase={() => setSurface('purchase')}
        />
      )}

      {surface === 'specialization' && (
        <CuratorSpecializationReview
          pipeItems={specItems}
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
    </div>
  );
}
