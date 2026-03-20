/**
 * Subscription Success Flow
 * Post-purchase explicit sync and confirmation
 * 3-phase: loading → success → error
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader } from 'lucide-react';

export default function SubscriptionSuccessFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState('loading'); // loading | success | error
  const [error, setError] = useState(null);
  const [accessSummary, setAccessSummary] = useState(null);

  const targetUrl = searchParams.get('next') || '/CollectionHub';

  useEffect(() => {
    let mounted = true;

    async function syncAndConfirm() {
      try {
        // Call sync function
        const response = await base44.functions.invoke('syncSubscriptionForMe', {});

        if (!mounted) return;

        // Check response
        if (response?.data?.status === 'no_subscription') {
          setError('Subscription not found. This may take a moment. Please try again.');
          setPhase('error');
          return;
        }

        if (response?.data?.error) {
          setError(response.data.error);
          setPhase('error');
          return;
        }

        // Success
        setAccessSummary(response?.data);
        
        // Rebuild access queries
        await queryClient.invalidateQueries({ queryKey: ['current-user'] });
        await queryClient.invalidateQueries({ queryKey: ['subscription'] });

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
            <Button
              onClick={() => navigate(targetUrl)}
              className="flex-1"
            >
              Continue Anyway
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success
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
          Your subscription is now active.
        </p>

        {modules.length > 0 && (
          <div className="mb-8">
            <p style={{ color: '#8b6239' }} className="text-xs font-semibold uppercase tracking-wider mb-3">
              You Now Have Access To
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
                  {m.charAt(0).toUpperCase() + m.slice(1).replace('keeper', ' Keeper')}
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