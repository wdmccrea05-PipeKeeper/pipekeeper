import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import PricingCard from './PricingCard';
import ModuleChips from './ModuleChips';
import { useTranslation } from '@/components/i18n/safeTranslation';

const moduleLabels = {
  pipekeeper: 'PipeKeeper',
  whiskeykeeper: 'WhiskeyKeeper',
  cigarkeeper: 'CigarKeeper',
  winekeeper: 'WineKeeper',
};

const moduleDescriptions = {
  pipekeeper: 'Organize and explore your pipe and tobacco collection',
  whiskeykeeper: 'Track bottles, inventory, value, and tasting notes',
  cigarkeeper: 'Coming soon',
  winekeeper: 'Coming soon',
};

export default function PaywallModal({
  type = 'module', // 'module' | 'multi' | 'expansion'
  selectedModules = [],
  currentModules = [],
  lockedModule = null,
  onClose,
  onSelectPlan,
  isLoading = false,
}) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Determine header based on type
  const getHeader = () => {
    switch (type) {
      case 'module':
        return {
          headline: `Unlock ${moduleLabels[lockedModule] || 'Module'}`,
          subtext: moduleDescriptions[lockedModule] || 'Unlock this powerful collection tool.',
        };
      case 'multi':
        return {
          headline: 'Build Your Collection System',
          subtext: 'You've selected multiple collections — unlock them together for the best value.',
        };
      case 'expansion':
        return {
          headline: 'Expand Your Collection',
          subtext: 'You're currently tracking:',
        };
      default:
        return { headline: 'Unlock Your Collection', subtext: '' };
    }
  };

  const header = getHeader();

  // Render content based on type
  const renderContent = () => {
    switch (type) {
      case 'module':
        return renderModulePaywall();
      case 'multi':
        return renderMultiPaywall();
      case 'expansion':
        return renderExpansionPaywall();
      default:
        return null;
    }
  };

  const renderModulePaywall = () => (
    <div className="space-y-6">
      {/* Value Props */}
      <div className="space-y-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(180, 140, 75, 0.8)' }}
        >
          What You'll Get
        </h3>
        <ul className="space-y-2">
          {[
            'Unlimited collections',
            'Smart categorization',
            'Value tracking',
            'AI-powered insights',
          ].map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span style={{ color: '#D4A574' }} className="mt-1">
                ✓
              </span>
              <span style={{ color: 'rgba(224, 216, 200, 0.8)' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pricing Cards */}
      <div className="space-y-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(180, 140, 75, 0.8)' }}
        >
          Choose Your Plan
        </h3>
        <div className="grid gap-3">
          {/* Single Module */}
          <PricingCard
            title={`${moduleLabels[lockedModule]} Pro`}
            priceMonthly="2.99"
            priceAnnual="29.99"
            cta={`Unlock ${moduleLabels[lockedModule]}`}
            highlighted={true}
            isSelected={selectedPlan === 'single'}
            onSelect={() => setSelectedPlan('single')}
          />

          {/* 3-Module Bundle */}
          <PricingCard
            title="Unlock 3 Keepers"
            priceMonthly="7.99"
            priceAnnual="79.99"
            badge="Best Value"
            cta="Expand Your Collection"
            isSelected={selectedPlan === 'three'}
            onSelect={() => setSelectedPlan('three')}
          />

          {/* 4-Module Bundle */}
          <PricingCard
            title="Unlock All Keepers"
            priceMonthly="8.99"
            priceAnnual="89.99"
            cta="Go All In"
            isSelected={selectedPlan === 'four'}
            onSelect={() => setSelectedPlan('four')}
          />
        </div>
      </div>
    </div>
  );

  const renderMultiPaywall = () => (
    <div className="space-y-6">
      {/* Selected Modules */}
      <div>
        <h3
          className="text-sm font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'rgba(180, 140, 75, 0.8)' }}
        >
          Your Collections
        </h3>
        <ModuleChips modules={selectedModules} />
      </div>

      {/* Pricing Cards */}
      <div className="space-y-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(180, 140, 75, 0.8)' }}
        >
          Choose Your Plan
        </h3>
        <div className="grid gap-3">
          {/* 3-Module Bundle */}
          <PricingCard
            title="Unlock 3 Keepers"
            priceMonthly="7.99"
            priceAnnual="79.99"
            badge="Best Value"
            cta="Unlock 3 Keepers"
            highlighted={true}
            isSelected={selectedPlan === 'three'}
            onSelect={() => setSelectedPlan('three')}
          />

          {/* 4-Module Bundle */}
          <PricingCard
            title="Unlock All Keepers"
            priceMonthly="8.99"
            priceAnnual="89.99"
            cta="Unlock Everything"
            isSelected={selectedPlan === 'four'}
            onSelect={() => setSelectedPlan('four')}
          />

          {/* Single Module Option */}
          <div className="text-center pt-2">
            <p style={{ color: 'rgba(224, 216, 200, 0.6)' }} className="text-sm">
              Or start with one Keeper
            </p>
            <button
              onClick={() => setSelectedPlan('single')}
              style={{ color: '#D4A574' }}
              className="text-sm font-medium hover:underline mt-1"
            >
              Continue with one for $2.99/month
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExpansionPaywall = () => (
    <div className="space-y-6">
      {/* Current Modules */}
      <div>
        <p
          className="text-sm font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'rgba(180, 140, 75, 0.8)' }}
        >
          Current Collections
        </p>
        <ModuleChips modules={currentModules} />
      </div>

      {/* Pricing Cards */}
      <div className="space-y-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(180, 140, 75, 0.8)' }}
        >
          Add to Your System
        </h3>
        <div className="grid gap-3">
          {/* Add Single Module */}
          <PricingCard
            title={`Add ${moduleLabels[selectedModules[0]] || 'a Keeper'}`}
            priceMonthly="2.99"
            priceAnnual="29.99"
            cta={`Add This Keeper`}
            isSelected={selectedPlan === 'single'}
            onSelect={() => setSelectedPlan('single')}
          />

          {/* Upgrade to 3 */}
          <PricingCard
            title="Upgrade to 3 Keepers"
            priceMonthly="7.99"
            priceAnnual="79.99"
            badge="Most Popular"
            cta="Expand Your Collection"
            highlighted={true}
            isSelected={selectedPlan === 'three'}
            onSelect={() => setSelectedPlan('three')}
          />

          {/* Upgrade to All */}
          <PricingCard
            title="Unlock Everything"
            priceMonthly="8.99"
            priceAnnual="89.99"
            cta="Go All In"
            isSelected={selectedPlan === 'four'}
            onSelect={() => setSelectedPlan('four')}
          />
        </div>
      </div>
    </div>
  );

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
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-all z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" style={{ color: 'rgba(224, 216, 200, 0.6)' }} />
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <h2
              className="text-2xl sm:text-3xl font-bold mb-2"
              style={{ color: '#F5F1E7' }}
            >
              {header.headline}
            </h2>
            {header.subtext && (
              <p
                className="text-sm"
                style={{ color: 'rgba(224, 216, 200, 0.75)' }}
              >
                {header.subtext}
              </p>
            )}
          </div>

          {/* Content */}
          {renderContent()}

          {/* Footer */}
          <div
            className="mt-8 pt-6 border-t text-xs text-center"
            style={{ borderColor: 'rgba(120, 90, 65, 0.2)', color: 'rgba(224, 216, 200, 0.5)' }}
          >
            <p>
              Cancel anytime. <span className="mx-1">•</span> Secure checkout via Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}