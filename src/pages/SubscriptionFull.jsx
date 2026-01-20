import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PK_THEME } from "@/components/theme/pkTheme";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, Check, X, Calendar, AlertCircle, Crown, 
  Sparkles, Loader2, ArrowLeft
} from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { shouldShowPurchaseUI, getPremiumGateMessage, isIOSCompanion } from "@/components/utils/companion";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { isAppleBuild } from "@/components/utils/appVariant";
import { openAppleSettings } from "@/components/utils/appleIAP";
import { openManageSubscription } from "@/components/utils/subscriptionManagement";

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

  const { 
    user, 
    subscription, 
    isLoading: userDataLoading,
    hasPaid: userHasPaidAccess,
    isInTrial,
    trialDaysRemaining,
    refetch: refetchUserData 
  } = useCurrentUser();

  // Check for success/cancel in URL params + instant sync
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setCheckingSession(true);
      
      // Instant sync on return from checkout
      (async () => {
        try {
          await base44.functions.invoke('syncSubscriptionForMe');
          // Use centralized refetch
          await refetchUserData();
        } catch (error) {
          console.error('Post-checkout sync error:', error);
          // Still refresh even if sync fails - webhook might have worked
          await refetchUserData();
        } finally {
          setCheckingSession(false);
          navigate(createPageUrl('Subscription'), { replace: true });
        }
      })();
    }
  }, [refetchUserData, navigate]);

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate('Subscription', id, data, user?.email),
    onSuccess: () => {
      refetchUserData();
    },
  });

  const trialExpired = !isInTrial && !userHasPaidAccess;
  const hasActiveSubscription = subscription?.status === 'active';
  const subscriptionCanceled = subscription?.cancel_at_period_end;

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
    if (isAppleBuild) {
      // iOS uses Apple IAP instead
      await openAppleSettings();
      return;
    }



    try {
      const response = await base44.functions.invoke('createCheckoutSession', { priceId: selectedPlan });
      
      if (!response || !response.data) {
        throw new Error('No response from checkout service');
      }
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      if (!response.data.url) {
        throw new Error('No checkout URL returned');
      }
      
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to start checkout';
      alert(`Failed to load checkout: ${errorMessage}. Please try again.`);
    }
  };

  const handleCancelSubscription = async () => {
    // Stripe must be the source of truth for cancellations
    try {
      await openManageSubscription();
    } catch (e) {
      console.error("Open portal error:", e);
      alert("Unable to open subscription management. Please try again.");
    }
  };

  const handleReactivateSubscription = async () => {
    // Reactivation also must happen in Stripe
    try {
      await openManageSubscription();
    } catch (e) {
      console.error("Open portal error:", e);
      alert("Unable to open subscription management. Please try again.");
    }
  };

  const handleManageSubscription = async () => {
    try {
      if (isAppleBuild) {
        // Apple-managed subscriptions
        window.location.href = "https://apps.apple.com/account/subscriptions";
        return;
      }

      // Web/Android: Stripe billing portal
      if (!subscription?.stripe_customer_id) {
        alert("No subscription found to manage. Please contact support if you believe this is an error.");
        return;
      }
      
      await openManageSubscription();
    } catch (e) {
      console.error("Manage subscription error:", e);
      alert(`Unable to open subscription management: ${e.message || 'Please try again.'}`);
    }
  };

  return (
    <div className={`min-h-screen ${PK_THEME.pageBg}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <a href={createPageUrl('Profile')}>
          <Button variant="ghost" className={`mb-6 ${PK_THEME.textSubtle} hover:${PK_THEME.textBody}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
        </a>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-3xl font-bold ${PK_THEME.textTitle} mb-2`}>PipeKeeper Premium</h1>
          <p className={PK_THEME.textSubtle}>Unlock the full power of AI-driven pipe and tobacco management</p>
        </div>

        {/* Current Status */}
        <Card className={`mb-8 ${PK_THEME.card}`}>
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
                  <strong>Free Trial:</strong> You have {trialDaysRemaining} days remaining in your 7-day trial. 
                  All premium features are unlocked during this period.
                </AlertDescription>
              </Alert>
            )}

            {userHasPaidAccess && !subscriptionCanceled && (
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
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleManageSubscription} 
                    className="w-full sm:w-auto"
                  >
                    Manage Subscription
                  </Button>
                  <p className="text-sm text-stone-600 leading-snug">
                    Manage, change, or cancel your subscription. Canceling keeps access until the end of the billing period.
                  </p>
                </div>
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
          <Card className={PK_THEME.card}>
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
                  "Brand logo library with custom uploads",
                  "7-day free trial of Premium features for new accounts"
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
          <Card className={PK_THEME.card}>
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
                      "AI photo identification for pipes (stamps, shapes, makers)",
                      "AI web search for auto-filling pipe & blend metadata",
                      "AI market value lookup and automated tracking",
                      "AI measurement calculator from photos",
                      "Bulk CSV import/export for pipes & inventory",
                      "Quick Edit: Batch update multiple items at once",
                      "Advanced PDF exports for inventory/insurance documentation",
                      "Category standardization tools (metadata cleanup)",
                      "Unlimited pipes and inventory items",
                      "Priority customer support",
                    ]
                  : [
                      "AI Expert Tobacconist chat for personalized recommendations",
                      "AI pipe-tobacco pairing matrix with scoring",
                      "AI tobacco matching engine for each pipe",
                      "AI collection optimizer with gap analysis",
                      "AI photo identification for pipes (stamps, shapes, makers)",
                      "AI market value lookup and automated tracking",
                      "AI break-in schedule generator for new pipes",
                      "AI pipe specialization recommendations",
                      "AI measurement calculator from photos",
                      "AI web search for auto-filling pipe & tobacco details",
                      "AI What-If scenario analysis for collection changes",
                      "Bulk CSV import/export for pipes & tobacco",
                      "Quick Edit: Batch update multiple blends at once",
                      "Advanced PDF exports for insurance documentation",
                      "Smoking log with auto inventory reduction",
                      "Pipe rest status tracking with recommendations",
                      "Cellar log with transaction history",
                      "Community: Public profiles, search, follow collections",
                      "Comments on pipes, tobacco, and smoking logs",
                      "Instant messaging with friends (real-time chat)",
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