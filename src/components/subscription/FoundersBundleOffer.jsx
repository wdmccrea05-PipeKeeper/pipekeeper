import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Loader } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNavigate } from '@/components/utils/navigation';
import { createPageUrl } from '@/components/utils/createPageUrl';

/**
 * Founders Bundle Offer - visible only to eligible users
 * PipeKeeper + WhiskeyKeeper for $49.99/year ($4.16/month)
 */
export default function FoundersBundleOffer({ onSuccess }) {
  const navigate = useNavigate();
  const [eligible, setEligible] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  useEffect(() => {
    checkEligibility();
  }, []);

  async function checkEligibility() {
    setCheckingEligibility(true);
    try {
      const result = await base44.functions.invoke('checkFoundersEligibility', {});
      setEligible(result?.data?.isEligible || false);
    } catch (e) {
      console.error('Eligibility check failed:', e);
      setEligible(false);
    } finally {
      setCheckingEligibility(false);
    }
  }

  async function handlePurchase(interval = 'year') {
    setLoading(true);
    try {
      const result = await base44.functions.invoke('createFoundersCheckoutSession', {
        billingInterval: interval,
      });

      if (result?.data?.url) {
        const opened = window.open(result.data.url, "_blank", "noopener,noreferrer");
        if (!opened || opened?.closed) {
          toast.error("Unable to open checkout here. Please try again from the Subscription page.");
          navigate(createPageUrl("Subscription"));
        }
      }
    } catch (e) {
      console.error('Checkout error:', e);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingEligibility) {
    return (
      <div className="p-6 rounded-2xl" style={{
        background: 'linear-gradient(145deg, rgba(50,35,25,0.6), rgba(30,20,15,0.8))',
        border: '1px solid rgba(120,90,65,0.25)',
      }}>
        <div className="flex items-center justify-center gap-2">
          <Loader className="w-4 h-4 animate-spin" style={{ color: 'rgba(180,140,75,0.6)' }} />
          <span style={{ color: 'rgba(224,216,200,0.5)' }}>Checking offer eligibility...</span>
        </div>
      </div>
    );
  }

  if (!eligible) {
    return null;
  }

  return (
    <div
      className="rounded-2xl p-6 border overflow-hidden relative"
      style={{
        background: 'linear-gradient(145deg, rgba(139,58,58,0.15), rgba(109,46,46,0.25))',
        border: '1px solid rgba(212, 175, 116, 0.3)',
        boxShadow: '0 0 20px rgba(212,175,116,0.1)',
      }}
    >
      {/* Crown badge */}
      <div className="absolute top-4 right-4">
        <Crown className="w-5 h-5" style={{ color: '#D4AF37' }} />
      </div>

      <div className="space-y-4 max-w-2xl">
        <div>
          <h3 className="text-xl font-bold mb-2" style={{ color: '#F5F1E7', fontFamily: 'Georgia, serif' }}>
            Founders Bundle Exclusive
          </h3>
          <p className="text-sm" style={{ color: 'rgba(224,216,200,0.8)' }}>
            As an early PipeKeeper supporter, unlock the complete collector's suite at a special founding member price.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="flex gap-2">
            <div style={{ color: '#D4AF37' }}>✓</div>
            <div className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>
              <div style={{ color: '#F5F1E7' }} className="font-semibold">PipeKeeper</div>
              <div style={{ color: 'rgba(180,140,75,0.6)' }}>Full pipe collection</div>
            </div>
          </div>
          <div className="flex gap-2">
            <div style={{ color: '#D4AF37' }}>✓</div>
            <div className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>
              <div style={{ color: '#F5F1E7' }} className="font-semibold">WhiskeyKeeper</div>
              <div style={{ color: 'rgba(180,140,75,0.6)' }}>Bottle inventory & AI valuation</div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-black/20 rounded-lg p-4 space-y-2">
          <div className="text-sm" style={{ color: 'rgba(180,140,75,0.6)' }}>
            Limited-time founding member pricing
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold" style={{ color: '#D4AF37' }}>
              $49.99
            </span>
            <span style={{ color: 'rgba(224,216,200,0.5)' }}>per year</span>
          </div>
          <div className="text-xs" style={{ color: 'rgba(180,140,75,0.6)' }}>
            Save $30/year vs. buying modules separately
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => handlePurchase('year')}
            disabled={loading}
            className="flex-1"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,116,0.9), rgba(180,140,75,1))',
              border: 'none',
              color: '#0f0b08',
            }}
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Crown className="w-4 h-4 mr-2" />
                Claim Founders Bundle
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-center" style={{ color: 'rgba(180,140,75,0.5)' }}>
          Offer limited to founding members. Secure your spot today.
        </div>
      </div>
    </div>
  );
}