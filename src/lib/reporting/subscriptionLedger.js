/**
 * subscriptionLedger.js — Canonical subscription event classification, first-payment
 * evidence hierarchy, reactivation detection, and reliability computation.
 *
 * Pure functions, no I/O. Shared between frontend reporting and the test suite.
 * Backend functions replicate these rules (Deno functions cannot import src/).
 *
 * Exported:
 *   normEmail, classifyProviderEvent, dedupeKey,
 *   resolveFirstPaidHierarchy, detectReactivation, computeReliability,
 *   classifyUserStates, buildReconciliationDiff, RELIABILITY_RULES,
 *   EVIDENCE_HIERARCHY, CONFIDENCE_LEVELS
 */

export const EVIDENCE_HIERARCHY = [
  'confirmed_provider_transaction',
  'confirmed_successful_payment',
  'strong_subscription_evidence',
  'inferred_contract_period',
  'weak_created_date_fallback',
  'unresolved',
];

export const CONFIDENCE_LEVELS = {
  confirmed_provider_transaction: { label: 'Confirmed provider transaction', confirmed: true, rank: 1 },
  confirmed_successful_payment: { label: 'Confirmed successful payment', confirmed: true, rank: 2 },
  strong_subscription_evidence: { label: 'Strong subscription evidence', confirmed: false, rank: 3 },
  inferred_contract_period: { label: 'Inferred contract period', confirmed: false, rank: 4 },
  weak_created_date_fallback: { label: 'Weak created-date fallback', confirmed: false, rank: 5 },
  unresolved: { label: 'Unresolved', confirmed: false, rank: 6 },
};

export const RELIABILITY_RULES = {
  verified: 'All included paid acquisitions are backed by verified provider transactions.',
  partially_verified: 'Some records are verified and some remain inferred.',
  inferred: 'Most or all acquisition records rely on subscription or contract dates.',
  unreliable: 'Material unresolved mismatches could change the displayed total.',
};

export function normEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// ─── Provider event classification ───────────────────────────────────────────

/**
 * Map a raw provider event to canonical ledger fields.
 * @param {object} raw - { provider, event_type, ...payload }
 * @returns {object} normalized ledger event (subset; caller adds ids/timestamps)
 */
