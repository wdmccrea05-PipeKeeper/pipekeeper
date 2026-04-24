// Repair entitlements for a single user by email - admin only
// NO LOCAL IMPORTS: reconciliation logic inlined
import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import Stripe from "npm:stripe@17.5.0";

const normEmail = (email) => String(email || "").trim().toLowerCase();

// Hardcoded price ID → module mapping (canonical, non-negotiable)
const HARDCODED_PRICE_TO_MODULES = {
  'price_1SsDgEDycvQWC88PmdvlxFDa': ['pipekeeper'],
  'price_1SsDU6DycvQWC88PIwpmt7Oc': ['pipekeeper'],
  'price_1TBfcdDycvQWC88PV0OV4t9B': ['whiskeykeeper'],
  'price_1TBfd7DycvQWC88PHrCnHl1X': ['whiskeykeeper'],
  'price_1TBfbJDycvQWC88PIjsHAufT': ['cigarkeeper'],
  'price_1TBfaeDycvQWC88PkAHy3qIC': ['cigarkeeper'],
  'price_1TKgGnDycvQWC88PwdJo75R5': ['pipekeeper', 'whiskeykeeper'],
  'price_1TBfhVDycvQWC88PdZ1jQNwX': ['pipekeeper', 'whiskeykeeper'],
  'price_1TBfdyDycvQWC88PPKSN5uVJ': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
  'price_1TBfekDycvQWC88P5nZsEr7j': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
};

function modulesFromPlanKey(planKey) {
  const key = String(planKey || '').toLowerCase();
  if (key.startsWith('pipekeeper_'))    return ['pipekeeper'];
  if (key.startsWith('whiskeykeeper_')) return ['whiskeykeeper'];
  if (key.startsWith('cigarkeeper_'))   return ['cigarkeeper'];
  if (key.startsWith('winekeeper_'))    return ['winekeeper'];
  if (key.includes('three_module'))     return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  if (key.includes('four_module'))      return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  if (key.includes('founders'))         return ['pipekeeper', 'whiskeykeeper'];
  return [];
}

function unique(arr) { return [...new Set(arr)]; }

