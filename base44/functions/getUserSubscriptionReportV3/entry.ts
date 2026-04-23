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
const KNOWN_MODULES = new Set(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
const PRODUCT_ALIASES = [
  { family: 'bundle', markers: ['founders_bundle', 'founders', 'bundle', '3_module_bundle', 'three_module_bundle', 'bundle_3'] },
  { family: 'pipekeeper', markers: ['pipekeeper', 'pipe keeper', 'pk'] },
  { family: 'whiskeykeeper', markers: ['whiskeykeeper', 'whiskey keeper', 'wk', 'whiskey'] },
  { family: 'cigarkeeper', markers: ['cigarkeeper', 'cigar keeper', 'ck', 'cigar'] },
  { family: 'winekeeper', markers: ['winekeeper', 'wine keeper', 'wine'] },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function norm(v) { return String(v ?? '').trim().toLowerCase(); }
function uniq(arr) { return [...new Set(arr)]; }
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

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
    // cents → dollars if large integer
    if (Number.isInteger(n) && n >= 1000) n = n / 100;
    if (n <= 0) continue;
    return round2(n);
  }
  return null;
}

function splitCsv(v) {
  return String(v || '').split(',').map((x) => norm(x)).filter(Boolean);
}

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
    console.warn('[v3] fetch failed:', e?.message || e);
    return [];
  }
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

// ─── Identity resolution (from ActiveContract) ────────────────────────────────

function resolveFamilyFromMarker(marker) {
  if (!marker) return null;
  for (const { family, markers } of PRODUCT_ALIASES) {
    if (markers.some((m) => marker.includes(m))) return family;
  }
  return null;
}

function resolveProductFamily(row) {
  const candidates = [
    row.product, row.product_kind, row.product_family, row.plan_key, row.plan, row.plan_id,
    row.price_id, row.stripe_price_id, row.apple_product_id, row.productId,
    row.name, row.description, row.bundle_name,
    row.metadata?.product_kind, row.metadata?.product_family,
    row.metadata?.plan_key, row.metadata?.price_id,
  ].map(norm);
  for (const c of candidates) {
    const family = resolveFamilyFromMarker(c);
    if (family) return family;
  }
  const modules = resolveModulesRaw(row, null);
  if (modules.length === 1) return modules[0];
  if (modules.length > 1) return 'bundle';
  return null;
}

