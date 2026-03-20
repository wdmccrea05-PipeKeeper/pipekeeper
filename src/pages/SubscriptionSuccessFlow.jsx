/**
 * Post-Purchase Success Flow
 * Handles Stripe checkout completion:
 * 1. Shows loading state while syncing subscription
 * 2. Calls syncSubscriptionForMe to rebuild access
 * 3. Shows success UI with confirmed access
 * 4. Routes to correct destination
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePaywall } from '@/components/subscription/usePaywall';
import { useAccessSummary } from '@/components/hooks/useAccessSummary';

export default function SubscriptionSuccessFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completePayment, isLoading } = usePaywall();
  const access = useAccessSummary();
  
  const [status, setStatus] = useState('syncing'); // syncing | success | error
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const targetUrl = searchParams.get('next') || '/CollectionHub';

  useEffect(() => {
    let mounted = true;

    const executePostPurchase = async () => {
      try {
        setStatus('syncing');
        
        // Sync subscription and rebuild access
        await completePayment(targetUrl);
        
        if (mounted) {
          setStatus('success');
        }
      } catch (error) {
        console.error('[SubscriptionSuccessFlow] Post-purchase failed:', error);
        
        if (mounted) {
          if (retryCount < maxRetries) {
            setStatus('error');
          } else {
            setStatus('error');
          }
        }
      }
    };

    executePostPurchase();

    return () => {
      mounted = false;
    };
  }, [completePayment, targetUrl, retryCount]);

  const handleRetry = () => {
    setRetryCount(c => c + 1);
  };

  const handleContinue = () => {
    navigate(targetUrl);
  };

  // Syncing state
  if (status === 'syncing' || isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      >
        <div
          className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 22, 0.95), rgba(28, 20, 16, 0.95))',
            border: '1px solid rgba(120, 90, 65, 0.3)',
          }}
        >
          <div className="flex justify-center mb-6">
            <Loader2
              className="w-12 h-12 animate-spin"
              style={{ color: '#D4A574' }}
            />
          </div>
          
          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: '#F5F1E7' }}
          >
            Activating Your Subscription
          </h2>
          
          <p
            className="text-sm mb-6"
            style={{ color: 'rgba(224, 216, 200, 0.75)' }}
          >
            Just a moment while we set up your new collections...
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      >
        <div
          className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 22, 0.95), rgba(28, 20, 16, 0.95))',
            border: '1px solid rgba(120, 90, 65, 0.3)',
          }}
        >
          <div className="flex justify-center mb-6">
            <CheckCircle2
              className="w-16 h-16"
              style={{ color: '#A0D5A0', filter: 'drop-shadow(0 0 12px rgba(160, 213, 160, 0.3))' }}
            />
          </div>

          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: '#F5F1E7' }}
          >
            You're All Set!
          </h2>

          <p
            className="text-sm mb-2"
            style={{ color: 'rgba(224, 216, 200, 0.75)' }}
          >
            Your subscription is active and your new modules are unlocked.
          </p>
          
          {access?.activeModules && access.activeModules.length > 0 && (
            <p
              className="text-xs mb-6 px-3 py-2 rounded-lg"
              style={{ color: 'rgba(160, 213, 160, 0.9)', background: 'rgba(46, 125, 92, 0.2)' }}
            >
              You now have access to: {access.activeModules.map(m => 
                m.charAt(0).toUpperCase() + m.slice(1)
              ).join(', ')}
            </p>
          )}

          <Button
            onClick={handleContinue}
            className="w-full font-medium"
            style={{
              background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))',
              color: '#F5F1E7',
            }}
          >
            Explore Your Collections
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      >
        <div
          className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 22, 0.95), rgba(28, 20, 16, 0.95))',
            border: '1px solid rgba(120, 90, 65, 0.3)',
          }}
        >
          <div className="flex justify-center mb-6">
            <AlertCircle
              className="w-12 h-12"
              style={{ color: '#D45C5C' }}
            />
          </div>

          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: '#F5F1E7' }}
          >
            Activation in Progress
          </h2>

          <p
            className="text-sm mb-6"
            style={{ color: 'rgba(224, 216, 200, 0.75)' }}
          >
            Your subscription is processing. This may take a moment to appear in your account.
          </p>

          <div className="flex gap-3">
            <Button
              onClick={handleRetry}
              disabled={retryCount >= maxRetries}
              variant="outline"
              className="flex-1"
            >
              {retryCount >= maxRetries ? 'Max Retries' : 'Retry'}
            </Button>
            <Button
              onClick={handleContinue}
              className="flex-1"
              style={{
                background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))',
                color: '#F5F1E7',
              }}
            >
              Continue
            </Button>
          </div>

          <p
            className="text-xs mt-4"
            style={{ color: 'rgba(224, 216, 200, 0.5)' }}
          >
            If your subscription doesn't activate, please contact support.
          </p>
        </div>
      </div>
    );
  }

  return null;
}