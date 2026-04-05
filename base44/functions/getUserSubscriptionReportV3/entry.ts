import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ─── Report version ───────────────────────────────────────────────────────────

const REPORT_VERSION = 'v3';

// ─── Types ────────────────────────────────────────────────────────────────────

type IntervalKind = 'monthly' | 'annual';

interface NormalizedSub {
  rawId: string;
  userId: string;
  userEmail: string;
  isPaid: boolean;
  billingInterval: IntervalKind | null; // null = missing / unknown
  price: number | null;                 // null = missing / zero
  createdAt: Date | null;
  renewalAt: Date | null;
  product: 'pipekeeper';
}

interface CalendarRange {
  start: Date;
  end: Date;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function norm(v: any): string {
  return String(v ?? '').trim().toLowerCase();
}

function parseDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inRange(d: Date, range: CalendarRange): boolean {
  return d >= range.start && d <= range.end;
}

// ─── Calendar ranges ──────────────────────────────────────────────────────────

/**
 * Returns UTC-aligned calendar boundaries for each period type.
 * today   = current day 00:00 → 23:59:59.999 UTC
 * week    = current ISO week (Monday 00:00 → Sunday 23:59:59.999 UTC)
 * month   = current calendar month (1st 00:00 → last day 23:59:59.999 UTC)
 * quarter = current calendar quarter
 * year    = current calendar year (Jan 1 → Dec 31 UTC)
 *
 * This is the single shared date-range helper for V3.
 * All report math uses it — do NOT use rolling windows anywhere.
 */
function getCalendarRange(
  type: 'today' | 'week' | 'month' | 'quarter' | 'year',
  now: Date
): CalendarRange {
  const start = new Date(now);
  let end: Date;

  switch (type) {
    case 'today': {
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 23, 59, 59, 999)
      );
      break;
    }
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
      end = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999)
      );
      break;
    }
    case 'quarter': {
      const q = Math.floor(start.getUTCMonth() / 3);
      start.setUTCMonth(q * 3, 1);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(
        Date.UTC(start.getUTCFullYear(), q * 3 + 3, 0, 23, 59, 59, 999)
      );
      break;
    }
    case 'year': {
      start.setUTCMonth(0, 1);
      start.setUTCHours(0, 0, 0, 0);
      end = new Date(
        Date.UTC(start.getUTCFullYear(), 11, 31, 23, 59, 59, 999)
      );
      break;
    }
  }

  return { start, end };
}

// ─── Interval normalization ───────────────────────────────────────────────────

/**
 * Normalize billing_interval / billing_period to 'monthly' | 'annual' | null.
 * Only uses the direct canonical fields — no period-length inference.
 */
function normalizeInterval(raw: any): IntervalKind | null {
  const v = norm(raw.billing_interval || raw.billing_period || '');
  if (v === 'month' || v === 'monthly') return 'monthly';
  if (v === 'year' || v === 'yearly' || v === 'annual') return 'annual';
  return null;
}

// ─── Active paid detection ────────────────────────────────────────────────────

/**
 * A subscription is "active paid" when:
 *   - status is 'active'
 *   - status is 'trialing' AND amount > 0 (paid trial)
 *   - status is 'past_due' (still counted until expired)
 */
function isActivePaid(raw: any): boolean {
  const status = norm(raw.status);
  const amount = Math.max(0, Number(raw.amount || 0));
  if (status === 'active') return true;
  if (status === 'trialing' && amount > 0) return true;
  if (status === 'past_due') return true;
  return false;
}

// ─── Normalization: raw → NormalizedSub ──────────────────────────────────────

/**
 * Normalize ONE raw subscription record into the V3 canonical shape.
 *
 * Field mapping from the Subscription entity:
 *   user_id          → userId
 *   user_email       → userEmail
 *   is_paid          → derived via isActivePaid(raw)
 *   billing_interval / billing_period → billingInterval (monthly | annual | null)
 *   amount           → price (null when missing/zero)
 *   started_at || created_date || current_period_start → createdAt
 *   current_period_end → renewalAt
 *   product          → always 'pipekeeper' (only paid module)
 */
