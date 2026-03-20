/**
 * Collection Plan Menu Item
 * Dynamic menu item that routes to upgrade/manage flows
 * Shows based on user's current module state
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Plus } from 'lucide-react';
import { useAccessSummary } from '@/components/hooks/useAccessSummary';
import { usePaywall } from '@/components/subscription/usePaywall';

export default function CollectionPlanMenuItem() {
  const navigate = useNavigate();
  const access = useAccessSummary();
  const { getPaywallType } = usePaywall();

  if (!access) return null;

  const isFree = access.tier === 'free';
  const moduleCount = access.activeModules?.length || 0;
  const canAddMore = moduleCount < 4;

  // FREE USER
  if (isFree) {
    const label = moduleCount === 0
      ? 'Unlock Your Collection'
      : 'Expand Your Collection';
    
    const badge = moduleCount === 0 ? '+4 modules' : `+${4 - moduleCount} modules`;

    return (
      <button
        onClick={() => {
          // Route to Multi Paywall
          navigate('/Subscription?type=multi');
        }}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-lg hover:bg-[#3a2a20] transition-colors"
        style={{ color: '#D4A574' }}
      >
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="font-medium">{label}</span>
        </div>
        <span style={{ color: '#8b6239', fontSize: '11px' }}>{badge}</span>
      </button>
    );
  }

  // PRO USER
  if (canAddMore) {
    const label = moduleCount === 1
      ? 'Add Another Keeper'
      : 'Expand Your Collection';
    
    const badge = `+${4 - moduleCount} available`;

    return (
      <button
        onClick={() => {
          // Route to Expansion Paywall
          navigate('/Subscription?type=expansion');
        }}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-lg hover:bg-[#3a2a20] transition-colors"
        style={{ color: '#D4A574' }}
      >
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="font-medium">{label}</span>
        </div>
        <span style={{ color: '#8b6239', fontSize: '11px' }}>{badge}</span>
      </button>
    );
  }

  // PRO + 4 MODULES (all unlocked)
  return (
    <button
      onClick={() => {
        // Route to Manage Plan
        navigate('/Subscription?type=manage');
      }}
      className="w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-lg hover:bg-[#3a2a20] transition-colors"
      style={{ color: '#8b6239' }}
    >
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4" />
        <span className="font-medium">Manage Plan</span>
      </div>
    </button>
  );
}