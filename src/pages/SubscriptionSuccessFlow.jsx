/**
 * Subscription Success Flow
 * Validates subscription activation for any module (not PipeKeeper-specific)
 * and fails safely with a hard timeout instead of spinning forever.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { buildAccessSummary } from '@/components/access/accessSummary';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { parseSubscriptionCallbackError } from '@/lib/billing/subscriptionCallbackErrors';

const SYNC_TIMEOUT_MS = 20000;
const MODULE_PAGE = {
  pipekeeper: '/Pipes',
  whiskeykeeper: '/Whiskey',
  cigarkeeper: '/Tobacco',
};

function toDisplayName(moduleKey) {
  if (!moduleKey) return 'Module';
  return moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1).replace('keeper', ' Keeper');
}

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export default function SubscriptionSuccessFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const moduleDisplayName = (moduleKey) => {
    if (!moduleKey) return t('subscription.moduleFallback');
    const translated = t(`modules.${moduleKey}`);
    return translated === `modules.${moduleKey}` ? toDisplayName(moduleKey) : translated;
  };

  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState(null);
  const [accessSummary, setAccessSummary] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const targetUrl = searchParams.get('next') || '/CollectionHub';

  useEffect(() => {
    let mounted = true;

    async function syncAndConfirm() {
      try {
        const callbackError = parseSubscriptionCallbackError(searchParams);
        if (callbackError) {
          throw new Error(callbackError);
        }

        setPhase('loading');
        setError(null);

        const result = await withTimeout(
          (async () => {
            const syncResponse = await base44.functions.invoke('syncSubscriptionForMe', {});
            if (!mounted) return null;

            if (
              syncResponse?.data?.status === 'no_subscription' ||
              syncResponse?.data?.status === 'no_customer'
            ) {
              throw new Error(t('subscription.syncNoSubscriptionYet'));
            }

            if (syncResponse?.data?.error) {
              throw new Error(syncResponse.data.error);
            }

            await queryClient.invalidateQueries({ queryKey: ['current-user'] });
            await queryClient.invalidateQueries({ queryKey: ['subscription'] });
            await queryClient.refetchQueries({ queryKey: ['current-user'] });
            await queryClient.refetchQueries({ queryKey: ['subscription'] });

            const [meRes, subRes] = await Promise.all([
              base44.auth.me(),
              base44.functions.invoke('getMySubscriptionSummary', {}),
            ]);

            const me = meRes || null;
            const subscriptionSummary = subRes?.data || null;
            const summaryModulesCsv =
              subscriptionSummary?.effectiveModulesCsv ||
              subscriptionSummary?.modulesCsv ||
              '';

            const pseudoSubscription = subscriptionSummary
              ? {
                  provider: subscriptionSummary.provider,
                  status: subscriptionSummary.status,
                  tier: subscriptionSummary.tier,
                  current_period_end: subscriptionSummary.expiresAt,
                  plan_key: subscriptionSummary.planKey,
                  modules_csv: summaryModulesCsv,
                  metadata: summaryModulesCsv
                    ? { modules_csv: summaryModulesCsv }
                    : undefined,
                }
              : null;

            const rebuiltAccess = buildAccessSummary(me, pseudoSubscription);
            const unlockedModules = rebuiltAccess?.activeModules || [];
            // Consider it a success if tier is 'pro' — payment was confirmed.
            // Some modules may be release-gated (internal/blocked) so activeModules
            // could be empty even with a valid subscription; don't error in that case.
            const hasPaidTier = rebuiltAccess?.tier === 'pro';

            if (!hasPaidTier) {
                throw new Error(
                  t('subscription.syncAccessUpdating')
                );
              }

            return {
              ...rebuiltAccess,
              activeModules: unlockedModules,
              planKey: subscriptionSummary?.planKey || null,
              manageUrl: subscriptionSummary?.manageUrl || null,
              expiresAt: subscriptionSummary?.expiresAt || null,
            };
          })(),
          SYNC_TIMEOUT_MS,
          t('subscription.syncTimeout')
        );

        if (!mounted || !result) return;

        setAccessSummary(result);
        setPhase('success');
      } catch (err) {
        if (!mounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : t('subscription.syncFailed');
        setError(msg);
        setPhase('error');
        console.error('[SubscriptionSuccessFlow] Sync failed:', err);
      }
    }

    syncAndConfirm();

    return () => {
      mounted = false;
    };
  }, [queryClient, attempt, searchParams]);

  const modules = accessSummary?.activeModules || [];
  const primaryModule = modules[0] || null;
  const unlockedMessage = useMemo(() => {
    const planKey = String(accessSummary?.planKey || '');
    if (planKey.startsWith('three_module_bundle')) {
      return t('subscription.unlockedThreeBundle');
    }
    if (planKey.startsWith('founders_bundle')) {
      return t('subscription.unlockedFoundersBundle');
    }
    if (modules.length === 1) {
      return t('subscription.unlockedSingleModule', { module: moduleDisplayName(modules[0]) });
    }
    if (modules.length > 1) {
      return t('subscription.unlockedSelectedModules');
    }
    return t('subscription.purchaseConfirmedUpdating');
  }, [accessSummary?.planKey, modules, t]);

  const nextActions = useMemo(() => {
    const actions = [];
    if (primaryModule && MODULE_PAGE[primaryModule]) {
      actions.push({
        label: t('subscription.openModuleAction', { module: moduleDisplayName(primaryModule) }),
        onClick: () => navigate(MODULE_PAGE[primaryModule]),
      });
    }

    actions.push(
      {
        label: t('subscription.importRecordsAction'),
        onClick: () => navigate('/Import'),
      },
      {
        label: t('subscription.startCollectionAction'),
        onClick: () => navigate('/CollectionHub'),
      }
    );

    return actions.slice(0, 3);
  }, [moduleDisplayName, navigate, primaryModule, t]);

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0b08] via-[#1a1410] to-[#0f0b08]">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#D4A574' }} />
          <p style={{ color: '#E0D8C8' }}>{t('subscription.activating')}</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0b08] via-[#1a1410] to-[#0f0b08] p-4">
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 22, 0.95), rgba(28, 20, 16, 0.95))',
            border: '1px solid rgba(212, 165, 116, 0.3)',
          }}
        >
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#D45C5C' }} />
          <h2 style={{ color: '#F5F1E7' }} className="text-2xl font-bold mb-2">
            {t('subscription.activationDelayedTitle')}
          </h2>
          <p style={{ color: '#E0D8C8', marginBottom: '24px' }} className="text-sm mb-6">
            {error || t('subscription.activationDelayedBody')}
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setAttempt((prev) => prev + 1)}
              className="flex-1"
            >
              {t('common.retry')}
            </Button>
            <Button onClick={() => navigate(targetUrl)} className="flex-1">
              {t('subscription.continueAnyway')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0b08] via-[#1a1410] to-[#0f0b08] p-4">
      <div
        className="max-w-md w-full rounded-2xl p-8 text-center shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 22, 0.95), rgba(28, 20, 16, 0.95))',
          border: '1px solid rgba(180, 140, 75, 0.3)',
        }}
      >
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: '#2e7d5c' }} />

        <h1 style={{ color: '#F5F1E7' }} className="text-3xl font-bold mb-2">
          {t('subscription.welcome')}
        </h1>

        <p style={{ color: '#E0D8C8' }} className="text-sm mb-6">
          {t('subscription.nowActive')}
        </p>

        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={{ background: 'rgba(180, 140, 75, 0.14)', color: '#EADBC0', border: '1px solid rgba(180, 140, 75, 0.3)' }}
        >
          {unlockedMessage}
        </div>

        {modules.length > 0 && (
          <div className="mb-8">
            <p
              style={{ color: '#8b6239' }}
              className="text-xs font-semibold uppercase tracking-wider mb-3"
            >
              {t('subscription.activeAccess')}
            </p>
            <div className="space-y-2">
              {modules.map((m) => (
                <div
                  key={m}
                  className="px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    background: 'rgba(180, 140, 75, 0.15)',
                    color: '#D4A574',
                  }}
                >
                  {moduleDisplayName(m)}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={() => navigate(targetUrl)}
          className="w-full"
          style={{
            background: 'linear-gradient(135deg, #a35c5c, #8f4e4e)',
            color: '#F5F1E7',
          }}
        >
          {t('subscription.exploreCollections')}
        </Button>

        <div className="mt-3 grid grid-cols-1 gap-2">
          {nextActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="w-full"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
