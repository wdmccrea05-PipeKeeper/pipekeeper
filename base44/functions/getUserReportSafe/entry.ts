import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

type ProductKey = 'pipekeeper' | 'whiskeykeeper' | 'cigarkeeper' | 'winekeeper' | 'bundle';
type IntervalKey = 'monthly' | 'annual';

const PRODUCT_KEYWORDS: { key: ProductKey; matches: string[] }[] = [
  { key: 'pipekeeper', matches: ['pipekeeper'] },
  { key: 'whiskeykeeper', matches: ['whiskeykeeper'] },
  { key: 'cigarkeeper', matches: ['cigarkeeper', 'cigar'] },
  { key: 'winekeeper', matches: ['winekeeper', 'wine'] },
];

const BUNDLE_KEYWORDS = ['founders', 'bundle', '3_module', '4_module', 'bundle_3', 'bundle_4'];

function norm(value: any) {
  return String(value || '').trim().toLowerCase();
}

function splitModulesCsv(csv: any): string[] {
  if (!csv) return [];
  return String(csv)
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function getCalendarRange(type: 'week' | 'month' | 'quarter' | 'year', now: Date) {
  const start = new Date(now);
  let end: Date;

  switch (type) {
    case 'week': {
      const day = start.getUTCDay();
      const delta = day === 0 ? 6 : day - 1;
      start.setUTCDate(start.getUTCDate() - delta);
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

function parseDate(value: any): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isBundleSub(sub: any): boolean {
  const haystack = [
    sub.product_kind,
    sub.bundle_name,
    sub.checkout_type,
    sub.subscription_tier,
    sub.price_id,
    sub.stripe_price_id,
    sub.apple_product_id,
    sub.plan_id,
    sub.plan_name,
    sub.name,
    sub.description,
  ]
    .map(norm)
    .join(' ');

  return BUNDLE_KEYWORDS.some((k) => haystack.includes(k));
}

function classifyProduct(sub: any): ProductKey {
  if (isBundleSub(sub)) return 'bundle';

  const moduleHints = splitModulesCsv(sub.modules_csv);
  for (const hint of moduleHints) {
    for (const entry of PRODUCT_KEYWORDS) {
      if (entry.matches.some((m) => hint.includes(m))) return entry.key;
    }
  }

  const haystack = [
    sub.product_kind,
    sub.subscription_tier,
    sub.price_id,
    sub.stripe_price_id,
    sub.apple_product_id,
    sub.plan_id,
    sub.plan_name,
    sub.name,
    sub.description,
    sub.tier,
  ]
    .map(norm)
    .join(' ');

  for (const entry of PRODUCT_KEYWORDS) {
    if (entry.matches.some((m) => haystack.includes(m))) return entry.key;
  }

  // Release-safe fallback while PipeKeeper is the currently live module.
  return 'pipekeeper';
}

function classifyInterval(sub: any): IntervalKey {
  const direct = norm(sub.billing_interval || sub.billing_period);
  if (['month', 'monthly'].includes(direct)) return 'monthly';
  if (['year', 'yearly', 'annual'].includes(direct)) return 'annual';

  const planId = norm(
    sub.price_id ||
      sub.stripe_price_id ||
      sub.apple_product_id ||
      sub.plan_id ||
      sub.plan_name
  );

  if (planId.includes('annual') || planId.includes('yearly') || planId.includes('year')) return 'annual';
  if (planId.includes('monthly') || planId.includes('month')) return 'monthly';

  const start = parseDate(sub.current_period_start);
  const end = parseDate(sub.current_period_end);
  if (start && end) {
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (days >= 300) return 'annual';
    if (days >= 20 && days <= 45) return 'monthly';
  }

  const amount = Number(sub.amount || 0);
  if (amount >= 50) return 'annual';
  return 'monthly';
}

function classifyBundleType(sub: any): 'founders' | 'threeModules' | 'fourModules' | null {
  const haystack = [
    sub.product_kind,
    sub.bundle_name,
    sub.checkout_type,
    sub.subscription_tier,
    sub.price_id,
    sub.plan_name,
    sub.name,
    sub.description,
  ]
    .map(norm)
    .join(' ');

  if (haystack.includes('founders')) return 'founders';
  if (haystack.includes('bundle_4') || haystack.includes('4_module') || haystack.includes('4 modules')) {
    return 'fourModules';
  }
  if (haystack.includes('bundle_3') || haystack.includes('3_module') || haystack.includes('3 modules')) {
    return 'threeModules';
  }
  return null;
}

function getSubAmount(sub: any): number {
  return Math.max(0, Number(sub.amount || 0));
}

function isActivePaidSub(sub: any, now: Date): boolean {
  const status = norm(sub.status);
  // 'trial' = free 7-day access, never paid.
  if (!['active', 'trialing', 'past_due'].includes(status)) return false;

  const provider = norm(sub.provider || '');
  const isApple = provider === 'apple' || !!sub.apple_product_id;

  if (status === 'active') {
    // Apple doesn't reliably update current_period_end — skip expiry check for Apple subs.
    if (!isApple) {
      const end = parseDate(sub.current_period_end);
      if (end && end <= now) return false;
    }
    return true;
  }
  if (['trialing', 'past_due'].includes(status)) {
    if (getSubAmount(sub) <= 0) return false;
    if (!isApple) {
      const end = parseDate(sub.current_period_end);
      if (end && end <= now) return false;
    }
    return true;
  }
  return false;
}

function toUserRow(user: any, bestSub: any, isPaid: boolean) {
  return {
    full_name: user.full_name || '',
    email: user.email || '',
    created_date: user.created_date || '',
    subscription_status: bestSub?.status || (isPaid ? 'active' : 'none'),
    subscription_tier: bestSub?.subscription_tier || bestSub?.tier || (isPaid ? 'premium' : 'none'),
    billing_interval: bestSub ? classifyInterval(bestSub) : '',
    subscription_end: bestSub?.current_period_end || '',
    platform: user?.data?.platform || user?.platform || 'web',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (authUser?.role !== 'admin') {
      return Response.json(
        {
          validation: { passed: false, errors: ['unauthorized'] },
          meta: { generatedAt: new Date().toISOString(), dateRangeDefinition: 'calendar' },
          accounts: {},
          counts: {},
          products: {},
          renewals: {},
          revenue: {},
          subscriptions: {},
          conversion: {},
          usage: {},
          paid_users: [],
          free_users: [],
        },
        { status: 200 }
      );
    }

    const fetchAll = async (entity: any) => {
      const PAGE = 100;
      const items: any[] = [];
      let skip = 0;

      while (true) {
        let page = await entity.list(null, PAGE, skip);
        if (typeof page === 'string') {
          try {
            page = JSON.parse(page);
          } catch {
            break;
          }
        }
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
      week: getCalendarRange('week', now),
      month: getCalendarRange('month', now),
      quarter: getCalendarRange('quarter', now),
      year: getCalendarRange('year', now),
    };

    const uniqueUsersMap = new Map<string, any>();
    for (const user of allUsers) {
      const email = norm(user.email);
      if (!email) continue;
      if (!uniqueUsersMap.has(email)) uniqueUsersMap.set(email, user);
    }
    const uniqueUsers = [...uniqueUsersMap.values()];

    const activeSubs = allSubscriptions.filter((sub) => isActivePaidSub(sub, now));

    const warnings: string[] = [];
    let inferredProductCount = 0;
    let inferredIntervalCount = 0;

    const normalized = activeSubs.map((sub) => {
      const product = classifyProduct(sub);
      const interval = classifyInterval(sub);
      const bundleType = classifyBundleType(sub);
      const amount = getSubAmount(sub);

      const haystack = [
        sub.modules_csv,
        sub.product_kind,
        sub.subscription_tier,
        sub.price_id,
        sub.stripe_price_id,
        sub.apple_product_id,
        sub.plan_id,
        sub.plan_name,
        sub.name,
        sub.description,
      ]
        .map(norm)
        .join(' ');

      if (!haystack.trim()) inferredProductCount += 1;
      if (!norm(sub.billing_interval || sub.billing_period)) inferredIntervalCount += 1;

      return {
        raw: sub,
        id: String(sub.id || sub.provider_subscription_id || sub.stripe_subscription_id || ''),
        userId: String(sub.user_id || norm(sub.user_email) || ''),
        userEmail: norm(sub.user_email),
        product,
        bundleType,
        interval,
        amount,
        renewalDate: parseDate(sub.current_period_end),
      };
    });

    if (inferredProductCount > 0) {
      warnings.push(`${inferredProductCount} subscriptions used fallback product classification.`);
    }
    if (inferredIntervalCount > 0) {
      warnings.push(`${inferredIntervalCount} subscriptions used fallback interval classification.`);
    }

    const counts = {
      totalSubscriptions: normalized.length,
      uniquePayingUsers: new Set(
        normalized.map((s) => s.userId || s.userEmail).filter(Boolean)
      ).size,
      monthlySubscriptions: normalized.filter((s) => s.interval === 'monthly').length,
      annualSubscriptions: normalized.filter((s) => s.interval === 'annual').length,
    };

    const products = {
      pipekeeper: normalized.filter((s) => s.product === 'pipekeeper').length,
      whiskeykeeper: normalized.filter((s) => s.product === 'whiskeykeeper').length,
      cigarkeeper: normalized.filter((s) => s.product === 'cigarkeeper').length,
      winekeeper: normalized.filter((s) => s.product === 'winekeeper').length,
      bundle: normalized.filter((s) => s.product === 'bundle').length,
    };

    const paidByBundle = {
      founders: normalized.filter((s) => s.bundleType === 'founders').length,
      threeModules: normalized.filter((s) => s.bundleType === 'threeModules').length,
      fourModules: normalized.filter((s) => s.bundleType === 'fourModules').length,
    };

    const totalMRR = normalized.reduce((sum, s) => {
      return sum + (s.interval === 'annual' ? s.amount / 12 : s.amount);
    }, 0);

    const revenue = {
      mrr: Number(totalMRR.toFixed(2)),
      arr: Number((totalMRR * 12).toFixed(2)),
      byProduct: {
        pipekeeper: Number(
          normalized
            .filter((s) => s.product === 'pipekeeper')
            .reduce((sum, s) => sum + s.amount, 0)
            .toFixed(2)
        ),
        whiskeykeeper: Number(
          normalized
            .filter((s) => s.product === 'whiskeykeeper')
            .reduce((sum, s) => sum + s.amount, 0)
            .toFixed(2)
        ),
        cigarkeeper: Number(
          normalized
            .filter((s) => s.product === 'cigarkeeper')
            .reduce((sum, s) => sum + s.amount, 0)
            .toFixed(2)
        ),
        winekeeper: Number(
          normalized
            .filter((s) => s.product === 'winekeeper')
            .reduce((sum, s) => sum + s.amount, 0)
            .toFixed(2)
        ),
        bundle: Number(
          normalized
            .filter((s) => s.product === 'bundle')
            .reduce((sum, s) => sum + s.amount, 0)
            .toFixed(2)
        ),
      },
    };

    const calcRenewalPeriod = (start: Date, end: Date) => {
      // Capture all renewals within the calendar period (including ones already past today within the period)
      const subs = normalized.filter((s) => s.renewalDate && s.renewalDate >= start && s.renewalDate <= end);
      const customers = new Set(subs.map((s) => s.userId || s.userEmail).filter(Boolean)).size;
      const subscriptions = subs.length;
      const revenueAmount = Number(subs.reduce((sum, s) => sum + s.amount, 0).toFixed(2));
      return { customers, subscriptions, revenue: revenueAmount };
    };

    const renewals = {
      thisWeek:    calcRenewalPeriod(ranges.week.start,    ranges.week.end),
      thisMonth:   calcRenewalPeriod(ranges.month.start,   ranges.month.end),
      thisQuarter: calcRenewalPeriod(ranges.quarter.start, ranges.quarter.end),
      thisYear:    calcRenewalPeriod(ranges.year.start,    ranges.year.end),
    };

    const signupSources = { web: 0, apple: 0, googlePlay: 0 };
    const newAccounts = { week: 0, month: 0, quarter: 0, year: 0 };
    const paid_users: any[] = [];
    const free_users: any[] = [];

    const subsByUserId = new Map<string, any[]>();
    const subsByEmail = new Map<string, any[]>();

    for (const sub of allSubscriptions) {
      if (sub.user_id) {
        if (!subsByUserId.has(sub.user_id)) subsByUserId.set(sub.user_id, []);
        subsByUserId.get(sub.user_id)!.push(sub);
      }
      const email = norm(sub.user_email);
      if (email) {
        if (!subsByEmail.has(email)) subsByEmail.set(email, []);
        subsByEmail.get(email)!.push(sub);
      }
    }

    for (const user of uniqueUsers) {
      const email = norm(user.email);
      const platform = norm(user?.data?.platform || user?.platform || 'web');

      if (platform.includes('apple') || platform.includes('ios')) signupSources.apple += 1;
      else if (platform.includes('google')) signupSources.googlePlay += 1;
      else signupSources.web += 1;

      const createdDate = parseDate(user.created_date);
      if (createdDate) {
        if (createdDate >= ranges.week.start && createdDate <= ranges.week.end) newAccounts.week += 1;
        if (createdDate >= ranges.month.start && createdDate <= ranges.month.end) newAccounts.month += 1;
        if (createdDate >= ranges.quarter.start && createdDate <= ranges.quarter.end) newAccounts.quarter += 1;
        if (createdDate >= ranges.year.start && createdDate <= ranges.year.end) newAccounts.year += 1;
      }

      const allUserSubs = [
        ...(subsByUserId.get(user.id) || []),
        ...(subsByEmail.get(email) || []),
      ];

      const seen = new Set<string>();
      const dedupedSubs = allUserSubs.filter((sub) => {
        const key = String(sub.id || sub.provider_subscription_id || sub.stripe_subscription_id || Math.random());
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const activeUserSubs = dedupedSubs.filter((sub) => isActivePaidSub(sub, now));
      const isPaid = activeUserSubs.length > 0;

      const bestSub =
        activeUserSubs.sort((a, b) => {
          return new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime();
        })[0] || dedupedSubs[0] || null;

      const row = toUserRow(user, bestSub, isPaid);
      if (isPaid) paid_users.push(row);
      else free_users.push(row);
    }

    const accounts = {
      totalUsers: uniqueUsers.length,
      paidUsers: paid_users.length,
      freeUsers: free_users.length,
      paidPercentage:
        uniqueUsers.length > 0 ? Number(((paid_users.length / uniqueUsers.length) * 100).toFixed(1)) : 0,
      signupSources,
      newAccounts,
    };

    // ── Trial metrics from actual subscription data ───────────────────────────
    const trialSubs = allSubscriptions.filter((s) => norm(s.status) === 'trial' || norm(s.status) === 'trialing');
    const now30dAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const now3dOut  = new Date(now.getTime() + 3  * 24 * 60 * 60 * 1000);
    const now7dOut  = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000);

    const currentlyOnTrial = trialSubs.filter((s) => {
      const end = parseDate(s.trial_end_date || s.current_period_end);
      return end && end > now;
    });

    const daysRemaining = currentlyOnTrial.map((s) => {
      const end = parseDate(s.trial_end_date || s.current_period_end)!;
      return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    });
    const avgDaysRemaining = daysRemaining.length > 0
      ? Math.round(daysRemaining.reduce((a, b) => a + b, 0) / daysRemaining.length)
      : 0;

    const endingIn3Days = currentlyOnTrial.filter((s) => {
      const end = parseDate(s.trial_end_date || s.current_period_end)!;
      return end <= now3dOut;
    }).length;

    const endingIn7Days = currentlyOnTrial.filter((s) => {
      const end = parseDate(s.trial_end_date || s.current_period_end)!;
      return end <= now7dOut;
    }).length;

    // Converted = was trial in last 30d and is now active (amount > 0)
    const convertedLast30d = allSubscriptions.filter((s) => {
      const created = parseDate(s.created_date);
      return created && created >= now30dAgo && norm(s.status) === 'active' && Number(s.amount || 0) > 0;
    }).length;

    // Drop-offs = trial ended in last 30d (trial_end_date passed) and still trial/expired/canceled
    const dropoffLast30d = allSubscriptions.filter((s) => {
      const trialEnd = parseDate(s.trial_end_date);
      const status = norm(s.status);
      return trialEnd && trialEnd >= now30dAgo && trialEnd <= now &&
        ['trial', 'expired', 'canceled'].includes(status);
    }).length;

    const subscriptions = {
      paidByBundle,
      trialMetrics: {
        currentlyOnTrial: currentlyOnTrial.length,
        avgDaysRemaining,
        endingIn3Days,
        endingIn7Days,
        convertedLast30d,
        dropoffLast30d,
      },
    };

    // Paid users with more than one active subscription (multi-module)
    const multiModuleUserCount = (() => {
      const subCountByUser = new Map<string, number>();
      for (const s of normalized) {
        const key = s.userId || s.userEmail;
        if (!key) continue;
        subCountByUser.set(key, (subCountByUser.get(key) || 0) + 1);
      }
      let count = 0;
      for (const v of subCountByUser.values()) { if (v > 1) count++; }
      return count;
    })();

    const paidToAdditionalModulesPct = counts.uniquePayingUsers > 0
      ? Number(((multiModuleUserCount / counts.uniquePayingUsers) * 100).toFixed(1))
      : 0;

    // Monthly churn: cancellations in past 30d / active subs
    const canceledLast30d = allSubscriptions.filter((s) => {
      const updated = parseDate(s.updated_date);
      return updated && updated >= now30dAgo && ['canceled', 'expired'].includes(norm(s.status));
    }).length;
    const paidToFreePct = counts.totalSubscriptions > 0
      ? Number(((canceledLast30d / counts.totalSubscriptions) * 100).toFixed(1))
      : 0;

    const conversion = {
      freeToPaidPct: accounts.paidPercentage,
      paidToAdditionalModulesPct,
      paidToFreePct,
    };

    const usage = {
      dauByModule: { pipekeeper: null, whiskeykeeper: null, cigarkeeper: null, winekeeper: null },
      wauByModule: { pipekeeper: null, whiskeykeeper: null, cigarkeeper: null, winekeeper: null },
    };

    return Response.json(
      {
        validation: { passed: true, errors: warnings },
        meta: { generatedAt: new Date().toISOString(), dateRangeDefinition: 'calendar' },
        accounts,
        counts,
        products,
        renewals,
        revenue,
        subscriptions,
        conversion,
        usage,
        paid_users,
        free_users,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[getUserReportSafe] hard failure:', error);

    return Response.json(
      {
        validation: { passed: false, errors: ['report_generation_failed', String(error?.message || error)] },
        meta: { generatedAt: new Date().toISOString(), dateRangeDefinition: 'calendar' },
        accounts: {},
        counts: {},
        products: {},
        renewals: {},
        revenue: {},
        subscriptions: {},
        conversion: {},
        usage: {},
        paid_users: [],
        free_users: [],
      },
      { status: 200 }
    );
  }
});