function resolveModulesRaw(row, familyHint) {
  // Try direct modules array first (ActiveContract canonical field)
  if (Array.isArray(row.modules) && row.modules.length > 0) {
    const mapped = row.modules.map((m) => MODULE_ALIASES[norm(m)] || norm(m)).filter((m) => KNOWN_MODULES.has(m));
    if (mapped.length > 0) return uniq(mapped);
  }
  // Try CSV fields
  const csvVal = row.modules_csv || row.paid_modules_csv || row.module_csv ||
    row.metadata?.modules_csv || row.metadata?.paid_modules_csv;
  const fromCsv = splitCsv(csvVal).map((m) => MODULE_ALIASES[m] || m).filter((m) => KNOWN_MODULES.has(m));
  if (fromCsv.length > 0) return uniq(fromCsv);

  // Derive from family
  if (familyHint === 'pipekeeper') return ['pipekeeper'];
  if (familyHint === 'whiskeykeeper') return ['whiskeykeeper'];
  if (familyHint === 'cigarkeeper') return ['cigarkeeper'];
  if (familyHint === 'winekeeper') return ['winekeeper'];
  if (familyHint === 'bundle') {
    const marker = norm(row.bundle_name || row.plan_key || row.product_kind || row.price_id || row.apple_product_id || row.productId || row.product_family || '');
    if (marker.includes('founders')) return ['pipekeeper', 'whiskeykeeper'];
    if (marker.includes('3_module') || marker.includes('three_module') || marker.includes('bundle_3') || marker.includes('four')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
    return ['pipekeeper', 'whiskeykeeper'];
  }
  return [];
}

function resolveInterval(row) {
  const direct = norm(row.billing_interval || row.billing_period || row.interval || row.plan_interval || row.recurring_interval || row.period || '');
  if (MONTH_ALIASES.some((m) => direct.includes(m))) return 'month';
  if (YEAR_ALIASES.some((y) => direct.includes(y))) return 'year';
  const metaFields = [
    row.price_id, row.stripe_price_id, row.apple_product_id, row.plan_key, row.plan_id,
    row.product_kind, row.productId, row.product_family,
    row.metadata?.price_id, row.metadata?.product_kind, row.metadata?.plan_key,
  ].map(norm).join(' ');
  if (MONTH_ALIASES.some((m) => metaFields.includes(m))) return 'month';
  if (YEAR_ALIASES.some((y) => metaFields.includes(y))) return 'year';
  return null;
}

function isActiveStatus(row) {
  const s = norm(row.status || row.contract_status || '');
  if (ACTIVE_STATUSES.has(s)) return true;
  if (row.is_active === true) return true;
  if (row.active === true) return true;
  return false;
}

function contractSubId(row) {
  return norm(row.provider_subscription_id || row.stripe_subscription_id ||
    row.original_transaction_id || row.originalTransactionId ||
    row.transaction_id || row.subscription_id || row.contract_id || '');
}

function resolveUserKey(row, usersByEmail) {
  const directUserId = row.user_id || row.userId || row.owner_id || row.account_user_id || null;
  const email = norm(row.user_email || row.email || row.customer_email || row.billing_email || '');
  if (directUserId) return { userKey: String(directUserId), email };
  if (email && usersByEmail.has(email)) return { userKey: String(usersByEmail.get(email).id), email };
  if (email) return { userKey: `email:${email}`, email };
  return { userKey: `row:${row.id}`, email: '' };
}

function deriveModulesFromUser(user) {
  const modules = splitCsv(user.paid_modules_csv)
    .map((m) => MODULE_ALIASES[m] || m)
    .filter((m) => KNOWN_MODULES.has(m));
  if (modules.length) return uniq(modules);
  const out = [];
  if (user.pipekeeper_paid) out.push('pipekeeper');
  if (user.whiskeykeeper_paid) out.push('whiskeykeeper');
  if (user.cigarkeeper_paid) out.push('cigarkeeper');
  if (user.winekeeper_paid) out.push('winekeeper');
  return uniq(out);
}

// ─── Subscription financial extraction ────────────────────────────────────────

function extractFinancials(subRow) {
  const amount = parseMoney(
    subRow.amount, subRow.renewal_amount, subRow.price,
    subRow.billed_amount, subRow.current_amount,
    subRow.metadata?.amount, subRow.metadata?.renewal_amount
  );
  const interval = resolveInterval(subRow);
  const renewalDate = parseDate(subRow.current_period_end) ||
    parseDate(subRow.renewal_date) ||
    parseDate(subRow.next_billing_date) ||
    parseDate(subRow.trial_end_date) ||
    parseDate(subRow.metadata?.renewal_date) || null;
  return { amount, interval, renewalDate };
}

function financialScore(f) {
  let s = 0;
  if (f.amount && f.amount > 0) s += 4;
  if (f.interval) s += 3;
  if (f.renewalDate) s += 2;
  return s;
}

// ─── Hybrid matching: for each ActiveContract find best Subscription financial row ──

function buildSubscriptionLookups(rawSubscriptions, usersByEmail) {
  // Index Subscription rows by multiple keys for fast lookup
  const byProviderSubId = new Map();   // `${provider}|${providerSubId}` → [rows]
  const byUserProviderFamily = new Map(); // `${userKey}|${provider}|${family}` → [rows]
  const byEmailProviderFamily = new Map(); // `${email}|${provider}|${family}` → [rows]

  for (const sub of rawSubscriptions) {
    const { userKey, email } = resolveUserKey(sub, usersByEmail);
    const provider = norm(sub.provider || 'unknown');
    const subId = contractSubId(sub);
    const family = resolveProductFamily(sub);

    if (subId) {
      const key = `${provider}|${subId}`;
      if (!byProviderSubId.has(key)) byProviderSubId.set(key, []);
      byProviderSubId.get(key).push({ sub, userKey, email, provider, subId, family });
    }

    // Also index by user_id lookup
    const altSubId = norm(sub.stripe_subscription_id || sub.original_transaction_id || sub.transaction_id || '');
    if (altSubId && altSubId !== subId) {
      const key2 = `${provider}|${altSubId}`;
      if (!byProviderSubId.has(key2)) byProviderSubId.set(key2, []);
      byProviderSubId.get(key2).push({ sub, userKey, email, provider, subId: altSubId, family });
    }

    if (userKey && provider && family) {
      const k = `${userKey}|${provider}|${family}`;
      if (!byUserProviderFamily.has(k)) byUserProviderFamily.set(k, []);
      byUserProviderFamily.get(k).push({ sub, userKey, email, provider, subId, family });
    }

    if (email && provider && family) {
      const k = `${email}|${provider}|${family}`;
      if (!byEmailProviderFamily.has(k)) byEmailProviderFamily.set(k, []);
      byEmailProviderFamily.get(k).push({ sub, userKey, email, provider, subId, family });
    }
  }

  return { byProviderSubId, byUserProviderFamily, byEmailProviderFamily };
}

function pickBestSubCandidate(candidates) {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].sub;

  return candidates.slice().sort((a, b) => {
    // prefer active status
    const aActive = isActiveStatus(a.sub) ? 1 : 0;
    const bActive = isActiveStatus(b.sub) ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;
    // prefer most complete financials
    const aFin = financialScore(extractFinancials(a.sub));
    const bFin = financialScore(extractFinancials(b.sub));
    if (bFin !== aFin) return bFin - aFin;
    // prefer latest renewal date
    const aRenewal = parseDate(a.sub.current_period_end || a.sub.renewal_date)?.getTime() || 0;
    const bRenewal = parseDate(b.sub.current_period_end || b.sub.renewal_date)?.getTime() || 0;
    if (bRenewal !== aRenewal) return bRenewal - aRenewal;
    // prefer latest created date
    const aCreated = parseDate(a.sub.created_date || a.sub.created_at)?.getTime() || 0;
    const bCreated = parseDate(b.sub.created_date || b.sub.created_at)?.getTime() || 0;
    return bCreated - aCreated;
  })[0].sub;
}

