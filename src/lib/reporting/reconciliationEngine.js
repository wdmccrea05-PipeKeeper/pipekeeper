// ═══════════════════════════════════════════════════════════════════════════════
// reconciliationEngine — pure logic for unmatched-payment matching, refund linking,
// history completeness, reliability status, and reconciliation totals.
// Platform-agnostic: no Deno, no SDK, no DOM. Fully unit-testable.
// ═══════════════════════════════════════════════════════════════════════════════

function norm(v) { return String(v ?? '').trim().toLowerCase(); }
function parseDate(value) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}
function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }
function roundMoney(v) { return Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100; }

// ─── Event classification (mirrors reporting classifier) ─────────────────────────
const REFUND_SLUGS = ['refund', 'refunded', 'chargeback', 'dispute', 'disputed', 'reversal', 'reversed'];
const FAILED_SLUGS = ['payment failed', 'invoice payment failed', 'charge failed', 'card declined', 'declined', 'payment canceled', 'canceled payment', 'void', 'voided'];
const PENDING_SLUGS = ['pending', 'incomplete', 'authorization only', 'authorized only', 'checkout expired', 'payment pending'];
const TRIAL_SLUGS = ['trial', 'trialing'];
const PAYMENT_SUCCESS_SLUGS = ['invoice paid', 'invoice payment succeeded', 'charge succeeded', 'checkout session completed', 'checkout.session.completed', 'initial purchase', 'initial buy', 'initial_purchase', 'repurchase', 'product purchase', 'renewed', 'renewal'];
const LIFECYCLE_SLUGS = ['customer subscription created', 'customer subscription updated', 'subscribed'];

function eventSlug(t) { return norm(t).replace(/[._-]+/g, ' '); }

export function classifyPaymentEvent(event) {
  const type = eventSlug(event?.event_type);
  const status = eventSlug(event?.raw_status || event?.status);
  const amount = Number(event?.amount_cents || 0);
  if (REFUND_SLUGS.some((s) => type.includes(s) || status.includes(s))) {
    return { isSuccessfulPayment: false, isRefund: true, reason: 'refund_event' };
  }
  if (FAILED_SLUGS.some((s) => type.includes(s) || status.includes(s))) {
    return { isSuccessfulPayment: false, isRefund: false, reason: 'failed_payment_event' };
  }
  if (PENDING_SLUGS.some((s) => type.includes(s) || status.includes(s))) {
    return { isSuccessfulPayment: false, isRefund: false, reason: 'pending_payment_event' };
  }
  if (TRIAL_SLUGS.some((s) => status.includes(s))) {
    return { isSuccessfulPayment: false, isRefund: false, reason: 'trial_event' };
  }
  if (PAYMENT_SUCCESS_SLUGS.some((s) => type.includes(s))) {
    return { isSuccessfulPayment: true, isRefund: false, reason: 'confirmed_success' };
  }
  if (LIFECYCLE_SLUGS.some((s) => type.includes(s)) && amount > 0) {
    return { isSuccessfulPayment: true, isRefund: false, reason: 'confirmed_success' };
  }
  return { isSuccessfulPayment: false, isRefund: false, reason: 'unrecognized_event' };
}

export function isPaymentEvent(e) { return classifyPaymentEvent(e).isSuccessfulPayment; }
export function isRefundEvent(e) { return classifyPaymentEvent(e).isRefund; }

// ─── Refund classification ───────────────────────────────────────────────────────
// A refund is "full" if the refund amount >= original amount; "partial" otherwise.
export function classifyRefund(refundEvent, originalEvent) {
  const refundAmt = Math.abs(Number(refundEvent?.refund_amount_cents || refundEvent?.amount_cents || 0));
  const origAmt = Math.abs(Number(originalEvent?.amount_cents || 0));
  if (!origAmt) return { kind: 'unknown', isFull: false, isPartial: false };
  const isFull = refundAmt >= origAmt;
  return {
    kind: isFull ? 'full_refund' : 'partial_refund',
    isFull,
    isPartial: !isFull,
    refundAmount: refundAmt,
    originalAmount: origAmt,
    remainingNet: Math.max(0, origAmt - refundAmt),
  };
}

