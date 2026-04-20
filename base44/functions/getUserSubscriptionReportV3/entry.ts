import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const REPORT_VERSION = 'v3.2';
const MAX_SAMPLE_SIZE = 25;

// ─── Types ────────────────────────────────────────────────────────────────────

type IntervalKind = 'monthly' | 'annual';
type PlatformKind = 'ios' | 'web' | 'google';

interface NormalizedSub {
  rawId: string;
  userId: string;
  userEmail: string;
  isPaid: boolean;
  subscriptionStatus: string;
  planKey: string | null;
  billingInterval: IntervalKind | null;
  price: number | null;
  renewalAmount: number | null;   // actual renewal charge (same as price for most cases)
  createdAt: Date | null;
  renewalAt: Date | null;
  module: string;
  modules: string[];
  platform: PlatformKind | null;
  productLabel: string;           // human-readable product name
  fieldResolution?: {
    price: 'direct' | 'recovered' | 'unresolved';
    billingInterval: 'direct' | 'recovered' | 'unresolved';
    planKey: 'direct' | 'recovered' | 'unresolved';
    sources: {
      price: string;
      billingInterval: string;
      planKey: string;
    };
  };
}

interface CalendarRange {
  start: Date;
  end: Date;
}

// ─── Plan catalog ─────────────────────────────────────────────────────────────
// Single source of truth for plan → modules, interval, price.
// Founders = PipeKeeper + WhiskeyKeeper only ($4.99/mo, $49.99/yr).
// Original premium = legacy plans at $1.99/mo, $19.99/yr (single module).
// Pro = current plans at $2.99/mo, $29.99/yr (single module).

const PLAN_CATALOG: Record<string, { modules: string[]; billingInterval: IntervalKind; price: number; label: string }> = {
  // ── Legacy "premium" single-module plans ──────────────────────────────────
  pipekeeper_premium_monthly:    { modules: ['pipekeeper'],              billingInterval: 'monthly', price: 1.99,  label: 'PipeKeeper (Legacy)'           },
  pipekeeper_premium_annual:     { modules: ['pipekeeper'],              billingInterval: 'annual',  price: 19.99, label: 'PipeKeeper (Legacy Annual)'    },
  whiskeykeeper_premium_monthly: { modules: ['whiskeykeeper'],           billingInterval: 'monthly', price: 1.99,  label: 'WhiskeyKeeper (Legacy)'        },
  whiskeykeeper_premium_annual:  { modules: ['whiskeykeeper'],           billingInterval: 'annual',  price: 19.99, label: 'WhiskeyKeeper (Legacy Annual)' },

  // ── Current "pro" single-module plans ─────────────────────────────────────
  pipekeeper_pro_monthly:        { modules: ['pipekeeper'],              billingInterval: 'monthly', price: 2.99,  label: 'PipeKeeper Pro' },
  pipekeeper_pro_annual:         { modules: ['pipekeeper'],              billingInterval: 'annual',  price: 29.99, label: 'PipeKeeper Pro Annual' },
  whiskeykeeper_pro_monthly:     { modules: ['whiskeykeeper'],           billingInterval: 'monthly', price: 2.99,  label: 'WhiskeyKeeper Pro' },
  whiskeykeeper_pro_annual:      { modules: ['whiskeykeeper'],           billingInterval: 'annual',  price: 29.99, label: 'WhiskeyKeeper Pro Annual' },
  cigarkeeper_pro_monthly:       { modules: ['cigarkeeper'],             billingInterval: 'monthly', price: 2.99,  label: 'CigarKeeper Pro' },
  cigarkeeper_pro_annual:        { modules: ['cigarkeeper'],             billingInterval: 'annual',  price: 29.99, label: 'CigarKeeper Pro Annual' },
  winekeeper_pro_monthly:        { modules: ['winekeeper'],              billingInterval: 'monthly', price: 2.99,  label: 'WineKeeper Pro' },
  winekeeper_pro_annual:         { modules: ['winekeeper'],              billingInterval: 'annual',  price: 29.99, label: 'WineKeeper Pro Annual' },

  // ── Founders bundle: PipeKeeper + WhiskeyKeeper ONLY ($4.99/mo, $49.99/yr) ─
  // Canonical definition: 2 modules. Do NOT map founders to 4 modules.
  founders_bundle_monthly:       { modules: ['pipekeeper','whiskeykeeper'], billingInterval: 'monthly', price: 4.99,  label: 'Founders Bundle (PK+WK)' },
  founders_bundle_annual:        { modules: ['pipekeeper','whiskeykeeper'], billingInterval: 'annual',  price: 49.99, label: 'Founders Bundle Annual (PK+WK)' },

  // ── Larger bundles ────────────────────────────────────────────────────────
  three_module_bundle_monthly:   { modules: ['pipekeeper','whiskeykeeper','cigarkeeper'],            billingInterval: 'monthly', price: 7.99,  label: '3-Module Bundle' },
  three_module_bundle_annual:    { modules: ['pipekeeper','whiskeykeeper','cigarkeeper'],            billingInterval: 'annual',  price: 79.99, label: '3-Module Bundle Annual' },
  four_module_bundle_monthly:    { modules: ['pipekeeper','whiskeykeeper','cigarkeeper','winekeeper'], billingInterval: 'monthly', price: 8.99,  label: '4-Module Bundle' },
  four_module_bundle_annual:     { modules: ['pipekeeper','whiskeykeeper','cigarkeeper','winekeeper'], billingInterval: 'annual',  price: 89.99, label: '4-Module Bundle Annual' },
};

const HISTORICAL_PLAN_KEY_MAP: Record<string, string> = {
  pipekeeper_monthly: 'pipekeeper_pro_monthly',
  pipekeeper_annual: 'pipekeeper_pro_annual',
  pipekeeper_yearly: 'pipekeeper_pro_annual',
  whiskeykeeper_monthly: 'whiskeykeeper_pro_monthly',
  whiskeykeeper_annual: 'whiskeykeeper_pro_annual',
  whiskeykeeper_yearly: 'whiskeykeeper_pro_annual',
  cigarkeeper_monthly: 'cigarkeeper_pro_monthly',
  cigarkeeper_annual: 'cigarkeeper_pro_annual',
  cigarkeeper_yearly: 'cigarkeeper_pro_annual',
  winekeeper_monthly: 'winekeeper_pro_monthly',
  winekeeper_annual: 'winekeeper_pro_annual',
  winekeeper_yearly: 'winekeeper_pro_annual',
  founders_monthly: 'founders_bundle_monthly',
  founders_annual: 'founders_bundle_annual',
  founders_yearly: 'founders_bundle_annual',
  bundle_2_monthly: 'founders_bundle_monthly',
  bundle_2_annual: 'founders_bundle_annual',
  bundle_3_monthly: 'three_module_bundle_monthly',
  bundle_3_annual: 'three_module_bundle_annual',
  bundle_4_monthly: 'four_module_bundle_monthly',
  bundle_4_annual: 'four_module_bundle_annual',
  three_bundle_monthly: 'three_module_bundle_monthly',
  three_bundle_annual: 'three_module_bundle_annual',
  four_bundle_monthly: 'four_module_bundle_monthly',
  four_bundle_annual: 'four_module_bundle_annual',
};

function canonicalizePlanKeyCandidate(value: unknown): string | null {
  const token = norm(value || '');
  if (!token) return null;
  if (PLAN_CATALOG[token]) return token;
  if (HISTORICAL_PLAN_KEY_MAP[token]) return HISTORICAL_PLAN_KEY_MAP[token];
  return null;
}

function lookupPlan(planKey: string | null) {
  if (!planKey) return null;
  return PLAN_CATALOG[planKey.trim().toLowerCase()] ?? null;
}

// ─── Amount-based plan inference ──────────────────────────────────────────────
// Valid prices: 1.99/19.99, 2.99/29.99, 4.99/49.99, 7.99/79.99, 8.99/89.99
// INVALID: 9.99/99.99 — do not infer from these amounts.

interface AmountInference {
  billingInterval: IntervalKind;
  modules: string[] | null; // null for singles (module can't be determined from price alone)
  isBundle: boolean;
  label: string;
}

