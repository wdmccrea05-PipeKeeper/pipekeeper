import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ═══════════════════════════════════════════════════════════════════════════════
// reconcileUnmatchedPayment — admin-only. Links an unmatched Stripe payment event
// to a canonical user (deterministic or admin-approved). Preserves a full audit
// trail in the SubscriptionEvent ledger and updates the event's user_id.
// Returns before/after metric effects.
// ═══════════════════════════════════════════════════════════════════════════════

function norm(v) { return String(v ?? '').trim().toLowerCase(); }
function parseDate(value) { if (!value) return null; const d = new Date(String(value)); return Number.isNaN(d.getTime()) ? null : d; }

const REFUND_SLUGS = ['refund', 'refunded', 'chargeback', 'dispute', 'disputed', 'reversal', 'reversed'];
const PAYMENT_SUCCESS_SLUGS = ['invoice paid', 'invoice payment succeeded', 'charge succeeded', 'checkout session completed', 'checkout.session.completed', 'initial purchase', 'initial buy', 'initial_purchase', 'repurchase', 'product purchase', 'renewed', 'renewal'];
const LIFECYCLE_SLUGS = ['customer subscription created', 'customer subscription updated', 'subscribed'];
function eventSlug(t) { return norm(t).replace(/[._-]+/g, ' '); }
function isPaymentEvent(e) {
  const type = eventSlug(e?.event_type);
  const status = eventSlug(e?.raw_status || e?.status);
  if (REFUND_SLUGS.some((s) => type.includes(s) || status.includes(s))) return false;
  if (PAYMENT_SUCCESS_SLUGS.some((s) => type.includes(s))) return true;
  if (LIFECYCLE_SLUGS.some((s) => type.includes(s)) && Number(e?.amount_cents || 0) > 0) return true;
  return false;
}

const PAGE_SIZE = 100;
async function fetchAll(entity) { const out = []; let skip = 0; while (true) { let page = await entity.list(null, PAGE_SIZE, skip); if (typeof page === 'string') { try { page = JSON.parse(page); } catch { break; } } if (!Array.isArray(page) || page.length === 0) break; out.push(...page); if (page.length < PAGE_SIZE) break; skip += PAGE_SIZE; } return out; }
async function fetchAllSafe(entity) { try { return await fetchAll(entity); } catch { return []; } }

