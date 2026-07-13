import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import UserReportDateRange from '@/components/reports/UserReportDateRange';
import UserReportAuditTable from '@/components/reports/UserReportAuditTable';
import SubscriptionReconciliationSummary from '@/components/reports/SubscriptionReconciliationSummary';
import ProviderVerificationPanel from '@/components/reports/ProviderVerificationPanel';

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'qtd', label: 'Quarter to date' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'prior_month', label: 'Prior month' },
  { value: 'prior_quarter', label: 'Prior quarter' },
  { value: 'custom', label: 'Custom range' },
];

export default function UserReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = { dateRange };
      if (dateRange === 'custom') {
        payload.startDate = customStart;
        payload.endDate = customEnd;
      }
      const response = await base44.functions.invoke('getUserSubscriptionReportV3', payload);
      setData(response?.data ?? response);
    } catch (err) {
      setError(err?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange === 'custom' && (!customStart || !customEnd)) return;
    load();
  }, [dateRange, customStart, customEnd]);

  const auditRows = useMemo(() => data?.auditUsers || [], [data]);
  const subRows = useMemo(() => data?.auditSubscriptions || [], [data]);
  const canonicalSubs = useMemo(() => data?.canonicalCurrentPaidSubscriptionsDetail || [], [data]);
  const subHistory = useMemo(() => data?.subscriptionHistoryDetail || [], [data]);
  const reconTotals = useMemo(() => data?.subscriptionReconciliationTotals || null, [data]);
  const multiSubUsers = useMemo(() => data?.multiSubscriptionUsers || [], [data]);

  if (loading) return <div className="p-8 text-[#E0D8C8]">Loading user report…</div>;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8 space-y-4">
        <div className="rounded-xl border border-red-800/40 bg-red-900/10 p-4 text-red-300">
          Failed to load report: {error}
        </div>
        <button onClick={load} className="px-4 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-[#E0D8C8]">No report data returned.</div>;

  const ua = data.userActivity || {};
  const ss = data.subscriptionStatus || {};
  const acq = data.acquisition || {};
  const pb = data.providerBreakdown || {};
  const prod = data.productBreakdown || {};
  const dq = data.dataQuality || {};
  const rev = data.revenue || {};
  const ren = data.renewals || {};

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8 text-[#E0D8C8]">
      <Header generatedAt={data.meta?.generatedAt} onRefresh={load} onExport={() => exportUsersCsv(auditRows)} />

      <UserReportDateRange
        options={DATE_RANGE_OPTIONS}
        value={dateRange}
        onChange={setDateRange}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        rangeStart={data.dateRange?.start}
        rangeEnd={data.dateRange?.end}
      />

      <TimezoneBanner meta={data.meta} dateRange={data.dateRange} />

      {/* 1. User Activity */}
      <Section title="1. User Activity">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Active users are measured from real product activity (DailyUserMetrics), not account updates. DAU/WAU/MAU/90d are trailing windows from now.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card title="Total Registered Users" value={ua.totalRegisteredUsers ?? 0} />
          <Card title="New Registrations (period)" value={ua.newRegisteredUsers ?? 0} />
          <Card title="DAU (1 day)" value={ua.dau ?? 0} />
          <Card title="WAU (7 days)" value={ua.wau ?? 0} />
          <Card title="MAU (30 days)" value={ua.mau ?? 0} />
          <Card title="Active 90d" value={ua.active90d ?? 0} />
          <Card title="Active Free Users (30d)" value={ua.activeFreeUsers ?? 0} />
          <Card title="Active Paying Users (30d)" value={ua.activePayingUsers ?? 0} />
        </div>
      </Section>

      {/* 2. Subscription Status */}
      <Section title="2. Subscription Status (current)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card title="Current Entitled Users" value={ss.currentEntitledUsers ?? 0} highlight />
          <Card
            title={ss.provisional_label || "Current Paying Users"}
            value={ss.currentPayingUsers ?? 0}
            highlight
            sub={ss.metric_provisional ? '⚠ Provisional — not provider-verified' : undefined}
          />
          <Card title="Current Trials" value={ss.currentTrials ?? 0} />
          <Card title="Current Past-Due" value={ss.currentPastDue ?? 0} warn={(ss.currentPastDue ?? 0) > 0} />
          <Card title="Canceling but Entitled" value={ss.cancelingButEntitled ?? 0} />
          <Card title="Expired" value={ss.expiredUsers ?? 0} />
        </div>
        {ss.metric_provisional && (
          <div className="mt-3 rounded-lg border border-amber-700/30 bg-amber-900/10 p-3 text-xs text-amber-300/80 leading-relaxed">
            ⚠ {ss.provisional_reason}
          </div>
        )}
        <EntitlementReconciliation rec={data.entitlementReconciliation} />
      </Section>

      {/* 2b. Provider Verification */}
      <Section title="2b. Provider Verification (Live Stripe Reconciliation)">
        <ProviderVerificationPanel />
      </Section>

      {/* 3. Acquisition */}
      <Section title="3. Acquisition (within selected period)">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          New first-time paid users are derived from subscription and contract records (not current-state counts) and remain counted even if later canceled.
          Only users whose first-paid date is backed by a <span className="text-[#D4A574]">verified successful payment event</span> are labeled <em>confirmed</em>.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card title="New First-Time Paid Users" value={acq.newFirstTimePaidUsers ?? 0} highlight />
          <Card title="Confirmed (verified payment)" value={acq.confirmedFirstTimePaidUsers ?? 0} />
          <Card title="Inferred (not verified)" value={acq.inferredFirstTimePaidUsers ?? 0} warn={(acq.inferredFirstTimePaidUsers ?? 0) > 0} />
          <Card title="Reactivated Paid Users" value={acq.reactivatedPaidUsers ?? 0} />
          <Card title="New Paid Subscriptions" value={acq.newPaidSubscriptions ?? 0} />
          <Card title="Canceled Subscriptions" value={acq.canceledSubscriptions ?? 0} />
          <Card title="Expired Subscriptions" value={acq.expiredSubscriptions ?? 0} />
          <Card title="Free→Paid Conv. Rate" value={acq.existingFreeUserConversion == null ? '—' : `${acq.existingFreeUserConversion}%`} />
          <Card title="Reg→Paid Conv. Rate" value={acq.registrationCohortConversion == null ? '—' : `${acq.registrationCohortConversion}%`} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          <Card title="Gross First-Time Paid" value={acq.grossFirstTimePaidUsers ?? 0} />
          <Card title="Refunded (in period)" value={acq.refundedFirstTimePaidUsers ?? 0} warn={(acq.refundedFirstTimePaidUsers ?? 0) > 0} />
          <Card title="Net Retained First-Time Paid" value={acq.netRetainedFirstTimePaidUsers ?? 0} highlight />
          <Card title="Net Paid Subscriptions" value={acq.netPaidSubscriptions ?? 0} />
        </div>

        <ConfidenceLine evidence={data.firstPaidEvidenceSummary} count={acq.newFirstTimePaidUsers ?? 0} />

        <div className="mt-3 rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 space-y-2 text-sm">
          <p className="font-semibold text-[#D4A574]">Conversion explanations</p>
          <p className="text-xs text-[#E0D8C8]/70">
            <span className="text-[#E0D8C8]">Registration cohort conversion:</span> Users who registered during the selected period and paid within the {acq.attributionWindowDays ?? 30}-day attribution window. Current value: <span className="text-[#F5F1E7]">{acq.registrationCohortNumerator ?? 0} of {acq.registrationCohortDenominator ?? 0}</span>{acq.registrationCohortConversion == null ? ' (insufficient cohort data)' : ''}.
          </p>
          <p className="text-xs text-[#E0D8C8]/70">
            <span className="text-[#E0D8C8]">Existing free-user conversion:</span> Users who already had an account before the selected period and made their first payment during the period. Current value: <span className="text-[#F5F1E7]">{acq.existingFreeNumerator ?? 0} of {acq.existingFreeDenominator ?? 0}</span>{acq.existingFreeUserConversion == null ? ' (insufficient cohort data)' : ''}.
          </p>
          {acq.existingFreeDenominator === 0 && dateRange === '365d' && (
            <p className="text-xs text-yellow-300/80">
              The 365-day existing-free cohort denominator is 0 because the platform's earliest user account postdates the 365-day range start. All user creation dates are preserved (no account predates the range), so this is genuine — not a data-retention gap.
            </p>
          )}
          <p className="text-xs text-[#E0D8C8]/70">
            {acq.existingFreeNumerator ?? 0} existing user(s) converted while {acq.registrationCohortNumerator ?? 0} newly registered user(s) converted within the attribution window.
          </p>
        </div>
      </Section>

      {/* 4. Provider Breakdown */}
      <Section title="4. Paid Users by Provider">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(pb).map(([provider, counts]) => (
            <Card key={provider} title={providerLabel(provider)} value={(counts).paying ?? 0} sub={`entitled: ${(counts).entitled ?? 0}`} />
          ))}
        </div>
      </Section>

      {/* 5. Product Breakdown */}
      <Section title="5. Paid & Entitled Users by Product">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(prod).map(([product, counts]) => (
            <Card key={product} title={productLabel(product)} value={(counts).paying ?? 0} sub={`entitled: ${(counts).entitled ?? 0}`} />
          ))}
        </div>
      </Section>

      {/* 6. Revenue & Renewals */}
      <Section title="6. Revenue & Renewals (run-rate)">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card title="MRR" value={`$${formatMoney(rev.mrr)}`} />
          <Card title="ARR (run-rate)" value={`$${formatMoney(rev.arr)}`} />
          <Card title="Known Revenue Rows" value={rev.knownRevenueRows ?? 0} />
          <Card title="Renewals This Week" value={`$${formatMoney(ren.week?.revenue)}`} />
          <Card title="Renewals This Month" value={`$${formatMoney(ren.month?.revenue)}`} />
        </div>
      </Section>

      {/* 7. Data Quality */}
      <Section title="7. Data Quality & Exceptions">
        <DataQualityWarning dq={dq} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <Card title="Unmatched Subscriptions" value={dq.unmatchedSubscriptions ?? 0} warn={(dq.unmatchedSubscriptions ?? 0) > 0} />
          <Card title="Subs Without User IDs" value={dq.subscriptionsWithoutUserIds ?? 0} warn={(dq.subscriptionsWithoutUserIds ?? 0) > 0} />
          <Card title="Duplicate Contracts" value={dq.duplicateContracts ?? 0} warn={(dq.duplicateContracts ?? 0) > 0} />
          <Card title="Conflicting Statuses" value={dq.conflictingStatuses ?? 0} warn={(dq.conflictingStatuses ?? 0) > 0} />
          <Card title="Missing First-Paid Date" value={dq.missingFirstPaidDate ?? 0} warn={(dq.missingFirstPaidDate ?? 0) > 0} />
          <Card title="Missing Amount" value={dq.missingAmount ?? 0} warn={(dq.missingAmount ?? 0) > 0} />
          <Card title="Missing Interval" value={dq.missingInterval ?? 0} warn={(dq.missingInterval ?? 0) > 0} />
          <Card title="Unknown Product" value={dq.unknownProduct ?? 0} warn={(dq.unknownProduct ?? 0) > 0} />
          <Card title="Unknown Provider" value={dq.unknownProvider ?? 0} warn={(dq.unknownProvider ?? 0) > 0} />
          <Card title="Invalid Dates" value={dq.invalidDates ?? 0} warn={(dq.invalidDates ?? 0) > 0} />
          <Card title="Synthetic Identities" value={dq.syntheticIdentities ?? 0} warn={(dq.syntheticIdentities ?? 0) > 0} />
        </div>
        {data.excludedRecords?.length > 0 && (
          <ExcludedRecordsTable records={data.excludedRecords} />
        )}
      </Section>

      {/* 7b. First-time paid users — evidence & confidence categories */}
      <Section title={`7b. First-Time Paid Users — Evidence (${(data.newFirstTimePaidUsersDetail || []).length})`}>
        <FirstTimePaidEvidenceTable rows={data.newFirstTimePaidUsersDetail || []} />
      </Section>

      {/* 7c. Provider Sync Reliability (ledger-backed) */}
      <Section title="7c. Provider Sync Reliability (canonical ledger)">
        <ReliabilityBlock reliability={data.reliability} />
      </Section>

      {/* 8. Audit & Reconciliation */}
      <Section title="8. Subscription Reconciliation & Audit">
        <SubscriptionReconciliationSummary totals={reconTotals} multiSubUsers={multiSubUsers} />
        <p className="text-xs text-[#E0D8C8]/40 mt-3 mb-2">
          Three views below — canonical paid subscriptions (one row per active lifecycle), paying users (one row per canonical user), and full subscription history (all rows including expired/fallback).
        </p>
        <UserReportAuditTable
          users={auditRows}
          subscriptions={subRows}
          canonicalSubscriptions={canonicalSubs}
          subscriptionHistory={subHistory}
        />
      </Section>
    </div>
  );
}

