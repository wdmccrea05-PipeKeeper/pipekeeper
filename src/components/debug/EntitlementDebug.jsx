import React from 'react';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { isLegacyPremium, isFoundingMember } from '@/components/utils/premiumAccess';

// Dev-only debug component for verifying entitlements
export default function EntitlementDebug() {
  if (process.env.NODE_ENV !== 'development') return null;

  const { user, subscription, isLoading, hasPaid, hasPremium, isInTrial } = useCurrentUser();

  if (isLoading || !user?.email) return null;

  const isLegacy = isLegacyPremium(subscription);
  const isFounder = isFoundingMember(user);

  return (
    <div className="fixed bottom-4 right-4 max-w-xs bg-black/90 text-white/80 text-xs p-2 rounded border border-yellow-600/40 font-mono z-40 max-h-40 overflow-y-auto">
      <div className="text-yellow-500 font-bold mb-1">🔍 Entitlements (Dev)</div>
      <div>Tier: <span className="text-blue-400">{subscription?.tier || 'free'}</span></div>
      <div>Paid: <span className={hasPaid ? 'text-green-400' : 'text-red-400'}>{hasPaid ? 'Yes' : 'No'}</span></div>
      <div>Premium: <span className={hasPremium ? 'text-green-400' : 'text-red-400'}>{hasPremium ? 'Yes' : 'No'}</span></div>
      <div>On Trial: <span className={isInTrial ? 'text-orange-400' : 'text-gray-500'}>{isInTrial ? 'Yes' : 'No'}</span></div>
      <div>Legacy Premium: <span className={isLegacy ? 'text-purple-400' : 'text-gray-500'}>{isLegacy ? 'Yes' : 'No'}</span></div>
      <div>Founding Member: <span className={isFounder ? 'text-amber-400' : 'text-gray-500'}>{isFounder ? 'Yes' : 'No'}</span></div>
      <div className="text-xs mt-1 text-gray-400">Started: {subscription?.subscriptionStartedAt?.split('T')[0] || 'N/A'}</div>
    </div>
  );
}