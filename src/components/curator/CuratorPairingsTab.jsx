/**
 * CuratorPairingsTab — Surface 4
 *
 * Pairings workspace with result sub-tabs.
 *
 * Sub-tabs:
 *   1. Expert Pairing   — primary pipe/cigar + whiskey pairings
 *   2. Old Favorites    — most-smoked blends with best bottle match
 *   3. Rediscover       — cellar blends waiting to be revisited
 *   4. Something New    — unexplored blends, expand your palate
 *
 * Pairing cards show Pipe / Blend / Pour with equal prominence.
 */

import React, { useState } from 'react';
import { Sparkles, ArrowLeftRight, RefreshCw, HelpCircle } from 'lucide-react';
import CuratorPairingResults from './CuratorPairingResults';

// Maximum pairings shown per sub-tab
const MAX_PAIRINGS_PER_TAB = 3;

const PAIRING_TABS = [
  {
    key:    'expert',
    label:  'Expert Pairing',
    goals:  ['pipe_whiskey_pairing', 'cigar_whiskey_pairing'],
    hint:   'Primary pairings based on your collection',
  },
  {
    key:    'favorites',
    label:  'Old Favorites',
    goals:  ['old_favorites_pairing'],
    hint:   'Your most-smoked blends with the best whiskey match',
  },
  {
    key:    'rediscover',
    label:  'Rediscover',
    goals:  ['rediscover_pairing'],
    hint:   'Cellar blends waiting to be revisited',
  },
  {
    key:    'new',
    label:  'Something New',
    goals:  ['something_new_pairing'],
    hint:   "Expand your palate — blends you haven't explored yet",
  },
];

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }) {
  const messages = {
    expert:    'No expert pairings yet. Pairings require pipes with sessions and whiskey bottles.',
    favorites: 'Log sessions to build your favorites — your most-smoked blends will appear here.',
    rediscover:'No blends waiting to be rediscovered. Keep smoking and logging sessions.',
    new:       'No new blend discoveries available. Add more blends to your collection.',
  };
  return (
    <div className="py-12 text-center space-y-3">
      <ArrowLeftRight className="w-8 h-8 mx-auto" style={{ color: 'rgba(180,140,75,0.3)' }} />
      <p className="text-xs max-w-xs mx-auto" style={{ color: 'rgba(224,216,200,0.4)' }}>
        {messages[tab] || 'No pairings found for this category.'}
      </p>
    </div>
  );
}

// ─── CuratorPairingsTab ───────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object[]} props.pairingRecs  - Array of pairing recommendation objects from pairingEngine
 * @param {Function} props.onAction     - (actionKey, pairing) => void — handled by workspace
 * @param {Function} [props.onRefresh]  - () => void — rerun pairing analysis
 * @param {Function} [props.onAskCurator] - () => void — switch to chat
 */
export default function CuratorPairingsTab({ pairingRecs = [], onAction, onRefresh, onAskCurator }) {
  const [activeTab, setActiveTab] = useState('expert');

  // Build a map: goal → pairingItems
  const goalItemsMap = {};
  for (const rec of pairingRecs) {
    if (!goalItemsMap[rec.goal]) goalItemsMap[rec.goal] = [];
    goalItemsMap[rec.goal].push(...(rec.items || []));
  }

  // Get items for active tab — capped at MAX_PAIRINGS_PER_TAB (best 3 after engine scoring)
  const activeDef    = PAIRING_TABS.find((t) => t.key === activeTab) || PAIRING_TABS[0];
  const activeItems  = activeDef.goals.flatMap((g) => goalItemsMap[g] || []).slice(0, MAX_PAIRINGS_PER_TAB);

  // Badge count per tab (show actual cap)
  const getTabCount = (tabDef) => Math.min(
    tabDef.goals.reduce((s, g) => s + (goalItemsMap[g]?.length || 0), 0),
    MAX_PAIRINGS_PER_TAB
  );

  return (
    <div className="space-y-4">
      {/* Title + actions */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: '#F5F1E7' }}>
            Pairings
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            Pipe &amp; whiskey, cigar &amp; whiskey — based on your collection
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onAskCurator && (
            <button
              type="button"
              onClick={onAskCurator}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(74,124,156,0.12)', color: 'rgba(120,170,220,0.9)', border: '1px solid rgba(74,124,156,0.25)' }}
            >
              <HelpCircle className="w-3 h-3" />
              Ask Curator
            </button>
          )}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(140,105,65,0.14)' }}
              title="Refresh pairings"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Result sub-tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(140,105,65,0.12)' }}
      >
        {PAIRING_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count    = getTabCount(tab);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all"
              style={
                isActive
                  ? { background: 'rgba(140,105,65,0.22)', color: '#F5F1E7', border: '1px solid rgba(140,105,65,0.35)' }
                  : { background: 'transparent', color: 'rgba(224,216,200,0.45)', border: '1px solid transparent' }
              }
            >
              <span className="truncate">{tab.label}</span>
              {count > 0 && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
                  style={{ background: 'rgba(80,80,80,0.15)', color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(100,100,100,0.18)' }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab hint */}
      <p className="text-xs" style={{ color: 'rgba(224,216,200,0.4)' }}>
        {activeDef.hint}
      </p>

      {/* Tab content */}
      {activeItems.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <CuratorPairingResults pairings={activeItems} onAction={onAction} />
      )}
    </div>
  );
}
