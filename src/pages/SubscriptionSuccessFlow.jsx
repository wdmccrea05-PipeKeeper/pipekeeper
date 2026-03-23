/**
 * Subscription Success Flow
 * Hotfix goals:
 * - do not treat a non-error sync as sufficient proof of unlock
 * - explicitly verify current user entitlements and active modules after sync
 * - prefer deterministic PipeKeeper unlock confirmation in the current release
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { buildAccessSummary } from '@/components/access/accessSummary';

function toDisplayName(moduleKey) {
  if (!moduleKey) return 'Module';
  return moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1).replace('keeper', ' Keeper');
}

export default function SubscriptionSuccessFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState(null);
  const [accessSummary, setAccessSummary] = useState(null);

  const targetUrl = searchParams.get('next') || '/CollectionHub';

  useEffect(() => {
    let mounted = true;

    async function syncAndConfirm() {
      try {
        const syncResponse = await base44.functions.invoke('syncSubscriptionForMe', {});
        if (!mounted) return;

        if (syncResponse?.data?.status === 'no_subscription' || syncResponse?.data?.status === 'no_customer') {
          setError('Subscription not found yet. Please wait a moment and try again.');
          setPhase('error');
          return;
        }

        if (syncResponse?.data?.error) {
          setError(syncResponse.data.error);
          setPhase('error');
          return;
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

        const pseudoSubscription = subscriptionSummary
          ? {
              provider: subscriptionSummary.provider,
              status: subscriptionSummary.status,
              tier: subscriptionSummary.tier,
              current_period_end: subscriptionSummary.expiresAt,
              plan_key: subscriptionSummary.planKey,
              modules_csv: subscriptionSummary.modulesCsv,
              metadata: subscriptionSummary.modulesCsv
                ? { modules_csv: subscriptionSummary.modulesCsv }
                : undefined,
            }
          : null;

        const rebuiltAccess = buildAccessSummary(me, pseudoSubscription);
        const unlockedModules = rebuiltAccess?.activeModules || [];
        const hasPipeKeeper = rebuiltAccess?.tier === 'pro' && unlockedModules.includes('pipekeeper');

        if (!hasPipeKeeper) {
          setError('Your payment was received, but access is still updating. Please retry once or reopen the app in a moment.');
          setPhase('error');
          return;
        }

        setAccessSummary({
          ...rebuiltAccess,
          activeModules: unlockedModules,
          manageUrl: subscriptionSummary?.manageUrl || null,
          expiresAt: subscriptionSummary?.expiresAt || null,
        });
        setPhase('success');
      } catch (err) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : 'Subscription activation failed';
        setError(msg);
        setPhase('error');
        console.error('[SubscriptionSuccessFlow] Sync failed:', err);
      }
    }

    syncAndConfirm();
    return () => {
      mounted = false;
    };
  }, [queryClient]);

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0b08] via-[#1a1410] to-[#0f0b08]">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#D4A574' }} />
          <p style={{ color: '#E0D8C8' }}>Activating your subscription...</p>
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
            Activation Taking Longer
          </h2>
          <p style={{ color: '#E0D8C8', marginBottom: '24px' }} className="text-sm mb-6">
            {error || 'Please try again or contact support if the issue persists.'}
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setPhase('loading');
                window.location.reload();
              }}
              className="flex-1"
            >
              Retry
            </Button>
            <Button onClick={() => navigate(targetUrl)} className="flex-1">
              Continue Anyway
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const modules = accessSummary?.activeModules || [];

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
          Welcome!
        </h1>

        <p style={{ color: '#E0D8C8' }} className="text-sm mb-6">
          Your subscription is now active and PipeKeeper has been unlocked.
        </p>

        {modules.length > 0 && (
          <div className="mb-8">
            <p style={{ color: '#8b6239' }} className="text-xs font-semibold uppercase tracking-wider mb-3">
              Active Access
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
                  {toDisplayName(m)}
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
          Explore Collections
        </Button>
      </div>
    </div>
  );
}
