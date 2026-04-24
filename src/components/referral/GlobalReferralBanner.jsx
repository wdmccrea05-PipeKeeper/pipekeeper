import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { X, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BANNER_DISMISSAL_KEY = 'pk_referral_banner_dismissed';
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function GlobalReferralBanner() {
  const navigate = useNavigate();
  const { user, isLoading } = useCurrentUser();
  const [isDismissed, setIsDismissed] = useState(false);
  const [earnedAccess, setEarnedAccess] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(false);

  // Check dismissal state on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(BANNER_DISMISSAL_KEY);
    if (stored) {
      const dismissedAt = parseInt(stored, 10);
      const now = Date.now();
      if (now - dismissedAt < DISMISSAL_DURATION_MS) {
        setIsDismissed(true);
        return;
      } else {
        sessionStorage.removeItem(BANNER_DISMISSAL_KEY);
      }
    }
  }, []);

  // Load earned access records to check for pending module selection
  useEffect(() => {
    if (isLoading || !user?.email || isDismissed) return;

    const loadEarnedAccess = async () => {
      setLoadingRewards(true);
      try {
        const res = await base44.functions.invoke('getReferralRewards', {});
        setEarnedAccess(res?.data?.earnedAccess || []);
      } catch (err) {
        // Fail silently
      } finally {
        setLoadingRewards(false);
      }
    };

    loadEarnedAccess();
  }, [isLoading, user?.email, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem(BANNER_DISMISSAL_KEY, String(Date.now()));
  };

  const handleCTA = () => {
    navigate('/Community', { state: { referralTab: true } });
  };

  if (isLoading || isDismissed || !user) {
    return null;
  }

  // Determine banner state
  const pendingAccess = earnedAccess.filter(a => a.status === 'pending_module_selection');
  const hasPendingModuleSelection = pendingAccess.length > 0;

  // Banner content based on state
  const bannerContent = hasPendingModuleSelection
    ? {
        headline: 'You Earned Pro Time',
        body: 'Choose which module to unlock and activate your reward.',
        cta: 'Choose Module',
        reward: null,
      }
    : {
        headline: 'Invite Friends. Earn Pro Time.',
        body: 'Share CollectionKeeper with friends. When someone joins through your invite and becomes a paid subscriber, you earn free subscription time.',
        cta: 'Start Referring',
        reward: '1 qualified referral = 1 month | 12 referrals = 1 year',
      };

  return (
    <div
      className="w-full"
      style={{
        background: 'linear-gradient(145deg, rgba(44,30,22,0.95), rgba(27,18,12,0.98))',
        borderBottom: '1px solid rgba(212,165,116,0.2)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5 hidden sm:block">
            <Gift className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#D4A574' }} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h2
              className="text-base sm:text-lg font-semibold mb-1"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              {bannerContent.headline}
            </h2>
            <p className="text-xs sm:text-sm mb-2" style={{ color: 'rgba(224, 216, 200, 0.85)' }}>
              {bannerContent.body}
            </p>
            {bannerContent.reward && (
              <p className="text-xs" style={{ color: 'rgba(212, 165, 116, 0.9)' }}>
                {bannerContent.reward}
              </p>
            )}
          </div>

          {/* CTA + Close */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button
              onClick={handleCTA}
              size="sm"
              className="whitespace-nowrap"
              style={{
                background: '#A35C5C',
                color: '#fff',
              }}
            >
              {bannerContent.cta}
            </Button>
            <button
              onClick={handleDismiss}
              className="text-[#E0D8C8]/50 hover:text-[#E0D8C8] p-1 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}