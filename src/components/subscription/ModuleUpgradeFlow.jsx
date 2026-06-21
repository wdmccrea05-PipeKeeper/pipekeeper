/**
 * Custom In-App Module Upgrade Flow
 * Safer version that uses real subscription records for bundle upgrades.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from '@/components/utils/navigation';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Check, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getModuleDisplayName } from '@/components/utils/moduleRegistry';
import {
  getUserSubscriptionState,
  getNextUpgradeRecommendation,
  getAvailableUpgradePaths,
  canProcessBundleUpgrade,
} from '@/components/utils/subscriptionDecisionLogic';
import {
  calculatePrice,
  formatPrice,
  getBundleSavings,
} from '@/components/utils/bundlePricingEngine';
import { subscriptionGrantsPaidAccess } from '@/components/utils/gracePeriod';

const normEmail = (email) => String(email || '').trim().toLowerCase();

function getSubscriptionSortTime(sub) {
  return new Date(
    sub?.current_period_start ||
    sub?.updated_date ||
    sub?.created_date ||
    0
  ).getTime();
}

function getRealProviderSubscriptionId(sub) {
  return (
    sub?.provider_subscription_id ||
    sub?.stripe_subscription_id ||
    null
  );
}

function isStripeLikeSubscription(sub) {
  const provider = String(sub?.provider || '').toLowerCase();
  return provider === '' || provider === 'stripe';
}

function isCancelablePaidStripeSubscription(sub) {
  if (!sub) return false;
  if (!subscriptionGrantsPaidAccess(sub)) return false;
  if (!isStripeLikeSubscription(sub)) return false;
  return !!getRealProviderSubscriptionId(sub);
}

async function fetchUserSubscriptionRows(user) {
  if (!user) return [];

  const userId = user.id || user.auth_user_id || null;
  const email = user.email ? normEmail(user.email) : null;

  let subs = [];

  try {
    if (userId) {
      subs = await base44.entities.Subscription.filter({ user_id: userId });
    }
  } catch (err) {
    console.warn('[ModuleUpgradeFlow] user_id subscription lookup failed:', err);
  }

  try {
    if ((!subs || subs.length === 0) && email) {
      subs = await base44.entities.Subscription.filter({ user_email: email });
    }
  } catch (err) {
    console.warn('[ModuleUpgradeFlow] user_email subscription lookup failed:', err);
  }

  return Array.isArray(subs) ? subs : [];
}

function getCancelableUpgradeSubscriptions(subscriptionRows = []) {
  return [...subscriptionRows]
    .filter(isCancelablePaidStripeSubscription)
    .sort((a, b) => getSubscriptionSortTime(b) - getSubscriptionSortTime(a));
}

export default function ModuleUpgradeFlow({ user, onUpgradeComplete }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [selectedOption, setSelectedOption] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const currentState = useMemo(() => getUserSubscriptionState(user), [user]);
  const upgradeRecommendation = useMemo(
    () => getNextUpgradeRecommendation(user, billingPeriod),
    [user, billingPeriod]
  );
  const availablePaths = useMemo(() => getAvailableUpgradePaths(user), [user]);

  if (!user || !currentState) {
    return (
      <div className="p-6 text-center text-[#E0D8C8]">
        {t('common.loading')}
      </div>
    );
  }

  const handleSelectOption = (option) => {
    setSelectedOption(option);
    setError(null);
  };

  const handleProceedToCheckout = async () => {
    if (!selectedOption || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const isBundleUpgrade =
        selectedOption.type.startsWith('bundle') &&
        currentState.paidModules.length > 0;

      if (isBundleUpgrade) {
        const canUpgrade = canProcessBundleUpgrade(user, selectedOption.modules);

        if (!canUpgrade?.canUpgrade) {
          setError(
            canUpgrade?.reason === 'cannot_downgrade'
              ? 'This selection would reduce module access and cannot be processed as an upgrade.'
              : canUpgrade?.reason === 'already_has_bundle'
                ? 'You already appear to have access to this bundle.'
                : 'This bundle upgrade cannot be processed.'
          );
          setIsProcessing(false);
          return;
        }

        const subscriptionRows = await fetchUserSubscriptionRows(user);
        const cancelableSubs = getCancelableUpgradeSubscriptions(subscriptionRows);
        const currentSubscriptionIds = cancelableSubs
          .map(getRealProviderSubscriptionId)
          .filter(Boolean);

        if (currentSubscriptionIds.length > 0) {
          const upgradeRes = await base44.functions.invoke('handleBundleUpgrade', {
            currentSubscriptionIds,
            targetBundleType: selectedOption.type,
            billingPeriod,
          });

          if (!upgradeRes?.data?.success) {
            const serverError =
              upgradeRes?.data?.error ||
              upgradeRes?.error ||
              'Failed to prepare the bundle upgrade.';
            setError(serverError);
            setIsProcessing(false);
            return;
          }
        } else {
          console.warn(
            '[ModuleUpgradeFlow] No cancelable Stripe subscriptions found before bundle checkout.'
          );
        }
      }

      const moduleRouteMap = {
        pipekeeper: '/PipeKeeper',
        whiskeykeeper: '/WhiskeyKeeper',
        cigarkeeper: '/CigarKeeper',
        winekeeper: '/WineKeeper',
      };

      const nextPath =
        selectedOption.modules?.length === 1
          ? (moduleRouteMap[selectedOption.modules[0]] || '/CollectionHub')
          : '/CollectionHub';

      const successFlowUrl =
        `${window.location.origin}/SubscriptionSuccessFlow` +
        `?next=${encodeURIComponent(nextPath)}` +
        `&type=${encodeURIComponent(selectedOption.type)}` +
        `&billing=${encodeURIComponent(billingPeriod)}`;

      const checkoutParams = {
        type: selectedOption.type,
        modules: selectedOption.modules,
        billingPeriod,
        successUrl: successFlowUrl,
        cancelUrl: `${window.location.origin}/Subscription`,
      };

      const sessionRes = await base44.functions.invoke(
        'createModuleCheckoutSession',
        checkoutParams
      );

      const checkoutUrl = sessionRes?.data?.url || sessionRes?.url;

      if (!checkoutUrl) {
        setError(
          sessionRes?.data?.error ||
          sessionRes?.error ||
          'Failed to create checkout session.'
        );
        setIsProcessing(false);
        return;
      }

      if (typeof onUpgradeComplete === 'function') {
        try {
          onUpgradeComplete({
            type: selectedOption.type,
            modules: selectedOption.modules,
            billingPeriod,
            checkoutUrl,
          });
        } catch (callbackErr) {
          console.warn('[ModuleUpgradeFlow] onUpgradeComplete callback failed:', callbackErr);
        }
      }

      const opened = window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      if (!opened || opened?.closed) {
        toast.error("Unable to open checkout here. Please try again from the Subscription page.");
        navigate(createPageUrl("Subscription"));
      }
    } catch (err) {
      console.error('[ModuleUpgradeFlow]', err);
      setError(err?.message || 'An unexpected error occurred.');
      setIsProcessing(false);
    }
  };

  const currentModules = currentState.paidModules.length > 0 ? (
    <div className="mb-6">
      <h3 className="text-lg font-bold mb-3" style={{ color: '#F5F1E7' }}>
        Your Current Modules
      </h3>
      <div className="flex flex-wrap gap-2">
        {currentState.paidModules.map((module) => (
          <span
            key={module}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              background: 'rgba(180, 140, 75, 0.2)',
              color: '#D4A574',
              border: '1px solid rgba(180, 140, 75, 0.3)',
            }}
          >
            {getModuleDisplayName(module)}
          </span>
        ))}
      </div>
    </div>
  ) : (
    <div
      className="mb-6 p-4 rounded-lg"
      style={{
        background: 'rgba(160, 100, 100, 0.1)',
        borderLeft: '3px solid #A35C5C',
      }}
    >
      <p style={{ color: '#E0D8C8' }}>
        {t('subscription.noModulesPurchased')}
      </p>
    </div>
  );

  const upgradeOptions = availablePaths.map((path) => {
    const price = calculatePrice(billingPeriod, path.modules);
    const displayPrice = formatPrice(price);
    const savings = path.type.startsWith('bundle')
      ? getBundleSavings(billingPeriod, path.modules)
      : null;
    const isRecommended = upgradeRecommendation?.type === path.type;

    return (
      <div
        key={`${path.type}-${path.modules.join(',')}`}
        onClick={() => handleSelectOption(path)}
        className={cn(
          'p-5 rounded-lg border-2 cursor-pointer transition-all',
          selectedOption?.type === path.type &&
            selectedOption?.modules.join(',') === path.modules.join(',')
            ? 'bg-[#A35C5C]/20 border-[#A35C5C]'
            : 'bg-[#2a1f18]/50 border-[#8b6239]/30 hover:border-[#A35C5C]/50'
        )}
      >
        <div className="flex items-start justify-between mb-2 gap-3">
          <h4 className="text-lg font-bold" style={{ color: '#F5F1E7' }}>
            {path.type === 'single'
              ? getModuleDisplayName(path.modules[0])
              : `${path.modules.length}-Module Bundle`}
          </h4>

          {isRecommended && (
            <span
              className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap"
              style={{
                background: 'rgba(212, 165, 116, 0.3)',
                color: '#D4A574',
              }}
            >
              <Zap className="w-3 h-3" />
              Recommended
            </span>
          )}
        </div>

        <p
          className="text-sm mb-3"
          style={{ color: 'rgba(224,216,200,0.7)' }}
        >
          {path.description}
        </p>

        <div className="text-2xl font-bold mb-2" style={{ color: '#D4A574' }}>
          {displayPrice}{' '}
          <span
            className="text-sm"
            style={{ color: 'rgba(224,216,200,0.6)' }}
          >
            /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
          </span>
        </div>

        {savings && savings.savingsPercentage > 0 && (
          <p className="text-xs" style={{ color: '#10B981' }}>
            Save {savings.savingsPercentage}% vs individual modules
          </p>
        )}

        <div className="mt-3 space-y-1">
          {path.modules.map((module) => (
            <div
              key={module}
              className="flex items-center gap-2 text-xs"
              style={{ color: '#E0D8C8' }}
            >
              <Check className="w-3 h-3" style={{ color: '#10B981' }} />
              {getModuleDisplayName(module)}
            </div>
          ))}
        </div>
      </div>
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-3">
        {['monthly', 'annual'].map((period) => (
          <button
            key={period}
            onClick={() => {
              setBillingPeriod(period);
              setError(null);
            }}
            className={cn(
              'px-5 py-2 rounded-lg font-semibold transition-all',
              billingPeriod === period
                ? 'bg-[#A35C5C] text-white'
                : 'bg-[#3a2a20]/50 text-[#E0D8C8]/70 hover:bg-[#3a2a20]'
            )}
          >
            {period === 'monthly' ? 'Monthly' : 'Annual'}
          </button>
        ))}
      </div>

      {currentModules}

      {error && (
        <div
          className="p-4 rounded-lg border border-[#E05D5D]/40 flex gap-3"
          style={{ background: 'rgba(224, 93, 93, 0.1)' }}
        >
          <AlertCircle
            className="w-5 h-5 flex-shrink-0"
            style={{ color: '#E05D5D' }}
          />
          <div>
            <p className="font-semibold" style={{ color: '#E05D5D' }}>
              {t('common.error')}
            </p>
            <p
              className="text-sm"
              style={{ color: 'rgba(224,216,200,0.7)' }}
            >
              {error}
            </p>
          </div>
        </div>
      )}

      {upgradeOptions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upgradeOptions}
          </div>

          {selectedOption && (
            <div className="flex justify-between items-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => setSelectedOption(null)}
                disabled={isProcessing}
              >
                {t('common.cancel')}
              </Button>

              <Button
                onClick={handleProceedToCheckout}
                disabled={isProcessing}
                className="bg-[#A35C5C] hover:bg-[#8F4E4E]"
              >
                {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div
          className="p-6 text-center rounded-lg"
          style={{ background: 'rgba(42, 31, 24, 0.5)' }}
        >
          <p style={{ color: '#E0D8C8' }}>
            {t('subscription.allModulesPurchased')}
          </p>
        </div>
      )}
    </div>
  );
}