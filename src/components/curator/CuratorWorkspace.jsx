/**
 * CuratorWorkspace
 *
 * Main Curator layout container.
 * Manages view state (home ↔ results) and runs the recommendation engine.
 *
 * Views:
 *   home    — CuratorQuickActions (6 action tiles)
 *   results — CuratorResultsBoard (grouped recommendations)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import CuratorQuickActions from './CuratorQuickActions';
import CuratorResultsBoard from './CuratorResultsBoard';
import { generateRecommendations } from '@/lib/curator/recommendationEngine.js';
import { groupRecommendations } from '@/lib/curator/recommendationGrouping.js';
import { executeRecommendationAction } from '@/lib/curator/recommendationActions.js';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';

const ACTION_LABELS = {
  plan_session:    'Plan Session',
  optimize:        'Optimize Collection',
  what_to_smoke:   'What to Smoke Now',
  pairing:         'Pairing Suggestions',
  specialization:  'Recommend Specializations',
  purchase:        'Purchase / Restock',
};

/**
 * @param {object}   props
 * @param {object}   props.collectionContext   - { pipes, blends, bottles, cigars, smokingLogs, tastingLogs, cigarSessions, wantListItems, cigarModuleActive }
 * @param {boolean}  props.isLoading           - Whether data is still loading
 * @param {Function} props.onAskCurator        - (prompt) => void
 */
export default function CuratorWorkspace({ collectionContext = {}, isLoading = false, onAskCurator }) {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [view, setView]                       = useState('home');       // 'home' | 'results'
  const [runLabel, setRunLabel]               = useState('Results');
  const [allSections, setAllSections]         = useState([]);
  const [activeCategories, setActiveCategories] = useState([]);
  const [isRunning, setIsRunning]             = useState(false);

  const handleQuickAction = useCallback((actionKey, categories) => {
    setIsRunning(true);

    // Small timeout so the UI can show the running state before blocking
    setTimeout(() => {
      try {
        const recs = generateRecommendations(collectionContext);

        // Filter to requested categories if specified
        const filtered = categories
          ? recs.filter((r) => categories.includes(r.category))
          : recs;

        const sections = groupRecommendations(filtered);
        setAllSections(sections);
        setActiveCategories([]);
        setRunLabel(ACTION_LABELS[actionKey] || 'Results');
        setView('results');
      } finally {
        setIsRunning(false);
      }
    }, 50);
  }, [collectionContext]);

  const handleCategoryToggle = useCallback((category) => {
    setActiveCategories((prev) => {
      if (prev.includes(category)) {
        const next = prev.filter((c) => c !== category);
        return next;
      }
      return [...prev, category];
    });
  }, []);

  const handleReset = useCallback(() => {
    setView('home');
    setAllSections([]);
    setActiveCategories([]);
  }, []);

  const handleAction = useCallback(async (actionKey, recommendation, opts = {}) => {
    const result = await executeRecommendationAction(
      recommendation,
      actionKey,
      { ...opts, userEmail: user?.email }
    );

    // Invalidate data queries after mutating actions so the parent can refetch
    if (actionKey === 'apply_fix' || actionKey === 'approve_changes' || actionKey === 'apply_specialization') {
      queryClient.invalidateQueries({ queryKey: ['curatorCollection'] });
    }
    if (actionKey === 'add_to_shopping_list') {
      queryClient.invalidateQueries({ queryKey: ['shoppingListItems'] });
    }

    return result;
  }, [user?.email, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(140,105,65,0.6)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {view === 'home' && (
        <CuratorQuickActions
          onAction={handleQuickAction}
          isRunning={isRunning}
        />
      )}

      {view === 'results' && (
        <CuratorResultsBoard
          sections={allSections}
          activeCategories={activeCategories}
          onCategoryToggle={handleCategoryToggle}
          onReset={handleReset}
          onAction={handleAction}
          onAskCurator={onAskCurator}
          runLabel={runLabel}
        />
      )}

      {isRunning && view === 'home' && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin mr-2" style={{ color: 'rgba(80,180,130,0.8)' }} />
          <p className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>Running analysis…</p>
        </div>
      )}
    </div>
  );
}