function inferFromAmount(amount: number): AmountInference | null {
  const a = parseFloat(Number(amount).toFixed(2));
  // Single-module plans: interval known, module unknown
  if (a === 1.99)  return { billingInterval: 'monthly', modules: null, isBundle: false, label: 'Legacy Premium' };
  if (a === 19.99) return { billingInterval: 'annual',  modules: null, isBundle: false, label: 'Legacy Premium Annual' };
  if (a === 2.99)  return { billingInterval: 'monthly', modules: null, isBundle: false, label: 'Pro' };
  if (a === 29.99) return { billingInterval: 'annual',  modules: null, isBundle: false, label: 'Pro Annual' };
  // Founders bundle: PK + WK ONLY (2 modules)
  if (a === 4.99)  return { billingInterval: 'monthly', modules: ['pipekeeper', 'whiskeykeeper'], isBundle: true, label: 'Founders Bundle (PK+WK)' };
  if (a === 49.99) return { billingInterval: 'annual',  modules: ['pipekeeper', 'whiskeykeeper'], isBundle: true, label: 'Founders Bundle Annual (PK+WK)' };
  // 3-module bundle
  if (a === 7.99)  return { billingInterval: 'monthly', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], isBundle: true, label: '3-Module Bundle' };
  if (a === 79.99) return { billingInterval: 'annual',  modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], isBundle: true, label: '3-Module Bundle Annual' };
  // 4-module bundle
  if (a === 8.99)  return { billingInterval: 'monthly', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], isBundle: true, label: '4-Module Bundle' };
  if (a === 89.99) return { billingInterval: 'annual',  modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], isBundle: true, label: '4-Module Bundle Annual' };
  return null;
}

function buildProductLabel(modules: string[], baseLabel: string): string {
  if (modules.length > 1) return baseLabel; // bundle label already descriptive
  const m = modules[0];
  if (m === 'pipekeeper')    return 'PipeKeeper';
  if (m === 'whiskeykeeper') return 'WhiskeyKeeper';
  if (m === 'cigarkeeper')   return 'CigarKeeper';
  if (m === 'winekeeper')    return 'WineKeeper';
  return baseLabel;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function norm(v: any): string { return String(v ?? '').trim().toLowerCase(); }

function parseDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function roundCurrency(value: number): number {
  // Round to 2 decimal places for currency-safe reporting.
  // Number.EPSILON helps avoid floating-point representation edge cases.
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function inRange(d: Date, range: CalendarRange): boolean {
  return d >= range.start && d <= range.end;
}

const MODULE_KEYS = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

function uniqueModules(modules: string[]): string[] {
  return [...new Set(modules.filter((m) => MODULE_KEYS.includes(m)))].sort();
}

function runtimeModulesFromUser(user: any): string[] {
  const csvModules = String(user?.paid_modules_csv || '')
    .split(',')
    .map((m) => String(m || '').trim().toLowerCase())
    .filter(Boolean);
  const flagModules: string[] = [];
  if (user?.pipekeeper_paid) flagModules.push('pipekeeper');
  if (user?.whiskeykeeper_paid) flagModules.push('whiskeykeeper');
  if (user?.cigarkeeper_paid) flagModules.push('cigarkeeper');
  if (user?.winekeeper_paid) flagModules.push('winekeeper');
  const explicit = uniqueModules([...csvModules, ...flagModules]);
  if (explicit.length > 0) return explicit;
  if (user?.isFoundingMember || user?.legacy_broad_module_access) return [...MODULE_KEYS];
  return [];
}

function userIdentityKey(userId: string | null | undefined, userEmail: string | null | undefined): string {
  // Canonical user identity key for report aggregation.
  // Prefer stable user_id; fallback to normalized email when id is unavailable.
  return String(userId || '').trim() || norm(userEmail || '');
}

// ─── Calendar ranges ──────────────────────────────────────────────────────────

function getCalendarRange(type: 'today' | 'week' | 'month' | 'quarter' | 'year', now: Date): CalendarRange {
  const start = new Date(now);
  let end: Date;
  switch (type) {
    case 'today': {
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 23, 59, 59, 999));
      break;
    }
    case 'week': {
      const dow = start.getUTCDay();
      start.setUTCDate(start.getUTCDate() - (dow === 0 ? 6 : dow - 1));
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 6);
      end.setUTCHours(23, 59, 59, 999);
      break;
    }
    case 'month': {
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      break;
    }
    case 'quarter': {
      const q = Math.floor(start.getUTCMonth() / 3);
      start.setUTCMonth(q * 3, 1);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(Date.UTC(start.getUTCFullYear(), q * 3 + 3, 0, 23, 59, 59, 999));
      break;
    }
    case 'year': {
      start.setUTCMonth(0, 1);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(Date.UTC(start.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
      break;
    }
  }
  return { start, end };
}

// ─── Interval normalization ───────────────────────────────────────────────────

function normalizeInterval(raw: any): IntervalKind | null {
  const v = norm(
    raw.billing_interval ||
    raw.billing_period ||
    raw.interval ||
    raw.period ||
    raw.plan_interval ||
    raw.recurring_interval ||
    ''
  );
  if (v === 'month' || v === 'monthly') return 'monthly';
  if (v === 'year' || v === 'yearly' || v === 'annual') return 'annual';
  return null;
}

function normalizeIntervalToken(v: unknown): IntervalKind | null {
  const value = norm(v || '');
  if (value === 'month' || value === 'monthly') return 'monthly';
  if (value === 'year' || value === 'yearly' || value === 'annual') return 'annual';
  return null;
}

function parsePositiveNumber(v: unknown, options: { treatAsCents?: boolean } = {}): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string'
    ? Number(String(v).replace(/,/g, '').match(/\d+(\.\d+)?/)?.[0] ?? Number.NaN)
    : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return options.treatAsCents ? (n / 100) : n;
}

function parsePositiveMoney(v: unknown): number | null {
  const direct = parsePositiveNumber(v);
  if (direct === null) return null;
  if (Number.isInteger(direct)) {
    const asCents = parseFloat((direct / 100).toFixed(2));
    if (inferFromAmount(asCents)) return asCents;
  }
  return direct;
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function hasMeaningfulValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  return true;
}

function mergeMissing(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  if (!isPlainObject(source)) return target;
  for (const [key, value] of Object.entries(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (isPlainObject(value)) {
      if (!isPlainObject(target[key])) target[key] = {};
      mergeMissing(target[key], value);
      continue;
    }
    if (!hasMeaningfulValue(target[key]) && hasMeaningfulValue(value)) {
      target[key] = value;
    }
  }
  return target;
}

function parseObjectLike(value: unknown): unknown {
  if (isPlainObject(value) || Array.isArray(value)) return value;
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseMetadataObject(raw: any): Record<string, any> {
  const candidateFields = [
    raw?.metadata_json,
    raw?.metadata,
    raw?.subscription_metadata,
    raw?.provider_metadata,
    raw?.stripe_metadata,
    raw?.apple_metadata,
    raw?.stripe_subscription_json,
    raw?.stripe_subscription,
    raw?.stripe_price_json,
    raw?.stripe_price,
    raw?.stripe_payload_json,
    raw?.stripe_payload,
    raw?.provider_payload_json,
    raw?.provider_payload,
    raw?.provider_response_json,
    raw?.provider_response,
    raw?.subscription_json,
    raw?.price_json,
    raw?.apple_receipt_json,
    raw?.apple_receipt,
    raw?.apple_entitlement_json,
    raw?.apple_entitlement,
    raw?.receipt_json,
    raw?.entitlement_json,
    raw?.entitlement_data,
    raw?.latest_receipt_info,
    raw?.latest_receipt,
    raw?.data,
  ];

  const merged: Record<string, any> = {};
  for (const candidate of candidateFields) {
    const parsed = parseObjectLike(candidate);
    if (isPlainObject(parsed)) {
      mergeMissing(merged, parsed);
      continue;
    }
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (isPlainObject(entry)) mergeMissing(merged, entry);
      }
    }
  }
  return merged;
}

/**
 * Normalize array-like metadata payloads.
 * Returns the original array when provided, attempts JSON parsing for string/object-like values,
 * and returns an empty array when no array structure is available.
 */