function Header({ generatedAt, onRefresh, onExport }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#F5F1E7]">User Subscription Report</h1>
        {generatedAt ? (
          <p className="text-xs text-[#E0D8C8]/50 mt-1">Generated {new Date(generatedAt).toLocaleString()}</p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <button onClick={onRefresh} className="px-3 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20 text-sm">
          Refresh
        </button>
        <button onClick={onExport} className="px-3 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20 text-sm">
          Export Users CSV
        </button>
      </div>
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

function Card({ title, value, sub, warn = false, highlight = false }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? 'border-yellow-700/40 bg-yellow-900/10' : highlight ? 'border-[#D4A574]/40 bg-[#1f1712]/70' : 'border-[#8b6239]/25 bg-[#1f1712]/70'}`}>
      <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/60">{title}</p>
      <p className={`text-2xl font-semibold mt-1 ${warn ? 'text-yellow-300' : highlight ? 'text-[#D4A574]' : 'text-[#F5F1E7]'}`}>{value}</p>
      {sub ? <p className="text-xs text-[#E0D8C8]/50 mt-1">{sub}</p> : null}
    </div>
  );
}

function DataQualityWarning({ dq }) {
  const totalIssues = Object.values(dq).reduce((s, v) => s + (Number(v) || 0), 0);
  if (totalIssues === 0) {
    return (
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/10 p-4 text-emerald-300 text-sm">
        ✓ No data quality issues detected.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-yellow-700/40 bg-yellow-900/10 p-4 text-yellow-300 text-sm space-y-1">
      <p className="font-semibold">⚠ {totalIssues} data quality issue(s) detected</p>
      <p className="text-xs text-yellow-300/70">These do not necessarily invalidate metrics but indicate records requiring review. See the audit table below for per-record details.</p>
    </div>
  );
}

function ExcludedRecordsTable({ records }) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-semibold text-yellow-300">Records excluded or flagged ({records.length} shown, max 50)</p>
      <div className="rounded-xl border border-yellow-800/30 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#2a1f18]">
            <tr>
              <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Record ID</th>
              <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Email</th>
              <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Issues</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={i} className="border-t border-[#8b6239]/15">
                <td className="px-2 py-1.5 font-mono max-w-[180px] truncate" title={r.record}>{r.record}</td>
                <td className="px-2 py-1.5 font-mono">{r.user_email || '-'}</td>
                <td className="px-2 py-1.5 text-yellow-300/80">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimezoneBanner({ meta, dateRange }) {
  if (!meta) return null;
  return (
    <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 text-xs text-[#E0D8C8]/70 space-y-1">
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span><span className="text-[#E0D8C8]/50">Reporting timezone:</span> <span className="text-[#F5F1E7]">{meta.reportingTimezone || 'America/Indianapolis'}</span></span>
        <span><span className="text-[#E0D8C8]/50">Generated local date and time:</span> <span className="text-[#F5F1E7]">{meta.generatedLocalDateTime || (meta.generatedAt ? new Date(meta.generatedAt).toLocaleString() : '-')}</span></span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span><span className="text-[#E0D8C8]/50">Range start:</span> <span className="text-[#F5F1E7]">{dateRange?.start ? new Date(dateRange.start).toLocaleString() : '-'}</span></span>
        <span><span className="text-[#E0D8C8]/50">Range end:</span> <span className="text-[#F5F1E7]">{dateRange?.end ? new Date(dateRange.end).toLocaleString() : '-'}</span></span>
      </div>
      <p><span className="text-[#E0D8C8]/50">End-date inclusion rule:</span> <span className="text-[#F5F1E7]">{meta.endDateInclusionRule || 'End date is inclusive (local end-of-day).'}</span></p>
    </div>
  );
}

function ConfidenceLine({ evidence, count }) {
  if (!evidence) return null;
  const confirmed = evidence.confirmed_payment_event ?? 0;
  const strong = evidence.strong_subscription_evidence ?? 0;
  const inferredPeriod = evidence.inferred_contract_period ?? 0;
  const weak = evidence.weak_fallback ?? 0;
  const inferred = (evidence.totalInferred != null ? evidence.totalInferred : (strong + inferredPeriod + weak));
  return (
    <div className="mt-3 rounded-xl border border-[#D4A574]/30 bg-[#1f1712]/70 p-4 space-y-1 text-sm">
      <p className="text-[#F5F1E7]">
        Inferred first-time paid users in this period: <span className="text-[#D4A574] font-semibold">{count}</span>
        <span className="text-[#E0D8C8]/50"> · Confirmed by successful payment events: </span>
        <span className="text-[#F5F1E7] font-semibold">{confirmed}</span>
      </p>
      <p className="text-xs text-[#E0D8C8]/60">
        Evidence breakdown — confirmed payment event: {confirmed} · strong subscription evidence: {strong} · inferred contract period: {inferredPeriod} · weak fallback: {weak} · unresolved: {evidence.unresolved ?? 0}
      </p>
      {confirmed === 0 && count > 0 && (
        <p className="text-xs text-yellow-300/80">
          No SubscriptionEvent payment history exists, so these {count} user(s) are inferred from subscription and contract records — not independently confirmed from payment transactions.
        </p>
      )}
    </div>
  );
}

function EntitlementReconciliation({ rec }) {
  if (!rec) return null;
  const rows = [
    { label: 'Paying', value: rec.paying },
    { label: 'Trial', value: rec.trial },
    { label: 'Referral access', value: rec.referral_access },
    { label: 'Manual access', value: rec.manual_access },
    { label: 'Promotional access', value: rec.promotional_access },
    { label: 'Canceling but entitled', value: rec.canceling_but_entitled },
    { label: 'Entitlement without contract', value: rec.entitlement_without_contract },
  ];
  return (
    <div className="mt-3 rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 text-sm space-y-2">
      <p className="font-semibold text-[#D4A574]">Entitlement vs paying reconciliation</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg border border-[#8b6239]/20 px-3 py-2">
            <p className="text-xs text-[#E0D8C8]/60">{r.label}</p>
            <p className="text-lg font-semibold text-[#F5F1E7]">{r.value ?? 0}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#E0D8C8]/60">
        Entitled: <span className="text-[#F5F1E7]">{rec.totalEntitled ?? 0}</span> · Paying: <span className="text-[#F5F1E7]">{rec.totalPaying ?? 0}</span> · Difference: <span className="text-[#D4A574]">{rec.difference ?? 0}</span>
      </p>
      {rec.difference > 0 && rec.entitlement_without_contract > 0 && (
        <p className="text-xs text-yellow-300/80">
          The difference is explained by {rec.entitlement_without_contract} user(s) with a UserEntitlement.has_access grant but no backing paying/entitled contract (orphaned or stale entitlement).
        </p>
      )}
      <p className="text-xs text-[#E0D8C8]/50">{rec.note}</p>
    </div>
  );
}

const CONFIDENCE_CATEGORY_LABELS = {
  confirmed_payment_event: 'Confirmed payment event',
  strong_subscription_evidence: 'Strong subscription evidence',
  inferred_contract_period: 'Inferred contract period',
  weak_fallback: 'Weak fallback',
  unresolved: 'Unresolved',
};

function FirstTimePaidEvidenceTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <p className="text-xs text-[#E0D8C8]/50">No first-time paid users in the selected period.</p>;
  }
  const cols = ['User ID', 'Email', 'Registration date', 'Reported first-paid', 'Source field', 'Source entity', 'Provider', 'Product', 'Current status', 'Current entitlement', 'Confidence category', 'Possible ambiguity'];
  return (
    <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
      <table className="w-full text-xs">
        <thead className="bg-[#2a1f18]">
          <tr>
            {cols.map((c) => <th key={c} className="text-left px-2 py-2 text-[#E0D8C8]/70 whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[#8b6239]/15 align-top">
              <td className="px-2 py-1.5 font-mono max-w-[140px] truncate" title={r.user_id}>{r.user_id}</td>
              <td className="px-2 py-1.5 font-mono max-w-[160px] truncate" title={r.email}>{r.email || '-'}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{r.registration_date ? new Date(r.registration_date).toLocaleDateString() : '-'}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{r.reported_first_paid_date ? new Date(r.reported_first_paid_date).toLocaleDateString() : '-'}</td>
              <td className="px-2 py-1.5">{r.source_field || '-'}</td>
              <td className="px-2 py-1.5">{r.source_entity || '-'}</td>
              <td className="px-2 py-1.5">{r.provider || '-'}</td>
              <td className="px-2 py-1.5">{r.product || '-'}</td>
              <td className="px-2 py-1.5">{r.current_status || '-'}</td>
              <td className="px-2 py-1.5">{r.current_entitlement || '-'}</td>
              <td className="px-2 py-1.5">{CONFIDENCE_CATEGORY_LABELS[r.confidence_category] || r.confidence_category || '-'}</td>
              <td className="px-2 py-1.5 text-[#E0D8C8]/60 max-w-[260px]">{r.possible_ambiguity || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReliabilityBlock({ reliability }) {
  if (!reliability) return null;
  const fpc = reliability.firstPaidConfidence || {};
  const pec = reliability.providerEventCounts || {};
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card title="Ledger Events Total" value={reliability.ledgerEventsTotal ?? 0} />
        <Card title="Confirmed Payment Events" value={reliability.confirmedPaymentEvents ?? 0} highlight />
        <Card title="Chargebacks / Disputes" value={reliability.chargebackCount ?? 0} warn={(reliability.chargebackCount ?? 0) > 0} />
        <Card title="Stripe Events" value={pec.stripe ?? 0} />
        <Card title="Apple Events" value={pec.apple ?? 0} />
        <Card title="Google Events" value={pec.google ?? 0} />
        <Card title="Manual Events" value={pec.manual ?? 0} />
        <Card title="Unknown-Source Events" value={pec.unknown ?? 0} warn={(pec.unknown ?? 0) > 0} />
      </div>
      <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 text-sm space-y-2">
        <p className="font-semibold text-[#D4A574]">First-paid confidence (all-time)</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="rounded-lg border border-emerald-700/30 px-3 py-2">
            <p className="text-xs text-[#E0D8C8]/60">Confirmed payment</p>
            <p className="text-lg font-semibold text-emerald-300">{fpc.confirmed_payment_event ?? 0}</p>
          </div>
          <div className="rounded-lg border border-[#8b6239]/20 px-3 py-2">
            <p className="text-xs text-[#E0D8C8]/60">Strong sub evidence</p>
            <p className="text-lg font-semibold text-[#F5F1E7]">{fpc.strong_subscription_evidence ?? 0}</p>
          </div>
          <div className="rounded-lg border border-yellow-700/30 px-3 py-2">
            <p className="text-xs text-[#E0D8C8]/60">Inferred contract</p>
            <p className="text-lg font-semibold text-yellow-300">{fpc.inferred_contract_period ?? 0}</p>
          </div>
          <div className="rounded-lg border border-yellow-700/30 px-3 py-2">
            <p className="text-xs text-[#E0D8C8]/60">Weak fallback</p>
            <p className="text-lg font-semibold text-yellow-300">{fpc.weak_fallback ?? 0}</p>
          </div>
          <div className="rounded-lg border border-red-800/30 px-3 py-2">
            <p className="text-xs text-[#E0D8C8]/60">Unresolved</p>
            <p className="text-lg font-semibold text-red-300">{fpc.unresolved ?? 0}</p>
          </div>
        </div>
        {reliability.status && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${
              reliability.status === 'verified' ? 'text-emerald-300'
              : reliability.status === 'unreliable' ? 'text-red-300'
              : reliability.status === 'inference_based' ? 'text-blue-300'
              : 'text-yellow-300'
            }`}>
              {reliability.status === 'verified' ? '✓ Verified'
              : reliability.status === 'unreliable' ? '✗ Unreliable'
              : reliability.status === 'inference_based' ? '◈ Inference-based'
              : '⚠ Partially Verified'}
            </span>
            {reliability.reasons?.length > 0 && (
              <span className="text-xs text-[#E0D8C8]/60">
                {reliability.reasons.map((r) => `• ${r}`).join('  ')}
              </span>
            )}
          </div>
        )}
        <ProviderCoverageNote coverage={reliability.providerCoverage} />
        <p className="text-xs text-[#E0D8C8]/50">{reliability.note}</p>
      </div>
    </div>
  );
}

