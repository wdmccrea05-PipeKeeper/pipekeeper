import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const REPORT_VERSION = 'v3.1';
const MAX_SAMPLE_SIZE = 25;

// ─── Types ────────────────────────────────────────────────────────────────────

type IntervalKind = 'monthly' | 'annual';
type PlatformKind = 'ios' | 'web' | 'google';

interface NormalizedSub {
  rawId: string;
  userId: string;
  userEmail: string;
  isPaid: boolean;
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
  const v = norm(raw.billing_interval || raw.billing_period || '');
  if (v === 'month' || v === 'monthly') return 'monthly';
  if (v === 'year' || v === 'yearly' || v === 'annual') return 'annual';
  return null;
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
//   4. Amount inference for bundle prices (resolves modules from price)
//   5. 'unknown' — truly unresolvable products stay unknown

function normalizeSub(raw: any, user: any | null = null): NormalizedSub {
  const planKey = norm(raw.planKey || raw.plan_key || '') || null;
  const catalog = lookupPlan(planKey);

  const rawAmount = Math.max(0, Number(raw.amount || 0));
  const amountInference = rawAmount > 0 ? inferFromAmount(rawAmount) : null;

  // ── Price resolution: stored amount → catalog fallback ───────────────────
  const price: number | null =
    rawAmount > 0 ? rawAmount :
    catalog   ? catalog.price :
    null;

  const renewalAmount = price;

  // ── Interval resolution: field → catalog → amount inference ──────────────
  const fieldInterval = normalizeInterval(raw);
  const billingInterval: IntervalKind | null =
    fieldInterval ??
    (catalog?.billingInterval ?? null) ??
    (amountInference?.billingInterval ?? null);

  // ── Module resolution (never defaults to 'pipekeeper') ───────────────────
  let modules: string[];
  let productLabel: string;

  if (catalog) {
    // 1. Authoritative catalog match via planKey
    modules = catalog.modules;
    productLabel = buildProductLabel(catalog.modules, catalog.label);
  } else {
    // 2. modules_csv stored field
    const csvModules = String(raw.modules_csv || '')
      .split(',')
      .map((m: string) => m.trim().toLowerCase())
      .filter(Boolean);

    if (csvModules.length > 0) {
      modules = csvModules;
      productLabel = buildProductLabel(modules, modules.length > 1 ? 'Bundle' : modules[0]);
    } else if (norm(raw.primary_module || '')) {
      // 3. primary_module stored field
      modules = [norm(raw.primary_module)];
      productLabel = buildProductLabel(modules, modules[0]);
    } else if (amountInference?.modules) {
      // 4. Amount inference for bundle amounts (resolves modules definitively)
      modules = amountInference.modules;
      productLabel = amountInference.label;
    } else {
      // 5. Truly unresolvable — mark as unknown, NOT pipekeeper
      modules = ['unknown'];
      productLabel = 'Unknown';
    }
  }

  const module = modules[0];

  return {
    rawId:          String(raw.id || raw.stripe_subscription_id || ''),
    userId:         String(raw.user_id || ''),
    userEmail:      norm(raw.user_email || ''),
    isPaid:         isActivePaid(raw),
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
  const revenue   = parseFloat(renewing.reduce((sum, s) => sum + (s.price ?? 0), 0).toFixed(2));
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
    for (const sub of paidSubs) {
      if (sub.price === null)           warningMissingPrice++;
      if (sub.billingInterval === null) warningMissingInterval++;
      if (sub.platform === null)        warningMissingPlatform++;
      if (sub.planKey === null)         warningMissingPlanKey++;
      if (sub.module === 'unknown')     warningUnknownProduct++;
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
        if      (m === 'pipekeeper')    byProductCounts.pipekeeper++;
        else if (m === 'whiskeykeeper') byProductCounts.whiskeykeeper++;
        else if (m === 'cigarkeeper')   byProductCounts.cigarkeeper++;
        else if (m === 'winekeeper')    byProductCounts.winekeeper++;
        else                            byProductCounts.unknown++;
      }
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
      failedRestoreAttempts: 0,
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
      samples: {
        activeNoModules: [] as string[],
        modulesNoActiveSubscription: [] as string[],
        summaryRuntimeMismatch: [] as string[],
        multipleActiveSubscriptions: [] as string[],
        staleSyncTimestamp: [] as string[],
      },
    };
    const staleCutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const pushSample = (bucket: string[], email: string) => {
      if (email && bucket.length < MAX_SAMPLE_SIZE) bucket.push(email);
    };

    for (const u of uniqueUsers) {
      const rawUserSubs = getUserRawSubs(u);
      const activePaidUserSubs = rawUserSubs.filter(isActivePaid);
      const normalizedActiveSubs = activePaidUserSubs.map((raw) => normalizeSub(raw, u));

      // Primary: subscription rows. Secondary: user entitlement flags.
      let isPaid = activePaidUserSubs.length > 0;
      if (!isPaid) {
        isPaid = !!(u.has_paid_access || u.pipekeeper_paid || u.whiskeykeeper_paid || u.cigarkeeper_paid || u.winekeeper_paid);
      }

      // Best subscription: prefer active, then trialing, then most recent
      const sortedSubs = [...activePaidUserSubs].sort((a, b) => {
        const rank = (s: any) => norm(s.status) === 'active' ? 2 : norm(s.status) === 'trialing' ? 1 : 0;
        const rd = rank(b) - rank(a);
        if (rd !== 0) return rd;
        return new Date(b.current_period_start || b.created_date || 0).getTime() -
               new Date(a.current_period_start || a.created_date || 0).getTime();
      });

      const bestRaw = sortedSubs[0] ?? null;
      const bestSub = bestRaw ? normalizeSub(bestRaw, u) : null;

      // Collect all active modules for this user
      const allUserModules = uniqueModules(normalizedActiveSubs.flatMap((s) => s.modules));
      const summaryModules = allUserModules;
      const runtimeModules = runtimeModulesFromUser(u);

      if (activePaidUserSubs.length > 1) {
        diagnostics.usersWithMultipleActiveSubscriptions++;
        pushSample(diagnostics.samples.multipleActiveSubscriptions, norm(u.email || ''));
      }
      if (activePaidUserSubs.length > 0 && summaryModules.length === 0) {
        diagnostics.usersWithActiveSubscriptionNoPaidModules++;
        pushSample(diagnostics.samples.activeNoModules, norm(u.email || ''));
      }
      if (activePaidUserSubs.length === 0 && runtimeModules.length > 0) {
        diagnostics.usersWithPaidModulesNoActiveSubscription++;
        pushSample(diagnostics.samples.modulesNoActiveSubscription, norm(u.email || ''));
      }
      if (summaryModules.join(',') !== runtimeModules.join(',')) {
        diagnostics.usersWithSummaryRuntimeMismatch++;
        pushSample(diagnostics.samples.summaryRuntimeMismatch, norm(u.email || ''));
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
        subscription_status: isPaid ? (norm(bestRaw?.status) || 'active') : 'none',
        // ── New enriched fields ──────────────────────────────────────────────
        product:             bestSub?.productLabel ?? (isPaid ? 'Unknown' : 'Free'),
        modules:             allUserModules,
        billing_interval:    bestSub?.billingInterval ?? null,
        subscribe_date:      bestSub?.createdAt?.toISOString() ?? null,
        renewal_date:        bestSub?.renewalAt?.toISOString() ?? null,
        renewal_amount:      bestSub?.renewalAmount ?? null,
        platform:            bestSub?.platform ?? null,
        // User entitlement flags (direct from user record — source of truth)
        pipekeeper_paid:     !!u.pipekeeper_paid,
        whiskeykeeper_paid:  !!u.whiskeykeeper_paid,
        cigarkeeper_paid:    !!u.cigarkeeper_paid,
        winekeeper_paid:     !!u.winekeeper_paid,
      };

      if (isPaid) paidUsersList.push(row);
      else        freeUsersList.push(row);
    }

    diagnostics.failedStripeCallbacks = allSubscriptions.filter((s) => {
      const provider = norm(s.provider || '');
      const status = norm(s.status || '');
      return provider === 'stripe' && (status === 'incomplete_expired' || status === 'unpaid');
    }).length;

    diagnostics.failedRestoreAttempts = allSubscriptions.filter((s) => {
      const provider = norm(s.provider || '');
      const status = norm(s.status || '');
      return provider === 'apple' && status === 'unverified';
    }).length;

    const manualSubscriptions = allSubscriptions.filter((s) => norm(s.provider || '') === 'manual');
    diagnostics.recentAdminOverrides.totalManualSubscriptions = manualSubscriptions.length;
    diagnostics.recentAdminOverrides.last7d = manualSubscriptions.filter((s) => {
      const updated = parseDate(s.updated_date || s.created_date);
      return updated ? updated >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : false;
    }).length;

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
    const mrr      = parseFloat(totalMRR.toFixed(2));
    const arr      = parseFloat((mrr * 12).toFixed(2));

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
        moduleViaBundle,
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
      warnings: { missingPrice: 0, missingInterval: 0, missingPlatform: 0, missingPlanKey: 0, unknownProduct: 0, duplicatesRemoved: 0 },
      diagnostics: {
        usersWithMultipleActiveSubscriptions: 0,
        usersWithActiveSubscriptionNoPaidModules: 0,
        usersWithPaidModulesNoActiveSubscription: 0,
        usersWithSummaryRuntimeMismatch: 0,
        usersRelyingOnLegacyFallbackAccess: 0,
        usersWithStaleSyncTimestamp: 0,
        failedEntitlementSyncs: 0,
        failedStripeCallbacks: 0,
        failedRestoreAttempts: 0,
        recentSyncWriteOutcomes: { ok: 0, needs_sync: 0, error: 0, unknown: 0 },
        recentAdminOverrides: { totalManualSubscriptions: 0, last7d: 0 },
        samples: {
          activeNoModules: [],
          modulesNoActiveSubscription: [],
          summaryRuntimeMismatch: [],
          multipleActiveSubscriptions: [],
          staleSyncTimestamp: [],
        },
      },
      accounts: {}, subscriptions: {}, runRate: {}, renewalRevenue: {},
      paid_users: [], free_users: [],
    }, { status: 200 });
  }
});
