import { base44 } from "@/api/base44Client";
import { shouldShowPurchaseUI, isIOSCompanion } from "./companion";
import { createPageUrl } from "./createPageUrl";
import { isAppleBuild } from "./appVariant";

/**
 * Apple's subscription management page (allowed as "manage" link).
 * Keep as a single-line literal to avoid syntax errors.
 */
const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

export async function openManageSubscription(onBackupModeOpen) {
  // Apple build OR iOS companion: never open Stripe billing portal
  if (isAppleBuild || isIOSCompanion()) {
    window.open(APPLE_SUBSCRIPTIONS_URL, "_blank", "noopener,noreferrer");
    return;
  }

  // Web/Android: Stripe billing portal
  try {
    const response = await base44.functions.invoke("createCustomerPortalSession", {});
    
    if (!response?.data?.ok) {
      const err = response?.data?.error || "UNKNOWN_ERROR";
      const msg = response?.data?.message || "Failed to create portal session";
      
      // Handle gracefully instead of throwing
      console.error(`[openManageSubscription] Portal error: ${err} - ${msg}`);
      
      // If no customer found, redirect to subscription page
      if (
        err === "NO_STRIPE_CUSTOMER" ||
        msg.toLowerCase().includes("no stripe customer") ||
        msg.toLowerCase().includes("start a subscription")
      ) {
        window.location.href = createPageUrl("Subscription");
        return;
      }
      
      // Portal failed: open backup mode instead
      console.warn("[openManageSubscription] Portal failed, opening backup mode");
      if (onBackupModeOpen) {
        onBackupModeOpen();
      }
      return;
    }
    
    const url = response?.data?.url;
    if (!url) {
      console.error("[openManageSubscription] No portal URL returned");
      // No URL: open backup mode
      if (onBackupModeOpen) {
        onBackupModeOpen();
      }
      return;
    }
    
    window.location.href = url;
  } catch (error) {
    console.error("[openManageSubscription] Unexpected error:", error);
    // Error opening portal: fallback to backup mode
    if (onBackupModeOpen) {
      onBackupModeOpen();
    }
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
    // Import native bridge if available
    try {
      const { startApplePurchaseFlow } = await import("./nativeIAPBridge");
      if (startApplePurchaseFlow) {
        startApplePurchaseFlow("premium");
        return;
      }
    } catch (e) {
      // Fallback to Apple subscriptions page
    }
    window.open(APPLE_SUBSCRIPTIONS_URL, "_blank", "noopener,noreferrer");
    return;
  }

  // Web/Android: Stripe Checkout
  try {
    const interval = billingInterval === "monthly" ? "monthly" : "annual";
    const response = await base44.functions.invoke("createCheckoutSession", { 
      tier: "premium", 
      interval 
    });
    const url = response?.data?.url;

    if (!url) throw new Error("Could not start checkout");

    window.location.href = url;
  } catch (error) {
    console.error("[startSubscriptionCheckout] Error:", error);
    throw new Error(error?.message || "Unable to start subscription checkout");
  }
}