export function classifyProviderEvent(raw) {
  const provider = String(raw?.provider || 'unknown').toLowerCase();
  const eventType = String(raw?.event_type || raw?.event_type_raw || '');
  const amountCents = Number(raw?.amount_cents ?? 0) || 0;
  const isSuccessfulPayment = isSuccessfulPaymentEvent(provider, eventType, raw);
  const isRefund = isRefundEvent(provider, eventType, raw);
  const isChargeback = isChargebackEvent(provider, eventType, raw);
  const isTrial = isTrialEvent(provider, eventType, raw) || (Number(raw?.amount_cents ?? null) === 0 && isInitialPurchaseEvent(provider, eventType, raw, false));
  const isRenewal = isRenewalEvent(provider, raw);
  const isInitial = isInitialPurchaseEvent(provider, eventType, raw, isRenewal);
  const isCancellation = isCancellationEvent(provider, eventType, raw);
  const isExpiration = isExpirationEvent(provider, eventType, raw);

  let normalizedEventType = 'other';
  if (isRefund && raw?.refund_amount_cents != null && raw.refund_amount_cents < amountCentsOf(raw)) normalizedEventType = 'refund_partial';
  else if (isRefund) normalizedEventType = 'refund_full';
  else if (isChargeback && String(raw?.dispute_status || '').toLowerCase() === 'lost') normalizedEventType = 'chargeback_lost';
  else if (isChargeback && String(raw?.dispute_status || '').toLowerCase() === 'won') normalizedEventType = 'chargeback_won';
  else if (isChargeback) normalizedEventType = 'chargeback_open';
  else if (String(raw?.dispute_status || '').toLowerCase() === 'open') normalizedEventType = 'dispute_open';
  else if (isTrial) normalizedEventType = eventType.includes('end') || eventType.includes('TRIALEND') ? 'trial_end' : 'trial_start';
  else if (isCancellation) normalizedEventType = 'cancellation';
  else if (isExpiration) normalizedEventType = 'expiration';
  else if (isInitial && isSuccessfulPayment) normalizedEventType = 'initial_purchase';
  else if (isRenewal && isSuccessfulPayment) normalizedEventType = 'renewal';
  else if (raw?.is_reactivation) normalizedEventType = 'reactivation';
  else if (raw?.normalized_event_type) normalizedEventType = raw.normalized_event_type;
  else if (eventType.includes('failed') || eventType.includes('FAIL')) normalizedEventType = 'payment_failed';
  else if (eventType.includes('retry') || eventType.includes('RETRY')) normalizedEventType = 'payment_retry';
  else if (eventType.includes('grace') || eventType.includes('GRACE')) normalizedEventType = 'grace_period';
  else if (eventType.includes('upgrade') || eventType.includes('UPGRADE')) normalizedEventType = 'upgrade';
  else if (eventType.includes('downgrade') || eventType.includes('DOWNGRADE')) normalizedEventType = 'downgrade';
  else if (eventType.includes('migration') || eventType.includes('MIGRATION')) normalizedEventType = 'provider_migration';
  else if (isSuccessfulPayment) normalizedEventType = isInitial ? 'initial_purchase' : 'renewal';

  const sourceConfidence = isSuccessfulPayment
    ? (isInitial ? 'confirmed_provider_transaction' : 'confirmed_successful_payment')
    : isTrial
      ? 'strong_subscription_evidence'
      : 'unresolved';

  return {
    provider,
    event_type: eventType,
    normalized_event_type: normalizedEventType,
    user_id: raw?.user_id || null,
    user_email: normEmail(raw?.user_email || raw?.normalized_email),
    normalized_email: normEmail(raw?.user_email || raw?.normalized_email),
    provider_customer_id: raw?.provider_customer_id || null,
    provider_subscription_id: raw?.provider_subscription_id || null,
    provider_transaction_id: raw?.provider_transaction_id || null,
    original_transaction_id: raw?.original_transaction_id || null,
    provider_event_id: raw?.provider_event_id || raw?.event_id || null,
    product_id: raw?.product_id || raw?.price_id || null,
    module: raw?.module || 'unknown',
    raw_status: raw?.raw_status || null,
    payment_status: derivePaymentStatus(isSuccessfulPayment, isRefund, isChargeback, raw),
    subscription_status: raw?.subscription_status || 'unknown',
    amount_cents: amountCents,
    currency: raw?.currency || 'usd',
    billing_interval: raw?.billing_interval || raw?.interval || 'unknown',
    transaction_at: raw?.transaction_at || null,
    effective_at: raw?.effective_at || raw?.transaction_at || null,
    period_start: raw?.period_start || null,
    period_end: raw?.period_end || null,
    canceled_at: raw?.canceled_at || null,
    expired_at: raw?.expired_at || null,
    refunded_at: raw?.refunded_at || null,
    refund_amount_cents: raw?.refund_amount_cents ?? null,
    dispute_status: raw?.dispute_status || 'none',
    is_successful_payment: isSuccessfulPayment,
    is_initial_purchase: isInitial,
    is_renewal: isRenewal,
    is_reactivation: !!raw?.is_reactivation,
    is_refund: isRefund,
    is_partial_refund: isRefund && raw?.refund_amount_cents != null && raw.refund_amount_cents < amountCentsOf(raw),
    is_full_refund: isRefund && (raw?.refund_amount_cents == null || raw.refund_amount_cents >= amountCentsOf(raw)),
    is_chargeback: isChargeback,
    is_trial: isTrial,
    is_manual_adjustment: !!raw?.is_manual_adjustment || provider === 'manual',
    source_system: raw?.source_system || 'unknown',
    source_confidence: sourceConfidence,
  };
}

function amountCentsOf(raw) {
  return Number(raw?.amount_cents ?? 0) || 0;
}

function isSuccessfulPaymentEvent(provider, eventType, raw) {
  if (raw?.is_successful_payment != null) return !!raw.is_successful_payment;
  const et = eventType.toLowerCase();
  // Zero-dollar events are trials/promotions, not successful paid transactions.
  const amt = Number(raw?.amount_cents ?? null);
  if (amt === 0 && raw?.is_trial !== false) return false;
  if (provider === 'stripe') {
    return ['invoice.paid', 'invoice.payment_succeeded', 'charge.succeeded', 'payment_intent.succeeded', 'checkout.session.completed'].includes(et)
      && !isRefundEvent(provider, eventType, raw);
  }
  if (provider === 'apple') {
    return ['SUBSCRIBED', 'RENEWAL', 'DID_RENEW', 'RESUBSCRIBE'].includes(eventType) && raw?.billing_retry == null;
  }
  if (provider === 'google') {
    return ['1', '2', '3'].includes(String(raw?.notification_type || '')) && !raw?.is_refund;
  }
  if (provider === 'manual') return raw?.is_successful_payment === true;
  return false;
}

