import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeSecretKeyLive, getStripeWebhookSecretLive, getStripePriceId } from "./_shared/remoteConfig.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can view diagnostics
    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Check all required Stripe configs
    const secretKey = await getStripeSecretKeyLive(req);
    const webhookSecret = await getStripeWebhookSecretLive(req);
    const premiumMonthly = await getStripePriceId("PREMIUM_MONTHLY", req);
    const premiumAnnual = await getStripePriceId("PREMIUM_ANNUAL", req);
    const proMonthly = await getStripePriceId("PRO_MONTHLY", req);
    const proAnnual = await getStripePriceId("PRO_ANNUAL", req);

    const diagnostics = {
      timestamp: new Date().toISOString(),
      app_version: "2.0",
      stripe_config: {
        secret_key: {
          present: !!secretKey.value,
          source: secretKey.source,
          masked: secretKey.value ? `${secretKey.value.slice(0, 7)}...${secretKey.value.slice(-4)}` : null,
        },
        webhook_secret: {
          present: !!webhookSecret.value,
          source: webhookSecret.source,
        },
        price_ids: {
          premium_monthly: {
            present: !!premiumMonthly.value,
            source: premiumMonthly.source,
            value: premiumMonthly.value,
          },
          premium_annual: {
            present: !!premiumAnnual.value,
            source: premiumAnnual.source,
            value: premiumAnnual.value,
          },
          pro_monthly: {
            present: !!proMonthly.value,
            source: proMonthly.source,
            value: proMonthly.value,
          },
          pro_annual: {
            present: !!proAnnual.value,
            source: proAnnual.source,
            value: proAnnual.value,
          },
        },
      },
      overall_status: secretKey.value && webhookSecret.value ? "operational" : "degraded",
      recommendations: [],
    };

    // Generate recommendations
    if (!secretKey.value) {
      diagnostics.recommendations.push(
        "CRITICAL: STRIPE_SECRET_KEY is missing from both env vars and RemoteConfig"
      );
    } else if (secretKey.source === "remote") {
      diagnostics.recommendations.push(
        "WARNING: Using RemoteConfig for STRIPE_SECRET_KEY - env var is missing or stale"
      );
    }

    if (!webhookSecret.value) {
      diagnostics.recommendations.push(
        "WARNING: STRIPE_WEBHOOK_SECRET is missing from both sources"
      );
    }

    const missingPrices = [];
    if (!premiumMonthly.value) missingPrices.push("PREMIUM_MONTHLY");
    if (!premiumAnnual.value) missingPrices.push("PREMIUM_ANNUAL");
    if (!proMonthly.value) missingPrices.push("PRO_MONTHLY");
    if (!proAnnual.value) missingPrices.push("PRO_ANNUAL");

    if (missingPrices.length > 0) {
      diagnostics.recommendations.push(
        `Missing price IDs: ${missingPrices.join(", ")}`
      );
    }

    return Response.json(diagnostics);
  } catch (error) {
    console.error("[stripe_diagnostics] error:", error);
    return Response.json(
      {
        error: "DIAGNOSTICS_FAILED",
        message: error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});