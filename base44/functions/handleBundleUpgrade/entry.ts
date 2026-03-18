/**
 * Handle bundle upgrades safely
 *
 * Purpose:
 * - Cancel the user's existing paid Stripe subscriptions before starting a new bundle checkout
 * - Never touch Apple subscriptions here
 * - Prefer explicit subscription IDs from the frontend, but fall back to the user's
 *   active local Stripe subscription rows when needed
 *
 * Notes:
 * - This function only prepares the upgrade by canceling old Stripe subscriptions.
 * - The new bundle subscription is still created by createModuleCheckoutSession().
 * - Stripe webhooks should remain the source of truth for final entitlement sync.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { getStripeClient, safeStripeError } from './_utils/stripe.ts';

type BundleType = 'bundle_3' | 'bundle_4';

function normEmail(email: unknown): string {
  return String(email || '').trim().toLowerCase();
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function isIsoFuture(value: unknown): boolean {
  if (!value) return false;
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) && d.getTime() > Date.now();
}

function localSubGrantsPaidAccess(sub: any): boolean {
  if (!sub) return false;

  const status = String(sub.status || '').toLowerCase();

  if (status === 'active' || status === 'trialing') return true;

  if ((status === 'incomplete' || status === 'past_due') && isIsoFuture(sub.current_period_end)) {
    return true;
  }

  return false;
}

function getLocalProviderSubId(sub: any): string | null {
  const id = sub?.provider_subscription_id || sub?.stripe_subscription_id || null;
  return id ? String(id) : null;
}

function isStripeLocalSub(sub: any): boolean {
  return String(sub?.provider || '').toLowerCase() === 'stripe';
}

function isAppleLocalSub(sub: any): boolean {
  return String(sub?.provider || '').toLowerCase() === 'apple';
}

function getStripeLikeCustomerId(user: any, localSubs: any[]): string | null {
  if (user?.stripe_customer_id) return String(user.stripe_customer_id);

  const subWithCustomer = localSubs.find((s) => s?.stripe_customer_id);
  return subWithCustomer?.stripe_customer_id ? String(subWithCustomer.stripe_customer_id) : null;
}

function parseFrontendIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return unique(
    ids
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .filter((v) => v.startsWith('sub_'))
  );
}

function pickBestLocalRowsToCancel(localSubs: any[], explicitIds: string[]): any[] {
  const activeStripeSubs = localSubs.filter(
    (s) => isStripeLocalSub(s) && localSubGrantsPaidAccess(s) && !!getLocalProviderSubId(s)
  );

  if (explicitIds.length > 0) {
    const explicitSet = new Set(explicitIds);
    const matched = activeStripeSubs.filter((s) => explicitSet.has(String(getLocalProviderSubId(s))));
    if (matched.length > 0) return matched;
  }

  return activeStripeSubs;
}

async function fetchLocalSubscriptions(base44: any, user: any): Promise<any[]> {
  const userId = user?.id || user?.auth_user_id || null;
  const email = normEmail(user?.email);

  let subs: any[] = [];

  if (userId) {
    try {
      const byUserId = await base44.asServiceRole.entities.Subscription.filter({ user_id: userId });
      if (Array.isArray(byUserId) && byUserId.length > 0) subs = byUserId;
    } catch (err) {
      console.warn('[handleBundleUpgrade] Subscription lookup by user_id failed:', err?.message || err);
    }
  }

  if (subs.length === 0 && email) {
    try {
      const byEmail = await base44.asServiceRole.entities.Subscription.filter({ user_email: email });
      if (Array.isArray(byEmail) && byEmail.length > 0) subs = byEmail;
    } catch (err) {
      console.warn('[handleBundleUpgrade] Subscription lookup by email failed:', err?.message || err);
    }
  }

  return Array.isArray(subs) ? subs : [];
}

async function logUpgradeEvent(base44: any, payload: Record<string, unknown>) {
  try {
    await base44.asServiceRole.entities.SubscriptionIntegrationEvent.create(payload);
  } catch (err) {
    console.warn('[handleBundleUpgrade] Failed to log SubscriptionIntegrationEvent:', err?.message || err);
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetBundleType = String(body?.targetBundleType || '').trim() as BundleType;
    const billingPeriod = String(body?.billingPeriod || '').trim();
    const frontendIds = parseFrontendIds(body?.currentSubscriptionIds);

    if (!targetBundleType || !billingPeriod) {
      return Response.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!['bundle_3', 'bundle_4'].includes(targetBundleType)) {
      return Response.json(
        { success: false, error: 'Invalid bundle type' },
        { status: 400 }
      );
    }

    if (!['monthly', 'annual', 'yearly'].includes(billingPeriod)) {
      return Response.json(
        { success: false, error: 'Invalid billing period' },
        { status: 400 }
      );
    }

    const email = normEmail(user.email);
    const localSubs = await fetchLocalSubscriptions(base44, user);
    const appleSubs = localSubs.filter(isAppleLocalSub);
    const stripeLocalSubs = localSubs.filter(isStripeLocalSub);
    const stripeCustomerId = getStripeLikeCustomerId(user, stripeLocalSubs);

    console.log(
      `[handleBundleUpgrade] user=${email} target=${targetBundleType} billing=${billingPeriod} local_subs=${localSubs.length} stripe_local=${stripeLocalSubs.length} apple_local=${appleSubs.length} explicit_ids=${frontendIds.length}`
    );

    if (!stripeCustomerId) {
      return Response.json(
        {
          success: false,
          error: 'No Stripe customer found for this user. Bundle upgrade cannot be prepared.',
          details: {
            hasAppleSubscriptions: appleSubs.length > 0,
            hasLocalStripeSubscriptions: stripeLocalSubs.length > 0,
          },
        },
        { status: 400 }
      );
    }

    const stripe = await getStripeClient(req);

    // Pull real Stripe subscriptions for this customer.
    const stripeList = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      limit: 100,
      expand: ['data.items.data.price'],
    });

    const stripeSubs = Array.isArray(stripeList?.data) ? stripeList.data : [];
    const activeStripeSubs = stripeSubs.filter((sub) => {
      const status = String(sub.status || '').toLowerCase();
      if (status === 'active' || status === 'trialing') return true;
      if ((status === 'past_due' || status === 'incomplete') && sub.current_period_end) {
        return (sub.current_period_end * 1000) > Date.now();
      }
      return false;
    });

    const activeStripeIds = new Set(activeStripeSubs.map((s) => s.id));

    const candidateLocalRows = pickBestLocalRowsToCancel(localSubs, frontendIds);
    let idsToCancel = candidateLocalRows
      .map(getLocalProviderSubId)
      .filter((id): id is string => !!id)
      .filter((id) => activeStripeIds.has(id));

    // Fallback:
    // If local records are missing/bad but frontend passed explicit valid IDs, use those.
    if (idsToCancel.length === 0 && frontendIds.length > 0) {
      idsToCancel = frontendIds.filter((id) => activeStripeIds.has(id));
    }

    // Final fallback:
    // cancel all active Stripe subs for this user if we still have nothing.
    if (idsToCancel.length === 0) {
      idsToCancel = activeStripeSubs.map((s) => s.id);
    }

    idsToCancel = unique(idsToCancel);

    if (idsToCancel.length === 0) {
      await logUpgradeEvent(base44, {
        user_email: email,
        event_type: 'bundle_upgrade_no_cancellable_subscriptions',
        details: {
          targetBundleType,
          billingPeriod,
          stripeCustomerId,
          frontendIds,
          localStripeSubscriptionCount: stripeLocalSubs.length,
          appleSubscriptionCount: appleSubs.length,
          timestamp: new Date().toISOString(),
        },
      });

      return Response.json({
        success: true,
        message: 'No active Stripe subscriptions needed cancellation.',
        cancelledCount: 0,
        cancelledSubscriptions: [],
        ignoredAppleSubscriptions: appleSubs.length,
      });
    }

    const cancelledSubscriptions: Array<Record<string, unknown>> = [];
    const failedCancellations: Array<Record<string, unknown>> = [];

    for (const subId of idsToCancel) {
      try {
        const canceled = await stripe.subscriptions.cancel(subId, {
          prorate: true,
        });

        cancelledSubscriptions.push({
          id: canceled.id,
          status: canceled.status,
          cancel_at_period_end: canceled.cancel_at_period_end,
          canceled_at: canceled.canceled_at
            ? new Date(canceled.canceled_at * 1000).toISOString()
            : new Date().toISOString(),
          current_period_end: canceled.current_period_end
            ? new Date(canceled.current_period_end * 1000).toISOString()
            : null,
        });

        // Update matching local Subscription row if present.
        const matchingLocal = stripeLocalSubs.find(
          (s) => getLocalProviderSubId(s) === subId
        );

        if (matchingLocal?.id) {
          try {
            await base44.asServiceRole.entities.Subscription.update(matchingLocal.id, {
              status: canceled.status || 'canceled',
              cancel_at_period_end: !!canceled.cancel_at_period_end,
              current_period_end: canceled.current_period_end
                ? new Date(canceled.current_period_end * 1000).toISOString()
                : matchingLocal.current_period_end || null,
            });
          } catch (updateErr) {
            console.warn(
              `[handleBundleUpgrade] Failed to update local Subscription row ${matchingLocal.id}:`,
              updateErr?.message || updateErr
            );
          }
        }
      } catch (err) {
        failedCancellations.push({
          id: subId,
          error: safeStripeError(err),
        });
      }
    }

    await logUpgradeEvent(base44, {
      user_email: email,
      event_type: failedCancellations.length === 0
        ? 'bundle_upgrade_initiated'
        : 'bundle_upgrade_partial_cancel',
      details: {
        targetBundleType,
        billingPeriod,
        stripeCustomerId,
        requestedFrontendIds: frontendIds,
        cancelledSubscriptions,
        failedCancellations,
        ignoredAppleSubscriptions: appleSubs
          .map((s) => ({
            id: s.id,
            provider_subscription_id: s.provider_subscription_id || null,
            provider: s.provider || 'apple',
            status: s.status || null,
          })),
        timestamp: new Date().toISOString(),
      },
    });

    if (cancelledSubscriptions.length === 0 && failedCancellations.length > 0) {
      return Response.json(
        {
          success: false,
          error: 'Failed to cancel existing Stripe subscriptions.',
          cancelledCount: 0,
          cancelledSubscriptions: [],
          failedCancellations,
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Bundle upgrade prepared successfully.',
      cancelledCount: cancelledSubscriptions.length,
      cancelledSubscriptions,
      failedCancellations,
      ignoredAppleSubscriptions: appleSubs.length,
      upgradeType: targetBundleType,
      note: 'Proceed to checkout to create the new bundle subscription.',
    });
  } catch (error) {
    console.error('[handleBundleUpgrade] fatal error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});
