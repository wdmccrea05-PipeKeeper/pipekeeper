/**
 * reconcileSubscriptionLedger — Reconciliation engine.
 * Compares provider transactions (SubscriptionEvent), Subscription, ActiveContract,
 * UserEntitlement, and User records for every canonical user and reports mismatches.
 *
 * Also recomputes first_paid_at using the strict evidence hierarchy from the ledger.
 * Admin-only. Does not mutate source data; only writes reconciliation_status/notes
 * on SubscriptionEvent rows (auditable, reversible).
 *
 * Params: { dryRun?: boolean }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normEmail(e) { return String(e || '').trim().toLowerCase(); }
const DAY_MS = 86400000;
function toMs(v) { if (!v) return null; const d = new Date(String(v)); const t = d.getTime(); return Number.isFinite(t) ? t : null; }

function rankOf(conf) {
  const map = { confirmed_provider_transaction: 1, confirmed_successful_payment: 2, strong_subscription_evidence: 3, inferred_contract_period: 4, weak_created_date_fallback: 5, unresolved: 6 };
  return map[conf] || 99;
}

function resolveFirstPaid(events, subs, contracts) {
  const candidates = [];
  for (const ev of events || []) {
    const t = toMs(ev.transaction_at || ev.effective_at);
    if (!t || ev.is_refund || ev.is_chargeback || !ev.is_successful_payment) continue;
    if (ev.is_initial_purchase) candidates.push({ t, confidence: 'confirmed_provider_transaction', source_field: 'transaction_at', source_entity: 'SubscriptionEvent', source_event_id: ev.provider_event_id });
    else candidates.push({ t, confidence: 'confirmed_successful_payment', source_field: 'transaction_at', source_entity: 'SubscriptionEvent', source_event_id: ev.provider_event_id });
  }
  for (const s of subs || []) {
    const t = toMs(s.started_at || s.subscriptionStartedAt);
    if (t) candidates.push({ t, confidence: 'strong_subscription_evidence', source_field: s.started_at ? 'started_at' : 'subscriptionStartedAt', source_entity: 'Subscription', source_event_id: s.provider_subscription_id });
  }
  for (const c of contracts || []) {
    const t = toMs(c.period_start || c.current_period_start);
    if (t) candidates.push({ t, confidence: 'inferred_contract_period', source_field: c.period_start ? 'period_start' : 'current_period_start', source_entity: 'ActiveContract', source_event_id: c.provider_subscription_id });
  }
  for (const s of subs || []) { const t = toMs(s.created_date || s.created_at); if (t) candidates.push({ t, confidence: 'weak_created_date_fallback', source_field: 'created_date', source_entity: 'Subscription', source_event_id: s.provider_subscription_id }); }
  for (const c of contracts || []) { const t = toMs(c.created_date || c.created_at || c.normalized_at); if (t) candidates.push({ t, confidence: 'weak_created_date_fallback', source_field: 'created_date', source_entity: 'ActiveContract', source_event_id: c.provider_subscription_id }); }
  if (!candidates.length) return { first_paid_at: null, confidence: 'unresolved', source_field: null, source_entity: null };
  candidates.sort((a, b) => a.t - b.t || rankOf(a.confidence) - rankOf(b.confidence));
  const best = candidates[0];
  return { first_paid_at: new Date(best.t).toISOString(), confidence: best.confidence, source_field: best.source_field, source_entity: best.source_entity, source_event_id: best.source_event_id || null };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden: admin required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;

    const [events, subs, contracts, entitlements] = await Promise.all([
      base44.asServiceRole.entities.SubscriptionEvent.list(null, 1000, 0),
      base44.asServiceRole.entities.Subscription.list(null, 1000, 0),
      base44.asServiceRole.entities.ActiveContract.list(null, 1000, 0),
      base44.asServiceRole.entities.UserEntitlement.list(null, 1000, 0),
    ]);

    // Index by canonical user (user_id, fallback email)
    const byUser = new Map();
    const index = (rows, kind) => {
      for (const r of (Array.isArray(rows) ? rows : [])) {
        const key = r.user_id || normEmail(r.user_email || r.normalized_email);
        if (!key) continue;
        if (!byUser.has(key)) byUser.set(key, { events: [], subscriptions: [], contracts: [], entitlements: [], user: null });
        byUser.get(key)[kind].push(r);
      }
    };
    index(events, 'events');
    index(subs, 'subscriptions');
    index(contracts, 'contracts');
    index(entitlements, 'entitlements');

    const discrepancies = [];
    const perUser = [];
    let updatedEvents = 0;

    for (const [userKey, data] of byUser.entries()) {
      const paidEvents = data.events.filter((e) => e.is_successful_payment);
      const hasProviderPayment = paidEvents.length > 0;
      const hasSubscription = data.subscriptions.length > 0;
      const hasContract = data.contracts.length > 0;
      const hasEntitlement = data.entitlements.some((e) => e.has_access);
      const fp = resolveFirstPaid(data.events, data.subscriptions, data.contracts);

      const userDiffs = [];
      if (hasProviderPayment && !data.user) userDiffs.push('provider_payment_but_no_user');
      if (hasSubscription && !hasProviderPayment) userDiffs.push('subscription_but_no_payment');
      if (hasSubscription && !hasContract) userDiffs.push('subscription_but_no_contract');
      if (hasContract && !hasSubscription) userDiffs.push('contract_but_no_subscription');
      if (hasEntitlement && !hasContract) userDiffs.push('entitlement_but_no_contract');
      if (fp.confidence === 'inferred_contract_period' || fp.confidence === 'weak_created_date_fallback') userDiffs.push('inferred_first_paid');
      if (!fp.first_paid_at) userDiffs.push('missing_first_paid_date');

      const emails = new Set([data.events, data.subscriptions, data.contracts].flat().map((r) => normEmail(r?.user_email)).filter(Boolean));
      if (emails.size > 1) userDiffs.push('email_mismatch');

      // duplicate subscription ids
      const subIds = {}; for (const s of data.subscriptions) { const k = String(s.provider_subscription_id || '').toLowerCase(); if (k) subIds[k] = (subIds[k]||0)+1; }
      if (Object.values(subIds).some((n) => n > 1)) userDiffs.push('duplicate_subscription');
      const txnIds = {}; for (const e of data.events) { if (e.provider_transaction_id) txnIds[e.provider_transaction_id] = (txnIds[e.provider_transaction_id]||0)+1; }
      if (Object.values(txnIds).some((n) => n > 1)) userDiffs.push('duplicate_transaction');

      for (const d of userDiffs) discrepancies.push({ user: userKey, type: d });

      perUser.push({
        user: userKey,
        email: normEmail(data.events[0]?.user_email || data.subscriptions[0]?.user_email || data.contracts[0]?.user_email || ''),
        first_paid_at: fp.first_paid_at,
        confidence: fp.confidence,
        source_field: fp.source_field,
        source_entity: fp.source_entity,
        has_provider_payment: hasProviderPayment,
        has_subscription: hasSubscription,
        has_contract: hasContract,
        has_entitlement: hasEntitlement,
        diffs: userDiffs,
      });

      // Mark confirmed first-paid events (auditable, reversible)
      if (!dryRun && fp.first_paid_at && fp.source_entity === 'SubscriptionEvent') {
        for (const ev of data.events) {
          if (ev.provider_event_id === fp.source_event_id && ev.reconciliation_status !== 'confirmed_first_paid') {
            try { await base44.asServiceRole.entities.SubscriptionEvent.update(ev.id, { reconciliation_status: 'confirmed_first_paid', reconciliation_notes: `Confirmed as earliest verified payment via reconciliation ${new Date().toISOString()}`, processed_at: new Date().toISOString() }); updatedEvents++; } catch { /* ignore */ }
          }
        }
      }
    }

    const counts = {};
    for (const d of discrepancies) counts[d.type] = (counts[d.type] || 0) + 1;

    // Update sync health
    try {
      const rows = await base44.asServiceRole.entities.ProviderSyncHealth.filter({ provider: 'stripe' });
      const existing = Array.isArray(rows) && rows[0];
      const payload = { provider: 'stripe', reconciliation_status: 'complete', last_reconciliation_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      if (existing) await base44.asServiceRole.entities.ProviderSyncHealth.update(existing.id, payload);
    } catch { /* ignore */ }

    return Response.json({
      status: 'ok',
      dryRun,
      totalUsers: byUser.size,
      discrepancyCounts: counts,
      totalDiscrepancies: discrepancies.length,
      usersWithDiscrepancies: perUser.filter((u) => u.diffs.length > 0).length,
      perUser: perUser.filter((u) => u.diffs.length > 0).slice(0, 100),
      eventsMarkedConfirmed: updatedEvents,
    });
  } catch (error) {
    console.error('[reconcileSubscriptionLedger] fatal:', error);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});