function normalizeSub(raw: any): NormalizedSub {
  const rawPrice = Math.max(0, Number(raw.amount || 0));
  return {
    rawId:           String(raw.id || raw.stripe_subscription_id || ''),
    userId:          String(raw.user_id || ''),
    userEmail:       norm(raw.user_email || ''),
    isPaid:          isActivePaid(raw),
    billingInterval: normalizeInterval(raw),
    price:           rawPrice > 0 ? rawPrice : null,
    createdAt:       parseDate(raw.started_at || raw.created_date || raw.current_period_start),
    renewalAt:       parseDate(raw.current_period_end),
    product:         'pipekeeper',
  };
}

// ─── MRR math ─────────────────────────────────────────────────────────────────

/**
 * MRR contribution for a single normalized subscription:
 *   monthly → full price
 *   annual  → price / 12
 *   missing interval or price → 0 (excluded, counted in warnings)
 */
function mrrContribution(sub: NormalizedSub): number {
  if (!sub.isPaid || sub.price === null) return 0;
  if (sub.billingInterval === 'monthly') return sub.price;
  if (sub.billingInterval === 'annual') return sub.price / 12;
  return 0;
}

// ─── Renewal period math ──────────────────────────────────────────────────────

/**
 * For a calendar range, return:
 *   customers      = unique user_ids with at least one renewing subscription
 *   subscriptions  = count of subscriptions with renewal_at in range
 *   revenue        = sum of actual billed prices for those subscriptions
 *
 * Uses ACTUAL billed price — NOT MRR/ARR.
 */
function calcRenewalPeriod(
  paidSubs: NormalizedSub[],
  range: CalendarRange
): { customers: number; subscriptions: number; revenue: number } {
  const renewing = paidSubs.filter(
    (s) => s.renewalAt !== null && inRange(s.renewalAt, range)
  );
  const customers = new Set(
    renewing.map((s) => s.userId || s.userEmail).filter(Boolean)
  ).size;
  const revenue = parseFloat(
    renewing.reduce((sum, s) => sum + (s.price ?? 0), 0).toFixed(2)
  );
  return { customers, subscriptions: renewing.length, revenue };
}

// ─── Sanity checks ────────────────────────────────────────────────────────────

interface SanityResult {
  passed: boolean;
  failures: string[];
}

/**
 * Run hard assertions on the computed metrics.
 * On failure: log the bug and return the failure list.
 * Does NOT throw — the caller embeds failures in the response.
 *
 * Note: new account counts are NOT expected to be monotonic — calendar week
 * ranges can cross month/quarter boundaries, so week > month is normal.
 */
