import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

export default function PricingCard({
  title,
  priceMonthly,
  priceAnnual,
  badge,
  cta,
  highlighted = false,
  onSelect,
  isSelected = false,
}) {
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  // Defensive null checks for prices
  if (!priceMonthly || !priceAnnual) {
    return (
      <div className="relative rounded-xl p-5 opacity-50 cursor-not-allowed"
        style={{
          background: 'rgba(20, 20, 22, 0.5)',
          border: '1px solid rgba(120, 90, 65, 0.15)',
        }}
      >
        <h3 className="text-base font-bold mb-3" style={{ color: '#F5F1E7' }}>
          {title}
        </h3>
        <p className="text-sm" style={{ color: 'rgba(224, 216, 200, 0.5)' }}>
          Not available
        </p>
      </div>
    );
  }

  const displayPrice = billingPeriod === 'monthly' ? priceMonthly : priceAnnual;
  const displayPeriod = billingPeriod === 'monthly' ? '/month' : '/year';

  // Calculate annual savings (with null safety)
  const monthlyNum = parseFloat(priceMonthly) || 0;
  const annualNum = parseFloat(priceAnnual) || 0;
  const annualMonthly = (monthlyNum * 12).toFixed(2);
  const savings = billingPeriod === 'annual' && annualNum > 0 && annualNum < parseFloat(annualMonthly)
    ? ((parseFloat(annualMonthly) - annualNum) / parseFloat(annualMonthly) * 100).toFixed(0)
    : null;

  return (
    <div
      onClick={() => onSelect?.(billingPeriod)}
      className="relative rounded-xl p-5 transition-all cursor-pointer"
      style={{
        background: highlighted ? 'rgba(163, 92, 92, 0.15)' : 'rgba(20, 20, 22, 0.8)',
        border: highlighted 
          ? '2px solid rgba(180, 140, 75, 0.5)' 
          : '1px solid rgba(120, 90, 65, 0.3)',
        boxShadow: highlighted 
          ? '0 0 20px rgba(180, 140, 75, 0.2), inset 0 1px 0 rgba(180, 140, 100, 0.1)' 
          : 'inset 0 1px 0 rgba(180, 140, 100, 0.05)',
      }}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div
            className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, rgba(180,140,75,0.9), rgba(150,110,55,1))',
              color: '#F5F1E7',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            <Star className="w-3 h-3" />
            {badge}
          </div>
        </div>
      )}

      {/* Title */}
      <h3
        className="text-base font-bold mb-3 pt-2"
        style={{ color: '#F5F1E7' }}
      >
        {title}
      </h3>

      {/* Price */}
      <div className="mb-4">
        <div
          className="text-4xl font-bold"
          style={{ color: '#D4A574' }}
        >
          ${displayPrice}
        </div>
        <div
          className="text-xs mt-1"
          style={{ color: 'rgba(224, 216, 200, 0.6)' }}
        >
          {displayPeriod}
        </div>
        {savings && (
          <div
            className="text-xs font-medium mt-1.5 px-2 py-1 rounded inline-block"
            style={{
              background: 'rgba(90, 124, 90, 0.2)',
              color: '#A0D5A0',
            }}
          >
            Save {savings}% annually
          </div>
        )}
      </div>

      {/* Billing Toggle */}
      {priceMonthly && priceAnnual && (
        <div className="flex gap-1 mb-4 bg-black/30 rounded-lg p-1 w-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setBillingPeriod('monthly');
            }}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            style={{
              background: billingPeriod === 'monthly' ? 'rgba(180,140,75,0.3)' : 'transparent',
            }}
          >
            Monthly
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setBillingPeriod('annual');
            }}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
              billingPeriod === 'annual'
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            style={{
              background: billingPeriod === 'annual' ? 'rgba(180,140,75,0.3)' : 'transparent',
            }}
          >
            Annual
          </button>
        </div>
      )}

      {/* CTA Button */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(billingPeriod);
        }}
        className="w-full font-medium text-sm"
        disabled={!priceMonthly || !priceAnnual}
        style={{
          background: highlighted && (priceMonthly && priceAnnual)
            ? 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))'
            : 'rgba(100, 70, 45, 0.6)',
          color: '#F5F1E7',
          border: '1px solid rgba(180, 140, 75, 0.3)',
          opacity: priceMonthly && priceAnnual ? 1 : 0.5,
        }}
      >
        {cta}
      </Button>

      {/* Selection Indicator */}
      {isSelected && (
        <div
          className="absolute top-2 right-2 w-3 h-3 rounded-full"
          style={{ background: '#D4A574' }}
        />
      )}
    </div>
  );
}