// Is the refund event a chargeback/dispute?
export function isChargebackEvent(e) {
  const t = eventSlug(e?.event_type);
  const n = norm(e?.normalized_event_type);
  return ['chargeback_open', 'chargeback_won', 'chargeback_lost', 'dispute_open', 'dispute_closed'].includes(n)
    || ['chargeback', 'dispute', 'disputed'].some((s) => t.includes(s));
}

// ─── Refund → original payment linking ───────────────────────────────────────────
// Link a refund to its original payment by (in order):
//   1. explicit original_transaction_id / provider_transaction_id on the refund
//   2. same provider_subscription_id
//   3. same provider_customer_id
//   4. same user_id / user_email (last resort — ambiguous if multiple payments)
export function linkRefundToOriginalPayment(refundEvent, paymentEvents) {
  const candidates = (paymentEvents || []).filter((e) => isPaymentEvent(e));
  if (candidates.length === 0) return { matched: false, original: null, method: 'no_candidate', confidence: 'none' };

  // 1. explicit reference
  const explicitRef = norm(refundEvent.original_transaction_id || refundEvent.provider_transaction_id);
  if (explicitRef) {
    const hit = candidates.find((e) =>
      norm(e.provider_transaction_id) === explicitRef ||
      norm(e.original_transaction_id) === explicitRef
    );
    if (hit) return { matched: true, original: hit, method: 'explicit_transaction_ref', confidence: 'high' };
  }

  // 2. same subscription
  const subId = norm(refundEvent.provider_subscription_id);
  if (subId) {
    const hits = candidates.filter((e) => norm(e.provider_subscription_id) === subId);
    if (hits.length === 1) return { matched: true, original: hits[0], method: 'subscription_id', confidence: 'high' };
    if (hits.length > 1) {
      // pick the earliest payment before the refund date (refunds come after payments)
      const refundDate = parseDate(refundEvent.transaction_at || refundEvent.effective_at) || new Date();
      const before = hits.filter((e) => {
        const d = parseDate(e.transaction_at || e.effective_at);
        return d && d <= refundDate;
      }).sort((a, b) => parseDate(b.transaction_at) - parseDate(a.transaction_at));
      if (before.length >= 1) return { matched: true, original: before[0], method: 'subscription_id_dated', confidence: 'medium' };
    }
  }

  // 3. same customer
  const custId = norm(refundEvent.provider_customer_id);
  if (custId) {
    const hits = candidates.filter((e) => norm(e.provider_customer_id) === custId);
    if (hits.length === 1) return { matched: true, original: hits[0], method: 'customer_id', confidence: 'medium' };
  }

  // 4. same user — ambiguous if multiple
  const userId = refundEvent.user_id;
  const email = norm(refundEvent.user_email || refundEvent.email);
  if (userId || email) {
    const hits = candidates.filter((e) => (userId && e.user_id === userId) || (email && norm(e.user_email || e.email) === email));
    if (hits.length === 1) return { matched: true, original: hits[0], method: 'user_identity', confidence: 'medium' };
    if (hits.length > 1) return { matched: false, original: null, method: 'ambiguous_multiple_payments', confidence: 'low' };
  }

  return { matched: false, original: null, method: 'no_candidate', confidence: 'low' };
}