function ProviderCoverageNote({ coverage }) {
  if (!coverage) return null;
  const apple = coverage.apple;
  const google = coverage.google;
  const stripe = coverage.stripe;
  return (
    <div className="flex flex-col gap-1 text-xs text-[#E0D8C8]/60 border-t border-[#8b6239]/15 pt-2">
      <span>Stripe: <span className={stripe === 'connected' ? 'text-emerald-300' : 'text-yellow-300'}>{stripe || '—'}</span></span>
      <span>Apple App Store: {apple === 'not_configured'
        ? <span className="text-yellow-300">Relevant — transaction verification not configured</span>
        : <span className={apple === 'not_applicable' ? 'text-[#E0D8C8]/50' : 'text-emerald-300'}>{apple || '—'}</span>}</span>
      <span>Google Play: <span className={google === 'not_applicable' ? 'text-[#E0D8C8]/50' : 'text-yellow-300'}>{google || '—'}</span></span>
    </div>
  );
}

function providerLabel(p) {
  const labels = { stripe: 'Stripe', apple: 'Apple', google: 'Google Play', manual: 'Manual', unknown: 'Unknown' };
  return labels[p] || p;
}

function productLabel(p) {
  const labels = { pipekeeper: 'PipeKeeper', whiskeykeeper: 'WhiskeyKeeper', cigarkeeper: 'CigarKeeper', winekeeper: 'WineKeeper', bundle: 'Bundle' };
  return labels[p] || p;
}

function formatMoney(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function exportUsersCsv(rows) {
  const headers = ['user_id', 'email', 'created_at', 'last_real_activity', 'current_entitlement', 'current_payment_status', 'provider', 'products', 'first_paid_at', 'first_paid_source', 'latest_payment', 'current_period_end', 'canceled_at', 'matching_confidence', 'data_quality_status', 'reconciliation_issue', 'is_synthetic'];
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => csvValue(r[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'user-report-audit.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function csvValue(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}