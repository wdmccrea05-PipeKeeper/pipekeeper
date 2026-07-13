import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ═══════════════════════════════════════════════════════════════════════════════
// getUnmatchedPayments — admin-only. Returns every Stripe ledger payment event that
// is not linked to a canonical user, with confidence-scored match suggestions.
// Also returns provider coverage and reconciliation totals.
// ═══════════════════════════════════════════════════════════════════════════════

function norm(v) { return String(v ?? '').trim().toLowerCase(); }
function parseDate(value) { if (!value) return null; const d = new Date(String(value)); return Number.isNaN(d.getTime()) ? null : d; }

const REFUND_SLUGS = ['refund', 'refunded', 'chargeback', 'dispute', 'disputed', 'reversal', 'reversed'];
const PAYMENT_SUCCESS_SLUGS = ['invoice paid', 'invoice payment succeeded', 'charge succeeded', 'checkout session completed', 'checkout.session.completed', 'initial purchase', 'initial buy', 'initial_purchase', 'repurchase', 'product purchase', 'renewed', 'renewal'];
const LIFECYCLE_SLUGS = ['customer subscription created', 'customer subscription updated', 'subscribed'];
function eventSlug(t) { return norm(t).replace(/[._-]+/g, ' '); }
const FAILED_SLUGS = ['payment failed','invoice payment failed','charge failed','card declined','declined','payment canceled','canceled payment','void','voided'];
const PENDING_SLUGS = ['pending','incomplete','authorization only','authorized only','checkout expired','payment pending'];
const TRIAL_SLUGS = ['trial','trialing'];
function isPaymentEvent(e) {
  const type = eventSlug(e?.event_type);
  const status = eventSlug(e?.raw_status || e?.status);
  if (REFUND_SLUGS.some((s) => type.includes(s) || status.includes(s))) return false;
  if (PAYMENT_SUCCESS_SLUGS.some((s) => type.includes(s))) return true;
  if (LIFECYCLE_SLUGS.some((s) => type.includes(s)) && Number(e?.amount_cents || 0) > 0) return true;
  return false;
}
// A paid transaction requires amount > 0 — $0 invoices are promotional/trial, not payments.
function isPaidTransaction(e) {
  if (!isPaymentEvent(e)) return false;
  return Number(e?.amount_cents || 0) > 0;
}
function classifyZeroDollar(e) {
  if (!e) return null;
  const amount = Number(e.amount_cents || 0);
  if (amount !== 0) return null;
  const type = eventSlug(e.event_type), status = eventSlug(e.raw_status || e.status);
  if (REFUND_SLUGS.some((s) => type.includes(s) || status.includes(s))) return null;
  if (FAILED_SLUGS.some((s) => type.includes(s) || status.includes(s))) return null;
  if (PENDING_SLUGS.some((s) => type.includes(s) || status.includes(s))) return null;
  if (e.is_trial || TRIAL_SLUGS.some((s) => status.includes(s))) return 'free_trial_invoice';
  if (PAYMENT_SUCCESS_SLUGS.some((s) => type.includes(s))) return 'zero_dollar_promotion';
  if (LIFECYCLE_SLUGS.some((s) => type.includes(s))) return 'non_payment_invoice';
  return 'promotional_entitlement';
}

