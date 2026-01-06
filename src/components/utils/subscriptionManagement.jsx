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

export function shouldShowManageSubscription(subscription) {
  // Show only if the user actually has a Stripe customer record
  return Boolean(subscription?.stripe_customer_id);
}

export function getManageSubscriptionLabel() {
  return isCompanionApp() ? "Manage subscription" : "Manage subscription";
}