function findFinancialMatch(contractRow, contractUserKey, contractEmail, contractProvider, contractFamily, lookups) {
  const { byProviderSubId, byUserProviderFamily, byEmailProviderFamily } = lookups;

  // Match 1: exact provider + provider_subscription_id
  const contractSubIdVal = contractSubId(contractRow);
  if (contractProvider && contractSubIdVal) {
    const key = `${contractProvider}|${contractSubIdVal}`;
    const candidates = byProviderSubId.get(key);
    const best = pickBestSubCandidate(candidates);
    if (best) return { sub: best, matchLevel: 1 };
  }

  // Match 2: provider + source_subscription_id
  const sourceSub = norm(contractRow.source_subscription_id || '');
  if (contractProvider && sourceSub) {
    const key = `${contractProvider}|${sourceSub}`;
    const candidates = byProviderSubId.get(key);
    const best = pickBestSubCandidate(candidates);
    if (best) return { sub: best, matchLevel: 2 };
  }

  // Match 3: user_id + provider + family
  if (contractUserKey && contractProvider && contractFamily) {
    const k = `${contractUserKey}|${contractProvider}|${contractFamily}`;
    const candidates = byUserProviderFamily.get(k);
    const best = pickBestSubCandidate(candidates);
    if (best) return { sub: best, matchLevel: 3 };
  }

  // Match 4: email + provider + family
  if (contractEmail && contractProvider && contractFamily) {
    const k = `${contractEmail}|${contractProvider}|${contractFamily}`;
    const candidates = byEmailProviderFamily.get(k);
    const best = pickBestSubCandidate(candidates);
    if (best) return { sub: best, matchLevel: 4 };
  }

  // Match 5: user_id + provider (any family)
  if (contractUserKey && contractProvider) {
    // scan all family variants
    for (const fam of ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper', 'bundle']) {
      const k = `${contractUserKey}|${contractProvider}|${fam}`;
      const candidates = byUserProviderFamily.get(k);
      const best = pickBestSubCandidate(candidates);
      if (best) return { sub: best, matchLevel: 5 };
    }
  }

  return null;
}

