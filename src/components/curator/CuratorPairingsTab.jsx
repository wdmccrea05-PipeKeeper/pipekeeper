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

// Safety net — actual cap is enforced by the pairing engine (MAX_ITEMS_PER_SUBTAB = 3)
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
          <h2 style={{ color: '#F5F5F7', fontSize: '20px', fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>
            Pairings
          </h2>
          <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, marginTop: '4px' }}>
            Pipe &amp; whiskey, cigar &amp; whiskey — based on your collection
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onAskCurator && (
            <button
              type="button"
              onClick={onAskCurator}
              className="inline-flex items-center gap-2 font-semibold transition-all"
              style={{ background: 'transparent', color: '#F5F5F7', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', padding: '6px 14px', borderRadius: '12px' }}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Ask Curator
            </button>
          )}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 transition-all"
              style={{ background: 'transparent', color: '#A1A1AA', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', padding: '6px 14px', borderRadius: '12px' }}
              title="Refresh pairings"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Result sub-tabs */}
      <div
        className="flex gap-2 overflow-x-auto"
        style={{ padding: '4px 0' }}
      >
        {PAIRING_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count    = getTabCount(tab);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="inline-flex items-center gap-2 font-semibold transition-all whitespace-nowrap shrink-0"
              style={{
                fontSize: '13px',
                padding: '6px 16px',
                borderRadius: '999px',
                height: '36px',
                ...(isActive
                  ? { background: '#C6A15B', color: '#0B0B0C', border: 'none' }
                  : { background: 'transparent', color: '#A1A1AA', border: '1px solid rgba(255,255,255,0.1)' })
              }}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                    color: isActive ? '#0B0B0C' : '#A1A1AA',
                    padding: '1px 7px',
                    borderRadius: '999px',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab hint */}
      <p style={{ color: '#71717A', fontSize: '13px', lineHeight: 1.6 }}>
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