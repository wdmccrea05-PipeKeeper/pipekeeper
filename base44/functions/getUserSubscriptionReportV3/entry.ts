import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 100;
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'paid']);
const MONTH_ALIASES = ['month', 'monthly', 'mo'];
const YEAR_ALIASES = ['year', 'yearly', 'annual', 'yr'];
const MODULE_ALIASES = {
  pk: 'pipekeeper',
  pipekeeper: 'pipekeeper',
  pipe: 'pipekeeper',
  wk: 'whiskeykeeper',
  whiskeykeeper: 'whiskeykeeper',
  whiskey: 'whiskeykeeper',
  ck: 'cigarkeeper',
  cigarkeeper: 'cigarkeeper',
  cigar: 'cigarkeeper',
  winekeeper: 'winekeeper',
  wine: 'winekeeper',
};
const PRODUCT_ALIASES = [
  { family: 'bundle', markers: ['founders_bundle', 'founders', 'bundle', '3_module_bundle', 'three_module_bundle', 'bundle_3'] },
  { family: 'pipekeeper', markers: ['pipekeeper', 'pipe keeper', 'pk'] },
  { family: 'whiskeykeeper', markers: ['whiskeykeeper', 'whiskey keeper', 'wk', 'whiskey'] },
  { family: 'cigarkeeper', markers: ['cigarkeeper', 'cigar keeper', 'ck', 'cigar'] },
  { family: 'winekeeper', markers: ['winekeeper', 'wine keeper', 'wine'] },
];

function norm(v) {
  return String(v ?? '').trim().toLowerCase();
}
function uniq(arr) {
  return [...new Set(arr)];
}
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function fetchAll(entity) {
  const out = [];
  let skip = 0;
  while (true) {
    let page = await entity.list(null, PAGE_SIZE, skip);
    if (typeof page === 'string') {
      try { page = JSON.parse(page); } catch { break; }
    }
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return out;
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMoney(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const raw = typeof value === 'string' ? value.replace(/[$,\s]/g, '') : value;
    let n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (n <= 0) continue;
    if (Number.isInteger(n) && n >= 1000) n = n / 100;
    if (n <= 0) continue;
    return round2(n);
  }
  return null;
}

function splitCsv(v) {
  return String(v || '').split(',').map((x) => norm(x)).filter(Boolean);
}

function resolveUserKey(sub, usersByEmail) {
  const directUserId = sub.user_id || sub.userId || sub.owner_id || null;
  const email = norm(sub.user_email || sub.email || sub.customer_email);
  if (directUserId) return { userKey: String(directUserId), email };
  if (email && usersByEmail.has(email)) return { userKey: String(usersByEmail.get(email).id), email };
  if (email) return { userKey: `email:${email}`, email };
  return { userKey: `sub:${sub.id}`, email: '' };
}

function resolveInterval(sub) {
  const direct = norm(sub.billing_interval || sub.billing_period || sub.interval || sub.plan_interval || sub.recurring_interval);
  if (MONTH_ALIASES.some((m) => direct.includes(m))) return 'month';
  if (YEAR_ALIASES.some((y) => direct.includes(y))) return 'year';
  const metadataFields = [
    sub.price_id, sub.stripe_price_id, sub.apple_product_id,
    sub.plan_key, sub.plan_id, sub.product_kind, sub.productId,
  ].map(norm);
  const joined = metadataFields.join(' ');
  if (MONTH_ALIASES.some((m) => joined.includes(m))) return 'month';
  if (YEAR_ALIASES.some((y) => joined.includes(y))) return 'year';
  return null;
}

function resolveProductFamily(sub) {
  const productKind = norm(sub.product_kind);
  if (productKind && productKind !== 'unknown') {
    for (const { family, markers } of PRODUCT_ALIASES) {
      if (markers.some((m) => productKind.includes(m))) return family;
    }
  }
  const planKey = norm(sub.plan_key || sub.plan || sub.plan_id);
  if (planKey) {
    for (const { family, markers } of PRODUCT_ALIASES) {
      if (markers.some((m) => planKey.includes(m))) return family;
    }
  }
  const modules = resolveModules(sub, null);
  if (modules.length === 1) return modules[0];
  if (modules.length > 1) return 'bundle';
  const fields = [
    sub.price_id, sub.stripe_price_id, sub.apple_product_id,
    sub.productId, sub.name, sub.description,
    sub.metadata?.product_kind, sub.metadata?.plan_key,
  ].map(norm);
  const joined = fields.join(' ');
  for (const { family, markers } of PRODUCT_ALIASES) {
    if (markers.some((m) => joined.includes(m))) return family;
  }
  return null;
}

function resolveModules(sub, family) {
  const direct = splitCsv(sub.modules_csv || sub.metadata?.modules_csv || sub.paid_modules_csv)
    .map((m) => MODULE_ALIASES[m] || m)
    .filter((m) => ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].includes(m));
  if (direct.length > 0) return uniq(direct);
  if (family === 'pipekeeper') return ['pipekeeper'];
  if (family === 'whiskeykeeper') return ['whiskeykeeper'];
  if (family === 'cigarkeeper') return ['cigarkeeper'];
  if (family === 'winekeeper') return ['winekeeper'];
  if (family === 'bundle') {
    const marker = norm(sub.plan_key || sub.product_kind || sub.price_id || sub.apple_product_id || sub.productId || '');
    if (marker.includes('founders')) return ['pipekeeper', 'whiskeykeeper'];
    if (marker.includes('3_module') || marker.includes('three_module') || marker.includes('bundle_3')) {
      return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
    }
    return ['pipekeeper', 'whiskeykeeper'];
  }
  return [];
}

