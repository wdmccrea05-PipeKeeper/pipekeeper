import React from 'react';

export default function SubscriptionReconciliationSummary({ totals, multiSubUsers }) {
  if (!totals) return null;
  const t = totals;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#D4A574]/30 bg-[#1f1712]/70 p-4 space-y-3">
        <p className="font-semibold text-[#D4A574]">Subscription Reconciliation</p>
        <p className="text-xs text-[#E0D8C8]/60">{t.relationship_summary}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <ReconCard label="Raw Subscription Rows" value={t.raw_subscription_rows} />
          <ReconCard label="Raw Rows Marked Paying" value={t.raw_rows_marked_paying} warn={t.raw_rows_marked_paying > t.canonical_current_paid_subscriptions} />
          <ReconCard label="Duplicate Rows Merged" value={t.duplicate_rows_merged} sub="consolidated" />
          <ReconCard label="Historical/Expired Excluded" value={t.historical_rows_excluded_from_current} sub="from current" />
          <ReconCard label="Canonical Paid Subscriptions" value={t.canonical_current_paid_subscriptions} highlight />
          <ReconCard label="Unique Paying Users" value={t.unique_paying_users} highlight />
          <ReconCard label="Canonical Paid Products" value={t.canonical_current_paid_products} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#8b6239]/15">
          <ReconCard label="Fallback Rows Merged" value={t.fallback_rows_merged} />
          <ReconCard label="Cross-Provider Overlaps" value={t.cross_provider_overlaps} warn={t.cross_provider_overlaps > 0} />
          <ReconCard label="Expired (was Active)" value={t.expired_rows_previously_marked_active} warn={t.expired_rows_previously_marked_active > 0} />
          <ReconCard label="Test/Internal Accounts" value={t.test_account_rows} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <ReconCard label="Unknown Product Rows" value={t.unknown_product_rows} warn={t.unknown_product_rows > 0} />
          <ReconCard label="Unmatched Identity Rows" value={t.unmatched_identity_rows} warn={t.unmatched_identity_rows > 0} />
        </div>

        {t.metric_provisional && (
          <div className="rounded-lg border border-amber-700/30 bg-amber-900/10 p-3 text-xs text-amber-300/80">
            ⚠ {t.provisional_reason}
          </div>
        )}

        {/* Status-evidence hierarchy counts */}
        <div className="pt-2 border-t border-[#8b6239]/15">
          <p className="text-xs font-semibold text-[#D4A574]/80 mb-2">Status-Evidence Hierarchy (preliminary — without live Stripe)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ReconCard label="Provider-Verified Current Paid" value={t.provider_verified_current_paid} highlight />
            <ReconCard label="Verified Canceling (Paid Through)" value={t.provider_verified_canceling_but_paid_through} />
            <ReconCard label="Locally Current Unverified" value={t.locally_current_unverified} warn />
            <ReconCard label="Locally Expired Unverified" value={t.locally_expired_unverified} />
            <ReconCard label="Conflicting State" value={t.conflicting_provider_and_local_state} warn={t.conflicting_provider_and_local_state > 0} />
            <ReconCard label="Apple Current (Unverified)" value={t.apple_locally_current_unverified} warn />
            <ReconCard label="Apple Expired (Unverified)" value={t.apple_locally_expired_unverified} />
            <ReconCard label="Test/Internal Excluded" value={t.test_account_rows} />
          </div>
          {t.conflicting_state_user_count > 0 && (
            <p className="text-xs text-amber-400/70 mt-2">
              ⚠ {t.conflicting_state_user_count} user(s) have stale local period_end but recent payment evidence — may still be paying. Run provider verification to confirm.
            </p>
          )}
        </div>
      </div>

      {multiSubUsers && multiSubUsers.length > 0 && (
        <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 space-y-2">
          <p className="font-semibold text-[#D4A574]">
            Users with Multiple Active Subscriptions ({multiSubUsers.length})
          </p>
          <p className="text-xs text-[#E0D8C8]/60">
            These users have genuinely distinct, currently-active subscription lifecycles. Each is listed with the reason
            it is a valid separate subscription (not a duplicate).
          </p>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#2a1f18]">
                <tr>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Email</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Active Subs</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Distinct Sub IDs</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Products</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Providers</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Reason</th>
                </tr>
              </thead>
              <tbody>
                {multiSubUsers.map((u, i) => (
                  <tr key={i} className="border-t border-[#8b6239]/15 align-top">
                    <td className="px-2 py-1.5 font-mono text-[#E0D8C8]/80">{u.email}</td>
                    <td className="px-2 py-1.5 text-[#F5F1E7] font-semibold">{u.active_subscription_count}</td>
                    <td className="px-2 py-1.5 text-[#E0D8C8]/80">{u.distinct_subscription_ids}</td>
                    <td className="px-2 py-1.5 text-[#E0D8C8]/80">{(u.products || []).join(', ') || '-'}</td>
                    <td className="px-2 py-1.5 text-[#E0D8C8]/80">{(u.providers || []).join(', ') || '-'}</td>
                    <td className="px-2 py-1.5 text-[#D4A574] text-wrap-mobile">{u.validity_reason?.replace(/_/g, ' ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ReconCard({ label, value, sub, warn = false, highlight = false }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${warn ? 'border-yellow-700/40 bg-yellow-900/10' : highlight ? 'border-[#D4A574]/40 bg-[#D4A574]/5' : 'border-[#8b6239]/20'}`}>
      <p className="text-xs text-[#E0D8C8]/60">{label}</p>
      <p className={`text-lg font-semibold ${warn ? 'text-yellow-300' : highlight ? 'text-[#D4A574]' : 'text-[#F5F1E7]'}`}>{value ?? 0}</p>
      {sub ? <p className="text-xs text-[#E0D8C8]/40">{sub}</p> : null}
    </div>
  );
}