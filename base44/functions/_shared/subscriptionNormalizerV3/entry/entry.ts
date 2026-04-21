/**
 * CANONICAL SUBSCRIPTION NORMALIZER V3
 *
 * Single source of truth for normalizing all subscription data across the platform.
 * Used by sync functions, webhooks, repairs, and reporting.
 *
 * Core rules:
 * 1. Every subscription normalizes to a standard shape with all canonical fields
 * 2. Amount + interval mapping infers unknown products
 * 3. Renewal dates are inferred when explicit fields are missing
 * 4. Row quality is assessed (trusted/inferred/exception)
 * 5. Unknown products are minimized via inference; true exceptions are rare
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type BillingInterval = 'monthly' | 'annual';
export type Provider = 'stripe' | 'apple' | 'google' | 'web';
export type Product = 'pipekeeper' | 'whiskeykeeper' | 'cigarkeeper' | 'winekeeper' | 'bundle';
export type RowQuality = 'trusted' | 'inferred' | 'exception';

export interface CanonicalSubscription {
  // Identity
  rawId: string;
  userId: string;
  userEmail: string;
  provider: Provider;

  // Status & timing
  status: string;
  isPaid: boolean;
  isActive: boolean;
  createdAt: Date | null;
  renewalAt: Date | null;
  renewalAmountInferred: boolean;

  // Billing
  billingInterval: BillingInterval | null;
  amount: number;
  amountInferred: boolean;
  currency: string;

  // Product & modules
  product: Product | 'unknown';
  productInferred: boolean;
  modules: string[];
  bundleName: string | null;

  // Data quality
  quality: RowQuality;
  issues: string[];
}

// ─── Plan catalog ─────────────────────────────────────────────────────────────

const PLAN_CATALOG: Record<string, { modules: string[]; interval: BillingInterval; amount: number }> = {
  pipekeeper_premium_monthly: { modules: ['pipekeeper'], interval: 'monthly', amount: 1.99 },
  pipekeeper_premium_annual: { modules: ['pipekeeper'], interval: 'annual', amount: 19.99 },
  pipekeeper_pro_monthly: { modules: ['pipekeeper'], interval: 'monthly', amount: 2.99 },
  pipekeeper_pro_annual: { modules: ['pipekeeper'], interval: 'annual', amount: 29.99 },
  whiskeykeeper_premium_monthly: { modules: ['whiskeykeeper'], interval: 'monthly', amount: 1.99 },
  whiskeykeeper_premium_annual: { modules: ['whiskeykeeper'], interval: 'annual', amount: 19.99 },
  whiskeykeeper_pro_monthly: { modules: ['whiskeykeeper'], interval: 'monthly', amount: 2.99 },
  whiskeykeeper_pro_annual: { modules: ['whiskeykeeper'], interval: 'annual', amount: 29.99 },
  cigarkeeper_pro_monthly: { modules: ['cigarkeeper'], interval: 'monthly', amount: 2.99 },
  cigarkeeper_pro_annual: { modules: ['cigarkeeper'], interval: 'annual', amount: 29.99 },
  winekeeper_pro_monthly: { modules: ['winekeeper'], interval: 'monthly', amount: 2.99 },
  winekeeper_pro_annual: { modules: ['winekeeper'], interval: 'annual', amount: 29.99 },
  founders_bundle_monthly: { modules: ['pipekeeper', 'whiskeykeeper'], interval: 'monthly', amount: 4.99 },
  founders_bundle_annual: { modules: ['pipekeeper', 'whiskeykeeper'], interval: 'annual', amount: 49.99 },
  three_module_bundle_monthly: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], interval: 'monthly', amount: 7.99 },
  three_module_bundle_annual: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], interval: 'annual', amount: 79.99 },
  four_module_bundle_monthly: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], interval: 'monthly', amount: 8.99 },
  four_module_bundle_annual: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], interval: 'annual', amount: 89.99 },
};

// ─── Amount-based inference ───────────────────────────────────────────────────

function inferFromAmount(
  amount: number,
): { modules: string[]; interval: BillingInterval; bundleName: string | null; inferred: boolean } | null {
  const a = parseFloat(Number(amount).toFixed(2));
  if (a === 1.99) return { modules: [], interval: 'monthly', bundleName: null, inferred: true };
  if (a === 19.99) return { modules: [], interval: 'annual', bundleName: null, inferred: true };
  if (a === 2.99) return { modules: [], interval: 'monthly', bundleName: null, inferred: true };
  if (a === 29.99) return { modules: [], interval: 'annual', bundleName: null, inferred: true };
  if (a === 4.99) return { modules: ['pipekeeper', 'whiskeykeeper'], interval: 'monthly', bundleName: 'Founders', inferred: true };
  if (a === 49.99) return { modules: ['pipekeeper', 'whiskeykeeper'], interval: 'annual', bundleName: 'Founders', inferred: true };
  if (a === 7.99) return { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], interval: 'monthly', bundleName: '3-Module', inferred: true };
  if (a === 79.99) return { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], interval: 'annual', bundleName: '3-Module', inferred: true };
  if (a === 8.99) return { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], interval: 'monthly', bundleName: '4-Module', inferred: true };
  if (a === 89.99) return { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], interval: 'annual', bundleName: '4-Module', inferred: true };
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function norm(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeInterval(raw: Record<string, unknown>): BillingInterval | null {
  const v = norm(raw.billing_interval || raw.billing_period || '');
  if (v === 'month' || v === 'monthly') return 'monthly';
  if (v === 'year' || v === 'yearly' || v === 'annual') return 'annual';
  return null;
}

function splitModules(csv: unknown): string[] {
  return String(csv || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
}

function detectProvider(raw: Record<string, unknown>): Provider {
  const p = norm(raw.provider || '');
  if (p === 'stripe') return 'stripe';
  if (p === 'apple' || p === 'ios' || raw.apple_product_id) return 'apple';
  if (p === 'google' || p === 'android' || p === 'googleplay') return 'google';
  if (raw.stripe_subscription_id || raw.stripe_price_id) return 'stripe';
  return 'web';
}

function isActivePaid(raw: Record<string, unknown>, now: Date): boolean {
  const status = norm(raw.status || '');
  if (!['active', 'trialing', 'past_due'].includes(status)) return false;
  const end = parseDate(raw.current_period_end);
  if (end && end <= now) return false;
  return true;
}

// ─── Product classification ───────────────────────────────────────────────────

function classifyProduct(raw: Record<string, unknown>): { product: Product | 'unknown'; inferred: boolean } {
  // 1. modules_csv
  for (const m of splitModules(raw.modules_csv)) {
    if (m === 'pipekeeper' || m === 'whiskeykeeper' || m === 'cigarkeeper' || m === 'winekeeper') {
      return { product: m as Product, inferred: false };
    }
  }

  // 2. product_kind
  const pk = norm(raw.product_kind || '');
  if (['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].includes(pk)) {
    return { product: pk as Product, inferred: false };
  }
  if (pk === 'bundle') return { product: 'bundle', inferred: false };

  // 3. bundle signals
  const bundleFields = [raw.bundle_name, raw.checkout_type, raw.plan_name, raw.name].map(norm);
  if (bundleFields.some((f) => f.includes('bundle') || f.includes('founders'))) {
    return { product: 'bundle', inferred: false };
  }

  // 4. Amount inference (bundles resolve to exact modules)
  const amount = Math.max(0, Number(raw.amount || 0));
  const inference = amount > 0 ? inferFromAmount(amount) : null;
  if (inference?.modules && inference.modules.length > 0) {
    return { product: inference.modules.length > 1 ? 'bundle' : (inference.modules[0] as Product), inferred: true };
  }

  return { product: 'unknown', inferred: false };
}

// ─── Renewal date inference ───────────────────────────────────────────────────

function inferRenewalDate(raw: Record<string, unknown>, billingInterval: BillingInterval | null): Date | null {
  // 1. Explicit current_period_end
  const explicit = parseDate(raw.current_period_end);
  if (explicit) return explicit;

  // 2. Infer from current_period_start + interval
  const start = parseDate(raw.current_period_start || raw.started_at || raw.created_date);
  if (start && billingInterval) {
    const renewal = new Date(start);
    if (billingInterval === 'monthly') renewal.setMonth(renewal.getMonth() + 1);
    else renewal.setFullYear(renewal.getFullYear() + 1);
    return renewal;
  }

  return null;
}

// ─── Main normalizer ──────────────────────────────────────────────────────────

export function normalizeSub(raw: Record<string, unknown>, now: Date = new Date()): CanonicalSubscription {
  const issues: string[] = [];
  const status = norm(raw.status || '');
  const provider = detectProvider(raw);
  const isPaid = isActivePaid(raw, now);

  const rawId = String(raw.id || raw.provider_subscription_id || raw.stripe_subscription_id || '');
  const userId = String(raw.user_id || '');
  const userEmail = norm(raw.user_email || '');

  // Billing interval
  const billingInterval = normalizeInterval(raw as Record<string, unknown>);

  // Amount
  const rawAmount = Math.max(0, Number(raw.amount || 0));
  const amountInferred = rawAmount === 0;
  if (amountInferred) issues.push('amount_missing');

  // Product classification
  const { product, inferred: productInferred } = classifyProduct(raw);
  if (product === 'unknown') {
    issues.push('product_unknown');
  } else if (productInferred) {
    issues.push('product_inferred_from_amount');
  }

  // Modules
  let modules: string[] = [];
  let bundleName: string | null = null;
  if (product !== 'unknown') {
    if (product === 'bundle') {
      const amount = Math.max(0, Number(raw.amount || 0));
      const inference = amount > 0 ? inferFromAmount(amount) : null;
      if (inference?.modules) {
        modules = inference.modules;
        bundleName = inference.bundleName;
      } else {
        modules = splitModules(raw.modules_csv);
        bundleName = norm(raw.bundle_name || '');
      }
    } else {
      modules = [product];
    }
  }

  // Renewal date
  const renewalAt = inferRenewalDate(raw, billingInterval);
  const renewalAmountInferred = !raw.current_period_end;

  // Row quality assessment
  let quality: RowQuality = 'trusted';
  if (productInferred) quality = 'inferred';
  if (product === 'unknown' || (billingInterval === null && isPaid)) quality = 'exception';

  return {
    rawId,
    userId,
    userEmail,
    provider,
    status,
    isPaid,
    isActive: isPaid,
    createdAt: parseDate(raw.created_date || raw.started_at),
    renewalAt,
    renewalAmountInferred,
    billingInterval,
    amount: rawAmount,
    amountInferred,
    currency: norm(raw.currency || 'usd'),
    product,
    productInferred,
    modules,
    bundleName,
    quality,
    issues,
  };
}