function runSanityChecks(params: {
  newAccounts: { today: number; week: number; month: number; quarter: number; year: number };
  paidAccounts: number;
  totalAccounts: number;
  mrr: number;
  arr: number;
  renewalWeek: { customers: number; subscriptions: number };
  renewalMonth: { customers: number; subscriptions: number };
  renewalQuarter: { customers: number; subscriptions: number };
  renewalYear: { customers: number; subscriptions: number };
}): SanityResult {
  const failures: string[] = [];
  const { paidAccounts, totalAccounts, mrr, arr } = params;

  // Paid accounts <= total accounts
  if (paidAccounts > totalAccounts) {
    failures.push(
      `SANITY_FAIL: paidAccounts(${paidAccounts}) > totalAccounts(${totalAccounts})`
    );
  }

  // ARR = MRR * 12 (allow <$0.01 float rounding)
  const expectedArr = parseFloat((mrr * 12).toFixed(2));
  if (Math.abs(arr - expectedArr) > 0.01) {
    failures.push(
      `SANITY_FAIL: arr(${arr}) !== mrr×12(${expectedArr})`
    );
  }

  // renewing customers <= renewing subscriptions (per period)
  for (const [label, period] of [
    ['week', params.renewalWeek],
    ['month', params.renewalMonth],
    ['quarter', params.renewalQuarter],
    ['year', params.renewalYear],
  ] as const) {
    if (period.customers > period.subscriptions) {
      failures.push(
        `SANITY_FAIL: renewal ${label} — customers(${period.customers}) > subscriptions(${period.subscriptions})`
      );
    }
  }

  if (failures.length > 0) {
    for (const f of failures) {
      console.error('[getUserSubscriptionReportV3] ' + f);
    }
  }

  return { passed: failures.length === 0, failures };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (authUser?.role !== 'admin') {
      return Response.json(
        {
          error: 'Forbidden: Admin access required',
          meta: { generatedAt: new Date().toISOString(), reportVersion: REPORT_VERSION },
        },
        { status: 403 }
      );
    }

    // ── Paginated fetch ───────────────────────────────────────────────────────
    const fetchAll = async (entity: any): Promise<any[]> => {
      const PAGE = 100;
      const items: any[] = [];
      let skip = 0;
      while (true) {
        let page = await entity.list(null, PAGE, skip);
        if (typeof page === 'string') {
          try { page = JSON.parse(page); } catch { break; }
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

    // ── Calendar ranges (single shared helper, used everywhere) ──────────────
    const ranges = {
      today:   getCalendarRange('today',   now),
      week:    getCalendarRange('week',    now),
      month:   getCalendarRange('month',   now),
      quarter: getCalendarRange('quarter', now),
      year:    getCalendarRange('year',    now),
    };

    // ── Deduplicate users by email (first occurrence wins) ────────────────────
    const uniqueUsersMap = new Map<string, any>();
    for (const u of allUsers) {
      const email = norm(u.email || '');
      if (!email) continue;
      if (!uniqueUsersMap.has(email)) uniqueUsersMap.set(email, u);
    }
    const uniqueUsers = [...uniqueUsersMap.values()];

    // ── Build subscription lookup maps (by user_id and by email) ─────────────
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

    // ── Normalize all active paid subscriptions ───────────────────────────────
    const warningMissingPrice:    string[] = [];
    const warningMissingInterval: string[] = [];
    const warningMissingRenewal:  string[] = [];

    const activePaidRaw = allSubscriptions.filter(isActivePaid);

    // Deduplicate by subscription id to avoid double-counting
    const seenSubIds = new Set<string>();
    const paidSubs: NormalizedSub[] = [];
    for (const raw of activePaidRaw) {
      const key = String(raw.id || raw.stripe_subscription_id || '');
      if (key && seenSubIds.has(key)) continue;
      if (key) seenSubIds.add(key);

      const sub = normalizeSub(raw);

      if (sub.price === null) {
        warningMissingPrice.push(
          `Sub "${sub.rawId}" (user: "${sub.userId || sub.userEmail}") is paid but missing price — excluded from revenue.`
        );
      }
      if (sub.billingInterval === null) {
        warningMissingInterval.push(
          `Sub "${sub.rawId}" (user: "${sub.userId || sub.userEmail}") is paid but missing billing interval — excluded from MRR/ARR.`
        );
      }
      if (sub.renewalAt === null) {
        warningMissingRenewal.push(
          `Sub "${sub.rawId}" (user: "${sub.userId || sub.userEmail}") is paid but missing renewal date — excluded from renewal metrics.`
        );
      }

      paidSubs.push(sub);
    }

    // ── Subscription counts ───────────────────────────────────────────────────
    const totalActivePaid = paidSubs.length;
    const monthlyCount    = paidSubs.filter((s) => s.billingInterval === 'monthly').length;
    const annualCount     = paidSubs.filter((s) => s.billingInterval === 'annual').length;

    // ── User-level paid / free classification ─────────────────────────────────
    // A user is paid if at least one active paid subscription belongs to them.
    const paidUsersList: any[] = [];
    const freeUsersList: any[] = [];

    for (const u of uniqueUsers) {
      const rawUserSubs = getUserRawSubs(u);
      const activePaidUserSubs = rawUserSubs.filter(isActivePaid);
      const isPaid = activePaidUserSubs.length > 0;

      // Best sub = first active paid sub (already in status priority by sort below)
      const bestRaw = activePaidUserSubs[0] ?? null;
      const bestSub = bestRaw ? normalizeSub(bestRaw) : null;

      const row = {
        full_name:           u.full_name || '',
        email:               norm(u.email || ''),
        role:                u.role || 'user',
        created_date:        u.created_date || '',
        subscription_status: isPaid ? (norm(bestRaw?.status) || 'active') : 'none',
        billing_interval:    bestSub?.billingInterval ?? null,
        subscription_end:    bestSub?.renewalAt?.toISOString() ?? null,
      };

      if (isPaid) paidUsersList.push(row);
      else        freeUsersList.push(row);
    }

    const totalUsers     = uniqueUsers.length;
    const paidUsersCount = paidUsersList.length;
    const freeUsersCount = freeUsersList.length;
    const paidPct        = totalUsers > 0
      ? parseFloat(((paidUsersCount / totalUsers) * 100).toFixed(1))
      : 0;

    // ── Signup sources ────────────────────────────────────────────────────────
    const signupSources = { web: 0, apple: 0, googlePlay: 0, unknown: 0 };
    for (const u of uniqueUsers) {
      const platform = norm(u.data?.platform || u.platform || '');
      if (platform === 'apple' || platform === 'ios') {
        signupSources.apple++;
      } else if (platform === 'android' || platform === 'googleplay' || platform === 'google') {
        signupSources.googlePlay++;
      } else if (!platform) {
        signupSources.unknown++;
      } else {
        signupSources.web++;
      }
    }

    // ── New accounts by calendar period (based ONLY on user created_at) ───────
    // Each period is an independent calendar window (UTC). Week can cross month
    // boundaries, so counts are NOT expected to be monotonic across periods.
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
    // Only subs with a known billing interval and non-null price contribute.
    const mrrSubs    = paidSubs.filter((s) => s.billingInterval !== null && s.price !== null);
    const totalMRR   = mrrSubs.reduce((sum, s) => sum + mrrContribution(s), 0);
    const mrr        = parseFloat(totalMRR.toFixed(2));
    const arr        = parseFloat((totalMRR * 12).toFixed(2));

    // ── Renewal revenue by calendar period ────────────────────────────────────
    // Uses ACTUAL billed price — not MRR/ARR.
    const renewalWeek    = calcRenewalPeriod(paidSubs, ranges.week);
    const renewalMonth   = calcRenewalPeriod(paidSubs, ranges.month);
    const renewalQuarter = calcRenewalPeriod(paidSubs, ranges.quarter);
    const renewalYear    = calcRenewalPeriod(paidSubs, ranges.year);

    // ── Sanity checks ─────────────────────────────────────────────────────────
    const sanity = runSanityChecks({
      newAccounts,
      paidAccounts:  paidUsersCount,
      totalAccounts: totalUsers,
      mrr,
      arr,
      renewalWeek,
      renewalMonth,
      renewalQuarter,
      renewalYear,
    });

    // Sort user lists newest first
    const sortByDate = (a: any, b: any) =>
      new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime();
    paidUsersList.sort(sortByDate);
    freeUsersList.sort(sortByDate);

    // ── Assemble V3 response ──────────────────────────────────────────────────
    return Response.json({
      meta: {
        generatedAt:         now.toISOString(),
        dateRangeDefinition: 'calendar',
        timezoneNote:        'UTC',
        reportVersion:       REPORT_VERSION,
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
        missingPrice:    warningMissingPrice.length,
        missingInterval: warningMissingInterval.length,
        missingRenewal:  warningMissingRenewal.length,
        messages: [
          ...warningMissingPrice,
          ...warningMissingInterval,
          ...warningMissingRenewal,
          ...sanity.failures,
        ],
      },
      accounts: {
        total:        totalUsers,
        paid:         paidUsersCount,
        free:         freeUsersCount,
        paidPct,
        signupSources,
        newAccounts,
      },
      subscriptions: {
        totalActivePaid,
        monthly: monthlyCount,
        annual:  annualCount,
        // V3: every paid subscription is PipeKeeper — no classification needed
        byProduct: {
          pipekeeper:    totalActivePaid,
          whiskeykeeper: 0,
          cigarkeeper:   0,
          winekeeper:    0,
          bundles:       0,
        },
      },
      runRate: { mrr, arr },
      renewalRevenue: {
        week:    renewalWeek,
        month:   renewalMonth,
        quarter: renewalQuarter,
        year:    renewalYear,
      },
      paid_users: paidUsersList,
      free_users: freeUsersList,
    });

  } catch (error: any) {
    console.error('[getUserSubscriptionReportV3] HARD FAILURE:', error);
    return Response.json(
      {
        error:        'report_generation_failed',
        detail:       String(error?.message || error),
        meta:         { generatedAt: new Date().toISOString(), reportVersion: REPORT_VERSION },
        sanityChecks: { passed: false, failures: ['Report generation failed — see server logs.'] },
        warnings:     {
          missingPrice: 0, missingInterval: 0, missingRenewal: 0,
          messages: ['Report generation failed — see server logs.'],
        },
        accounts:       {},
        subscriptions:  {},
        runRate:        {},
        renewalRevenue: {},
        paid_users:     [],
        free_users:     [],
      },
      { status: 200 }
    );
  }
});