// ─── Build normalized hybrid contract row ─────────────────────────────────────

function buildHybridRow(acRow, usersByEmail, lookups) {
  const { userKey, email } = resolveUserKey(acRow, usersByEmail);
  const provider = norm(acRow.provider || 'unknown');
  const family = resolveProductFamily(acRow);
  const modules = resolveModulesRaw(acRow, family);
  const isActive = isActiveStatus(acRow);
  const contractId = contractSubId(acRow) || String(acRow.id);

  // Try to get financials from ActiveContract itself first
  const acFinancials = extractFinancials(acRow);

  // Attempt hybrid financial merge from Subscription
  const match = findFinancialMatch(acRow, userKey, email, provider, family, lookups);

  let canonical_amount = acFinancials.amount;
  let canonical_billing_interval = acFinancials.interval;
  let canonical_renewal_date = acFinancials.renewalDate;
  let financial_source = 'ActiveContract';
  let matchLevel = null;

  if (match) {
    const subFin = extractFinancials(match.sub);
    matchLevel = match.matchLevel;

    // Merge: prefer Subscription for financials, fill gaps from AC
    canonical_amount = subFin.amount || acFinancials.amount;
    canonical_billing_interval = subFin.interval || acFinancials.interval;
    canonical_renewal_date = subFin.renewalDate || acFinancials.renewalDate;
    financial_source = (subFin.amount || subFin.interval || subFin.renewalDate) ? 'merged' : 'ActiveContract';
  }

  const is_financially_eligible = !!(canonical_amount && canonical_amount > 0 && canonical_billing_interval);

  const resolution_notes = [];
  if (!family) resolution_notes.push('unknown_product');
  if (!canonical_amount) resolution_notes.push('missing_amount');
  if (!canonical_billing_interval) resolution_notes.push('missing_interval');
  if (!canonical_renewal_date) resolution_notes.push('missing_renewal_date');
  if (match) resolution_notes.push(`sub_match_level_${matchLevel}`);
  else resolution_notes.push('no_sub_match');

  return {
    canonical_user_id: userKey,
    canonical_email: email,
    canonical_provider: provider,
    canonical_contract_id: contractId,
    canonical_product_family: family,
    canonical_modules: modules,
    canonical_status: norm(acRow.status || acRow.contract_status || 'unknown'),
    canonical_amount,
    canonical_billing_interval,
    canonical_renewal_date,
    is_active_paid_contract: isActive,
    is_financially_eligible,
    financial_source,
    identity_source: 'ActiveContract',
    resolution_notes,
    _raw_ac: acRow,
    _matched_sub: match?.sub || null,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

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

    console.log(`[v3] ActiveContracts: ${rawActiveContracts.length}, Subscriptions: ${rawSubscriptions.length}, Users: ${users.length}`);

    // Build Subscription lookup indexes for fast hybrid matching
    const subLookups = buildSubscriptionLookups(rawSubscriptions, usersByEmail);

    // ── Step 1: Build hybrid rows from ActiveContract (identity) + Subscription (financials) ──
    const hybridRows = rawActiveContracts.map((ac) => buildHybridRow(ac, usersByEmail, subLookups));

    // If no ActiveContracts, fall back to pure Subscription rows
    const useSubscriptionFallback = hybridRows.length === 0;
    let trustedActive = [];

    if (useSubscriptionFallback) {
      console.log('[v3] No ActiveContracts — falling back to Subscription rows');
      // Build hybrid rows from Subscription treating them as both identity + financial source
      for (const sub of rawSubscriptions) {
        if (!isActiveStatus(sub)) continue;
        const { userKey, email } = resolveUserKey(sub, usersByEmail);
        const provider = norm(sub.provider || 'stripe');
        const family = resolveProductFamily(sub);
        const modules = resolveModulesRaw(sub, family);
        const fins = extractFinancials(sub);
        trustedActive.push({
          canonical_user_id: userKey,
          canonical_email: email,
          canonical_provider: provider,
          canonical_contract_id: contractSubId(sub) || String(sub.id),
          canonical_product_family: family,
          canonical_modules: modules,
          canonical_status: norm(sub.status || 'unknown'),
          canonical_amount: fins.amount,
          canonical_billing_interval: fins.interval,
          canonical_renewal_date: fins.renewalDate,
          is_active_paid_contract: true,
          is_financially_eligible: !!(fins.amount && fins.interval),
          financial_source: 'Subscription',
          identity_source: 'Subscription',
          resolution_notes: ['subscription_fallback'],
          _raw_ac: sub,
          _matched_sub: sub,
        });
      }
    } else {
      // Filter to active contracts only
      trustedActive = hybridRows.filter((r) => r.is_active_paid_contract);
    }

    // ── Step 2: De-duplicate by provider + contract_id ──
    const dedupeMap = new Map();
    let duplicatesMerged = 0;
    for (const row of trustedActive) {
      const key = `${row.canonical_provider}|${row.canonical_contract_id}`;
      const existing = dedupeMap.get(key);
      if (!existing) { dedupeMap.set(key, row); continue; }
      // Keep the more complete one
      const existingScore = (existing.canonical_amount ? 4 : 0) + (existing.canonical_billing_interval ? 3 : 0) + (existing.canonical_renewal_date ? 2 : 0) + (existing.canonical_product_family ? 1 : 0);
      const newScore = (row.canonical_amount ? 4 : 0) + (row.canonical_billing_interval ? 3 : 0) + (row.canonical_renewal_date ? 2 : 0) + (row.canonical_product_family ? 1 : 0);
      if (newScore > existingScore) dedupeMap.set(key, row);
      duplicatesMerged += 1;
    }

    const dedupedActive = [...dedupeMap.values()];
    const financiallyEligible = dedupedActive.filter((r) => r.is_financially_eligible);

    // ── Step 3: Paid users (distinct, from ActiveContract identity) ──
    const paidUserKeys = uniq(dedupedActive.map((r) => r.canonical_user_id));
    const paidUsers = paidUserKeys.length;
    const totalUsers = users.length;
    const freeUsers = Math.max(0, totalUsers - paidUsers);

    // ── Step 4: Product mix ──
    const byProduct = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundle: 0 };
    for (const row of dedupedActive) {
      const f = row.canonical_product_family;
      if (f && f in byProduct) byProduct[f] += 1;
    }

    // ── Step 5: Module coverage ──
    const entitlementSets = { pipekeeper: new Set(), whiskeykeeper: new Set(), cigarkeeper: new Set(), winekeeper: new Set() };
    const activeEntitlements = rawEntitlements.filter((e) => {
      const status = norm(e.status || e.entitlement_status || '');
      return ENTITLEMENT_ACTIVE_STATUSES.has(status) || e.active === true || e.is_active === true || e.has_access === true;
    });
    const entitlementSource = activeEntitlements.length > 0 ? 'UserEntitlement' : 'DerivedFallback';

    if (activeEntitlements.length > 0) {
      for (const ent of activeEntitlements) {
        const { userKey } = resolveUserKey(ent, usersByEmail);
        // UserEntitlement has direct boolean flags per module
        if (ent.pipekeeper) entitlementSets.pipekeeper.add(userKey);
        if (ent.whiskeykeeper) entitlementSets.whiskeykeeper.add(userKey);
        if (ent.cigarkeeper) entitlementSets.cigarkeeper.add(userKey);
        if (ent.winekeeper) entitlementSets.winekeeper.add(userKey);
        // Also check module_key / modules array
        const moduleKey = MODULE_ALIASES[norm(ent.module || ent.module_key || ent.product_kind || '')] || norm(ent.module || ent.module_key || ent.product_kind || '');
        if (KNOWN_MODULES.has(moduleKey)) entitlementSets[moduleKey].add(userKey);
        if (Array.isArray(ent.modules)) {
          for (const m of ent.modules) {
            const mk = MODULE_ALIASES[norm(m)] || norm(m);
            if (KNOWN_MODULES.has(mk)) entitlementSets[mk].add(userKey);
          }
        }
      }
    } else {
      // Fallback: derive from trusted contract modules
      for (const row of dedupedActive) {
        let modules = row.canonical_modules;
        if (modules.length === 0) {
          const user = users.find((u) => String(u.id) === row.canonical_user_id || norm(u.email) === row.canonical_email);
          if (user) modules = deriveModulesFromUser(user);
        }
        for (const m of uniq(modules)) {
          if (KNOWN_MODULES.has(m)) entitlementSets[m].add(row.canonical_user_id);
        }
      }
    }

    // ── Step 6: Revenue ──
    const mrr = round2(financiallyEligible.reduce((sum, row) => {
      if (row.canonical_billing_interval === 'year') return sum + (row.canonical_amount / 12);
      return sum + row.canonical_amount;
    }, 0));
    const arr = round2(mrr * 12);

    // ── Step 7: Renewals (calendar-period buckets, unchanged) ──
    const renewalPeriods = {};
    for (const key of ['week', 'month', 'quarter', 'year']) {
      const range = periodRange(key, now);
      const renewing = financiallyEligible.filter((r) => inRange(r.canonical_renewal_date, range));
      renewalPeriods[key] = {
        customers: uniq(renewing.map((r) => r.canonical_user_id)).length,
        subscriptions: renewing.length,
        revenue: round2(renewing.reduce((sum, r) => sum + (r.canonical_amount || 0), 0)),
      };
    }

    // ── Step 7b: Forecast ──────────────────────────────────────────────────────
    // Retention assumptions (configurable defaults)
    const RETENTION = { month: 0.85, year: 0.75, unknown: 0.80 };

    // Helper: rolling window from now
    function rollingEnd(days) {
      const d = new Date(now); d.setUTCDate(d.getUTCDate() + days); return d;
    }
    function inRolling(d, days) {
      if (!d) return false;
      return d >= now && d < rollingEnd(days);
    }

    // Committed renewal: rows WITH renewal_date in window, using actual amounts
    function committedRenewal(days) {
      const rows = financiallyEligible.filter((r) => r.canonical_renewal_date && inRolling(r.canonical_renewal_date, days));
      return {
        customers: uniq(rows.map((r) => r.canonical_user_id)).length,
        subscriptions: rows.length,
        revenue: round2(rows.reduce((sum, r) => sum + (r.canonical_amount || 0), 0)),
      };
    }

    // Expected renewal: weighted by retention probability
    function expectedRenewal(days) {
      const rows = financiallyEligible.filter((r) => r.canonical_renewal_date && inRolling(r.canonical_renewal_date, days));
      const weighted = rows.reduce((sum, r) => {
        const p = RETENTION[r.canonical_billing_interval] ?? RETENTION.unknown;
        return sum + (r.canonical_amount || 0) * p;
      }, 0);
      return round2(weighted);
    }

    // New revenue forecast: based on recent 90-day new paid user trend
    // Identify users who became paying in the last 90 days
    const last90Start = new Date(now); last90Start.setUTCDate(last90Start.getUTCDate() - 90);
    const recentlyConvertedUsers = new Set();
    for (const row of financiallyEligible) {
      const user = users.find((u) => String(u.id) === row.canonical_user_id || norm(u.email) === row.canonical_email);
      const joinDate = user ? parseDate(user.created_date || user.created_at) : null;
      if (joinDate && joinDate >= last90Start) recentlyConvertedUsers.add(row.canonical_user_id);
    }
    const newPaidPer90Days = recentlyConvertedUsers.size;
    const avgFirstBilling = financiallyEligible.length > 0
      ? round2(financiallyEligible.reduce((s, r) => s + (r.canonical_amount || 0), 0) / financiallyEligible.length)
      : 0;
    const newPaidPerDay = newPaidPer90Days / 90;

    function newRevenueForecast(days) {
      return round2(newPaidPerDay * days * avgFirstBilling);
    }

    const forecast = {
      assumptions: {
        monthlyRetention: RETENTION.month,
        annualRetention: RETENTION.year,
        newPaidMethod: 'recent_90d_trend × avg_first_billing',
        newPaidPer90Days,
        newPaidPerDay: round2(newPaidPerDay * 30) + ' per 30d (approx)',
        avgFirstBillingAmount: avgFirstBilling,
      },
      committed: {
        next30: committedRenewal(30),
        next90: committedRenewal(90),
        next365: committedRenewal(365),
      },
      expectedRenewal: {
        next30: expectedRenewal(30),
        next90: expectedRenewal(90),
        next365: expectedRenewal(365),
      },
      newRevenue: {
        next30: newRevenueForecast(30),
        next90: newRevenueForecast(90),
        next365: newRevenueForecast(365),
      },
      totalExpected: {
        next30: round2(expectedRenewal(30) + newRevenueForecast(30)),
        next90: round2(expectedRenewal(90) + newRevenueForecast(90)),
        next365: round2(expectedRenewal(365) + newRevenueForecast(365)),
      },
    };

    // ── Step 8: New users ──
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

    // ── Step 9: Diagnostics ──
    const matchedToSub = dedupedActive.filter((r) => r.financial_source === 'merged').length;
    const missingAmountCount = dedupedActive.filter((r) => !r.canonical_amount).length;
    const missingIntervalCount = dedupedActive.filter((r) => !r.canonical_billing_interval).length;
    const missingRenewalCount = dedupedActive.filter((r) => !r.canonical_renewal_date).length;
    const unknownProductCount = dedupedActive.filter((r) => !r.canonical_product_family).length;

    const manualAdminUsers = users.filter((u) => {
      const hasManual = !!u.isFoundingMember || !!u.pipekeeper_paid || !!u.whiskeykeeper_paid || !!u.cigarkeeper_paid || !!u.winekeeper_paid || splitCsv(u.paid_modules_csv).length > 0;
      const hasContract = paidUserKeys.includes(String(u.id));
      return hasManual && !hasContract;
    });

    // ── Step 10: Paying users list ──
    const usersWithContracts = new Map();
    for (const row of dedupedActive) {
      if (!usersWithContracts.has(row.canonical_user_id)) usersWithContracts.set(row.canonical_user_id, []);
      usersWithContracts.get(row.canonical_user_id).push(row);
    }

    const payingUsersList = [...usersWithContracts.entries()]
      .map(([userKey, rows]) => {
        const user = users.find((u) => String(u.id) === userKey);
        const email = rows.find((r) => r.canonical_email)?.canonical_email || user?.email || '';
        let products = uniq(rows.map((r) => r.canonical_product_family).filter(Boolean));
        let modules = uniq(rows.flatMap((r) => r.canonical_modules).filter(Boolean));
        if (modules.length === 0 && user) modules = deriveModulesFromUser(user);
        if (products.length === 0 && modules.length === 1) products = [modules[0]];
        else if (products.length === 0 && modules.length > 1) products = ['bundle'];
        const totalAmount = rows.reduce((s, r) => s + (r.canonical_amount || 0), 0);
        const intervals = uniq(rows.map((r) => r.canonical_billing_interval).filter(Boolean));
        return {
          userKey, email,
          canonicalProduct: products.join(', ') || '-',
          modules,
          status: 'paying_user',
          subscriptionCount: rows.length,
          totalAmount: round2(totalAmount),
          intervals,
          financialSources: uniq(rows.map((r) => r.financial_source)),
        };
      })
      .sort((a, b) => String(a.email).localeCompare(String(b.email)));

    // ── Build exception samples ──
    const unknownProductRows = dedupedActive.filter((r) => !r.canonical_product_family);
    const missingIntervalRows = dedupedActive.filter((r) => !r.canonical_billing_interval);
    const missingAmountRows = dedupedActive.filter((r) => !r.canonical_amount);

    const toSample = (r) => ({
      contract_id: r.canonical_contract_id,
      user_id: r.canonical_user_id,
      user_email: r.canonical_email,
      provider: r.canonical_provider,
      product_family: r.canonical_product_family || '-',
      financial_source: r.financial_source,
      amount: r.canonical_amount ?? '-',
      interval: r.canonical_billing_interval || '-',
      renewal_date: r.canonical_renewal_date?.toISOString() || '-',
      resolution_notes: r.resolution_notes,
    });

    return Response.json({
      meta: {
        generatedAt: now.toISOString(),
        reportVersion: 'v8-hybrid-merge',
        identitySource: useSubscriptionFallback ? 'Subscription' : 'ActiveContract',
        financialFieldSource: useSubscriptionFallback ? 'Subscription' : 'merged Subscription fallback',
        entitlementSource,
        rawActiveContracts: rawActiveContracts.length,
        rawSubscriptions: rawSubscriptions.length,
        hybridMatchedToSubscription: matchedToSub,
        contractsFinancialFromACOnly: dedupedActive.filter((r) => r.financial_source === 'ActiveContract').length,
        contractsMissingAmount: missingAmountCount,
        contractsMissingInterval: missingIntervalCount,
        contractsMissingRenewalDate: missingRenewalCount,
      },
      accounts: {
        totalUsers, paidUsers, freeUsers,
        paidPercentage: totalUsers ? round2((paidUsers / totalUsers) * 100) : 0,
        signupSources, newUsers,
      },
      subscriptions: {
        activePaidContracts: dedupedActive.length,
        monthly: dedupedActive.filter((r) => r.canonical_billing_interval === 'month').length,
        annual: dedupedActive.filter((r) => r.canonical_billing_interval === 'year').length,
        unknownInterval: dedupedActive.filter((r) => !r.canonical_billing_interval).length,
      },
      revenue: {
        mrr, arr,
        knownRevenueRows: financiallyEligible.length,
        byProduct,
      },
      moduleCoverage: {
        pipekeeper: entitlementSets.pipekeeper.size,
        whiskeykeeper: entitlementSets.whiskeykeeper.size,
        cigarkeeper: entitlementSets.cigarkeeper.size,
        winekeeper: entitlementSets.winekeeper.size,
        totalModuleEntitlements: entitlementSets.pipekeeper.size + entitlementSets.whiskeykeeper.size + entitlementSets.cigarkeeper.size + entitlementSets.winekeeper.size,
      },
      renewals: renewalPeriods,
      forecast,
      reconciliation: {
        totalPaidAccounts: paidUsers,
        duplicatesMerged,
        manualAdminCount: manualAdminUsers.length,
        unknownProductCount,
        missingAmountCount,
        missingIntervalCount,
        missingRenewalCount,
        unresolvedSamples: {
          unknownProduct: unknownProductRows.slice(0, 10).map(toSample),
          missingInterval: missingIntervalRows.slice(0, 10).map(toSample),
          missingAmount: missingAmountRows.slice(0, 10).map(toSample),
        },
      },
      payingUsersList,
    });

  } catch (error) {
    console.error('[getUserSubscriptionReportV3] fatal:', error);
    return Response.json({
      error: error?.message || 'Failed to build subscription report',
      meta: { generatedAt: new Date().toISOString(), reportVersion: 'v8-hybrid-merge' },
    }, { status: 500 });
  }
});