function parseArrayLike(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const parsed = parseObjectLike(value);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Extract normalized product identifiers from iOS receipt-style metadata payloads.
 * Looks at both top-level raw subscription fields and parsed metadata fields, including
 * latest_receipt_info-style arrays and receipt blobs.
 */
function extractReceiptProductIds(raw: any, metadata: Record<string, any>): string[] {
  const arrayCandidates = [
    raw?.latest_receipt_info,
    raw?.latest_receipt,
    raw?.apple_receipt,
    raw?.apple_receipt_json,
    raw?.receipt_json,
    raw?.entitlement_data,
    metadata?.latest_receipt_info,
    metadata?.latest_receipt,
    metadata?.apple_receipt,
    metadata?.apple_receipt_json,
    metadata?.receipt_json,
    metadata?.entitlement_data,
  ];

  const directCandidates = [
    raw?.product_id,
    raw?.productId,
    raw?.apple_product_id,
    metadata?.product_id,
    metadata?.productId,
    metadata?.apple_product_id,
    metadata?.latest_receipt_info?.product_id,
    metadata?.latest_receipt_info?.productId,
  ];

  const fromArrays = arrayCandidates
    .flatMap((candidate) => parseArrayLike(candidate))
    .flatMap((entry) => (isPlainObject(entry) ? [entry.product_id, entry.productId] : []));

  return [...new Set([...directCandidates, ...fromArrays]
    .map((value) => norm(value || ''))
    .filter(Boolean))];
}

function hasModuleAlias(token: string, compact: string, alias: string): boolean {
  return token === alias || token.startsWith(`${alias}_`) || token.includes(`.${alias}.`) || compact.startsWith(alias);
}

function normalizeModuleToken(value: unknown): string | null {
  const token = norm(value || '');
  if (!token) return null;
  const compact = token.replace(/[\s_-]/g, '');
  if (token === 'pipe' || hasModuleAlias(token, compact, 'pk') || token.includes('pipekeeper') || compact.includes('pipekeeper')) return 'pipekeeper';
  if (token === 'whiskey' || hasModuleAlias(token, compact, 'wk') || token.includes('whiskeykeeper') || compact.includes('whiskeykeeper')) return 'whiskeykeeper';
  if (token === 'cigar' || hasModuleAlias(token, compact, 'ck') || token.includes('cigarkeeper') || compact.includes('cigarkeeper')) return 'cigarkeeper';
  if (token === 'wine' || token.includes('winekeeper') || compact.includes('winekeeper')) return 'winekeeper';
  return null;
}

function extractModuleTokens(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((entry) => extractModuleTokens(entry));
  if (typeof value === 'string') return value.split(/[,;|]/g).map((part) => part.trim()).filter(Boolean);
  if (isPlainObject(value)) return Object.values(value).flatMap((entry) => extractModuleTokens(entry));
  const normalized = normalizeModuleToken(value);
  return normalized ? [normalized] : [];
}

function recoverModulesFromMetadata(raw: any, metadata: Record<string, any>): string[] {
  const candidates = [
    raw.modules,
    raw.modules_csv,
    raw.paid_modules_csv,
    raw.module,
    raw.primary_module,
    raw.product_module,
    raw.app,
    raw.app_slug,
    raw.legacy_app_slug,
    raw.app_aliases,
    metadata.modules,
    metadata.modules_csv,
    metadata.paid_modules_csv,
    metadata.module,
    metadata.primary_module,
    metadata.product_module,
    metadata.app,
    metadata.app_slug,
    metadata.legacy_app_slug,
    metadata.app_aliases,
  ];
  const modules = candidates
    .flatMap((candidate) => extractModuleTokens(candidate))
    .map((entry) => normalizeModuleToken(entry))
    .filter(Boolean) as string[];
  return [...new Set(modules)];
}

function inferIntervalFromDateSpan(raw: any): IntervalKind | null {
  const start = parseDate(raw.current_period_start || raw.started_at || raw.created_date);
  const end = parseDate(raw.current_period_end);
  if (!start || !end) return null;
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days >= 300 && days <= 380) return 'annual';
  if (days >= 27 && days <= 40) return 'monthly';
  return null;
}

function inferPlanKeyFromIdentifiers(raw: any, resolvedInterval: IntervalKind | null): string | null {
  const metadata = parseMetadataObject(raw);
  const receiptProductIds = extractReceiptProductIds(raw, metadata);
  const stripePriceId = raw?.items?.data?.[0]?.price?.id || raw?.price?.id || null;
  const candidates = [
    raw.planKey,
    raw.plan_key,
    raw.price_id,
    raw.stripe_price_id,
    raw.provider_price_id,
    stripePriceId,
    raw.apple_product_id,
    raw.plan_id,
    raw.plan_name,
    raw.bundle_name,
    raw.checkout_type,
    raw.product_kind,
    raw.product_label,
    raw.app,
    raw.app_slug,
    raw.legacy_app_slug,
    raw.app_aliases,
    raw.provider_subscription_id,
    raw.stripe_subscription_id,
    metadata.plan_key,
    metadata.planKey,
    metadata.price_id,
    metadata.stripe_price_id,
    metadata.provider_price_id,
    metadata?.items?.data?.[0]?.price?.id,
    metadata?.price?.id,
    metadata.apple_product_id,
    metadata.plan_id,
    metadata.plan_name,
    metadata.bundle_name,
    metadata.checkout_type,
    metadata.product_kind,
    metadata.product_label,
    metadata.app,
    metadata.app_slug,
    metadata.legacy_app_slug,
    metadata.app_aliases,
    metadata.provider_subscription_id,
    metadata.stripe_subscription_id,
    ...receiptProductIds,
  ]
    .map((v) => norm(v || ''))
    .filter(Boolean);

  for (const candidate of candidates) {
    const canonical = canonicalizePlanKeyCandidate(candidate);
    if (canonical) return canonical;
  }

  const suffixFromToken = (value: string): IntervalKind | null => {
    const v = norm(value || '');
    if (!v) return null;
    if (v.includes('annual') || v.includes('yearly') || v.includes('year')) return 'annual';
    if (v.includes('monthly') || v.includes('month')) return 'monthly';
    return null;
  };
  const fallbackSuffix = resolvedInterval === 'annual' ? 'annual' : (resolvedInterval === 'monthly' ? 'monthly' : null);

  for (const candidate of candidates) {
    const planSuffix = suffixFromToken(candidate) || fallbackSuffix;
    if (!planSuffix) continue;
    if (candidate.includes('founders')) return `founders_bundle_${planSuffix}`;
    if (candidate.includes('three_module') || candidate.includes('bundle_3')) return `three_module_bundle_${planSuffix}`;
    if (candidate.includes('four_module') || candidate.includes('bundle_4')) return `four_module_bundle_${planSuffix}`;
    const moduleFromToken = normalizeModuleToken(candidate);
    if (moduleFromToken) return `${moduleFromToken}_pro_${planSuffix}`;
  }

  return null;
}

// Infer billing interval from identifier-like fields when explicit interval fields are absent.
// Uses both top-level subscription fields and metadata payload hints.
function inferIntervalFromIdentifiers(raw: any): IntervalKind | null {
  const metadata = parseMetadataObject(raw);
  const receiptProductIds = extractReceiptProductIds(raw, metadata);
  const stripeInterval = raw?.items?.data?.[0]?.price?.recurring?.interval || raw?.price?.recurring?.interval || null;
  const candidates = [
    raw.planKey,
    raw.plan_key,
    raw.price_id,
    raw.stripe_price_id,
    raw.apple_product_id,
    raw.plan_id,
    raw.plan_name,
    raw.bundle_name,
    raw.checkout_type,
    raw.product_kind,
    raw.product_label,
    raw.interval,
    raw.period,
    raw.plan_interval,
    raw.recurring_interval,
    stripeInterval,
    metadata.plan_key,
    metadata.planKey,
    metadata.price_id,
    metadata.stripe_price_id,
    metadata.apple_product_id,
    metadata.plan_id,
    metadata.plan_name,
    metadata.bundle_name,
    metadata.checkout_type,
    metadata.product_kind,
    metadata.product_label,
    metadata.interval,
    metadata.period,
    metadata.plan_interval,
    metadata.recurring_interval,
    metadata?.items?.data?.[0]?.price?.recurring?.interval,
    metadata?.price?.recurring?.interval,
    ...receiptProductIds,
  ]
    .map((v) => norm(v || ''))
    .filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes('annual') || candidate.includes('yearly') || candidate.includes('year')) return 'annual';
    if (candidate.includes('monthly') || candidate.includes('month')) return 'monthly';
  }
  return null;
}

// Safe canonical backfill: infer plan key from resolved module set + billing interval + tier/amount hints.
// Only used after direct and identifier-based plan resolution fails.
function inferPlanKeyFromResolvedModules(
  modules: string[],
  billingInterval: IntervalKind | null,
  amount: number | null,
  tierHintRaw: unknown,
): string | null {
  const interval = billingInterval === 'annual' ? 'annual' : (billingInterval === 'monthly' ? 'monthly' : null);
  if (!interval || !Array.isArray(modules) || modules.length === 0) return null;

  const normalizedModules = [...new Set(modules.map((m) => norm(m || '')).filter(Boolean))].sort();
  const same = (arr: string[]) => arr.length === normalizedModules.length && arr.every((m, idx) => normalizedModules[idx] === m);

  if (same(['pipekeeper', 'whiskeykeeper'])) return `founders_bundle_${interval}`;
  if (same(['cigarkeeper', 'pipekeeper', 'whiskeykeeper'])) return `three_module_bundle_${interval}`;
  if (same(['cigarkeeper', 'pipekeeper', 'whiskeykeeper', 'winekeeper'])) return `four_module_bundle_${interval}`;
  if (normalizedModules.length !== 1) return null;

  const module = normalizedModules[0];
  if (module === 'unknown') return null;
  const tierHint = norm(tierHintRaw || '');
  const normalizedAmount = Number.isFinite(Number(amount)) ? parseFloat(Number(amount).toFixed(2)) : null;
  const isLegacy = normalizedAmount === 1.99 || normalizedAmount === 19.99;
  const isPro = normalizedAmount === 2.99 || normalizedAmount === 29.99;

  if (tierHint === 'premium' || tierHint === 'legacy' || isLegacy) return `${module}_premium_${interval}`;
  if (tierHint === 'pro' || isPro) return `${module}_pro_${interval}`;
  // Safe historical fallback: modern canonical plan key when module+interval are known
  // but tier/amount hints are absent.
  return `${module}_pro_${interval}`;
}

