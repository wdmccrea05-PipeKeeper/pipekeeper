import React from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function SubscriptionReconciliationSummary({ totals, multiSubUsers }) {
  const { t: translate } = useTranslation();
  if (!totals) return null;
  const t = totals;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#D4A574]/30 bg-[#1f1712]/70 p-4 space-y-3">
        <p className="font-semibold text-[#D4A574]">{translate("billingReconciliation.reconSubscriptionReconciliation")}</p>
        <p className="text-xs text-[#E0D8C8]/60">{t.relationship_summary}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <ReconCard label={translate("billingReconciliation.reconRawSubscriptionRows")} value={t.raw_subscription_rows} />
          <ReconCard label={translate("billingReconciliation.reconRawRowsMarkedPaying")} value={t.raw_rows_marked_paying} warn={t.raw_rows_marked_paying > t.canonical_current_paid_subscriptions} />
          <ReconCard label={translate("billingReconciliation.reconDuplicateRowsMerged")} value={t.duplicate_rows_merged} sub="consolidated" />
          <ReconCard label={translate("billingReconciliation.reconHistoricalExpiredExcluded")} value={t.historical_rows_excluded_from_current} sub="from current" />
          <ReconCard label={translate("billingReconciliation.reconCanonicalPaidSubscriptions")} value={t.canonical_current_paid_subscriptions} highlight />
          <ReconCard label={translate("billingReconciliation.reconUniquePayingUsers")} value={t.unique_paying_users} highlight />
          <ReconCard label={translate("billingReconciliation.reconCanonicalPaidProducts")} value={t.canonical_current_paid_products} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#8b6239]/15">
          <ReconCard label={translate("billingReconciliation.reconFallbackRowsMerged")} value={t.fallback_rows_merged} />
          <ReconCard label={translate("billingReconciliation.reconCrossProviderOverlaps")} value={t.cross_provider_overlaps} warn={t.cross_provider_overlaps > 0} />
          <ReconCard label={translate("billingReconciliation.reconExpiredWasActive")} value={t.expired_rows_previously_marked_active} warn={t.expired_rows_previously_marked_active > 0} />
          <ReconCard label={translate("billingReconciliation.reconTestInternalAccounts")} value={t.test_account_rows} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <ReconCard label={translate("billingReconciliation.reconUnknownProductRows")} value={t.unknown_product_rows} warn={t.unknown_product_rows > 0} />
          <ReconCard label={translate("billingReconciliation.reconUnmatchedIdentityRows")} value={t.unmatched_identity_rows} warn={t.unmatched_identity_rows > 0} />
        </div>

        {t.metric_provisional && (
          <div className="rounded-lg border border-amber-700/30 bg-amber-900/10 p-3 text-xs text-amber-300/80">
            ⚠ {t.provisional_reason}
          </div>
        )}

        {/* Explicit 39-vs-40 discrepancy explanation */}
        {t.discrepancy_explanation && (
          <div className="rounded-lg border border-[#8b6239]/20 bg-[#1a1310]/60 p-3 text-xs text-[#E0D8C8]/70 space-y-1">
            <p className="font-semibold text-[#D4A574]">{translate("billingReconciliation.recon39Vs40DiscrepancyExplanationLocalOnly")}</p>
            <p>{t.discrepancy_explanation}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[#E0D8C8]/50 mt-1">
              <span>{translate("billingReconciliation.reconAllIdentities")} {t.discrepancy_all_user_identities ?? '—'}</span>
              <span>{translate("billingReconciliation.reconRegistered")} {t.discrepancy_registered_identities ?? '—'}</span>
              <span>{translate("billingReconciliation.reconSyntheticUnmatched")} {t.discrepancy_synthetic_identities ?? '—'}</span>
              <span>{translate("billingReconciliation.reconTestInternal")} {t.discrepancy_test_internal_accounts ?? '—'}</span>
            </div>
            <p className="text-amber-400/60 text-xs mt-1">
              Run provider verification (section 2b) to reconcile these against live Stripe.
            </p>
          </div>
        )}

        {/* Status-evidence hierarchy counts */}
        <div className="pt-2 border-t border-[#8b6239]/15">
          <p className="text-xs font-semibold text-[#D4A574]/80 mb-2">{translate("billingReconciliation.reconStatusEvidenceHierarchyPreliminaryWithoutLiveStripe")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ReconCard label={translate("billingReconciliation.reconProviderVerifiedCurrentPaid")} value={t.provider_verified_current_paid} highlight />
            <ReconCard label={translate("billingReconciliation.reconVerifiedCancelingPaidThrough")} value={t.provider_verified_canceling_but_paid_through} />
            <ReconCard label={translate("billingReconciliation.reconLocallyCurrentUnverified")} value={t.locally_current_unverified} warn />
            <ReconCard label={translate("billingReconciliation.reconLocallyExpiredUnverified")} value={t.locally_expired_unverified} />
            <ReconCard label={translate("billingReconciliation.reconConflictingState")} value={t.conflicting_provider_and_local_state} warn={t.conflicting_provider_and_local_state > 0} />
            <ReconCard label={translate("billingReconciliation.reconAppleCurrentUnverified")} value={t.apple_locally_current_unverified} warn />
            <ReconCard label={translate("billingReconciliation.reconAppleExpiredUnverified")} value={t.apple_locally_expired_unverified} />
            <ReconCard label={translate("billingReconciliation.reconTestInternalExcluded")} value={t.test_account_rows} />
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
            {translate("billingReconciliation.reconUsersWithMultipleActiveSubscriptions", {count: multiSubUsers.length})}
          </p>
          <p className="text-xs text-[#E0D8C8]/60">
            These users have genuinely distinct, currently-active subscription lifecycles. Each is listed with the reason
            it is a valid separate subscription (not a duplicate).
          </p>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#2a1f18]">
                <tr>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">{translate("billingReconciliation.reconEmail")}</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">{translate("billingReconciliation.reconActiveSubs")}</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">{translate("billingReconciliation.reconDistinctSubIds")}</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">{translate("billingReconciliation.reconProducts")}</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">{translate("billingReconciliation.reconProviders")}</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">{translate("billingReconciliation.reconReason")}</th>
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