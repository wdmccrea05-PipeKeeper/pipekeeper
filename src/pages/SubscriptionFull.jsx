import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, Check, X, Calendar, AlertCircle, Crown, 
  Sparkles, Loader2, ArrowLeft
} from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { shouldShowPurchaseUI, getPremiumGateMessage, isCompanionApp, isIOSCompanion } from "@/components/utils/companion";
import { TRIAL_END_UTC, isTrialWindowNow, hasPaidAccess as checkPaidAccess } from "@/components/utils/access";
import { hasPremiumAccess } from "@/components/utils/premiumAccess";
import { isAppleBuild } from "@/components/utils/appVariant";
import { openAppleSettings } from "@/components/utils/appleIAP";

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

export default function SubscriptionFull() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(PRICING_OPTIONS[1].id); // Default to yearly
  const [checkingSession, setCheckingSession] = useState(false);
  const [trialActive, setTrialActive] = useState(isTrialWindowNow());

  useEffect(() => {
    const interval = setInterval(() => {
      setTrialActive(isTrialWindowNow());
    }, 60 * 1000); // recheck every minute

    return () => clearInterval(interval);
  }, []);

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
        navigate(createPageUrl('Subscription'), { replace: true });
      }, 2000);
    }
  }, [queryClient, user?.email, navigate]);

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate('Subscription', id, data, user?.email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.email] });
    },
  });

  // Calculate trial status using centralized helper
  const isInTrial = trialActive;
  const trialExpired = !trialActive && !checkPaidAccess(user);
  const trialEndMs = Date.parse(TRIAL_END_UTC);
  const daysLeftInTrial = isInTrial
    ? Math.max(0, Math.ceil((trialEndMs - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const trialEndDate = new Date(trialEndMs);

  const hasActiveSubscription = subscription?.status === 'active';
  const subscriptionCanceled = subscription?.cancel_at_period_end;
  const userHasPaidAccess = checkPaidAccess(user);

  // iOS compliance: Block entire subscription page
  if (isIOSCompanion()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] p-6">
        <div className="max-w-2xl mx-auto mt-12">
          <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
            <CardHeader>
              <CardTitle className="text-2xl text-[#e8d5b7]">Premium on Web</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[#e8d5b7]/80 leading-relaxed">
                Premium subscriptions are available on the web. The iOS companion app does not sell or unlock paid digital features.
              </p>
              <p className="text-[#e8d5b7]/80 leading-relaxed">
                Visit{" "}
                <a 
                  href="https://pipekeeper.app/Subscription" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-amber-400 underline hover:text-amber-300"
                >
                  pipekeeper.app
                </a>{" "}
                to subscribe or manage billing.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Android/other companion: show restricted UI
  if (!shouldShowPurchaseUI()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <a href={createPageUrl("Profile")}>
            <Button variant="ghost" className="mb-6 text-[#e8d5b7]/70 hover:text-[#e8d5b7]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </a>

          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <Crown className="w-5 h-5" />
                PipeKeeper Premium
              </CardTitle>
              <CardDescription className="text-stone-600">
                {getPremiumGateMessage()}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-stone-600 space-y-2">
              <p>
                Premium upgrades, purchases, and subscription management are not available in this companion app.
              </p>
              <p>
                If you already have Premium, sign in with the same account and your features will unlock automatically.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubscribe = async () => {
    if (isCompanionApp()) {
      alert('Subscriptions must be managed on the web.');
      return;
    }

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
              {userHasPaidAccess ? (
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
                  <strong>Testing Period:</strong> No charges until after January 15, 2026. 
                  All premium features are free during testing. ({daysLeftInTrial} days remaining)
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
                  "Track dimensions, materials, and basic details",
                  "Manual cellar log for inventory tracking",
                  "Rate and favorite your pipes and tobacco",
                  "View recent additions",
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
                {(isAppleBuild
                  ? [
                      "Photo identification for pipes (stamps, shapes, makers)",
                      "AI web search for auto-filling pipe & blend metadata",
                      "Market value lookup and automated tracking (collection documentation)",
                      "Bulk CSV import/export for pipes & inventory",
                      "Quick Edit: Batch update multiple items at once",
                      "Advanced PDF exports for inventory/insurance documentation",
                      "Category standardization tools (metadata cleanup)",
                      "Brand logo library with custom uploads",
                      "Unlimited pipes and inventory items",
                      "Priority customer support",
                    ]
                  : [
                      "AI Expert Tobacconist chat for personalized recommendations",
                      "AI-powered pipe-tobacco pairing matrix with scoring",
                      "Photo identification for pipes (stamps, shapes, makers)",
                      "Market value lookup and automated tracking",
                      "Collection optimizer with gap analysis",
                      "AI break-in schedule generator for new pipes",
                      "Bulk CSV import/export for pipes & tobacco",
                      "Quick Edit: Batch update multiple blends at once",
                      "Advanced PDF exports for insurance documentation",
                      "Smoking log with auto inventory reduction",
                      "Pipe rest status tracking with recommendations",
                      "Cellar log with transaction history",
                      "Community: Public profiles, search, follow collections",
                      "Comments on pipes, tobacco, and smoking logs",
                      "Instant messaging with friends (real-time chat)",
                      "AI web search for auto-filling pipe & tobacco details",
                      "Brand logo library with custom uploads",
                      "Unlimited pipes and tobacco blends",
                      "Priority customer support",
                    ]
                ).map((feature, idx) => (
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
        {!userHasPaidAccess && (
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


                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}