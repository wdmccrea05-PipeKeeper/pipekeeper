// src/components/utils/subscriptionManagement.jsx
import { base44 } from "@/api/base44Client";
import { shouldShowPurchaseUI, isIOSCompanion } from "./companion";
import { createPageUrl } from "./createPageUrl";
import { isAppleBuild } from "./appVariant";

/**
 * Apple’s subscription management page (allowed as “manage” link).
 * Keep as a single-line literal to avoid syntax errors.
 */
const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

export async function openManageSubscription() {
  // Apple build OR iOS companion: never open Stripe billing portal
  if (isAppleBuild || isIOSCompanion()) {
    window.open(APPLE_SUBSCRIPTIONS_URL, "_blank", "noopener,noreferrer");
    return;
  }

  // Web/Android: Stripe billing portal
  try {
    const response = await base44.functions.invoke("createBillingPortalSession", {});
    const url = response?.data?.url;

    if (!url) throw new Error("No portal URL returned");
    window.location.href = url;
  } catch (error) {
    console.error("[openManageSubscription] Error:", error);

    const errorMessage =
      error?.response?.data?.error ||
      error?.message ||
      "";

    // If customer not found, route to Subscription page so they can start checkout
    if (
      errorMessage.toLowerCase().includes("no stripe customer") ||
      errorMessage.toLowerCase().includes("start a subscription")
    ) {
      window.location.href = createPageUrl("Subscription");
      return;
    }

    throw new Error(errorMessage || "Unable to open subscription management portal");
  }
}

export function shouldShowManageSubscription(subscription, user) {
  // iOS companion: do not show Stripe/portal UI
  if (!shouldShowPurchaseUI()) return false;

  // If paid, show manage. If we have a Stripe customer id, show manage.
  const level = (user?.subscription_level || "").toLowerCase();
  const status = (user?.subscription_status || "").toLowerCase();
  const isPaid = level === "paid" || status === "active";

  const hasCustomerId = !!(user?.stripe_customer_id || subscription?.stripe_customer_id);

  return isPaid || hasCustomerId;
}

export function getManageSubscriptionLabel() {
  return "Manage subscription";
}

export async function startSubscriptionCheckout(billingInterval) {
  // Apple build or iOS companion: purchases must be IAP (native)
  if (isAppleBuild || isIOSCompanion()) {
    // You can replace this later with a native bridge trigger.
    window.open(APPLE_SUBSCRIPTIONS_URL, "_blank", "noopener,noreferrer");
    return;
  }

  // Web/Android: Stripe Checkout
  try {
    const response = await base44.functions.invoke("createCheckoutSession", { billingInterval });
    const url = response?.data?.url;

    if (!url) throw new Error("Could not start checkout");

    window.location.href = url;
  } catch (error) {
    console.error("[startSubscriptionCheckout] Error:", error);
    throw new Error(error?.message || "Unable to start subscription checkout");
  }
}