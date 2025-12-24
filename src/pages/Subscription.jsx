import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { 
  CreditCard, Check, X, Calendar, AlertCircle, Crown, 
  Sparkles, Loader2, ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Initialize Stripe - Replace with your actual publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

function CheckoutForm({ trialEndDate, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        setError(stripeError.message);
        setLoading(false);
        return;
      }

      // In a real implementation, you would:
      // 1. Send payment method to your backend
      // 2. Create Stripe subscription with 7-day trial
      // 3. Store subscription details in database
      
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1500));
      onSuccess(paymentMethod.id);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg bg-white">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button 
        type="submit" 
        disabled={!stripe || loading}
        className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Subscribe Now
          </>
        )}
      </Button>

      <p className="text-xs text-center text-stone-500">
        Your trial ends on {new Date(trialEndDate).toLocaleDateString()}. 
        You won't be charged until then.
      </p>
    </form>
  );
}

export default function SubscriptionPage() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: user?.email });
      return subs[0];
    },
    enabled: !!user?.email,
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: (data) => base44.entities.Subscription.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.email] });
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subscription.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.email] });
    },
  });

  // Calculate trial status
  const trialEndDate = user?.created_date 
    ? new Date(new Date(user.created_date).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  
  const isInTrial = trialEndDate && new Date() < trialEndDate;
  const trialExpired = trialEndDate && new Date() >= trialEndDate;
  const daysLeftInTrial = isInTrial 
    ? Math.ceil((trialEndDate - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  const hasActiveSubscription = subscription?.status === 'active';
  const subscriptionCanceled = subscription?.cancel_at_period_end;

  const handleSubscribe = async (paymentMethodId) => {
    if (subscription) {
      await updateSubscriptionMutation.mutateAsync({
        id: subscription.id,
        data: {
          status: 'active',
          stripe_subscription_id: `sub_${paymentMethodId}`,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        }
      });
    } else {
      await createSubscriptionMutation.mutateAsync({
        user_email: user.email,
        status: 'active',
        trial_end_date: trialEndDate?.toISOString(),
        stripe_subscription_id: `sub_${paymentMethodId}`,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 19.99
      });
    }

    // Update user subscription level
    await base44.auth.updateMe({ subscription_level: 'paid' });
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
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
        <Link to={createPageUrl('Profile')}>
          <Button variant="ghost" className="mb-6 text-stone-600 hover:text-stone-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
        </Link>

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
                  <strong>{daysLeftInTrial} days left</strong> in your free trial. 
                  Subscribe now to continue enjoying premium features after {new Date(trialEndDate).toLocaleDateString()}.
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
              <CardTitle className="text-[#e8d5b7]">Free Features</CardTitle>
              <CardDescription className="text-[#e8d5b7]/70">What's included with your free PipeKeeper account</CardDescription>
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
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                Premium Features
              </CardTitle>
              <CardDescription>Everything you get with PipeKeeper Premium</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  "AI-powered tobacco pairing recommendations",
                  "Photo identification for pipes and tobacco",
                  "Market value lookup and tracking",
                  "Collection optimization suggestions",
                  "Advanced pairing matrix",
                  "Break-in schedule generator",
                  "Bulk CSV import for pipes & tobacco",
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
                $1.99/month or $19.99/year • Automatic renewal until cancelled
                {isInTrial && ` • Trial until ${new Date(trialEndDate).toLocaleDateString()}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise}>
                <CheckoutForm 
                  trialEndDate={trialEndDate}
                  onSuccess={handleSubscribe}
                />
              </Elements>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}