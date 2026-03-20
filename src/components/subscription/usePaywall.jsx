import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccessSummary } from '@/components/hooks/useAccessSummary';
import {
  getPlanFromSelection,
  initiateCheckout,
  handlePostPurchase,
} from './subscriptionHandler';

export function usePaywall() {
  const navigate = useNavigate();
  const access = useAccessSummary();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle paywall plan selection
   * Routes to Stripe checkout
   */
  const selectPlan = useCallback(
    async (
      selectedPlan: 'single' | 'three' | 'four',
      billingPeriod: 'monthly' | 'annual',
      options?: {
        selectedModules?: string[];
        baseModule?: string;
        successUrl?: string;
        cancelUrl?: string;
      }
    ) => {
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

        // Initiate Stripe checkout
        await initiateCheckout(
          planKey,
          modules,
          options?.successUrl || '/CollectionHub',
          options?.cancelUrl || '/'
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Checkout failed';
        setError(message);
        console.error('Plan selection error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Handle post-purchase completion
   * Updates entitlements and navigates
   */
  const completePayment = useCallback(
    async (targetUrl: string = '/CollectionHub') => {
      try {
        setIsLoading(true);
        setError(null);

        // Sync subscription and rebuild access
        await handlePostPurchase();

        // Navigate to target
        navigate(targetUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment completion failed';
        setError(message);
        console.error('Post-purchase error:', err);
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
    (context?: {
      selectedModules?: string[];
      lockedModule?: string;
    }): 'module' | 'multi' | 'expansion' => {
      const selectedCount = context?.selectedModules?.length || 0;

      // Multi-module paywall (onboarding with 2+ modules selected)
      if (selectedCount >= 2) return 'multi';

      // Module paywall (single locked module)
      if (context?.lockedModule) return 'module';

      // Expansion paywall (existing user adding to their plan)
      if (access?.activeModules?.length) return 'expansion';

      // Default to module paywall
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
  };
}