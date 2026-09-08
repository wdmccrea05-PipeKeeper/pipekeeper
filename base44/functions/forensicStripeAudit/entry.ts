// Forensic Stripe Audit — read-only diagnostic.
// Queries the live Stripe API for the complete Product/Price/Subscription catalog
// and compares against internal ActiveContract/Subscription/Registry data.
// NO mutations are performed. This function exists solely to produce evidence.

import { getStripeClient } from "../../shared/getStripeClient.ts";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { buildPriceIdMap, PLAN_CATALOG } from "../../shared/productScopeResolver.ts";

Deno.serve(async (req) => {
  try {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const { stripe, meta } = await getStripeClient(req);

  // ── 1. Enumerate ALL Stripe Products (active + archived) ──────────────────
  const allProducts: any[] = [];
  let productCursor: string | undefined = undefined;
  do {
    const batch: any = await stripe.products.list({
      limit: 100,
      active: undefined, // both active and archived
      starting_after: productCursor,
    });
    allProducts.push(...batch.data);
    productCursor = batch.has_more ? batch.data[batch.data.length - 1].id : undefined;
  } while (productCursor);

  // ── 2. Enumerate ALL Stripe Prices (active + archived) ─────────────────────
  const allPrices: any[] = [];
  let priceCursor: string | undefined = undefined;
  do {
    const batch: any = await stripe.prices.list({
      limit: 100,
      active: undefined,
      starting_after: priceCursor,
      expand: ["data.product"],
    });
    allPrices.push(...batch.data);
    priceCursor = batch.has_more ? batch.data[batch.data.length - 1].id : undefined;
  } while (priceCursor);

  // ── 3. Enumerate ALL Stripe Subscriptions (current + canceled) ─────────────
  const allSubscriptions: any[] = [];
  let subCursor: string | undefined = undefined;
  do {
    const batch: any = await stripe.subscriptions.list({
      limit: 100,
      status: "all",
      starting_after: subCursor,
      expand: ["data.customer"],
    });
    allSubscriptions.push(...batch.data);
    subCursor = batch.has_more ? batch.data[batch.data.length - 1].id : undefined;
  } while (subCursor);

  // ── 4. Build env var price ID map ──────────────────────────────────────────
  const priceIdEnv: Record<string, string | undefined> = {
    VITE_STRIPE_PIPEKEEPER_MONTHLY: Deno.env.get("VITE_STRIPE_PIPEKEEPER_MONTHLY"),
    VITE_STRIPE_PIPEKEEPER_ANNUAL: Deno.env.get("VITE_STRIPE_PIPEKEEPER_ANNUAL"),
    VITE_STRIPE_WHISKEYKEEPER_MONTHLY: Deno.env.get("VITE_STRIPE_WHISKEYKEEPER_MONTHLY"),
    VITE_STRIPE_WHISKEYKEEPER_ANNUAL: Deno.env.get("VITE_STRIPE_WHISKEYKEEPER_ANNUAL"),
    VITE_STRIPE_CIGARKEEPER_MONTHLY: Deno.env.get("VITE_STRIPE_CIGARKEEPER_MONTHLY"),
    VITE_STRIPE_CIGARKEEPER_ANNUAL: Deno.env.get("VITE_STRIPE_CIGARKEEPER_ANNUAL"),
    VITE_STRIPE_WINEKEEPER_MONTHLY: Deno.env.get("VITE_STRIPE_WINEKEEPER_MONTHLY"),
    VITE_STRIPE_WINEKEEPER_ANNUAL: Deno.env.get("VITE_STRIPE_WINEKEEPER_ANNUAL"),
    VITE_STRIPE_FOUNDERS_MONTHLY: Deno.env.get("VITE_STRIPE_FOUNDERS_MONTHLY"),
    VITE_STRIPE_FOUNDERS_ANNUAL: Deno.env.get("VITE_STRIPE_FOUNDERS_ANNUAL"),
    VITE_STRIPE_THREE_BUNDLE_MONTHLY: Deno.env.get("VITE_STRIPE_THREE_BUNDLE_MONTHLY"),
    VITE_STRIPE_THREE_BUNDLE_ANNUAL: Deno.env.get("VITE_STRIPE_THREE_BUNDLE_ANNUAL"),
    VITE_STRIPE_FOUR_BUNDLE_MONTHLY: Deno.env.get("VITE_STRIPE_FOUR_BUNDLE_MONTHLY"),
    VITE_STRIPE_FOUR_BUNDLE_ANNUAL: Deno.env.get("VITE_STRIPE_FOUR_BUNDLE_ANNUAL"),
  };
  const envPriceMap = buildPriceIdMap(priceIdEnv);

  // ── 5. Classify each Stripe Product by name keywords ────────────────────────
  const productClassification = allProducts.map((p: any) => {
    const name = (p.name || "").toLowerCase();
    let type = "unknown";
    if (name.includes("4-module") || name.includes("four module") || name.includes("4 module") || name.includes("all-module") || name.includes("all module")) type = "four_module_bundle";
    else if (name.includes("3-module") || name.includes("three module") || name.includes("3 module")) type = "three_module_bundle";
    else if (name.includes("founders") || name.includes("founder") || name.includes("2-module") || name.includes("two module") || name.includes("2 module")) type = "founders_bundle";
    else if (name.includes("whiskeykeeper") || name.includes("whiskey keeper") || name.includes("whiskey-keeper")) type = "whiskeykeeper_individual";
    else if (name.includes("cigarkeeper") || name.includes("cigar keeper") || name.includes("cigar-keeper")) type = "cigarkeeper_individual";
    else if (name.includes("winekeeper") || name.includes("wine keeper") || name.includes("wine-keeper")) type = "winekeeper_individual";
    else if (name.includes("pipekeeper") || name.includes("pipe keeper") || name.includes("pipe-keeper")) type = "pipekeeper_individual";
    return {
      product_id: p.id,
      product_name: p.name,
      active: p.active,
      created: new Date(p.created * 1000).toISOString(),
      metadata: p.metadata || {},
      type,
      has_plan_key_metadata: !!(p.metadata && p.metadata.plan_key),
      has_modules_metadata: !!(p.metadata && p.metadata.modules),
    };
  });

  // ── 6. Classify each Stripe Price ──────────────────────────────────────────
  const priceClassification = allPrices.map((pr: any) => {
    const productId = typeof pr.product === "object" ? pr.product?.id : pr.product;
    const productName = typeof pr.product === "object" ? pr.product?.name : null;
    const envPlanKey = envPriceMap[pr.id] || null;
    return {
      price_id: pr.id,
      product_id: productId,
      product_name: productName,
      active: pr.active,
      nickname: pr.nickname || "",
      amount_cents: pr.unit_amount,
      currency: pr.currency,
      interval: pr.recurring?.interval || null,
      metadata: pr.metadata || {},
      has_plan_key_metadata: !!(pr.metadata && pr.metadata.plan_key),
      has_modules_metadata: !!(pr.metadata && pr.metadata.modules),
      env_plan_key: envPlanKey,
      in_env_map: !!envPlanKey,
    };
  });

  // ── Build product ID → product lookup from the products list ─────────────────
  const productMap = new Map<string, any>();
  for (const p of allProducts) {
    productMap.set(p.id, p);
  }

  // ── 7. Analyze subscriptions ────────────────────────────────────────────────
  const currentSubs = allSubscriptions.filter((s: any) =>
    ["active", "trialing", "past_due"].includes(s.status)
  );
  const canceledSubs = allSubscriptions.filter((s: any) =>
    ["canceled", "expired", "incomplete", "incomplete_expired"].includes(s.status)
  );

  const multiItemSubs = allSubscriptions.filter((s: any) => s.items?.data?.length > 1);

  const subAnalysis = allSubscriptions.map((s: any) => {
    const items = s.items?.data || [];
    const firstItem = items[0];
    const price = firstItem?.price;
    const productId = typeof price?.product === "string" ? price.product : (typeof price?.product === "object" ? price?.product?.id : null);
    const productObj = productId ? productMap.get(productId) : null;
    const productName = productObj?.name || null;
    const productMetadata = productObj?.metadata || {};
    const envPlanKey = price ? envPriceMap[price.id] || null : null;

    // Check ALL items for bundle evidence
    const allItemPriceIds = items.map((it: any) => it.price?.id).filter(Boolean);
    const allItemProductIds = items.map((it: any) => {
      const p = it.price?.product;
      return typeof p === "string" ? p : (typeof p === "object" ? p?.id : null);
    }).filter(Boolean);
    const allItemProductNames = allItemProductIds.map((pid: string) => productMap.get(pid)?.name || null).filter(Boolean);

    // Check checkout metadata for bundle evidence
    const checkoutMetadata = s.metadata || {};
    const bundleInMetadata = Object.entries(checkoutMetadata).some(([k, v]) => {
      const val = String(v || "").toLowerCase();
      return k.toLowerCase().includes("bundle") || k.toLowerCase().includes("plan") ||
             k.toLowerCase().includes("module") || k.toLowerCase().includes("checkout") ||
             val.includes("bundle") || val.includes("founder") || val.includes("module");
    });

    return {
      subscription_id: s.id,
      status: s.status,
      customer_id: s.customer,
      customer_email: typeof s.customer === "object" ? s.customer?.email : null,
      item_count: items.length,
      first_price_id: price?.id || null,
      first_product_id: productId,
      first_product_name: productName,
      first_amount_cents: price?.unit_amount || null,
      first_interval: price?.recurring?.interval || null,
      env_plan_key: envPlanKey,
      all_price_ids: allItemPriceIds,
      all_product_ids: allItemProductIds,
      all_product_names: allItemProductNames,
      is_multi_item: items.length > 1,
      created: new Date(s.created * 1000).toISOString(),
      current_period_start: s.current_period_start ? new Date(s.current_period_start * 1000).toISOString() : null,
      current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null,
      subscription_metadata: checkoutMetadata,
      has_bundle_metadata: bundleInMetadata,
      canceled_at: s.canceled_at ? new Date(s.canceled_at * 1000).toISOString() : null,
    };
  });

  // ── 8. Search for bundle evidence across all Stripe data ────────────────────
  const bundleKeywords = ["bundle", "founder", "founders", "three module", "four module",
    "3 module", "4 module", "multi module", "all access", "all module", "all-module"];

  const bundleProducts = productClassification.filter((p: any) =>
    p.type !== "pipekeeper_individual" && p.type !== "whiskeykeeper_individual" &&
    p.type !== "cigarkeeper_individual" && p.type !== "winekeeper_individual" &&
    p.type !== "unknown"
  );

  const bundlePrices = priceClassification.filter((pr: any) => {
    const envPlan = pr.env_plan_key || "";
    return envPlan.includes("bundle") || envPlan.includes("founders");
  });

  const subsOnBundlePrices = subAnalysis.filter((s: any) =>
    s.env_plan_key?.includes("bundle") || s.env_plan_key?.includes("founders")
  );

  const subsWithBundleMetadata = subAnalysis.filter((s: any) => s.has_bundle_metadata);

  const subsWithMultiItems = subAnalysis.filter((s: any) => s.is_multi_item);

  // ── 9. Fetch internal data for comparison ──────────────────────────────────
  const [activeContracts, subscriptions, registry] = await Promise.all([
    base44.asServiceRole.entities.ActiveContract.list("-created_date", 500),
    base44.asServiceRole.entities.Subscription.list("-created_date", 500),
    base44.asServiceRole.entities.StripeProductRegistry.list("-created_date", 200),
  ]);

  // Compare Stripe current subs vs ActiveContract current
  const stripeCurrentSubIds = new Set(currentSubs.map((s: any) => s.id));
  const activeContractSubIds = new Set(
    activeContracts
      .filter((c: any) => c.provider === "stripe" && c.is_active)
      .map((c: any) => c.provider_subscription_id)
      .filter(Boolean)
  );

  const stripeCurrentMissingContract = [...stripeCurrentSubIds].filter(
    (id) => !activeContractSubIds.has(id)
  );
  const contractCurrentMissingStripe = [...activeContractSubIds].filter(
    (id) => !stripeCurrentSubIds.has(id)
  );

  // ── 10. Build the report ────────────────────────────────────────────────────
  return Response.json({
    stripe_client_meta: meta,
    timestamp: new Date().toISOString(),

    // ── Raw Stripe Catalog ──
    stripe_products: {
      total: allProducts.length,
      active: allProducts.filter((p: any) => p.active).length,
      archived: allProducts.filter((p: any) => !p.active).length,
      rows: productClassification,
    },

    stripe_prices: {
      total: allPrices.length,
      active: allPrices.filter((p: any) => p.active).length,
      archived: allPrices.filter((p: any) => !p.active).length,
      in_env_map: priceClassification.filter((p: any) => p.in_env_map).length,
      rows: priceClassification,
    },

    // ── Subscription Analysis ──
    stripe_subscriptions: {
      total: allSubscriptions.length,
      current: currentSubs.length,
      canceled: canceledSubs.length,
      multi_item: multiItemSubs.length,
      single_item: allSubscriptions.length - multiItemSubs.length,
      rows: subAnalysis,
    },

    // ── Bundle Evidence ──
    bundle_evidence: {
      bundle_products: bundleProducts,
      bundle_prices: bundlePrices,
      subs_on_bundle_prices: subsOnBundlePrices,
      subs_with_bundle_metadata: subsWithBundleMetadata,
      multi_item_subs: subsWithMultiItems,
    },

    // ── Env Var Price Map ──
    env_price_map: {
      map: envPriceMap,
      env_vars: priceIdEnv,
      plan_catalog_keys: Object.keys(PLAN_CATALOG),
    },

    // ── Internal vs Stripe Comparison ──
    comparison: {
      stripe_current_sub_count: currentSubs.length,
      active_contract_stripe_current_count: activeContractSubIds.size,
      stripe_current_missing_contract: stripeCurrentMissingContract,
      contract_current_missing_stripe: contractCurrentMissingStripe,
    },

    // ── Internal Registry ──
    internal_registry: {
      count: registry.length,
      rows: registry.map((r: any) => ({
        id: r.id,
        price_id: r.price_id,
        product_id: r.product_id,
        product_name: r.product_name,
        canonical_plan_key: r.canonical_plan_key,
        canonical_product: r.canonical_product,
        canonical_modules: r.canonical_modules,
        mapping_source: r.mapping_source,
        confidence: r.confidence,
      })),
    },

    // ── Internal ActiveContract Summary ──
    active_contract_summary: {
      total: activeContracts.length,
      product_distribution: activeContracts.reduce((acc: any, c: any) => {
        acc[c.product] = (acc[c.product] || 0) + 1;
        return acc;
      }, {}),
      active_stripe: activeContracts.filter((c: any) => c.provider === "stripe" && c.is_active).length,
    },
  });
  } catch (error) {
    console.error("[forensicStripeAudit] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});