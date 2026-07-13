// Pure provider-verification logic — testable surface for the status-evidence
// hierarchy used by both the verifyPayingUserCount backend function and the
// regression test suite. Mirrors classifyWithProviderEvidence in the backend.

export function norm(v) { return String(v ?? '').trim().toLowerCase(); }
export function parseDate(v) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export const EVIDENCE_HIERARCHY = [
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

/**
 * Status-evidence hierarchy classifier.
 * Priority:
 * 1. Live verified provider subscription state
 * 2. Latest verified paid invoice / valid paid-through period (latest payment event)
 * 3. Current normalized ActiveContract period and status
 * 4. Inferred local fallback
 */
export function classifyWithProviderEvidence(localContract, stripeSub, latestPaymentEvent, now) {
  const localStatus = localContract.normalized_status;
  const localPeriodEnd = localContract.current_period_end
    ? (localContract.current_period_end instanceof Date ? localContract.current_period_end : parseDate(localContract.current_period_end))
    : null;
  const hasLocalCurrentPeriod = !!(localPeriodEnd && localPeriodEnd >= now);

  // Apple is not yet ledger-backed — always label as unverified
  if (norm(localContract.provider) === 'apple') {
    return {
      verified_status: hasLocalCurrentPeriod ? 'apple_locally_current_unverified' : 'apple_locally_expired_unverified',
      evidence_source: 'apple_local_only',
      provider_status: null,
      confidence: 'low',
      explanation: 'Apple subscriptions are not yet verified against the App Store Server.',
    };
  }

  // ── 1. Live verified provider subscription state ──
  if (stripeSub) {
    const sStatus = norm(stripeSub.status);
    const sPeriodEnd = stripeSub.current_period_end
      ? new Date(typeof stripeSub.current_period_end === 'number' ? stripeSub.current_period_end * 1000 : stripeSub.current_period_end)
      : null;
    const sCancelAtPeriodEnd = !!stripeSub.cancel_at_period_end;
    const sHasCurrentPeriod = !!(sPeriodEnd && sPeriodEnd >= now);

    if (sStatus === 'active' && sHasCurrentPeriod) {
      return { verified_status: 'verified_current_paid', evidence_source: 'stripe_live_subscription', provider_status: sStatus, confidence: 'high',
        explanation: 'Stripe subscription is active with a future period_end — confirmed current paying customer.' };
    }
    if (sStatus === 'trialing' && sHasCurrentPeriod) {
      return { verified_status: 'locally_current_unverified', evidence_source: 'stripe_live_subscription', provider_status: sStatus, confidence: 'high',
        explanation: 'Stripe subscription is in trial — not a paid subscription yet.' };
    }
    if (sStatus === 'past_due') {
      return { verified_status: 'verified_past_due', evidence_source: 'stripe_live_subscription', provider_status: sStatus, confidence: 'high',
        explanation: 'Stripe subscription is past_due — payment failed but grace period active.' };
    }
    if (sStatus === 'active' && !sHasCurrentPeriod && sCancelAtPeriodEnd && !stripeSub.ended_at) {
      return { verified_status: 'verified_canceling_but_paid_through', evidence_source: 'stripe_live_subscription', provider_status: sStatus, confidence: 'high',
        explanation: 'Stripe subscription is canceling at period end but still within paid period.' };
    }
    if (sStatus === 'canceled' || stripeSub.ended_at) {
      return { verified_status: 'verified_canceled', evidence_source: 'stripe_live_subscription', provider_status: sStatus, confidence: 'high',
        explanation: 'Stripe subscription is canceled/ended — no longer paying.' };
    }
    if (sStatus === 'active' && !sHasCurrentPeriod) {
      if (latestPaymentEvent) {
        const paymentAgeDays = (now.getTime() - latestPaymentEvent.getTime()) / (1000 * 60 * 60 * 24);
        if (paymentAgeDays <= 45) {
          return { verified_status: 'verified_current_paid', evidence_source: 'stripe_live_subscription_and_payment_event', provider_status: sStatus, confidence: 'medium',
            explanation: `Stripe subscription is active with stale period_end, but a recent payment (${Math.round(paymentAgeDays)} days ago) confirms the subscription is still paying.` };
        }
      }
      return { verified_status: 'conflicting_provider_and_local_state', evidence_source: 'stripe_live_subscription', provider_status: sStatus, confidence: 'low',
        explanation: 'Stripe says active but period_end is past and no recent payment — needs manual review.' };
    }
    return { verified_status: 'verified_expired', evidence_source: 'stripe_live_subscription', provider_status: sStatus, confidence: 'high',
      explanation: `Stripe subscription status "${sStatus}" — not active.` };
  }

  // ── 2. Latest payment event evidence ──
  if (latestPaymentEvent) {
    const paymentAgeDays = (now.getTime() - latestPaymentEvent.getTime()) / (1000 * 60 * 60 * 24);
    if (hasLocalCurrentPeriod && paymentAgeDays <= 45) {
      return { verified_status: 'locally_current_unverified', evidence_source: 'latest_payment_event', confidence: 'medium',
        explanation: `No live Stripe record, but local period is current and a payment ${Math.round(paymentAgeDays)} days ago supports current status.` };
    }
    if (!hasLocalCurrentPeriod && paymentAgeDays <= 45) {
      return { verified_status: 'conflicting_provider_and_local_state', evidence_source: 'latest_payment_event', confidence: 'low',
        explanation: `Local period expired but a recent payment ${Math.round(paymentAgeDays)} days ago suggests the subscription may still be active — provider verification needed.` };
    }
  }

  // ── 3-4. Local contract state fallback ──
  if (hasLocalCurrentPeriod) {
    return { verified_status: 'locally_current_unverified', evidence_source: 'local_contract_period', confidence: 'low',
      explanation: 'No live provider data — local contract period is current but unverified.' };
  }
  return { verified_status: 'locally_expired_unverified', evidence_source: 'local_contract_period', confidence: 'low',
    explanation: 'No live provider data and local period has expired — classified as expired based on local inference only.' };
}

/**
 * Categorize a stale (locally-expired) row after provider reconciliation.
 */
export function categorizeStaleRow(stripeSubFound, stripeStatus, provider, latestPaymentAt, now) {
  if (stripeSubFound && stripeStatus === 'active') return 'provider_confirms_still_active';
  if (stripeSubFound && (stripeStatus === 'canceled')) return 'provider_confirms_expired';
  if (!stripeSubFound && norm(provider) === 'stripe') {
    if (latestPaymentAt) {
      const ageDays = (now.getTime() - latestPaymentAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays <= 45) return 'provider_unavailable_recent_payment';
    }
    return 'provider_unavailable';
  }
  if (norm(provider) === 'apple') return 'apple_unverified';
  return 'unresolved';
}

/**
 * Classify an account as test/internal/admin vs production.
 */
export function classifyAccount(email, subId) {
  const e = norm(email), s = norm(subId);
  if (s.startsWith('test_') || /test_sub|test_\d+/.test(s)) return 'test_account';
  if (e.startsWith('admin@') || e.includes('admin@pipekeeperapp')) return 'internal_admin';
  if (['pipekeepertest', '@example.com', '@test.'].some((p) => e.includes(p))) return 'test_account';
  return 'production_customer';
}