// ─── Refund metric computation ───────────────────────────────────────────────────
// Separates refunds occurring in the period from refunds OF acquisitions in the period.
// A renewal refund must never reduce the new-user acquisition count.
export function computeRefundMetrics(refundEvents, paymentEvents, range, inDateRangeFn) {
  const refundsInPeriod = (refundEvents || []).filter((e) => {
    const d = parseDate(e.transaction_at || e.effective_at || e.period_start);
    return d && inDateRangeFn(d, range);
  });

  let refundAmountInPeriod = 0;
  let firstPurchaseRefundsForAcquisitionsInPeriod = 0;
  let renewalRefundsInPeriod = 0;
  let refundsOfPurchasesFromPriorPeriods = 0;
  let partiallyRefundedTransactions = 0;
  let fullyRefundedTransactions = 0;
  let disputedTransactions = 0;
  let chargebacks = 0;

  for (const r of refundsInPeriod) {
    const amt = Math.abs(Number(r.refund_amount_cents || r.amount_cents || 0));
    refundAmountInPeriod += amt;
    if (isChargebackEvent(r)) chargebacks += 1;
    if (norm(r.dispute_status) && norm(r.dispute_status) !== 'none') disputedTransactions += 1;

    const link = linkRefundToOriginalPayment(r, paymentEvents);
    if (!link.matched) continue;
    const orig = link.original;
    const origDate = parseDate(orig.transaction_at || orig.effective_at);
    const cls = classifyRefund(r, orig);
    if (cls.isFull) fullyRefundedTransactions += 1;
    if (cls.isPartial) partiallyRefundedTransactions += 1;

    // Was the original payment an initial purchase (first for that user/subscription)?
    const origEventsForUser = (paymentEvents || []).filter((e) =>
      (orig.user_id && e.user_id === orig.user_id) ||
      (norm(orig.user_email) && norm(e.user_email) === norm(orig.user_email))
    );
    const sortedOrig = origEventsForUser.filter((e) => {
      const d = parseDate(e.transaction_at || e.effective_at);
      return d;
    }).sort((a, b) => parseDate(a.transaction_at) - parseDate(b.transaction_at));
    const isOriginalInitial = sortedOrig.length > 0 && sortedOrig[0].event_id === orig.event_id;

    const origInPeriod = origDate && inDateRangeFn(origDate, range);
    if (origInPeriod && isOriginalInitial && cls.isFull) {
      firstPurchaseRefundsForAcquisitionsInPeriod += 1;
    } else if (origInPeriod && !isOriginalInitial) {
      renewalRefundsInPeriod += 1; // additional-module or renewal refund in period
    } else if (!origInPeriod) {
      refundsOfPurchasesFromPriorPeriods += 1;
    } else if (origInPeriod && isOriginalInitial && cls.isPartial) {
      // partial refund of a first purchase does NOT remove the user from gross acquisition
      // (counts only toward partial refund tally, not first-purchase-refunds)
    }
  }

  return {
    refunds_occurred_in_period: refundsInPeriod.length,
    refund_amount_occurred_in_period: roundMoney(refundAmountInPeriod / 100),
    first_purchase_refunds_for_acquisitions_in_period: firstPurchaseRefundsForAcquisitionsInPeriod,
    renewal_refunds_in_period: renewalRefundsInPeriod,
    refunds_of_purchases_from_prior_periods: refundsOfPurchasesFromPriorPeriods,
    partially_refunded_transactions: partiallyRefundedTransactions,
    fully_refunded_transactions: fullyRefundedTransactions,
    disputed_transactions: disputedTransactions,
    chargebacks,
  };
}

