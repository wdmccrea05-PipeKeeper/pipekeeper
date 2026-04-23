import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 100;
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'paid']);
const ENTITLEMENT_ACTIVE_STATUSES = new Set(['active', 'granted', 'enabled', 'paid', 'pro']);
const MONTH_ALIASES = ['month', 'monthly', 'mo'];
const YEAR_ALIASES = ['year', 'yearly', 'annual', 'yr'];
const MODULE_ALIASES = {
  pk: 'pipekeeper', pipekeeper: 'pipekeeper', pipe: 'pipekeeper',
  wk: 'whiskeykeeper', whiskeykeeper: 'whiskeykeeper', whiskey: 'whiskeykeeper',
  ck: 'cigarkeeper', cigarkeeper: 'cigarkeeper', cigar: 'cigarkeeper',
  winekeeper: 'winekeeper', wine: 'winekeeper',
};
const PRODUCT_ALIASES = [
  { family: 'bundle', markers: ['founders_bundle', 'founders', 'bundle', '3_module_bundle', 'three_module_bundle', 'bundle_3'] },
  { family: 'pipekeeper', markers: ['pipekeeper', 'pipe keeper', 'pk'] },
  { family: 'whiskeykeeper', markers: ['whiskeykeeper', 'whiskey keeper', 'wk', 'whiskey'] },
  { family: 'cigarkeeper', markers: ['cigarkeeper', 'cigar keeper', 'ck', 'cigar'] },
  { family: 'winekeeper', markers: ['winekeeper', 'wine keeper', 'wine'] },
];

function norm(v) { return String(v ?? '').trim().toLowerCase(); }
function uniq(arr) { return [...new Set(arr)]; }
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