// ─── Platform normalization ───────────────────────────────────────────────────

function normalizePlatform(raw: any, user: any | null): PlatformKind | null {
  const provider = norm(raw.provider || '');
  if (provider === 'apple' || provider === 'ios') return 'ios';
  if (provider === 'google' || provider === 'android' || provider === 'googleplay') return 'google';
  if (provider === 'stripe' || provider === 'web') return 'web';
  if (user) {
    const up = norm(user.data?.platform || user.platform || '');
    if (up === 'apple' || up === 'ios') return 'ios';
    if (up === 'android' || up === 'googleplay' || up === 'google') return 'google';
    if (up && up !== 'unknown') return 'web';
  }
  return null;
}

// ─── Active paid detection ────────────────────────────────────────────────────

function isActivePaid(raw: any): boolean {
  const status = norm(raw.status);
  const amount = Math.max(0, Number(raw.amount || 0));
  if (status === 'active') return true;
  if (status === 'trialing' && amount > 0) return true;
  if (status === 'past_due') return true;
  return false;
}

// ─── Normalization: raw → NormalizedSub ──────────────────────────────────────
// Module resolution priority (NEVER defaults to 'pipekeeper'):
//   1. planKey → PLAN_CATALOG (authoritative)
//   2. modules_csv stored field
//   3. primary_module stored field
//   4. metadata module/app hints (modules/app_slug/app_aliases)
//   5. Amount inference for bundle prices (resolves modules from price)
//   6. 'unknown' — truly unresolvable products stay unknown

function normalizeSub(raw: any, user: any | null = null): NormalizedSub {
  const metadata = parseMetadataObject(raw);
  const metadataModules = recoverModulesFromMetadata(raw, metadata);
  const stripeRecurringInterval = raw?.items?.data?.[0]?.price?.recurring?.interval || raw?.price?.recurring?.interval || null;
  const directInterval = normalizeInterval(raw);
  const metadataInterval =
    normalizeIntervalToken(metadata.billing_interval) ||
    normalizeIntervalToken(metadata.billing_period) ||
    normalizeIntervalToken(raw.interval) ||
    normalizeIntervalToken(raw.period) ||
    normalizeIntervalToken(raw.plan_interval) ||
    normalizeIntervalToken(raw.recurring_interval) ||
    normalizeIntervalToken(metadata.interval) ||
    normalizeIntervalToken(metadata.period) ||
    normalizeIntervalToken(metadata.plan_interval) ||
    normalizeIntervalToken(metadata.recurring_interval) ||
    normalizeIntervalToken(stripeRecurringInterval) ||
    normalizeIntervalToken(metadata?.recurring?.interval) ||
    normalizeIntervalToken(metadata?.items?.data?.[0]?.price?.recurring?.interval) ||
    normalizeIntervalToken(metadata?.price?.recurring?.interval);
  const intervalFromIdentifiers = inferIntervalFromIdentifiers(raw);
  const intervalFromSpan = inferIntervalFromDateSpan(raw);
  const resolvedIntervalPrePlan = directInterval || metadataInterval || intervalFromIdentifiers || intervalFromSpan || null;

  const directPlanKeyRaw = norm(raw.planKey || raw.plan_key || metadata.planKey || metadata.plan_key || '') || null;
  const directPlanKey = directPlanKeyRaw ? (canonicalizePlanKeyCandidate(directPlanKeyRaw) || directPlanKeyRaw) : null;
  const inferredPlanKey = inferPlanKeyFromIdentifiers(raw, resolvedIntervalPrePlan);
  let planKey = directPlanKey || inferredPlanKey || null;
  let catalog = lookupPlan(planKey);

  const directAmountFromPriceField =
    typeof raw.price === 'number' || typeof raw.price === 'string'
      ? parsePositiveMoney(raw.price)
      : null;
  const directAmount = parsePositiveMoney(raw.amount) || directAmountFromPriceField;
  const renewalAmountRecovered =
    parsePositiveNumber(raw.renewal_amount) ||
    parsePositiveNumber(raw.amount_total, { treatAsCents: true }) ||
    parsePositiveNumber(raw.unit_amount, { treatAsCents: true }) ||
    parsePositiveNumber(raw?.price?.unit_amount, { treatAsCents: true }) ||
    parsePositiveNumber(raw?.items?.data?.[0]?.price?.unit_amount, { treatAsCents: true }) ||
    parsePositiveNumber(raw?.price?.amount_total, { treatAsCents: true }) ||
    parsePositiveNumber(metadata.renewal_amount) ||
    parsePositiveNumber(metadata.amount) ||
    parsePositiveMoney(metadata.price) ||
    parsePositiveNumber(metadata.amount_total, { treatAsCents: true }) ||
    parsePositiveNumber(metadata.unit_amount, { treatAsCents: true }) ||
    parsePositiveNumber(metadata?.items?.data?.[0]?.price?.unit_amount, { treatAsCents: true }) ||
    parsePositiveNumber(metadata?.price?.amount_total, { treatAsCents: true }) ||
    parsePositiveNumber(metadata?.price?.unit_amount, { treatAsCents: true }) ||
    null;

  const recoveredAmount = directAmount || renewalAmountRecovered || null;
  let price: number | null = recoveredAmount ?? (catalog ? catalog.price : null);
  let renewalAmount = price;
  const amountInference = price ? inferFromAmount(price) : null;

  // ── Interval resolution: direct fields → metadata → catalog → amount inference → span ──
  const billingInterval: IntervalKind | null =
    directInterval ??
    metadataInterval ??
    (catalog?.billingInterval ?? null) ??
    (amountInference?.billingInterval ?? null) ??
    intervalFromSpan ??
    null;

  // ── Module resolution (never defaults to 'pipekeeper') ───────────────────
  let modules: string[];
  let productLabel: string;
  const primaryModule = normalizeModuleToken(raw.primary_module || '');

  if (catalog) {
    // 1. Authoritative catalog match via planKey
    modules = catalog.modules;
    productLabel = buildProductLabel(catalog.modules, catalog.label);
  } else {
    // 2. modules_csv stored field
    const csvModules = String(raw.modules_csv || '')
      .split(',')
      .map((m: string) => normalizeModuleToken(m))
      .filter(Boolean);

    if (csvModules.length > 0) {
      modules = csvModules;
      productLabel = buildProductLabel(modules, modules.length > 1 ? 'Bundle' : modules[0]);
    } else if (primaryModule) {
      // 3. primary_module stored field
      modules = [primaryModule];
      productLabel = buildProductLabel(modules, modules[0]);
    } else if (metadataModules.length > 0) {
      // 4. metadata module/app hints
      modules = metadataModules;
      productLabel = buildProductLabel(modules, modules.length > 1 ? 'Bundle' : modules[0]);
    } else if (amountInference?.modules) {
      // 5. Amount inference for bundle amounts (resolves modules definitively)
      modules = amountInference.modules;
      productLabel = amountInference.label;
    } else {
      // 6. Truly unresolvable — mark as unknown, NOT pipekeeper
      const userModules = String(user?.paid_modules_csv || '')
        .split(',')
        .map((m: string) => normalizeModuleToken(m))
        .filter(Boolean);
      if (userModules.length > 0) {
        modules = [...new Set(userModules)];
        productLabel = buildProductLabel(modules, modules.length > 1 ? 'Bundle' : modules[0]);
      } else {
        modules = ['unknown'];
        productLabel = 'Unknown';
      }
    }
  }

  const tierHint = raw.subscription_tier || raw.tier || metadata.subscription_tier || metadata.tier || null;
  const planKeyBackfill = !planKey
    ? inferPlanKeyFromResolvedModules(modules, billingInterval, price, tierHint)
    : null;
  if (planKeyBackfill) {
    planKey = planKeyBackfill;
    catalog = lookupPlan(planKey);
    if (catalog) {
      modules = catalog.modules;
      productLabel = buildProductLabel(catalog.modules, catalog.label);
      if (price === null) {
        price = catalog.price;
        renewalAmount = catalog.price;
      }
    }
  }

  const module = modules[0];
  const priceSource = directAmount
    ? 'direct:amount'
    : renewalAmountRecovered
      ? 'recovered:stored_renewal_or_metadata_amount'
      : catalog?.price != null
        ? 'recovered:plan_catalog'
        : 'unresolved:none';
  const intervalSource = directInterval
    ? 'direct:billing_interval'
    : metadataInterval
      ? 'recovered:metadata_interval'
      : catalog?.billingInterval
        ? 'recovered:plan_catalog'
        : amountInference?.billingInterval
          ? 'recovered:amount_inference'
          : intervalFromSpan
            ? 'recovered:period_span'
            : 'unresolved:none';
  const planKeySource = directPlanKey
    ? 'direct:plan_key'
    : inferredPlanKey
      ? 'recovered:identifier_mapping'
      : planKeyBackfill
        ? 'recovered:modules_interval_backfill'
      : 'unresolved:none';

  return {
    rawId:          String(raw.id || raw.stripe_subscription_id || ''),
    userId:         String(raw.user_id || ''),
    userEmail:      norm(raw.user_email || ''),
    isPaid:         isActivePaid(raw),
    subscriptionStatus: norm(raw.status || ''),
    planKey,
    billingInterval,
    price,
    renewalAmount,
    createdAt:      parseDate(raw.started_at || raw.created_date || raw.current_period_start),
    renewalAt:      parseDate(raw.current_period_end),
    module,
    modules,
    platform:       normalizePlatform(raw, user),
    productLabel,
    fieldResolution: {
      price: price === null ? 'unresolved' : (directAmount ? 'direct' : 'recovered'),
      billingInterval: billingInterval === null ? 'unresolved' : (directInterval ? 'direct' : 'recovered'),
      planKey: planKey === null ? 'unresolved' : (directPlanKey ? 'direct' : 'recovered'),
      sources: {
        price: priceSource,
        billingInterval: intervalSource,
        planKey: planKeySource,
      },
    },
  };
}

