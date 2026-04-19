/**
 * Unified Paywall Modal — State-Aware
 *
 * Shows contextually appropriate billing options based on:
 * - What the user already has (free, PK Pro, WK Pro, bundle)
 * - What action types are relevant to their state
 *
 * Free users: see the standard plan picker.
 * Existing Pro users: see targeted upgrade options.
 * Bundle users: see current plan info + manage link.
 */

import React, { useMemo, useState } from 'react';
import { X, Crown, Check, AlertCircle } from 'lucide-react';
import PricingCard from '@/components/subscription/PricingCard';
import { usePaywall } from '@/components/subscription/usePaywall';
import { isModuleLaunched } from '@/components/utils/moduleReleaseState';
import { getUserSubscriptionState, isFreeUser, getCurrentPlanLabel } from '@/lib/billing/subscriptionState';
import { getAvailableUpgradeOptions } from '@/lib/billing/upgradePaths';
import { SUBSCRIPTION_PLANS } from '@/lib/billing/subscriptionPlans';
import { initiateCheckoutWithIntent } from '@/components/subscription/subscriptionHandler';
import { toast } from 'sonner';

const moduleLabels = {
  pipekeeper: 'PipeKeeper',
  whiskeykeeper: 'WhiskeyKeeper',
  cigarkeeper: 'CigarKeeper',
  winekeeper: 'WineKeeper',
};

const ALL_MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
const OFFER_MULTI_MODULE_BUNDLES = String(import.meta.env.VITE_ENABLE_MULTI_BUNDLE_OFFERS || '').toLowerCase() === 'true';

function launchedModules() {
  return ALL_MODULES.filter((m) => isModuleLaunched(m));
}

function getVisibleOfferConfig(lockedModule) {
  const launched = launchedModules();
  const canOfferThree = OFFER_MULTI_MODULE_BUNDLES && launched.length >= 3;
  const canOfferFour = OFFER_MULTI_MODULE_BUNDLES && launched.length >= 4;
  const moduleIsLaunchable = lockedModule ? isModuleLaunched(lockedModule) : true;

  return {
    launched,
    canOfferThree,
    canOfferFour,
    moduleIsLaunchable,
    primaryModule: moduleIsLaunchable ? lockedModule || launched[0] || 'pipekeeper' : 'pipekeeper',
  };
}

// ─── Upgrade option card for existing subscribers ──────────────────────────