function providerSubId(sub) {
  return (
    sub.provider_subscription_id || sub.stripe_subscription_id ||
    sub.original_transaction_id || sub.originalTransactionId ||
    sub.transaction_id || sub.subscription_id || sub.id
  );
}

function isActivePaidStatus(sub) {
  return ACTIVE_STATUSES.has(norm(sub.status));
}

function completenessScore(n) {
  let score = 0;
  if (n.userKey) score += 3;
  if (n.providerSubscriptionId) score += 3;
  if (n.family) score += 3;
  if (n.modules.length) score += 2;
  if (n.interval) score += 2;
  if (n.amount && n.amount > 0) score += 2;
  if (n.renewalDate) score += 1;
  return score;
}

function periodRange(kind, now) {
  const start = new Date(now);
  const end = new Date(now);
  if (kind === 'week') {
    const dow = start.getUTCDay();
    const fromMonday = dow === 0 ? 6 : dow - 1;
    start.setUTCDate(start.getUTCDate() - fromMonday);
    start.setUTCHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 7);
  } else if (kind === 'month') {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCMonth(start.getUTCMonth() + 1, 1);
    end.setUTCHours(0, 0, 0, 0);
  } else if (kind === 'quarter') {
    const q = Math.floor(start.getUTCMonth() / 3);
    start.setUTCMonth(q * 3, 1);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCMonth(q * 3 + 3, 1);
    end.setUTCHours(0, 0, 0, 0);
  } else {
    start.setUTCMonth(0, 1);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCFullYear(start.getUTCFullYear() + 1, 0, 1);
    end.setUTCHours(0, 0, 0, 0);
  }
  return { start, end };
}

