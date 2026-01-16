import { base44 } from "@/api/base44Client";
import { shouldShowPurchaseUI, isIOSCompanion } from "./companion";
import { isTrialWindow } from "./access";
import { createPageUrl } from "./createPageUrl";

export async function openManageSubscription() {
  try {
    // iOS compliance: Include platform parameter for iOS detection
    const params = isIOSCompanion() ? { platform: 'ios' } : {};
    const response = await base44.functions.invoke('createBillingPortalSession', params);
    const url = response?.data?.url;
    
    if (!url) {
      throw new Error('No portal URL returned');
    }
    
    window.location.href = url;
  } catch (error) {
    console.error('[openManageSubscription] Error:', error);
    
    // Check if the error is about no Stripe customer found
    const errorMessage = error?.response?.data?.error || error?.message || '';
    
    if (errorMessage.includes('No Stripe customer') || errorMessage.includes('Please start a subscription')) {
      // Redirect to subscription page where they can create a subscription
      window.location.href = createPageUrl('Subscription');
      return;
    }
    
    // For other errors, throw them
    throw new Error(errorMessage || 'Unable to open subscription management portal');
  }
}

export function shouldShowManageSubscription(subscription, user) {
  // If this is a companion app (iOS/Android), NEVER show manage link (compliance requirement)
  if (!shouldShowPurchaseUI()) return false;

  const isPaid = user?.subscription_level === "paid";
  const inTrial = isTrialWindow?.() === true;

  // If the client can see customerId, great, but don't require it to show the button
  const hasCustomerId = !!(user?.stripe_customer_id || subscription?.stripe_customer_id);

  // If user has premium access (paid OR trial), show button so they can subscribe/manage.
  // Also show if we have a customerId (legacy / edge cases).
  return isPaid || inTrial || hasCustomerId;
}

export function getManageSubscriptionLabel() {
  return "Manage subscription";
}