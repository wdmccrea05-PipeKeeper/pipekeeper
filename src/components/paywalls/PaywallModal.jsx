/**
 * Unified Paywall Modal
 * Hotfix goals:
 * - do not advertise blocked/internal modules in production paywalls
 * - only present plans that are actually launch-aligned for the current release
 */

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import PricingCard from '@/components/subscription/PricingCard';
import { usePaywall } from '@/components/subscription/usePaywall';
import {
  getModuleReleaseState,
  isModuleLaunched,
} from '@/components/utils/moduleReleaseState';

const moduleLabels = {
  pipekeeper: 'PipeKeeper',
  whiskeykeeper: 'WhiskeyKeeper',
  cigarkeeper: 'CigarKeeper',
  winekeeper: 'WineKeeper',
};

const ALL_MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

function launchedModules() {
  return ALL_MODULES.filter((m) => isModuleLaunched(m));
}

function getVisibleOfferConfig(lockedModule) {
  const launched = launchedModules();
  const canOfferThree = launched.length >= 3;
  const canOfferFour = launched.length >= 4;
  const moduleIsLaunchable = lockedModule ? isModuleLaunched(lockedModule) : true;

  return {
    launched,
    canOfferThree,
    canOfferFour,
    moduleIsLaunchable,
    primaryModule: moduleIsLaunchable ? lockedModule || launched[0] || 'pipekeeper' : 'pipekeeper',
  };
}

export default function PaywallModal({
  type = 'module',
  selectedModules = [],
  currentModules = [],
  lockedModule = null,
  onClose,
  isLoading = false,
}) {
  const { selectPlan } = usePaywall();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  const offerConfig = useMemo(() => getVisibleOfferConfig(lockedModule), [lockedModule]);

  const getHeader = () => {
    if (!offerConfig.moduleIsLaunchable) {
      return {
        headline: 'PipeKeeper Pro',
        subtext: 'This release currently unlocks PipeKeeper on the CollectionKeeper platform.',
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
          headline: 'Unlock PipeKeeper',
          subtext: 'This production release is focused on PipeKeeper while other modules remain hidden.',
        };
      case 'expansion':
        return {
          headline: 'PipeKeeper Pro',
          subtext: `You're currently tracking ${currentModules.length} keeper${currentModules.length !== 1 ? 's' : ''}.`,
        };
      default:
        return { headline: 'Unlock PipeKeeper', subtext: '' };
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
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#F5F1E7' }}>
              {header.headline}
            </h2>
            {header.subtext && (
              <p className="text-sm" style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
                {header.subtext}
              </p>
            )}
            {!offerConfig.canOfferThree && !offerConfig.canOfferFour && (
              <p className="text-xs mt-3" style={{ color: 'rgba(212, 165, 116, 0.8)' }}>
                Additional Keepers are still hidden while they are being prepared for later launch.
              </p>
            )}
          </div>

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
        </div>
      </div>
    </div>
  );
}
