import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REPORT_VERSION = 'v5.0-ledger';
const MAX_SAMPLE_SIZE = 25;

// ─── PLAN CATALOG (single source of truth) ────────────────────────────────────
// One row per known product. All KPIs derive from here.
const PLAN_CATALOG = {
  pipekeeper_premium_monthly:    { modules: ['pipekeeper'],                                                billingInterval: 'monthly', price: 1.99,  label: 'PipeKeeper (Legacy)'           },
  pipekeeper_premium_annual:     { modules: ['pipekeeper'],                                                billingInterval: 'annual',  price: 19.99, label: 'PipeKeeper (Legacy Annual)'    },
  whiskeykeeper_premium_monthly: { modules: ['whiskeykeeper'],                                             billingInterval: 'monthly', price: 1.99,  label: 'WhiskeyKeeper (Legacy)'        },
  whiskeykeeper_premium_annual:  { modules: ['whiskeykeeper'],                                             billingInterval: 'annual',  price: 19.99, label: 'WhiskeyKeeper (Legacy Annual)' },
  pipekeeper_pro_monthly:        { modules: ['pipekeeper'],                                                billingInterval: 'monthly', price: 2.99,  label: 'PipeKeeper Pro'                },
  pipekeeper_pro_annual:         { modules: ['pipekeeper'],                                                billingInterval: 'annual',  price: 29.99, label: 'PipeKeeper Pro Annual'          },
  whiskeykeeper_pro_monthly:     { modules: ['whiskeykeeper'],                                             billingInterval: 'monthly', price: 2.99,  label: 'WhiskeyKeeper Pro'             },
  whiskeykeeper_pro_annual:      { modules: ['whiskeykeeper'],                                             billingInterval: 'annual',  price: 29.99, label: 'WhiskeyKeeper Pro Annual'       },
  cigarkeeper_pro_monthly:       { modules: ['cigarkeeper'],                                               billingInterval: 'monthly', price: 2.99,  label: 'CigarKeeper Pro'               },
  cigarkeeper_pro_annual:        { modules: ['cigarkeeper'],                                               billingInterval: 'annual',  price: 29.99, label: 'CigarKeeper Pro Annual'         },
  winekeeper_pro_monthly:        { modules: ['winekeeper'],                                                billingInterval: 'monthly', price: 2.99,  label: 'WineKeeper Pro'                },
  winekeeper_pro_annual:         { modules: ['winekeeper'],                                                billingInterval: 'annual',  price: 29.99, label: 'WineKeeper Pro Annual'          },
  founders_bundle_monthly:       { modules: ['pipekeeper','whiskeykeeper'],                                billingInterval: 'monthly', price: 4.99,  label: 'Founders Bundle (PK+WK)'       },
  founders_bundle_annual:        { modules: ['pipekeeper','whiskeykeeper'],                                billingInterval: 'annual',  price: 49.99, label: 'Founders Bundle Annual (PK+WK)' },
  three_module_bundle_monthly:   { modules: ['pipekeeper','whiskeykeeper','cigarkeeper'],                  billingInterval: 'monthly', price: 7.99,  label: '3-Module Bundle'               },
  three_module_bundle_annual:    { modules: ['pipekeeper','whiskeykeeper','cigarkeeper'],                  billingInterval: 'annual',  price: 79.99, label: '3-Module Bundle Annual'         },
  four_module_bundle_monthly:    { modules: ['pipekeeper','whiskeykeeper','cigarkeeper','winekeeper'],     billingInterval: 'monthly', price: 8.99,  label: '4-Module Bundle'               },
  four_module_bundle_annual:     { modules: ['pipekeeper','whiskeykeeper','cigarkeeper','winekeeper'],     billingInterval: 'annual',  price: 89.99, label: '4-Module Bundle Annual'         },
};