// ─── Unmatched payment matching (reconciliation) ─────────────────────────────────
// Attempt to match a provider payment (SubscriptionEvent with no linked user) to a
// canonical user, in deterministic order. Returns a suggestion with confidence.
export function matchUnmatchedPayment(payment, context) {
  const {
    usersById,            // Map<id, user>
    usersByEmail,         // Map<normalizedEmail, user>
    usersByCustomerId,    // Map<provider_customer_id, user>
    usersBySubscriptionId,// Map<provider_subscription_id, user>
    emailAliases,         // Map<aliasEmail, canonicalUser> (historical)
  } = context;

  const reasons = [];
  const candidates = [];

  // 1. explicit canonical user ID in metadata
  const metaUserId = norm(payment.metadata?.user_id || payment.metadata?.userId || payment.metadata?.account_user_id);
  if (metaUserId && usersById.has(metaUserId)) {
    const u = usersById.get(metaUserId);
    candidates.push({ user: u, method: 'exact_user_id', confidence: 1.0, deterministic: true });
    reasons.push('metadata user_id matched canonical user');
  }

  // 2. provider-customer mapping
  const custId = norm(payment.provider_customer_id);
  if (custId && usersByCustomerId && usersByCustomerId.has(custId)) {
    const u = usersByCustomerId.get(custId);
    candidates.push({ user: u, method: 'exact_provider_customer_mapping', confidence: 0.95, deterministic: true });
    reasons.push('provider customer id mapped to a canonical user');
  }

  // 3. provider subscription mapping
  const subId = norm(payment.provider_subscription_id);
  if (subId && usersBySubscriptionId && usersBySubscriptionId.has(subId)) {
    const u = usersBySubscriptionId.get(subId);
    candidates.push({ user: u, method: 'exact_subscription_mapping', confidence: 0.95, deterministic: true });
    reasons.push('provider subscription id mapped to a canonical user');
  }

  // 4. exact normalized verified email
  const email = norm(payment.user_email || payment.email);
  if (email && usersByEmail.has(email)) {
    const u = usersByEmail.get(email);
    candidates.push({ user: u, method: 'exact_verified_email', confidence: 0.9, deterministic: true });
    reasons.push('verified email matched canonical user');
  }

  // 5. exact billing email (from raw payload metadata)
  const billingEmail = norm(payment.billing_email || payment.metadata?.billing_email);
  if (billingEmail && usersByEmail.has(billingEmail)) {
    const u = usersByEmail.get(billingEmail);
    candidates.push({ user: u, method: 'exact_billing_email', confidence: 0.85, deterministic: true });
    reasons.push('billing email matched canonical user');
  }

  // 6. historical email alias
  const aliasEmail = norm(payment.user_email || payment.email || payment.billing_email);
  if (aliasEmail && emailAliases && emailAliases.has(aliasEmail)) {
    const u = emailAliases.get(aliasEmail);
    candidates.push({ user: u, method: 'historical_email_match', confidence: 0.7, deterministic: false });
    reasons.push('historical email alias matched a canonical user');
  }

  if (candidates.length === 0) {
    return {
      matched: false,
      match_type: 'no_candidate',
      confidence: 0,
      deterministic: false,
      user: null,
      reasons: ['no canonical user candidate found by any deterministic key'],
      possible_matches: [],
    };
  }

  // Deduplicate candidates by user id, keep highest confidence
  const byUser = new Map();
  for (const c of candidates) {
    const key = String(c.user.id);
    if (!byUser.has(key) || byUser.get(key).confidence < c.confidence) byUser.set(key, c);
  }
  const unique = [...byUser.values()].sort((a, b) => b.confidence - a.confidence);

  // Ambiguous if two+ candidates with similar confidence
  if (unique.length > 1 && Math.abs(unique[0].confidence - unique[1].confidence) < 0.15) {
    return {
      matched: false, // do NOT auto-link ambiguous
      match_type: 'ambiguous_multiple_matches',
      confidence: unique[0].confidence,
      deterministic: false,
      user: null,
      reasons: ['multiple canonical users matched with similar confidence — admin approval required'],
      possible_matches: unique.map((c) => ({ user_id: String(c.user.id), email: norm(c.user.email), method: c.method, confidence: c.confidence })),
    };
  }

  const best = unique[0];
  const deterministicKeys = ['exact_user_id', 'exact_provider_customer_mapping', 'exact_subscription_mapping', 'exact_verified_email', 'exact_billing_email'];
  const isDeterministic = deterministicKeys.includes(best.method);
  return {
    matched: isDeterministic,
    match_type: best.method,
    confidence: best.confidence,
    deterministic: isDeterministic,
    user: { user_id: String(best.user.id), email: norm(best.user.email) },
    reasons,
    possible_matches: unique.map((c) => ({ user_id: String(c.user.id), email: norm(c.user.email), method: c.method, confidence: c.confidence })),
  };
}

