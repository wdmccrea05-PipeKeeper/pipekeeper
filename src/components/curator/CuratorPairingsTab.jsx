/**
 * CuratorPairingsTab — Surface 4
 *
 * Pairings workspace for the Collection Curator.
 *
 * Layout:
 *   Title + subtitle
 *   Grouped pairing sections (one per recommendation / pairing goal)
 *     Header: goal label + pairing count
 *     Why it matters
 *     CuratorPairingResults with all entries + per-entry actions
 *   Empty state when no pairings found
 *
 * Actions surfaced per pairing entry:
 *   Open Items   — links to the item's collection page
 *   Ask Curator  — switches to Chat tab with pre-filled context
 *   Build Session — (pipe pairings) opens session flow
 *   Save Pairing  — saves the pairing
 */

import React from 'react';
import { Sparkles, ArrowLeftRight, RefreshCw, HelpCircle } from 'lucide-react';
import CuratorPairingResults from './CuratorPairingResults';

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="py-16 text-center space-y-3">
      <ArrowLeftRight className="w-10 h-10 mx-auto" style={{ color: 'rgba(180,140,75,0.3)' }} />
      <p className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.6)' }}>
        No pairings found yet
      </p>
      <p className="text-xs max-w-xs mx-auto" style={{ color: 'rgba(224,216,200,0.35)' }}>
        Pairings require pipes with logged sessions and whiskey bottles, or cigars with whiskey bottles.
        Add and log sessions to generate pairing suggestions.
      </p>
    </div>
  );
}

// ─── Single pairing group ─────────────────────────────────────────────────────

function PairingGroup({ rec, onAction }) {
  const pairingItems = rec.items || [];

  return (
    <div className="space-y-3">
      {/* Group header */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(180,140,75,0.7)' }} />
          <h3 className="text-sm font-bold" style={{ color: '#F5F1E7' }}>
            {rec.title}
          </h3>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full tabular-nums"
            style={{ background: 'rgba(80,80,80,0.1)', color: 'rgba(224,216,200,0.45)', border: '1px solid rgba(100,100,100,0.18)' }}
          >
            {pairingItems.length} pairing{pairingItems.length !== 1 ? 's' : ''}
          </span>
        </div>
        {rec.whyItMatters && (
          <p className="text-xs pl-5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            {rec.whyItMatters}
          </p>
        )}
      </div>

      {/* Pairing entries */}
      <CuratorPairingResults pairings={pairingItems} onAction={onAction} />
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
  const hasAny = pairingRecs.some((r) => (r.items?.length || 0) > 0);

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

      {!hasAny ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {pairingRecs
            .filter((r) => (r.items?.length || 0) > 0)
            .map((rec) => (
              <PairingGroup key={rec.id || rec.goal} rec={rec} onAction={onAction} />
            ))}
        </div>
      )}
    </div>
  );
}
