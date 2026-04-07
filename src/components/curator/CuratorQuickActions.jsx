/**
 * CuratorQuickActions
 *
 * Home surface for Curator — 6 action tiles that trigger specific
 * recommendation workflows.
 *
 * Actions:
 *   1. Plan Session              → filter: utilization + pairing
 *   2. Optimize Collection       → full run, all categories
 *   3. What to Smoke Now         → filter: utilization
 *   4. Pairing Suggestions       → filter: pairing
 *   5. Recommend Specializations → filter: specialization
 *   6. Purchase / Restock        → filter: purchase + cigar_discovery
 */

import React from 'react';
import {
  Calendar,
  Settings2,
  Flame,
  Combine,
  Award,
  ShoppingCart,
} from 'lucide-react';

const ACTIONS = [
  {
    key:         'plan_session',
    icon:        Calendar,
    label:       'Plan Session',
    description: 'Find what to smoke and pair it well',
    categories:  ['utilization', 'pairing'],
    accent:      'rgba(139,94,58,0.9)',
    accentBg:    'rgba(139,94,58,0.12)',
    accentBorder:'rgba(139,94,58,0.3)',
  },
  {
    key:         'optimize',
    icon:        Settings2,
    label:       'Optimize Collection',
    description: 'Review all gaps, metadata, and balance issues',
    categories:  null, // all
    accent:      'rgba(80,180,130,0.9)',
    accentBg:    'rgba(74,124,92,0.12)',
    accentBorder:'rgba(74,124,92,0.3)',
    primary:     true,
  },
  {
    key:         'what_to_smoke',
    icon:        Flame,
    label:       'What to Smoke Now',
    description: 'Underused blends and pipes due for rotation',
    categories:  ['utilization'],
    accent:      'rgba(220,140,90,0.9)',
    accentBg:    'rgba(180,100,50,0.12)',
    accentBorder:'rgba(180,100,50,0.3)',
  },
  {
    key:         'pairing',
    icon:        Combine,
    label:       'Pairing Suggestions',
    description: 'Pipe + whiskey, cigar + whiskey combinations',
    categories:  ['pairing'],
    accent:      'rgba(120,170,220,0.9)',
    accentBg:    'rgba(74,124,156,0.12)',
    accentBorder:'rgba(74,124,156,0.3)',
  },
  {
    key:         'specialization',
    icon:        Award,
    label:       'Recommend Specializations',
    description: 'Assign pipes to blend families based on usage',
    categories:  ['specialization'],
    accent:      'rgba(200,155,100,0.9)',
    accentBg:    'rgba(139,94,58,0.12)',
    accentBorder:'rgba(139,94,58,0.3)',
  },
  {
    key:         'purchase',
    icon:        ShoppingCart,
    label:       'Purchase / Restock',
    description: 'Low stock, depleted favorites, and wishlist items',
    categories:  ['purchase', 'cigar_discovery'],
    accent:      'rgba(160,200,240,0.9)',
    accentBg:    'rgba(74,124,156,0.12)',
    accentBorder:'rgba(74,124,156,0.3)',
  },
];

/**
 * @param {object}   props
 * @param {Function} props.onAction     - (actionKey, categories | null) => void
 * @param {boolean}  [props.isRunning]  - Whether a run is in progress
 */
export default function CuratorQuickActions({ onAction, isRunning = false }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              disabled={isRunning}
              onClick={() => onAction(action.key, action.categories)}
              className="text-left rounded-xl px-4 py-3.5 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:  action.primary ? 'rgba(74,124,92,0.18)' : action.accentBg,
                border:      `1px solid ${action.accentBorder}`,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: action.accentBg, border: `1px solid ${action.accentBorder}` }}
                >
                  <Icon className="w-4 h-4" style={{ color: action.accent }} />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold leading-tight mb-0.5"
                    style={{ color: action.primary ? 'rgba(80,180,130,1)' : action.accent }}
                  >
                    {action.label}
                  </p>
                  <p
                    className="text-xs leading-snug"
                    style={{ color: 'rgba(224,216,200,0.5)' }}
                  >
                    {action.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
