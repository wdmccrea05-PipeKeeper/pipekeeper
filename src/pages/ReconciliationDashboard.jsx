import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import OrphanedEntitlementCard from '@/components/reconciliation/OrphanedEntitlementCard';
import { getCanonicalReconciliationReport } from '@/lib/analytics/canonicalAnalyticsService';

export default function ReconciliationDashboard() {
  const [report, setReport] = useState(null);
  const [unmatched, setUnmatched] = useState(null);
  const [orphanedEntitlements, setOrphanedEntitlements] = useState([]);
  const [loadingReport, setLoadingReport] = useState(true);
  const [loadingUnmatched, setLoadingUnmatched] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(null);
  const [resolveResult, setResolveResult] = useState(null);
  const [manualUserId, setManualUserId] = useState({});
  const [resolveNotes, setResolveNotes] = useState({});

  const loadOrphanedEntitlements = async () => {
    try {
      const r = await base44.entities.UserEntitlement.filter({ has_access: true, contract_count: 0 }, '-created_date', 50);
      const rows = (r && Array.isArray(r)) ? r : (r?.data ?? []);
      setOrphanedEntitlements(Array.isArray(rows) ? rows : []);
    } catch {
      setOrphanedEntitlements([]);
    }
  };

  const loadCanonical = async () => {
    setLoadingReport(true);
    setLoadingUnmatched(true);
    try {
      const r = await getCanonicalReconciliationReport({ dateRange: '90d' });
      setReport(r?.report ?? null);
      setUnmatched(r?.unmatched ?? null);
    } catch (e) {
      setError(e?.message || 'Failed to load reconciliation analytics');
    } finally {
      setLoadingReport(false);
      setLoadingUnmatched(false);
    }
  };

  useEffect(() => { loadCanonical(); loadOrphanedEntitlements(); }, []);

  const handleOrphanResolved = () => {
    loadCanonical();
    loadOrphanedEntitlements();
  };

  const handleResolve = async (eventId, targetUserId, matchType, confidence) => {
    setResolving(eventId);
    setResolveResult(null);
    try {
      const r = await base44.functions.invoke('reconcileUnmatchedPayment', {
        event_id: eventId,
        target_user_id: targetUserId,
        match_type: matchType,
        confidence,
        notes: resolveNotes[eventId] || '',
        action: 'link_payment',
      });
      setResolveResult({ eventId, ...(r?.data ?? r) });
      // reload both
      loadCanonical();
    } catch (e) {
      setResolveResult({ eventId, error: e?.message || 'Reconciliation failed' });
    } finally { setResolving(null); }
  };

  const totals = report?.reconciliationTotals || {};
  const reliability = report?.reliability || {};
  const refund = report?.refundMetrics || {};
  const coverage = report?.providerCoverage || {};
  const history = report?.historyCompleteness || {};
  const stripeVerify = report?.stripePayingUserVerification || {};
  const unmatchedList = unmatched?.unmatchedPayments || [];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8 text-[#E0D8C8]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F1E7]">Reconciliation Dashboard</h1>
          <p className="text-xs text-[#E0D8C8]/50 mt-1">Administrator-only · canonical ledger reconciliation</p>
        </div>
        <button onClick={() => { loadCanonical(); }} className="px-3 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20 text-sm">
          Refresh
        </button>
      </div>

      {(loadingReport || loadingUnmatched) && !report && <p className="text-[#E0D8C8]/60">Loading…</p>}
      {error && <div className="rounded-xl border border-red-800/40 bg-red-900/10 p-4 text-red-300 text-sm">{error}</div>}

      {/* Reliability status */}
      {report && (
        <Section title="Reliability Status">
          <div className={`rounded-xl border p-4 ${
            reliability.status === 'verified' ? 'border-emerald-700/40 bg-emerald-900/10'
            : reliability.status === 'unreliable' ? 'border-red-700/40 bg-red-900/10'
            : reliability.status === 'inference_based' ? 'border-blue-700/40 bg-blue-900/10'
            : 'border-yellow-700/40 bg-yellow-900/10'
          }`}>
            <p className={`text-lg font-semibold ${
              reliability.status === 'verified' ? 'text-emerald-300'
              : reliability.status === 'unreliable' ? 'text-red-300'
              : reliability.status === 'inference_based' ? 'text-blue-300'
              : 'text-yellow-300'
            }`}>
              {reliability.status === 'verified' ? '✓ Verified'
              : reliability.status === 'unreliable' ? '✗ Unreliable'
              : reliability.status === 'inference_based' ? '◈ Inference-based'
              : '⚠ Partially Verified'}
            </p>
            <p className="text-xs text-[#E0D8C8]/50 mt-1">Status is determined from material issues, not raw exception counts. Zero-dollar promotional events never lower reliability. Provider warnings appear only for providers relevant to CollectionKeeper.</p>
            {reliability.reasons?.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {reliability.reasons.map((r, i) => <li key={i} className="text-[#E0D8C8]/80">• {r}</li>)}
              </ul>
            )}
            {(totals.orphaned_entitlements ?? 0) > 0 && (
              <p className="mt-2 text-sm text-yellow-300">⚠ {totals.orphaned_entitlements} entitlement{(totals.orphaned_entitlements ?? 0) === 1 ? ' remains' : 's remain'} unclassified — an administrator must classify it as a valid manual grant, promotional grant, referral grant, legacy migration, linked subscription, or stale and revoked. It is not a payment mismatch.</p>
            )}
          </div>
        </Section>
      )}

      {/* Reconciliation totals */}
      {report && (
        <Section title="Reconciliation Totals">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card title="Total Provider Events" value={totals.total_provider_events ?? 0} />
            <Card title="Matched Events" value={totals.matched_events ?? 0} />
            <Card title="Unmatched Events" value={totals.unmatched_events ?? 0} warn={(totals.unmatched_events ?? 0) > 0} />
            <Card title="Unmatched Payments" value={totals.unmatched_payments ?? 0} warn={(totals.unmatched_payments ?? 0) > 0} />
            <Card title="Matched Subscriptions" value={totals.matched_subscriptions ?? 0} />
            <Card title="Unmatched Subscriptions" value={totals.unmatched_subscriptions ?? 0} warn={(totals.unmatched_subscriptions ?? 0) > 0} />
            <Card title="Duplicate Events Rejected" value={totals.duplicate_events_rejected ?? 0} />
            <Card title="Confirmed First Payments" value={totals.users_with_confirmed_first_payments ?? 0} highlight />
            <Card title="Inferred First Payments" value={totals.users_with_inferred_first_payments ?? 0} warn={(totals.users_with_inferred_first_payments ?? 0) > 0} />
            <Card title="Unresolved First Payments" value={totals.users_with_unresolved_first_payments ?? 0} warn={(totals.users_with_unresolved_first_payments ?? 0) > 0} />
            <Card title="Orphaned Entitlements" value={totals.orphaned_entitlements ?? 0} warn={(totals.orphaned_entitlements ?? 0) > 0} />
            <Card title="Last Provider Sync" value={totals.last_provider_sync ? new Date(totals.last_provider_sync).toLocaleString() : '—'} />
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={() => exportCsvBackend()} className="px-3 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20 text-sm">Export CSV (admin-enforced)</button>
          </div>
        </Section>
      )}

      {/* Provider coverage */}
      {report && (
        <Section title="Provider Coverage (contextual)">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card title="Stripe" value={coverage.stripe || '—'} warn={coverage.stripe === 'not_configured'} />
            <Card title="Apple App Store" value={coverage.apple || '—'} warn={coverage.apple === 'not_configured'} />
            <Card title="Google Play" value={coverage.google || '—'} warn={coverage.google === 'not_configured'} />
            <Card title="Manual Billing" value={coverage.manual || '—'} />
          </div>
          <p className="text-xs text-[#E0D8C8]/40 mt-2">Providers not part of CollectionKeeper's flow are marked <span className="text-[#D4A574]">not_applicable</span> and do not lower reliability.</p>
          {coverage.warnings?.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-[#E0D8C8]/70">
              {coverage.warnings.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          )}
        </Section>
      )}

      {/* History completeness */}
      {report && (
        <Section title="Historical Coverage">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card title="History Complete From" value={history.history_complete_from ? new Date(history.history_complete_from).toLocaleDateString() : '—'} />
            <Card title="Backfill Status" value={history.backfill_status || '—'} />
            <Card title="Completeness" value={history.completeness_status || '—'} warn={history.completeness_status === 'insufficient'} />
            <Card title="First-Paid May Predate History" value={history.first_paid_may_predate_history ?? 0} warn={(history.first_paid_may_predate_history ?? 0) > 0} />
            <Card title="Confirmed First-Ever Paid" value={history.confirmed_first_ever_paid_users ?? 0} highlight />
            <Card title="Confirmed Within Available History" value={history.confirmed_within_available_history ?? 0} warn={(history.confirmed_within_available_history ?? 0) > 0} />
            <Card title="Inferred First-Paid" value={history.inferred_first_paid_users ?? 0} warn={(history.inferred_first_paid_users ?? 0) > 0} />
            <Card title="Unresolved First-Paid" value={history.unresolved_first_paid_users ?? 0} warn={(history.unresolved_first_paid_users ?? 0) > 0} />
          </div>
        </Section>
      )}

      {/* Refund metrics */}
      {report && (
        <Section title="Refund Metrics (linked to original payments)">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card title="Refunds Occurred In Period" value={refund.refunds_occurred_in_period ?? 0} />
            <Card title="Refund Amount In Period" value={`$${(refund.refund_amount_occurred_in_period ?? 0).toFixed(2)}`} />
            <Card title="First-Purchase Refunds (in period)" value={refund.first_purchase_refunds_for_acquisitions_in_period ?? 0} />
            <Card title="Renewal Refunds In Period" value={refund.renewal_refunds_in_period ?? 0} />
            <Card title="Refunds Of Prior-Period Purchases" value={refund.refunds_of_purchases_from_prior_periods ?? 0} />
            <Card title="Partially Refunded" value={refund.partially_refunded_transactions ?? 0} />
            <Card title="Fully Refunded" value={refund.fully_refunded_transactions ?? 0} />
            <Card title="Chargebacks" value={refund.chargebacks ?? 0} warn={(refund.chargebacks ?? 0) > 0} />
          </div>
        </Section>
      )}

      {/* Stripe paying-user verification */}
      {report && (
        <Section title="Stripe Paying-User Verification">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card title="Current Stripe Paying Users" value={stripeVerify.current_stripe_paying_users ?? 0} />
            <Card title="Matched to Canonical Users" value={stripeVerify.matched_to_canonical_users ?? 0} highlight />
            <Card title="Unmatched Provider Subscriptions" value={stripeVerify.unmatched_provider_subscriptions ?? 0} warn={(stripeVerify.unmatched_provider_subscriptions ?? 0) > 0} />
            <Card title="Status Conflicts" value={stripeVerify.status_conflicts ?? 0} warn={(stripeVerify.status_conflicts ?? 0) > 0} />
            <Card title="Period Conflicts" value={stripeVerify.period_conflicts ?? 0} warn={(stripeVerify.period_conflicts ?? 0) > 0} />
            <Card title="Refund Conflicts" value={stripeVerify.refund_conflicts ?? 0} warn={(stripeVerify.refund_conflicts ?? 0) > 0} />
          </div>
        </Section>
      )}

      {/* Zero-dollar events — visible as lifecycle, excluded from payment totals */}
      {report && report.reliability && (
        <Section title="Zero-Dollar / Promotional Events (excluded from payment totals)">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card title="Zero-Dollar Events (total)" value={report.reliability.zeroDollarEventsCount ?? 0} />
            <Card title="Unmatched Zero-Dollar" value={report.reliability.unmatchedZeroDollarEvents ?? 0} />
            <Card title="Unmatched Paid Transactions" value={report.reliability.unmatchedPaidTransactions ?? 0} warn={(report.reliability.unmatchedPaidTransactions ?? 0) > 0} />
            <Card title="Unmatched Lifecycle Events" value={report.reliability.unmatchedLifecycleEvents ?? 0} />
          </div>
          {report.unmatchedZeroDollarEventsDetail?.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-[#E0D8C8]/50">These are trial/promotional invoices — not paid transactions. They remain visible for lifecycle reconciliation but never count toward payment totals or reliability.</p>
              {report.unmatchedZeroDollarEventsDetail.slice(0, 10).map((e) => (
                <div key={e.event_id} className="rounded-lg border border-[#8b6239]/15 bg-[#1f1712]/50 p-2 text-xs">
                  <span className="font-mono text-[#E0D8C8]/80">{e.event_id}</span>
                  <span className="text-[#D4A574] ml-2">{e.zero_dollar_classification?.replace(/_/g, ' ')}</span>
                  {e.is_trial && <span className="text-[#E0D8C8]/50 ml-2">trial</span>}
                  {e.user_email && <span className="text-[#E0D8C8]/50 ml-2">· {e.user_email}</span>}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Orphaned entitlements — classification workflow */}
      <Section title={`Orphaned Entitlements (${orphanedEntitlements.length})`}>
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Entitlements with access but no supporting ActiveContract. These are <span className="text-[#D4A574]">not</span> payment
          mismatches — an administrator must classify each as a valid manual grant, promotional grant, referral grant,
          legacy migration, linked subscription, stale and revoked, or unresolved. All actions are audited with
          administrator identity, timestamp, prior state, revised state, and a required audit note.
        </p>
        {orphanedEntitlements.length === 0 ? (
          <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/10 p-4 text-emerald-300 text-sm">
            ✓ No orphaned entitlements. All entitled users have supporting contracts.
          </div>
        ) : (
          <div className="space-y-3">
            {orphanedEntitlements.map((e) => (
              <OrphanedEntitlementCard
                key={e.id}
                entitlement={e}
                onResolved={handleOrphanResolved}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Unmatched payments — reconciliation workflow */}
      <Section title={`Unmatched Paid Transactions (${unmatchedList.length})`}>
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Only genuine paid transactions (amount &gt; 0) appear here. Zero-dollar promotional/trial invoices are excluded from payment totals. Each payment shows confidence-scored match suggestions; reconciliation recalculates metrics and shows before/after effects.
        </p>
        {loadingUnmatched && <p className="text-[#E0D8C8]/60">Loading unmatched payments…</p>}
        {!loadingUnmatched && unmatchedList.length === 0 && (
          <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/10 p-4 text-emerald-300 text-sm">✓ No unmatched paid Stripe transactions. Zero-dollar promotional events are classified separately.</div>
        )}
        {unmatchedList.length > 0 && (
          <div className="space-y-3">
            {unmatchedList.map((p) => (
              <UnmatchedPaymentCard
                key={p.event_id}
                p={p}
                resolving={resolving === p.event_id}
                result={resolveResult?.eventId === p.event_id ? resolveResult : null}
                manualUserId={manualUserId[p.event_id] || ''}
                onManualUserId={(v) => setManualUserId((m) => ({ ...m, [p.event_id]: v }))}
                notes={resolveNotes[p.event_id] || ''}
                onNotes={(v) => setResolveNotes((n) => ({ ...n, [p.event_id]: v }))}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function UnmatchedPaymentCard({ p, resolving, result, manualUserId, onManualUserId, notes, onNotes, onResolve }) {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm text-[#F5F1E7] break-all">{p.event_id}</p>
          <p className="text-xs text-[#E0D8C8]/60 mt-1">
            {p.payment_date ? new Date(p.payment_date).toLocaleString() : '—'} · {p.provider} · {p.payment_status}
            {p.amount != null ? ` · $${p.amount}` : p.amount_cents != null ? ` · ${p.amount_cents} cents` : ''}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${p.reconciliation_status === 'auto_linkable' ? 'bg-emerald-900/30 text-emerald-300' : p.reconciliation_status === 'admin_approval_required' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-red-900/30 text-red-300'}`}>
          {p.reconciliation_status.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <Field label="Stripe Customer ID" value={p.stripe_customer_id} />
        <Field label="Stripe Subscription ID" value={p.stripe_subscription_id} />
        <Field label="Invoice ID" value={p.invoice_id} />
        <Field label="Customer Email" value={p.customer_email} />
        <Field label="Metadata User ID" value={p.metadata_user_id} />
        <Field label="Product ID" value={p.product_id} />
      </div>
      <button onClick={() => setShowDetails((s) => !s)} className="text-xs text-[#D4A574] hover:underline">
        {showDetails ? 'Hide' : 'Show'} match suggestions ({p.possible_matching_users?.length || 0})
      </button>
      {showDetails && (p.possible_matching_users?.length > 0 ? (
        <div className="space-y-1 text-xs">
          {p.possible_matching_users.map((m, i) => (
            <div key={i} className="flex items-center justify-between rounded border border-[#8b6239]/20 px-2 py-1">
              <span className="font-mono text-[#E0D8C8]/80">{m.user_id} · {m.email}</span>
              <span className="text-[#D4A574]">{m.method} · {(m.confidence * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-[#E0D8C8]/50">No candidate matches found by any deterministic key.</p>)}

      {/* Resolution controls */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end pt-2 border-t border-[#8b6239]/15">
        <div className="flex-1 min-w-0">
          <label className="text-xs text-[#E0D8C8]/60 block mb-1">Administrator user ID to link</label>
          <input
            type="text"
            value={manualUserId}
            onChange={(e) => onManualUserId(e.target.value)}
            placeholder="canonical user id"
            className="w-full rounded border border-[#8b6239]/30 bg-[#140f0c] px-2 py-1.5 text-sm text-[#E0D8C8]"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-xs text-[#E0D8C8]/60 block mb-1">Audit note (required)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => onNotes(e.target.value)}
            placeholder="reason for manual match"
            className="w-full rounded border border-[#8b6239]/30 bg-[#140f0c] px-2 py-1.5 text-sm text-[#E0D8C8]"
          />
        </div>
        <button
          onClick={() => onResolve(p.event_id, manualUserId, 'manual_approval', 0.5)}
          disabled={!manualUserId || !notes || resolving}
          className="px-4 py-2 rounded bg-[#D4A574] text-[#140f0c] font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#c89a5f]"
        >
          {resolving ? 'Reconciling…' : 'Link Payment'}
        </button>
      </div>

      {/* Before/after metric effects */}
      {result && !result.error && (
        <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/10 p-3 text-xs space-y-1">
          <p className="font-semibold text-emerald-300">✓ Reconciled — metric effects</p>
          <div className="grid grid-cols-3 gap-2">
            <span><span className="text-[#E0D8C8]/50">Before:</span> {result.metric_effects?.before?.confirmedFirstPaidUsers ?? '—'} confirmed / {result.metric_effects?.before?.unmatchedPayments ?? '—'} unmatched</span>
            <span><span className="text-[#E0D8C8]/50">After:</span> {result.metric_effects?.after?.confirmedFirstPaidUsers ?? '—'} confirmed / {result.metric_effects?.after?.unmatchedPayments ?? '—'} unmatched</span>
            <span><span className="text-[#E0D8C8]/50">Delta:</span> <span className="text-[#D4A574]">+{result.metric_effects?.delta?.confirmedFirstPaidUsers ?? 0} confirmed / {result.metric_effects?.delta?.unmatchedPayments ?? 0} unmatched</span></span>
          </div>
          <p className="text-[#E0D8C8]/50">Audit event: {result.audit_event_id} · Admin: {result.administrator}</p>
        </div>
      )}
      {result?.error && (
        <div className="rounded-lg border border-red-800/40 bg-red-900/10 p-3 text-xs text-red-300">✗ {result.error}</div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-[#D4A574] border-b border-[#8b6239]/25 pb-1">{title}</h2>
      {children}
    </div>
  );
}

function Card({ title, value, warn = false, highlight = false }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? 'border-yellow-700/40 bg-yellow-900/10' : highlight ? 'border-[#D4A574]/40 bg-[#1f1712]/70' : 'border-[#8b6239]/25 bg-[#1f1712]/70'}`}>
      <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/60">{title}</p>
      <p className={`text-xl font-semibold mt-1 ${warn ? 'text-yellow-300' : highlight ? 'text-[#D4A574]' : 'text-[#F5F1E7]'}`}>{value}</p>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-[#E0D8C8]/40">{label}</p>
      <p className="font-mono text-[#E0D8C8]/80 truncate" title={value}>{value || '—'}</p>
    </div>
  );
}

function exportCsv(report) {
  const t = report?.reconciliationTotals || {};
  const lines = ['metric,value'];
  for (const [k, v] of Object.entries(t)) lines.push(`${k},${v}`);
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'reconciliation-totals.csv'; a.click();
  URL.revokeObjectURL(url);
}

// Backend-enforced CSV export: admin authorization, no secrets, no raw payloads,
// labeled confirmed vs inferred, uses the same filtered totals as the dashboard.
async function exportCsvBackend() {
  try {
    const r = await base44.functions.invoke('exportReconciliationCsv', {});
    // r is an Axios response; data may be a string (CSV) or JSON error
    const data = r?.data ?? r;
    if (typeof data === 'string') {
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'reconciliation-export.csv'; a.click();
      URL.revokeObjectURL(url);
    } else if (data?.error) {
      alert(`Export failed: ${data.error}`);
    }
  } catch (e) {
    alert(`Export failed: ${e?.message || 'Unauthorized'}`);
  }
}