function UpgradeOptionCard({ option, isSelected, isLoading, onSelect }) {
  const isBundleUpgrade = option.action === 'upgrade_to_bundle';

  return (
    <div
      onClick={() => !isLoading && onSelect(option)}
      className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-[#A35C5C] bg-[#A35C5C]/10'
          : 'border-[#8b6239]/30 hover:border-[#A35C5C]/50 bg-[#2a1f18]/50'
      } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <div className="flex items-start gap-3 mb-2">
        {isBundleUpgrade && (
          <Crown className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#D4AF37' }} />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-base" style={{ color: '#F5F1E7' }}>
            {option.label}
          </h4>
          {option.displayPrice != null && (
            <p className="text-sm font-semibold mt-0.5" style={{ color: '#D4A574' }}>
              ${option.displayPrice}/{option.displayTerm === 'annual' ? 'yr' : 'mo'}
            </p>
          )}
        </div>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.75)' }}>
        {option.description}
      </p>
      {isBundleUpgrade && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUBSCRIPTION_PLANS[option.targetPlanKey]?.modules?.map((m) => (
            <span
              key={m}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
              style={{ background: 'rgba(180,140,75,0.15)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.3)' }}
            >
              <Check className="w-3 h-3" />
              {moduleLabels[m] || m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bundle user view ───────────────────────────────────────────────────────

function BundleUserView({ onClose, onManage }) {
  return (
    <div className="space-y-6 text-center py-4">
      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
        style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
      >
        <Crown className="w-4 h-4" />
        Founders Bundle Active
      </div>
      <p style={{ color: 'rgba(224,216,200,0.8)' }} className="text-sm">
        You already have the Founders Bundle — access to PipeKeeper and WhiskeyKeeper is included.
      </p>
      <div className="flex flex-col gap-3">
        <button
          onClick={onManage}
          className="w-full py-2.5 rounded-lg font-semibold text-sm"
          style={{ background: 'rgba(120,90,65,0.3)', color: '#E0D8C8', border: '1px solid rgba(120,90,65,0.4)' }}
        >
          Manage Subscription
        </button>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg font-semibold text-sm"
          style={{ color: 'rgba(224,216,200,0.5)' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Existing subscriber upgrade view ──────────────────────────────────────

function ExistingSubscriberView({
  subscriptionState,
  user,
  onClose,
  onManage,
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const upgradeOptions = useMemo(
    () => getAvailableUpgradeOptions(subscriptionState),
    [subscriptionState]
  );

  const planLabel = getCurrentPlanLabel(subscriptionState);

  const handleProceed = async () => {
    if (!selectedOption || isProcessing) return;
    setIsProcessing(true);
    setError(null);

    try {
      const successUrl = `/SubscriptionSuccessFlow?next=${encodeURIComponent('/CollectionHub')}`;
      const cancelUrl = '/Subscription';

      // For bundle upgrades, cancel existing subscription first
      if (selectedOption.actionType === 'upgrade_existing') {
        // handleBundleUpgrade cancels the existing sub before we open bundle checkout.
        // We import base44 lazily to avoid circular deps.
        const { base44 } = await import('@/api/base44Client');
        const userId = user?.id || user?.auth_user_id;
        const email = user?.email;
        let subs = [];
        if (userId) subs = await base44.entities.Subscription.filter({ user_id: userId }).catch(() => []);
        if (subs.length === 0 && email) subs = await base44.entities.Subscription.filter({ user_email: email }).catch(() => []);

        // find cancelable Stripe subscription IDs
        const cancelableIds = (Array.isArray(subs) ? subs : [])
          .filter(
            (s) =>
              ['active', 'trialing', 'past_due'].includes(String(s?.status || '').toLowerCase()) &&
              (String(s?.provider || '').toLowerCase() === 'stripe' || !s?.provider) &&
              (s?.provider_subscription_id || s?.stripe_subscription_id)
          )
          .map((s) => s?.provider_subscription_id || s?.stripe_subscription_id)
          .filter(Boolean);

        if (cancelableIds.length > 0) {
          const upgradeRes = await base44.functions.invoke('handleBundleUpgrade', {
            currentSubscriptionIds: cancelableIds,
            targetBundleType: 'founders',
            billingPeriod: selectedOption.targetPlanKey?.includes('monthly') ? 'monthly' : 'annual',
          });
          if (!upgradeRes?.data?.success) {
            const serverError = upgradeRes?.data?.error || upgradeRes?.error || 'Failed to prepare upgrade.';
            setError(serverError);
            setIsProcessing(false);
            return;
          }
        }
      }

      await initiateCheckoutWithIntent(
        {
          actionType: selectedOption.actionType,
          currentPlanKey: selectedOption.currentPlanKey,
          targetPlanKey: selectedOption.targetPlanKey,
        },
        successUrl,
        cancelUrl
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      if (msg === 'popup_blocked_or_redirect_disallowed') {
        toast.error('Unable to open checkout here. Please try again from the Subscription page.');
        onClose?.();
      } else {
        setError(msg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {planLabel && (
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(163,92,92,0.15)', color: '#D4A574', border: '1px solid rgba(163,92,92,0.3)' }}
        >
          Current Plan: {planLabel}
        </div>
      )}

      <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
        Choose what you'd like to do next:
      </p>

      {error && (
        <div
          className="p-3 rounded-lg flex gap-2 items-start text-sm"
          style={{ background: 'rgba(224,93,93,0.1)', border: '1px solid rgba(224,93,93,0.3)' }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#E05D5D' }} />
          <span style={{ color: '#E05D5D' }}>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {upgradeOptions.map((option) => (
          <UpgradeOptionCard
            key={option.action}
            option={option}
            isSelected={selectedOption?.action === option.action}
            isLoading={isProcessing}
            onSelect={setSelectedOption}
          />
        ))}
      </div>

      {selectedOption && (
        <button
          onClick={handleProceed}
          disabled={isProcessing}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: isProcessing ? 'rgba(163,92,92,0.5)' : '#A35C5C',
            color: '#F5F1E7',
          }}
        >
          {isProcessing ? 'Processing…' : `Continue — ${selectedOption.label}`}
        </button>
      )}

      <div className="flex gap-3">
        <button
          onClick={onManage}
          className="flex-1 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'rgba(120,90,65,0.2)', color: 'rgba(224,216,200,0.7)', border: '1px solid rgba(120,90,65,0.25)' }}
        >
          Manage Subscription
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-lg text-sm font-medium"
          style={{ color: 'rgba(224,216,200,0.5)' }}
        >
          Keep Current Plan
        </button>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function PaywallModal({
  type = 'module',
  selectedModules = [],
  currentModules = [],
  lockedModule = null,
  onClose,
  onManage,
  isLoading = false,
  // New: pass user + their active subscription rows for state-aware rendering
  user = null,
  activeSubscriptions = [],
}) {
  const { selectPlan } = usePaywall();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  const offerConfig = useMemo(() => getVisibleOfferConfig(lockedModule), [lockedModule]);

  // Determine what the user currently has
  const subscriptionState = useMemo(
    () =>
      getUserSubscriptionState({
        activeSubscriptions,
        entitlements: user?.entitlements || {},
        user,
      }),
    [user, activeSubscriptions]
  );

  const freeUser = isFreeUser(subscriptionState);

  const getHeader = () => {
    if (!offerConfig.moduleIsLaunchable) {
      return {
        headline: 'Module Not Available',
        subtext: 'This module is not publicly available yet.',
      };
    }

    if (!freeUser) {
      const label = getCurrentPlanLabel(subscriptionState);
      return {
        headline: 'Your Subscription',
        subtext: label ? `You are currently on ${label}.` : '',
      };
    }

    switch (type) {
      case 'module':
        return {
          headline: `Unlock ${moduleLabels[offerConfig.primaryModule] || 'Module'}`,
          subtext: 'Start tracking your collection with smart organization and AI insights.',
        };
      case 'multi':
        return {
          headline: 'Unlock CollectionKeeper Pro',
          subtext: 'Choose the plan that best fits your active modules.',
        };
      case 'expansion':
        return {
          headline: 'PipeKeeper Pro',
          subtext: `You're currently tracking ${currentModules.length} keeper${currentModules.length !== 1 ? 's' : ''}.`,
        };
      default:
        return { headline: 'Unlock CollectionKeeper Pro', subtext: '' };
    }
  };

  const header = getHeader();

  const handleSelectPlan = async (plan) => {
    setSelectedPlan(plan);
    try {
      await selectPlan(plan, billingPeriod, {
        selectedModules: type === 'multi' ? selectedModules.filter((m) => isModuleLaunched(m)) : [],
        baseModule: offerConfig.primaryModule,
      });
    } catch (err) {
      console.error('[Paywall] Plan selection failed:', err);
    }
  };

  const renderPlanCards = () => {
    const cards = [
      <PricingCard
        key="single"
        title={`${moduleLabels[offerConfig.primaryModule]} Pro`}
        priceMonthly="2.99"
        priceAnnual="29.99"
        cta={`Unlock ${moduleLabels[offerConfig.primaryModule]}`}
        highlighted
        isSelected={selectedPlan === 'single'}
        onSelect={() => handleSelectPlan('single')}
        isLoading={isLoading && selectedPlan === 'single'}
        billingPeriod={billingPeriod}
      />,
    ];

    if (offerConfig.canOfferThree) {
      cards.push(
        <PricingCard
          key="three"
          title="Unlock 3 Keepers"
          priceMonthly="7.99"
          priceAnnual="79.99"
          badge="Best Value"
          cta="Expand Your Collection"
          isSelected={selectedPlan === 'three'}
          onSelect={() => handleSelectPlan('three')}
          isLoading={isLoading && selectedPlan === 'three'}
          billingPeriod={billingPeriod}
        />
      );
    }

    if (offerConfig.canOfferFour) {
      cards.push(
        <PricingCard
          key="four"
          title="Unlock Everything"
          priceMonthly="8.99"
          priceAnnual="89.99"
          cta="Unlock All Keepers"
          isSelected={selectedPlan === 'four'}
          onSelect={() => handleSelectPlan('four')}
          isLoading={isLoading && selectedPlan === 'four'}
          billingPeriod={billingPeriod}
        />
      );
    }

    return cards;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 22, 0.95), rgba(28, 20, 16, 0.95))',
          border: '1px solid rgba(120, 90, 65, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-all z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" style={{ color: 'rgba(224, 216, 200, 0.6)' }} />
        </button>

        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#F5F1E7' }}>
              {header.headline}
            </h2>
            {header.subtext && (
              <p className="text-sm" style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
                {header.subtext}
              </p>
            )}
          </div>

          {/* Bundle user — already has everything */}
          {subscriptionState.hasBundle && (
            <BundleUserView onClose={onClose} onManage={onManage} />
          )}

          {/* Existing single-module subscriber — show upgrade paths */}
          {!subscriptionState.hasBundle && !freeUser && (
            <ExistingSubscriberView
              subscriptionState={subscriptionState}
              user={user}
              onClose={onClose}
              onManage={onManage}
            />
          )}

          {/* Free user — show standard plan picker */}
          {freeUser && (
            <>
              {!offerConfig.canOfferThree && !offerConfig.canOfferFour && (
                <p className="text-xs mb-4" style={{ color: 'rgba(212, 165, 116, 0.8)' }}>
                  Multi-module bundle offers are not available in this checkout surface right now.
                </p>
              )}

              <div className="mb-6 flex gap-2 p-1 rounded-lg" style={{ background: 'rgba(120, 90, 65, 0.1)' }}>
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-all ${billingPeriod === 'monthly' ? 'font-bold' : ''}`}
                  style={{
                    color: billingPeriod === 'monthly' ? '#D4A574' : '#8b6239',
                    background: billingPeriod === 'monthly' ? 'rgba(180, 140, 75, 0.2)' : 'transparent',
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-all ${billingPeriod === 'annual' ? 'font-bold' : ''}`}
                  style={{
                    color: billingPeriod === 'annual' ? '#D4A574' : '#8b6239',
                    background: billingPeriod === 'annual' ? 'rgba(180, 140, 75, 0.2)' : 'transparent',
                  }}
                >
                  Annual (Save 17%)
                </button>
              </div>

              <div className="space-y-3 mb-8">{renderPlanCards()}</div>

              <div
                className="pt-6 border-t text-xs text-center"
                style={{ borderColor: 'rgba(120, 90, 65, 0.2)', color: 'rgba(224, 216, 200, 0.5)' }}
              >
                <p>Cancel anytime. Secure checkout via Stripe.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
