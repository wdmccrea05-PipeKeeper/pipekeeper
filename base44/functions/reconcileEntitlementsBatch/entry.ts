// Batch entitlement reconciliation for admin use
// NO LOCAL IMPORTS - all logic inlined (Base44 functions cannot import local files)
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

function modulesFromPriceId(priceId) {
  if (!priceId) return [];
  return HARDCODED_PRICE_TO_MODULES[priceId] || [];
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

function buildPreservedModules(userEntity) {
  const mods = [];
  if (userEntity.pipekeeper_paid)    mods.push('pipekeeper');
  if (userEntity.whiskeykeeper_paid) mods.push('whiskeykeeper');
  if (userEntity.cigarkeeper_paid)   mods.push('cigarkeeper');
  if (userEntity.winekeeper_paid)    mods.push('winekeeper');
  if (mods.length > 0) return mods;
  const csv = String(userEntity.paid_modules_csv || '').trim();
  if (csv) return csv.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  return [];
}

async function reconcileUser(base44, userEntity, stripe, localSubsByUserId) {
  const email = normEmail(userEntity.email);
  let stripeCustomerId = userEntity.stripe_customer_id || null;

  // Collect active subscriptions from local DB
  const localSubs = localSubsByUserId[userEntity.id] || [];
  const activeSubs = localSubs.filter(s => isActiveStatus(s.status));

  // Build module set from local subscriptions
  const allModules = new Set();
  let hasActiveSubscription = activeSubs.length > 0;

  for (const sub of activeSubs) {
    // Try price_id → hardcoded map first
    const priceId = sub.price_id || sub.stripe_price_id || null;
    const fromPrice = modulesFromPriceId(priceId);
    if (fromPrice.length > 0) {
      fromPrice.forEach(m => allModules.add(m));
      continue;
    }
    // Try plan_key
    const planKey = sub.plan_key || sub.planKey || null;
    const fromKey = planKey ? modulesFromPlanKey(planKey) : [];
    if (fromKey.length > 0) {
      fromKey.forEach(m => allModules.add(m));
      continue;
    }
    // Try modules_csv
    const csv = String(sub.modules_csv || '').trim();
    if (csv) {
      csv.split(',').map(m => m.trim().toLowerCase()).filter(Boolean).forEach(m => allModules.add(m));
    }
  }

  // If no local active sub and stripe customer exists, check Stripe API
  if (!hasActiveSubscription && stripeCustomerId) {
    try {
      const subsResponse = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 5,
        expand: ["data.items.data.price"],
      });
      const activeSub = subsResponse.data?.find(s => isActiveStatus(s.status));
      if (activeSub) {
        hasActiveSubscription = true;
        const priceId = activeSub.items?.data?.[0]?.price?.id;
        const fromPrice = modulesFromPriceId(priceId);
        if (fromPrice.length > 0) {
          fromPrice.forEach(m => allModules.add(m));
        } else {
          // Try metadata/modules_csv from Stripe subscription
          const metaCsv = String(activeSub.metadata?.modules_csv || '').trim();
          if (metaCsv) {
            metaCsv.split(',').map(m => m.trim().toLowerCase()).filter(Boolean).forEach(m => allModules.add(m));
          }
        }
        if (!stripeCustomerId) stripeCustomerId = activeSub.customer;
      }
    } catch (e) {
      console.warn(`[reconcileEntitlementsBatch] Stripe check failed for ${email}:`, e?.message);
    }
  }

  // SAFE RULE: if active subscription exists but modules not resolved, preserve existing flags
  let finalModules = unique([...allModules]);
  let syncState = 'synced';

  if (!hasActiveSubscription) {
    // Confirmed no active subscription — free
    finalModules = [];
    syncState = 'synced';
  } else if (finalModules.length === 0) {
    // Active subscription but unresolved modules — preserve existing, mark needs_review
    finalModules = buildPreservedModules(userEntity);
    syncState = 'needs_review';
    console.warn(`[reconcileEntitlementsBatch] Active subscription for ${email} but no modules resolved. Preserving: [${finalModules.join(',')}]`);
  }

  const hasPaidAccess = hasActiveSubscription;
  const hasBundle = finalModules.length > 1;
  const entitlementTier = hasPaidAccess
    ? (hasBundle ? `bundle_${finalModules.length}` : 'pro')
    : 'free';

  // Check if anything changed
  const currentModulesCsv = (userEntity.paid_modules_csv || '').trim();
  const finalModulesCsv = finalModules.join(',');
  const changed =
    userEntity.has_paid_access !== hasPaidAccess ||
    currentModulesCsv !== finalModulesCsv ||
    !!userEntity.pipekeeper_paid !== finalModules.includes('pipekeeper') ||
    !!userEntity.whiskeykeeper_paid !== finalModules.includes('whiskeykeeper') ||
    !!userEntity.cigarkeeper_paid !== finalModules.includes('cigarkeeper') ||
    (stripeCustomerId && !userEntity.stripe_customer_id);

  return {
    finalModules,
    hasPaidAccess,
    entitlementTier,
    syncState,
    stripeCustomerId,
    changed,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== "admin") {
      return Response.json({ ok: false, error: "FORBIDDEN", message: "Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    // Accept both camelCase and snake_case for dry_run/dryRun
    const dryRun = (body.dryRun ?? body.dry_run) !== false;
    const batchSize = Math.min(body.batchSize || body.batch_size || 100, 500);
    const cursor = body.cursor || null;

    console.log(`[reconcileEntitlementsBatch] Starting: dryRun=${dryRun}, batchSize=${batchSize}`);

    const stripe = getStripe();
    const skip = cursor ? parseInt(cursor, 10) : 0;
    const users = await base44.asServiceRole.entities.User.list("-created_date", batchSize, skip);

    // Pre-fetch ALL local subscriptions in one batch — avoids N Stripe API calls for free users
    const allLocalSubs = await base44.asServiceRole.entities.Subscription.list("-created_date", 1000);
    const localSubsByUserId = {};
    for (const sub of (allLocalSubs || [])) {
      const uid = sub.user_id;
      if (uid) {
        if (!localSubsByUserId[uid]) localSubsByUserId[uid] = [];
        localSubsByUserId[uid].push(sub);
      }
    }

    let scanned = 0;
    let fixed = 0;
    let unchanged = 0;
    let errorsCount = 0;
    const sampleFixes = [];
    const sampleErrors = [];

    for (const userEntity of users) {
      try {
        const result = await reconcileUser(base44, userEntity, stripe, localSubsByUserId);
        scanned++;

        if (result.changed) {
          fixed++;
          if (!dryRun) {
            const updates = {
              // Module-specific flags (canonical)
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
            if (result.stripeCustomerId && !userEntity.stripe_customer_id) {
              updates.stripe_customer_id = result.stripeCustomerId;
            }
            await base44.asServiceRole.entities.User.update(userEntity.id, updates);
          }
          if (sampleFixes.length < 10) {
            sampleFixes.push({
              email: userEntity.email,
              before: {
                modules: userEntity.paid_modules_csv || 'none',
                hasPaidAccess: userEntity.has_paid_access,
              },
              after: { modules: result.finalModules.join(','), hasPaidAccess: result.hasPaidAccess, tier: result.entitlementTier, syncState: result.syncState },
            });
          }
        } else {
          unchanged++;
        }
      } catch (err) {
        errorsCount++;
        if (sampleErrors.length < 5) {
          sampleErrors.push({ email: userEntity.email, message: String(err?.message || err) });
        }
      }
    }

    return Response.json({
      ok: true,
      dryRun,
      scanned,
      fixed,
      unchanged,
      errorsCount,
      hasMore: users.length === batchSize,
      nextCursor: users.length === batchSize ? String(skip + batchSize) : null,
      sampleFixes,
      sampleErrors,
    });
  } catch (error) {
    console.error("[reconcileEntitlementsBatch] Fatal error:", error);
    return Response.json({
      ok: false,
      error: "BATCH_RECONCILE_FAILED",
      message: String(error?.message || error),
    }, { status: 500 });
  }
});