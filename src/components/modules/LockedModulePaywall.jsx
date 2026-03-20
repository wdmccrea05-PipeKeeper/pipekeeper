import React, { useState } from 'react';
import PaywallModal from '@/components/subscription/PaywallModal';
import { usePaywall } from '@/components/subscription/usePaywall';
import { getModuleSuccessRoute } from '@/components/subscription/moduleRoutes';

/**
 * Locked module paywall overlay
 * Shown when user tries to access a module they don't have
 */
export default function LockedModulePaywall({
  moduleKey,
  onUpgrade,
  onClose,
}) {
  const { selectPlan, isLoading, currentModules } = usePaywall();
  const [isOpen, setIsOpen] = useState(true);

  const handleSelectPlan = async (selectedPlan, billingPeriod) => {
    try {
      const successRoute = getModuleSuccessRoute(moduleKey);
      await selectPlan(selectedPlan, billingPeriod, {
        baseModule: moduleKey,
        successUrl: successRoute,
      });
    } catch (error) {
      console.error('Plan selection failed:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <PaywallModal
      type="module"
      lockedModule={moduleKey}
      currentModules={currentModules}
      onClose={handleClose}
      onSelectPlan={handleSelectPlan}
      isLoading={isLoading}
    />
  );
}