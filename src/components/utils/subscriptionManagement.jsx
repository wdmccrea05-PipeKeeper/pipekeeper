import { base44 } from "@/api/base44Client";
import { isCompanionApp } from "./companion";

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
    throw error;
  }
}

export function shouldShowManageSubscription(subscription, user) {
  // Show manage if we can reasonably open the Stripe portal:
  // - user is paid OR Stripe subscription status looks valid
  // - AND we have a Stripe customer id somewhere
  const status = subscription?.status;

  const hasCustomerId =
    !!user?.stripe_customer_id || !!subscription?.stripe_customer_id;

  const looksSubscribed =
    user?.subscription_level === "paid" ||
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "unpaid";

  return hasCustomerId && looksSubscribed;
}

export function getManageSubscriptionLabel() {
  return isCompanionApp() ? "Manage subscription" : "Manage subscription";
}