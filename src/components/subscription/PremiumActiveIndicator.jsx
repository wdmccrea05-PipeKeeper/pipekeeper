// Subtle "Premium active" status indicator
// Shows for trial users (within 7 days) and active Premium/Pro subscribers
// Non-intrusive, informational only, no CTA

import React from 'react';
import { Sparkles, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { hasPremiumAccess } from '@/components/utils/premiumAccess';

export default function PremiumActiveIndicator({ user, subscription }) {
  const { t } = useTranslation();
  
  // Check if user has premium access (trial or paid)
  const hasPremium = hasPremiumAccess(user, subscription);
  const isTrialUser = user?.subscription_status === 'trialing' || user?.subscription_level === 'trial';
  const isPaidSubscriber = user?.subscription_level === 'paid' && subscription?.status === 'active';
  
  // Determine tier
  const tier = (subscription?.tier || '').toLowerCase();
  const isProTier = tier === 'pro';
  
  // Hide if user doesn't have premium access
  if (!hasPremium) return null;
  
  const tierLabel = isProTier ? 'Pro' : 'Premium';
  
  return (
    <div className="bg-gradient-to-r from-[#8b3a3a]/20 to-[#6d2e2e]/20 border-l-4 border-[#A35C5C] px-4 py-2 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#A35C5C]/20 flex items-center justify-center flex-shrink-0">
          {isPaidSubscriber ? <Crown className="w-4 h-4 text-[#A35C5C]" /> : <Sparkles className="w-4 h-4 text-[#A35C5C]" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#E0D8C8]">
            {tierLabel} Active
          </p>
          <p className="text-xs text-[#E0D8C8]/70">
            {isTrialUser 
              ? t("subscription.premiumActiveSubtextTrial")
              : t("subscription.premiumActiveSubtextPaid")}
          </p>
        </div>
      </div>
    </div>
  );
}