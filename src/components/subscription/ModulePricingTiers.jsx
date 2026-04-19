import React, { useMemo } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getModuleDisplayName, getActiveModules } from '@/components/utils/moduleRegistry';
import { detectBundleTier, calculatePrice, formatPrice, getBundleSavings } from '@/components/utils/bundlePricingEngine';

/**
 * Modular pricing tiers display
 * Shows all available pricing options based on user's current selection
 */
export default function ModulePricingTiers({
  selectedModules = [],
  currentEntitlements = [],
  billingPeriod = 'annual',
  onSelectPlan,
  isLoading = false,
}) {
  const { t } = useTranslation();
  const activeModules = useMemo(() => getActiveModules(), []);

  const currentTier = useMemo(() => detectBundleTier(selectedModules), [selectedModules]);
  const currentPrice = useMemo(() => calculatePrice(billingPeriod, selectedModules), [billingPeriod, selectedModules]);

  // Available pricing options
  const pricingOptions = useMemo(() => {
      const hasFoundersModules = activeModules.includes('pipekeeper') && activeModules.includes('whiskeykeeper');
      return [
        // Individual module options
        ...activeModules.map(module => ({
        id: `single-${module}`,
        type: 'single',
        modules: [module],
        displayName: getModuleDisplayName(module),
        price: 299, // $2.99
        priceAnnual: 2999, // $29.99
        description: t('subscription.singleModuleDesc', { module: getModuleDisplayName(module) }),
        isBest: false,
          isSelected: selectedModules.includes(module),
        })),

        // Founders bundle option (PipeKeeper + WhiskeyKeeper)
        hasFoundersModules ? {
          id: 'bundle-founders',
          type: 'bundle_founders',
          modules: ['pipekeeper', 'whiskeykeeper'],
          displayName: 'Founders Bundle',
          price: 499, // $4.99
          priceAnnual: 4999, // $49.99
          description: 'PipeKeeper + WhiskeyKeeper in one plan.',
          isBest: true,
          isSelected:
            selectedModules.length === 2 &&
            selectedModules.includes('pipekeeper') &&
            selectedModules.includes('whiskeykeeper') &&
            currentTier === 'bundle_2',
          savings: getBundleSavings(billingPeriod, ['pipekeeper', 'whiskeykeeper']),
        } : null,
      ].filter(Boolean);
  }, [activeModules, selectedModules, currentTier, billingPeriod, t]);

  return (
    <div className="space-y-6">
      {/* Billing period selector */}
      <div className="flex justify-center gap-4">
        {['monthly', 'annual'].map(period => (
          <button
            key={period}
            onClick={() => {
              // Trigger period change in parent
              if (onSelectPlan) {
                onSelectPlan({ type: 'period', value: period });
              }
            }}
            className={cn(
              'px-6 py-2 rounded-lg font-semibold transition-all',
              billingPeriod === period
                ? 'bg-[#A35C5C] text-white'
                : 'bg-[#3a2a20]/50 text-[#E0D8C8]/70 hover:bg-[#3a2a20]'
            )}
          >
            {period === 'monthly' ? 'Monthly' : 'Annual'}
            {period === 'annual' && <span className="ml-2 text-xs">Save 17%</span>}
          </button>
        ))}
      </div>

      {/* Pricing cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pricingOptions.map(option => {
          const price = billingPeriod === 'monthly' ? option.price : option.priceAnnual;
          const displayPrice = formatPrice(price);

          return (
            <div
              key={option.id}
              className={cn(
                'rounded-xl p-6 border-2 transition-all duration-200 cursor-pointer hover:shadow-xl',
                option.isSelected
                  ? 'bg-gradient-to-br from-[#A35C5C]/20 to-[#8F4E4E]/20 border-[#A35C5C]'
                  : 'bg-[#2a1f18]/50 border-[#8b6239]/30 hover:border-[#A35C5C]/50'
              )}
              onClick={() => {
                if (onSelectPlan) {
                  onSelectPlan({
                    type: option.type,
                    modules: option.modules,
                  });
                }
              }}
            >
              {/* Best value badge */}
              {option.isBest && (
                <div className="absolute top-0 right-0 bg-[#D4A574] text-[#0f0b08] px-3 py-1 rounded-bl-lg text-xs font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Best Value
                </div>
              )}

              {/* Title */}
              <h3 className="text-lg font-bold mb-2" style={{ color: '#F5F1E7' }}>
                {option.displayName}
              </h3>

              {/* Price */}
              <div className="mb-4">
                <div className="text-3xl font-bold" style={{ color: '#D4A574' }}>
                  {displayPrice}
                </div>
                <p className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
                  {billingPeriod === 'monthly' ? 'per month' : 'per year'}
                </p>
              </div>

              {/* Savings badge */}
              {option.savings && option.savings.savingsPercentage > 0 && (
                <div className="mb-4 px-3 py-2 bg-[#10B981]/20 rounded-lg border border-[#10B981]/40">
                  <p className="text-sm font-semibold" style={{ color: '#10B981' }}>
                    Save {option.savings.savingsPercentage}%
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
                    vs individual pricing
                  </p>
                </div>
              )}

              {/* Description */}
              <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.7)' }}>
                {option.description}
              </p>

              {/* Modules list */}
              <div className="space-y-2 mb-6">
                {option.modules.map(module => (
                  <div
                    key={module}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: '#E0D8C8' }}
                  >
                    <Check className="w-4 h-4" style={{ color: '#10B981' }} />
                    {getModuleDisplayName(module)}
                  </div>
                ))}
              </div>

              {/* Select button */}
              <button
                disabled={isLoading || option.isSelected}
                className={cn(
                  'w-full py-2 rounded-lg font-semibold transition-all duration-200',
                  option.isSelected
                    ? 'bg-[#A35C5C] text-white cursor-default'
                    : 'bg-[#A35C5C]/80 text-white hover:bg-[#A35C5C] active:scale-95'
                )}
              >
                {option.isSelected ? 'Selected' : 'Select Plan'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Current selection summary */}
      {selectedModules.length > 0 && (
        <div className="mt-8 p-6 rounded-xl border border-[#8b6239]/30" style={{ background: 'rgba(42, 31, 24, 0.5)' }}>
          <h4 className="font-semibold mb-2" style={{ color: '#F5F1E7' }}>
            Selected Modules
          </h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedModules.map(module => (
              <span
                key={module}
                className="px-3 py-1 rounded-lg text-sm font-medium"
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
          <div className="flex justify-between items-center">
            <span style={{ color: 'rgba(224,216,200,0.7)' }}>Total Monthly Cost:</span>
            <span className="text-2xl font-bold" style={{ color: '#D4A574' }}>
              {formatPrice(currentPrice)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
