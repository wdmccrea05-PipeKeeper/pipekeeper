/**
 * Create Stripe checkout sessions for module and bundle purchases.
 *
 * Goals:
 * - Be explicit and deterministic about what the user is buying
 * - Stamp metadata on both the Checkout Session and resulting Subscription
 * - Support single-module and bundle purchases
 * - Support monthly and annual billing
 * - Support upgrade flows with safe metadata markers
 *
 * Expected input:
 * {
 *   type: 'single' | 'bundle_2' | 'bundle_3' | 'bundle_4',
 *   modules: string[],
 *   billingPeriod: 'monthly' | 'annual' | 'yearly',
 *   successUrl: string,
 *   cancelUrl: string
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@13.11.0';
import { shouldBlockNewSubscription } from '../../shared/duplicateSubscriptionGuard.ts';

function getStripeClient() {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key);
}

function safeStripeError(e: any): string {
  if (!e) return 'Unknown Stripe error';
  if (typeof e === 'string') return e;
  if (e.message) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

type CheckoutType = 'single' | 'bundle_2' | 'bundle_3' | 'bundle_4';
type BillingPeriod = 'monthly' | 'annual';

// Accept both short ('whiskey') and full ('whiskeykeeper') module keys
const ALLOWED_MODULES = [
  'pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper',
  'pipe', 'whiskey', 'cigar', 'wine',
] as const;

// Normalize module key to canonical keeper form
function canonicalModule(m: string): string {
  const map: Record<string, string> = {
    pipe: 'pipekeeper',
    whiskey: 'whiskeykeeper',
    cigar: 'cigarkeeper',
    wine: 'winekeeper',
    coffee: 'pipekeeper', // fallback
  };
  return map[m] || m;
}

// Per-module single price IDs
const SINGLE_MODULE_PRICES: Record<string, Record<BillingPeriod, string | undefined>> = {
  pipekeeper: {
    monthly: Deno.env.get('VITE_STRIPE_PIPEKEEPER_MONTHLY'),
    annual: Deno.env.get('VITE_STRIPE_PIPEKEEPER_ANNUAL'),
  },
  whiskeykeeper: {
    monthly: Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_MONTHLY'),
    annual: Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_ANNUAL'),
  },
  cigarkeeper: {
    monthly: Deno.env.get('VITE_STRIPE_CIGARKEEPER_MONTHLY'),
    annual: Deno.env.get('VITE_STRIPE_CIGARKEEPER_ANNUAL'),
  },
  winekeeper: {
    monthly: Deno.env.get('VITE_STRIPE_WINEKEEPER_MONTHLY'),
    annual: Deno.env.get('VITE_STRIPE_WINEKEEPER_ANNUAL'),
  },
};

// Bundle price IDs
const BUNDLE_PRICES: Partial<Record<CheckoutType, Record<BillingPeriod, string | undefined>>> = {
  bundle_3: {
    monthly: Deno.env.get('VITE_STRIPE_THREE_BUNDLE_MONTHLY'),
    annual: Deno.env.get('VITE_STRIPE_THREE_BUNDLE_ANNUAL'),
  },
  bundle_4: {
    monthly: Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_MONTHLY'),
    annual: Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_ANNUAL'),
  },
};

function resolvePriceId(type: CheckoutType, billingPeriod: BillingPeriod, modules: string[]): string | undefined {
  if (type === 'single') {
    const moduleKey = canonicalModule(modules[0] || '');
    return SINGLE_MODULE_PRICES[moduleKey]?.[billingPeriod];
  }
  return BUNDLE_PRICES[type]?.[billingPeriod];
}

function normEmail(email: unknown): string {
  return String(email || '').trim().toLowerCase();
}

function normalizeBillingPeriod(value: unknown): BillingPeriod | null {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'monthly') return 'monthly';
  if (raw === 'annual' || raw === 'yearly') return 'annual';
  return null;
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function normalizeModules(modules: unknown): string[] {
  if (!Array.isArray(modules)) return [];
  return unique(
    modules
      .map((m) => canonicalModule(String(m || '').trim().toLowerCase()))
      .filter(Boolean)
      .filter((m) => Object.keys(SINGLE_MODULE_PRICES).includes(m))
  );
}

function inferTypeFromModules(modules: string[]): CheckoutType | null {
  if (modules.length === 1) return 'single';
  if (modules.length === 2) return 'bundle_2';
  if (modules.length === 3) return 'bundle_3';
  if (modules.length === 4) return 'bundle_4';
  return null;
}

function normalizeType(inputType: unknown, modules: string[]): CheckoutType | null {
  const raw = String(inputType || '').trim().toLowerCase();

  if (raw === 'single') return modules.length === 1 ? 'single' : null;
  if (raw === 'bundle_2') return modules.length === 2 ? 'bundle_2' : null;
  if (raw === 'bundle_3') return modules.length === 3 ? 'bundle_3' : null;
  if (raw === 'bundle_4') return modules.length === 4 ? 'bundle_4' : null;

  return inferTypeFromModules(modules);
}

function getModuleDescriptor(type: CheckoutType, modules: string[]) {
  if (type === 'single') {
    return {
      productKind: 'single_module',
      primaryModule: modules[0] || '',
      moduleCount: '1',
      bundleName: '',
    };
  }

  return {
    productKind: 'bundle',
    primaryModule: '',
    moduleCount: String(modules.length),
    bundleName: type,
  };
}

function resolveCheckoutAppSlug(type: CheckoutType, modules: string[]): string {
  const allowedAppSlugs = new Set(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
  const candidate = String(modules[0] || '').trim().toLowerCase();
  if (type === 'single' && allowedAppSlugs.has(candidate)) {
    return candidate;
  }
  return 'pipekeeper';
}

function getBaseUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}`;
}

function assertSafeRedirectUrl(successUrl: string, cancelUrl: string) {
  const success = new URL(successUrl);
  const cancel = new URL(cancelUrl);

  if (!['http:', 'https:'].includes(success.protocol) || !['http:', 'https:'].includes(cancel.protocol)) {
    throw new Error('Invalid redirect URL protocol.');
  }

  const successBase = getBaseUrl(successUrl);
  const cancelBase = getBaseUrl(cancelUrl);

  if (successBase !== cancelBase) {
    throw new Error('Success and cancel URLs must share the same origin.');
  }
}

async function findOrCreateStripeCustomer(base44: any, stripe: any, user: any, appSlug: string, appEnvironment: string) {
  const email = normEmail(user?.email);
  if (!email) {
    throw new Error('User email is required.');
  }

  if (user?.stripe_customer_id) {
    return {
      stripeCustomerId: String(user.stripe_customer_id),
      source: 'user_record',
    };
  }

  const candidates: any[] = [];

  try {
    const subsByUserId = user?.id
      ? await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id })
      : [];
    if (Array.isArray(subsByUserId)) candidates.push(...subsByUserId);
  } catch (err) {
    console.warn('[createModuleCheckoutSession] Subscription lookup by user_id failed:', err);
  }

  try {
    const subsByEmail = await base44.asServiceRole.entities.Subscription.filter({ user_email: email });
    if (Array.isArray(subsByEmail)) candidates.push(...subsByEmail);
  } catch (err) {
    console.warn('[createModuleCheckoutSession] Subscription lookup by email failed:', err);
  }

  const customerIdFromSub =
    candidates.find((s) => s?.stripe_customer_id)?.stripe_customer_id ||
    candidates.find((s) => s?.customer_id)?.customer_id ||
    null;

  if (customerIdFromSub) {
    return {
      stripeCustomerId: String(customerIdFromSub),
      source: 'subscription_row',
    };
  }

  const existing = await stripe.customers.list({
    email,
    limit: 10,
  });

  const matchedCustomer = existing?.data?.find((c: any) => normEmail(c.email) === email) || null;

  if (matchedCustomer?.id) {
    return {
      stripeCustomerId: String(matchedCustomer.id),
      source: 'stripe_lookup',
    };
  }

  const created = await stripe.customers.create({
    email,
    metadata: {
      user_id: String(user?.id || ''),
      auth_user_id: String(user?.auth_user_id || ''),
      email,
      app: appSlug,
      app_slug: appSlug,
      app_environment: appEnvironment,
      legacy_app_slug: 'collectionkeeper',
      app_aliases: 'pipekeeper,collectionkeeper',
    },
  });

  return {
    stripeCustomerId: String(created.id),
    source: 'stripe_created',
  };
}

async function logCheckoutEvent(base44: any, payload: Record<string, unknown>) {
  try {
    await base44.asServiceRole.entities.SubscriptionIntegrationEvent.create({
      success: true,
      event_source: 'createModuleCheckoutSession',
      ...payload,
    });
  } catch (err) {
    console.warn('[createModuleCheckoutSession] Failed to log event:', err);
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const stripe = getStripeClient();
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const modules = normalizeModules(body?.modules);
    const billingPeriod = normalizeBillingPeriod(body?.billingPeriod);
    const type = normalizeType(body?.type, modules);
    const successUrl = String(body?.successUrl || '').trim();
    const cancelUrl = String(body?.cancelUrl || '').trim();

    if (!modules.length) {
      return Response.json({ error: 'At least one valid module is required.' }, { status: 400 });
    }

    if (!billingPeriod) {
      return Response.json({ error: 'Invalid billing period.' }, { status: 400 });
    }

    if (!type) {
      return Response.json({ error: 'Invalid checkout type for selected modules.' }, { status: 400 });
    }

    if (!successUrl || !cancelUrl) {
      return Response.json({ error: 'Missing redirect URLs.' }, { status: 400 });
    }

    assertSafeRedirectUrl(successUrl, cancelUrl);

    const moduleDescriptor = getModuleDescriptor(type, modules);
    const appSlug = resolveCheckoutAppSlug(type, modules);
    const appEnvironment =
      String(Deno.env.get('APP_ENV') || Deno.env.get('ENVIRONMENT') || 'production').trim().toLowerCase();
    const priceId = resolvePriceId(type, billingPeriod, modules);

    if (!priceId) {
      return Response.json(
        {
          error: `Missing Stripe price configuration for ${type} / ${billingPeriod}.`,
        },
        { status: 500 }
      );
    }

    const { stripeCustomerId, source: customerSource } = await findOrCreateStripeCustomer(
      base44,
      stripe,
      user,
      appSlug,
      appEnvironment
    );

    const userId = String(user?.id || '');
    const authUserId = String(user?.auth_user_id || '');
    const email = normEmail(user.email);
    const modulesCsv = modules.join(',');
    const appAliases = Array.from(
      new Set(['collectionkeeper', 'pipekeeper', ...modules])
    ).join(',');
    const requestId = crypto.randomUUID();
    const isUpgradeIntent = type.startsWith('bundle') ? 'true' : 'false';

    const metadata: Record<string, string> = {
      app: appSlug,
      app_slug: appSlug,
      app_environment: appEnvironment,
      legacy_app_slug: 'collectionkeeper',
      app_aliases: appAliases,
      request_id: requestId,
      user_id: userId,
      auth_user_id: authUserId,
      user_email: email,
      checkout_type: type,
      billing_period: billingPeriod,
      modules_csv: modulesCsv,
      product_kind: moduleDescriptor.productKind,
      primary_module: moduleDescriptor.primaryModule,
      module_count: moduleDescriptor.moduleCount,
      bundle_name: moduleDescriptor.bundleName,
      upgrade_intent: isUpgradeIntent,
      initiated_from: 'module_upgrade_flow',
    };

    // ── Duplicate Subscription Guard (scope-aware) ──
    // Pass the FULL module array so the guard can identify bundle upgrades
    // (e.g., PipeKeeper single → 3-module bundle is an upgrade, not a duplicate)
    try {
      const byEmail = await base44.asServiceRole.entities.Subscription.filter({ user_email: email }, '-created_date', 50);
      const byUserId = userId ? await base44.asServiceRole.entities.Subscription.filter({ user_id: userId }, '-created_date', 50) : [];
      const existingSubs = [...new Map([...byEmail, ...byUserId].map((s: any) => [s.id, s])).values()];

      const guardResult = shouldBlockNewSubscription(existingSubs, billingPeriod, modules);
      if (guardResult.block) {
        console.warn(`[createModuleCheckoutSession] Blocked duplicate checkout for ${email} modules=[${modules.join(',')}]: ${guardResult.reason}`);
        return Response.json({
          success: false,
          error: `You already have an active subscription covering one or more of these modules (${modules.join(', ')}). Please manage your existing plan in subscription settings, or contact support if you believe this is an error.`,
          duplicate_block: true,
          existing_subscription_id: guardResult.existingSubscriptionId,
        }, { status: 409 });
      }
    } catch (e: any) {
      console.warn('[createModuleCheckoutSession] Duplicate guard check failed (non-blocking):', e?.message);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      success_url: successUrl.includes('?')
        ? `${successUrl}&session_id={CHECKOUT_SESSION_ID}`
        : `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata,
      subscription_data: {
        metadata: {
          ...metadata,
          source: 'createModuleCheckoutSession',
        },
      },
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });

    await logCheckoutEvent(base44, {
      user_email: email,
      event_type: 'checkout_session_created',
      details: {
        requestId,
        stripeCustomerId,
        customerSource,
        checkoutSessionId: session.id,
        checkoutType: type,
        billingPeriod,
        modules,
        priceId,
        successUrl,
        cancelUrl,
        createdAt: new Date().toISOString(),
      },
    });

    return Response.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      stripeCustomerId,
      checkoutType: type,
      billingPeriod,
      modules,
    });
  } catch (error) {
    console.error('[createModuleCheckoutSession] fatal error:', error);

    const message =
      error instanceof Error ? error.message : safeStripeError(error);

    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
});