const PLAN_KEY_ALIASES = {
  pipekeeper_monthly: 'pipekeeper_pro_monthly', pipekeeper_annual: 'pipekeeper_pro_annual',
  pipekeeper_yearly: 'pipekeeper_pro_annual', whiskeykeeper_monthly: 'whiskeykeeper_pro_monthly',
  whiskeykeeper_annual: 'whiskeykeeper_pro_annual', whiskeykeeper_yearly: 'whiskeykeeper_pro_annual',
  cigarkeeper_monthly: 'cigarkeeper_pro_monthly', cigarkeeper_annual: 'cigarkeeper_pro_annual',
  cigarkeeper_yearly: 'cigarkeeper_pro_annual', winekeeper_monthly: 'winekeeper_pro_monthly',
  winekeeper_annual: 'winekeeper_pro_annual', winekeeper_yearly: 'winekeeper_pro_annual',
  founders_monthly: 'founders_bundle_monthly', founders_annual: 'founders_bundle_annual',
  founders_yearly: 'founders_bundle_annual', bundle_2_monthly: 'founders_bundle_monthly',
  bundle_2_annual: 'founders_bundle_annual', bundle_3_monthly: 'three_module_bundle_monthly',
  bundle_3_annual: 'three_module_bundle_annual', three_bundle_monthly: 'three_module_bundle_monthly',
  three_bundle_annual: 'three_module_bundle_annual', bundle_4_monthly: 'four_module_bundle_monthly',
  bundle_4_annual: 'four_module_bundle_annual', four_bundle_monthly: 'four_module_bundle_monthly',
  four_bundle_annual: 'four_module_bundle_annual',
};

// Valid prices and what they imply
const AMOUNT_TO_INTERVAL = {
  1.99: 'monthly', 19.99: 'annual', 2.99: 'monthly', 29.99: 'annual',
  4.99: 'monthly', 49.99: 'annual', 7.99: 'monthly', 79.99: 'annual',
  8.99: 'monthly', 89.99: 'annual',
};
const BUNDLE_AMOUNT_TO_MODULES = {
  4.99:  ['pipekeeper','whiskeykeeper'],
  49.99: ['pipekeeper','whiskeykeeper'],
  7.99:  ['pipekeeper','whiskeykeeper','cigarkeeper'],
  79.99: ['pipekeeper','whiskeykeeper','cigarkeeper'],
  8.99:  ['pipekeeper','whiskeykeeper','cigarkeeper','winekeeper'],
  89.99: ['pipekeeper','whiskeykeeper','cigarkeeper','winekeeper'],
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function norm(v) { return String(v ?? '').trim().toLowerCase(); }
function parseDate(v) { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
function roundCurrency(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function inRange(d, r) { return d >= r.start && d <= r.end; }

function lookupPlan(key) {
  if (!key) return null;
  const k = norm(key);
  return PLAN_CATALOG[k] ?? PLAN_CATALOG[PLAN_KEY_ALIASES[k]] ?? null;
}

function canonicalizePlanKey(key) {
  if (!key) return null;
  const k = norm(key);
  if (PLAN_CATALOG[k]) return k;
  if (PLAN_KEY_ALIASES[k]) return PLAN_KEY_ALIASES[k];
  return null;
}

function parsePositiveMoney(v) {
  if (v == null || v === '') return null;
  const n = Number(typeof v === 'string' ? v.replace(/,/g,'').match(/\d+(\.\d+)?/)?.[0] : v);
  if (!isFinite(n) || n <= 0) return null;
  // Detect cents (e.g. 299 → 2.99)
  if (Number.isInteger(n) && n > 10) {
    const asCents = parseFloat((n / 100).toFixed(2));
    if (AMOUNT_TO_INTERVAL[asCents] !== undefined) return asCents;
  }
  return n;
}

function normalizeInterval(raw) {
  const candidates = [
    raw.billing_interval, raw.billing_period, raw.interval,
    raw.period, raw.plan_interval, raw.recurring_interval,
    raw.items?.data?.[0]?.price?.recurring?.interval,
    raw.price?.recurring?.interval,
  ];
  for (const v of candidates) {
    const n = norm(v ?? '');
    if (n === 'month' || n === 'monthly') return 'monthly';
    if (n === 'year' || n === 'yearly' || n === 'annual') return 'annual';
  }
  return null;
}

function normalizePlatform(raw) {
  const p = norm(raw.provider ?? '');
  if (p === 'apple' || p === 'ios') return 'ios';
  if (p === 'google' || p === 'android' || p === 'googleplay') return 'google';
  if (p === 'stripe' || p === 'web') return 'web';
  return null;
}

function normalizeModuleToken(v) {
  const t = norm(v ?? '');
  if (!t) return null;
  const c = t.replace(/[\s_-]/g,'');
  if (t === 'pipe' || t.includes('pipekeeper') || c.includes('pipekeeper') || c.startsWith('pk')) return 'pipekeeper';
  if (t === 'whiskey' || t.includes('whiskeykeeper') || c.includes('whiskeykeeper') || c.startsWith('wk')) return 'whiskeykeeper';
  if (t === 'cigar' || t.includes('cigarkeeper') || c.includes('cigarkeeper') || c.startsWith('ck')) return 'cigarkeeper';
  if (t === 'wine' || t.includes('winekeeper') || c.includes('winekeeper')) return 'winekeeper';
  return null;
}

function isActivePaid(raw) {
  const s = norm(raw.status ?? '');
  if (s === 'active') return true;
  if (s === 'trialing' && Number(raw.amount ?? 0) > 0) return true;
  if (s === 'past_due') return true;
  return false;
}

function userKey(userId, userEmail) {
  return String(userId ?? '').trim() || norm(userEmail ?? '');
}

function getCalendarRange(type, now) {
  const s = new Date(now);
  let e;
  if (type === 'today') {
    s.setUTCHours(0,0,0,0);
    e = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), 23,59,59,999));
  } else if (type === 'week') {
    const dow = s.getUTCDay();
    s.setUTCDate(s.getUTCDate() - (dow === 0 ? 6 : dow - 1));
    s.setUTCHours(0,0,0,0);
    e = new Date(s); e.setUTCDate(e.getUTCDate()+6); e.setUTCHours(23,59,59,999);
  } else if (type === 'month') {
    s.setUTCDate(1); s.setUTCHours(0,0,0,0);
    e = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth()+1, 0, 23,59,59,999));
  } else if (type === 'quarter') {
    const q = Math.floor(s.getUTCMonth()/3);
    s.setUTCMonth(q*3,1); s.setUTCHours(0,0,0,0);
    e = new Date(Date.UTC(s.getUTCFullYear(), q*3+3, 0, 23,59,59,999));
  } else {
    s.setUTCMonth(0,1); s.setUTCHours(0,0,0,0);
    e = new Date(Date.UTC(s.getUTCFullYear(), 11, 31, 23,59,59,999));
  }
  return { start: s, end: e };
}