function inRange(d, range) {
  if (!d) return false;
  return d >= range.start && d < range.end;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [rawUsers, rawSubs] = await Promise.all([
      fetchAll(base44.asServiceRole.entities.User),
      fetchAll(base44.asServiceRole.entities.Subscription),
    ]);

    const users = rawUsers.filter((u) => !u.is_disabled && !u.merged_into_user_id);
    const usersByEmail = new Map(users.map((u) => [norm(u.email), u]));
    const now = new Date();

    const normalized = rawSubs.map((sub) => {
      const { userKey, email } = resolveUserKey(sub, usersByEmail);
      const family = resolveProductFamily(sub);
      const modules = resolveModules(sub, family);
      const interval = resolveInterval(sub);
      const amount = parseMoney(sub.amount, sub.renewal_amount, sub.price, sub.metadata?.amount, sub.metadata?.renewal_amount);
      const renewalDate =
        parseDate(sub.renewal_date) ||
        parseDate(sub.current_period_end) ||
        parseDate(sub.metadata?.renewal_date) ||
        null;
      return {
        raw: sub,
        id: String(sub.id),
        userKey,
        email,
        provider: norm(sub.provider) || 'unknown',
        providerSubscriptionId: String(providerSubId(sub) || ''),
        family,
        modules,
        interval,
        amount,
        renewalDate,
        isActive: isActivePaidStatus(sub),
      };
    });

    const active = normalized.filter((n) => n.isActive);

    const dedupeMap = new Map();
    let duplicatesMerged = 0;
    for (const row of active) {
      const key = [row.provider || 'unknown', row.providerSubscriptionId || row.id].join('|');
      const existing = dedupeMap.get(key);
      if (!existing) {
        dedupeMap.set(key, row);
        continue;
      }
      const currentScore = completenessScore(existing);
      const nextScore = completenessScore(row);
      let winner = existing;
      if (nextScore > currentScore) {
        winner = row;
      } else if (nextScore === currentScore) {
        const existingRenewal = existing.renewalDate?.getTime() || 0;
        const nextRenewal = row.renewalDate?.getTime() || 0;
        if (nextRenewal > existingRenewal) winner = row;
      }
      dedupeMap.set(key, winner);
      duplicatesMerged += 1;
    }

    const deduped = [...dedupeMap.values()];
    const trustedActive = deduped.filter((r) => r.isActive);
    const financiallyEligible = trustedActive.filter((r) => (r.amount || 0) > 0 && !!r.interval);

    const usersWithContracts = new Map();
    for (const row of trustedActive) {
      if (!usersWithContracts.has(row.userKey)) usersWithContracts.set(row.userKey, []);
      usersWithContracts.get(row.userKey).push(row);
    }

    const paidUserKeys = uniq(trustedActive.map((r) => r.userKey));
    const paidUsers = paidUserKeys.length;
    const totalUsers = users.length;
    const freeUsers = Math.max(0, totalUsers - paidUsers);

    const byProduct = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundle: 0 };
    for (const row of trustedActive) {
      if (row.family && row.family in byProduct) byProduct[row.family] += 1;
    }

    const entitlementSets = {
      pipekeeper: new Set(),
      whiskeykeeper: new Set(),
      cigarkeeper: new Set(),
      winekeeper: new Set(),
    };
    for (const row of trustedActive) {
      let modules = row.modules;
      if (modules.length === 0) {
        const user = users.find((u) => String(u.id) === row.userKey || norm(u.email) === row.email);
        if (user) {
          const fallback = splitCsv(user.paid_modules_csv);
          if (fallback.length) {
            modules = fallback.map((m) => MODULE_ALIASES[m] || m).filter(Boolean);
          } else {
            if (user.pipekeeper_paid) modules.push('pipekeeper');
            if (user.whiskeykeeper_paid) modules.push('whiskeykeeper');
            if (user.cigarkeeper_paid) modules.push('cigarkeeper');
            if (user.winekeeper_paid) modules.push('winekeeper');
          }
        }
      }
      for (const m of uniq(modules)) {
        if (m in entitlementSets) entitlementSets[m].add(row.userKey);
      }
    }

    const mrr = round2(financiallyEligible.reduce((sum, row) => {
      if (row.interval === 'year') return sum + (row.amount / 12);
      return sum + row.amount;
    }, 0));
    const arr = round2(mrr * 12);

    const renewalPeriods = {};
    for (const key of ['week', 'month', 'quarter', 'year']) {
      const range = periodRange(key, now);
      const renewing = financiallyEligible.filter((r) => inRange(r.renewalDate, range));
      renewalPeriods[key] = {
        customers: uniq(renewing.map((r) => r.userKey)).length,
        subscriptions: renewing.length,
        revenue: round2(renewing.reduce((sum, r) => sum + (r.amount || 0), 0)),
      };
    }

    const newUsers = {
      today: users.filter((u) => {
        const d = parseDate(u.created_date || u.created_at);
        if (!d) return false;
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return d >= start;
      }).length,
      week: users.filter((u) => inRange(parseDate(u.created_date || u.created_at), periodRange('week', now))).length,
      month: users.filter((u) => inRange(parseDate(u.created_date || u.created_at), periodRange('month', now))).length,
      quarter: users.filter((u) => inRange(parseDate(u.created_date || u.created_at), periodRange('quarter', now))).length,
      year: users.filter((u) => inRange(parseDate(u.created_date || u.created_at), periodRange('year', now))).length,
    };

    const signupSources = users.reduce(
      (acc, u) => {
        const p = norm(u.platform || u.signup_source || 'unknown');
        if (p === 'ios' || p === 'apple') acc.apple += 1;
        else if (p === 'android' || p === 'google') acc.google += 1;
        else if (p === 'web') acc.web += 1;
        else acc.unknown += 1;
        return acc;
      },
      { web: 0, apple: 0, google: 0, unknown: 0 },
    );

    const unknownProductRows = trustedActive.filter((r) => !r.family);
    const missingIntervalRows = trustedActive.filter((r) => !r.interval);
    const missingAmountRows = trustedActive.filter((r) => !((r.amount || 0) > 0));

    const manualAdminUsers = users.filter((u) => {
      const hasManual =
        !!u.isFoundingMember || !!u.pipekeeper_paid || !!u.whiskeykeeper_paid ||
        !!u.cigarkeeper_paid || !!u.winekeeper_paid || !!splitCsv(u.paid_modules_csv).length;
      const hasContract = paidUserKeys.includes(String(u.id));
      return hasManual && !hasContract;
    });

    const payingUsersList = [...usersWithContracts.entries()]
      .map(([userKey, rows]) => {
        const email = rows.find((r) => r.email)?.email || users.find((u) => String(u.id) === userKey)?.email || '';
        const products = uniq(rows.map((r) => r.family).filter(Boolean));
        const modules = uniq(rows.flatMap((r) => r.modules));
        return {
          userKey,
          email,
          canonicalProduct: products.join(', ') || '-',
          modules,
          status: 'paying_user',
          subscriptionCount: rows.length,
        };
      })
      .sort((a, b) => String(a.email).localeCompare(String(b.email)));

    const reasonCounts = {
      counted_as_paying_user: paidUsers,
      unknown_product: unknownProductRows.length,
      missing_interval: missingIntervalRows.length,
      missing_amount: missingAmountRows.length,
      duplicate_subscription_merged: duplicatesMerged,
      manual_admin_access: manualAdminUsers.length,
    };

    return Response.json({
      meta: { generatedAt: now.toISOString(), reportVersion: 'v6-canonical-basic' },
      accounts: { totalUsers, paidUsers, freeUsers, paidPercentage: totalUsers ? round2((paidUsers / totalUsers) * 100) : 0, signupSources, newUsers },
      subscriptions: {
        activePaidContracts: trustedActive.length,
        monthly: trustedActive.filter((r) => r.interval === 'month').length,
        annual: trustedActive.filter((r) => r.interval === 'year').length,
      },
      revenue: { mrr, arr, knownRevenueRows: financiallyEligible.length, byProduct },
      moduleCoverage: {
        pipekeeper: entitlementSets.pipekeeper.size,
        whiskeykeeper: entitlementSets.whiskeykeeper.size,
        cigarkeeper: entitlementSets.cigarkeeper.size,
        winekeeper: entitlementSets.winekeeper.size,
        totalModuleEntitlements:
          entitlementSets.pipekeeper.size + entitlementSets.whiskeykeeper.size +
          entitlementSets.cigarkeeper.size + entitlementSets.winekeeper.size,
      },
      renewals: renewalPeriods,
      reconciliation: {
        totalPaidAccounts: paidUsers,
        discrepancy: 0,
        duplicatesMerged,
        manualAdminCount: manualAdminUsers.length,
        reasonCounts,
        unresolvedSamples: {
          unknownProduct: unknownProductRows.slice(0, 10).map((r) => ({
            id: r.id, user_id: r.userKey, user_email: r.email, provider: r.provider,
            product_kind: r.raw.product_kind || r.raw.plan_key || r.raw.price_id || '-',
            price_id: r.raw.price_id || r.raw.stripe_price_id || r.raw.apple_product_id || '-',
            billing_interval: r.raw.billing_interval || r.raw.interval || '-',
            amount: r.raw.amount ?? r.raw.renewal_amount ?? '-',
            status: r.raw.status || '-',
          })),
          missingInterval: missingIntervalRows.slice(0, 10).map((r) => ({
            id: r.id, user_id: r.userKey, user_email: r.email, provider: r.provider,
            product_kind: r.family || '-',
            price_id: r.raw.price_id || r.raw.stripe_price_id || r.raw.apple_product_id || '-',
            billing_interval: '-', amount: r.amount ?? '-', status: r.raw.status || '-',
          })),
          missingAmount: missingAmountRows.slice(0, 10).map((r) => ({
            id: r.id, user_id: r.userKey, user_email: r.email, provider: r.provider,
            product_kind: r.family || '-',
            price_id: r.raw.price_id || r.raw.stripe_price_id || r.raw.apple_product_id || '-',
            billing_interval: r.interval || '-', amount: '-', status: r.raw.status || '-',
          })),
        },
      },
      payingUsersList,
    });
  } catch (error) {
    console.error('[getUserSubscriptionReportV3] fatal:', error);
    return Response.json(
      { error: error?.message || 'Failed to build user subscription report', meta: { generatedAt: new Date().toISOString(), reportVersion: 'v6-canonical-basic' } },
      { status: 500 },
    );
  }
});