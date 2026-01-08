import { base44 } from "@/api/base44Client";
import { shouldShowPurchaseUI } from "./companion";
import { isTrialWindow } from "./access";

export async function openManageSubscription() {
  try {
    const response = await base44.functions.invoke('createBillingPortalSession', {});
    const url = response?.data?.url;
    
    if (!url) {
      throw new Error('No portal URL returned');
    }
    
    window.location.href = url;
  } catch (error) {
    console.error('[openManageSubscription] Error:', error);
    // Extract the actual error message from the backend
    const errorMessage = error?.response?.data?.error || error?.message || 'Unable to open subscription management portal';
    throw new Error(errorMessage);
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