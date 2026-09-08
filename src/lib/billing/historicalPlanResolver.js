/**
 * historicalPlanResolver — JS mirror for testing
 * Mirrors base44/shared/historicalPlanResolver.ts
 */

const MODULE_FAMILY_MAP = {
  pipekeeper: "PipeKeeper Individual",
  whiskeykeeper: "WhiskeyKeeper Individual",
  cigarkeeper: "CigarKeeper Individual",
  winekeeper: "WineKeeper Individual",
};

const PRODUCT_NAME_KEYWORDS = [
  { keywords: ["4-module", "four module", "4 module", "all-module", "all module", "all access"], family: "Four-Module Bundle", type: "bundle", modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"] },
  { keywords: ["3-module", "three module", "3 module"], family: "Three-Module Bundle", type: "bundle", modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper"] },
  { keywords: ["founders", "founder", "2-module", "two module", "2 module"], family: "Founders Bundle", type: "bundle", modules: ["pipekeeper", "whiskeykeeper"] },
  { keywords: ["whiskeykeeper", "whiskey keeper", "whiskey-keeper"], family: "WhiskeyKeeper Individual", type: "single", modules: ["whiskeykeeper"] },
  { keywords: ["cigarkeeper", "cigar keeper", "cigar-keeper"], family: "CigarKeeper Individual", type: "single", modules: ["cigarkeeper"] },
  { keywords: ["winekeeper", "wine keeper", "wine-keeper"], family: "WineKeeper Individual", type: "single", modules: ["winekeeper"] },
  { keywords: ["pipekeeper", "pipe keeper", "pipe-keeper"], family: "PipeKeeper Individual", type: "single", modules: ["pipekeeper"] },
];

function classifyByModules(modules) {
  const mods = modules.map((m) => m.trim().toLowerCase()).filter(Boolean);
  if (mods.length === 0) return null;
  if (mods.length >= 4) return { family: "Four-Module Bundle", type: "bundle", modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"] };
  if (mods.length === 3) return { family: "Three-Module Bundle", type: "bundle", modules: mods };
  if (mods.length === 2) return { family: "Founders Bundle", type: "bundle", modules: mods };
  if (mods.length === 1 && MODULE_FAMILY_MAP[mods[0]]) {
    return { family: MODULE_FAMILY_MAP[mods[0]], type: "single", modules: mods };
  }
  return null;
}

function classifyByProductName(name) {
  const lower = name.toLowerCase();
  for (const entry of PRODUCT_NAME_KEYWORDS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return { family: entry.family, type: entry.type, modules: entry.modules };
    }
  }
  return null;
}

export function resolveHistoricalPlan(subscription, stripeVerification, priceIdMap, planDisplay, registry = []) {
  const result = {
    plan_key: null,
    plan_family: null,
    plan_type: "unknown",
    bundle_type: null,
    modules: [],
    resolution_source: "unresolved",
    confidence: "low",
    classification: "UNRESOLVED",
    reason_unresolved: "No evidence found for commercial plan",
    stripe_price_id: (stripeVerification && stripeVerification.price_id) || (subscription && subscription.product_id) || null,
    stripe_product_id: (stripeVerification && stripeVerification.product_id) || null,
    stripe_product_name: (stripeVerification && stripeVerification.product_name) || null,
  };

  // Priority 1: CHECKOUT_EXPLICIT
  const checkoutType = (subscription && subscription.checkout_type) || "";
  if (checkoutType === "bundle_2" || checkoutType === "bundle_3" || checkoutType === "bundle_4") {
    const bundleMap = {
      bundle_2: { key: "founders_bundle_monthly", family: "Founders Bundle", modules: ["pipekeeper", "whiskeykeeper"] },
      bundle_3: { key: "three_module_bundle_monthly", family: "Three-Module Bundle", modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper"] },
      bundle_4: { key: "four_module_bundle_monthly", family: "Four-Module Bundle", modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"] },
    };
    const info = bundleMap[checkoutType];
    if (info) {
      Object.assign(result, {
        plan_key: info.key, plan_family: info.family, plan_type: "bundle",
        bundle_type: info.family, modules: info.modules,
        resolution_source: "checkout_type", confidence: "high",
        classification: "CHECKOUT_EXPLICIT", reason_unresolved: null,
      });
      return result;
    }
  }

  // Priority 4: REGISTRY_RESOLVED
  const priceId = result.stripe_price_id;
  const productId = result.stripe_product_id;
  if (productId || priceId) {
    const registryMatch = registry.find((r) =>
      (productId && r.product_id === productId) || (priceId && r.price_id === priceId));
    if (registryMatch && registryMatch.canonical_plan_key && planDisplay[registryMatch.canonical_plan_key]) {
      const info = planDisplay[registryMatch.canonical_plan_key];
      Object.assign(result, {
        plan_key: registryMatch.canonical_plan_key, plan_family: info.display_name,
        plan_type: info.plan_type,
        bundle_type: info.plan_type === "bundle" ? info.display_name : null,
        modules: registryMatch.canonical_modules || info.modules,
        resolution_source: "persisted_registry", confidence: "high",
        classification: "REGISTRY_RESOLVED", reason_unresolved: null,
      });
      return result;
    }
  }

  // Priority 5: INTERNAL_EXPLICIT
  const internalPlanKey = (subscription && subscription.plan_key) || "";
  if (internalPlanKey && planDisplay[internalPlanKey]) {
    const info = planDisplay[internalPlanKey];
    Object.assign(result, {
      plan_key: internalPlanKey, plan_family: info.display_name,
      plan_type: info.plan_type,
      bundle_type: info.plan_type === "bundle" ? info.display_name : null,
      modules: info.modules,
      resolution_source: "internal_plan_key", confidence: "high",
      classification: "INTERNAL_EXPLICIT", reason_unresolved: null,
    });
    return result;
  }

  const productKind = (subscription && subscription.product_kind) || "";
  const kindMap = {
    founders: { key: "founders_bundle_monthly", family: "Founders Bundle", modules: ["pipekeeper", "whiskeykeeper"] },
    bundle_3: { key: "three_module_bundle_monthly", family: "Three-Module Bundle", modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper"] },
    bundle_4: { key: "four_module_bundle_monthly", family: "Four-Module Bundle", modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"] },
  };
  if (kindMap[productKind]) {
    const info = kindMap[productKind];
    Object.assign(result, {
      plan_key: info.key, plan_family: info.family, plan_type: "bundle",
      bundle_type: info.family, modules: info.modules,
      resolution_source: "internal_product_kind", confidence: "high",
      classification: "INTERNAL_EXPLICIT", reason_unresolved: null,
    });
    return result;
  }
  if (productKind === "single") {
    const mod = ((subscription && subscription.primary_module) || "").trim().toLowerCase();
    if (mod && MODULE_FAMILY_MAP[mod]) {
      Object.assign(result, {
        plan_family: MODULE_FAMILY_MAP[mod], plan_type: "single", modules: [mod],
        resolution_source: "internal_product_kind", confidence: "high",
        classification: "INTERNAL_EXPLICIT", reason_unresolved: null,
      });
      return result;
    }
  }

  const modulesCsv = (subscription && subscription.modules_csv) || "";
  if (modulesCsv) {
    const mods = modulesCsv.split(",").map((m) => m.trim().toLowerCase()).filter(Boolean);
    const classified = classifyByModules(mods);
    if (classified) {
      Object.assign(result, {
        plan_family: classified.family, plan_type: classified.type,
        bundle_type: classified.type === "bundle" ? classified.family : null,
        modules: classified.modules,
        resolution_source: "internal_modules_csv", confidence: "high",
        classification: "INTERNAL_EXPLICIT", reason_unresolved: null,
      });
      return result;
    }
  }

  // Priority 6: MULTI_ITEM_BUNDLE
  if (stripeVerification && stripeVerification.item_count && stripeVerification.item_count > 1) {
    const items = stripeVerification.all_items || [];
    const itemModules = new Set();
    for (const item of items) {
      const name = (item.product_name || "").toLowerCase();
      if (name.includes("pipekeeper")) itemModules.add("pipekeeper");
      if (name.includes("whiskeykeeper")) itemModules.add("whiskeykeeper");
      if (name.includes("cigarkeeper")) itemModules.add("cigarkeeper");
      if (name.includes("winekeeper")) itemModules.add("winekeeper");
    }
    if (itemModules.size > 1) {
      const classified = classifyByModules([...itemModules]);
      if (classified) {
        Object.assign(result, {
          plan_family: classified.family, plan_type: classified.type,
          bundle_type: classified.type === "bundle" ? classified.family : null,
          modules: classified.modules,
          resolution_source: "multi_item_subscription", confidence: "medium",
          classification: "MULTI_ITEM_BUNDLE", reason_unresolved: null,
        });
        return result;
      }
    }
  }

  // Priority 7: ENV_PRICE_MAP
  if (priceId && priceIdMap[priceId]) {
    const planKey = priceIdMap[priceId];
    if (planDisplay[planKey]) {
      const info = planDisplay[planKey];
      Object.assign(result, {
        plan_key: planKey, plan_family: info.display_name,
        plan_type: info.plan_type,
        bundle_type: info.plan_type === "bundle" ? info.display_name : null,
        modules: info.modules,
        resolution_source: "env_price_map", confidence: "high",
        classification: "ENV_PRICE_RESOLVED", reason_unresolved: null,
      });
      return result;
    }
  }

  // Priority 8: PRODUCT_NAME
  const productName = result.stripe_product_name || "";
  if (productName) {
    const classified = classifyByProductName(productName);
    if (classified) {
      Object.assign(result, {
        plan_family: classified.family, plan_type: classified.type,
        bundle_type: classified.type === "bundle" ? classified.family : null,
        modules: classified.modules,
        resolution_source: "stripe_product_name", confidence: "medium",
        classification: "PRODUCT_NAME_RESOLVED", reason_unresolved: null,
      });
      return result;
    }
  }

  // Priority 9: AMOUNT_INFERRED
  const amountCents = subscription && subscription.amount != null
    ? Math.round(subscription.amount * 100)
    : (stripeVerification && stripeVerification.amount_cents);
  const interval = (subscription && subscription.billing_interval) ||
    (stripeVerification && stripeVerification.interval === "year" ? "annual" : (stripeVerification && stripeVerification.interval));
  if (amountCents != null && interval) {
    if ((interval === "year" || interval === "annual") && amountCents >= 2500 && amountCents <= 3500) {
      Object.assign(result, {
        plan_family: "PipeKeeper Individual", plan_type: "single", modules: ["pipekeeper"],
        resolution_source: "amount_interval_inference", confidence: "low",
        classification: "AMOUNT_INFERRED", reason_unresolved: null,
      });
      return result;
    }
    if ((interval === "month" || interval === "monthly") && amountCents >= 250 && amountCents <= 400) {
      Object.assign(result, {
        plan_family: "PipeKeeper Individual", plan_type: "single", modules: ["pipekeeper"],
        resolution_source: "amount_interval_inference", confidence: "low",
        classification: "AMOUNT_INFERRED", reason_unresolved: null,
      });
      return result;
    }
    result.reason_unresolved = `Amount ${amountCents}c/${interval} does not match any known plan pattern`;
  }

  return result;
}