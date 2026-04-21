/**
 * USER SUBSCRIPTION REPORT V3
 *
 * Comprehensive reporting with:
 * - Amount-based product inference
 * - Inferred renewal dates
 * - Trusted + inferred + exception row quality tiers
 * - Product mix from inferred products
 * - Renewal forecasting with inferred dates
 * - Reconciliation visibility
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const REPORT_VERSION = 'v3';

// ─── Canonical plan + amount mapping ───────────────────────────────────────────

const AMOUNT_TO_PLAN: Record<number, { modules: string[]; interval: 'monthly' | 'annual'; bundle: string | null }> = {
  // PipeKeeper single-module plans (fallback when modules_csv is missing)
  1.99: { modules: ['pipekeeper'], interval: 'monthly', bundle: null },
  19.99: { modules: ['pipekeeper'], interval: 'annual', bundle: null },
  
  // WhiskeyKeeper single-module plans (fallback when modules_csv is missing)
  2.99: { modules: ['whiskeykeeper'], interval: 'monthly', bundle: null },
  29.99: { modules: ['whiskeykeeper'], interval: 'annual', bundle: null },
  
  // Founders Bundle (PipeKeeper + WhiskeyKeeper)
  4.99: { modules: ['pipekeeper', 'whiskeykeeper'], interval: 'monthly', bundle: 'Founders' },
  49.99: { modules: ['pipekeeper', 'whiskeykeeper'], interval: 'annual', bundle: 'Founders' },
  
  // 3-Module Bundle (PipeKeeper + WhiskeyKeeper + CigarKeeper)
  7.99: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], interval: 'monthly', bundle: '3-Module' },
  79.99: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], interval: 'annual', bundle: '3-Module' },
  
  // 4-Module Bundle (all modules)
  8.99: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], interval: 'monthly', bundle: '4-Module' },
  89.99: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], interval: 'annual', bundle: '4-Module' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function norm(v: any): string {
  return String(v ?? '').trim().toLowerCase();
}

function parseDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function splitMods(csv: any): string[] {
  return String(csv || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
}

// ─── Amount inference ─────────────────────────────────────────────────────────

function inferFromAmount(
  amount: number,
  interval: 'monthly' | 'annual' | 'unknown' | null,
): { modules: string[]; interval: 'monthly' | 'annual'; bundle: string | null } | null {
  const a = parseFloat(Number(amount).toFixed(2));
  const entry = AMOUNT_TO_PLAN[a];
  
  // If amount is a known plan amount, resolve based on interval
  if (entry) {
    if (entry.interval === 'monthly' && (interval === 'monthly' || interval === null)) {
      return entry;
    }
    if (entry.interval === 'annual' && (interval === 'annual' || interval === null)) {
      return entry;
    }
    // Amount matches but interval mismatch — look for monthly/annual pair
    // For single-module amounts, the interval determines the row classification
    if (entry.modules.length === 0 && interval !== null && interval !== 'unknown') {
      return { ...entry, interval };
    }
  }
  
  return null;
}

// ─── Product classification ───────────────────────────────────────────────────

function classifyProduct(sub: any, interval: 'monthly' | 'annual' | 'unknown' | null): { product: string; inferred: boolean } {
  // 1. modules_csv (TRUSTED — canonical source when present)
  const modulesFromCsv = splitMods(sub.modules_csv);
  if (modulesFromCsv.length > 0) {
    // Only return single module; for bundles, use product_kind or infer from amount
    for (const m of modulesFromCsv) {
      if (['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].includes(m)) {
        return { product: m, inferred: false };
      }
    }
  }

  // 2. product_kind (TRUSTED)
  const pk = norm(sub.product_kind || '');
  if (pk === 'bundle') {
    return { product: 'bundle', inferred: false };
  }
  if (['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].includes(pk)) {
    return { product: pk, inferred: false };
  }

  // 3. bundle signals (TRUSTED)
  const bundleFields = [sub.bundle_name, sub.checkout_type, sub.plan_name, sub.name].map(norm);
  if (bundleFields.some((f) => f.includes('bundle') || f.includes('founders'))) {
    return { product: 'bundle', inferred: false };
  }

  // 4. Amount + interval inference (CRITICAL — resolves unknown products via pricing schema)
  const amount = Math.max(0, Number(sub.amount || 0));
  if (amount > 0) {
    const inference = inferFromAmount(amount, interval);
    if (inference && inference.modules.length > 0) {
      if (inference.modules.length > 1) {
        return { product: 'bundle', inferred: true };
      } else {
        return { product: inference.modules[0], inferred: true };
      }
    }
  }

  // 5. Fallback: amount alone may indicate a known plan (last resort)
  if (amount > 0) {
    // If amount matches any known plan amount, it's likely a system data issue
    // Log it and classify as inferred from amount
    if (amount >= 4.99 && amount <= 8.99) {
      return { product: 'bundle', inferred: true }; // All bundle prices are in this range
    }
  }

  return { product: 'unknown', inferred: false };
}

// ─── Interval classification ──────────────────────────────────────────────────

function classifyInterval(sub: any): { interval: 'monthly' | 'annual' | 'unknown'; inferred: boolean } {
  const direct = norm(sub.billing_interval || sub.billing_period || '');
  if (direct === 'month' || direct === 'monthly') return { interval: 'monthly', inferred: false };
  if (direct === 'year' || direct === 'yearly' || direct === 'annual') return { interval: 'annual', inferred: false };

  // Infer from plan ID
  const planId = norm(sub.price_id || sub.stripe_price_id || sub.apple_product_id || sub.plan_id || '');
  if (planId.includes('annual') || planId.includes('yearly')) return { interval: 'annual', inferred: false };
  if (planId.includes('monthly')) return { interval: 'monthly', inferred: false };

  // Infer from amount
  const amount = Math.max(0, Number(sub.amount || 0));
  if (amount > 0) {
    const inference = inferFromAmount(amount);
    if (inference) return { interval: inference.interval, inferred: true };
  }

  return { interval: 'unknown', inferred: false };
}

// ─── Renewal date inference ───────────────────────────────────────────────────

function inferRenewalDate(
  sub: any,
  interval: 'monthly' | 'annual' | 'unknown',
): { date: Date | null; inferred: boolean } {
  // 1. Explicit current_period_end
  const explicit = parseDate(sub.current_period_end);
  if (explicit) return { date: explicit, inferred: false };

  // 2. Infer from current_period_start + interval
  if (interval !== 'unknown') {
    const start = parseDate(sub.current_period_start || sub.started_at || sub.created_date);
    if (start) {
      const renewal = new Date(start);
      if (interval === 'monthly') {
        renewal.setMonth(renewal.getMonth() + 1);
      } else {
        renewal.setFullYear(renewal.getFullYear() + 1);
      }
      return { date: renewal, inferred: true };
    }
  }

  return { date: null, inferred: false };
}

// ─── Active paid status ───────────────────────────────────────────────────────

function isActivePaid(sub: any, now: Date): boolean {
  const status = norm(sub.status || '');
  if (!['active', 'trialing', 'past_due'].includes(status)) return false;

  const end = parseDate(sub.current_period_end);
  if (end && end <= now) return false;

  return true;
}

// ─── Calendar ranges ──────────────────────────────────────────────────────────

function getCalendarRange(type: 'week' | 'month' | 'quarter' | 'year', now: Date) {
  const start = new Date(now);
  let end: Date;

  switch (type) {
    case 'week': {
      const dow = start.getUTCDay();
      const daysFromMonday = dow === 0 ? 6 : dow - 1;
      start.setUTCDate(start.getUTCDate() - daysFromMonday);
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

// ─── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    // Fetch all data
    const fetchAll = async (entity: any) => {
      const items: any[] = [];
      let skip = 0;
      const PAGE = 100;
      while (true) {
        let page = await entity.list(null, PAGE, skip);
        if (typeof page === 'string') page = JSON.parse(page);
        if (!Array.isArray(page) || !page.length) break;
        items.push(...page);
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      return items;
    };

    const [allUsers, allSubs] = await Promise.all([
      fetchAll(base44.asServiceRole.entities.User),
      fetchAll(base44.asServiceRole.entities.Subscription),
    ]);

    // Build user map for reconciliation lookups
    const uniqueUsersMap = new Map<string, any>();
    for (const u of allUsers) {
      const email = norm(u.email || '');
      if (email) uniqueUsersMap.set(email, u);
    }

    const now = new Date();
    const ranges = {
      week: getCalendarRange('week', now),
      month: getCalendarRange('month', now),
      quarter: getCalendarRange('quarter', now),
      year: getCalendarRange('year', now),
    };

    // Fetch Stripe amounts (best-effort)
    const stripeAmountMap: Record<string, number> = {};
    try {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2023-10-16' });
      let hasMore = true;
      let startingAfter: string | undefined;
      let fetchCount = 0;
      while (hasMore && fetchCount < 5) {
        const page = await stripe.subscriptions.list({
          limit: 100,
          status: 'active',
          ...(startingAfter && { starting_after: startingAfter }),
        });
        for (const s of page.data) {
          const amount = s.items?.data?.[0]?.price?.unit_amount || 0;
          stripeAmountMap[s.id] = amount / 100;
        }
        hasMore = page.has_more;
        if (hasMore && page.data.length) {
          startingAfter = page.data[page.data.length - 1].id;
        }
        fetchCount++;
      }
    } catch {}

    // Process subscriptions
    const activeSubs = allSubs.filter((s) => isActivePaid(s, now));
    const trusted: any[] = [];
    const inferred: any[] = [];
    const exceptions: any[] = [];
    let stats = {
      totalActive: activeSubs.length,
      trustedCount: 0,
      inferredCount: 0,
      exceptionCount: 0,
      unknownProduct: 0,
      unknownRenewal: 0,
    };

    for (const sub of activeSubs) {
      const { interval, inferred: intervalInferred } = classifyInterval(sub);
      let { product, inferred: productInferred } = classifyProduct(sub, interval);
      const { date: renewalAt, inferred: renewalInferred } = inferRenewalDate(sub, interval);

      // Reconciliation: if product is unknown but amount + interval are known,
      // try to infer from user's paid_modules_csv as a fallback
      if (product === 'unknown' && interval !== 'unknown' && interval !== null) {
        const user = uniqueUsersMap.get(norm(sub.user_email || ''));
        if (user?.paid_modules_csv) {
          const mods = splitMods(user.paid_modules_csv);
          if (mods.length === 1) {
            product = mods[0];
            productInferred = true;
          }
        }
      }

      const amount = Math.max(0, Number(sub.amount || 0));
      const row = {
        id: sub.id,
        user_id: sub.user_id,
        user_email: norm(sub.user_email || ''),
        product,
        interval,
        amount,
        renewalAt,
        quality: 'trusted' as const,
        issues: [] as string[],
      };

      if (productInferred) {
        row.issues.push('product_inferred');
        row.quality = 'inferred' as const;
      }
      if (intervalInferred) {
        row.issues.push('interval_inferred');
        if (row.quality === 'trusted') row.quality = 'inferred' as const;
      }
      if (renewalInferred) {
        row.issues.push('renewal_inferred');
      }

      if (product === 'unknown') {
        stats.unknownProduct++;
        row.quality = 'exception';
        row.issues.push('product_unknown');
      }
      if (interval === 'unknown') {
        row.quality = 'exception';
        row.issues.push('interval_unknown');
      }
      if (!renewalAt) {
        stats.unknownRenewal++;
        row.issues.push('renewal_unknown');
      }

      if (row.quality === 'trusted') {
        trusted.push(row);
        stats.trustedCount++;
      } else if (row.quality === 'inferred') {
        inferred.push(row);
        stats.inferredCount++;
      } else {
        exceptions.push(row);
        stats.exceptionCount++;
      }
    }

    // Revenue and counts from trusted + inferred
    const revenueRows = [...trusted, ...inferred];
    // Deduplicate by user_id first (primary), then email (fallback for legacy records)
    const uniquePayingUsersSet = new Set<string>();
    for (const r of revenueRows) {
      const key = r.user_id || norm(r.user_email || '');
      if (key) uniquePayingUsersSet.add(key);
    }
    const uniquePayingUsers = uniquePayingUsersSet.size;
    const monthlyCount = revenueRows.filter((r) => r.interval === 'monthly').length;
    const annualCount = revenueRows.filter((r) => r.interval === 'annual').length;

    let mrr = 0;
    for (const r of revenueRows) {
      if (r.interval === 'monthly') mrr += r.amount;
      else if (r.interval === 'annual') mrr += r.amount / 12;
    }
    mrr = parseFloat(mrr.toFixed(2));

    // Product mix
    const productCounts: Record<string, number> = {};
    for (const r of revenueRows) {
      if (r.product !== 'unknown') {
        productCounts[r.product] = (productCounts[r.product] || 0) + 1;
      }
    }

    // Renewals (with inferred dates)
    const calcRenewal = (start: Date, end: Date) => {
      const renewing = revenueRows.filter((r) => r.renewalAt && r.renewalAt >= start && r.renewalAt <= end);
      const customers = new Set(renewing.map((r) => r.user_id || r.user_email)).size;
      const revenue = parseFloat(renewing.reduce((sum, r) => sum + r.amount, 0).toFixed(2));
      const confirmed = renewing.filter((r) => !r.issues.includes('renewal_inferred')).length;
      const inferred_count = renewing.filter((r) => r.issues.includes('renewal_inferred')).length;
      return { customers, subscriptions: renewing.length, revenue, confirmed, inferred: inferred_count };
    };

    // Paid users
    const paidList: any[] = [];
    const freeList: any[] = [];
    for (const u of uniqueUsersMap.values()) {
      const email = norm(u.email || '');
      const subs = allSubs.filter((s) => s.user_id === u.id || norm(s.user_email || '') === email);
      const activeSubs = subs.filter((s) => isActivePaid(s, now));
      const isPaid = activeSubs.length > 0 || (u.data?.entitlement_tier === 'pro' || u.data?.entitlement_tier === 'premium');

      const record = {
        email,
        full_name: u.full_name || '',
        platform: u.data?.platform || u.platform || 'web',
        created_date: u.created_date,
        subscription_status: isPaid ? 'active' : 'none',
      };

      if (isPaid) paidList.push(record);
      else freeList.push(record);
    }

    const totalUsers = uniqueUsersMap.size;
    const paidCount = paidList.length;

    return Response.json({
      meta: { generatedAt: now.toISOString(), reportVersion: REPORT_VERSION },
      stats,
      accounts: {
        totalUsers,
        paidUsers: paidCount,
        freeUsers: totalUsers - paidCount,
        paidPercentage: totalUsers > 0 ? parseFloat(((paidCount / totalUsers) * 100).toFixed(1)) : 0,
      },
      subscriptions: {
        totalActivePaid: activeSubs.length,
        trusted: stats.trustedCount,
        inferred: stats.inferredCount,
        exceptions: stats.exceptionCount,
        uniquePayingUsers,
        monthly: monthlyCount,
        annual: annualCount,
      },
      revenue: {
        mrr,
        arr: parseFloat((mrr * 12).toFixed(2)),
        byProduct: productCounts,
      },
      renewals: {
        week: calcRenewal(ranges.week.start, ranges.week.end),
        month: calcRenewal(ranges.month.start, ranges.month.end),
        quarter: calcRenewal(ranges.quarter.start, ranges.quarter.end),
        year: calcRenewal(ranges.year.start, ranges.year.end),
      },
      reconciliation: {
        unknown_product_rows: exceptions.filter((r) => r.issues.includes('product_unknown')).length,
        unknown_renewal_rows: revenueRows.filter((r) => !r.renewalAt).length,
        inferred_product_count: inferred.filter((r) => r.issues.includes('product_inferred')).length,
        inferred_renewal_count: revenueRows.filter((r) => r.issues.includes('renewal_inferred')).length,
      },
      paid_users: paidList.sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()),
      free_users: freeList.sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()),
    });
  } catch (error) {
    console.error('[V3]', error);
    return Response.json(
      {
        error: String(error?.message || error),
        meta: { generatedAt: new Date().toISOString(), reportVersion: REPORT_VERSION },
      },
      { status: 500 },
    );
  }
});