// Compute a minimal before/after metric snapshot so the admin sees the effect.
async function computeAcquisitionSnapshot(base44) {
  const [users, subEvents] = await Promise.all([
    fetchAllSafe(base44.asServiceRole.entities.User),
    fetchAllSafe(base44.asServiceRole.entities.SubscriptionEvent),
  ]);
  const regUsers = users.filter((u) => !u.is_disabled && !u.merged_into_user_id);
  const usersById = new Map(regUsers.map((u) => [String(u.id), u]));
  const usersByEmail = new Map(regUsers.map((u) => [norm(u.email), u]));
  const payments = subEvents.filter((e) => isPaymentEvent(e));
  let confirmedFirstPaid = 0;
  const userFirstPaid = new Map();
  for (const e of payments) {
    const uid = e.user_id && usersById.has(String(e.user_id)) ? String(e.user_id) : (e.user_email && usersByEmail.has(norm(e.user_email)) ? usersByEmail.get(norm(e.user_email)).id : null);
    if (!uid) continue;
    const d = parseDate(e.transaction_at || e.effective_at);
    if (!d) continue;
    if (!userFirstPaid.has(String(uid)) || d < userFirstPaid.get(String(uid))) userFirstPaid.set(String(uid), d);
  }
  confirmedFirstPaid = userFirstPaid.size;
  const unmatched = payments.filter((e) => {
    const uid = e.user_id;
    const email = norm(e.user_email || e.email);
    if (uid && usersById.has(String(uid))) return false;
    if (email && usersByEmail.has(email)) return false;
    return true;
  }).length;
  return { confirmedFirstPaidUsers: confirmedFirstPaid, unmatchedPayments: unmatched };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || me.role !== 'admin') return Response.json({ error: 'Forbidden — administrator required' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch {}
    const { event_id, provider_event_id, target_user_id, confidence, match_type, notes, action } = body;
    if (!event_id && !provider_event_id) return Response.json({ error: 'event_id or provider_event_id is required' }, { status: 400 });
    if (!target_user_id) return Response.json({ error: 'target_user_id is required' }, { status: 400 });

    // Verify the target user is a real canonical user
    const users = await fetchAllSafe(base44.asServiceRole.entities.User);
    const regUsers = users.filter((u) => !u.is_disabled && !u.merged_into_user_id);
    const usersById = new Map(regUsers.map((u) => [String(u.id), u]));
    const targetUser = usersById.get(String(target_user_id));
    if (!targetUser) return Response.json({ error: 'target_user_id does not resolve to a canonical registered user' }, { status: 400 });

    // Find the SubscriptionEvent
    const subEvents = await fetchAllSafe(base44.asServiceRole.entities.SubscriptionEvent);
    const target = subEvents.find((e) => e.event_id === event_id || e.provider_event_id === provider_event_id || e.id === event_id);
    if (!target) return Response.json({ error: 'SubscriptionEvent not found' }, { status: 404 });
    if (!isPaymentEvent(target)) return Response.json({ error: 'Event is not a successful payment event' }, { status: 400 });

    // Before snapshot
    const before = await computeAcquisitionSnapshot(base44);

    const oldState = {
      user_id: target.user_id || null,
      user_email: target.user_email || null,
      reconciliation_status: target.reconciliation_status || 'unmatched_provider_no_user',
      processed: !!target.processed,
    };

    // Apply the link — update the event's user_id and email
    const updated = await base44.asServiceRole.entities.SubscriptionEvent.update(target.id, {
      user_id: String(target_user_id),
      user_email: norm(targetUser.email),
      normalized_email: norm(targetUser.email),
      reconciliation_status: 'matched',
      reconciliation_notes: `Reconciled by admin ${me.email} via ${match_type || 'manual'} (confidence ${confidence ?? 'n/a'}). ${notes || ''}`.trim(),
      processed: false, // re-process into derived state
    });

    // Audit entry (persisted as a manual SubscriptionEvent for the audit trail)
    const auditEntry = await base44.asServiceRole.entities.SubscriptionEvent.create({
      provider: target.provider || 'manual',
      event_type: 'manual_reconciliation',
      normalized_event_type: 'manual_adjustment',
      user_id: String(target_user_id),
      user_email: norm(targetUser.email),
      normalized_email: norm(targetUser.email),
      provider_subscription_id: target.provider_subscription_id || null,
      provider_transaction_id: target.provider_transaction_id || null,
      source_system: 'manual',
      source_confidence: 'confirmed_successful_payment',
      is_manual_adjustment: true,
      is_successful_payment: false,
      raw_event_reference: `reconciliation:${target.event_id || target.id}`,
      reconciliation_status: 'resolved',
      reconciliation_notes: JSON.stringify({
        action: action || 'link_payment',
        old_state: oldState,
        proposed_match: { user_id: String(target_user_id), match_type: match_type || 'manual', confidence: confidence ?? null },
        final_match: { user_id: String(target_user_id), email: norm(targetUser.email) },
        confidence: confidence ?? null,
        administrator: me.email,
        timestamp: new Date().toISOString(),
        notes: notes || '',
      }),
      ingested_at: new Date().toISOString(),
    });

    // After snapshot
    const after = await computeAcquisitionSnapshot(base44);

    return Response.json({
      status: 'ok',
      action: action || 'link_payment',
      event_id: target.event_id || target.id,
      target_user_id: String(target_user_id),
      target_email: norm(targetUser.email),
      audit_event_id: auditEntry?.id || null,
      old_state: oldState,
      final_match: { user_id: String(target_user_id), email: norm(targetUser.email) },
      confidence: confidence ?? null,
      match_type: match_type || 'manual',
      administrator: me.email,
      timestamp: new Date().toISOString(),
      notes: notes || '',
      metric_effects: {
        before: before,
        after: after,
        delta: {
          confirmedFirstPaidUsers: after.confirmedFirstPaidUsers - before.confirmedFirstPaidUsers,
          unmatchedPayments: after.unmatchedPayments - before.unmatchedPayments,
        },
      },
    });
  } catch (error) {
    console.error('[reconcileUnmatchedPayment] fatal:', error);
    return Response.json({ error: error?.message || 'Reconciliation failed' }, { status: 500 });
  }
});