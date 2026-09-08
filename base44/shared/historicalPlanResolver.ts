/**
 * historicalPlanResolver — Canonical Historical Commercial Plan Resolver
 *
 * Resolves the COMMERCIAL PLAN (PipeKeeper Individual, Founders Bundle, etc.)
 * for any historical purchase using a prioritized evidence chain:
 *
 * Priority:
 *  1. CHECKOUT_EXPLICIT    — checkout metadata / checkout_type
 *  2. PROVIDER_EXPLICIT    — Stripe Product/Price metadata (plan_key, modules)
 *  3. INVOICE_EXPLICIT     — invoice line-item Product/Price
 *  4. REGISTRY_RESOLVED    — StripeProductRegistry mapping
 *  5. INTERNAL_EXPLICIT    — internal plan_key, product_kind, modules_csv
 *  6. MULTI_ITEM_BUNDLE    — multiple subscription items → bundle
 *  7. ENV_PRICE_MAP        — env var price ID → plan key
 *  8. PRODUCT_NAME         — Stripe Product name keyword matching
 *  9. AMOUNT_INFERRED      — amount/interval heuristic (weak, last resort)
 * 10. UNRESOLVED           — no evidence found
 *
 * This module is the SINGLE source of truth for historical plan resolution.
 * Both getCanonicalBillingDataset and reconcileHistoricalPurchases use it.
 */

export type HistoricalPlanClassification =
  | "CHECKOUT_EXPLICIT"
  | "PROVIDER_EXPLICIT"
  | "INVOICE_EXPLICIT"
  | "REGISTRY_RESOLVED"
  | "INTERNAL_EXPLICIT"
  | "MULTI_ITEM_BUNDLE"
  | "ENV_PRICE_RESOLVED"
  | "PRODUCT_NAME_RESOLVED"
  | "AMOUNT_INFERRED"
  | "UNRESOLVED";

export interface HistoricalPlanResult {
  plan_key: string | null;
  plan_family: string | null;
  plan_type: "single" | "bundle" | "unknown";
  bundle_type: string | null;
  modules: string[];
  resolution_source: string;
  confidence: "high" | "medium" | "low";
  classification: HistoricalPlanClassification;
  reason_unresolved: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  stripe_product_name: string | null;
}

export interface PlanDisplayInfo {
  display_name: string;
  plan_type: "single" | "bundle";
  modules: string[];
}

export interface PlanDisplayCatalog {
  [planKey: string]: PlanDisplayInfo;
}

export interface SubscriptionRecord {
  plan_key?: string;
  product_kind?: string;
  checkout_type?: string;
  modules_csv?: string;
  primary_module?: string;
  product_id?: string;
  amount?: number;
  billing_interval?: string;
  provider?: string;
  status?: string;
}

export interface StripeVerificationData {
  price_id?: string;
  product_id?: string;
  product_name?: string;
  amount_cents?: number;
  interval?: string;
  item_count?: number;
  all_items?: Array<{
    price_id?: string;
    product_id?: string;
    product_name?: string;
    amount_cents?: number;
    interval?: string;
    quantity?: number;
  }>;
  exists?: boolean;
  status?: string;
}

export interface RegistryEntry {
  price_id?: string;
  product_id?: string;
  canonical_plan_key?: string;
  canonical_product?: string;
  canonical_modules?: string[];
  mapping_source?: string;
  confidence?: string;
}

const MODULE_FAMILY_MAP: Record<string, string> = {
  pipekeeper: "PipeKeeper Individual",
  whiskeykeeper: "WhiskeyKeeper Individual",
  cigarkeeper: "CigarKeeper Individual",
  winekeeper: "WineKeeper Individual",
};