function matchUnmatchedPayment(payment, ctx) {
  const { usersById, usersByEmail, usersByCustomerId, usersBySubscriptionId } = ctx;
  const candidates = [];
  const metaUserId = norm(payment.metadata?.user_id || payment.metadata?.userId);
  if (metaUserId && usersById.has(metaUserId)) candidates.push({ user: usersById.get(metaUserId), method: 'exact_user_id', confidence: 1.0, deterministic: true });
  const custId = norm(payment.provider_customer_id);
  if (custId && usersByCustomerId?.has(custId)) candidates.push({ user: usersByCustomerId.get(custId), method: 'exact_provider_customer_mapping', confidence: 0.95, deterministic: true });
  const subId = norm(payment.provider_subscription_id);
  if (subId && usersBySubscriptionId?.has(subId)) candidates.push({ user: usersBySubscriptionId.get(subId), method: 'exact_subscription_mapping', confidence: 0.95, deterministic: true });
  const email = norm(payment.user_email || payment.email);
  if (email && usersByEmail.has(email)) candidates.push({ user: usersByEmail.get(email), method: 'exact_verified_email', confidence: 0.9, deterministic: true });
  const billingEmail = norm(payment.billing_email || payment.metadata?.billing_email);
  if (billingEmail && usersByEmail.has(billingEmail)) candidates.push({ user: usersByEmail.get(billingEmail), method: 'exact_billing_email', confidence: 0.85, deterministic: true });
  if (candidates.length === 0) return { matched: false, match_type: 'no_candidate', confidence: 0, deterministic: false, user: null, possible_matches: [] };
  const byUser = new Map();
  for (const c of candidates) { const k = String(c.user.id); if (!byUser.has(k) || byUser.get(k).confidence < c.confidence) byUser.set(k, c); }
  const unique = [...byUser.values()].sort((a, b) => b.confidence - a.confidence);
  if (unique.length > 1 && Math.abs(unique[0].confidence - unique[1].confidence) < 0.15) {
    return { matched: false, match_type: 'ambiguous_multiple_matches', confidence: unique[0].confidence, deterministic: false, user: null, possible_matches: unique.map((c) => ({ user_id: String(c.user.id), email: norm(c.user.email), method: c.method, confidence: c.confidence })) };
  }
  const best = unique[0];
  const detKeys = ['exact_user_id', 'exact_provider_customer_mapping', 'exact_subscription_mapping', 'exact_verified_email', 'exact_billing_email'];
  return { matched: detKeys.includes(best.method), match_type: best.method, confidence: best.confidence, deterministic: detKeys.includes(best.method), user: { user_id: String(best.user.id), email: norm(best.user.email) }, possible_matches: unique.map((c) => ({ user_id: String(c.user.id), email: norm(c.user.email), method: c.method, confidence: c.confidence })) };
}

