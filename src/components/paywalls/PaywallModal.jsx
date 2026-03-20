/**
 * Unified Paywall Modal
 * 3 types: module | multi | expansion
 * Handles plan selection and routing to checkout
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Crown } from 'lucide-react';
import PricingCard from '@/components/subscription/PricingCard';
import { usePaywall } from '@/components/subscription/usePaywall';
import { useTranslation } from '@/components/i18n/safeTranslation';

const moduleLabels = {
  pipekeeper: 'PipeKeeper',
  whiskeykeeper: 'WhiskeyKeeper',
  cigarkeeper: 'CigarKeeper',
  winekeeper: 'WineKeeper',
};

export default function PaywallModal({
  type = 'module',
  selectedModules = [],
  currentModules = [],
  lockedModule = null,
  onClose,
  isLoading = false,
}) {
  const { selectPlan } = usePaywall();
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  const getHeader = () => {
    switch (type) {
      case 'module':
        return {
          headline: `Unlock ${moduleLabels[lockedModule] || 'Module'}`,
          subtext: 'Start tracking your collection with smart organization and AI insights.',
        };
      case 'multi':
        return {
          headline: 'Build Your Collection System',
          subtext: 'You've selected multiple keepers — unlock them together for the best value.',
        };
      case 'expansion':
        return {
          headline: 'Expand Your Collection',
          subtext: `You're currently tracking ${currentModules.length} keeper${currentModules.length !== 1 ? 's' : ''}.`,
        };
      default:
        return { headline: 'Unlock Your Collection', subtext: '' };
    }
  };

  const header = getHeader();

  const handleSelectPlan = async (plan) => {
    setSelectedPlan(plan);
    try {
      await selectPlan(plan, billingPeriod, {
        selectedModules: type === 'multi' ? selectedModules : [],
        baseModule: type === 'module' ? lockedModule : null,
      });
    } catch (err) {
      console.error('[Paywall] Plan selection failed:', err);
      // Error already shown via toast in usePaywall
    }
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
          background:
            'linear-gradient(135deg, rgba(20, 20, 22, 0.95), rgba(28, 20, 16, 0.95))',
          border: '1px solid rgba(120, 90, 65, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-all z-10"
        >
          <X className="w-5 h-5" style={{ color: 'rgba(224, 216, 200, 0.6)' }} />
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#F5F1E7' }}>
              {header.headline}
            </h2>
            {header.subtext && (
              <p className="text-sm" style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
                {header.subtext}
              </p>
            )}
          </div>

          {/* Billing Toggle */}
          <div className="mb-6 flex gap-2 p-1 rounded-lg" style={{ background: 'rgba(120, 90, 65, 0.1)' }}>
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`flex-1 py-2 rounded text-sm font-medium transition-all ${
                billingPeriod === 'monthly' ? 'font-bold' : ''
              }`}
              style={{
                color: billingPeriod === 'monthly' ? '#D4A574' : '#8b6239',
                background: billingPeriod === 'monthly' ? 'rgba(180, 140, 75, 0.2)' : 'transparent',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`flex-1 py-2 rounded text-sm font-medium transition-all ${
                billingPeriod === 'annual' ? 'font-bold' : ''
              }`}
              style={{
                color: billingPeriod === 'annual' ? '#D4A574' : '#8b6239',
                background: billingPeriod === 'annual' ? 'rgba(180, 140, 75, 0.2)' : 'transparent',
              }}
            >
              Annual (Save 17%)
            </button>
          </div>

          {/* Pricing Cards */}
          <div className="space-y-3 mb-8">
            {type === 'module' && (
              <>
                <PricingCard
                  title={`${moduleLabels[lockedModule]} Pro`}
                  priceMonthly="2.99"
                  priceAnnual="29.99"
                  cta={`Unlock ${moduleLabels[lockedModule]}`}
                  highlighted
                  isSelected={selectedPlan === 'single'}
                  onSelect={() => handleSelectPlan('single')}
                  isLoading={isLoading && selectedPlan === 'single'}
                  billingPeriod={billingPeriod}
                />
                <PricingCard
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
              </>
            )}

            {type === 'multi' && (
              <>
                <PricingCard
                  title="Unlock 3 Keepers"
                  priceMonthly="7.99"
                  priceAnnual="79.99"
                  badge="Best Value"
                  cta="Unlock 3 Keepers"
                  highlighted
                  isSelected={selectedPlan === 'three'}
                  onSelect={() => handleSelectPlan('three')}
                  isLoading={isLoading && selectedPlan === 'three'}
                  billingPeriod={billingPeriod}
                />
                <PricingCard
                  title="Unlock Everything"
                  priceMonthly="8.99"
                  priceAnnual="89.99"
                  cta="Unlock All Keepers"
                  isSelected={selectedPlan === 'four'}
                  onSelect={() => handleSelectPlan('four')}
                  isLoading={isLoading && selectedPlan === 'four'}
                  billingPeriod={billingPeriod}
                />
              </>
            )}

            {type === 'expansion' && (
              <>
                <PricingCard
                  title="Add 1 More Keeper"
                  priceMonthly="2.99"
                  priceAnnual="29.99"
                  cta="Add Keeper"
                  isSelected={selectedPlan === 'single'}
                  onSelect={() => handleSelectPlan('single')}
                  isLoading={isLoading && selectedPlan === 'single'}
                  billingPeriod={billingPeriod}
                />
                <PricingCard
                  title={`Upgrade to 3 Keepers`}
                  priceMonthly="7.99"
                  priceAnnual="79.99"
                  badge="Most Popular"
                  cta="Upgrade Now"
                  highlighted
                  isSelected={selectedPlan === 'three'}
                  onSelect={() => handleSelectPlan('three')}
                  isLoading={isLoading && selectedPlan === 'three'}
                  billingPeriod={billingPeriod}
                />
                <PricingCard
                  title="Unlock Everything"
                  priceMonthly="8.99"
                  priceAnnual="89.99"
                  cta="Go All In"
                  isSelected={selectedPlan === 'four'}
                  onSelect={() => handleSelectPlan('four')}
                  isLoading={isLoading && selectedPlan === 'four'}
                  billingPeriod={billingPeriod}
                />
              </>
            )}
          </div>

          {/* Footer */}
          <div
            className="pt-6 border-t text-xs text-center"
            style={{ borderColor: 'rgba(120, 90, 65, 0.2)', color: 'rgba(224, 216, 200, 0.5)' }}
          >
            <p>Cancel anytime. Secure checkout via Stripe.</p>
          </div>
        </div>
      </div>
    </div>
  );
}