// ─── History completeness ────────────────────────────────────────────────────────
// Determines whether a user's earliest imported payment can be treated as a
// confirmed first-ever payment, or only "confirmed within available history".
export function assessHistoryCompleteness(earliestPaymentDate, historyStart, hasOlderActiveSubscription) {
  const NEAR_BEGINNING_DAYS = 45;
  const earliest = parseDate(earliestPaymentDate);
  const start = parseDate(historyStart);
  if (!earliest || !start) {
    return { history_complete_from: null, completeness_status: 'unknown', first_paid_may_predate_history: false, label: 'unknown' };
  }
  const daysFromStart = (earliest.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
  const nearBeginning = daysFromStart <= NEAR_BEGINNING_DAYS;
  const mayPredate = nearBeginning && hasOlderActiveSubscription;
  const status = mayPredate ? 'may_predate_history'
    : (nearBeginning ? 'near_history_start' : 'complete_within_history');
  const label = mayPredate ? 'confirmed_within_available_history'
    : 'confirmed_first_ever_payment';
  return {
    history_complete_from: start.toISOString(),
    completeness_status: status,
    first_paid_may_predate_history: mayPredate,
    label,
  };
}

// ─── Reliability status ──────────────────────────────────────────────────────────
// Returns partially_verified with explicit reasons unless ALL conditions for
// verified are met.
export function computeReliabilityStatus(opts) {
  const {
    unmatchedPaymentCount,
    unmatchedSubscriptionCount,
    duplicateEventCount,
    appleConfigured,
    googleConfigured,
    manualConfigured,
    appleRelevant,      // whether Apple is a known active provider for any user
    googleRelevant,
    orphanedEntitlementCount,
    providerSyncFailures,
    backfillComplete,
    historySufficient,
    statusConflictCount,
    providerSyncStale,
  } = opts;

  const reasons = [];
  if (unmatchedPaymentCount > 0) reasons.push(`${unmatchedPaymentCount} Stripe payment${unmatchedPaymentCount === 1 ? ' is' : 's are'} not linked to canonical users`);
  if (appleRelevant && !appleConfigured) reasons.push('Apple App Store transaction history is not configured');
  if (googleRelevant && !googleConfigured) reasons.push('Google Play transaction history is not configured');
  if (orphanedEntitlementCount > 0) reasons.push(`${orphanedEntitlementCount} entitlement${orphanedEntitlementCount === 1 ? ' has' : 's have'} no backing contract or classified grant`);
  if (duplicateEventCount > 0) reasons.push(`${duplicateEventCount} duplicate provider event${duplicateEventCount === 1 ? '' : 's'} remain unresolved`);
  if (unmatchedSubscriptionCount > 0) reasons.push(`${unmatchedSubscriptionCount} provider subscription${unmatchedSubscriptionCount === 1 ? '' : 's'} unmatched`);
  if (providerSyncFailures > 0) reasons.push(`${providerSyncFailures} provider sync failure${providerSyncFailures === 1 ? '' : 's'} recorded`);
  if (providerSyncStale) reasons.push('provider synchronization is not current');
  if (!backfillComplete) reasons.push('historical backfill is incomplete');
  if (!historySufficient) reasons.push('historical coverage is insufficient to establish first-ever payment for some users');
  if (statusConflictCount > 0) reasons.push(`${statusConflictCount} unresolved status conflict${statusConflictCount === 1 ? '' : 's'}`);

  const verified = reasons.length === 0;
  return {
    status: verified ? 'verified' : 'partially_verified',
    reasons,
  };
}

// ─── Reconciliation totals (dashboard) ───────────────────────────────────────────
export function computeReconciliationTotals(opts) {
  const {
    totalProviderEvents,
    matchedEvents,
    unmatchedEvents,
    matchedPayments,
    unmatchedPayments,
    matchedSubscriptions,
    unmatchedSubscriptions,
    duplicateEventsRejected,
    usersWithConfirmedFirstPayments,
    usersWithInferredFirstPayments,
    usersWithUnresolvedFirstPayments,
    orphanedEntitlements,
    reliabilityStatus,
    lastProviderSync,
    lastReconciliationRun,
  } = opts;
  return {
    total_provider_events: totalProviderEvents,
    matched_events: matchedEvents,
    unmatched_events: unmatchedEvents,
    matched_payments: matchedPayments,
    unmatched_payments: unmatchedPayments,
    matched_subscriptions: matchedSubscriptions,
    unmatched_subscriptions: unmatchedSubscriptions,
    duplicate_events_rejected: duplicateEventsRejected,
    users_with_confirmed_first_payments: usersWithConfirmedFirstPayments,
    users_with_inferred_first_payments: usersWithInferredFirstPayments,
    users_with_unresolved_first_payments: usersWithUnresolvedFirstPayments,
    orphaned_entitlements: orphanedEntitlements,
    reliability_status: reliabilityStatus,
    last_provider_sync: lastProviderSync,
    last_reconciliation_run: lastReconciliationRun,
  };
}

// ─── Audit log entry builder ─────────────────────────────────────────────────────
export function buildAuditEntry(opts) {
  const { oldState, proposedMatch, finalMatch, confidence, administrator, notes } = opts;
  return {
    old_state: oldState,
    proposed_match: proposedMatch,
    final_match: finalMatch,
    confidence,
    administrator,
    timestamp: new Date().toISOString(),
    notes,
  };
}

// ─── Provider coverage ───────────────────────────────────────────────────────────
export function computeProviderCoverage(opts) {
  const { stripeConnected, stripeReconciled, appleConfigured, googleConfigured, manualConfigured, onlyStripeAccepted } = opts;
  const coverage = {
    stripe: stripeConnected ? (stripeReconciled ? 'connected_and_reconciled' : 'connected_and_partially_reconciled') : 'not_configured',
    apple: appleConfigured ? 'configured' : 'not_configured',
    google: googleConfigured ? 'configured' : 'not_configured',
    manual: manualConfigured ? 'configured' : 'not_configured',
  };
  const warnings = [];
  if (!stripeConnected) warnings.push('Stripe is not connected');
  if (stripeConnected && !stripeReconciled) warnings.push('Stripe is connected but not fully reconciled');
  if (!appleConfigured) warnings.push('Apple App Store is not configured');
  if (!googleConfigured) warnings.push('Google Play is not configured');
  if (!onlyStripeAccepted && !appleConfigured && !googleConfigured) {
    warnings.push('Only Stripe has been verified — the report does not cover all possible paid users');
  }
  if (onlyStripeAccepted) {
    warnings.push('CollectionKeeper currently accepts only Stripe payments — Apple/Google coverage not required');
  }
  return { coverage, warnings, only_stripe_accepted: !!onlyStripeAccepted };
}

// ─── Stripe paying-user verification ─────────────────────────────────────────────
export function verifyStripePayingUsers(opts) {
  const { stripeContracts, now } = opts;
  const nowDate = now || new Date();
  let matched = 0, unmatched = 0, statusConflicts = 0, periodConflicts = 0, refundConflicts = 0;
  for (const c of stripeContracts || []) {
    if (!c.provider || norm(c.provider) !== 'stripe') continue;
    if (!c.matched_to_user) { unmatched += 1; continue; }
    matched += 1;
    // status conflict: paying flag but status is canceled/expired before now
    const canceledAt = parseDate(c.canceled_at);
    const expiredAt = parseDate(c.expired_at);
    if (canceledAt && canceledAt < nowDate && c.is_currently_paying) statusConflicts += 1;
    if (expiredAt && expiredAt < nowDate && c.is_currently_paying) statusConflicts += 1;
    // period conflict: current_period_end before now but flagged paying
    const periodEnd = parseDate(c.current_period_end);
    if (periodEnd && periodEnd < nowDate && c.is_currently_paying && !c.has_canceling_but_entitled) periodConflicts += 1;
    // refund conflict: full refund invalidating current period
    if (c.fully_refunded_current_period) refundConflicts += 1;
  }
  return {
    current_stripe_paying_users: matched + unmatched,
    matched_to_canonical_users: matched,
    unmatched_provider_subscriptions: unmatched,
    status_conflicts: statusConflicts,
    period_conflicts: periodConflicts,
    refund_conflicts: refundConflicts,
  };
}