function isRefundEvent(provider, eventType, raw) {
  if (raw?.is_refund != null) return !!raw.is_refund;
  const et = eventType.toLowerCase();
  if (provider === 'stripe') return ['charge.refunded'].includes(et);
  if (provider === 'apple') return ['REFUND', 'REVOKE'].includes(eventType);
  if (provider === 'google') return String(raw?.notification_type) === '12' || eventType === 'REFUNDED';
  return false;
}

function isChargebackEvent(provider, eventType, raw) {
  const et = eventType.toLowerCase();
  if (provider === 'stripe') return et.startsWith('charge.dispute.');
  if (provider === 'apple') return eventType === 'CHARGEBACK';
  if (provider === 'google') return String(raw?.notification_type) === '15';
  return false;
}

function isTrialEvent(provider, eventType, raw) {
  const et = eventType.toLowerCase();
  if (provider === 'stripe') return et.includes('trial');
  if (provider === 'apple') return eventType.startsWith('TRIAL');
  if (provider === 'google') return raw?.is_trial === true;
  return !!raw?.is_trial;
}

function isRenewalEvent(provider, raw) {
  if (raw?.is_renewal != null) return !!raw.is_renewal;
  if (raw?.is_initial_purchase === true) return false;
  const et = String(raw?.event_type || raw?.event_type_raw || '').toUpperCase();
  if (provider === 'apple') return et === 'RENEWAL' || et === 'DID_RENEW';
  if (provider === 'google') return String(raw?.notification_type) === '2';
  if (provider === 'stripe') {
    // Stripe: a paid invoice that is NOT the first invoice is a renewal.
    return raw?.billing_reason === 'subscription_cycle' || et === 'INVOICE.PAID' && raw?.is_first_invoice === false;
  }
  return false;
}

function isInitialPurchaseEvent(provider, eventType, raw, isRenewal) {
  if (raw?.is_initial_purchase != null) return !!raw.is_initial_purchase;
  if (isRenewal) return false;
  const et = eventType.toLowerCase();
  if (provider === 'stripe') return et === 'checkout.session.completed' || raw?.billing_reason === 'subscription_create' || raw?.is_first_invoice === true;
  if (provider === 'apple') return eventType === 'SUBSCRIBED' || eventType === 'INITIAL_PURCHASE';
  if (provider === 'google') return String(raw?.notification_type) === '1';
  if (provider === 'manual') return raw?.is_initial_purchase === true;
  return false;
}

function isCancellationEvent(provider, eventType, raw) {
  const et = eventType.toLowerCase();
  if (provider === 'stripe') return et === 'customer.subscription.deleted' || (et === 'customer.subscription.updated' && raw?.cancel_at_period_end);
  if (provider === 'apple') return eventType === 'CANCELED' || eventType === 'DID_FAIL_TO_RENEW' && raw?.grace_period_expires;
  if (provider === 'google') return ['10', '13'].includes(String(raw?.notification_type));
  return false;
}

function isExpirationEvent(provider, eventType, raw) {
  const et = eventType.toLowerCase();
  if (provider === 'stripe') return et === 'customer.subscription.deleted' && raw?.status === 'canceled';
  if (provider === 'apple') return eventType === 'EXPIRED';
  if (provider === 'google') return String(raw?.notification_type) === '11';
  return false;
}

function derivePaymentStatus(isSuccessfulPayment, isRefund, isChargeback, raw) {
  if (isChargeback) return 'disputed';
  if (isRefund) return raw?.refund_amount_cents != null && raw.refund_amount_cents < amountCentsOf(raw) ? 'partially_refunded' : 'refunded';
  if (isSuccessfulPayment) return 'paid';
  if (String(raw?.event_type || '').toLowerCase().includes('failed')) return 'failed';
  if (isTrialEvent(String(raw?.provider || ''), String(raw?.event_type || ''), raw)) return 'no_payment';
  return raw?.payment_status || 'unknown';
}

