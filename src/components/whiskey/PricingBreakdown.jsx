import React from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { formatCurrency } from '@/components/utils/localeFormatters';
import { Badge } from '@/components/ui/badge';

export default function PricingBreakdown({ bottle }) {
  const { t } = useTranslation();

  const getPurchaseTypeLabel = (type) => {
    const typeMap = {
      retail: t('whiskey.purchaseTypeRetail'),
      aftermarket: t('whiskey.purchaseTypeAftermarket'),
      gift: t('whiskey.purchaseTypeGift'),
      trade: t('whiskey.purchaseTypeTrade'),
      other: t('whiskey.purchaseTypeOther'),
    };
    return typeMap[type] || type;
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high':
        return 'rgba(123, 155, 91, 0.15)';
      case 'medium':
        return 'rgba(180, 140, 75, 0.15)';
      case 'low':
        return 'rgba(210, 100, 100, 0.15)';
      default:
        return 'rgba(180, 140, 75, 0.15)';
    }
  };

  const getConfidenceTextColor = (confidence) => {
    switch (confidence) {
      case 'high':
        return '#7B9B5B';
      case 'medium':
        return '#D4A574';
      case 'low':
        return '#D26464';
      default:
        return '#D4A574';
    }
  };

  const hasAnyPricing = !!(
    bottle.purchase_price ||
    bottle.retail_price ||
    bottle.aftermarket_price ||
    bottle.collector_value
  );

  if (!hasAnyPricing) {
    return null;
  }

  return (
    <div className="rounded-lg p-6" style={{ background: 'rgba(42,30,20,0.5)', border: '1px solid rgba(180,140,75,0.15)' }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: '#F5F1E7' }}>
        {t('whiskey.pricingBreakdown')}
      </h2>

      <div className="space-y-3">
        {/* You Paid */}
        {bottle.purchase_price && (
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(100,70,45,0.1)', border: '1px solid rgba(180,140,75,0.15)' }}>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.6)' }}>
                {t('whiskey.actualPaid')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.7)' }}>
                {bottle.purchase_type ? getPurchaseTypeLabel(bottle.purchase_type) : '—'} {bottle.purchase_date ? `on ${new Date(bottle.purchase_date).toLocaleDateString()}` : ''}
              </p>
            </div>
            <p className="text-xl font-bold" style={{ color: '#D4A574' }}>
              {formatCurrency(bottle.purchase_price)}
            </p>
          </div>
        )}

        {/* Retail Price */}
        {bottle.retail_price && (
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.2)' }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.6)' }}>
              {t('whiskey.retailPrice')}
            </p>
            <p className="text-lg font-bold" style={{ color: '#D4A574' }}>
              {formatCurrency(bottle.retail_price)}
            </p>
          </div>
        )}

        {/* Aftermarket Price */}
        {bottle.aftermarket_price && (
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.2)' }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.6)' }}>
              {t('whiskey.aftermarketPrice')}
            </p>
            <p className="text-lg font-bold" style={{ color: '#D4A574' }}>
              {formatCurrency(bottle.aftermarket_price)}
            </p>
          </div>
        )}

        {/* Collector Value */}
        {bottle.collector_value && (
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(212,175,55,0.7)' }}>
              {t('whiskey.collectorValue')}
            </p>
            <p className="text-lg font-bold" style={{ color: '#D4AF37' }}>
              {formatCurrency(bottle.collector_value)}
            </p>
          </div>
        )}

        {/* Confidence & Last Updated */}
        {(bottle.value_confidence || bottle.value_last_updated) && (
          <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-[rgba(180,140,75,0.15)]">
            {bottle.value_confidence && (
              <Badge style={{ background: getConfidenceColor(bottle.value_confidence), color: getConfidenceTextColor(bottle.value_confidence), border: 'none' }}>
                {t('whiskey.valueConfidence')}: {t(`whiskey.valueConfidence${bottle.value_confidence.charAt(0).toUpperCase() + bottle.value_confidence.slice(1)}`)}
              </Badge>
            )}
            {bottle.value_last_updated && (
              <p style={{ color: 'rgba(180,140,75,0.5)' }}>
                {t('common.lastUpdated')}: {new Date(bottle.value_last_updated).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}