// ─── MRR contribution ─────────────────────────────────────────────────────────

function mrrContribution(sub: NormalizedSub): number {
  if (!sub.isPaid || sub.price === null) return 0;
  if (sub.billingInterval === 'monthly') return sub.price;
  if (sub.billingInterval === 'annual')  return sub.price / 12;
  return 0;
}

// ─── Renewal period math ──────────────────────────────────────────────────────

function calcRenewalPeriod(paidSubs: NormalizedSub[], range: CalendarRange) {
  const renewing = paidSubs.filter(
    (s) => s.renewalAt !== null && inRange(s.renewalAt, range) && s.price !== null && s.billingInterval !== null
  );
  const customers = new Set(renewing.map((s) => s.userId || s.userEmail).filter(Boolean)).size;
  const revenue   = roundCurrency(renewing.reduce((sum, s) => sum + (s.price ?? 0), 0));
  return { customers, subscriptions: renewing.length, revenue };
}

// ─── Sanity checks ────────────────────────────────────────────────────────────

function runSanityChecks(params: {
  paidAccounts: number; totalAccounts: number; mrr: number; arr: number;
  renewals: { week: any; month: any; quarter: any; year: any };
}) {
  const failures: string[] = [];
  if (params.paidAccounts > params.totalAccounts) {
    failures.push(`SANITY_FAIL: paidAccounts(${params.paidAccounts}) > totalAccounts(${params.totalAccounts})`);
  }
  const expectedArr = parseFloat((params.mrr * 12).toFixed(2));
  if (Math.abs(params.arr - expectedArr) > 0.01) {
    failures.push(`SANITY_FAIL: arr(${params.arr}) !== mrr×12(${expectedArr})`);
  }
  for (const [label, period] of Object.entries(params.renewals) as [string, any][]) {
    if (period.customers > period.subscriptions) {
      failures.push(`SANITY_FAIL: renewal ${label} — customers(${period.customers}) > subscriptions(${period.subscriptions})`);
    }
  }
  if (failures.length > 0) failures.forEach((f) => console.error('[getUserSubscriptionReportV3] ' + f));
  return { passed: failures.length === 0, failures };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44  = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (authUser?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required', meta: { generatedAt: new Date().toISOString(), reportVersion: REPORT_VERSION } }, { status: 403 });
    }

    // ── Paginated fetch ───────────────────────────────────────────────────────
    const fetchAll = async (entity: any): Promise<any[]> => {
      const PAGE = 100;
      const items: any[] = [];
      let skip = 0;
      while (true) {
        let page = await entity.list(null, PAGE, skip);
        if (typeof page === 'string') { try { page = JSON.parse(page); } catch { break; } }
        if (!Array.isArray(page) || page.length === 0) break;
        items.push(...page);
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      return items;
    };

    const [allUsers, allSubscriptions] = await Promise.all([
      fetchAll(base44.asServiceRole.entities.User),
      fetchAll(base44.asServiceRole.entities.Subscription),
    ]);

    const now = new Date();

    const ranges = {
      today:   getCalendarRange('today',   now),
      week:    getCalendarRange('week',    now),
      month:   getCalendarRange('month',   now),
      quarter: getCalendarRange('quarter', now),
      year:    getCalendarRange('year',    now),
    };

    // ── Deduplicate users by email (most recent wins) ─────────────────────────
    const uniqueUsersMap = new Map<string, any>();
    for (const u of allUsers) {
      const email = norm(u.email || '');
      if (!email) continue;
      const existing = uniqueUsersMap.get(email);
      if (!existing) {
        uniqueUsersMap.set(email, u);
      } else {
        // Keep the most recently created/updated user record
        const existingTs = new Date(existing.updated_date || existing.created_date || 0).getTime();
        const uTs = new Date(u.updated_date || u.created_date || 0).getTime();
        if (uTs > existingTs) uniqueUsersMap.set(email, u);
      }
    }
    const uniqueUsers = [...uniqueUsersMap.values()];

    // ── User lookup maps ──────────────────────────────────────────────────────
    const userByIdMap    = new Map<string, any>();
    const userByEmailMap = new Map<string, any>();
    for (const u of uniqueUsers) {
      if (u.id) userByIdMap.set(String(u.id), u);
      const email = norm(u.email || '');
      if (email) userByEmailMap.set(email, u);
    }

    // ── Subscription lookup maps ──────────────────────────────────────────────
    const subsByUserId = new Map<string, any[]>();
    const subsByEmail  = new Map<string, any[]>();
    for (const raw of allSubscriptions) {
      if (raw.user_id) {
        if (!subsByUserId.has(raw.user_id)) subsByUserId.set(raw.user_id, []);
        subsByUserId.get(raw.user_id)!.push(raw);
      }
      const e = norm(raw.user_email || '');
      if (e) {
        if (!subsByEmail.has(e)) subsByEmail.set(e, []);
        subsByEmail.get(e)!.push(raw);
      }
    }

    function getUserRawSubs(u: any): any[] {
      const email = norm(u.email || '');
      const byId  = subsByUserId.get(u.id)  || [];
      const byMail = subsByEmail.get(email) || [];
      const seen = new Set<string>();
      return [...byId, ...byMail].filter((s) => {
        const key = s.id || s.stripe_subscription_id || '';
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // ── Phase 1: Normalize all active paid subs (dedup by subscription ID) ────
    const seenSubIds = new Set<string>();
    const allActivePaidNorm: NormalizedSub[] = [];
    for (const raw of allSubscriptions.filter(isActivePaid)) {
      const key = String(raw.id || raw.stripe_subscription_id || '');
      if (key && seenSubIds.has(key)) continue;
      if (key) seenSubIds.add(key);
      const userId = String(raw.user_id || '');
      const email  = norm(raw.user_email || '');
      const user   = (userId && userByIdMap.get(userId)) || (email && userByEmailMap.get(email)) || null;
      allActivePaidNorm.push(normalizeSub(raw, user));
    }

    // ── Phase 2: Dedup per (userKey, productFamily) — keep most recent ───────
    // Use product-family key, NOT first module, so bundles dedup correctly.
    function getProductFamilyKey(sub: NormalizedSub): string {
      if (sub.modules.length > 1) {
        return 'bundle::' + [...sub.modules].sort().join(',');
      }
      if (sub.module === 'unknown') {
        // Unknown products do not collapse — use rawId as unique identifier.
        return 'unknown::' + (sub.rawId || sub.userEmail || sub.planKey || sub.userId || 'empty');
      }
      return 'single::' + sub.module;
    }

    const paidSubsByKey = new Map<string, NormalizedSub>();
    let duplicatesRemoved = 0;
    for (const sub of allActivePaidNorm) {
      const userKey = sub.userId || sub.userEmail;
      if (!userKey) continue;
      const dedupKey = `${userKey}::${getProductFamilyKey(sub)}`;
      const existing = paidSubsByKey.get(dedupKey);
      if (!existing) {
        paidSubsByKey.set(dedupKey, sub);
      } else {
        duplicatesRemoved++;
        const existingDate = existing.createdAt?.getTime() ?? 0;
        if ((sub.createdAt?.getTime() ?? 0) > existingDate) paidSubsByKey.set(dedupKey, sub);
      }
    }
    const paidSubs = [...paidSubsByKey.values()];


    // ── Warning counts ────────────────────────────────────────────────────────
    let warningMissingPrice    = 0;
    let warningMissingInterval = 0;
    let warningMissingPlatform = 0;
    let warningMissingPlanKey  = 0;
    let warningUnknownProduct  = 0;
    const fieldRecovery = {
      price: { direct: 0, recovered: 0, unresolved: 0 },
      billingInterval: { direct: 0, recovered: 0, unresolved: 0 },
      planKey: { direct: 0, recovered: 0, unresolved: 0 },
    };
    const unresolvedReasonCounts = {
      missingPriceBySource: {} as Record<string, number>,
      missingIntervalBySource: {} as Record<string, number>,
      unknownPlanKeyBySource: {} as Record<string, number>,
    };
    const unresolvedSamples: Array<Record<string, unknown>> = [];
    const bumpReason = (bucket: Record<string, number>, key: string) => {
      bucket[key] = (bucket[key] || 0) + 1;
    };
    for (const sub of paidSubs) {
      if (sub.price === null)           warningMissingPrice++;
      if (sub.billingInterval === null) warningMissingInterval++;
      if (sub.platform === null)        warningMissingPlatform++;
      if (sub.planKey === null)         warningMissingPlanKey++;
      if (sub.module === 'unknown')     warningUnknownProduct++;

      const priceResolution = sub.fieldResolution?.price || 'unresolved';
      const intervalResolution = sub.fieldResolution?.billingInterval || 'unresolved';
      const planKeyResolution = sub.fieldResolution?.planKey || 'unresolved';
      fieldRecovery.price[priceResolution as 'direct' | 'recovered' | 'unresolved']++;
      fieldRecovery.billingInterval[intervalResolution as 'direct' | 'recovered' | 'unresolved']++;
      fieldRecovery.planKey[planKeyResolution as 'direct' | 'recovered' | 'unresolved']++;

      if (sub.price === null) {
        bumpReason(unresolvedReasonCounts.missingPriceBySource, sub.fieldResolution?.sources?.price || 'unresolved:none');
      }
      if (sub.billingInterval === null) {
        bumpReason(unresolvedReasonCounts.missingIntervalBySource, sub.fieldResolution?.sources?.billingInterval || 'unresolved:none');
      }
      if (sub.planKey === null) {
        bumpReason(unresolvedReasonCounts.unknownPlanKeyBySource, sub.fieldResolution?.sources?.planKey || 'unresolved:none');
      }

      if ((sub.price === null || sub.billingInterval === null || sub.planKey === null) && unresolvedSamples.length < MAX_SAMPLE_SIZE) {
        unresolvedSamples.push({
          rawId: sub.rawId,
          userId: sub.userId,
          userEmail: sub.userEmail,
          missingFields: [
            sub.price === null ? 'price' : null,
            sub.billingInterval === null ? 'billingInterval' : null,
            sub.planKey === null ? 'planKey' : null,
          ].filter(Boolean),
          failedSources: {
            price: sub.fieldResolution?.sources?.price || 'unresolved:none',
            billingInterval: sub.fieldResolution?.sources?.billingInterval || 'unresolved:none',
            planKey: sub.fieldResolution?.sources?.planKey || 'unresolved:none',
          },
          provider: sub.platform || null,
        });
      }
    }

    // ── Subscription counts ───────────────────────────────────────────────────
    const totalActivePaid = paidSubs.length;
    const monthlyCount    = paidSubs.filter((s) => s.billingInterval === 'monthly').length;
    const annualCount     = paidSubs.filter((s) => s.billingInterval === 'annual').length;
    const bundleCount     = paidSubs.filter((s) => s.modules.length > 1).length;
    const singleCount     = paidSubs.filter((s) => s.modules.length === 1 && s.module !== 'unknown').length;

    // ── By-product breakdown ──────────────────────────────────────────────────
    // Bundles count as 1 subscription. Module breakdown shows:
    //   directSingle: directly subscribed to that module
    //   viaBundle: module included through a bundle
    const byProductCounts: Record<string, number> = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundles: 0, unknown: 0 };
    const moduleDirectCounts: Record<string, number> = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0 };
    const moduleViaBundle: Record<string, number> = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0 };
    for (const sub of paidSubs) {
      if (sub.modules.length > 1) {
        byProductCounts.bundles++;
        // Count each module as accessible via bundle
        for (const m of sub.modules) {
          if (m in moduleViaBundle) moduleViaBundle[m as keyof typeof moduleViaBundle]++;
        }
      } else {
        const m = sub.modules[0] ?? sub.module;
        if      (m === 'pipekeeper')    { byProductCounts.pipekeeper++; moduleDirectCounts.pipekeeper++; }
        else if (m === 'whiskeykeeper') { byProductCounts.whiskeykeeper++; moduleDirectCounts.whiskeykeeper++; }
        else if (m === 'cigarkeeper')   { byProductCounts.cigarkeeper++; moduleDirectCounts.cigarkeeper++; }
        else if (m === 'winekeeper')    { byProductCounts.winekeeper++; moduleDirectCounts.winekeeper++; }
        else                            byProductCounts.unknown++;
      }
    }
    const moduleEffectiveCounts = {
      pipekeeper: moduleDirectCounts.pipekeeper + moduleViaBundle.pipekeeper,
      whiskeykeeper: moduleDirectCounts.whiskeykeeper + moduleViaBundle.whiskeykeeper,
      cigarkeeper: moduleDirectCounts.cigarkeeper + moduleViaBundle.cigarkeeper,
      winekeeper: moduleDirectCounts.winekeeper + moduleViaBundle.winekeeper,
    };

    const paidSubsByUser = new Map<string, NormalizedSub[]>();
    for (const sub of paidSubs) {
      const key = userIdentityKey(sub.userId, sub.userEmail);
      if (!key) continue;
      if (!paidSubsByUser.has(key)) paidSubsByUser.set(key, []);
      paidSubsByUser.get(key)!.push(sub);
    }

    // ── User-level paid / free classification ─────────────────────────────────
    // SOURCE OF TRUTH: user record (has_paid_access, pipekeeper_paid, whiskeykeeper_paid)
    // then subscription records for detail.
    const paidUsersList: any[] = [];
    const freeUsersList: any[] = [];
    const diagnostics = {
      usersWithMultipleActiveSubscriptions: 0,
      usersWithActiveSubscriptionNoPaidModules: 0,
      usersWithPaidModulesNoActiveSubscription: 0,
      usersWithSummaryRuntimeMismatch: 0,
      usersRelyingOnLegacyFallbackAccess: 0,
      usersWithStaleSyncTimestamp: 0,
      failedEntitlementSyncs: 0,
      failedStripeCallbacks: 0,
      failedPurchases: 0,
      failedRestoreAttempts: 0,
      entitlementMismatches: 0,
      importFailures: 0,
      scannerFailures: 0,
      routeCrashes: 0,
      multiPlanConflicts: 0,
      activeModuleStateDrift: 0,
      recentSyncWriteOutcomes: {
        ok: 0,
        needs_sync: 0,
        error: 0,
        unknown: 0,
      },
      recentAdminOverrides: {
        totalManualSubscriptions: 0,
        last7d: 0,
      },
      recentSubscriptionStateChanges: {
        last7d: 0,
        atRisk: 0,
      },
      samples: {
        activeNoModules: [] as string[],
        modulesNoActiveSubscription: [] as string[],
        summaryRuntimeMismatch: [] as string[],
        multipleActiveSubscriptions: [] as string[],
        staleSyncTimestamp: [] as string[],
        failedStripeCallbacks: [] as string[],
        failedPurchases: [] as string[],
        failedRestoreAttempts: [] as string[],
        entitlementMismatches: [] as string[],
        importFailures: [] as string[],
        scannerFailures: [] as string[],
        routeCrashes: [] as string[],
        multiPlanConflicts: [] as string[],
        activeModuleStateDrift: [] as string[],
        recentAdminOverrides: [] as string[],
        recentSubscriptionStateChanges: [] as string[],
      },
    };
    const staleCutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const pushSample = (bucket: string[], email: string) => {
      if (email && bucket.length < MAX_SAMPLE_SIZE) bucket.push(email);
    };

    for (const u of uniqueUsers) {
      const userPaidSubs = paidSubsByUser.get(userIdentityKey(u.id, u.email)) || [];
      const isPaid = userPaidSubs.length > 0;
      const allUserModules = uniqueModules(userPaidSubs.flatMap((s) => s.modules));
      const summaryModules = allUserModules;
      const runtimeModules = runtimeModulesFromUser(u);
      const productLabels = [...new Set(userPaidSubs.map((s) => s.productLabel).filter(Boolean))];
      const intervals = [...new Set(userPaidSubs.map((s) => s.billingInterval).filter((v): v is IntervalKind => v === 'monthly' || v === 'annual'))];
      const statusValues = [...new Set(userPaidSubs.map((s) => norm(s.subscriptionStatus || '')).filter(Boolean))];
      const platforms = [...new Set(userPaidSubs.map((s) => s.platform).filter((v): v is PlatformKind => v === 'ios' || v === 'web' || v === 'google'))];
      const renewalEligibleSubs = userPaidSubs.filter((s) => s.renewalAt && s.price !== null && s.billingInterval !== null);
      const sortedByCreatedDesc = [...userPaidSubs].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      const sortedByCreatedAsc = [...userPaidSubs].sort((a, b) => (a.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER));
      const sortedByRenewalAsc = [...renewalEligibleSubs].sort((a, b) => (a.renewalAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.renewalAt?.getTime() ?? Number.MAX_SAFE_INTEGER));
      const primarySub = sortedByCreatedDesc[0] ?? null;
      const nextRenewalSub = sortedByRenewalAsc[0] ?? null;
      const firstStartedSub = sortedByCreatedAsc[0] ?? null;
      const totalRenewalAmount = roundCurrency(renewalEligibleSubs.reduce((sum, s) => sum + (s.renewalAmount ?? 0), 0));
      const hasMultipleActivePlans = userPaidSubs.length > 1;
      const effectiveStatus =
        !isPaid ? 'none' :
        statusValues.length === 1 ? statusValues[0] :
        statusValues.length > 1 ? 'mixed' :
        'unknown';
      const effectivePlatform =
        platforms.length === 1 ? platforms[0] :
        platforms.length > 1 ? 'mixed' :
        null;
      const effectiveProductLabel =
        !isPaid ? 'Free' :
        productLabels.length === 1 ? productLabels[0] :
        null;

      if (userPaidSubs.length > 1) {
        diagnostics.usersWithMultipleActiveSubscriptions++;
        diagnostics.multiPlanConflicts++;
        pushSample(diagnostics.samples.multipleActiveSubscriptions, norm(u.email || ''));
        pushSample(diagnostics.samples.multiPlanConflicts, norm(u.email || ''));
      }
      if (userPaidSubs.length > 0 && summaryModules.length === 0) {
        diagnostics.usersWithActiveSubscriptionNoPaidModules++;
        diagnostics.activeModuleStateDrift++;
        pushSample(diagnostics.samples.activeNoModules, norm(u.email || ''));
        pushSample(diagnostics.samples.activeModuleStateDrift, norm(u.email || ''));
      }
      if (userPaidSubs.length === 0 && runtimeModules.length > 0) {
        diagnostics.usersWithPaidModulesNoActiveSubscription++;
        pushSample(diagnostics.samples.modulesNoActiveSubscription, norm(u.email || ''));
      }
      if (summaryModules.join(',') !== runtimeModules.join(',')) {
        diagnostics.usersWithSummaryRuntimeMismatch++;
        diagnostics.entitlementMismatches++;
        pushSample(diagnostics.samples.summaryRuntimeMismatch, norm(u.email || ''));
        pushSample(diagnostics.samples.entitlementMismatches, norm(u.email || ''));
      }
      if (isPaid && runtimeModules.length === 0 && Boolean(u?.isFoundingMember || u?.legacy_broad_module_access)) {
        diagnostics.usersRelyingOnLegacyFallbackAccess++;
      }

      const syncState = norm(u?.entitlement_sync_state || '');
      if (syncState === 'ok') diagnostics.recentSyncWriteOutcomes.ok++;
      else if (syncState === 'needs_sync') diagnostics.recentSyncWriteOutcomes.needs_sync++;
      else if (syncState === 'error') diagnostics.recentSyncWriteOutcomes.error++;
      else diagnostics.recentSyncWriteOutcomes.unknown++;

      if (syncState === 'error' || norm(u?.entitlement_sync_error || '').length > 0) {
        diagnostics.failedEntitlementSyncs++;
      }

      const lastSynced = parseDate(u?.entitlement_last_synced_at);
      if (isPaid && (!lastSynced || lastSynced < staleCutoff)) {
        diagnostics.usersWithStaleSyncTimestamp++;
        pushSample(diagnostics.samples.staleSyncTimestamp, norm(u.email || ''));
      }

      const row: any = {
        full_name:           u.full_name || '',
        email:               norm(u.email || ''),
        role:                u.role || 'user',
        created_date:        u.created_date || '',
        // Effective-access level fields (across all active paid subscriptions)
        subscription_status: effectiveStatus,
        product:             effectiveProductLabel,
        modules:             allUserModules,
        active_subscription_count: userPaidSubs.length,
        active_products:     productLabels,
        active_billing_intervals: intervals,
        active_platforms:    platforms,
        active_statuses:     statusValues,
        effective_access_modules: allUserModules,
        effective_access_products: productLabels,
        billing_interval:    intervals.length > 1 ? 'mixed' : (intervals[0] ?? null),
        subscribe_date:      firstStartedSub?.createdAt?.toISOString() ?? null,
        renewal_date:        hasMultipleActivePlans ? (nextRenewalSub?.renewalAt?.toISOString() ?? null) : (primarySub?.renewalAt?.toISOString() ?? null),
        renewal_amount:      hasMultipleActivePlans ? (totalRenewalAmount || null) : (primarySub?.renewalAmount ?? null),
        renewal_subscription_count: renewalEligibleSubs.length,
        has_multiple_active_plans: hasMultipleActivePlans,
        platform:            effectivePlatform,
        // Primary billing context (most recently created active paid subscription)
        primary_billing_product: primarySub?.productLabel ?? null,
        primary_billing_status: primarySub?.subscriptionStatus ?? null,
        primary_billing_platform: primarySub?.platform ?? null,
        primary_billing_interval: primarySub?.billingInterval ?? null,
        primary_billing_subscribe_date: primarySub?.createdAt?.toISOString() ?? null,
        // Renewal context
        renewal_next_date: nextRenewalSub?.renewalAt?.toISOString() ?? null,
        renewal_total_amount: totalRenewalAmount || null,
        // User entitlement flags (direct from user record — source of truth)
        pipekeeper_paid:     !!u.pipekeeper_paid,
        whiskeykeeper_paid:  !!u.whiskeykeeper_paid,
        cigarkeeper_paid:    !!u.cigarkeeper_paid,
        winekeeper_paid:     !!u.winekeeper_paid,
        account_runtime_modules: runtimeModules,
      };

      if (isPaid) paidUsersList.push(row);
      else        freeUsersList.push(row);
    }

    const resolveSubscriptionEmail = (s: any): string => {
      const fromSub = norm(s?.user_email || '');
      if (fromSub) return fromSub;
      const byId = s?.user_id ? userByIdMap.get(String(s.user_id)) : null;
      return norm(byId?.email || '');
    };

    const stripeCallbackFailures = allSubscriptions.filter((s) => {
      const provider = norm(s.provider || '');
      const status = norm(s.status || '');
      return provider === 'stripe' && (status === 'incomplete_expired' || status === 'unpaid');
    });
    diagnostics.failedStripeCallbacks = stripeCallbackFailures.length;
    stripeCallbackFailures.forEach((s) => {
      const email = resolveSubscriptionEmail(s);
      const status = norm(s?.status || 'unknown');
      if (email) {
        pushSample(diagnostics.samples.failedStripeCallbacks, `${email} (${status})`);
      }
    });

    const failedPurchases = allSubscriptions.filter((s) => {
      const status = norm(s.status || '');
      return status === 'incomplete' || status === 'incomplete_expired';
    });
    diagnostics.failedPurchases = failedPurchases.length;
    failedPurchases.forEach((s) => {
      const email = resolveSubscriptionEmail(s);
      const status = norm(s?.status || 'unknown');
      if (email) pushSample(diagnostics.samples.failedPurchases, `${email} (${status})`);
    });

    const restoreFailures = allSubscriptions.filter((s) => {
      const provider = norm(s.provider || '');
      const status = norm(s.status || '');
      return provider === 'apple' && status === 'unverified';
    });
    diagnostics.failedRestoreAttempts = restoreFailures.length;
    restoreFailures.forEach((s) => {
      const email = resolveSubscriptionEmail(s);
      if (email) pushSample(diagnostics.samples.failedRestoreAttempts, email);
    });

    const manualSubscriptions = allSubscriptions.filter((s) => norm(s.provider || '') === 'manual');
    diagnostics.recentAdminOverrides.totalManualSubscriptions = manualSubscriptions.length;
    const manualLast7d = manualSubscriptions.filter((s) => {
      const updated = parseDate(s.updated_date || s.created_date);
      return updated ? updated >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : false;
    });
    diagnostics.recentAdminOverrides.last7d = manualLast7d.length;
    manualLast7d.forEach((s) => {
      const email = resolveSubscriptionEmail(s);
      if (email) pushSample(diagnostics.samples.recentAdminOverrides, email);
    });

    const changedStateLast7d = allSubscriptions.filter((s) => {
      const updated = parseDate(s.updated_date || s.created_date);
      return updated ? updated >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : false;
    });
    const atRiskStateSet = new Set(['past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'canceled', 'unverified']);
    diagnostics.recentSubscriptionStateChanges.last7d = changedStateLast7d.length;
    diagnostics.recentSubscriptionStateChanges.atRisk = changedStateLast7d.filter((s) => atRiskStateSet.has(norm(s?.status || ''))).length;
    changedStateLast7d
      .filter((s) => atRiskStateSet.has(norm(s?.status || '')))
      .forEach((s) => {
        const email = resolveSubscriptionEmail(s);
        const status = norm(s?.status || 'unknown');
        if (email) {
          pushSample(diagnostics.samples.recentSubscriptionStateChanges, `${email} (${status})`);
        }
      });

    const totalUsers     = uniqueUsers.length;
    const paidUsersCount = paidUsersList.length;
    const freeUsersCount = freeUsersList.length;
    const paidPct        = totalUsers > 0 ? parseFloat(((paidUsersCount / totalUsers) * 100).toFixed(1)) : 0;

    // ── Signup sources ────────────────────────────────────────────────────────
    const signupSources = { web: 0, apple: 0, googlePlay: 0, unknown: 0 };
    for (const u of uniqueUsers) {
      const platform = norm(u.data?.platform || u.platform || '');
      if (platform === 'apple' || platform === 'ios')                                     signupSources.apple++;
      else if (platform === 'android' || platform === 'googleplay' || platform === 'google') signupSources.googlePlay++;
      else if (!platform)                                                                  signupSources.unknown++;
      else                                                                                 signupSources.web++;
    }

    // ── New accounts by calendar period ───────────────────────────────────────
    const newAccounts = { today: 0, week: 0, month: 0, quarter: 0, year: 0 };
    for (const u of uniqueUsers) {
      const d = parseDate(u.created_date);
      if (!d) continue;
      if (inRange(d, ranges.today))   newAccounts.today++;
      if (inRange(d, ranges.week))    newAccounts.week++;
      if (inRange(d, ranges.month))   newAccounts.month++;
      if (inRange(d, ranges.quarter)) newAccounts.quarter++;
      if (inRange(d, ranges.year))    newAccounts.year++;
    }

    // ── MRR / ARR ─────────────────────────────────────────────────────────────
    const mrrSubs  = paidSubs.filter((s) => s.billingInterval !== null && s.price !== null);
    const totalMRR = mrrSubs.reduce((sum, s) => sum + mrrContribution(s), 0);
    const mrr      = roundCurrency(totalMRR);
    const arr      = roundCurrency(mrr * 12);

    // ── Renewal revenue by calendar period ────────────────────────────────────
    const renewalWeek    = calcRenewalPeriod(paidSubs, ranges.week);
    const renewalMonth   = calcRenewalPeriod(paidSubs, ranges.month);
    const renewalQuarter = calcRenewalPeriod(paidSubs, ranges.quarter);
    const renewalYear    = calcRenewalPeriod(paidSubs, ranges.year);

    // ── Sanity checks ─────────────────────────────────────────────────────────
    const sanity = runSanityChecks({
      paidAccounts: paidUsersCount, totalAccounts: totalUsers, mrr, arr,
      renewals: { week: renewalWeek, month: renewalMonth, quarter: renewalQuarter, year: renewalYear },
    });

    const sortByDate = (a: any, b: any) =>
      new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime();
    paidUsersList.sort(sortByDate);
    freeUsersList.sort(sortByDate);

    return Response.json({
      meta: {
        generatedAt: now.toISOString(),
        dateRangeDefinition: 'calendar',
        timezoneNote: 'UTC',
        reportVersion: REPORT_VERSION,
        calendarRanges: {
          today:   { start: ranges.today.start.toISOString(),   end: ranges.today.end.toISOString()   },
          week:    { start: ranges.week.start.toISOString(),    end: ranges.week.end.toISOString()    },
          month:   { start: ranges.month.start.toISOString(),   end: ranges.month.end.toISOString()   },
          quarter: { start: ranges.quarter.start.toISOString(), end: ranges.quarter.end.toISOString() },
          year:    { start: ranges.year.start.toISOString(),    end: ranges.year.end.toISOString()    },
        },
      },
      sanityChecks: sanity,
      warnings: {
        missingPrice:      warningMissingPrice,
        missingInterval:   warningMissingInterval,
        missingPlatform:   warningMissingPlatform,
        missingPlanKey:    warningMissingPlanKey,
        unknownProduct:    warningUnknownProduct,
        duplicatesRemoved: duplicatesRemoved,
        fieldRecovery,
        unresolvedReasons: unresolvedReasonCounts,
        unresolvedSamples,
        excludedCoreRecords: paidSubs.filter((s) => s.price === null || s.billingInterval === null).length,
      },
      diagnostics,
      accounts: { total: totalUsers, paid: paidUsersCount, free: freeUsersCount, paidPct, signupSources, newAccounts },
      subscriptions: {
        totalActivePaid,
        monthly: monthlyCount,
        annual: annualCount,
        bundles: bundleCount,
        singleModule: singleCount,
        byProduct: byProductCounts,
        byModuleDirect: moduleDirectCounts,
        moduleViaBundle,
        byModuleEffective: moduleEffectiveCounts,
      },
      runRate: { mrr, arr },
      renewalRevenue: { week: renewalWeek, month: renewalMonth, quarter: renewalQuarter, year: renewalYear },
      paid_users: paidUsersList,
      free_users: freeUsersList,
    });

  } catch (error: any) {
    console.error('[getUserSubscriptionReportV3] HARD FAILURE:', error);
    return Response.json({
      error: 'report_generation_failed',
      detail: String(error?.message || error),
      meta: { generatedAt: new Date().toISOString(), reportVersion: REPORT_VERSION },
      sanityChecks: { passed: false, failures: ['Report generation failed — see server logs.'] },
      warnings: {
        missingPrice: 0,
        missingInterval: 0,
        missingPlatform: 0,
        missingPlanKey: 0,
        unknownProduct: 0,
        duplicatesRemoved: 0,
        excludedCoreRecords: 0,
        fieldRecovery: {
          price: { direct: 0, recovered: 0, unresolved: 0 },
          billingInterval: { direct: 0, recovered: 0, unresolved: 0 },
          planKey: { direct: 0, recovered: 0, unresolved: 0 },
        },
        unresolvedReasons: {
          missingPriceBySource: {},
          missingIntervalBySource: {},
          unknownPlanKeyBySource: {},
        },
        unresolvedSamples: [],
      },
      diagnostics: {
        usersWithMultipleActiveSubscriptions: 0,
        usersWithActiveSubscriptionNoPaidModules: 0,
        usersWithPaidModulesNoActiveSubscription: 0,
        usersWithSummaryRuntimeMismatch: 0,
        usersRelyingOnLegacyFallbackAccess: 0,
        usersWithStaleSyncTimestamp: 0,
        failedEntitlementSyncs: 0,
        failedStripeCallbacks: 0,
        failedPurchases: 0,
        failedRestoreAttempts: 0,
        entitlementMismatches: 0,
        importFailures: 0,
        scannerFailures: 0,
        routeCrashes: 0,
        multiPlanConflicts: 0,
        activeModuleStateDrift: 0,
        recentSyncWriteOutcomes: { ok: 0, needs_sync: 0, error: 0, unknown: 0 },
        recentAdminOverrides: { totalManualSubscriptions: 0, last7d: 0 },
        recentSubscriptionStateChanges: { last7d: 0, atRisk: 0 },
        samples: {
          activeNoModules: [],
          modulesNoActiveSubscription: [],
          summaryRuntimeMismatch: [],
          multipleActiveSubscriptions: [],
          staleSyncTimestamp: [],
          failedStripeCallbacks: [],
          failedPurchases: [],
          failedRestoreAttempts: [],
          entitlementMismatches: [],
          importFailures: [],
          scannerFailures: [],
          routeCrashes: [],
          multiPlanConflicts: [],
          activeModuleStateDrift: [],
          recentAdminOverrides: [],
          recentSubscriptionStateChanges: [],
        },
      },
      accounts: {}, subscriptions: {}, runRate: {}, renewalRevenue: {},
      paid_users: [], free_users: [],
    }, { status: 200 });
  }
});
