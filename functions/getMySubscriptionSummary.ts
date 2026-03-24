import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@17.5.0';

const APP_URL = (Deno.env.get('APP_URL') || 'https://pipekeeper.app').trim();

function normEmail(email: string | null | undefined) {
  return String(email || '').trim().toLowerCase();
}

function isRealStripeId(value: string | null | undefined, prefix: string) {
  const id = String(value || '').trim();
  return id.startsWith(prefix) && !id.startsWith(`test_${prefix}`);
}

function qualifiesForAccess(sub: any) {
  const status = String(sub?.status || '').toLowerCase();
  if (status === 'active' || status === 'trialing' || status === 'past_due') return true;
  if (status === 'incomplete') {
    const periodEnd = sub?.current_period_end;
    return periodEnd && new Date(periodEnd) > new Date();
  }
  return false;
}

function statusRank(status: string | null | undefined) {
  switch (String(status || '').toLowerCase()) {
    case 'active': return 4;
    case 'trialing': return 3;
    case 'past_due': return 2;
    case 'incomplete': return 1;
    default: return 0;
  }
}

function parseModulesCsv(value: string | null | undefined) {
  return String(value || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
}

function pickPrimary(subs: any[]) {
  if (!Array.isArray(subs) || !subs.length) return null;

  const filtered = subs.filter((s) => qualifiesForAccess(s));
  if (!filtered.length) return null;

  filtered.sort((a, b) => {
    const sr = statusRank(b?.status) - statusRank(a?.status);
    if (sr !== 0) return sr;

    const aRealCustomer = isRealStripeId(a?.stripe_customer_id, 'cus_') ? 1 : 0;
    const bRealCustomer = isRealStripeId(b?.stripe_customer_id, 'cus_') ? 1 : 0;
    if (bRealCustomer !== aRealCustomer) return bRealCustomer - aRealCustomer;

    const aEnd = new Date(a?.current_period_end || 0).getTime();
    const bEnd = new Date(b?.current_period_end || 0).getTime();
    if (bEnd !== aEnd) return bEnd - aEnd;

    const aUpdated = new Date(a?.updated_date || a?.updated_at || a?.created_date || 0).getTime();
    const bUpdated = new Date(b?.updated_date || b?.updated_at || b?.created_date || 0).getTime();
    return bUpdated - aUpdated;
  });

  return filtered[0];
}

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me?.email) {
      return new Response(JSON.stringify({ ok: false, error: 'UNAUTHENTICATED' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    const email = normEmail(me.email);
    const userId = me.id;

    let allSubs: any[] = [];
    if (userId) {
      const byUserId = await base44.entities.Subscription.filter({ user_id: userId });
      allSubs = byUserId || [];
    }

    if (allSubs.length === 0) {
      const byEmail = await base44.entities.Subscription.filter({ user_email: email, provider: 'stripe' });
      allSubs = byEmail || [];
    }

    const stripeSubs = (allSubs || []).filter((s) => s.provider === 'stripe');
    const appleSubs = (allSubs || []).filter((s) => s.provider === 'apple');
    const primarySub = pickPrimary(allSubs);

    const isPaid = !!primarySub;
    const provider = primarySub?.provider || null;
    const tier = primarySub?.tier || me?.entitlement_tier || null;
    const status = primarySub?.status || null;
    const expiresAt = primarySub?.current_period_end || null;
    const planKey = primarySub?.plan_key || primarySub?.planKey || primarySub?.plan || null;

    const modulesCsv =
      primarySub?.modules_csv ||
      primarySub?.paid_modules_csv ||
      primarySub?.metadata?.modules_csv ||
      me?.paid_modules_csv ||
      '';

    let manageUrl = null;
    let warning = null;

    if (provider === 'stripe' && primarySub) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
      if (!stripeKey.startsWith('sk_')) {
        warning = 'Stripe is not configured correctly. Please contact support.';
      } else {
        const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

        const primaryCustomerId = isRealStripeId(primarySub?.stripe_customer_id, 'cus_') ? primarySub.stripe_customer_id : null;
        const userCustomerId = isRealStripeId(me?.stripe_customer_id, 'cus_') ? me.stripe_customer_id : null;
        const activeStripeCustomerId =
          primaryCustomerId ||
          (stripeSubs.find((s) => qualifiesForAccess(s) && isRealStripeId(s?.stripe_customer_id, 'cus_'))?.stripe_customer_id ?? null) ||
          userCustomerId ||
          null;

        if (activeStripeCustomerId) {
          try {
            const session = await stripe.billingPortal.sessions.create({
              customer: activeStripeCustomerId,
              return_url: APP_URL,
            });
            manageUrl = session.url;
          } catch (e: any) {
            console.warn('[getMySubscriptionSummary] Failed to create portal session:', e?.message || e);
            warning = 'Unable to generate management URL. Please contact support.';
          }
        } else {
          warning = 'No active Stripe customer ID found. Please contact support.';
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        isPaid,
        provider,
        tier,
        status,
        expiresAt,
        planKey,
        modulesCsv,
        manageUrl,
        warning,
        hasRealStripeCustomer: isRealStripeId(primarySub?.stripe_customer_id || me?.stripe_customer_id, 'cus_'),
        stripeSubscriptionCount: stripeSubs.length,
        appleSubscriptionCount: appleSubs.length,
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[getMySubscriptionSummary] error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'SUBSCRIPTION_FETCH_FAILED',
        message: String(error?.message || error),
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
});
