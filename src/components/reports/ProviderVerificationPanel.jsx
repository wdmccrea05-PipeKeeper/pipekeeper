import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, AlertTriangle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

export default function ProviderVerificationPanel() {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStaleRows, setShowStaleRows] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  const runVerification = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await base44.functions.invoke('verifyPayingUserCount', { includeRawDetails: true });
      setVerification(response?.data ?? response);
    } catch (err) {
      setError(err?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!verification && !loading && !error) {
    return (
      <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <h3 className="text-sm font-semibold text-amber-300">Provider Verification Required</h3>
            <p className="text-xs text-[#E0D8C8]/60 leading-relaxed">
              The current paying-user count is <strong>provisional</strong> — it is based on local contract
              period_end only and has not been verified against live Stripe. A stale local period can
              incorrectly expire a user whose Stripe subscription renewed but whose local contract was
              not updated. Click below to query live Stripe and reconcile each subscription.
            </p>
            <button
              onClick={runVerification}
              className="px-4 py-2 rounded-lg bg-amber-700/30 border border-amber-600/40 text-amber-200 text-sm font-semibold hover:bg-amber-700/40 transition-colors"
            >
              Run Live Provider Verification
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-[#D4A574] animate-spin" />
        <span className="text-sm text-[#E0D8C8]">Querying live Stripe subscriptions…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-800/40 bg-red-900/10 p-4 space-y-2">
        <p className="text-sm text-red-300">Verification failed: {error}</p>
        <button onClick={runVerification} className="px-3 py-1.5 rounded border border-red-700/40 text-red-300 text-xs hover:bg-red-900/20">
          Retry
        </button>
      </div>
    );
  }

  const dx = verification.discrepancyExplanation || {};
  const ec = verification.evidenceHierarchyCounts || {};
  const sc = verification.staleRowCategories || {};
  const slc = verification.stripeLiveCounts || {};
  const ap = verification.appleSeparation || {};
  const fr = verification.finalVerificationReport || {};
  const restored = verification.usersRestoredAfterVerification || [];

  return (
    <div className="space-y-4">
      {/* Provisional banner */}
      <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-300">Provider Verification Complete</h3>
          <p className="text-xs text-[#E0D8C8]/60 mt-1 leading-relaxed">
            {dx.explanation || 'Reconciliation complete.'}
          </p>
          {verification.meta?.stripeAvailable && (
            <p className="text-xs text-emerald-400/70 mt-1">
              ✓ Live Stripe data available ({verification.meta.stripeMeta?.masked}, {verification.meta.stripeMeta?.environment})
            </p>
          )}
        </div>
        <button onClick={runVerification} className="px-3 py-1.5 rounded border border-amber-600/40 text-amber-200 text-xs hover:bg-amber-700/20 flex-shrink-0">
          Re-run
        </button>
      </div>

      {/* Discrepancy explanation */}
      <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-[#D4A574]">39-vs-40 Discrepancy Resolution</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Stat label="Canonical Current Paid Subscriptions" value={dx.canonical_current_paid_subscriptions} />
          <Stat label="Distinct Canonical User IDs" value={dx.distinct_canonical_user_ids} />
          <Stat label="Distinct Registered Users" value={dx.distinct_registered_canonical_users} />
          <Stat label="Unmatched Identities" value={dx.unmatched_identities} warn={dx.unmatched_identities > 0} />
          <Stat label="Test/Internal Excluded" value={dx.test_internal_excluded} />
          <Stat label="Current Paying Users (Production KPI)" value={dx.current_paying_users_displayed} highlight />
        </div>
      </div>

      {/* Status-evidence hierarchy */}
      <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-[#D4A574]">Status-Evidence Hierarchy</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <Stat label="Verified Current Paid" value={ec.verified_current_paid} highlight />
          <Stat label="Verified Canceling (Paid Through)" value={ec.verified_canceling_but_paid_through} />
          <Stat label="Verified Canceled" value={ec.verified_canceled} />
          <Stat label="Verified Past-Due" value={ec.verified_past_due} />
          <Stat label="Verified Expired" value={ec.verified_expired} />
          <Stat label="Locally Current Unverified" value={ec.locally_current_unverified} warn />
          <Stat label="Locally Expired Unverified" value={ec.locally_expired_unverified} />
          <Stat label="Conflicting State" value={ec.conflicting_provider_and_local_state} warn={ec.conflicting_provider_and_local_state > 0} />
          <Stat label="Unresolved" value={ec.unresolved} warn={ec.unresolved > 0} />
        </div>
      </div>

      {/* Stripe live counts */}
      {verification.meta?.stripeAvailable && (
        <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-[#D4A574]">Live Stripe Subscription Counts</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <Stat label="Active" value={slc.active} highlight />
            <Stat label="Trialing" value={slc.trialing} />
            <Stat label="Past-Due" value={slc.past_due} warn={slc.past_due > 0} />
            <Stat label="Canceling (Paid Through)" value={slc.canceling_but_paid_through} />
            <Stat label="Canceled" value={slc.canceled} />
            <Stat label="Incomplete" value={slc.incomplete} warn={slc.incomplete > 0} />
            <Stat label="Total in Stripe" value={slc.total} />
          </div>
        </div>
      )}

      {/* Apple separation */}
      <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 space-y-2">
        <h4 className="text-sm font-semibold text-[#D4A574]">Apple Subscriptions (Unverified)</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Stat label="Locally Current (Unverified)" value={ap.locally_current_unverified} warn />
          <Stat label="Locally Expired" value={ap.locally_expired} />
          <Stat label="Verified Current" value={ap.verified_current} />
        </div>
        <p className="text-xs text-[#E0D8C8]/40 mt-1">{ap.label}</p>
      </div>

      {/* Stale row reconciliation */}
      <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-[#D4A574]">Stale Row Reconciliation (Locally Expired Rows)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <Stat label="Provider Confirms Still Active" value={sc.provider_confirms_still_active} highlight={sc.provider_confirms_still_active > 0} />
          <Stat label="Provider Confirms Expired" value={sc.provider_confirms_expired} />
          <Stat label="Conflicting Provider/Local" value={sc.conflicting_provider_local_data} warn={sc.conflicting_provider_local_data > 0} />
          <Stat label="Provider Unavailable" value={sc.provider_unavailable} warn />
          <Stat label="Provider Unavailable (Recent Payment)" value={sc.provider_unavailable_recent_payment} warn={sc.provider_unavailable_recent_payment > 0} />
          <Stat label="Apple Unverified" value={sc.apple_unverified} />
          <Stat label="Unresolved" value={sc.unresolved} warn={sc.unresolved > 0} />
        </div>
        {verification.staleRowReconciliation?.length > 0 && (
          <div>
            <button
              onClick={() => setShowStaleRows(!showStaleRows)}
              className="flex items-center gap-1 text-xs text-[#D4A574] hover:underline mt-2"
            >
              {showStaleRows ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {showStaleRows ? 'Hide' : 'Show'} {verification.staleRowReconciliation.length} stale row details
            </button>
            {showStaleRows && (
              <div className="overflow-x-auto mt-2 max-h-96 overflow-y-auto rounded border border-[#8b6239]/20">
                <table className="w-full text-xs">
                  <thead className="bg-[#1a1310] sticky top-0">
                    <tr className="text-left text-[#E0D8C8]/60">
                      <th className="p-2">User</th>
                      <th className="p-2">Sub ID</th>
                      <th className="p-2">Local Period End</th>
                      <th className="p-2">Stripe Status</th>
                      <th className="p-2">Latest Payment</th>
                      <th className="p-2">Final Status</th>
                      <th className="p-2">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verification.staleRowReconciliation.map((r, i) => (
                      <tr key={i} className="border-t border-[#8b6239]/15 text-[#E0D8C8]/80">
                        <td className="p-2 break-all">{r.canonical_user}</td>
                        <td className="p-2 break-all">{r.provider_subscription_id?.slice(0, 20) || '—'}</td>
                        <td className="p-2">{r.local_period_end ? new Date(r.local_period_end).toLocaleDateString() : '—'}</td>
                        <td className="p-2">{r.provider_current_status || '—'}</td>
                        <td className="p-2">{r.latest_successful_payment ? new Date(r.latest_successful_payment).toLocaleDateString() : '—'}</td>
                        <td className="p-2 text-[#D4A574]">{r.final_canonical_status}</td>
                        <td className="p-2">{r.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Users restored after verification */}
      {restored.length > 0 && (
        <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/10 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-emerald-300">
            Users Restored After Provider Verification ({restored.length})
          </h4>
          <p className="text-xs text-[#E0D8C8]/50">
            These users were classified as expired by the local-only logic, but live Stripe confirms they are still paying.
          </p>
          <div>
            <button
              onClick={() => setShowRestored(!showRestored)}
              className="flex items-center gap-1 text-xs text-emerald-300 hover:underline"
            >
              {showRestored ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {showRestored ? 'Hide' : 'Show'} restored user details
            </button>
            {showRestored && (
              <div className="overflow-x-auto mt-2 max-h-64 overflow-y-auto rounded border border-emerald-800/30">
                <table className="w-full text-xs">
                  <thead className="bg-[#1a1310] sticky top-0">
                    <tr className="text-left text-[#E0D8C8]/60">
                      <th className="p-2">Email</th>
                      <th className="p-2">Sub ID</th>
                      <th className="p-2">Local Period End</th>
                      <th className="p-2">Stripe Period End</th>
                      <th className="p-2">Stripe Status</th>
                      <th className="p-2">Verified Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restored.map((r, i) => (
                      <tr key={i} className="border-t border-emerald-800/20 text-[#E0D8C8]/80">
                        <td className="p-2 break-all">{r.email || r.user_id}</td>
                        <td className="p-2 break-all">{r.provider_subscription_id?.slice(0, 20) || '—'}</td>
                        <td className="p-2">{r.local_period_end ? new Date(r.local_period_end).toLocaleDateString() : '—'}</td>
                        <td className="p-2">{r.stripe_period_end ? new Date(r.stripe_period_end).toLocaleDateString() : '—'}</td>
                        <td className="p-2">{r.stripe_status || '—'}</td>
                        <td className="p-2 text-emerald-300">{r.verified_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Final verification report */}
      <div className="rounded-xl border border-[#D4A574]/40 bg-[#1f1712]/70 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-[#D4A574]">Final Verification Report</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <Stat label="New Canonical Subscription Lifecycles" value={fr.new_canonical_subscription_lifecycles} />
          <Stat label="Provider-Verified Current Paid" value={fr.provider_verified_current_paid_subscriptions} highlight />
          <Stat label="Provider-Unverified Current Paid" value={fr.provider_unverified_current_paid_subscriptions} warn />
          <Stat label="Current Paying Identities" value={fr.current_paying_identities} />
          <Stat label="Current Registered Paying Users" value={fr.current_registered_paying_users} />
          <Stat label="Production KPI Paying Users" value={fr.production_kpi_paying_users} highlight />
          <Stat label="Stripe Current Paid Users" value={fr.stripe_current_paid_users} />
          <Stat label="Apple Current Paid Users" value={fr.apple_current_paid_users} />
          <Stat label="Apple Unverified Users" value={fr.apple_unverified_users} warn />
          <Stat label="Test/Internal Exclusions" value={fr.test_internal_exclusions} />
          <Stat label="Unmatched Identities" value={fr.unmatched_identities} warn={fr.unmatched_identities > 0} />
          <Stat label="Unresolved Users" value={fr.unresolved_users} warn={fr.unresolved_users > 0} />
        </div>
        <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 p-3">
          <p className="text-sm font-semibold text-amber-300">{fr.metric_label || 'Current paying users — provisional'}</p>
          <p className="text-xs text-[#E0D8C8]/50 mt-1">{fr.reason_for_difference}</p>
          {fr.users_restored_after_provider_verification > 0 && (
            <p className="text-xs text-emerald-300 mt-1">
              ↳ {fr.users_restored_after_provider_verification} user(s) were restored after live Stripe verification.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, warn = false, highlight = false }) {
  return (
    <div className={`rounded-lg border p-2.5 ${warn ? 'border-yellow-700/40 bg-yellow-900/10' : highlight ? 'border-[#D4A574]/40 bg-[#D4A574]/10' : 'border-[#8b6239]/20 bg-[#1a1310]/50'}`}>
      <p className="text-xs text-[#E0D8C8]/50">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 ${warn ? 'text-yellow-300' : highlight ? 'text-[#D4A574]' : 'text-[#F5F1E7]'}`}>{value ?? 0}</p>
    </div>
  );
}