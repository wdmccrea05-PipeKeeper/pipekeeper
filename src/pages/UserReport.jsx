import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import UserReportDateRange from '@/components/reports/UserReportDateRange';
import UserReportAuditTable from '@/components/reports/UserReportAuditTable';

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
          <Card title="Current Paying Users" value={ss.currentPayingUsers ?? 0} highlight />
          <Card title="Current Trials" value={ss.currentTrials ?? 0} />
          <Card title="Current Past-Due" value={ss.currentPastDue ?? 0} warn={(ss.currentPastDue ?? 0) > 0} />
          <Card title="Canceling but Entitled" value={ss.cancelingButEntitled ?? 0} />
          <Card title="Expired" value={ss.expiredUsers ?? 0} />
        </div>
      </Section>

      {/* 3. Acquisition */}
      <Section title="3. Acquisition (within selected period)">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          New first-time paid users are derived from historical payment events (SubscriptionEvent), not current contract state. They remain counted even if later canceled.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card title="New First-Time Paid Users" value={acq.newFirstTimePaidUsers ?? 0} highlight />
          <Card title="Reactivated Paid Users" value={acq.reactivatedPaidUsers ?? 0} />
          <Card title="New Paid Subscriptions" value={acq.newPaidSubscriptions ?? 0} />
          <Card title="Canceled Subscriptions" value={acq.canceledSubscriptions ?? 0} />
          <Card title="Expired Subscriptions" value={acq.expiredSubscriptions ?? 0} />
          <Card title="Free→Paid Conv. Rate" value={`${acq.freeToPaidConversionRate ?? 0}%`} />
          <Card title="Reg→Paid Conv. Rate" value={`${acq.registrationToPaidConversionRate ?? 0}%`} />
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

      {/* 8. Audit & Reconciliation */}
      <Section title={`8. Audit & Reconciliation — Users (${auditRows.length})`}>
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          One row per canonical user. Synthetic identities (unmatched contracts) are included for tracking but are NOT counted as registered users.
        </p>
        <UserReportAuditTable users={auditRows} subscriptions={subRows} />
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