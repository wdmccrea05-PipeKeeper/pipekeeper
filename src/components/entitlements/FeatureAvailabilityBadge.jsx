import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { resolveFeatureAccess } from '@/lib/entitlements/featureMatrix';

const TONE = {
  allowed: { color: '#6FCF97', bg: 'rgba(76,175,130,0.1)', border: 'rgba(76,175,130,0.28)' },
  locked: { color: '#E0B450', bg: 'rgba(224,180,80,0.1)', border: 'rgba(224,180,80,0.3)' },
  proposed: { color: 'rgba(224,216,200,0.72)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(180,140,75,0.22)' },
};

/**
 * Shows whether a feature is included in the collector's membership.
 *
 * A feature marked "proposed" is never blocked — the badge only says which level
 * it is recommended for, so no existing right is taken away before approval.
 */
export default function FeatureAvailabilityBadge({ featureId, tier = 'free', className = '' }) {
  const access = resolveFeatureAccess(featureId, tier);
  if (!access.known) return null;

  const isProposed = access.enforcement === 'proposed';
  const isLocked = !isProposed && !access.allowed;
  const tone = isProposed ? TONE.proposed : isLocked ? TONE.locked : TONE.allowed;
  const label = isProposed
    ? `Proposed for ${access.requiredTier === 'free' ? 'all members' : access.requiredTier === 'pro' ? 'Pro' : 'Premium'}`
    : isLocked
      ? `${access.requiredTier === 'premium' ? 'Premium' : 'Pro'} feature`
      : 'Included';

  const Icon = isLocked ? Lock : Sparkles;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
      style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
      title={access.note || label}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}