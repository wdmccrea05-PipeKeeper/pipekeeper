import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REPORT_VERSION = 'v4-canonical-contract-entitlement-model';
const KNOWN_MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

const AMOUNT_PLAN_MAP = {
  1.99: { modules: ['pipekeeper'], interval: 'monthly' },
  19.99: { modules: ['pipekeeper'], interval: 'annual' },
  2.99: { modules: ['whiskeykeeper'], interval: 'monthly' },
  29.99: { modules: ['whiskeykeeper'], interval: 'annual' },
  4.99: { modules: ['pipekeeper', 'whiskeykeeper'], interval: 'monthly' },
  49.99: { modules: ['pipekeeper', 'whiskeykeeper'], interval: 'annual' },
  7.99: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], interval: 'monthly' },
  79.99: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], interval: 'annual' },
  8.99: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], interval: 'monthly' },
  89.99: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], interval: 'annual' },
};

function norm(v: unknown) {
  return String(v ?? '').trim().toLowerCase();
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function splitMods(csv: unknown): string[] {
  return String(csv || '')
    .split(',')
    .map((m) => norm(m))
    .filter((m) => KNOWN_MODULES.includes(m));
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function inferFromAmount(amount: number, interval: string | null) {
  const rounded = parseFloat(Number(amount || 0).toFixed(2));
  const inferred = AMOUNT_PLAN_MAP[rounded as keyof typeof AMOUNT_PLAN_MAP];
  if (!inferred) return null;
  if (interval && inferred.interval !== interval) return null;
  return inferred;
}

function classifyInterval(sub: Record<string, unknown>) {
  const direct = norm(sub.billing_interval || sub.billing_period || sub.interval || '');
  if (direct === 'month' || direct === 'monthly') return { interval: 'monthly', inferred: false };
  if (direct === 'year' || direct === 'yearly' || direct === 'annual') return { interval: 'annual', inferred: false };
  const planId = norm(sub.price_id || sub.stripe_price_id || sub.apple_product_id || sub.plan_id || '');
  if (planId.includes('annual') || planId.includes('yearly') || planId.includes('year')) return { interval: 'annual', inferred: false };
  if (planId.includes('monthly') || planId.includes('month')) return { interval: 'monthly', inferred: false };
  const fromAmount = inferFromAmount(Math.max(0, Number(sub.amount || 0)), null);
  if (fromAmount) return { interval: fromAmount.interval, inferred: true };
  return { interval: 'unknown', inferred: false };
}

function detectProvider(sub: Record<string, unknown>) {
  const provider = norm(sub.provider || '');
  if (provider === 'stripe') return 'stripe';
  if (provider === 'apple' || provider === 'ios' || sub.apple_product_id) return 'apple';
  if (provider === 'google' || provider === 'android' || provider === 'googleplay') return 'google';
  if (sub.stripe_subscription_id || sub.stripe_price_id) return 'stripe';
  return 'web';
}

function getProviderSubscriptionId(sub: Record<string, unknown>) {
  return String(sub.provider_subscription_id || sub.stripe_subscription_id || sub.apple_original_transaction_id || sub.id || '');
}

function inferRenewalDate(sub: Record<string, unknown>, interval: string) {
  const explicit = parseDate(sub.current_period_end);
  if (explicit) return { renewalDate: explicit, inferred: false };
  if (interval === 'unknown') return { renewalDate: null, inferred: false };
  const start = parseDate(sub.current_period_start || sub.started_at || sub.created_date);
  if (!start) return { renewalDate: null, inferred: false };
  const renewal = new Date(start);
  if (interval === 'monthly') renewal.setMonth(renewal.getMonth() + 1);
  else renewal.setFullYear(renewal.getFullYear() + 1);
  return { renewalDate: renewal, inferred: true };
}

function deriveTier(sub: Record<string, unknown>) {
  const tier = norm(sub.entitlement_tier || sub.subscription_tier || sub.tier || '');
  if (tier === 'premium') return 'premium';
  if (tier === 'pro') return 'pro';
  return 'pro';
}

function resolveExplicitProduct(sub: Record<string, unknown>) {
  const candidates = [
    sub.product_kind,
    sub.plan_name,
    sub.name,
    sub.description,
    sub.price_id,
    sub.stripe_price_id,
    sub.apple_product_id,
    sub.plan_id,
    sub.productId,
  ].map((v) => norm(v));
  if (candidates.some((v) => v.includes('bundle') || v.includes('founders'))) return 'bundle';
  for (const m of KNOWN_MODULES) {
    if (candidates.some((v) => v.includes(m))) return m;
  }
  if (candidates.some((v) => v.includes('cigar'))) return 'cigarkeeper';
  if (candidates.some((v) => v.includes('wine'))) return 'winekeeper';
  if (candidates.some((v) => v.includes('whiskey'))) return 'whiskeykeeper';
  return null;
}

function resolveCanonicalProductAndModules(sub: Record<string, unknown>, interval: string) {
  const explicitModules = uniq(splitMods(sub.modules_csv));
  const explicitProduct = resolveExplicitProduct(sub);
  const amount = Math.max(0, Number(sub.amount || 0));
  const amountInference = inferFromAmount(amount, interval === 'unknown' ? null : interval);

  if (explicitModules.length > 1) {
    return { product: 'bundle', modules: explicitModules, inferred: false, confidence: 'high', reason: 'modules_csv_bundle' };
  }
  if (explicitModules.length === 1 && explicitProduct && explicitProduct !== explicitModules[0]) {
    return { product: 'unknown', modules: [], inferred: false, confidence: 'low', reason: 'product_module_conflict' };
  }
  if (explicitModules.length === 1) {
    return { product: explicitModules[0], modules: explicitModules, inferred: false, confidence: 'high', reason: 'modules_csv_single' };
  }

  if (explicitProduct && explicitProduct !== 'bundle') {
    return { product: explicitProduct, modules: [explicitProduct], inferred: false, confidence: 'high', reason: 'explicit_product' };
  }
  if (explicitProduct === 'bundle') {
    if (amountInference?.modules?.length > 1) {
      return { product: 'bundle', modules: amountInference.modules, inferred: true, confidence: 'medium', reason: 'bundle_plus_amount' };
    }
    return { product: 'unknown', modules: [], inferred: false, confidence: 'low', reason: 'bundle_without_modules' };
  }

  if (amountInference?.modules?.length > 0) {
    const modules = amountInference.modules;
    const product = modules.length > 1 ? 'bundle' : modules[0];
    return { product, modules, inferred: true, confidence: 'medium', reason: 'amount_interval_inference' };
  }

  return { product: 'unknown', modules: [], inferred: false, confidence: 'low', reason: 'unresolved' };
}

function isActivePaid(sub: Record<string, unknown>, now: Date) {
  const status = norm(sub.status || '');
  if (!['active', 'trialing', 'trial', 'past_due'].includes(status)) return false;
  const end = parseDate(sub.current_period_end);
  if (end && end <= now) return false;
  return true;
}

function getCalendarRange(type: string, now: Date) {
  const start = new Date(now);
  let end = new Date(now);
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (caller?.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    const fetchAll = async (entity: { list: (a: null, b: number, c: number) => Promise<unknown> }) => {
      const rows: Record<string, unknown>[] = [];
      let skip = 0;
      const PAGE = 100;
      while (true) {
        let page: unknown = await entity.list(null, PAGE, skip);
        if (typeof page === 'string') page = JSON.parse(page);
        if (!Array.isArray(page) || page.length === 0) break;
        rows.push(...(page as Record<string, unknown>[]));
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      return rows;
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

    const trustedContracts: Record<string, unknown>[] = [];
    const inferredContracts: Record<string, unknown>[] = [];
    const exceptionContracts: Record<string, unknown>[] = [];
    const reasonCounts: Record<string, number> = {
      counted_as_paying_user: 0,
      unknown_product: 0,
      unknown_interval: 0,
      product_module_conflict: 0,
      inferred_contract: 0,
      manual_admin_access: 0,
      duplicate_subscription_merged: 0,
    };

    const seenContracts = new Set<string>();
    for (const sub of allSubs) {
      if (!isActivePaid(sub, now)) continue;

      const intervalResult = classifyInterval(sub);
      const resolved = resolveCanonicalProductAndModules(sub, intervalResult.interval);
      const { renewalDate, inferred: renewalInferred } = inferRenewalDate(sub, intervalResult.interval);

      const userId = String(sub.user_id || norm(sub.user_email || ''));
      const provider = detectProvider(sub);
      const providerSubscriptionId = getProviderSubscriptionId(sub);
      const dedupeKey = `${userId}|${provider}|${providerSubscriptionId}`;
      if (providerSubscriptionId && seenContracts.has(dedupeKey)) {
        reasonCounts.duplicate_subscription_merged++;
        continue;
      }
      if (providerSubscriptionId) seenContracts.add(dedupeKey);

      const row = {
        user_id: userId,
        user_email: norm(sub.user_email || ''),
        provider,
        provider_subscription_id: providerSubscriptionId,
        canonical_product: resolved.product,
        modules_granted: resolved.modules,
        billing_interval: intervalResult.interval,
        billed_amount: Math.max(0, Number(sub.amount || 0)),
        renewal_date: renewalDate ? renewalDate.toISOString() : null,
        status: norm(sub.status || ''),
        source_confidence: resolved.confidence,
        source_reason: resolved.reason,
        interval_inferred: intervalResult.inferred,
        renewal_inferred: renewalInferred,
      };

      if (!userId) {
        exceptionContracts.push({ ...row, exception_type: 'missing_user_id' });
        continue;
      }
      if (intervalResult.interval === 'unknown') {
        reasonCounts.unknown_interval++;
        exceptionContracts.push({ ...row, exception_type: 'unknown_interval' });
        continue;
      }
      if (resolved.reason === 'product_module_conflict') {
        reasonCounts.product_module_conflict++;
        exceptionContracts.push({ ...row, exception_type: 'product_module_conflict' });
        continue;
      }
      if (resolved.product === 'unknown' || resolved.modules.length === 0) {
        reasonCounts.unknown_product++;
        exceptionContracts.push({ ...row, exception_type: 'unknown_product' });
        continue;
      }

      const isInferred = resolved.inferred || intervalResult.inferred;
      if (isInferred) {
        reasonCounts.inferred_contract++;
        inferredContracts.push(row);
      } else {
        trustedContracts.push(row);
      }
    }

    const entitlements: Record<string, unknown>[] = trustedContracts.flatMap((c) => {
      const modules = Array.isArray(c.modules_granted) ? c.modules_granted : [];
      return modules.map((module) => ({
        user_id: c.user_id,
        module,
        source_contract: c.provider_subscription_id,
        tier: deriveTier(c as Record<string, unknown>),
        active: true,
      }));
    });

    const entitlementsByUser = new Map<string, string[]>();
    for (const e of entitlements) {
      const userId = String(e.user_id || '');
      if (!entitlementsByUser.has(userId)) entitlementsByUser.set(userId, []);
      entitlementsByUser.get(userId)!.push(String(e.module));
    }

    const contractsByUser = new Map<string, Record<string, unknown>[]>();
    for (const c of trustedContracts) {
      const userId = String(c.user_id || '');
      if (!contractsByUser.has(userId)) contractsByUser.set(userId, []);
      contractsByUser.get(userId)!.push(c);
    }

    const userRows = new Map<string, Record<string, unknown>>();
    for (const u of allUsers) {
      const userId = String(u.id || norm(u.email || ''));
      if (!userId) continue;
      const modules = uniq(entitlementsByUser.get(userId) || []);
      const activeContractCount = (contractsByUser.get(userId) || []).length;
      const paidUser = activeContractCount > 0;
      userRows.set(userId, {
        user_id: userId,
        email: norm(u.email || ''),
        paid_user: paidUser,
        effective_modules: modules,
        active_contract_count: activeContractCount,
      });
    }

    for (const c of trustedContracts) {
      const userId = String(c.user_id || '');
      if (userRows.has(userId)) continue;
      const modules = uniq(entitlementsByUser.get(userId) || []);
      userRows.set(userId, {
        user_id: userId,
        email: String(c.user_email || ''),
        paid_user: true,
        effective_modules: modules,
        active_contract_count: (contractsByUser.get(userId) || []).length,
      });
    }

    const manualGrantUsers = allUsers
      .filter((u) => {
        const userId = String(u.id || norm(u.email || ''));
        const hasCanonicalContract = (contractsByUser.get(userId) || []).length > 0;
        const isMarkedPaid = Boolean(u.has_paid_access) || norm(u.entitlement_tier || '') === 'pro';
        return isMarkedPaid && !hasCanonicalContract;
      })
      .map((u) => ({
        user_id: String(u.id || norm(u.email || '')),
        email: norm(u.email || ''),
        paid_modules_csv: u.paid_modules_csv || '',
        entitlement_tier: u.entitlement_tier || '',
      }));
    reasonCounts.manual_admin_access = manualGrantUsers.length;

    const users = Array.from(userRows.values());
    const paidUsers = users.filter((u) => Boolean(u.paid_user));
    reasonCounts.counted_as_paying_user = paidUsers.length;

    const paidAccounts = paidUsers.length;
    const discrepancy = paidAccounts - paidUsers.length;

    const productMix: Record<string, number> = {
      pipekeeper: 0,
      whiskeykeeper: 0,
      cigarkeeper: 0,
      winekeeper: 0,
      bundle: 0,
    };
    trustedContracts.forEach((c) => {
      const p = String(c.canonical_product || 'unknown');
      if (productMix[p] !== undefined) productMix[p]++;
    });

    const moduleCoverageByUser: Record<string, number> = {
      pipekeeper: 0,
      whiskeykeeper: 0,
      cigarkeeper: 0,
      winekeeper: 0,
    };
    for (const module of KNOWN_MODULES) {
      moduleCoverageByUser[module] = paidUsers.filter((u) => Array.isArray(u.effective_modules) && u.effective_modules.includes(module)).length;
    }

    const financialEligibleContracts = trustedContracts.filter((c) => {
      const amount = Number(c.billed_amount || 0);
      const interval = String(c.billing_interval || 'unknown');
      return amount > 0 && (interval === 'monthly' || interval === 'annual');
    });

    let mrr = 0;
    for (const c of financialEligibleContracts) {
      const amount = Number(c.billed_amount || 0);
      if (c.billing_interval === 'monthly') mrr += amount;
      else if (c.billing_interval === 'annual') mrr += amount / 12;
    }
    mrr = parseFloat(mrr.toFixed(2));

    const calcRenewal = (start: Date, end: Date) => {
      const renewing = financialEligibleContracts.filter((c) => {
        const d = parseDate(c.renewal_date);
        return Boolean(d && d >= start && d <= end);
      });
      const customerIds = new Set(renewing.map((c) => String(c.user_id || '')));
      const revenue = parseFloat(renewing.reduce((sum, c) => sum + Number(c.billed_amount || 0), 0).toFixed(2));
      const confirmed = renewing.filter((c) => !c.renewal_inferred).length;
      const inferred = renewing.filter((c) => c.renewal_inferred).length;
      return { customers: customerIds.size, subscriptions: renewing.length, revenue, confirmed, inferred };
    };

    const payingUsersList = paidUsers.map((u) => {
      const mods = Array.isArray(u.effective_modules) ? u.effective_modules : [];
      const canonicalProduct = mods.length > 1 ? 'bundle' : mods[0] || 'unknown';
      return {
        user_id: u.user_id,
        email: u.email,
        status: 'paying_user',
        canonicalProduct,
        modules: mods,
        subscriptionCount: u.active_contract_count,
        reasonCodes: ['counted_as_paying_user'],
      };
    });

    return Response.json({
      meta: {
        generatedAt: now.toISOString(),
        reportVersion: REPORT_VERSION,
      },

      metricDefinitions: {
        paidUsers: 'Unique users with >=1 trusted canonical active paid contract.',
        paidAccounts: 'Unique billing account holders with >=1 trusted canonical active paid contract (same grain as paid users in this model).',
        contracts: 'Trusted canonical active paid contract rows.',
        entitlements: 'Trusted effective user×module entitlements derived from trusted canonical contracts.',
      },

      reconciliation: {
        totalPaidAccounts: paidAccounts,
        uniquePayingUsers: paidUsers.length,
        discrepancy,
        reasonCounts,
        unknownProductRows: exceptionContracts.filter((r) => r.exception_type === 'unknown_product').length,
      },

      accounts: {
        totalUsers: users.length,
        paidUsers: paidUsers.length,
        freeUsers: users.length - paidUsers.length,
        paidPercentage: users.length > 0 ? parseFloat(((paidUsers.length / users.length) * 100).toFixed(1)) : 0,
      },

      subscriptions: {
        totalActivePaid: trustedContracts.length,
        uniquePayingUsers: paidUsers.length,
        monthly: trustedContracts.filter((c) => c.billing_interval === 'monthly').length,
        annual: trustedContracts.filter((c) => c.billing_interval === 'annual').length,
      },

      moduleCoverage: {
        byUserCount: moduleCoverageByUser,
        totalEntitlements: entitlements.length,
      },

      revenue: {
        mrr,
        arr: parseFloat((mrr * 12).toFixed(2)),
        byProduct: productMix,
      },

      renewals: {
        week: calcRenewal(ranges.week.start, ranges.week.end),
        month: calcRenewal(ranges.month.start, ranges.month.end),
        quarter: calcRenewal(ranges.quarter.start, ranges.quarter.end),
        year: calcRenewal(ranges.year.start, ranges.year.end),
      },

      datasets: {
        users,
        billingContracts: trustedContracts,
        entitlements,
      },

      exceptions: {
        inferredContracts: {
          count: inferredContracts.length,
          samples: inferredContracts.slice(0, 25),
        },
        unresolvedContracts: {
          count: exceptionContracts.length,
          samples: exceptionContracts.slice(0, 25),
        },
        manualGrantUsers: {
          count: manualGrantUsers.length,
          samples: manualGrantUsers.slice(0, 25),
        },
      },

      payingUsersList,
    });
  } catch (error) {
    console.error('[V3-CanonicalModel]', error);
    return Response.json(
      { error: String((error as Error)?.message || error), reportVersion: REPORT_VERSION },
      { status: 500 },
    );
  }
});
