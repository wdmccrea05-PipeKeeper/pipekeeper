/**
 * Return normalized subscription / entitlement status for the signed-in user.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normEmail(email: unknown): string {
  return String(email || '').trim().toLowerCase();
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function splitModulesCsv(csv: unknown): string[] {
  return unique(
    String(csv || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isIsoFuture(value: unknown): boolean {
  if (!value) return false;
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) && d.getTime() > Date.now();
}

function grantsPaidAccess(status: string, currentPeriodEnd?: string | null): boolean {
  const s = String(status || '').toLowerCase();
  if (s === 'active' || s === 'trialing') return true;
  if ((s === 'past_due' || s === 'incomplete') && currentPeriodEnd && isIsoFuture(currentPeriodEnd)) {
    return true;
  }
  return false;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me?.email) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const email = normEmail(me.email);
    const userRows = await base44.asServiceRole.entities.User.filter({ email });
    const user = Array.isArray(userRows) && userRows.length > 0 ? userRows[0] : null;

    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_email: email });
    const allSubs = Array.isArray(subs) ? subs : [];
    const activeSubs = allSubs.filter((sub: any) => grantsPaidAccess(sub.status, sub.current_period_end));
    const paidModules = unique(activeSubs.flatMap((sub: any) => splitModulesCsv(sub.modules_csv)));

    const hasBundle = activeSubs.some((sub: any) => String(sub.checkout_type || '').startsWith('bundle_'));
    const bundleSize = hasBundle
      ? Math.max(
          0,
          ...activeSubs
            .filter((sub: any) => String(sub.checkout_type || '').startsWith('bundle_'))
            .map((sub: any) => Number(sub.module_count || splitModulesCsv(sub.modules_csv).length || 0))
        )
      : 0;

    const entitlementTier = paidModules.length > 0
      ? (hasBundle ? `bundle_${bundleSize}` : 'pro')
      : 'free';

    return Response.json({
      success: true,
      email,
      entitlementTier,
      hasPaidAccess: paidModules.length > 0,
      hasBundleAccess: hasBundle,
      paidModules,
      activeSubscriptions: activeSubs.map((sub: any) => ({
        id: sub.id,
        provider: sub.provider || null,
        providerSubscriptionId: sub.provider_subscription_id || sub.stripe_subscription_id || null,
        status: sub.status || null,
        checkoutType: sub.checkout_type || null,
        billingPeriod: sub.billing_period || null,
        modules: splitModulesCsv(sub.modules_csv),
        currentPeriodEnd: sub.current_period_end || null,
        cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      })),
      cachedUserState: user
        ? {
            entitlementTier: user.entitlement_tier || null,
            paidModules: splitModulesCsv(user.paid_modules_csv),
            hasPaidAccess: !!user.has_paid_access,
            hasBundleAccess: !!user.has_bundle_access,
            stripeCustomerId: user.stripe_customer_id || null,
          }
        : null,
    });
  } catch (error) {
    console.error('[checkUserSubscriptionStatus] fatal error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});