// ─── Idempotency / deduplication ─────────────────────────────────────────────

/**
 * Compute the strongest available dedup key for a normalized event.
 * Returns null if no reliable key exists (caller should reject or flag).
 */
export function dedupeKey(ev) {
  const p = String(ev?.provider || '').toLowerCase();
  if (ev?.provider_event_id) return `${p}:evt:${ev.provider_event_id}`;
  if (p === 'apple' && ev?.original_transaction_id && ev?.provider_transaction_id)
    return `apple:otid:${ev.original_transaction_id}:${ev.provider_transaction_id}`;
  if (p === 'google' && ev?.provider_subscription_id && ev?.provider_transaction_id)
    return `google:tok:${ev.provider_subscription_id}:${ev.provider_transaction_id}`;
  if (ev?.provider_transaction_id) return `${p}:txn:${ev.provider_transaction_id}`;
  if (ev?.provider_subscription_id && ev?.transaction_at)
    return `${p}:sub:${ev.provider_subscription_id}:${ev.transaction_at}`;
  return null;
}

// ─── First-payment evidence hierarchy ───────────────────────────────────────

const DAY_MS = 86400000;

function toMs(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Resolve the earliest first-paid timestamp for a user from their ledger events.
 * Uses the strict hierarchy:
 *   1. Verified provider initial-purchase transaction
 *   2. Earliest verified successful invoice/charge
 *   3. Verified successful subscription payment
 *   4. Verified Apple original purchase date
 *   5. Verified Google Play initial purchase date
 *   6. Reliable stored first_paid_at with source reference
 *   7. Subscription started_at / subscriptionStartedAt
 *   8. ActiveContract.period_start
 *   9. Record created_date
 *
 * Returns { first_paid_at, confidence, source_field, source_entity, source_event_id }
 */
export function resolveFirstPaidHierarchy(userEvents, opts = {}) {
  const candidates = [];
  const subs = opts.subscriptions || [];
  const contracts = opts.contracts || [];

  for (const ev of userEvents || []) {
    const t = toMs(ev.transaction_at || ev.effective_at);
    if (!t) continue;
    if (ev.is_refund || ev.is_chargeback) continue;
    if (!ev.is_successful_payment) continue;
    if (ev.is_initial_purchase) {
      candidates.push({ t, confidence: 'confirmed_provider_transaction', source_field: 'transaction_at', source_entity: 'SubscriptionEvent', source_event_id: ev.provider_event_id || ev.id });
    } else if (ev.is_successful_payment) {
      candidates.push({ t, confidence: 'confirmed_successful_payment', source_field: 'transaction_at', source_entity: 'SubscriptionEvent', source_event_id: ev.provider_event_id || ev.id });
    }
  }

  // Level 4/5: Apple/Google initial purchase dates from events
  for (const ev of userEvents || []) {
    const t = toMs(ev.original_purchase_at || ev.transaction_at);
    if (!t || ev.is_refund || ev.is_chargeback) continue;
    if (String(ev.provider) === 'apple' && ev.original_transaction_id && ev.is_initial_purchase) {
      candidates.push({ t, confidence: 'confirmed_provider_transaction', source_field: 'original_purchase_at', source_entity: 'SubscriptionEvent', source_event_id: ev.provider_event_id });
    }
    if (String(ev.provider) === 'google' && ev.is_initial_purchase) {
      candidates.push({ t, confidence: 'confirmed_provider_transaction', source_field: 'transaction_at', source_entity: 'SubscriptionEvent', source_event_id: ev.provider_event_id });
    }
  }

  // Level 6: stored first_paid_at with source reference
  for (const ev of userEvents || []) {
    if (ev.first_paid_at && ev.first_paid_source_reference) {
      const t = toMs(ev.first_paid_at);
      if (t) candidates.push({ t, confidence: 'strong_subscription_evidence', source_field: 'first_paid_at', source_entity: 'SubscriptionEvent', source_event_id: ev.first_paid_source_reference });
    }
  }

  // Level 7: Subscription started_at / subscriptionStartedAt
  for (const s of subs) {
    const t = toMs(s.started_at || s.subscriptionStartedAt);
    if (t) candidates.push({ t, confidence: 'strong_subscription_evidence', source_field: s.started_at ? 'started_at' : 'subscriptionStartedAt', source_entity: 'Subscription', source_event_id: s.provider_subscription_id });
  }

  // Level 8: ActiveContract.period_start
  for (const c of contracts) {
    const t = toMs(c.period_start || c.current_period_start);
    if (t) candidates.push({ t, confidence: 'inferred_contract_period', source_field: c.period_start ? 'period_start' : 'current_period_start', source_entity: 'ActiveContract', source_event_id: c.provider_subscription_id });
  }

  // Level 9: created_date fallback (weakest)
  for (const s of subs) {
    const t = toMs(s.created_date || s.created_at);
    if (t) candidates.push({ t, confidence: 'weak_created_date_fallback', source_field: 'created_date', source_entity: 'Subscription', source_event_id: s.provider_subscription_id });
  }
  for (const c of contracts) {
    const t = toMs(c.created_date || c.created_at || c.normalized_at);
    if (t) candidates.push({ t, confidence: 'weak_created_date_fallback', source_field: 'created_date', source_entity: 'ActiveContract', source_event_id: c.provider_subscription_id });
  }

  if (candidates.length === 0) {
    return { first_paid_at: null, confidence: 'unresolved', source_field: null, source_entity: null, source_event_id: null };
  }
  // Pick earliest timestamp; on tie, prefer higher confidence (lower rank)
  candidates.sort((a, b) => a.t - b.t || rankOf(a.confidence) - rankOf(b.confidence));
  const best = candidates[0];
  return { first_paid_at: new Date(best.t).toISOString(), confidence: best.confidence, source_field: best.source_field, source_entity: best.source_entity, source_event_id: best.source_event_id || null };
}

function rankOf(conf) {
  return CONFIDENCE_LEVELS[conf]?.rank ?? 99;
}

// ─── Reactivation detection ──────────────────────────────────────────────────

/**
 * A reactivation requires: previous paid access, a documented lapse (>1 day beyond
 * prior paid period end), and a new successful payment after the lapse.
 *
 * Excludes: automatic renewal, grace-period retry, product addition, migration,
 * plan change, temporary past-due resolved within the same paid period.
 *
 * @param {object} newPayment - the new successful payment event
 * @param {Array} history - prior events for this user/subscription
 * @param {number} lapseThresholdDays - default 1
 * @returns {object} { is_reactivation, previous_paid_period_end, reactivation_payment_at, lapse_days, reactivation_source, reason }
 */
export function detectReactivation(newPayment, history, lapseThresholdDays = 1) {
  const priorPaid = (history || [])
    .filter((e) => e.is_successful_payment && !e.is_refund && !e.is_chargeback)
    .filter((e) => toMs(e.transaction_at) && toMs(e.transaction_at) < toMs(newPayment.transaction_at))
    .sort((a, b) => toMs(a.transaction_at) - toMs(b.transaction_at));

  if (priorPaid.length === 0) {
    return { is_reactivation: false, reason: 'no_prior_paid_access' };
  }

  // Exclude product addition / migration / plan change
  if (newPayment.is_provider_migration || newPayment.normalized_event_type === 'provider_migration') {
    return { is_reactivation: false, reason: 'provider_migration_not_reactivation' };
  }
  if (newPayment.normalized_event_type === 'upgrade' || newPayment.normalized_event_type === 'downgrade' || newPayment.normalized_event_type === 'product_change') {
    return { is_reactivation: false, reason: 'plan_change_not_reactivation' };
  }
  if (newPayment.normalized_event_type === 'additional_product') {
    return { is_reactivation: false, reason: 'additional_product_not_reactivation' };
  }

  const lastPrior = priorPaid[priorPaid.length - 1];
  const priorPeriodEnd = toMs(lastPrior.period_end);
  const newPaymentAt = toMs(newPayment.transaction_at);

  if (!priorPeriodEnd) {
    return { is_reactivation: false, reason: 'no_prior_period_end' };
  }

  // Within the same paid period (or within grace) → renewal/retry, not reactivation
  if (newPaymentAt <= priorPeriodEnd) {
    return { is_reactivation: false, reason: 'within_prior_paid_period' };
  }

  const lapseDays = (newPaymentAt - priorPeriodEnd) / DAY_MS;
  if (lapseDays <= lapseThresholdDays) {
    return { is_reactivation: false, reason: 'lapse_below_threshold', lapse_days: lapseDays };
  }

  return {
    is_reactivation: true,
    previous_paid_period_end: new Date(priorPeriodEnd).toISOString(),
    reactivation_payment_at: new Date(newPaymentAt).toISOString(),
    lapse_days: Math.round(lapseDays),
    reactivation_source: newPayment.provider,
  };
}

// ─── User canonical states ───────────────────────────────────────────────────

/**
 * Compute canonical payment/entitlement/activity states for a user from ledger events
 * and current contract/entitlement records. Never infers payment solely from entitlement.
 */
export function classifyUserStates(userEvents, currentContracts, currentEntitlements) {
  const paid = (userEvents || []).filter((e) => e.is_successful_payment && !e.is_refund && !e.is_chargeback);
  const refunds = (userEvents || []).filter((e) => e.is_full_refund);
  const disputes = (userEvents || []).filter((e) => e.is_chargeback);
  const trials = (userEvents || []).filter((e) => e.is_trial);

  const hasEverPaid = paid.length > 0;
  const now = Date.now();
  const isCurrentlyPaying = (currentContracts || []).some((c) =>
    c.is_active === true || ['active', 'trialing'].includes(String(c.status || '').toLowerCase())
  );
  const entitlement = (currentEntitlements || [])[0] || null;
  const isCurrentlyEntitled = !!entitlement?.has_access || isCurrentlyPaying;

  const isTrial = trials.length > 0 && !hasEverPaid;
  const isPastDue = (currentContracts || []).some((c) => String(c.status || '').toLowerCase() === 'past_due');
  const isInGracePeriod = (currentContracts || []).some((c) => String(c.status || '').toLowerCase() === 'past_due' && c.period_end && toMs(c.period_end) > now);
  const isManualEntitlement = !!entitlement && (currentContracts || []).length === 0 && entitlement.has_access === true;
  const isReferralEntitlement = !!entitlement?.access_source && String(entitlement.access_source).includes('referral');
  const isPromotionalEntitlement = !!entitlement?.access_source && String(entitlement.access_source).includes('promotion');

  return {
    has_ever_paid: hasEverPaid,
    is_currently_paying: isCurrentlyPaying,
    is_currently_entitled: isCurrentlyEntitled,
    is_trial: isTrial,
    is_past_due: isPastDue,
    is_in_grace_period: isInGracePeriod,
    is_manual_entitlement: isManualEntitlement,
    is_referral_entitlement: isReferralEntitlement,
    is_promotional_entitlement: isPromotionalEntitlement,
    is_orphaned_entitlement: isCurrentlyEntitled && !isCurrentlyPaying && (currentContracts || []).length === 0 && !isManualEntitlement && !isReferralEntitlement && !isPromotionalEntitlement,
    ever_refunded: refunds.length > 0,
    ever_disputed: disputes.length > 0,
  };
}

// ─── Reliability status ─────────────────────────────────────────────────────

/**
 * Compute the reliability status for a report.
 * @param {object} p
 * @param {number} p.confirmedCount
 * @param {number} p.inferredCount
 * @param {number} p.unresolvedCount
 * @param {number} p.unmatchedProviderRecords
 * @param {number} p.orphanedEntitlements
 * @param {boolean} p.missingPaymentHistory
 * @param {string|null} p.lastProviderSyncAt
 * @param {string|null} p.lastReconciliationAt
 */
export function computeReliability(p) {
  const confirmed = p.confirmedCount || 0;
  const inferred = p.inferredCount || 0;
  const unresolved = p.unresolvedCount || 0;
  const unmatched = p.unmatchedProviderRecords || 0;
  const orphaned = p.orphanedEntitlements || 0;

  const warnings = [];
  if (p.missingPaymentHistory) warnings.push('Provider payment history is missing for one or more providers; acquisition may be inferred.');
  if (unmatched > 0) warnings.push(`${unmatched} provider records could not be matched to a platform user.`);
  if (orphaned > 0) warnings.push(`${orphaned} entitled users have no supporting contract.`);
  if (unresolved > 0) warnings.push(`${unresolved} users have unresolved first-paid dates.`);

  let status = 'verified';
  if (unmatched > 0 || orphaned > 0) status = 'unreliable';
  else if (confirmed > 0 && inferred === 0 && unresolved === 0) status = 'verified';
  else if (confirmed > 0 && inferred > 0) status = 'partially_verified';
  else if (confirmed === 0 && inferred > 0) status = 'inferred';
  else if (confirmed === 0 && inferred === 0 && unresolved > 0) status = 'unreliable';

  if (p.lastProviderSyncAt) {
    const ageDays = (Date.now() - toMs(p.lastProviderSyncAt)) / DAY_MS;
    if (ageDays > 7) warnings.push(`Provider sync is stale (last ${Math.round(ageDays)} days ago).`);
  } else {
    warnings.push('No provider sync recorded yet.');
  }

  return {
    status,
    confirmed_user_count: confirmed,
    inferred_user_count: inferred,
    unresolved_user_count: unresolved,
    unmatched_provider_records: unmatched,
    orphaned_entitlements: orphaned,
    missing_payment_history: !!p.missingPaymentHistory,
    last_provider_sync_at: p.lastProviderSyncAt || null,
    last_reconciliation_at: p.lastReconciliationAt || null,
    warnings,
  };
}

// ─── Reconciliation diff ─────────────────────────────────────────────────────

/**
 * Build a reconciliation diff for one canonical user across the seven sources.
 * @param {object} sources - { events, subscriptions, contracts, entitlements, user }
 * @returns {Array} list of discrepancy objects
 */
export function buildReconciliationDiff(sources) {
  const events = sources.events || [];
  const subs = sources.subscriptions || [];
  const contracts = sources.contracts || [];
  const entitlements = sources.entitlements || [];
  const diffs = [];

  const providerTxns = events.filter((e) => e.is_successful_payment);
  const providerSubs = events.filter((e) => e.provider_subscription_id).map((e) => e.provider_subscription_id);

  if (providerTxns.length > 0 && !sources.user) {
    diffs.push({ type: 'provider_payment_but_no_user', severity: 'high', detail: `${providerTxns.length} provider payment(s) with no matching user` });
  }
  if (subs.length > 0 && providerTxns.length === 0) {
    diffs.push({ type: 'subscription_but_no_payment', severity: 'high', detail: 'Subscription record exists but no provider payment event' });
  }
  if (subs.length > 0 && contracts.length === 0) {
    diffs.push({ type: 'subscription_but_no_contract', severity: 'medium', detail: 'Subscription exists but no ActiveContract' });
  }
  if (contracts.length > 0 && subs.length === 0) {
    diffs.push({ type: 'contract_but_no_subscription', severity: 'medium', detail: 'ActiveContract exists but no Subscription' });
  }
  if (entitlements.length > 0 && contracts.length === 0) {
    diffs.push({ type: 'entitlement_but_no_contract', severity: 'high', detail: 'Entitlement exists but no ActiveContract' });
  }
  if (contracts.length > 0) {
    const subIds = new Set(subs.map((s) => String(s.provider_subscription_id || '').toLowerCase()).filter(Boolean));
    const contractsNoSub = contracts.filter((c) => !subIds.has(String(c.provider_subscription_id || '').toLowerCase()));
    if (contractsNoSub.length > 0) diffs.push({ type: 'contract_without_subscription', severity: 'medium', detail: `${contractsNoSub.length} contract(s) without matching subscription` });
  }
  // Email mismatch
  const emails = new Set([events, subs, contracts].flat().map((r) => normEmail(r?.user_email)).filter(Boolean));
  if (emails.size > 1) diffs.push({ type: 'email_mismatch', severity: 'medium', detail: `Multiple emails: ${[...emails].join(', ')}` });
  // Duplicate subscription
  const subIdCounts = {};
  for (const s of subs) { const k = String(s.provider_subscription_id || '').toLowerCase(); if (k) subIdCounts[k] = (subIdCounts[k] || 0) + 1; }
  const dupes = Object.entries(subIdCounts).filter(([, n]) => n > 1);
  if (dupes.length) diffs.push({ type: 'duplicate_subscription', severity: 'high', detail: `${dupes.length} duplicate subscription ID(s)` });
  // Duplicate transaction
  const txnIds = {};
  for (const e of events) { const k = e.provider_transaction_id; if (k) txnIds[k] = (txnIds[k] || 0) + 1; }
  const dupeTxns = Object.entries(txnIds).filter(([, n]) => n > 1);
  if (dupeTxns.length) diffs.push({ type: 'duplicate_transaction', severity: 'high', detail: `${dupeTxns.length} duplicate transaction ID(s)` });

  return diffs;
}