const PAGE_SIZE = 100;
async function fetchAll(entity) { const out = []; let skip = 0; while (true) { let page = await entity.list(null, PAGE_SIZE, skip); if (typeof page === 'string') { try { page = JSON.parse(page); } catch { break; } } if (!Array.isArray(page) || page.length === 0) break; out.push(...page); if (page.length < PAGE_SIZE) break; skip += PAGE_SIZE; } return out; }
async function fetchAllSafe(entity) { try { return await fetchAll(entity); } catch { return []; } }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || me.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [rawUsers, rawSubEvents, rawSubscriptions, rawActiveContracts] = await Promise.all([
      fetchAllSafe(base44.asServiceRole.entities.User),
      fetchAllSafe(base44.asServiceRole.entities.SubscriptionEvent),
      fetchAllSafe(base44.asServiceRole.entities.Subscription),
      fetchAllSafe(base44.asServiceRole.entities.ActiveContract),
    ]);

    const users = rawUsers.filter((u) => !u.is_disabled && !u.merged_into_user_id);
    const usersById = new Map(users.map((u) => [String(u.id), u]));
    const usersByEmail = new Map(users.map((u) => [norm(u.email), u]));

    // Build customer-id and subscription-id → user maps from existing linked records
    const usersByCustomerId = new Map();
    const usersBySubscriptionId = new Map();
    for (const s of rawSubscriptions) {
      const identity = { user_id: s.user_id, email: norm(s.user_email || s.email) };
      let u = identity.user_id ? usersById.get(String(identity.user_id)) : null;
      if (!u && identity.email) u = usersByEmail.get(identity.email);
      if (u) {
        if (s.stripe_customer_id) usersByCustomerId.set(norm(s.stripe_customer_id), u);
        const sid = norm(s.provider_subscription_id || s.stripe_subscription_id);
        if (sid) usersBySubscriptionId.set(sid, u);
      }
    }
    for (const ac of rawActiveContracts) {
      let u = ac.user_id ? usersById.get(String(ac.user_id)) : null;
      if (!u && ac.user_email) u = usersByEmail.get(norm(ac.user_email));
      if (u) {
        if (ac.provider_customer_id) usersByCustomerId.set(norm(ac.provider_customer_id), u);
        if (ac.provider_subscription_id) usersBySubscriptionId.set(norm(ac.provider_subscription_id), u);
      }
    }
    const ctx = { usersById, usersByEmail, usersByCustomerId, usersBySubscriptionId };

    // Only genuine paid transactions (amount > 0) count as unmatched payments.
    // Zero-dollar promotional/trial invoices are returned separately and excluded from payment totals.
    const paidTransactionEvents = rawSubEvents.filter((e) => isPaidTransaction(e));
    const zeroDollarEvents = rawSubEvents.filter((e) => classifyZeroDollar(e) !== null);
    const lifecycleOnlyEvents = rawSubEvents.filter((e) => {
      const t = eventSlug(e?.event_type);
      return LIFECYCLE_SLUGS.some((s) => t.includes(s)) && !PAYMENT_SUCCESS_SLUGS.some((s) => t.includes(s));
    });

    const isUnmatched = (e) => {
      const uid = e.user_id;
      const email = norm(e.user_email || e.email);
      if (uid && usersById.has(String(uid))) return false;
      if (email && usersByEmail.has(email)) return false;
      return true;
    };

    const unmatchedPaid = paidTransactionEvents.filter(isUnmatched);
    const unmatchedZero = zeroDollarEvents.filter(isUnmatched);
    const unmatchedLifecycle = lifecycleOnlyEvents.filter(isUnmatched);

    const suggestions = unmatchedPaid.map((e) => {
      const match = matchUnmatchedPayment(e, ctx);
      let rawPayload = null;
      try { rawPayload = e.raw_payload ? JSON.parse(e.raw_payload) : null; } catch {}
      return {
        event_id: e.event_id || e.provider_event_id || null,
        provider: e.provider || 'stripe',
        stripe_customer_id: e.provider_customer_id || rawPayload?.customer || null,
        stripe_subscription_id: e.provider_subscription_id || rawPayload?.subscription || null,
        invoice_id: rawPayload?.invoice || e.provider_transaction_id || null,
        payment_intent_id: rawPayload?.payment_intent || null,
        charge_id: rawPayload?.charge || rawPayload?.id || null,
        customer_email: rawPayload?.customer_email || rawPayload?.receipt_email || null,
        billing_email: rawPayload?.billing_reason ? rawPayload?.customer_email : null,
        metadata_user_id: rawPayload?.metadata?.user_id || e.metadata?.user_id || null,
        metadata_email: rawPayload?.metadata?.email || e.metadata?.email || null,
        product_id: e.product_id || rawPayload?.lines?.data?.[0]?.price?.id || null,
        payment_date: parseDate(e.transaction_at || e.effective_at)?.toISOString() || null,
        amount: e.amount_cents ? Number(e.amount_cents) / 100 : null,
        amount_cents: e.amount_cents ?? null,
        currency: e.currency || 'usd',
        payment_status: e.payment_status || 'unknown',
        refund_status: e.is_refund ? 'refunded' : 'none',
        possible_matching_users: match.possible_matches,
        match_confidence: match.confidence,
        match_type: match.match_type,
        deterministic: match.deterministic,
        reconciliation_status: match.matched ? 'auto_linkable' : (match.match_type === 'ambiguous_multiple_matches' ? 'admin_approval_required' : 'no_candidate'),
        administrator_resolution: null,
      };
    });

    const zeroDollarDetail = unmatchedZero.map((e) => {
      let rawPayload = null;
      try { rawPayload = e.raw_payload ? JSON.parse(e.raw_payload) : null; } catch {}
      return {
        event_id: e.event_id || e.provider_event_id || null,
        provider: e.provider || 'stripe',
        stripe_customer_id: e.provider_customer_id || rawPayload?.customer || null,
        stripe_subscription_id: e.provider_subscription_id || rawPayload?.subscription || null,
        customer_email: rawPayload?.customer_email || rawPayload?.receipt_email || e.user_email || null,
        event_type: e.event_type || null,
        zero_dollar_classification: classifyZeroDollar(e),
        payment_date: parseDate(e.transaction_at || e.effective_at)?.toISOString() || null,
        is_trial: !!e.is_trial,
        reconciliation_status: 'non_payment_event',
      };
    });

    const autoLinkable = suggestions.filter((s) => s.deterministic).length;
    const adminApproval = suggestions.filter((s) => s.reconciliation_status === 'admin_approval_required').length;
    const noCandidate = suggestions.filter((s) => s.reconciliation_status === 'no_candidate').length;

    return Response.json({
      meta: { generatedAt: new Date().toISOString(), totalUnmatched: suggestions.length },
      unmatchedPayments: suggestions,
      unmatchedZeroDollarEvents: zeroDollarDetail,
      summary: {
        unmatched_paid_transactions: suggestions.length,
        unmatched_zero_dollar_events: zeroDollarDetail.length,
        unmatched_lifecycle_events: unmatchedLifecycle.length,
        totalUnmatched: suggestions.length, // legacy alias = paid transactions only
        autoLinkable,
        adminApprovalRequired: adminApproval,
        noCandidate,
      },
    });
  } catch (error) {
    console.error('[getUnmatchedPayments] fatal:', error);
    return Response.json({ error: error?.message || 'Failed to load unmatched payments' }, { status: 500 });
  }
});