// Fix user entitlements by email (admin only)
// Writes module-specific flags derived from active subscription price IDs and modules_csv
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

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

function resolveModulesFromSub(sub) {
  const priceId = sub.price_id || sub.stripe_price_id || null;
  if (priceId && HARDCODED_PRICE_TO_MODULES[priceId]) return HARDCODED_PRICE_TO_MODULES[priceId];
  const planKey = sub.plan_key || sub.planKey || null;
  if (planKey) {
    const fromKey = modulesFromPlanKey(planKey);
    if (fromKey.length > 0) return fromKey;
  }
  const csv = String(sub.modules_csv || '').trim();
  if (csv) return csv.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  return [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    if (admin?.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const targetEmail = String(body.userEmail || "").trim().toLowerCase();

    if (!targetEmail) {
      return Response.json({ error: "userEmail required" }, { status: 400 });
    }

    // Get subscriptions for this user
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: targetEmail
    }, "-updated_date", 10);

    const activeSubs = subs.filter(s => ["active", "trialing", "past_due", "incomplete"].includes((s.status || "").toLowerCase()));

    if (!activeSubs.length) {
      return Response.json({ 
        ok: false, 
        message: "No active subscription found" 
      });
    }

    // Get user entity
    const users = await base44.asServiceRole.entities.User.filter({ 
      email: targetEmail 
    });
    const user = users?.[0];

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Resolve modules from all active subscriptions
    const allModules = new Set();
    for (const sub of activeSubs) {
      const mods = resolveModulesFromSub(sub);
      mods.forEach(m => allModules.add(m));
    }

    const finalModules = unique([...allModules]);
    const hasBundle = finalModules.length > 1;
    const entitlementTier = hasBundle ? `bundle_${finalModules.length}` : 'pro';
    const syncState = finalModules.length > 0 ? 'synced' : 'needs_review';

    // Preserve existing flags when modules could not be resolved
    const updates = {
      pipekeeper_paid: finalModules.length > 0 ? finalModules.includes('pipekeeper') : (user.pipekeeper_paid ?? false),
      whiskeykeeper_paid: finalModules.length > 0 ? finalModules.includes('whiskeykeeper') : (user.whiskeykeeper_paid ?? false),
      cigarkeeper_paid: finalModules.length > 0 ? finalModules.includes('cigarkeeper') : (user.cigarkeeper_paid ?? false),
      winekeeper_paid: finalModules.length > 0 ? finalModules.includes('winekeeper') : (user.winekeeper_paid ?? false),
      paid_modules_csv: finalModules.length > 0 ? finalModules.join(',') : (user.paid_modules_csv || ''),
      has_paid_access: true,
      has_bundle_access: hasBundle,
      entitlement_tier: entitlementTier,
      subscription_level: 'paid',
      subscription_status: 'active',
      stripe_customer_id: activeSubs[0].stripe_customer_id || user.stripe_customer_id,
      entitlement_sync_state: syncState,
    };

    await base44.asServiceRole.entities.User.update(user.id, updates);

    return Response.json({
      ok: true,
      updated: true,
      modules: finalModules,
      entitlementTier,
      syncState,
      provider: activeSubs[0].provider,
      status: activeSubs[0].status
    });

  } catch (error) {
    console.error("Fix entitlements error:", error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});