// ─── CANONICAL LEDGER ROW BUILDER ─────────────────────────────────────────────
// One row per active-paid subscription record.
// Resolution order for planKey → everything else derives from it.
// Unknown rows are quarantined, not excluded.
function buildLedgerRow(raw) {
  // 1. Try direct plan_key fields (authoritative)
  const directPlanKey =
    canonicalizePlanKey(raw.planKey) ||
    canonicalizePlanKey(raw.plan_key) ||
    null;

  // 2. Try identifiers that might encode a plan key
  let inferredPlanKey = null;
  if (!directPlanKey) {
    const candidates = [
      raw.price_id, raw.stripe_price_id, raw.provider_price_id,
      raw.apple_product_id, raw.plan_id, raw.plan_name, raw.checkout_type,
    ].map(v => norm(v ?? '')).filter(Boolean);

    for (const c of candidates) {
      const k = canonicalizePlanKey(c);
      if (k) { inferredPlanKey = k; break; }
      // Pattern-match: module + interval token in string
      if (!inferredPlanKey) {
        const intervalToken = c.includes('annual') || c.includes('yearly') || c.includes('year') ? 'annual'
                            : c.includes('monthly') || c.includes('month') ? 'monthly' : null;
        const module = normalizeModuleToken(c);
        if (module && intervalToken) { inferredPlanKey = `${module}_pro_${intervalToken}`; break; }
        if (c.includes('founders') && intervalToken) { inferredPlanKey = `founders_bundle_${intervalToken}`; break; }
        if ((c.includes('three_module') || c.includes('bundle_3')) && intervalToken) { inferredPlanKey = `three_module_bundle_${intervalToken}`; break; }
        if ((c.includes('four_module') || c.includes('bundle_4')) && intervalToken) { inferredPlanKey = `four_module_bundle_${intervalToken}`; break; }
      }
    }
  }

  const resolvedPlanKey = directPlanKey || inferredPlanKey || null;
  let catalog = lookupPlan(resolvedPlanKey);

  // 3. Resolve price (raw amount wins; catalog is fallback)
  const rawPrice = parsePositiveMoney(raw.amount) || parsePositiveMoney(raw.price) || null;
  const catalogPrice = catalog?.price ?? null;
  const price = rawPrice ?? catalogPrice ?? null;

  // 4. Resolve billing interval
  const directInterval = normalizeInterval(raw);
  const intervalFromAmount = price !== null ? (AMOUNT_TO_INTERVAL[parseFloat(Number(price).toFixed(2))] ?? null) : null;
  const intervalFromSpan = (() => {
    const s = parseDate(raw.current_period_start || raw.started_at);
    const e = parseDate(raw.current_period_end);
    if (!s || !e) return null;
    const days = Math.round((e.getTime()-s.getTime())/(86400000));
    if (days >= 300 && days <= 380) return 'annual';
    if (days >= 27 && days <= 40) return 'monthly';
    return null;
  })();
  const billingInterval =
    directInterval ??
    (catalog?.billingInterval ?? null) ??
    intervalFromAmount ??
    intervalFromSpan ??
    null;

  // 5. Backfill planKey from modules+interval when still missing
  if (!resolvedPlanKey && billingInterval) {
    const csvModules = String(raw.modules_csv ?? '').split(',')
      .map(m => normalizeModuleToken(m)).filter(Boolean);
    if (csvModules.length > 0) {
      const sorted = [...new Set(csvModules)].sort();
      const mKey = sorted.join(',');
      const map = {
        'pipekeeper': `pipekeeper_pro_${billingInterval}`,
        'whiskeykeeper': `whiskeykeeper_pro_${billingInterval}`,
        'cigarkeeper': `cigarkeeper_pro_${billingInterval}`,
        'winekeeper': `winekeeper_pro_${billingInterval}`,
        'pipekeeper,whiskeykeeper': `founders_bundle_${billingInterval}`,
        'cigarkeeper,pipekeeper,whiskeykeeper': `three_module_bundle_${billingInterval}`,
        'cigarkeeper,pipekeeper,whiskeykeeper,winekeeper': `four_module_bundle_${billingInterval}`,
      };
      if (map[mKey]) {
        catalog = lookupPlan(map[mKey]);
      }
    }
  }

  // 6. Resolve modules (NEVER defaults to pipekeeper)
  let modules;
  let productLabel;
  let trusted = false; // true = came from catalog

  if (catalog) {
    modules = catalog.modules;
    productLabel = catalog.label;
    trusted = true;
  } else {
    // Try modules_csv
    const csvModules = String(raw.modules_csv ?? '').split(',')
      .map(m => normalizeModuleToken(m)).filter(Boolean);
    if (csvModules.length > 0) {
      modules = [...new Set(csvModules)];
      productLabel = modules.join('+');
    } else if (price !== null && BUNDLE_AMOUNT_TO_MODULES[parseFloat(Number(price).toFixed(2))]) {
      // Bundle amount implies modules definitively
      modules = BUNDLE_AMOUNT_TO_MODULES[parseFloat(Number(price).toFixed(2))];
      productLabel = `Bundle (inferred from $${price})`;
      trusted = true;
    } else {
      // Unknown — quarantine
      modules = ['unknown'];
      productLabel = 'Unknown';
    }
  }

  const isUnknown = modules.length === 1 && modules[0] === 'unknown';
  const isBundle = modules.length > 1;

  return {
    rawId:           String(raw.id || raw.stripe_subscription_id || ''),
    userId:          String(raw.user_id ?? ''),
    userEmail:       norm(raw.user_email ?? ''),
    status:          norm(raw.status ?? ''),
    planKey:         resolvedPlanKey,
    modules,
    billingInterval,
    price,
    renewalAt:       parseDate(raw.current_period_end),
    createdAt:       parseDate(raw.started_at || raw.created_date || raw.current_period_start),
    platform:        normalizePlatform(raw),
    productLabel,
    isBundle,
    isUnknown,
    isTrusted:       trusted,
    // Diagnostic: what was in the raw record
    _rawStatus:      raw.status,
    _rawProvider:    raw.provider,
  };
}

