import { base44 } from "@/api/base44Client";
import { isCompanionApp } from "./companion";

export async function openManageSubscription() {
  try {
    const response = await base44.functions.invoke('createBillingPortalSession', {});
    if (response.data?.url) {
      window.open(response.data.url, '_blank', 'noopener,noreferrer');
    } else {
      throw new Error('No portal URL returned');
    }
  } catch (error) {
    console.error('Failed to open billing portal:', error);
    throw error;
  }
}

export function shouldShowManageSubscription(subscription, user) {
  const hasCustomerId =
    (user && user.stripe_customer_id) ||
    (subscription && subscription.stripe_customer_id);

  const isPaid = user && user.subscription_level === 'paid';

  // show if paid + we have portal access
  return !!(isPaid && hasCustomerId);
}

export function getManageSubscriptionLabel() {
  return isCompanionApp() ? "Manage subscription" : "Manage subscription";
}