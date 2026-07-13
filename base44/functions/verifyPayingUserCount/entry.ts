import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.5.0';

// ═══════════════════════════════════════════════════════════════════════════════
// verifyPayingUserCount — Live provider reconciliation
//
// Queries live Stripe subscriptions and reconciles each local contract against
// the provider source of truth. Establishes a status-evidence hierarchy so that
// a stale local period_end does not automatically expire a user who is still
// paying according to Stripe.
//
// Returns:
//  - The 39-vs-40 discrepancy explanation
//  - Individual reconciliation of every locally-expired stale row
//  - Verification of every user removed from the paying count
//  - Live Stripe subscription counts
//  - Apple separation (unverified)
//  - Status-evidence hierarchy labels for every canonical subscription
// ═══════════════════════════════════════════════════════════════════════════════

function norm(v) { return String(v ?? '').trim().toLowerCase(); }
function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }
function parseDate(v) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─── Status-evidence hierarchy ─────────────────────────────────────────────────
// Determined in this priority order:
// 1. Live verified provider subscription state
// 2. Latest verified paid invoice and valid paid-through period
// 3. Verified provider renewal transaction
// 4. Current normalized ActiveContract period and status
// 5. Current Subscription record
// 6. Inferred local fallback
const EVIDENCE_HIERARCHY = [
  'verified_current_paid',
  'verified_canceling_but_paid_through',
  'verified_expired',
  'verified_canceled',
  'verified_past_due',
  'locally_current_unverified',
  'locally_expired_unverified',
  'conflicting_provider_and_local_state',
  'unresolved',
];