async function fetchAll(entity) {
  const out = [];
  let skip = 0;
  while (true) {
    let page = await entity.list(null, PAGE_SIZE, skip);
    if (typeof page === 'string') { try { page = JSON.parse(page); } catch { break; } }
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return out;
}

async function fetchAllSafe(entity) {
  try { return await fetchAll(entity); } catch (e) {
    console.warn('[getUserSubscriptionReportV3] optional entity fetch failed:', e?.message || e);
    return [];
  }
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

function resolveUserKey(row, usersByEmail) {
  const directUserId = row.user_id || row.userId || row.owner_id || row.account_user_id || null;
  const email = norm(row.user_email || row.email || row.customer_email || row.billing_email);
  if (directUserId) return { userKey: String(directUserId), email };
  if (email && usersByEmail.has(email)) return { userKey: String(usersByEmail.get(email).id), email };
  if (email) return { userKey: `email:${email}`, email };
  return { userKey: `row:${row.id}`, email: '' };
}

function resolveInterval(row) {
  const direct = norm(row.billing_interval || row.billing_period || row.interval || row.plan_interval || row.recurring_interval || row.period);
  if (MONTH_ALIASES.some((m) => direct.includes(m))) return 'month';
  if (YEAR_ALIASES.some((y) => direct.includes(y))) return 'year';
  const metadataFields = [
    row.price_id, row.stripe_price_id, row.apple_product_id, row.plan_key, row.plan_id,
    row.product_kind, row.productId, row.product_family,
    row.metadata?.price_id, row.metadata?.product_kind, row.metadata?.plan_key,
  ].map(norm);
  const joined = metadataFields.join(' ');
  if (MONTH_ALIASES.some((m) => joined.includes(m))) return 'month';
  if (YEAR_ALIASES.some((y) => joined.includes(y))) return 'year';
  return null;
}

function resolveFamilyFromMarker(marker) {
  if (!marker) return null;
  for (const { family, markers } of PRODUCT_ALIASES) {
    if (markers.some((m) => marker.includes(m))) return family;
  }
  return null;
}

function resolveModules(row, familyHint) {
  const direct = splitCsv(
    row.modules_csv || row.paid_modules_csv || row.module_csv ||
    row.metadata?.modules_csv || row.metadata?.paid_modules_csv
  ).map((m) => MODULE_ALIASES[m] || m).filter((m) => ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].includes(m));
  if (direct.length > 0) return uniq(direct);
  if (familyHint === 'pipekeeper') return ['pipekeeper'];
  if (familyHint === 'whiskeykeeper') return ['whiskeykeeper'];
  if (familyHint === 'cigarkeeper') return ['cigarkeeper'];
  if (familyHint === 'winekeeper') return ['winekeeper'];
  if (familyHint === 'bundle') {
    const marker = norm(row.plan_key || row.product_kind || row.price_id || row.apple_product_id || row.productId || row.product_family || '');
    if (marker.includes('founders')) return ['pipekeeper', 'whiskeykeeper'];
    if (marker.includes('3_module') || marker.includes('three_module') || marker.includes('bundle_3')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
    return ['pipekeeper', 'whiskeykeeper'];
  }
  return [];
}

function resolveProductFamily(row) {
  const candidates = [
    row.product_kind, row.product_family, row.plan_key, row.plan, row.plan_id,
    row.price_id, row.stripe_price_id, row.apple_product_id, row.productId,
    row.name, row.description, row.metadata?.product_kind, row.metadata?.product_family,
    row.metadata?.plan_key, row.metadata?.price_id,
  ].map(norm);
  for (const c of candidates) {
    const family = resolveFamilyFromMarker(c);
    if (family) return family;
  }
  const modules = resolveModules(row, null);
  if (modules.length === 1) return modules[0];
  if (modules.length > 1) return 'bundle';
  return null;
}

function providerSubId(row) {
  return row.provider_subscription_id || row.stripe_subscription_id || row.original_transaction_id ||
    row.originalTransactionId || row.transaction_id || row.subscription_id || row.contract_id || row.id;
}

function isActiveStatus(row) {
  const s = norm(row.status || row.contract_status);
  if (ACTIVE_STATUSES.has(s)) return true;
  if (row.is_active === true) return true;
  if (row.active === true) return true;
  return false;
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
    start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
    end.setUTCMonth(start.getUTCMonth() + 1, 1); end.setUTCHours(0, 0, 0, 0);
  } else if (kind === 'quarter') {
    const q = Math.floor(start.getUTCMonth() / 3);
    start.setUTCMonth(q * 3, 1); start.setUTCHours(0, 0, 0, 0);
    end.setUTCMonth(q * 3 + 3, 1); end.setUTCHours(0, 0, 0, 0);
  } else {
    start.setUTCMonth(0, 1); start.setUTCHours(0, 0, 0, 0);
    end.setUTCFullYear(start.getUTCFullYear() + 1, 0, 1); end.setUTCHours(0, 0, 0, 0);
  }
  return { start, end };
}

function inRange(d, range) {
  if (!d) return false;
  return d >= range.start && d < range.end;
}

function normalizeContract(row, usersByEmail) {
  const { userKey, email } = resolveUserKey(row, usersByEmail);
  const family = resolveProductFamily(row);
  const modules = resolveModules(row, family);
  const interval = resolveInterval(row);
  const amount = parseMoney(row.amount, row.renewal_amount, row.price, row.billed_amount, row.current_amount, row.metadata?.amount, row.metadata?.renewal_amount);
  const renewalDate = parseDate(row.renewal_date) || parseDate(row.current_period_end) || parseDate(row.next_billing_date) || parseDate(row.metadata?.renewal_date) || null;
  return {
    raw: row, id: String(row.id), userKey, email,
    provider: norm(row.provider) || 'unknown',
    providerSubscriptionId: String(providerSubId(row) || ''),
    family, modules, interval, amount, renewalDate,
    isActive: isActiveStatus(row),
  };
}

function deriveModulesFromUser(user) {
  const modules = splitCsv(user.paid_modules_csv)
    .map((m) => MODULE_ALIASES[m] || m)
    .filter((m) => ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].includes(m));
  if (modules.length) return uniq(modules);
  const out = [];
  if (user.pipekeeper_paid) out.push('pipekeeper');
  if (user.whiskeykeeper_paid) out.push('whiskeykeeper');
  if (user.cigarkeeper_paid) out.push('cigarkeeper');
  if (user.winekeeper_paid) out.push('winekeeper');
  return uniq(out);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || me.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [rawUsers, rawSubscriptions, rawActiveContracts, rawEntitlements] = await Promise.all([
      fetchAllSafe(base44.asServiceRole.entities.User),
      fetchAllSafe(base44.asServiceRole.entities.Subscription),
      fetchAllSafe(base44.asServiceRole.entities.ActiveContract),
      fetchAllSafe(base44.asServiceRole.entities.UserEntitlement),
    ]);

    const users = rawUsers.filter((u) => !u.is_disabled && !u.merged_into_user_id);
    const usersByEmail = new Map(users.map((u) => [norm(u.email), u]));
    const now = new Date();

    // PRIMARY TRUSTED SOURCE: ActiveContract; fallback to Subscription
    const activeContractRows = rawActiveContracts.map((row) => normalizeContract(row, usersByEmail));
    const rawSubscriptionRows = rawSubscriptions.map((row) => normalizeContract(row, usersByEmail));
    const sourceRows = activeContractRows.length > 0 ? activeContractRows : rawSubscriptionRows;
    const rawSourceName = activeContractRows.length > 0 ? 'ActiveContract' : 'Subscription';

    const active = sourceRows.filter((n) => n.isActive);

    // De-dupe by provider + provider subscription id
    const dedupeMap = new Map();
    let duplicatesMerged = 0;
    for (const row of active) {
      const key = [row.provider || 'unknown', row.providerSubscriptionId || row.id].join('|');
      const existing = dedupeMap.get(key);
      if (!existing) { dedupeMap.set(key, row); continue; }
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

    const trustedActive = [...dedupeMap.values()];
    const financiallyEligible = trustedActive.filter((r) => (r.amount || 0) > 0 && !!r.interval);
    const paidUserKeys = uniq(trustedActive.map((r) => r.userKey));
    const paidUsers = paidUserKeys.length;
    const totalUsers = users.length;
    const freeUsers = Math.max(0, totalUsers - paidUsers);

    const usersWithContracts = new Map();
    for (const row of trustedActive) {
      if (!usersWithContracts.has(row.userKey)) usersWithContracts.set(row.userKey, []);
      usersWithContracts.get(row.userKey).push(row);
    }

    // PRODUCT MIX from trusted contracts
    const byProduct = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundle: 0 };
    for (const row of trustedActive) {
      if (row.family && row.family in byProduct) byProduct[row.family] += 1;
    }

    // PRIMARY MODULE COVERAGE SOURCE: UserEntitlement if present; fallback to derived
    const entitlementSets = {
      pipekeeper: new Set(), whiskeykeeper: new Set(),
      cigarkeeper: new Set(), winekeeper: new Set(),
    };
    const activeEntitlements = rawEntitlements.filter((e) => {
      const status = norm(e.status || e.entitlement_status);
      return ENTITLEMENT_ACTIVE_STATUSES.has(status) || e.active === true || e.is_active === true;
    });

    if (activeEntitlements.length > 0) {
      for (const ent of activeEntitlements) {
        const { userKey } = resolveUserKey(ent, usersByEmail);
        const moduleKey = MODULE_ALIASES[norm(ent.module || ent.module_key || ent.product_kind)] || norm(ent.module || ent.module_key || ent.product_kind);
        if (moduleKey in entitlementSets) entitlementSets[moduleKey].add(userKey);
      }
    } else {
      // Fallback: derive from trusted contracts + user flags
      for (const row of trustedActive) {
        let modules = row.modules;
        if (modules.length === 0) {
          const user = users.find((u) => String(u.id) === row.userKey || norm(u.email) === row.email);
          if (user) modules = deriveModulesFromUser(user);
        }
        for (const m of uniq(modules)) {
          if (m in entitlementSets) entitlementSets[m].add(row.userKey);
        }
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
      today: users.filter((u) => { const d = parseDate(u.created_date || u.created_at); if (!d) return false; const start = new Date(now); start.setHours(0, 0, 0, 0); return d >= start; }).length,
      week: users.filter((u) => inRange(parseDate(u.created_date || u.created_at), periodRange('week', now))).length,
      month: users.filter((u) => inRange(parseDate(u.created_date || u.created_at), periodRange('month', now))).length,
      quarter: users.filter((u) => inRange(parseDate(u.created_date || u.created_at), periodRange('quarter', now))).length,
      year: users.filter((u) => inRange(parseDate(u.created_date || u.created_at), periodRange('year', now))).length,
    };

    const signupSources = users.reduce((acc, u) => {
      const p = norm(u.platform || u.signup_source || 'unknown');
      if (p === 'ios' || p === 'apple') acc.apple += 1;
      else if (p === 'android' || p === 'google') acc.google += 1;
      else if (p === 'web') acc.web += 1;
      else acc.unknown += 1;
      return acc;
    }, { web: 0, apple: 0, google: 0, unknown: 0 });

    const unknownProductRows = trustedActive.filter((r) => !r.family);
    const missingIntervalRows = trustedActive.filter((r) => !r.interval);
    const missingAmountRows = trustedActive.filter((r) => !((r.amount || 0) > 0));

    const manualAdminUsers = users.filter((u) => {
      const hasManual = !!u.isFoundingMember || !!u.pipekeeper_paid || !!u.whiskeykeeper_paid || !!u.cigarkeeper_paid || !!u.winekeeper_paid || !!splitCsv(u.paid_modules_csv).length;
      const hasContract = paidUserKeys.includes(String(u.id));
      return hasManual && !hasContract;
    });

    const payingUsersList = [...usersWithContracts.entries()]
      .map(([userKey, rows]) => {
        const user = users.find((u) => String(u.id) === userKey);
        const email = rows.find((r) => r.email)?.email || user?.email || '';
        let products = uniq(rows.map((r) => r.family).filter(Boolean));
        let modules = uniq(rows.flatMap((r) => r.modules).filter(Boolean));
        if (modules.length === 0 && user) modules = deriveModulesFromUser(user);
        if (products.length === 0 && modules.length === 1) products = [modules[0]];
        else if (products.length === 0 && modules.length > 1) products = ['bundle'];
        return { userKey, email, canonicalProduct: products.join(', ') || '-', modules, status: 'paying_user', subscriptionCount: rows.length };
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
      meta: {
        generatedAt: now.toISOString(),
        reportVersion: 'v7-active-contract-primary',
        trustedContractSource: rawSourceName,
        entitlementSource: activeEntitlements.length > 0 ? 'UserEntitlement' : 'DerivedFallback',
      },
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
        totalModuleEntitlements: entitlementSets.pipekeeper.size + entitlementSets.whiskeykeeper.size + entitlementSets.cigarkeeper.size + entitlementSets.winekeeper.size,
      },
      renewals: renewalPeriods,
      reconciliation: {
        totalPaidAccounts: paidUsers, discrepancy: 0, duplicatesMerged, manualAdminCount: manualAdminUsers.length, reasonCounts,
        unresolvedSamples: {
          unknownProduct: unknownProductRows.slice(0, 10).map((r) => ({ id: r.id, user_id: r.userKey, user_email: r.email, provider: r.provider, product_kind: r.raw.product_kind || r.raw.plan_key || r.raw.price_id || '-', price_id: r.raw.price_id || r.raw.stripe_price_id || r.raw.apple_product_id || '-', billing_interval: r.raw.billing_interval || r.raw.interval || '-', amount: r.raw.amount ?? r.raw.renewal_amount ?? '-', status: r.raw.status || r.raw.contract_status || '-' })),
          missingInterval: missingIntervalRows.slice(0, 10).map((r) => ({ id: r.id, user_id: r.userKey, user_email: r.email, provider: r.provider, product_kind: r.family || '-', price_id: r.raw.price_id || r.raw.stripe_price_id || r.raw.apple_product_id || '-', billing_interval: '-', amount: r.amount ?? '-', status: r.raw.status || r.raw.contract_status || '-' })),
          missingAmount: missingAmountRows.slice(0, 10).map((r) => ({ id: r.id, user_id: r.userKey, user_email: r.email, provider: r.provider, product_kind: r.family || '-', price_id: r.raw.price_id || r.raw.stripe_price_id || r.raw.apple_product_id || '-', billing_interval: r.interval || '-', amount: '-', status: r.raw.status || r.raw.contract_status || '-' })),
        },
      },
      payingUsersList,
    });
  } catch (error) {
    console.error('[getUserSubscriptionReportV3] fatal:', error);
    return Response.json({ error: error?.message || 'Failed to build user subscription report', meta: { generatedAt: new Date().toISOString(), reportVersion: 'v7-active-contract-primary' } }, { status: 500 });
  }
});