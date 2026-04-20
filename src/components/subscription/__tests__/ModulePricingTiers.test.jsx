import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModulePricingTiers from '@/components/subscription/ModulePricingTiers';

vi.mock('@/components/i18n/safeTranslation', () => ({
  useTranslation: () => ({ t: (key, fallbackOrParams) => {
    if (typeof fallbackOrParams === 'string') return fallbackOrParams;
    const dictionary = {
      'subscriptionFull.individualModulesTitle': 'Individual Modules',
      'subscriptionFull.bundlesTitle': 'Bundles',
      'subscription.mostPopular': 'Most Popular',
      'subscription.bestValue': 'Best Value',
      'subscription.alreadySubscribedUpgradeHint': 'Already subscribed? Choose an upgrade option to expand your access without losing current modules.',
      'subscription.foundersOffer': 'Founders Bundle',
    };
    return dictionary[key] || key;
  } }),
}));

vi.mock('@/components/utils/moduleRegistry', () => ({
  getActiveModules: () => ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
  getModuleDisplayName: (module) => ({
    pipekeeper: 'PipeKeeper',
    whiskeykeeper: 'WhiskeyKeeper',
    cigarkeeper: 'CigarKeeper',
  }[module] || module),
}));

vi.mock('@/components/utils/bundlePricingEngine', () => ({
  detectBundleTier: (modules) => (modules.length >= 2 ? 'bundle_2' : 'single'),
  calculatePrice: () => 499,
  formatPrice: (price) => `$${(price / 100).toFixed(2)}`,
  getBundleSavings: (_period, modules) => (
    modules.length > 1 ? { savingsPercentage: modules.length === 2 ? 16 : 33 } : null
  ),
}));

describe('ModulePricingTiers', () => {
  it('renders separate individual and bundle sections with conversion badges', () => {
    render(<ModulePricingTiers selectedModules={[]} billingPeriod="annual" />);

    expect(screen.getByText('Individual Modules')).toBeTruthy();
    expect(screen.getByText('Bundles')).toBeTruthy();
    expect(screen.getByText('Most Popular')).toBeTruthy();
    expect(screen.getByText('Best Value')).toBeTruthy();
  });

  it('shows subscriber upgrade guidance when entitlements exist', () => {
    render(
      <ModulePricingTiers
        selectedModules={['pipekeeper']}
        currentEntitlements={['pipekeeper']}
        billingPeriod="annual"
      />
    );

    expect(screen.getByText(/Already subscribed\?/i)).toBeTruthy();
  });

  it('emits plan selection payloads for bundle choices', () => {
    const onSelectPlan = vi.fn();
    render(<ModulePricingTiers selectedModules={[]} billingPeriod="annual" onSelectPlan={onSelectPlan} />);

    fireEvent.click(screen.getByText('Founders Bundle'));
    expect(onSelectPlan).toHaveBeenCalledWith({
      type: 'bundle_founders',
      modules: ['pipekeeper', 'whiskeykeeper'],
    });
  });
});