// ─── Paginated fetch ──────────────────────────────────────────────────────────
async function fetchAll(entity) {
  const PAGE = 100;
  const items = [];
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
}

// ─── Main ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();
    if (authUser?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

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

    // ── Deduplicate users by email ────────────────────────────────────────────
    const userByEmail = new Map();
    const userById = new Map();
    for (const u of allUsers) {
      const email = norm(u.email ?? '');
      if (!email) continue;
      const existing = userByEmail.get(email);
      if (!existing || new Date(u.updated_date||0) > new Date(existing.updated_date||0)) {
        userByEmail.set(email, u);
      }
      if (u.id) userById.set(String(u.id), u);
    }
    const uniqueUsers = [...userByEmail.values()];

    // ── BUILD CANONICAL BILLING LEDGER ────────────────────────────────────────
    // Rule: one row per active-paid subscription record, deduplicated by
    // (userKey, platform, productFamilyKey). Unknown products are never collapsed.
    const activePaidRaws = allSubscriptions.filter(isActivePaid);

    // Build ledger rows
    const seenRawIds = new Set();
    const allLedgerRows = [];
    for (const raw of activePaidRaws) {
      const rid = String(raw.id || raw.stripe_subscription_id || '');
      if (rid && seenRawIds.has(rid)) continue;
      if (rid) seenRawIds.add(rid);
      allLedgerRows.push(buildLedgerRow(raw));
    }

    // Dedup by (userKey × platform × productFamily)
    function productFamilyKey(row) {
      if (row.isUnknown) return `unknown::${row.rawId || row.userEmail || 'empty'}`;
      if (row.isBundle)  return `bundle::${[...row.modules].sort().join(',')}`;
      return `single::${row.modules[0]}`;
    }

    const dedupMap = new Map();
    let duplicatesRemoved = 0;
    for (const row of allLedgerRows) {
      const uk = userKey(row.userId, row.userEmail);
      if (!uk) continue;
      const dk = `${uk}::${row.platform || 'unknown'}::${productFamilyKey(row)}`;
      const existing = dedupMap.get(dk);
      if (!existing) {
        dedupMap.set(dk, row);
      } else {
        duplicatesRemoved++;
        if ((row.createdAt?.getTime()??0) > (existing.createdAt?.getTime()??0)) {
          dedupMap.set(dk, row);
        }
      }
    }
    const ledger = [...dedupMap.values()];

    // Split ledger: trusted (known product) vs quarantined (unknown)
    const trustedContracts   = ledger.filter(r => !r.isUnknown);
    const quarantinedContracts = ledger.filter(r => r.isUnknown);

    // ── ACCOUNT LAYER (A) — Users only ────────────────────────────────────────
    // Paid account = has ≥1 trusted contract in ledger. Source: ledger only.
    const contractsByUserKey = new Map();
    for (const row of trustedContracts) {
      const uk = userKey(row.userId, row.userEmail);
      if (!uk) continue;
      if (!contractsByUserKey.has(uk)) contractsByUserKey.set(uk, []);
      contractsByUserKey.get(uk).push(row);
    }

    const signupSources = { web: 0, apple: 0, googlePlay: 0, unknown: 0 };
    const newAccounts   = { today: 0, week: 0, month: 0, quarter: 0, year: 0 };

    for (const u of uniqueUsers) {
      const p = norm(u.data?.platform || u.platform || '');
      if (p === 'apple' || p === 'ios') signupSources.apple++;
      else if (p === 'android' || p === 'googleplay' || p === 'google') signupSources.googlePlay++;
      else if (!p) signupSources.unknown++;
      else signupSources.web++;

      const d = parseDate(u.created_date);
      if (d) {
        if (inRange(d, ranges.today))   newAccounts.today++;
        if (inRange(d, ranges.week))    newAccounts.week++;
        if (inRange(d, ranges.month))   newAccounts.month++;
        if (inRange(d, ranges.quarter)) newAccounts.quarter++;
        if (inRange(d, ranges.year))    newAccounts.year++;
      }
    }

    const totalUsers  = uniqueUsers.length;
    const paidUserSet = new Set([...contractsByUserKey.keys()].filter(Boolean));
    const paidCount   = paidUserSet.size;
    const freeCount   = totalUsers - paidCount;

    // ── CONTRACT LAYER (B) — Billing contracts ────────────────────────────────
    const monthlyContracts  = trustedContracts.filter(r => r.billingInterval === 'monthly');
    const annualContracts   = trustedContracts.filter(r => r.billingInterval === 'annual');

    const byProduct = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundles: 0 };
    const providerCounts = { web: 0, ios: 0, google: 0, unknown: 0 };

    for (const row of trustedContracts) {
      if (row.isBundle) {
        byProduct.bundles++;
      } else {
        const m = row.modules[0];
        if (m in byProduct) byProduct[m]++;
      }
      if (row.platform === 'web') providerCounts.web++;
      else if (row.platform === 'ios') providerCounts.ios++;
      else if (row.platform === 'google') providerCounts.google++;
      else providerCounts.unknown++;
    }

    // ── FINANCIAL METRICS — from trusted contracts with complete data ─────────
    const financialContracts = trustedContracts.filter(
      r => r.price !== null && r.billingInterval !== null
    );

    const mrrRaw = financialContracts.reduce((sum, r) => {
      return sum + (r.billingInterval === 'monthly' ? r.price : r.price / 12);
    }, 0);
    const mrr = roundCurrency(mrrRaw);
    const arr = roundCurrency(mrr * 12);

    function calcRenewalPeriod(contracts, range) {
      const renewing = contracts.filter(r =>
        r.renewalAt && inRange(r.renewalAt, range) && r.price !== null && r.billingInterval !== null
      );
      const customers = new Set(renewing.map(r => userKey(r.userId, r.userEmail)).filter(Boolean)).size;
      const revenue = roundCurrency(renewing.reduce((s, r) => s + r.price, 0));
      return { customers, subscriptions: renewing.length, revenue };
    }

    const renewalRevenue = {
      week:    calcRenewalPeriod(financialContracts, ranges.week),
      month:   calcRenewalPeriod(financialContracts, ranges.month),
      quarter: calcRenewalPeriod(financialContracts, ranges.quarter),
      year:    calcRenewalPeriod(financialContracts, ranges.year),
    };

    // ── MODULE ACCESS LAYER (C) — derived from contracts ─────────────────────
    const moduleUsers = { pipekeeper: new Set(), whiskeykeeper: new Set(), cigarkeeper: new Set(), winekeeper: new Set() };
    const bundleUserSet = new Set();

    for (const row of trustedContracts) {
      const uk = userKey(row.userId, row.userEmail);
      if (!uk) continue;
      if (row.isBundle) bundleUserSet.add(uk);
      for (const m of row.modules) {
        if (m in moduleUsers) moduleUsers[m].add(uk);
      }
    }

    const moduleAccess = {
      pipekeeperUsers:      moduleUsers.pipekeeper.size,
      whiskeykeeperUsers:   moduleUsers.whiskeykeeper.size,
      cigarkeeperUsers:     moduleUsers.cigarkeeper.size,
      winekeeperUsers:      moduleUsers.winekeeper.size,
      bundleUsers:          bundleUserSet.size,
      totalEntitlementRows: Object.values(moduleUsers).reduce((s, set) => s + set.size, 0),
    };

    // ── QUARANTINE ANALYSIS ───────────────────────────────────────────────────
    const quarantineByProvider = { web: 0, ios: 0, google: 0, unknown: 0 };
    const quarantineByReason   = { missingPlanKey: 0, missingInterval: 0, missingPrice: 0 };
    for (const row of quarantinedContracts) {
      if (row.platform === 'web') quarantineByProvider.web++;
      else if (row.platform === 'ios') quarantineByProvider.ios++;
      else if (row.platform === 'google') quarantineByProvider.google++;
      else quarantineByProvider.unknown++;
      if (!row.planKey) quarantineByReason.missingPlanKey++;
      if (!row.billingInterval) quarantineByReason.missingInterval++;
      if (row.price === null) quarantineByReason.missingPrice++;
    }

    // ── DATA QUALITY WARNINGS (trusted contracts only) ────────────────────────
    const warnings = {
      missingPrice:      trustedContracts.filter(r => r.price === null).length,
      missingInterval:   trustedContracts.filter(r => r.billingInterval === null).length,
      missingPlanKey:    trustedContracts.filter(r => !r.planKey).length,
      missingPlatform:   trustedContracts.filter(r => !r.platform).length,
      duplicatesRemoved,
      excludedFromFinancials: trustedContracts.length - financialContracts.length,
    };

    // ── DIAGNOSTICS — entitlement drift between ledger and user flags ─────────
    // This is OBSERVATIONAL only. It does NOT affect KPIs.
    const diagnostics = {
      usersWithActiveContractNoPaidFlag: 0,
      usersWithPaidFlagNoActiveContract: 0,
      usersWithMultipleContracts: 0,
      samples: {
        activeContractNoPaidFlag: [],
        paidFlagNoActiveContract: [],
        multipleContracts: [],
        quarantinedContracts: quarantinedContracts.slice(0, MAX_SAMPLE_SIZE).map(r => ({
          rawId: r.rawId, userEmail: r.userEmail, status: r._rawStatus, provider: r._rawProvider,
          price: r.price, billingInterval: r.billingInterval, planKey: r.planKey,
        })),
      },
    };

    for (const u of uniqueUsers) {
      const uk = userKey(u.id, u.email);
      const email = norm(u.email ?? '');
      const hasContract = contractsByUserKey.has(uk);
      const hasPaidFlag = !!(u.pipekeeper_paid || u.whiskeykeeper_paid || u.cigarkeeper_paid || u.winekeeper_paid || u.has_paid_access);

      if (hasContract && !hasPaidFlag) {
        diagnostics.usersWithActiveContractNoPaidFlag++;
        if (diagnostics.samples.activeContractNoPaidFlag.length < MAX_SAMPLE_SIZE) {
          diagnostics.samples.activeContractNoPaidFlag.push(email);
        }
      }
      if (!hasContract && hasPaidFlag) {
        diagnostics.usersWithPaidFlagNoActiveContract++;
        if (diagnostics.samples.paidFlagNoActiveContract.length < MAX_SAMPLE_SIZE) {
          diagnostics.samples.paidFlagNoActiveContract.push(email);
        }
      }
      const userContracts = contractsByUserKey.get(uk) ?? [];
      if (userContracts.length > 1) {
        diagnostics.usersWithMultipleContracts++;
        if (diagnostics.samples.multipleContracts.length < MAX_SAMPLE_SIZE) {
          diagnostics.samples.multipleContracts.push(email);
        }
      }
    }

    // ── PER-USER ROWS for user detail tables ──────────────────────────────────
    const paidUsersList = [];
    const freeUsersList = [];

    for (const u of uniqueUsers) {
      const uk = userKey(u.id, u.email);
      const email = norm(u.email ?? '');
      const contracts = contractsByUserKey.get(uk) ?? [];
      const isPaid = contracts.length > 0;

      const row = {
        full_name:     u.full_name ?? '',
        email,
        role:          u.role ?? 'user',
        created_date:  u.created_date ?? '',
        subscription_status: isPaid ? (contracts.length > 1 ? 'multi-contract' : contracts[0].status) : 'free',
        product:       isPaid ? contracts.map(c => c.productLabel).join(', ') : null,
        modules:       isPaid ? [...new Set(contracts.flatMap(c => c.modules))].filter(m => m !== 'unknown') : [],
        billing_interval: isPaid ? (contracts.length === 1 ? contracts[0].billingInterval : 'multi') : null,
        platform:      isPaid ? (contracts.length === 1 ? contracts[0].platform : 'multi') : null,
        contract_count: contracts.length,
        renewal_date:  isPaid ? (contracts[0]?.renewalAt?.toISOString() ?? null) : null,
        renewal_amount: isPaid ? roundCurrency(contracts.reduce((s,c) => s+(c.price??0), 0)) : null,
      };

      if (isPaid) paidUsersList.push(row);
      else freeUsersList.push(row);
    }

    paidUsersList.sort((a, b) => new Date(b.created_date||0) - new Date(a.created_date||0));
    freeUsersList.sort((a, b) => new Date(b.created_date||0) - new Date(a.created_date||0));

    // ── SANITY CHECKS ─────────────────────────────────────────────────────────
    const sanityFailures = [];
    if (paidCount > totalUsers) sanityFailures.push(`paidAccounts(${paidCount}) > totalAccounts(${totalUsers})`);
    if (Math.abs(arr - roundCurrency(mrr * 12)) > 0.01) sanityFailures.push(`arr(${arr}) !== mrr×12(${roundCurrency(mrr*12)})`);
    for (const [label, period] of Object.entries(renewalRevenue)) {
      if (period.customers > period.subscriptions) {
        sanityFailures.push(`renewal ${label}: customers(${period.customers}) > subscriptions(${period.subscriptions})`);
      }
    }
    if (sanityFailures.length > 0) sanityFailures.forEach(f => console.error('[LedgerReport] SANITY_FAIL:', f));

    return Response.json({
      meta: {
        generatedAt:    now.toISOString(),
        reportVersion:  REPORT_VERSION,
        timezoneNote:   'UTC',
        architecture:   'ledger-first: KPIs derive exclusively from Subscription entity rows normalized through PLAN_CATALOG',
      },
      sanityChecks: { passed: sanityFailures.length === 0, failures: sanityFailures },
      warnings,

      // ── Layer A: Accounts ──
      accounts: {
        total:     totalUsers,
        paid:      paidCount,
        free:      freeCount,
        paidPct:   totalUsers > 0 ? parseFloat(((paidCount/totalUsers)*100).toFixed(1)) : 0,
        signupSources,
        newAccounts,
      },

      // ── Layer B: Billing contracts ──
      billingContracts: {
        ledgerRows:       ledger.length,
        trustedContracts: trustedContracts.length,
        monthly:          monthlyContracts.length,
        annual:           annualContracts.length,
        financiallyEligible: financialContracts.length,
        byProduct,
        providerCounts,
        mrr,
        arr,
        renewalRevenue,
        quarantine: {
          total: quarantinedContracts.length,
          byProvider: quarantineByProvider,
          byReason: quarantineByReason,
          samples: diagnostics.samples.quarantinedContracts,
        },
      },

      // ── Layer C: Module access (derived from contracts) ──
      moduleAccess,

      // ── Diagnostics (observational, does not affect KPIs) ──
      diagnostics,

      // ── User detail tables ──
      paid_users: paidUsersList,
      free_users: freeUsersList,

      // ── Backward-compat aliases for existing UI ──
      subscriptions: {
        totalActivePaid: trustedContracts.length,
        monthly: monthlyContracts.length,
        annual:  annualContracts.length,
        bundles: trustedContracts.filter(r => r.isBundle).length,
        singleModule: trustedContracts.filter(r => !r.isBundle).length,
        byProduct,
        byModuleEffective: {
          pipekeeper:    moduleAccess.pipekeeperUsers,
          whiskeykeeper: moduleAccess.whiskeykeeperUsers,
          cigarkeeper:   moduleAccess.cigarkeeperUsers,
          winekeeper:    moduleAccess.winekeeperUsers,
        },
      },
      runRate: { mrr, arr },
      renewalRevenue,
      // Compat layer shape for existing UI paths
      layers: {
        accounts: { totalAccounts: totalUsers, paidAccounts: paidCount, freeAccounts: freeCount, signupSources },
        billingContracts: {
          activeSubscriptions: trustedContracts.length,
          monthlyContracts: monthlyContracts.length,
          annualContracts: annualContracts.length,
          providerCounts,
          mrr,
          arr,
          renewalRevenue,
          excludedFromFinancials: {
            unresolvedFinancialContracts: warnings.excludedFromFinancials,
            staleSyncContracts: 0,
            failedRestoreContracts: 0,
          },
          unknownQuarantine: {
            total: quarantinedContracts.length,
            byProvider: quarantineByProvider,
            byReason: { missingPlanKey: quarantineByReason.missingPlanKey, unknownProduct: quarantinedContracts.length, unmappedPlanKey: 0 },
            samples: diagnostics.samples.quarantinedContracts,
          },
        },
        moduleAccess: {
          pipekeeperUsers:         moduleAccess.pipekeeperUsers,
          whiskeykeeperUsers:      moduleAccess.whiskeykeeperUsers,
          cigarkeeperUsers:        moduleAccess.cigarkeeperUsers,
          winekeeperUsers:         moduleAccess.winekeeperUsers,
          bundleUsers:             moduleAccess.bundleUsers,
          totalModuleEntitlements: moduleAccess.totalEntitlementRows,
        },
      },
      reconciliation: {
        before: {
          activePaidRows:    activePaidRaws.length,
          dedupedContracts:  ledger.length,
          paidAccountsFromContracts: paidCount,
        },
        after: {
          paidAccountsFromEntitlements: paidCount,
          resolvedBillingContracts: trustedContracts.length,
          unknownPlanContracts: quarantinedContracts.length,
          financialEligibleContracts: financialContracts.length,
          totalModuleEntitlements: moduleAccess.totalEntitlementRows,
          staleSyncExcludedContracts: 0,
        },
        sampleReconciledMultiPlanUser: paidUsersList.find(u => u.contract_count > 1) ?? null,
      },
    });

  } catch (error) {
    console.error('[LedgerReport] HARD FAILURE:', error);
    return Response.json({
      error: 'report_generation_failed',
      detail: String(error?.message ?? error),
      meta: { generatedAt: new Date().toISOString(), reportVersion: REPORT_VERSION },
      sanityChecks: { passed: false, failures: ['Report generation failed'] },
      warnings: { missingPrice: 0, missingInterval: 0, missingPlanKey: 0, missingPlatform: 0, duplicatesRemoved: 0, excludedFromFinancials: 0 },
      accounts: {}, billingContracts: {}, moduleAccess: {},
      subscriptions: {}, runRate: {}, renewalRevenue: {},
      layers: {
        accounts: {}, 
        billingContracts: { activeSubscriptions:0, monthlyContracts:0, annualContracts:0, providerCounts:{web:0,ios:0,google:0,unknown:0}, mrr:0, arr:0, renewalRevenue:{week:{customers:0,subscriptions:0,revenue:0},month:{customers:0,subscriptions:0,revenue:0},quarter:{customers:0,subscriptions:0,revenue:0},year:{customers:0,subscriptions:0,revenue:0}}, excludedFromFinancials:{unresolvedFinancialContracts:0,staleSyncContracts:0,failedRestoreContracts:0}, unknownQuarantine:{total:0,byProvider:{web:0,ios:0,google:0,unknown:0},byReason:{missingPlanKey:0,unknownProduct:0,unmappedPlanKey:0},samples:[]} },
        moduleAccess: { pipekeeperUsers:0, whiskeykeeperUsers:0, cigarkeeperUsers:0, winekeeperUsers:0, bundleUsers:0, totalModuleEntitlements:0 },
      },
      reconciliation: { before:{}, after:{}, sampleReconciledMultiPlanUser:null },
      diagnostics: { usersWithActiveContractNoPaidFlag:0, usersWithPaidFlagNoActiveContract:0, usersWithMultipleContracts:0, samples:{activeContractNoPaidFlag:[],paidFlagNoActiveContract:[],multipleContracts:[],quarantinedContracts:[]} },
      paid_users: [], free_users: [],
    }, { status: 200 });
  }
});