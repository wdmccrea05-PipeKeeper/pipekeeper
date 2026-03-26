import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccessSummary } from '@/components/hooks/useAccessSummary';
import { toast } from 'sonner';
import {
  getPlanFromSelection,
  initiateCheckout,
  handlePostPurchase,
} from './subscriptionHandler';

function buildSuccessFlowUrl(nextPath = '/CollectionHub') {
  const safeNext =
    typeof nextPath === 'string' && nextPath.trim().length > 0
      ? nextPath
      : '/CollectionHub';

  return `/SubscriptionSuccessFlow?next=${encodeURIComponent(safeNext)}`;
}

/**
 * Hook for paywall logic and plan selection
 * Manages user experience for subscription checkout and post-purchase
 */
export function usePaywall() {
  const navigate = useNavigate();
  const access = useAccessSummary();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState('monthly');

  /**
   * Handle paywall plan selection
   * Routes to Stripe checkout
   * Shows user-facing errors and logs for debugging
   */
  const selectPlan = useCallback(
    async (selectedPlan, billingPeriod = selectedBillingPeriod, options = {}) => {
      try {
        setIsLoading(true);
        setError(null);

        const { planKey, modules } = getPlanFromSelection(
          selectedPlan,
          billingPeriod,
          options?.selectedModules,
          options?.baseModule
        );

        if (!planKey) {
          throw new Error('Invalid plan selection');
        }

        const requestedNext = options?.successUrl || '/CollectionHub';
        const successUrl = buildSuccessFlowUrl(requestedNext);
        const cancelUrl = options?.cancelUrl || '/';

        await initiateCheckout(
          planKey,
          modules,
          successUrl,
          cancelUrl
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Checkout failed';
        setError(message);

        toast.error(message || 'We couldn\'t start checkout. Please try again.');

        console.error('[usePaywall] selectPlan failed:', {
          error: err,
          billingPeriod,
          selectedPlan,
          options,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBillingPeriod]
  );

  /**
   * Handle post-purchase completion
   * Updates entitlements, shows status, and navigates
   * Shows user-facing errors if sync fails
   */
  const completePayment = useCallback(
    async (targetUrl = '/CollectionHub') => {
      try {
        setIsLoading(true);
        setError(null);

        await handlePostPurchase();

        toast.success('Subscription activated!');
        navigate(targetUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to activate subscription';
        setError(message);

        toast.error(message || 'Subscription activation is taking longer than expected. Retrying...');

        console.error('[usePaywall] completePayment failed:', {
          error: err,
          targetUrl,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [navigate]
  );

  /**
   * Determine which paywall to show
   */
  const getPaywallType = useCallback(
    (context) => {
      const selectedCount = context?.selectedModules?.length || 0;

      if (selectedCount >= 2) return 'multi';
      if (context?.lockedModule) return 'module';
      if (access?.activeModules?.length) return 'expansion';

      return 'module';
    },
    [access]
  );

  return {
    selectPlan,
    completePayment,
    getPaywallType,
    isLoading,
    error,
    currentModules: access?.activeModules || [],
    selectedBillingPeriod,
    setSelectedBillingPeriod,
  };
}

export default usePaywall;