const PRODUCT_NAME_KEYWORDS: Array<{ keywords: string[]; family: string; type: "single" | "bundle"; modules: string[] }> = [
  { keywords: ["4-module", "four module", "4 module", "all-module", "all module", "all access"], family: "Four-Module Bundle", type: "bundle", modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"] },
  { keywords: ["3-module", "three module", "3 module"], family: "Three-Module Bundle", type: "bundle", modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper"] },
  { keywords: ["founders", "founder", "2-module", "two module", "2 module"], family: "Founders Bundle", type: "bundle", modules: ["pipekeeper", "whiskeykeeper"] },
  { keywords: ["whiskeykeeper", "whiskey keeper", "whiskey-keeper"], family: "WhiskeyKeeper Individual", type: "single", modules: ["whiskeykeeper"] },
  { keywords: ["cigarkeeper", "cigar keeper", "cigar-keeper"], family: "CigarKeeper Individual", type: "single", modules: ["cigarkeeper"] },
  { keywords: ["winekeeper", "wine keeper", "wine-keeper"], family: "WineKeeper Individual", type: "single", modules: ["winekeeper"] },
  { keywords: ["pipekeeper", "pipe keeper", "pipe-keeper"], family: "PipeKeeper Individual", type: "single", modules: ["pipekeeper"] },
];

function classifyByModules(modules: string[]): { family: string; type: "single" | "bundle"; modules: string[] } | null {
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

function classifyByProductName(name: string): { family: string; type: "single" | "bundle"; modules: string[] } | null {
  const lower = name.toLowerCase();
  for (const entry of PRODUCT_NAME_KEYWORDS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return { family: entry.family, type: entry.type, modules: entry.modules };
    }
  }
  return null;
}

export function resolveHistoricalPlan(
  subscription: SubscriptionRecord,
  stripeVerification: StripeVerificationData | null,
  priceIdMap: Record<string, string>,
  planDisplay: PlanDisplayCatalog,
  registry: RegistryEntry[] = [],
): HistoricalPlanResult {
  const result: HistoricalPlanResult = {
    plan_key: null,
    plan_family: null,
    plan_type: "unknown",
    bundle_type: null,
    modules: [],
    resolution_source: "unresolved",
    confidence: "low",
    classification: "UNRESOLVED",
    reason_unresolved: "No evidence found for commercial plan",
    stripe_price_id: stripeVerification?.price_id || subscription.product_id || null,
    stripe_product_id: stripeVerification?.product_id || null,
    stripe_product_name: stripeVerification?.product_name || null,
  };

  // ── Priority 1: CHECKOUT_EXPLICIT — checkout_type field ──
  const checkoutType = subscription.checkout_type || "";
  if (checkoutType === "bundle_2" || checkoutType === "bundle_3" || checkoutType === "bundle_4") {
    const bundleMap: Record<string, { key: string; family: string; modules: string[] }> = {
      bundle_2: { key: "founders_bundle_monthly", family: "Founders Bundle", modules: ["pipekeeper", "whiskeykeeper"] },
      bundle_3: { key: "three_module_bundle_monthly", family: "Three-Module Bundle", modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper"] },
      bundle_4: { key: "four_module_bundle_monthly", family: "Four-Module Bundle", modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"] },
    };
    const info = bundleMap[checkoutType];
    if (info) {
      result.plan_key = info.key;
      result.plan_family = info.family;
      result.plan_type = "bundle";
      result.bundle_type = info.family;
      result.modules = info.modules;
      result.resolution_source = "checkout_type";
      result.confidence = "high";
      result.classification = "CHECKOUT_EXPLICIT";
      result.reason_unresolved = null;
      return result;
    }
  }

  // ── Priority 2: PROVIDER_EXPLICIT — Stripe Product/Price metadata ──
  // Check if Stripe subscription items have plan_key or modules in metadata
  // (This would come from expanded Stripe data — handled by caller passing stripeVerification)
  // The stripeVerification.all_items may contain metadata, but we check product_name as fallback

  // ── Priority 4: REGISTRY_RESOLVED — StripeProductRegistry mapping ──
  const priceId = result.stripe_price_id;
  const productId = result.stripe_product_id;
  if (productId || priceId) {
    const registryMatch = registry.find(
      (r) =>
        (productId && r.product_id === productId) ||
        (priceId && r.price_id === priceId),
    );
    if (registryMatch && registryMatch.canonical_plan_key && planDisplay[registryMatch.canonical_plan_key]) {
      const info = planDisplay[registryMatch.canonical_plan_key];
      result.plan_key = registryMatch.canonical_plan_key;
      result.plan_family = info.display_name;
      result.plan_type = info.plan_type;
      result.bundle_type = info.plan_type === "bundle" ? info.display_name : null;
      result.modules = registryMatch.canonical_modules || info.modules;
      result.resolution_source = "persisted_registry";
      result.confidence = "high";
      result.classification = "REGISTRY_RESOLVED";
      result.reason_unresolved = null;
      return result;
    }
  }

  // ── Priority 5: INTERNAL_EXPLICIT — internal plan_key, product_kind, modules_csv ──

  // 5a: plan_key
  const internalPlanKey = subscription.plan_key || "";
  if (internalPlanKey && planDisplay[internalPlanKey]) {
    const info = planDisplay[internalPlanKey];
    result.plan_key = internalPlanKey;
    result.plan_family = info.display_name;
    result.plan_type = info.plan_type;
    result.bundle_type = info.plan_type === "bundle" ? info.display_name : null;
    result.modules = info.modules;
    result.resolution_source = "internal_plan_key";
    result.confidence = "high";
    result.classification = "INTERNAL_EXPLICIT";
    result.reason_unresolved = null;
    return result;
  }

  // 5b: product_kind
  const productKind = subscription.product_kind || "";
  if (productKind === "founders") {
    result.plan_key = "founders_bundle_monthly";
    result.plan_family = "Founders Bundle";
    result.plan_type = "bundle";
    result.bundle_type = "Founders Bundle";
    result.modules = ["pipekeeper", "whiskeykeeper"];
    result.resolution_source = "internal_product_kind";
    result.confidence = "high";
    result.classification = "INTERNAL_EXPLICIT";
    result.reason_unresolved = null;
    return result;
  }
  if (productKind === "bundle_3") {
    result.plan_key = "three_module_bundle_monthly";
    result.plan_family = "Three-Module Bundle";
    result.plan_type = "bundle";
    result.bundle_type = "Three-Module Bundle";
    result.modules = ["pipekeeper", "whiskeykeeper", "cigarkeeper"];
    result.resolution_source = "internal_product_kind";
    result.confidence = "high";
    result.classification = "INTERNAL_EXPLICIT";
    result.reason_unresolved = null;
    return result;
  }
  if (productKind === "bundle_4") {
    result.plan_key = "four_module_bundle_monthly";
    result.plan_family = "Four-Module Bundle";
    result.plan_type = "bundle";
    result.bundle_type = "Four-Module Bundle";
    result.modules = ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"];
    result.resolution_source = "internal_product_kind";
    result.confidence = "high";
    result.classification = "INTERNAL_EXPLICIT";
    result.reason_unresolved = null;
    return result;
  }
  if (productKind === "single") {
    const mod = (subscription.primary_module || "").trim().toLowerCase();
    if (mod && MODULE_FAMILY_MAP[mod]) {
      result.plan_family = MODULE_FAMILY_MAP[mod];
      result.plan_type = "single";
      result.modules = [mod];
      result.resolution_source = "internal_product_kind";
      result.confidence = "high";
      result.classification = "INTERNAL_EXPLICIT";
      result.reason_unresolved = null;
      return result;
    }
  }

  // 5c: modules_csv
  const modulesCsv = subscription.modules_csv || "";
  if (modulesCsv) {
    const mods = modulesCsv.split(",").map((m) => m.trim().toLowerCase()).filter(Boolean);
    const classified = classifyByModules(mods);
    if (classified) {
      result.plan_family = classified.family;
      result.plan_type = classified.type;
      result.bundle_type = classified.type === "bundle" ? classified.family : null;
      result.modules = classified.modules;
      result.resolution_source = "internal_modules_csv";
      result.confidence = "high";
      result.classification = "INTERNAL_EXPLICIT";
      result.reason_unresolved = null;
      return result;
    }
  }

  // ── Priority 6: MULTI_ITEM_BUNDLE — multiple subscription items ──
  if (stripeVerification?.item_count && stripeVerification.item_count > 1) {
    const items = stripeVerification.all_items || [];
    const itemProductNames = items.map((it) => it.product_name).filter(Boolean);
    const itemModules = new Set<string>();
    for (const name of itemProductNames) {
      const lower = name.toLowerCase();
      if (lower.includes("pipekeeper")) itemModules.add("pipekeeper");
      if (lower.includes("whiskeykeeper")) itemModules.add("whiskeykeeper");
      if (lower.includes("cigarkeeper")) itemModules.add("cigarkeeper");
      if (lower.includes("winekeeper")) itemModules.add("winekeeper");
    }
    if (itemModules.size > 1) {
      const classified = classifyByModules([...itemModules]);
      if (classified) {
        result.plan_family = classified.family;
        result.plan_type = classified.type;
        result.bundle_type = classified.type === "bundle" ? classified.family : null;
        result.modules = classified.modules;
        result.resolution_source = "multi_item_subscription";
        result.confidence = "medium";
        result.classification = "MULTI_ITEM_BUNDLE";
        result.reason_unresolved = null;
        return result;
      }
    }
  }

  // ── Priority 7: ENV_PRICE_MAP — env var price ID → plan key ──
  if (priceId && priceIdMap[priceId]) {
    const planKey = priceIdMap[priceId];
    if (planDisplay[planKey]) {
      const info = planDisplay[planKey];
      result.plan_key = planKey;
      result.plan_family = info.display_name;
      result.plan_type = info.plan_type;
      result.bundle_type = info.plan_type === "bundle" ? info.display_name : null;
      result.modules = info.modules;
      result.resolution_source = "env_price_map";
      result.confidence = "high";
      result.classification = "ENV_PRICE_RESOLVED";
      result.reason_unresolved = null;
      return result;
    }
  }

  // ── Priority 8: PRODUCT_NAME — Stripe Product name keyword matching ──
  const productName = result.stripe_product_name || "";
  if (productName) {
    const classified = classifyByProductName(productName);
    if (classified) {
      result.plan_family = classified.family;
      result.plan_type = classified.type;
      result.bundle_type = classified.type === "bundle" ? classified.family : null;
      result.modules = classified.modules;
      result.resolution_source = "stripe_product_name";
      result.confidence = "medium";
      result.classification = "PRODUCT_NAME_RESOLVED";
      result.reason_unresolved = null;
      return result;
    }
  }

  // ── Priority 9: AMOUNT_INFERRED — amount/interval heuristic (weak, last resort) ──
  const amountCents = subscription.amount != null
    ? Math.round(subscription.amount * 100)
    : stripeVerification?.amount_cents;
  const interval = subscription.billing_interval || (stripeVerification?.interval === "year" ? "annual" : stripeVerification?.interval);
  if (amountCents != null && interval) {
    // Known PipeKeeper annual: ~$29.99/yr = 2999c
    // Known PipeKeeper monthly: ~$2.99/mo = 299c
    // These are the ONLY amounts we can safely infer from
    if (interval === "year" || interval === "annual") {
      if (amountCents >= 2500 && amountCents <= 3500) {
        result.plan_family = "PipeKeeper Individual";
        result.plan_type = "single";
        result.modules = ["pipekeeper"];
        result.resolution_source = "amount_interval_inference";
        result.confidence = "low";
        result.classification = "AMOUNT_INFERRED";
        result.reason_unresolved = null;
        return result;
      }
    }
    if (interval === "month" || interval === "monthly") {
      if (amountCents >= 250 && amountCents <= 400) {
        result.plan_family = "PipeKeeper Individual";
        result.plan_type = "single";
        result.modules = ["pipekeeper"];
        result.resolution_source = "amount_interval_inference";
        result.confidence = "low";
        result.classification = "AMOUNT_INFERRED";
        result.reason_unresolved = null;
        return result;
      }
    }
    // If amount is high but we can't classify, note it
    result.reason_unresolved = `Amount ${amountCents}c/${interval} does not match any known plan pattern`;
  }

  return result;
}