function classifyWithProviderEvidence(localContract, stripeSub, latestPaymentEvent, now) {
  const localStatus = localContract.normalized_status;
  const localPeriodEnd = localContract.current_period_end;
  const hasLocalCurrentPeriod = !!(localPeriodEnd && localPeriodEnd >= now);

  // ── 1. Live verified provider subscription state (highest priority) ──
  if (stripeSub) {
    const sStatus = norm(stripeSub.status);
    const sPeriodEnd = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null;
    const sCanceledAt = stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null;
    const sEndedAt = stripeSub.ended_at ? new Date(stripeSub.ended_at * 1000) : null;
    const sCancelAtPeriodEnd = !!stripeSub.cancel_at_period_end;
    const sHasCurrentPeriod = !!(sPeriodEnd && sPeriodEnd >= now);

    if (sStatus === 'active' && sHasCurrentPeriod) {
      return {
        verified_status: 'verified_current_paid',
        evidence_source: 'stripe_live_subscription',
        provider_status: sStatus,
        provider_period_end: sPeriodEnd?.toISOString() || null,
        cancel_at_period_end: sCancelAtPeriodEnd,
        confidence: 'high',
        explanation: 'Stripe subscription is active with a future period_end — confirmed current paying customer.',
      };
    }
    if (sStatus === 'trialing' && sHasCurrentPeriod) {
      return {
        verified_status: 'locally_current_unverified',
        evidence_source: 'stripe_live_subscription',
        provider_status: sStatus,
        provider_period_end: sPeriodEnd?.toISOString() || null,
        cancel_at_period_end: sCancelAtPeriodEnd,
        confidence: 'high',
        explanation: 'Stripe subscription is in trial — not a paid subscription yet.',
      };
    }
    if (sStatus === 'past_due') {
      return {
        verified_status: 'verified_past_due',
        evidence_source: 'stripe_live_subscription',
        provider_status: sStatus,
        provider_period_end: sPeriodEnd?.toISOString() || null,
        cancel_at_period_end: sCancelAtPeriodEnd,
        confidence: 'high',
        explanation: 'Stripe subscription is past_due — payment failed but grace period active.',
      };
    }
    if (sStatus === 'active' && !sHasCurrentPeriod && sCancelAtPeriodEnd && !sEndedAt) {
      return {
        verified_status: 'verified_canceling_but_paid_through',
        evidence_source: 'stripe_live_subscription',
        provider_status: sStatus,
        provider_period_end: sPeriodEnd?.toISOString() || null,
        cancel_at_period_end: sCancelAtPeriodEnd,
        canceled_at: sCanceledAt?.toISOString() || null,
        confidence: 'high',
        explanation: 'Stripe subscription is canceling at period end but still within paid period.',
      };
    }
    if (sStatus === 'canceled' || sEndedAt) {
      return {
        verified_status: 'verified_canceled',
        evidence_source: 'stripe_live_subscription',
        provider_status: sStatus,
        provider_period_end: sPeriodEnd?.toISOString() || null,
        canceled_at: sCanceledAt?.toISOString() || null,
        ended_at: sEndedAt?.toISOString() || null,
        confidence: 'high',
        explanation: 'Stripe subscription is canceled/ended — no longer paying.',
      };
    }
    if (sStatus === 'active' && !sHasCurrentPeriod) {
      // Stripe says active but period_end is in the past — could be sync delay
      // Check if there's a recent payment event
      if (latestPaymentEvent) {
        const paymentAge = (now.getTime() - latestPaymentEvent.getTime()) / (1000 * 60 * 60 * 24);
        if (paymentAge <= 45) {
          return {
            verified_status: 'verified_current_paid',
            evidence_source: 'stripe_live_subscription_and_payment_event',
            provider_status: sStatus,
            provider_period_end: sPeriodEnd?.toISOString() || null,
            latest_payment_at: latestPaymentEvent.toISOString(),
            confidence: 'medium',
            explanation: `Stripe subscription is active with stale period_end, but a recent payment (${Math.round(paymentAge)} days ago) confirms the subscription is still paying.`,
          };
        }
      }
      return {
        verified_status: 'conflicting_provider_and_local_state',
        evidence_source: 'stripe_live_subscription',
        provider_status: sStatus,
        provider_period_end: sPeriodEnd?.toISOString() || null,
        confidence: 'low',
        explanation: 'Stripe says active but period_end is past and no recent payment — needs manual review.',
      };
    }
    if (sStatus === 'incomplete' || sStatus === 'incomplete_expired') {
      return {
        verified_status: 'verified_expired',
        evidence_source: 'stripe_live_subscription',
        provider_status: sStatus,
        confidence: 'high',
        explanation: `Stripe subscription is ${sStatus} — payment was never completed.`,
      };
    }
    return {
      verified_status: 'unresolved',
      evidence_source: 'stripe_live_subscription',
      provider_status: sStatus,
      provider_period_end: sPeriodEnd?.toISOString() || null,
      confidence: 'low',
      explanation: `Stripe subscription status "${sStatus}" — not recognized by verifier.`,
    };
  }

  // ── 2-3. No live Stripe record — check latest payment event ──
  if (latestPaymentEvent) {
    const paymentAge = (now.getTime() - latestPaymentEvent.getTime()) / (1000 * 60 * 60 * 24);
    if (hasLocalCurrentPeriod && paymentAge <= 45) {
      return {
        verified_status: 'locally_current_unverified',
        evidence_source: 'latest_payment_event',
        latest_payment_at: latestPaymentEvent.toISOString(),
        confidence: 'medium',
        explanation: `No live Stripe record, but local period is current and a payment ${Math.round(paymentAge)} days ago supports current status.`,
      };
    }
    if (!hasLocalCurrentPeriod && paymentAge <= 45) {
      return {
        verified_status: 'locally_expired_unverified',
        evidence_source: 'latest_payment_event',
        latest_payment_at: latestPaymentEvent.toISOString(),
        confidence: 'low',
        explanation: `Local period expired but a recent payment ${Math.round(paymentAge)} days ago suggests the subscription may still be active — provider verification needed.`,
      };
    }
  }

  // ── 4-5. No Stripe, no recent payment — use local contract state ──
  if (hasLocalCurrentPeriod) {
    return {
      verified_status: 'locally_current_unverified',
      evidence_source: 'local_contract_period',
      confidence: 'low',
      explanation: 'No live provider data — local contract period is current but unverified.',
    };
  }

  // ── 6. Inferred local fallback ──
  return {
    verified_status: 'locally_expired_unverified',
    evidence_source: 'local_contract_period',
    confidence: 'low',
    explanation: 'No live provider data and local period has expired — classified as expired based on local inference only.',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const now = new Date();
    const body = await req.json().catch(() => ({}));
    const includeRawDetails = body?.includeRawDetails !== false;

    // ── Fetch all local data ──
    const [rawActiveContracts, rawSubscriptions, rawSubEvents, rawUsers] = await Promise.all([
      base44.asServiceRole.entities.ActiveContract.list('-normalized_at', 500),
      base44.asServiceRole.entities.Subscription.list('-created_date', 500),
      base44.asServiceRole.entities.SubscriptionEvent.list('-transaction_at', 500),
      base44.asServiceRole.entities.User.list('-created_date', 500),
    ]);

    const usersByEmail = new Map();
    const usersById = new Map();
    for (const u of rawUsers) {
      usersById.set(String(u.id), u);
      if (u.email) usersByEmail.set(norm(u.email), u);
    }

    // ── Fetch live Stripe subscriptions ──
    let stripeSubs = [];
    let stripeMeta = { source: 'unavailable', masked: null, environment: null, error: null };
    let stripe = null;
    try {
      const stripeKey = (Deno.env.get('STRIPE_SECRET_KEY') || '').trim();
      if (!stripeKey || stripeKey.startsWith('mk_') || !stripeKey.startsWith('sk_')) {
        throw new Error('Stripe secret key missing or invalid');
      }
      stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
      const masked = `${stripeKey.slice(0, 4)}…${stripeKey.slice(-4)}`;
      const environment = stripeKey.startsWith('sk_live_') ? 'live' : 'preview';
      stripeMeta = { source: 'env', masked, environment, error: null };
      const allSubs = [];
      let hasMore = true;
      let startingAfter = undefined;
      while (hasMore && allSubs.length < 500) {
        const page = await stripe.subscriptions.list({
          limit: 100,
          starting_after: startingAfter,
          expand: ['data.latest_invoice'],
        });
        allSubs.push(...page.data);
        hasMore = page.has_more;
        if (hasMore) startingAfter = page.data[page.data.length - 1].id;
      }
      stripeSubs = allSubs;
      console.log(`[verifyPayingUserCount] Fetched ${stripeSubs.length} live Stripe subscriptions`);
    } catch (stripeErr) {
      stripeMeta.error = stripeErr?.message || 'Unknown Stripe error';
      console.error('[verifyPayingUserCount] Stripe API failed:', stripeMeta.error);
    }

    // Index Stripe subscriptions by ID
    const stripeBySubId = new Map();
    const stripeByCustomerId = new Map();
    for (const s of stripeSubs) {
      stripeBySubId.set(norm(s.id), s);
      if (s.customer) {
        const cid = typeof s.customer === 'string' ? s.customer : s.customer.id;
        if (!stripeByCustomerId.has(norm(cid))) stripeByCustomerId.set(norm(cid), []);
        stripeByCustomerId.get(norm(cid)).push(s);
      }
    }

    // ── Build local contract index ──
    const localContracts = [];
    for (const ac of rawActiveContracts) {
      const subId = norm(ac.provider_subscription_id);
      const email = norm(ac.user_email);
      const userId = ac.user_id || (email && usersByEmail.has(email) ? String(usersByEmail.get(email).id) : `email:${email}`);
      const periodEnd = parseDate(ac.period_end || ac.current_period_end);
      const withinPeriod = !!(periodEnd && periodEnd >= now);
      const rawStatus = norm(ac.status);
      const normalizedStatus = ['active', 'paid'].includes(rawStatus) ? (withinPeriod ? 'active_paid' : 'expired')
        : ['trialing', 'trial'].includes(rawStatus) ? (withinPeriod ? 'trial' : 'expired')
        : ['past_due'].includes(rawStatus) ? 'past_due'
        : ['canceled'].includes(rawStatus) ? (withinPeriod ? 'canceling_but_entitled' : 'canceled')
        : ['expired'].includes(rawStatus) ? 'expired' : 'unknown';
      localContracts.push({
        source: 'ActiveContract',
        source_id: String(ac.id),
        user_id: userId,
        email,
        provider: norm(ac.provider) || 'unknown',
        provider_subscription_id: subId,
        provider_customer_id: norm(ac.provider_customer_id),
        product: ac.product || 'unknown',
        raw_status: rawStatus,
        normalized_status: normalizedStatus,
        current_period_end: periodEnd,
        current_period_start: parseDate(ac.period_start),
        amount: ac.amount_cents ? Number(ac.amount_cents) / 100 : null,
        billing_interval: ac.billing_interval || null,
        matched_to_user: !!(ac.user_id && usersById.has(String(ac.user_id))),
        is_synthetic: userId.startsWith('email:') || userId.startsWith('row:'),
        _raw: ac,
      });
    }

    // Add Subscription fallback rows not covered by ActiveContract
    const acCoverageKeys = new Set();
    for (const lc of localContracts) {
      if (lc.source === 'ActiveContract') {
        acCoverageKeys.add(`${lc.email}|${lc.provider}|${norm(lc.product)}`);
      }
    }
    for (const sub of rawSubscriptions) {
      const subId = norm(sub.provider_subscription_id || sub.stripe_subscription_id);
      if (subId && localContracts.some((lc) => lc.provider_subscription_id === subId && lc.source === 'ActiveContract')) continue;
      const email = norm(sub.user_email || sub.email);
      const provider = norm(sub.provider || 'stripe');
      const product = 'unknown';
      if (email && acCoverageKeys.has(`${email}|${provider}|${norm(product)}`)) continue;
      const userId = sub.user_id || (email && usersByEmail.has(email) ? String(usersByEmail.get(email).id) : `email:${email}`);
      const periodEnd = parseDate(sub.current_period_end);
      const withinPeriod = !!(periodEnd && periodEnd >= now);
      const rawStatus = norm(sub.status);
      const normalizedStatus = ['active', 'paid'].includes(rawStatus) ? (withinPeriod ? 'active_paid' : 'expired')
        : ['trialing', 'trial'].includes(rawStatus) ? (withinPeriod ? 'trial' : 'expired')
        : ['past_due'].includes(rawStatus) ? 'past_due'
        : ['canceled'].includes(rawStatus) ? (withinPeriod ? 'canceling_but_entitled' : 'canceled')
        : ['expired'].includes(rawStatus) ? 'expired' : 'unknown';
      localContracts.push({
        source: 'Subscription',
        source_id: String(sub.id),
        user_id: userId,
        email,
        provider,
        provider_subscription_id: subId,
        provider_customer_id: norm(sub.stripe_customer_id),
        product,
        raw_status: rawStatus,
        normalized_status: normalizedStatus,
        current_period_end: periodEnd,
        current_period_start: parseDate(sub.current_period_start),
        amount: sub.amount || null,
        billing_interval: sub.billing_interval || null,
        matched_to_user: !!(sub.user_id && usersById.has(String(sub.user_id))),
        is_synthetic: userId.startsWith('email:') || userId.startsWith('row:'),
        _raw: sub,
      });
    }

    // ── Build latest payment event index by user and by subscription ──
    const latestPaymentByUserId = new Map();
    const latestPaymentBySubId = new Map();
    for (const e of rawSubEvents) {
      const isPayment = ['invoice paid', 'invoice payment succeeded', 'charge succeeded', 'checkout session completed', 'checkout.session.completed', 'initial purchase', 'initial buy', 'initial_purchase', 'repurchase', 'product purchase', 'renewed', 'renewal'].some((s) => norm(e.event_type).includes(s));
      if (!isPayment) continue;
      const date = parseDate(e.transaction_at || e.effective_at || e.period_start || e.ingested_at);
      if (!date) continue;
      const uid = e.user_id || (e.user_email && usersByEmail.has(norm(e.user_email)) ? String(usersByEmail.get(norm(e.user_email)).id) : null);
      if (uid) {
        if (!latestPaymentByUserId.has(uid) || date > latestPaymentByUserId.get(uid)) latestPaymentByUserId.set(uid, date);
      }
      const sid = norm(e.provider_subscription_id);
      if (sid) {
        if (!latestPaymentBySubId.has(sid) || date > latestPaymentBySubId.get(sid)) latestPaymentBySubId.set(sid, date);
      }
    }

    // ── Reconcile each local contract against live Stripe ──
    const reconciledContracts = localContracts.map((lc) => {
      const stripeSub = lc.provider_subscription_id ? stripeBySubId.get(lc.provider_subscription_id) : null;
      const latestPayment = latestPaymentBySubId.get(lc.provider_subscription_id) || latestPaymentByUserId.get(lc.user_id) || null;
      const isApple = lc.provider === 'apple';
      let verification;

      if (isApple) {
        // Apple is not yet ledger-backed — label as unverified
        verification = {
          verified_status: lc.normalized_status === 'active_paid' ? 'locally_current_unverified' : 'locally_expired_unverified',
          evidence_source: 'apple_local_only',
          provider_status: null,
          provider_period_end: null,
          confidence: 'low',
          explanation: 'Apple subscriptions are not yet verified against the App Store Server — labeled as unverified.',
        };
      } else if (lc.provider === 'stripe' || (lc.provider === 'unknown' && lc.provider_subscription_id?.startsWith('sub_'))) {
        verification = classifyWithProviderEvidence(lc, stripeSub, latestPayment, now);
      } else {
        verification = classifyWithProviderEvidence(lc, null, latestPayment, now);
      }

      return {
        ...lc,
        ...verification,
        stripe_subscription_found: !!stripeSub,
        stripe_status: stripeSub?.status || null,
        stripe_period_end: stripeSub?.current_period_end ? new Date(stripeSub.current_period_end * 1000).toISOString() : null,
        stripe_cancel_at_period_end: stripeSub?.cancel_at_period_end ?? null,
        stripe_canceled_at: stripeSub?.canceled_at ? new Date(stripeSub.canceled_at * 1000).toISOString() : null,
        stripe_ended_at: stripeSub?.ended_at ? new Date(stripeSub.ended_at * 1000).toISOString() : null,
        latest_payment_at: verification.latest_payment_at || latestPayment?.toISOString() || null,
      };
    });

    // ── Deduplicate by subscription lifecycle ──
    const dedupeMap = new Map();
    let duplicatesMerged = 0;
    for (const rc of reconciledContracts) {
      const key = rc.provider_subscription_id ? `${rc.provider}|sub|${rc.provider_subscription_id}` : `${rc.provider}|${rc.user_id}|${rc.product}`;
      const existing = dedupeMap.get(key);
      if (!existing) { dedupeMap.set(key, rc); continue; }
      duplicatesMerged += 1;
      const score = (r) => (r.verified_status === 'verified_current_paid' ? 1000000 : 0) + (r.current_period_end?.getTime() || 0) + (r.amount ? 400 : 0);
      if (score(rc) > score(existing)) dedupeMap.set(key, rc);
    }
    const dedupedContracts = [...dedupeMap.values()];

    // ── Status-evidence hierarchy counts ──
    const evidenceCounts = {};
    for (const s of EVIDENCE_HIERARCHY) evidenceCounts[s] = 0;
    for (const rc of dedupedContracts) {
      evidenceCounts[rc.verified_status] = (evidenceCounts[rc.verified_status] || 0) + 1;
    }

    // ── Reconcile the 39-vs-40 discrepancy ──
    const providerVerifiedPaid = dedupedContracts.filter((c) => c.verified_status === 'verified_current_paid' || c.verified_status === 'verified_canceling_but_paid_through');
    const allPaidIdentities = uniq(providerVerifiedPaid.map((c) => c.user_id));
    const registeredPaidIdentities = allPaidIdentities.filter((id) => !id.startsWith('email:') && !id.startsWith('row:'));
    const syntheticPaidIdentities = allPaidIdentities.filter((id) => id.startsWith('email:') || id.startsWith('row:'));
    const unmatchedPaidIdentities = providerVerifiedPaid.filter((c) => !c.matched_to_user).map((c) => c.user_id);

    // Test/internal account classification
    const TEST_PATTERNS = ['pipekeepertest', 'admin@pipekeeperapp', 'test_', '@example.com', '@test.'];
    function isTestAccount(email, subId) {
      const e = norm(email), s = norm(subId);
      if (s.startsWith('test_') || /test_sub|test_\d+/.test(s)) return true;
      if (e.startsWith('admin@') || e.includes('admin@pipekeeperapp')) return true;
      return TEST_PATTERNS.some((p) => e.includes(p)) || e.includes('pipekeepertest');
    }
    const testAccountPaid = registeredPaidIdentities.filter((id) => {
      const c = providerVerifiedPaid.find((rc) => rc.user_id === id);
      return isTestAccount(c?.email, c?.provider_subscription_id);
    });

    const discrepancyExplanation = {
      canonical_current_paid_subscriptions: providerVerifiedPaid.length,
      distinct_canonical_user_ids: allPaidIdentities.length,
      distinct_registered_canonical_users: registeredPaidIdentities.length,
      unmatched_identities: syntheticPaidIdentities.length,
      test_internal_excluded: testAccountPaid.length,
      current_paying_users_displayed: Math.max(0, registeredPaidIdentities.length - testAccountPaid.length),
      explanation: (() => {
        if (allPaidIdentities.length === registeredPaidIdentities.length && testAccountPaid.length === 0) {
          return `${providerVerifiedPaid.length} current paid subscriptions resolve to ${allPaidIdentities.length} unique users, all registered and all production — no discrepancy.`;
        }
        const parts = [];
        if (syntheticPaidIdentities.length > 0) parts.push(`${syntheticPaidIdentities.length} unmatched/synthetic identit${syntheticPaidIdentities.length === 1 ? 'y' : 'ies'} excluded from registered-user KPI`);
        if (testAccountPaid.length > 0) parts.push(`${testAccountPaid.length} test/internal account${testAccountPaid.length === 1 ? '' : 's'} excluded from production KPI`);
        return `${providerVerifiedPaid.length} current paid subscriptions → ${allPaidIdentities.length} unique identities → ${registeredPaidIdentities.length} registered users → ${registeredPaidIdentities.length - testAccountPaid.length} production paying users (${parts.join('; ') || 'no exclusions'}).`;
      })(),
    };

    // ── Reconcile stale rows (locally expired but may still be paying) ──
    const staleRows = dedupedContracts.filter((c) => c.normalized_status === 'expired' && c.source !== 'Subscription');
    const staleRowReconciliation = staleRows.map((c) => {
      let category;
      if (c.stripe_subscription_found && c.stripe_status === 'active') {
        category = c.stripe_period_end && new Date(c.stripe_period_end) >= now ? 'provider_confirms_still_active' : 'conflicting_provider_local_data';
      } else if (c.stripe_subscription_found && (c.stripe_status === 'canceled' || c.stripe_ended_at)) {
        category = 'provider_confirms_expired';
      } else if (!c.stripe_subscription_found && c.provider === 'stripe') {
        category = c.latest_payment_at && (now.getTime() - new Date(c.latest_payment_at).getTime()) / (1000 * 60 * 60 * 24) <= 45 ? 'provider_unavailable_recent_payment' : 'provider_unavailable';
      } else if (c.provider === 'apple') {
        category = 'apple_unverified';
      } else {
        category = 'unresolved';
      }

      return includeRawDetails ? {
        canonical_user: c.email || c.user_id,
        provider: c.provider,
        provider_subscription_id: c.provider_subscription_id,
        product: c.product,
        local_status: c.raw_status,
        local_period_end: c.current_period_end?.toISOString() || null,
        latest_successful_payment: c.latest_payment_at,
        latest_invoice_period_end: c.stripe_period_end,
        provider_current_status: c.stripe_status,
        provider_current_period_end: c.stripe_period_end,
        cancellation_state: c.stripe_canceled_at || (c.stripe_cancel_at_period_end ? 'cancel_at_period_end' : null),
        refund_or_dispute_state: null,
        final_canonical_status: c.verified_status,
        evidence_source: c.evidence_source,
        confidence: c.confidence,
        is_historical_or_current: c.verified_status === 'verified_current_paid' ? 'current_lifecycle' : 'historical',
        category,
      } : { canonical_user: c.email || c.user_id, provider_subscription_id: c.provider_subscription_id, category, final_status: c.verified_status };
    });

    const staleRowCategories = {
      historical_duplicate_period: staleRowReconciliation.filter((r) => r.category === 'historical_duplicate_period').length,
      superseded_by_later_renewal: staleRowReconciliation.filter((r) => r.category === 'superseded_by_later_renewal').length,
      provider_confirms_expired: staleRowReconciliation.filter((r) => r.category === 'provider_confirms_expired').length,
      provider_confirms_still_active: staleRowReconciliation.filter((r) => r.category === 'provider_confirms_still_active').length,
      conflicting_provider_local_data: staleRowReconciliation.filter((r) => r.category === 'conflicting_provider_local_data').length,
      provider_unavailable: staleRowReconciliation.filter((r) => r.category === 'provider_unavailable').length,
      provider_unavailable_recent_payment: staleRowReconciliation.filter((r) => r.category === 'provider_unavailable_recent_payment').length,
      apple_unverified: staleRowReconciliation.filter((r) => r.category === 'apple_unverified').length,
      unresolved: staleRowReconciliation.filter((r) => r.category === 'unresolved').length,
    };

    // ── Users restored after provider verification ──
    const locallyExpiredButProviderActive = dedupedContracts.filter((c) =>
      c.normalized_status === 'expired' &&
      (c.verified_status === 'verified_current_paid' || c.verified_status === 'verified_canceling_but_paid_through')
    );

    // ── Stripe live counts ──
    const stripeActiveCount = stripeSubs.filter((s) => s.status === 'active').length;
    const stripeTrialingCount = stripeSubs.filter((s) => s.status === 'trialing').length;
    const stripePastDueCount = stripeSubs.filter((s) => s.status === 'past_due').length;
    const stripeCancelingCount = stripeSubs.filter((s) => s.status === 'active' && s.cancel_at_period_end).length;
    const stripeCanceledCount = stripeSubs.filter((s) => s.status === 'canceled').length;
    const stripeIncompleteCount = stripeSubs.filter((s) => s.status === 'incomplete' || s.status === 'incomplete_expired').length;

    // ── Apple separation ──
    const appleContracts = dedupedContracts.filter((c) => c.provider === 'apple');
    const appleVerified = appleContracts.filter((c) => c.verified_status === 'verified_current_paid').length;
    const appleLocallyCurrentUnverified = appleContracts.filter((c) => c.normalized_status === 'active_paid').length;
    const appleLocallyExpired = appleContracts.filter((c) => c.normalized_status === 'expired').length;

    // ── Final verification report ──
    const finalReport = {
      previous_raw_paying_rows: rawActiveContracts.length + rawSubscriptions.length,
      previous_unique_paying_users: 'see getUserSubscriptionReportV3 subscriptionStatus.currentPayingUsers (was 39 before verification)',
      new_canonical_subscription_lifecycles: dedupedContracts.length,
      provider_verified_current_paid_subscriptions: providerVerifiedPaid.length,
      provider_unverified_current_paid_subscriptions: dedupedContracts.filter((c) => c.verified_status === 'locally_current_unverified').length,
      current_paying_identities: allPaidIdentities.length,
      current_registered_paying_users: registeredPaidIdentities.length,
      production_kpi_paying_users: registeredPaidIdentities.length - testAccountPaid.length,
      reason_for_difference: discrepancyExplanation.explanation,
      users_restored_after_provider_verification: locallyExpiredButProviderActive.length,
      users_restored_emails: locallyExpiredButProviderActive.map((c) => c.email || c.user_id).slice(0, 50),
      stripe_current_paid_users: stripeActiveCount,
      apple_current_paid_users: appleVerified,
      apple_unverified_users: appleLocallyCurrentUnverified,
      test_internal_exclusions: testAccountPaid.length,
      unmatched_identities: syntheticPaidIdentities.length,
      unresolved_users: dedupedContracts.filter((c) => c.verified_status === 'unresolved').length,
      metric_label: 'Current paying users — provisional',
    };

    return Response.json({
      meta: {
        generatedAt: now.toISOString(),
        verificationVersion: 'v1-provider-reconciled',
        stripeAvailable: stripeMeta.error === null,
        stripeMeta,
      },
      discrepancyExplanation,
      evidenceHierarchyCounts: evidenceCounts,
      staleRowReconciliation: staleRowReconciliation.slice(0, 200),
      staleRowCategories,
      usersRestoredAfterVerification: locallyExpiredButProviderActive.map((c) => ({
        email: c.email,
        user_id: c.user_id,
        provider: c.provider,
        provider_subscription_id: c.provider_subscription_id,
        local_period_end: c.current_period_end?.toISOString() || null,
        stripe_period_end: c.stripe_period_end,
        stripe_status: c.stripe_status,
        verified_status: c.verified_status,
        evidence_source: c.evidence_source,
        confidence: c.confidence,
      })),
      stripeLiveCounts: {
        active: stripeActiveCount,
        trialing: stripeTrialingCount,
        past_due: stripePastDueCount,
        canceling_but_paid_through: stripeCancelingCount,
        canceled: stripeCanceledCount,
        incomplete: stripeIncompleteCount,
        total: stripeSubs.length,
      },
      appleSeparation: {
        verified_current: appleVerified,
        locally_current_unverified: appleLocallyCurrentUnverified,
        locally_expired: appleLocallyExpired,
        label: 'Apple subscriptions are unverified — App Store Server integration not yet configured.',
      },
      reconciledContracts: includeRawDetails ? dedupedContracts.map((c) => ({
        canonical_subscription_id: c.provider_subscription_id || c.source_id,
        canonical_user_id: c.user_id,
        email: c.email,
        provider: c.provider,
        provider_subscription_id: c.provider_subscription_id,
        normalized_product: c.product,
        current_status: c.verified_status,
        current_status_source: c.evidence_source,
        local_normalized_status: c.normalized_status,
        first_paid_at: null,
        latest_successful_payment_at: c.latest_payment_at,
        current_period_start: c.current_period_start?.toISOString() || null,
        current_period_end: c.current_period_end?.toISOString() || null,
        provider_period_end: c.stripe_period_end,
        cancel_at_period_end: c.stripe_cancel_at_period_end,
        provider_verified: c.stripe_subscription_found,
        confidence: c.confidence,
        issues: [!c.matched_to_user && 'unmatched_identity', c.is_synthetic && 'synthetic_identity', !c.stripe_subscription_found && c.provider === 'stripe' && 'missing_in_stripe'].filter(Boolean),
      })) : undefined,
      finalVerificationReport: finalReport,
    });
  } catch (error) {
    console.error('[verifyPayingUserCount] fatal:', error);
    return Response.json({ error: error?.message || 'Verification failed' }, { status: 500 });
  }
});