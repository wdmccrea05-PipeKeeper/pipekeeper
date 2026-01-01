import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, Check, X, Calendar, AlertCircle, Crown, 
  Sparkles, Loader2, ArrowLeft
} from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";

const PRICING_OPTIONS = [
  { 
    id: 'price_1SjqONDycvQWC88PUli0dllA',
    name: 'Monthly',
    price: '$1.99',
    interval: 'month',
    description: 'Billed monthly'
  },
  { 
    id: 'price_1SjqMzDycvQWC88PzxEeD4ov',
    name: 'Yearly',
    price: '$19.99',
    interval: 'year',
    description: 'Billed annually',
    badge: 'Best Value'
  }
];

export default function SubscriptionPage() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState(PRICING_OPTIONS[1].id); // Default to yearly
  const [checkingSession, setCheckingSession] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
    retry: 1,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      try {
        const subs = await base44.entities.Subscription.filter({ user_email: user?.email });
        return Array.isArray(subs) ? subs[0] : null;
      } catch (err) {
        console.error('Subscription load error:', err);
        return null;
      }
    },
    enabled: !!user?.email,
    retry: 1,
    staleTime: 5000,
  });

  // Check for success/cancel in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setCheckingSession(true);
      // Refresh subscription data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['subscription', user?.email] });
        queryClient.invalidateQueries({ queryKey: ['current-user'] });
        setCheckingSession(false);
        window.history.replaceState({}, '', createPageUrl('Subscription'));
      }, 2000);
    }
  }, [queryClient, user?.email]);

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subscription.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.email] });
    },
  });

  // Calculate trial status - extended until Jan 15, 2026
  const EXTENDED_TRIAL_END = new Date('2026-01-15T23:59:59');
  const now = new Date();
  const isBeforeExtendedTrialEnd = now < EXTENDED_TRIAL_END;
  
  const trialEndDate = isBeforeExtendedTrialEnd 
    ? EXTENDED_TRIAL_END 
    : user?.created_date 
      ? new Date(new Date(user.created_date).getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;
  
  const isInTrial = trialEndDate && new Date() < trialEndDate;
  const trialExpired = trialEndDate && new Date() >= trialEndDate;
  const daysLeftInTrial = isInTrial 
    ? Math.ceil((trialEndDate - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  const hasActiveSubscription = subscription?.status === 'active';
  const subscriptionCanceled = subscription?.cancel_at_period_end;

  const handleSubscribe = async () => {
    try {
      const response = await base44.functions.invoke('createCheckoutSession', { priceId: selectedPlan });
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    }
  };

  const handleCancelSubscription = async () => {
    if (subscription && window.confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
      await updateSubscriptionMutation.mutateAsync({
        id: subscription.id,
        data: { cancel_at_period_end: true }
      });
    }
  };

  const handleReactivateSubscription = async () => {
    if (subscription) {
      await updateSubscriptionMutation.mutateAsync({
        id: subscription.id,
        data: { cancel_at_period_end: false }
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <a href={createPageUrl('Profile')}>
          <Button variant="ghost" className="mb-6 text-stone-600 hover:text-stone-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
        </a>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#e8d5b7] mb-2">PipeKeeper Premium</h1>
          <p className="text-stone-600">Unlock the full power of AI-driven pipe and tobacco management</p>
        </div>

        {/* Current Status */}
        <Card className="mb-8 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {hasActiveSubscription ? (
                <>
                  <Check className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-800">Active Subscription</span>
                </>
              ) : isInTrial ? (
                <>
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-800">Free Trial Active</span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-stone-600" />
                  <span className="text-stone-800">No Active Subscription</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInTrial && (
              <Alert className="bg-amber-50 border-amber-200">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  {isBeforeExtendedTrialEnd ? (
                    <>
                      <strong>Testing Period:</strong> No charges until after January 15, 2026. 
                      All premium features are free during testing.
                    </>
                  ) : (
                    <>
                      <strong>{daysLeftInTrial} days left</strong> in your free trial. 
                      Subscribe now to continue enjoying premium features after {new Date(trialEndDate).toLocaleDateString()}.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {hasActiveSubscription && !subscriptionCanceled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div>
                    <p className="font-medium text-emerald-800">Premium Plan</p>
                    <p className="text-sm text-emerald-600">$1.99/month or $19.99/year</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white">Active</Badge>
                </div>
                {subscription?.current_period_end && (
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Calendar className="w-4 h-4" />
                    Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                  </div>
                )}
                <Button 
                  variant="outline" 
                  onClick={handleCancelSubscription}
                  className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  Cancel Subscription
                </Button>
              </div>
            )}

            {subscriptionCanceled && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Your subscription is set to cancel on {new Date(subscription.current_period_end).toLocaleDateString()}. 
                  You'll continue to have access until then.
                  <Button 
                    variant="link" 
                    onClick={handleReactivateSubscription}
                    className="text-amber-700 hover:text-amber-800 p-0 h-auto ml-2"
                  >
                    Reactivate subscription
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {trialExpired && !hasActiveSubscription && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your free trial has ended. Subscribe now to continue using premium features.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Features List */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Free Features */}
          <Card className="border-stone-200 bg-[#243548]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#e8d5b7]">Free Version</CardTitle>
                  <CardDescription className="text-[#e8d5b7]/70">What's included with your free PipeKeeper account</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#e8d5b7]">$0</p>
                  <p className="text-xs text-[#e8d5b7]/70">forever</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  "Manual pipe and tobacco entry",
                  "Organize and browse your collection",
                  "Track basic pipe and tobacco details",
                  "Log smoking sessions manually",
                  "View recent pipes and tobacco",
                  "Basic collection statistics",
                  "7-day free trial of Premium features"
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-[#e8d5b7]">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Premium Features */}
          <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-600" />
                    Premium Version
                  </CardTitle>
                  <CardDescription>Everything you get with PipeKeeper Premium</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-stone-800">$1.99</p>
                  <p className="text-xs text-stone-600">per month</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  "AI Tobacconist chat for expert advice",
                  "AI-powered tobacco pairing recommendations",
                  "Photo identification for pipes and tobacco",
                  "Market value lookup and tracking",
                  "Collection optimization suggestions",
                  "Advanced pairing matrix",
                  "Break-in schedule generator",
                  "Bulk CSV import for pipes & tobacco",
                  "Quick Edit: Update multiple blends at once",
                  "Advanced export & insurance reports (PDF/CSV)",
                  "Auto inventory reduction with smoking logs",
                  "Low inventory alerts & thresholds",
                  "Pipe rest tracking with recommendations",
                  "Community: Share & follow collections",
                  "Instant messaging with friends (real-time chat)",
                  "Unlimited pipes and tobacco blends",
                  "AI web search for auto-fill",
                  "Priority customer support"
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-stone-700">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Form */}
        {!hasActiveSubscription && (
          <Card>
            <CardHeader>
              <CardTitle>Subscribe to Premium</CardTitle>
              <CardDescription>
                Choose your plan and get instant access to all premium features
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkingSession ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-600" />
                  <p className="text-stone-600">Processing your subscription...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4">
                    {PRICING_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedPlan(option.id)}
                        className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                          selectedPlan === option.id
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-stone-800">{option.name}</h3>
                              {option.badge && (
                                <Badge className="bg-amber-600 text-white text-xs">
                                  {option.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-stone-600">{option.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-stone-800">{option.price}</p>
                            <p className="text-xs text-stone-500">per {option.interval}</p>
                          </div>
                        </div>
                        {selectedPlan === option.id && (
                          <div className="absolute top-4 right-4">
                            <Check className="w-5 h-5 text-amber-600" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <Button 
                    onClick={handleSubscribe}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Continue to Checkout
                  </Button>

                  <p className="text-xs text-center text-stone-500">
                    Secure payment powered by Stripe. Cancel anytime.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}