function getStripe() {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (!key || !key.startsWith("sk_")) throw new Error("Invalid STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

function isActiveStatus(status) {
  return ["active", "trialing", "trial", "past_due", "incomplete"].includes((status || "").toLowerCase());
}

function buildPreservedModules(userRow) {
  const mods = [];
  if (userRow.pipekeeper_paid)    mods.push('pipekeeper');
  if (userRow.whiskeykeeper_paid) mods.push('whiskeykeeper');
  if (userRow.cigarkeeper_paid)   mods.push('cigarkeeper');
  if (userRow.winekeeper_paid)    mods.push('winekeeper');
  if (mods.length > 0) return mods;
  const csv = String(userRow.paid_modules_csv || '').trim();
  if (csv) return csv.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  return [];
}

function resolveModulesFromStripeSubscription(sub) {
  if (!sub) return [];
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (priceId) {
    const fromHardcoded = HARDCODED_PRICE_TO_MODULES[priceId];
    if (fromHardcoded) return fromHardcoded;
  }
  // Try metadata
  const metaCsv = String(sub.metadata?.modules_csv || '').trim();
  if (metaCsv) return metaCsv.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  // Try plan_key in metadata
  const metaPlanKey = sub.metadata?.plan_key || '';
  if (metaPlanKey) {
    const fromKey = modulesFromPlanKey(metaPlanKey);
    if (fromKey.length > 0) return fromKey;
  }
  return [];
}

async function reconcileUser(base44, userRow) {
  const email = normEmail(userRow.email);
  let stripeCustomerId = userRow.stripe_customer_id || null;

  const allModules = new Set();
  let hasActiveSubscription = false;

  // Check local Subscription rows first
  try {
    const localSubs = await base44.asServiceRole.entities.Subscription.filter({ user_email: email });
    const activeSubs = (localSubs || []).filter(s => isActiveStatus(s.status));

    if (activeSubs.length > 0) {
      hasActiveSubscription = true;
      for (const sub of activeSubs) {
        const priceId = sub.price_id || sub.stripe_price_id || null;
        const fromPrice = priceId ? (HARDCODED_PRICE_TO_MODULES[priceId] || []) : [];
        if (fromPrice.length > 0) {
          fromPrice.forEach(m => allModules.add(m));
        } else {
          const planKey = sub.plan_key || sub.planKey || null;
          const fromKey = planKey ? modulesFromPlanKey(planKey) : [];
          if (fromKey.length > 0) {
            fromKey.forEach(m => allModules.add(m));
          } else {
            const csv = String(sub.modules_csv || '').trim();
            if (csv) csv.split(',').map(m => m.trim().toLowerCase()).filter(Boolean).forEach(m => allModules.add(m));
          }
        }
        if (sub.stripe_customer_id && !stripeCustomerId) stripeCustomerId = sub.stripe_customer_id;
      }
    }
  } catch (e) {
    console.warn(`[repairUserEntitlementByEmail] Local sub query failed:`, e?.message);
  }

  // Stripe check (always for repair function to get freshest data)
  try {
    const stripe = getStripe();
    let customerId = stripeCustomerId;
    if (!customerId) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      customerId = customers.data?.[0]?.id || null;
    }
    if (customerId) {
      stripeCustomerId = customerId;
      const subs = await stripe.subscriptions.list({
        customer: customerId, status: "all", limit: 10,
        expand: ["data.items.data.price"],
      });
      const activeSub = subs.data?.find(s => isActiveStatus(s.status));
      if (activeSub) {
        hasActiveSubscription = true;
        const mods = resolveModulesFromStripeSubscription(activeSub);
        mods.forEach(m => allModules.add(m));
      }
    }
  } catch (e) {
    console.warn(`[repairUserEntitlementByEmail] Stripe check failed:`, e?.message);
  }

  // Apple check
  try {
    const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
      user_id: userRow.id, provider: "apple",
    });
    const activeSub = (appleSubs || []).find(s => isActiveStatus(s.status));
    if (activeSub) {
      hasActiveSubscription = true;
      const csv = String(activeSub.modules_csv || '').trim();
      if (csv) csv.split(',').map(m => m.trim().toLowerCase()).filter(Boolean).forEach(m => allModules.add(m));
    }
  } catch (e) {
    console.warn(`[repairUserEntitlementByEmail] Apple check failed:`, e?.message);
  }

  // SAFE RULE: if active subscription exists but modules not resolved, preserve existing flags
  let finalModules = unique([...allModules]);
  let syncState = 'synced';

  if (!hasActiveSubscription) {
    finalModules = [];
    syncState = 'synced';
  } else if (finalModules.length === 0) {
    finalModules = buildPreservedModules(userRow);
    syncState = 'needs_review';
    console.warn(`[repairUserEntitlementByEmail] Active subscription for ${email} but no modules resolved. Preserving: [${finalModules.join(',')}]`);
  }

  const hasPaidAccess = hasActiveSubscription;
  const hasBundle = finalModules.length > 1;
  const entitlementTier = hasPaidAccess
    ? (hasBundle ? `bundle_${finalModules.length}` : 'pro')
    : 'free';

  const currentModulesCsv = (userRow.paid_modules_csv || '').trim();
  const finalModulesCsv = finalModules.join(',');
  const changed =
    userRow.has_paid_access !== hasPaidAccess ||
    currentModulesCsv !== finalModulesCsv ||
    !!userRow.pipekeeper_paid !== finalModules.includes('pipekeeper') ||
    !!userRow.whiskeykeeper_paid !== finalModules.includes('whiskeykeeper') ||
    !!userRow.cigarkeeper_paid !== finalModules.includes('cigarkeeper') ||
    (stripeCustomerId && !userRow.stripe_customer_id);

  return { finalModules, hasPaidAccess, entitlementTier, syncState, stripeCustomerId, changed };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ ok: false, error: "METHOD_NOT_ALLOWED" }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (me?.role !== "admin") {
      return Response.json({ ok: false, error: "FORBIDDEN", message: "Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = normEmail(body.email || "");
    const dryRun = body.dryRun !== false;

    if (!email) {
      return Response.json({ ok: false, error: "EMAIL_REQUIRED", message: "Email is required" }, { status: 400 });
    }

    console.log(`[repairUserEntitlementByEmail] Processing: ${email}, dryRun=${dryRun}`);

    const userRows = await base44.asServiceRole.entities.User.filter({ email });
    const userRow = userRows?.[0];

    if (!userRow) {
      return Response.json({ ok: false, error: "USER_NOT_FOUND", message: `No User entity found for ${email}` });
    }

    const before = {
      pipekeeper_paid: userRow.pipekeeper_paid,
      whiskeykeeper_paid: userRow.whiskeykeeper_paid,
      cigarkeeper_paid: userRow.cigarkeeper_paid,
      paid_modules_csv: userRow.paid_modules_csv,
      has_paid_access: userRow.has_paid_access,
      entitlement_tier: userRow.entitlement_tier,
      stripe_customer_id: userRow.stripe_customer_id,
    };

    const result = await reconcileUser(base44, userRow);

    if (!result.changed) {
      return Response.json({
        ok: true, email, changed: false,
        message: "User entitlements are already correct",
        before, after: before, syncState: result.syncState, applied: false,
      });
    }

    const updates = {
      pipekeeper_paid: result.finalModules.includes('pipekeeper'),
      whiskeykeeper_paid: result.finalModules.includes('whiskeykeeper'),
      cigarkeeper_paid: result.finalModules.includes('cigarkeeper'),
      winekeeper_paid: result.finalModules.includes('winekeeper'),
      paid_modules_csv: result.finalModules.join(','),
      has_paid_access: result.hasPaidAccess,
      has_bundle_access: result.finalModules.length > 1,
      entitlement_tier: result.entitlementTier,
      subscription_level: result.hasPaidAccess ? 'paid' : 'free',
      entitlement_sync_state: result.syncState,
    };
    if (result.stripeCustomerId && !userRow.stripe_customer_id) {
      updates.stripe_customer_id = result.stripeCustomerId;
    }

    const after = {
      pipekeeper_paid: updates.pipekeeper_paid,
      whiskeykeeper_paid: updates.whiskeykeeper_paid,
      cigarkeeper_paid: updates.cigarkeeper_paid,
      paid_modules_csv: updates.paid_modules_csv,
      has_paid_access: updates.has_paid_access,
      entitlement_tier: updates.entitlement_tier,
      stripe_customer_id: result.stripeCustomerId || userRow.stripe_customer_id,
      syncState: result.syncState,
    };

    if (!dryRun) {
      await base44.asServiceRole.entities.User.update(userRow.id, updates);
    }

    return Response.json({ ok: true, email, changed: true, applied: !dryRun, before, after });
  } catch (error) {
    console.error("[repairUserEntitlementByEmail] error:", error);
    return Response.json({ ok: false, error: "FUNCTION_ERROR", message: String(error?.message || error) }, { status: 500 });
  }
});