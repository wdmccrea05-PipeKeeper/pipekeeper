// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { getStripeClient, safeStripeError } from "./stripe.ts";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

function isActiveStatus(status: string): boolean {
  const activeStatuses = ["active", "trialing", "trial"];
  return activeStatuses.includes((status || "").toLowerCase());
}

function getTierPriority(tier: string): number {
  const t = (tier || "").toLowerCase();
  if (t === "pro") return 3;
  if (t === "premium") return 2;
  return 1;
}

export interface ReconcileResult {
  finalTier: string;
  finalLevel: string;
  finalStatus: string;
  stripeCustomerId: string | null;
  providerUsed: string;
  changed: boolean;
}

export async function reconcileUserEntitlements(
  base44: any,
  user: any,
  options: { forceStripeCheck?: boolean; req?: any } = {}
): Promise<ReconcileResult> {
  const email = normEmail(user.email);
  
  console.log(`[reconcileUserEntitlements] Start: ${email}, forceStripeCheck=${options.forceStripeCheck}`);
  
  let currentTier = user.subscription_tier || "free";
  let currentLevel = user.subscription_level || "free";
  let currentStatus = user.subscription_status || "";
  let stripeCustomerId = user.stripe_customer_id || null;

  const wasEverPaid = currentLevel === "paid" || 
                      currentTier === "premium" || 
                      currentTier === "pro" ||
                      isActiveStatus(currentStatus);

  let stripeTier = null;
  let stripeStatus = null;
  let appleTier = null;
  let appleStatus = null;

  // === STRIPE RECOVERY ===
  const needsStripeRecovery = options.forceStripeCheck || 
                               !stripeCustomerId || 
                               !currentTier || 
                               currentTier === "free" ||
                               !isActiveStatus(currentStatus);

  if (needsStripeRecovery) {
    try {
      const { stripe } = await getStripeClient(options.req);
      
      let customer = null;
      try {
        const searchResults = await stripe.customers.search({
          query: `email:'${email}'`,
          limit: 1,
        });
        customer = searchResults.data?.[0];
      } catch {
        const customers = await stripe.customers.list({ email, limit: 1 });
        customer = customers.data?.[0];
      }

      if (customer?.id) {
        stripeCustomerId = customer.id;

        const subsResponse = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 10,
          expand: ["data.items.data.price"],
        });

        if (subsResponse.data?.length > 0) {
          const activeSub = subsResponse.data.find((s: any) => 
            s.status === "active" || s.status === "trialing"
          );
          const bestSub = activeSub || subsResponse.data[0];

          stripeStatus = bestSub.status;

          const priceId = bestSub.items?.data?.[0]?.price?.id;
          const proMonthly = Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY");
          const proAnnual = Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL");

          if (priceId === proMonthly || priceId === proAnnual) {
            stripeTier = "pro";
          } else if (isActiveStatus(bestSub.status)) {
            stripeTier = "premium";
          }
        }
      }
    } catch (e: any) {
      console.warn("[reconcileUserEntitlements] Stripe recovery failed:", safeStripeError(e));
    }
  } else {
    if (isActiveStatus(currentStatus)) {
      stripeTier = currentTier;
      stripeStatus = currentStatus;
    }
  }

  // === APPLE CHECK ===
  try {
    const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: email,
      provider: "apple",
    });

    if (Array.isArray(appleSubs) && appleSubs.length > 0) {
      const activeSub = appleSubs.find((s: any) => s && isActiveStatus(s.status));
      const bestSub = activeSub || appleSubs[0];

      if (bestSub) {
        appleStatus = bestSub.status;
        if (isActiveStatus(bestSub.status)) {
          appleTier = bestSub.tier || "premium";
        }
      }
    }
  } catch (e: any) {
    console.warn("[reconcileUserEntitlements] Apple check failed:", e);
  }

  // === RESOLVE FINAL TIER ===
  let finalTier = "free";
  let finalStatus = "";
  let providerUsed = "none";

  const stripeActive = stripeTier && isActiveStatus(stripeStatus);
  const appleActive = appleTier && isActiveStatus(appleStatus);

  if (stripeActive && appleActive) {
    if (getTierPriority(stripeTier) >= getTierPriority(appleTier)) {
      finalTier = stripeTier;
      finalStatus = stripeStatus;
      providerUsed = "stripe";
    } else {
      finalTier = appleTier;
      finalStatus = appleStatus;
      providerUsed = "apple";
    }
  } else if (stripeActive) {
    finalTier = stripeTier;
    finalStatus = stripeStatus;
    providerUsed = "stripe";
  } else if (appleActive) {
    finalTier = appleTier;
    finalStatus = appleStatus;
    providerUsed = "apple";
  } else {
    if (wasEverPaid) {
      finalTier = currentTier;
      finalStatus = currentStatus;
      providerUsed = "preserved";
    } else {
      finalTier = "free";
      finalStatus = "inactive";
      providerUsed = "none";
    }
  }

  const finalLevel = (finalTier === "free") ? "free" : "paid";

  const changed = 
    finalTier !== currentTier ||
    finalLevel !== currentLevel ||
    finalStatus !== currentStatus ||
    (stripeCustomerId && !user.stripe_customer_id);

  console.log(`[reconcileUserEntitlements] Complete: ${email}, tier=${currentTier}→${finalTier}, level=${currentLevel}→${finalLevel}, changed=${changed}, provider=${providerUsed}`);

  return {
    finalTier,
    finalLevel,
    finalStatus,
    stripeCustomerId,
    providerUsed,
    changed,
  };
}