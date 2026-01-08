import { base44 } from "@/api/base44Client";
import { shouldShowPurchaseUI } from "./companion";
import { isTrialWindow } from "./access";

export async function openManageSubscription() {
  try {
    const response = await base44.functions.invoke('createBillingPortalSession', {});
    if (response.data?.url) {
      window.location.href = response.data.url;
    } else {
      throw new Error('No portal URL returned');
    }
  } catch (error) {
    console.error('Failed to open billing portal:', error);
    // Extract the actual error message from the response
    const errorMessage = error?.response?.data?.error || error?.message || 'Failed to open billing portal';
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