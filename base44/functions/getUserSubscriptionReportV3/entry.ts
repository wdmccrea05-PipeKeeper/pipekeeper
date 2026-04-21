/**
 * USER SUBSCRIPTION REPORT V3 — RECONCILIATION-DRIVEN
 *
 * Comprehensive reporting with:
 * - Subscription + user entitlement reconciliation
 * - Release-date-aware historical product inference
 * - Explicit reason codes for all exclusions
 * - Deduped paid user counts from unified reconciliation table
 * - Product mix from normalized + historically inferred rows
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const REPORT_VERSION = 'v3-reconciliation';

const PRODUCT_RELEASE_DATES = {
  PIPEKEEPER_PUBLIC_RELEASE: new Date('2020-01-01'),
  WHISKEYKEEPER_PUBLIC_RELEASE: new Date('2024-01-15'),
  CIGARKEEPER_PUBLIC_RELEASE: new Date('2026-04-20'),
  WINEKEEPER_PUBLIC_RELEASE: new Date('2099-12-31'),
};

// Reason codes for exclusions/non-counting
const REASON_CODES = {
  UNKNOWN_PRODUCT: 'unknown_product',
  UNKNOWN_INTERVAL: 'unknown_interval',
  MISSING_AMOUNT: 'missing_amount',
  DUPLICATE_MERGED: 'duplicate_subscription_merged',
  MANUAL_ADMIN: 'manual_admin_access',
  LEGACY_GRANT: 'legacy_grant',
  NO_ACTIVE_SUB: 'no_active_subscription',
  MALFORMED_STATUS: 'malformed_status',
  REFUNDED_CANCELED: 'refunded_or_canceled',
  RENEWAL_UNKNOWN: 'renewal_unknown',
  MISMATCH: 'unresolved_mismatch',
  COUNTED: 'counted_as_paying_user',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function norm(v) {
  return String(v ?? '').trim().toLowerCase();
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function splitMods(csv) {
  return String(csv || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
}

function inferProductFromReleaseDate(createdDate) {
  if (!createdDate) return null;
  const date = new Date(createdDate);
  if (date < PRODUCT_RELEASE_DATES.WHISKEYKEEPER_PUBLIC_RELEASE) {
    return 'pipekeeper'; // Only product available before WhiskeyKeeper
  }
  return null; // Cannot infer after multi-product era
}

// ─── Amount to Plan Mapping ────────────────────────────────────────────────────

const AMOUNT_TO_PLAN = {
  1.99: { modules: ['pipekeeper'], interval: 'monthly', bundle: null },
  19.99: { modules: ['pipekeeper'], interval: 'annual', bundle: null },
  2.99: { modules: ['whiskeykeeper'], interval: 'monthly', bundle: null },
  29.99: { modules: ['whiskeykeeper'], interval: 'annual', bundle: null },
  4.99: { modules: ['pipekeeper', 'whiskeykeeper'], interval: 'monthly', bundle: 'Founders' },
  49.99: { modules: ['pipekeeper', 'whiskeykeeper'], interval: 'annual', bundle: 'Founders' },
  7.99: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], interval: 'monthly', bundle: '3-Module' },
  79.99: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], interval: 'annual', bundle: '3-Module' },
  8.99: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], interval: 'monthly', bundle: '4-Module' },
  89.99: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], interval: 'annual', bundle: '4-Module' },
};

function inferFromAmount(amount, interval) {
  const a = parseFloat(Number(amount).toFixed(2));
  const entry = AMOUNT_TO_PLAN[a];
  if (entry && (entry.interval === interval || interval === null || interval === 'unknown')) {
    return entry;
  }
  return null;
}

// ─── Product + Interval Classification ────────────────────────────────────────

function classifyProduct(sub, interval, releaseDateInference) {
  // 1. modules_csv (TRUSTED)
  const modulesFromCsv = splitMods(sub.modules_csv);
  for (const m of modulesFromCsv) {
    if (['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].includes(m)) {
      return { product: m, inferred: false, reason: 'modules_csv' };
    }
  }

  // 2. product_kind (TRUSTED)
  const pk = norm(sub.product_kind || '');
  if (pk === 'bundle') {
    return { product: 'bundle', inferred: false, reason: 'product_kind_bundle' };
  }
  if (['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].includes(pk)) {
    return { product: pk, inferred: false, reason: 'product_kind' };
  }

  // 3. Bundle signals (TRUSTED)
  const bundleFields = [sub.bundle_name, sub.checkout_type, sub.plan_name, sub.name].map(norm);
  if (bundleFields.some((f) => f.includes('bundle') || f.includes('founders'))) {
    return { product: 'bundle', inferred: false, reason: 'bundle_signal' };
  }

  // 4. Amount + interval inference (STRONG)
  const amount = Math.max(0, Number(sub.amount || 0));
  if (amount > 0) {
    const inference = inferFromAmount(amount, interval);
    if (inference && inference.modules.length > 0) {
      const product = inference.modules.length > 1 ? 'bundle' : inference.modules[0];
      return { product, inferred: true, reason: 'amount_interval' };
    }
  }

  // 5. Historical release date inference (STRONG for legacy rows)
  if (releaseDateInference) {
    return { product: releaseDateInference, inferred: true, reason: 'historical_release_date' };
  }

  // 6. User entitlement fallback (WEAK)
  // (checked at reconciliation level, not here)

  return { product: 'unknown', inferred: false, reason: 'no_inference' };
}

function classifyInterval(sub) {
  const direct = norm(sub.billing_interval || sub.billing_period || '');
  if (direct === 'month' || direct === 'monthly') return { interval: 'monthly', inferred: false };
  if (direct === 'year' || direct === 'yearly' || direct === 'annual') return { interval: 'annual', inferred: false };

  const planId = norm(sub.price_id || sub.stripe_price_id || sub.apple_product_id || sub.plan_id || '');
  if (planId.includes('annual') || planId.includes('yearly')) return { interval: 'annual', inferred: false };
  if (planId.includes('monthly')) return { interval: 'monthly', inferred: false };

  const amount = Math.max(0, Number(sub.amount || 0));
  if (amount > 0) {
    const inference = inferFromAmount(amount);
    if (inference) return { interval: inference.interval, inferred: true };
  }

  return { interval: 'unknown', inferred: false };
}

function inferRenewalDate(sub, interval) {
  const explicit = parseDate(sub.current_period_end);
  if (explicit) return { date: explicit, inferred: false };

  if (interval !== 'unknown') {
    const start = parseDate(sub.current_period_start || sub.started_at || sub.created_date);
    if (start) {
      const renewal = new Date(start);
      if (interval === 'monthly') renewal.setMonth(renewal.getMonth() + 1);
      else renewal.setFullYear(renewal.getFullYear() + 1);
      return { date: renewal, inferred: true };
    }
  }

  return { date: null, inferred: false };
}

function isActivePaid(sub, now) {
  const status = norm(sub.status || '');
  if (!['active', 'trialing', 'past_due'].includes(status)) return false;
  const end = parseDate(sub.current_period_end);
  if (end && end <= now) return false;
  return true;
}

function getCalendarRange(type, now) {
  const start = new Date(now);
  let end;

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

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    // Fetch all data
    const fetchAll = async (entity) => {
      const items = [];
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

    const now = new Date();
    const ranges = {
      week: getCalendarRange('week', now),
      month: getCalendarRange('month', now),
      quarter: getCalendarRange('quarter', now),
      year: getCalendarRange('year', now),
    };

    // ─── BUILD RECONCILIATION TABLE ────────────────────────────────────────────

    const reconciliation = new Map(); // user_id → reconciliation record

    for (const sub of allSubs) {
      if (!isActivePaid(sub, now)) continue;

      const { interval } = classifyInterval(sub);
      const releaseDateInference = inferProductFromReleaseDate(sub.created_date || sub.started_at);
      const { product, inferred: productInferred, reason: productReason } = classifyProduct(sub, interval, releaseDateInference);
      const { date: renewalAt, inferred: renewalInferred } = inferRenewalDate(sub, interval);

      const userId = sub.user_id || norm(sub.user_email || '');
      if (!userId) continue;

      let rec = reconciliation.get(userId);
      if (!rec) {
        rec = {
          user_id: userId,
          user_email: norm(sub.user_email || ''),
          subscriptions: [],
          reason_codes: new Set(),
          entitlementTier: null,
          entitlementModules: [],
          canonicalProduct: null,
          status: 'pending',
        };
        reconciliation.set(userId, rec);
      }

      const amount = Math.max(0, Number(sub.amount || 0));
      rec.subscriptions.push({
        id: sub.id,
        product,
        productInferred,
        productReason,
        interval,
        amount,
        renewalAt,
        renewalInferred,
        status: norm(sub.status || ''),
        createdDate: sub.created_date || sub.started_at,
      });
    }

    // Enrich with user entitlements
    for (const u of allUsers) {
      const email = norm(u.email || '');
      const userId = u.id || email;

      let rec = reconciliation.get(userId);
      if (!rec && (u.has_paid_access || u.entitlement_tier === 'pro')) {
        // User has entitlements but no subscription records — possible manual grant
        rec = {
          user_id: userId,
          user_email: email,
          subscriptions: [],
          reason_codes: new Set([REASON_CODES.MANUAL_ADMIN]),
          entitlementTier: u.entitlement_tier,
          entitlementModules: splitMods(u.paid_modules_csv),
          canonicalProduct: null,
          status: 'manual_grant',
        };
        reconciliation.set(userId, rec);
      } else if (rec) {
        rec.entitlementTier = u.entitlement_tier;
        rec.entitlementModules = splitMods(u.paid_modules_csv);
      }
    }

    // ─── FINALIZE RECONCILIATION & REASON CODES ─────────────────────────────────

    const payingUsers = [];
    const reasonCounts = {};
    Object.values(REASON_CODES).forEach((code) => {
      reasonCounts[code] = 0;
    });

    for (const rec of reconciliation.values()) {
      if (rec.subscriptions.length === 0 && !rec.entitlementTier) continue; // Skip stale

      // Resolve canonical product
      const products = rec.subscriptions.map((s) => s.product).filter((p) => p !== 'unknown');
      if (products.length > 0) {
        rec.canonicalProduct = products.includes('bundle') ? 'bundle' : products[0];
      } else if (rec.entitlementModules.length > 0) {
        rec.canonicalProduct = rec.entitlementModules.length > 1 ? 'bundle' : rec.entitlementModules[0];
      }

      // Determine status
      if (rec.subscriptions.length > 1) {
        rec.reason_codes.add(REASON_CODES.DUPLICATE_MERGED);
      }
      if (!rec.canonicalProduct) {
        rec.reason_codes.add(REASON_CODES.UNKNOWN_PRODUCT);
      }

      // Count as paying user if: has active sub OR valid entitlement
      const hasActiveSub = rec.subscriptions.length > 0;
      const hasValidEntitlement = rec.entitlementTier === 'pro' && rec.entitlementModules.length > 0;

      if (hasActiveSub || hasValidEntitlement) {
        rec.status = 'paying_user';
        rec.reason_codes.add(REASON_CODES.COUNTED);
        payingUsers.push(rec);
      }

      // Count reason codes
      for (const code of rec.reason_codes) {
        reasonCounts[code]++;
      }
    }

    const uniquePayingUsers = payingUsers.length;
    const totalPaidAccounts = allSubs.filter((s) => isActivePaid(s, now)).length;

    // ─── REVENUE CALCULATIONS ──────────────────────────────────────────────────

    const revenueRows = payingUsers.flatMap((rec) => rec.subscriptions);

    let mrr = 0;
    const productCounts = {};
    const monthlyCount = revenueRows.filter((r) => r.interval === 'monthly').length;
    const annualCount = revenueRows.filter((r) => r.interval === 'annual').length;

    for (const row of revenueRows) {
      if (row.interval === 'monthly') mrr += row.amount;
      else if (row.interval === 'annual') mrr += row.amount / 12;

      if (row.product && row.product !== 'unknown') {
        productCounts[row.product] = (productCounts[row.product] || 0) + 1;
      }
    }
    mrr = parseFloat(mrr.toFixed(2));

    // ─── RENEWALS ──────────────────────────────────────────────────────────────

    const calcRenewal = (start, end) => {
      const renewing = revenueRows.filter((r) => r.renewalAt && r.renewalAt >= start && r.renewalAt <= end);
      const customers = new Set(renewing.map((_, i) => payingUsers[i]?.user_id)).size;
      const revenue = parseFloat(renewing.reduce((sum, r) => sum + r.amount, 0).toFixed(2));
      const confirmed = renewing.filter((r) => !r.renewalInferred).length;
      const inferred = renewing.filter((r) => r.renewalInferred).length;
      return { customers, subscriptions: renewing.length, revenue, confirmed, inferred };
    };

    return Response.json({
      meta: { generatedAt: now.toISOString(), reportVersion: REPORT_VERSION },
      reconciliation: {
        totalPaidAccounts,
        uniquePayingUsers,
        discrepancy: totalPaidAccounts - uniquePayingUsers,
        reasonCounts,
      },
      accounts: {
        totalUsers: allUsers.length,
        paidUsers: uniquePayingUsers,
        freeUsers: allUsers.length - uniquePayingUsers,
        paidPercentage: allUsers.length > 0 ? parseFloat(((uniquePayingUsers / allUsers.length) * 100).toFixed(1)) : 0,
      },
      subscriptions: {
        totalActivePaid: totalPaidAccounts,
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
      payingUsersList: payingUsers.map((rec) => ({
        user_id: rec.user_id,
        email: rec.user_email,
        status: rec.status,
        canonicalProduct: rec.canonicalProduct,
        modules: rec.entitlementModules,
        subscriptionCount: rec.subscriptions.length,
        reasonCodes: Array.from(rec.reason_codes),
      })),
    });
  } catch (error) {
    console.error('[V3-Reconciliation]', error);
    return Response.json(
      { error: String(error?.message || error), reportVersion: REPORT_VERSION },
      { status: 500 },
    );
  }
});