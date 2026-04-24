/**
 * ReferralRewardCards
 * Shows earned rewards with provider-aware messaging and iOS redemption CTA.
 */
import React, { useState } from 'react';
import { Gift, Star, CheckCircle, Clock, AlertCircle, Smartphone, CreditCard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const STATUS_META = {
  pending:                  { label: 'Processing',           color: '#D4A574', icon: Clock },
  ready_to_apply:           { label: 'Ready to Apply',       color: '#D4A574', icon: Clock },
  awaiting_user_redemption: { label: 'Ready to Redeem',      color: '#2e7d5c', icon: Gift },
  applied:                  { label: 'Applied',              color: '#2e7d5c', icon: CheckCircle },
  redeemed:                 { label: 'Redeemed',             color: '#2e7d5c', icon: CheckCircle },
  failed:                   { label: 'Failed',               color: '#b35f5f', icon: AlertCircle },
  expired:                  { label: 'Expired',              color: '#6b7280', icon: AlertCircle },
  canceled:                 { label: 'Canceled',             color: '#6b7280', icon: AlertCircle },
};

function rewardTitle(reward) {
  const base = reward.reward_type === 'free_year' ? 'Free Year' : 'Free Month';
  if (reward.status === 'applied' || reward.status === 'redeemed') return `${base} Earned`;
  if (reward.status === 'awaiting_user_redemption') return 'Reward Ready';
  return base;
}

const REWARD_VALUE = {
  free_month: '$2.99',
  free_year: '$29.99',
};

function rewardBody(reward) {
  const isYear = reward.reward_type === 'free_year';
  const value = REWARD_VALUE[reward.reward_type] || '';
  const label = isYear ? `1 free module year (${value})` : `1 free module month (${value})`;

  if (reward.billing_provider === 'stripe') {
    if (reward.status === 'applied') {
      return isYear
        ? `Your ${value} module year credit has been applied to your subscription.`
        : `Your ${value} module month credit has been applied to your next renewal.`;
    }
    if (reward.status === 'failed') {
      return 'We were unable to apply this reward automatically. Please contact support.';
    }
    return `You earned ${label}. The fixed credit will be applied automatically to your next renewal.`;
  }

  if (reward.billing_provider === 'ios') {
    if (reward.status === 'redeemed') {
      return `Your ${label} reward has been redeemed through the App Store.`;
    }
    if (reward.status === 'awaiting_user_redemption') {
      return `You earned ${label}. Redeem your reward in-app to apply it to your App Store subscription.`;
    }
    if (reward.status === 'failed') {
      return 'Your iOS reward redemption failed. Tap to retry.';
    }
    return `You earned ${label}. Redeem your reward in-app to apply it to your App Store subscription.`;
  }

  return `You earned ${label}.`;
}

function ProviderBadge({ provider }) {
  if (provider === 'stripe') {
    return (
      <span className="flex items-center gap-1 text-xs text-[#E0D8C8]/50">
        <CreditCard className="w-3 h-3" /> Stripe
      </span>
    );
  }
  if (provider === 'ios') {
    return (
      <span className="flex items-center gap-1 text-xs text-[#E0D8C8]/50">
        <Smartphone className="w-3 h-3" /> App Store
      </span>
    );
  }
  return null;
}

function RewardCard({ reward, onRedeemed }) {
  const [redeeming, setRedeeming] = useState(false);
  const meta = STATUS_META[reward.status] || STATUS_META.pending;
  const StatusIcon = meta.icon;

  const handleIosRedeem = async () => {
    // Step 1: trigger Apple offer code redemption sheet (client-side StoreKit)
    // This is done via the native bridge — signal the native layer if available
    setRedeeming(true);
    try {
      if (window?.webkit?.messageHandlers?.storeKit?.postMessage) {
        // Native iOS WebView: signal StoreKit to open offer redemption
        window.webkit.messageHandlers.storeKit.postMessage({
          action: 'presentOfferCodeRedeemSheet',
          rewardId: reward.id,
        });
        // Native layer will call redeemIosReferralReward when done
        toast.info('Opening App Store redemption…');
      } else {
        // Fallback for web preview — simulate a confirmation
        const res = await base44.functions.invoke('redeemIosReferralReward', {
          rewardId: reward.id,
          outcome: 'redeemed',
          offerReference: `web-preview-${Date.now()}`,
        });
        if (res?.data?.ok) {
          toast.success('Reward redeemed!');
          onRedeemed?.();
        } else {
          toast.error(res?.data?.reason || 'Redemption failed');
        }
      }
    } catch (err) {
      toast.error('Redemption failed. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const cardBg = reward.status === 'awaiting_user_redemption'
    ? 'linear-gradient(145deg, rgba(46,125,92,0.15), rgba(27,20,16,0.98))'
    : reward.status === 'failed' || reward.status === 'expired'
    ? 'linear-gradient(145deg, rgba(179,95,95,0.10), rgba(27,20,16,0.98))'
    : 'linear-gradient(145deg, rgba(44,30,22,0.98), rgba(27,20,16,0.98))';

  const borderColor = reward.status === 'awaiting_user_redemption'
    ? 'rgba(46,125,92,0.35)'
    : reward.status === 'applied' || reward.status === 'redeemed'
    ? 'rgba(46,125,92,0.25)'
    : reward.status === 'failed'
    ? 'rgba(179,95,95,0.35)'
    : 'rgba(180,140,75,0.18)';

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: cardBg, borderColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {reward.reward_type === 'free_year'
            ? <Star className="w-5 h-5 text-amber-400 shrink-0" />
            : <Gift className="w-5 h-5 text-[#D4A574] shrink-0" />}
          <div>
            <p className="text-sm font-semibold text-[#F5F1E7]">{rewardTitle(reward)}</p>
            <ProviderBadge provider={reward.billing_provider} />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StatusIcon className="w-3.5 h-3.5" style={{ color: meta.color }} />
          <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
        </div>
      </div>

      <p className="text-xs text-[#E0D8C8]/65 leading-relaxed">{rewardBody(reward)}</p>

      {/* iOS redemption CTA */}
      {reward.billing_provider === 'ios' && reward.status === 'awaiting_user_redemption' && (
        <Button
          size="sm"
          onClick={handleIosRedeem}
          disabled={redeeming}
          className="w-full gap-2 text-xs"
          style={{ background: '#2e7d5c', color: '#fff' }}
        >
          <Smartphone className="w-3.5 h-3.5" />
          {redeeming ? 'Opening App Store…' : 'Redeem Reward'}
        </Button>
      )}

      {/* Failed state retry info */}
      {reward.status === 'failed' && reward.failure_reason && (
        <p className="text-xs text-[#b35f5f]/70 italic">{reward.failure_reason}</p>
      )}

      {/* Expiry notice for iOS */}
      {reward.billing_provider === 'ios' && reward.expires_at && reward.status === 'awaiting_user_redemption' && (
        <p className="text-xs text-[#E0D8C8]/35">
          Expires {new Date(reward.expires_at).toLocaleDateString()}
        </p>
      )}

      {/* Applied/redeemed date */}
      {(reward.applied_at || reward.redeemed_at) && (
        <p className="text-xs text-[#E0D8C8]/35">
          {reward.applied_at ? `Applied ${new Date(reward.applied_at).toLocaleDateString()}` : ''}
          {reward.redeemed_at ? `Redeemed ${new Date(reward.redeemed_at).toLocaleDateString()}` : ''}
        </p>
      )}
    </div>
  );
}

export default function ReferralRewardCards({ rewards, onRefresh }) {
  if (!rewards || rewards.length === 0) {
    return (
      <p className="text-xs text-[#E0D8C8]/40 text-center py-4">
        No rewards yet. Qualify a referral to earn free time.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rewards.map(r => (
        <RewardCard key={r.id} reward={r} onRedeemed={onRefresh} />
      ))}
    </div>
  );
}