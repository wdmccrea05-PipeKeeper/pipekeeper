import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ═══════════════════════════════════════════════════════════════════════════════
// exportReconciliationCsv — admin-only. Exports reconciliation totals, unmatched
// payments, and first-paid evidence as CSV. Enforces admin authorization, excludes
// secrets/tokens/raw payloads/personal data, and labels confirmed vs inferred.
// Uses the SAME filtered totals as the dashboard (paid transactions only; $0 events
// excluded from payment totals).
// ═══════════════════════════════════════════════════════════════════════════════

function norm(v) { return String(v ?? '').trim().toLowerCase(); }
function parseDate(value) { if (!value) return null; const d = new Date(String(value)); return Number.isNaN(d.getTime()) ? null : d; }

const REFUND_SLUGS = ['refund', 'refunded', 'chargeback', 'dispute', 'disputed', 'reversal', 'reversed'];
const FAILED_SLUGS = ['payment failed','invoice payment failed','charge failed','card declined','declined','payment canceled','canceled payment','void','voided'];
const PENDING_SLUGS = ['pending','incomplete','authorization only','authorized only','checkout expired','payment pending'];
const TRIAL_SLUGS = ['trial','trialing'];
const PAYMENT_SUCCESS_SLUGS = ['invoice paid','invoice payment succeeded','charge succeeded','checkout session completed','checkout.session.completed','initial purchase','initial buy','initial_purchase','repurchase','product purchase','renewed','renewal'];
const LIFECYCLE_SLUGS = ['customer subscription created','customer subscription updated','subscribed'];
function eventSlug(t) { return norm(t).replace(/[._-]+/g, ' '); }
function isPaymentEvent(e) {
  const type = eventSlug(e?.event_type);
  const status = eventSlug(e?.raw_status || e?.status);
  if (REFUND_SLUGS.some((s) => type.includes(s) || status.includes(s))) return false;
  if (PAYMENT_SUCCESS_SLUGS.some((s) => type.includes(s))) return true;
  if (LIFECYCLE_SLUGS.some((s) => type.includes(s)) && Number(e?.amount_cents || 0) > 0) return true;
  return false;
}
function isPaidTransaction(e) { return isPaymentEvent(e) && Number(e?.amount_cents || 0) > 0; }
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

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const PAGE_SIZE = 100;
async function fetchAll(entity) { const out = []; let skip = 0; while (true) { let page = await entity.list(null, PAGE_SIZE, skip); if (typeof page === 'string') { try { page = JSON.parse(page); } catch { break; } } if (!Array.isArray(page) || page.length === 0) break; out.push(...page); if (page.length < PAGE_SIZE) break; skip += PAGE_SIZE; } return out; }
async function fetchAllSafe(entity) { try { return await fetchAll(entity); } catch { return []; } }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || me.role !== 'admin') return Response.json({ error: 'Forbidden — administrator required for CSV export' }, { status: 403 });

    const [rawUsers, rawSubEvents] = await Promise.all([
      fetchAllSafe(base44.asServiceRole.entities.User),
      fetchAllSafe(base44.asServiceRole.entities.SubscriptionEvent),
    ]);

    const regUsers = rawUsers.filter((u) => !u.is_disabled && !u.merged_into_user_id);
    const usersById = new Map(regUsers.map((u) => [String(u.id), u]));
    const usersByEmail = new Map(regUsers.map((u) => [norm(u.email), u]));

    const isUnmatched = (e) => {
      const uid = e.user_id;
      const email = norm(e.user_email || e.email);
      if (uid && usersById.has(String(uid))) return false;
      if (email && usersByEmail.has(email)) return false;
      return true;
    };

    const paidTx = rawSubEvents.filter((e) => isPaidTransaction(e));
    const unmatchedPaid = paidTx.filter(isUnmatched);
    const zeroDollar = rawSubEvents.filter((e) => classifyZeroDollar(e) !== null);
    const unmatchedZero = zeroDollar.filter(isUnmatched);

    const sections = [];

    // Section 1: Reconciliation totals (same filtered totals as dashboard)
    sections.push('section,metric,value');
    sections.push(`totals,unmatched_paid_transactions,${unmatchedPaid.length}`);
    sections.push(`totals,unmatched_zero_dollar_events,${unmatchedZero.length}`);
    sections.push(`totals,matched_paid_transactions,${paidTx.length - unmatchedPaid.length}`);
    sections.push(`totals,total_paid_transactions,${paidTx.length}`);
    sections.push(`totals,total_zero_dollar_events,${zeroDollar.length}`);
    sections.push(`totals,total_events,${rawSubEvents.length}`);
    sections.push(`totals,exported_by,${me.email}`);
    sections.push(`totals,exported_at,${new Date().toISOString()}`);
    sections.push('');

    // Section 2: Unmatched paid transactions (NO raw payloads, NO tokens, minimal PII)
    // Excludes secrets, raw webhook payloads, and unnecessary personal data.
    sections.push('event_id,provider,provider_customer_id,provider_subscription_id,provider_transaction_id,user_email,product_id,payment_date,amount_cents,currency,payment_status,reconciliation_status');
    for (const e of unmatchedPaid) {
      sections.push([
        csvEscape(e.event_id || e.provider_event_id),
        csvEscape(e.provider || 'stripe'),
        csvEscape(e.provider_customer_id),
        csvEscape(e.provider_subscription_id),
        csvEscape(e.provider_transaction_id),
        csvEscape(e.user_email || e.email), // email needed for reconciliation; no other PII
        csvEscape(e.product_id),
        csvEscape(parseDate(e.transaction_at || e.effective_at)?.toISOString()),
        csvEscape(e.amount_cents),
        csvEscape(e.currency || 'usd'),
        csvEscape(e.payment_status),
        csvEscape('unmatched_provider_no_user'),
      ].join(','));
    }
    sections.push('');

    // Section 3: Unmatched zero-dollar events (lifecycle visibility, excluded from payment totals)
    sections.push('event_id,provider,provider_customer_id,user_email,event_type,zero_dollar_classification,payment_date,is_trial');
    for (const e of unmatchedZero) {
      sections.push([
        csvEscape(e.event_id || e.provider_event_id),
        csvEscape(e.provider || 'stripe'),
        csvEscape(e.provider_customer_id),
        csvEscape(e.user_email || e.email),
        csvEscape(e.event_type),
        csvEscape(classifyZeroDollar(e)),
        csvEscape(parseDate(e.transaction_at || e.effective_at)?.toISOString()),
        csvEscape(e.is_trial ? 'true' : 'false'),
      ].join(','));
    }
    sections.push('');

    // Section 4: First-paid evidence — confirmed vs inferred, labeled clearly
    sections.push('user_id,email,first_paid_at,confidence_category,evidence_label');
    const userFirstPaid = new Map();
    for (const e of paidTx) {
      const uid = e.user_id && usersById.has(String(e.user_id)) ? String(e.user_id) : (e.user_email && usersByEmail.has(norm(e.user_email)) ? usersByEmail.get(norm(e.user_email)).id : null);
      if (!uid) continue;
      const d = parseDate(e.transaction_at || e.effective_at);
      if (!d) continue;
      if (!userFirstPaid.has(String(uid)) || d < userFirstPaid.get(String(uid)).date) userFirstPaid.set(String(uid), { date: d, category: 'confirmed_payment_event' });
    }
    for (const [uid, info] of userFirstPaid) {
      const u = usersById.get(uid);
      const label = info.category === 'confirmed_payment_event' ? 'confirmed' : 'inferred';
      sections.push([
        csvEscape(uid),
        csvEscape(u?.email),
        csvEscape(info.date.toISOString()),
        csvEscape(info.category),
        csvEscape(label),
      ].join(','));
    }

    const csv = sections.join('\n');
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="reconciliation-export.csv"',
        'X-Admin-Only': 'true',
        'X-No-Secrets': 'true',
        'X-No-Raw-Payloads': 'true',
      },
    });
  } catch (error) {
    console.error('[exportReconciliationCsv] fatal:', error);
    return Response.json({ error: error?.message || 'CSV export failed' }, { status: 500 });
  }
});