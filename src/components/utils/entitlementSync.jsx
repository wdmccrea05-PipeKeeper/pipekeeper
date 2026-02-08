import { base44 } from "@/api/base44Client";

/**
 * Trigger entitlement resync for current user
 * Attempts multiple sync strategies to find and persist subscription
 */
export async function triggerEntitlementResync() {
  console.log("[ENTITLEMENT_SYNC] Starting resync...");

  try {
    // Step 1: Invoke reconciliation function with debug enabled
    const reconcileRes = await base44.functions.invoke('reconcileEntitlementsForUser', {
      debug: true
    });

    console.log("[ENTITLEMENT_SYNC] Reconciliation response:", reconcileRes.data);

    if (!reconcileRes.data?.ok) {
      console.warn("[ENTITLEMENT_SYNC] Reconciliation failed:", reconcileRes.data?.error);
      throw new Error(reconcileRes.data?.error || "Reconciliation failed");
    }

    // Step 2: Get debug info on effective entitlement
    const debugRes = await base44.functions.invoke('getEffectiveEntitlementDebug', {});
    console.log("[ENTITLEMENT_SYNC] Debug info:", debugRes.data);

    if (debugRes.data?.effectiveTier) {
      console.log("[ENTITLEMENT_SYNC] SUCCESS - tier is now:", debugRes.data.effectiveTier);
      return {
        success: true,
        tier: debugRes.data.effectiveTier,
        source: debugRes.data.source,
        details: debugRes.data
      };
    } else {
      console.warn("[ENTITLEMENT_SYNC] No effective tier found after sync");
      return {
        success: false,
        tier: "free",
        details: debugRes.data
      };
    }
  } catch (error) {
    console.error("[ENTITLEMENT_SYNC] Error:", error);
    throw error;
  }
}

/**
 * Force entitlement check for a specific email (admin only)
 */
export async function adminCheckEntitlement(email) {
  try {
    console.log("[ENTITLEMENT_ADMIN_CHECK] Checking:", email);

    const res = await base44.functions.invoke('reconcileEntitlementsForUser', {
      email,
      debug: true
    });

    console.log("[ENTITLEMENT_ADMIN_CHECK] Result:", res.data);
    return res.data;
  } catch (error) {
    console.error("[ENTITLEMENT_ADMIN_CHECK] Error:", error);
    throw error;
  }
}