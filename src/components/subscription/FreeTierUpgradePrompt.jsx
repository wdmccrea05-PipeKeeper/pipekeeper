import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

/**
 * Prompt for free tier users to upgrade when hitting limits
 * or when using advanced features
 */
export default function FreeTierUpgradePrompt({
  moduleId = 'pipekeeper',
  title,
  description,
  featureName = null,
  compact = false,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const moduleName = moduleId === 'whiskeykeeper' ? 'WhiskeyKeeper' : 'PipeKeeper';
  const defaultTitle = featureName
    ? `${featureName} is a Premium Feature`
    : `Unlock Unlimited Access to ${moduleName}`;
  const defaultDescription = featureName
    ? `Upgrade to ${moduleName} Pro to use ${featureName} and unlock advanced collection intelligence.`
    : `You've reached the limit on your free tier. Upgrade to ${moduleName} Pro for unlimited storage, advanced analytics, and AI-powered recommendations.`;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-100/10 border border-amber-500/30">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs text-amber-100">
          {t('freeTier.upgradePrompt', 'Upgrade to Pro')}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/Subscription')}
          className="h-6 px-2 text-xs text-amber-400 hover:text-amber-300"
        >
          {t('common.upgrade', 'Upgrade')}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 border" style={{
      background: 'linear-gradient(135deg, rgba(217,119,6,0.08), rgba(180,140,75,0.06))',
      border: '1px solid rgba(217,119,6,0.25)',
    }}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{
          background: 'rgba(217,119,6,0.15)',
          border: '1px solid rgba(217,119,6,0.3)',
        }}>
          <Zap className="w-6 h-6 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-stone-100 mb-1 text-base">
            {title || defaultTitle}
          </h3>
          <p className="text-sm text-stone-400 mb-4 leading-relaxed">
            {description || defaultDescription}
          </p>
          <Button
            onClick={() => navigate('/Subscription')}
            style={{
              background: 'linear-gradient(135deg, rgba(217,119,6,0.9), rgba(180,100,50,0.95))',
              border: '1px solid rgba(217,119,6,0.5)',
              color: '#F5F1E7',
            }}
            className="font-medium gap-2"
          >
            <Zap className="w-4 h-4" />
            {t('common.upgradeNow', 'Upgrade Now')}
          </Button>
        </div>
      </div>
    </div>
  );
}