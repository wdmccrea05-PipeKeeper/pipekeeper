import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function UserReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await base44.functions.invoke('getUserSubscriptionReportV3', {});
      setData(response?.data ?? response);
    } catch (err) {
      setError(err?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const exportRows = useMemo(() => data?.payingUsersList || [], [data]);

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

  const accounts = data.accounts || {};
  const subscriptions = data.subscriptions || {};
  const revenue = data.revenue || {};
  const moduleCoverage = data.moduleCoverage || {};
  const renewals = data.renewals || {};
  const reconciliation = data.reconciliation || {};
  const forecast = data.forecast || {};
  const forecastAssumptions = forecast.assumptions || {};
  const forecastCommitted = forecast.committed || {};
  const forecastExpectedRenewal = forecast.expectedRenewal || {};
  const forecastNew = forecast.newRevenue || {};
  const forecastTotal = forecast.totalExpected || {};
  const reasonCounts = reconciliation.reasonCounts || {};
  const signupSources = accounts.signupSources || {};
  const newUsers = accounts.newUsers || {};

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <Header generatedAt={data.meta?.generatedAt} onRefresh={load} onExport={() => exportCsv(exportRows)} />

      <Section title="A. Accounts">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card title="Total Users" value={accounts.totalUsers ?? 0} />
          <Card title="Paid Users" value={accounts.paidUsers ?? 0} />
          <Card title="Free Users" value={accounts.freeUsers ?? 0} />
          <Card title="Paid %" value={`${accounts.paidPercentage ?? 0}%`} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <Card title="Web" value={signupSources.web ?? 0} />
          <Card title="Apple / iOS" value={signupSources.apple ?? 0} />
          <Card title="Google Play" value={signupSources.google ?? 0} />
          <Card title="Unknown Source" value={signupSources.unknown ?? 0} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
          <Card title="New Today" value={newUsers.today ?? 0} />
          <Card title="New This Week" value={newUsers.week ?? 0} />
          <Card title="New This Month" value={newUsers.month ?? 0} />
          <Card title="New This Quarter" value={newUsers.quarter ?? 0} />
          <Card title="New This Year" value={newUsers.year ?? 0} />
        </div>
      </Section>

      <Section title="B. Run-Rate Metrics (not a forecast)">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">MRR and ARR are annualized run-rate figures based on current active contracts. They are not revenue predictions.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card title="Active Paid Contracts" value={subscriptions.activePaidContracts ?? 0} />
          <Card title="Monthly Subs" value={subscriptions.monthly ?? 0} />
          <Card title="Annual Subs" value={subscriptions.annual ?? 0} />
          <Card title="MRR" value={`$${formatMoney(revenue.mrr)}`} />
          <Card title="ARR (run-rate)" value={`$${formatMoney(revenue.arr)}`} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <Card title="Known Revenue Rows" value={revenue.knownRevenueRows ?? 0} />
          <Card title="Unknown Product" value={reconciliation.unknownProductCount ?? 0} warn={(reconciliation.unknownProductCount ?? 0) > 0} />
          <Card title="Missing Interval" value={reconciliation.missingIntervalCount ?? 0} warn={(reconciliation.missingIntervalCount ?? 0) > 0} />
          <Card title="Missing Amount" value={reconciliation.missingAmountCount ?? 0} warn={(reconciliation.missingAmountCount ?? 0) > 0} />
        </div>
      </Section>

      <Section title="B2. Committed Renewal Revenue">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Exact renewal amounts from financially eligible active contracts with known renewal dates. No probability weighting — these are confirmed upcoming charges.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ForecastCard title="Committed — Next 30 Days" amount={forecastCommitted.next30?.revenue} sub={`${forecastCommitted.next30?.customers ?? 0} customers · ${forecastCommitted.next30?.subscriptions ?? 0} subs`} color="blue" />
          <ForecastCard title="Committed — Next 90 Days" amount={forecastCommitted.next90?.revenue} sub={`${forecastCommitted.next90?.customers ?? 0} customers · ${forecastCommitted.next90?.subscriptions ?? 0} subs`} color="blue" />
          <ForecastCard title="Committed — Next 12 Months" amount={forecastCommitted.next365?.revenue} sub={`${forecastCommitted.next365?.customers ?? 0} customers · ${forecastCommitted.next365?.subscriptions ?? 0} subs`} color="blue" />
        </div>
      </Section>

      <Section title="B3. Expected Revenue Forecast">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Weighted by retention probability (monthly: {(forecastAssumptions.monthlyRetention * 100).toFixed(0)}%, annual: {(forecastAssumptions.annualRetention * 100).toFixed(0)}%) plus forecasted new subscription revenue.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ForecastCard title="Expected Total — Next 30 Days" amount={forecastTotal.next30} color="green" />
          <ForecastCard title="Expected Total — Next 90 Days" amount={forecastTotal.next90} color="green" />
          <ForecastCard title="Expected Total — Next 12 Months" amount={forecastTotal.next365} color="green" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          <ForecastCard title="Expected Renewals — 30d" amount={forecastExpectedRenewal.next30} sub="weighted by retention" color="amber" />
          <ForecastCard title="Expected Renewals — 90d" amount={forecastExpectedRenewal.next90} sub="weighted by retention" color="amber" />
          <ForecastCard title="Expected Renewals — 12m" amount={forecastExpectedRenewal.next365} sub="weighted by retention" color="amber" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          <ForecastCard title="New Revenue — 30d" amount={forecastNew.next30} sub="new subs forecast" color="purple" />
          <ForecastCard title="New Revenue — 90d" amount={forecastNew.next90} sub="new subs forecast" color="purple" />
          <ForecastCard title="New Revenue — 12m" amount={forecastNew.next365} sub="new subs forecast" color="purple" />
        </div>
      </Section>

      <Section title="B4. Forecast Assumptions">
        <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 text-xs text-[#E0D8C8]/80 space-y-1.5">
          <p><span className="text-[#D4A574] font-semibold">Monthly retention:</span> {(forecastAssumptions.monthlyRetention * 100).toFixed(0)}% — probability a monthly subscriber renews each period</p>
          <p><span className="text-[#D4A574] font-semibold">Annual retention:</span> {(forecastAssumptions.annualRetention * 100).toFixed(0)}% — probability an annual subscriber renews</p>
          <p><span className="text-[#D4A574] font-semibold">New revenue method:</span> {forecastAssumptions.newPaidMethod}</p>
          <p><span className="text-[#D4A574] font-semibold">New paid users (last 90d):</span> {forecastAssumptions.newPaidPer90Days}</p>
          <p><span className="text-[#D4A574] font-semibold">Avg new paid per 30d:</span> {forecastAssumptions.newPaidPerDayLabel ?? forecastAssumptions.newPaidPer30Days ?? forecastAssumptions.newPaidPerDay}</p>
          <p><span className="text-[#D4A574] font-semibold">Avg first billing amount:</span> ${formatMoney(forecastAssumptions.avgFirstBillingAmount)}</p>
          <p className="pt-1 text-[#E0D8C8]/40 italic">Retention assumptions are conservative defaults. Update in the backend function RETENTION constant as historical data becomes available.</p>
        </div>
        <BillingAuditPanel audit={forecastAssumptions.billingAudit} />
      </Section>

      <Section title="C. Product Mix (trusted contracts only)">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card title="PipeKeeper" value={revenue.byProduct?.pipekeeper ?? 0} />
          <Card title="WhiskeyKeeper" value={revenue.byProduct?.whiskeykeeper ?? 0} />
          <Card title="CigarKeeper" value={revenue.byProduct?.cigarkeeper ?? 0} />
          <Card title="WineKeeper" value={revenue.byProduct?.winekeeper ?? 0} />
          <Card title="Bundle" value={revenue.byProduct?.bundle ?? 0} />
        </div>
      </Section>

      <Section title="D. Module Coverage">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card title="PipeKeeper Access" value={moduleCoverage.pipekeeper ?? 0} />
          <Card title="WhiskeyKeeper Access" value={moduleCoverage.whiskeykeeper ?? 0} />
          <Card title="CigarKeeper Access" value={moduleCoverage.cigarkeeper ?? 0} />
          <Card title="WineKeeper Access" value={moduleCoverage.winekeeper ?? 0} />
          <Card title="Total Entitlements" value={moduleCoverage.totalModuleEntitlements ?? 0} />
        </div>
      </Section>

      <Section title="E. Upcoming Renewals">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <RenewalCard title="This Week" data={renewals.week} />
          <RenewalCard title="This Month" data={renewals.month} />
          <RenewalCard title="This Quarter" data={renewals.quarter} />
          <RenewalCard title="This Year" data={renewals.year} />
        </div>
      </Section>

      <Section title="F. Exceptions / Reconciliation">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card title="Duplicates Merged" value={reconciliation.duplicatesMerged ?? 0} />
          <Card title="Manual/Admin (no contract)" value={reconciliation.manualAdminCount ?? 0} warn={(reconciliation.manualAdminCount ?? 0) > 0} />
          <Card title="Paid Accounts" value={reconciliation.totalPaidAccounts ?? 0} />
          <Card title="Discrepancy" value={reconciliation.discrepancy ?? 0} warn={(reconciliation.discrepancy ?? 0) > 0} />
        </div>
        <ExceptionTable
          title={`Unknown Product Rows (${reconciliation.unresolvedSamples?.unknownProduct?.length || 0} shown)`}
          rows={reconciliation.unresolvedSamples?.unknownProduct || []}
        />
        <ExceptionTable
          title={`Missing Interval Rows (${reconciliation.unresolvedSamples?.missingInterval?.length || 0} shown)`}
          rows={reconciliation.unresolvedSamples?.missingInterval || []}
        />
        <ExceptionTable
          title={`Missing Amount Rows (${reconciliation.unresolvedSamples?.missingAmount?.length || 0} shown)`}
          rows={reconciliation.unresolvedSamples?.missingAmount || []}
        />
      </Section>

      <Section title={`G. Paying Users (${exportRows.length})`}>
        <PayingUserTable rows={exportRows} />
      </Section>
    </div>
  );
}

function Header({ generatedAt, onRefresh, onExport }) {
  return (
    <div className="flex items-center justify-between gap-4">
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
          Export CSV
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

function Card({ title, value, warn = false }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? 'border-yellow-700/40 bg-yellow-900/10' : 'border-[#8b6239]/25 bg-[#1f1712]/70'}`}>
      <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/60">{title}</p>
      <p className={`text-2xl font-semibold mt-1 ${warn ? 'text-yellow-300' : 'text-[#F5F1E7]'}`}>{value}</p>
    </div>
  );
}

const FORECAST_COLORS = {
  blue:   'border-blue-700/40 bg-blue-900/10 text-blue-200',
  green:  'border-emerald-700/40 bg-emerald-900/10 text-emerald-200',
  amber:  'border-amber-700/40 bg-amber-900/10 text-amber-200',
  purple: 'border-purple-700/40 bg-purple-900/10 text-purple-200',
};

function ForecastCard({ title, amount, sub, color = 'blue' }) {
  const cls = FORECAST_COLORS[color] || FORECAST_COLORS.blue;
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-xs uppercase tracking-wider opacity-70">{title}</p>
      <p className="text-2xl font-semibold mt-1">${formatMoney(amount)}</p>
      {sub ? <p className="text-xs mt-1 opacity-60">{sub}</p> : null}
    </div>
  );
}

function RenewalCard({ title, data = {} }) {
  return (
    <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4">
      <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/60">{title}</p>
      <p className="text-xl font-semibold text-[#F5F1E7] mt-1">${formatMoney(data.revenue)}</p>
      <p className="text-xs text-[#E0D8C8]/50 mt-1">{data.customers ?? 0} customers · {data.subscriptions ?? 0} subs</p>
    </div>
  );
}

function ExceptionTable({ title, rows }) {
  if (!rows || rows.length === 0) return null;
  const columns = ['id', 'user_id', 'user_email', 'provider', 'product_kind', 'price_id', 'billing_interval', 'amount', 'status'];
  return (
    <div className="space-y-2 mt-3">
      <p className="text-sm font-semibold text-yellow-300">{title}</p>
      <div className="rounded-xl border border-yellow-800/30 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#2a1f18]">
            <tr>
              {columns.map((c) => (
                <th key={c} className="text-left px-2 py-2 text-[#E0D8C8]/70 whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-[#8b6239]/15">
                {columns.map((c) => (
                  <td key={c} className="px-2 py-1.5 text-[#E0D8C8]/80 font-mono max-w-[160px] truncate" title={String(row[c] ?? '')}>
                    {String(row[c] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayingUserTable({ rows }) {
  return (
    <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#2a1f18]">
          <tr>
            <th className="text-left px-3 py-2 text-[#E0D8C8] font-semibold whitespace-nowrap">Email</th>
            <th className="text-left px-3 py-2 text-[#E0D8C8] font-semibold whitespace-nowrap">Product</th>
            <th className="text-left px-3 py-2 text-[#E0D8C8] font-semibold whitespace-nowrap">Modules</th>
            <th className="text-left px-3 py-2 text-[#E0D8C8] font-semibold whitespace-nowrap">Status</th>
            <th className="text-left px-3 py-2 text-[#E0D8C8] font-semibold whitespace-nowrap">Subs</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-4 text-[#E0D8C8]/50 text-center">No paying users found</td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={idx} className="border-t border-[#8b6239]/15 hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-[#E0D8C8]/90 font-mono text-xs">{row.email || '-'}</td>
                <td className="px-3 py-2 text-[#E0D8C8]/90">{row.canonicalProduct || '-'}</td>
                <td className="px-3 py-2 text-[#E0D8C8]/90 text-xs">{(row.modules || []).join(', ') || '-'}</td>
                <td className="px-3 py-2 text-[#E0D8C8]/90">{row.status || '-'}</td>
                <td className="px-3 py-2 text-[#E0D8C8]/90 text-center">{row.subscriptionCount ?? 0}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function BillingAuditPanel({ audit }) {
  if (!audit) return null;
  return (
    <div className="rounded-xl border border-[#8b6239]/20 bg-[#1a1108]/60 p-4 mt-3 text-xs space-y-2">
      <p className="text-[#D4A574] font-semibold text-sm">Avg First Billing Audit</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-[#8b6239]/20 bg-[#1f1712]/80 p-3">
          <p className="text-[#E0D8C8]/50 uppercase tracking-wider text-[10px]">Unique Paying Users</p>
          <p className="text-[#F5F1E7] text-lg font-semibold mt-0.5">{audit.uniquePayingUsers}</p>
          <p className="text-[#E0D8C8]/40 mt-0.5">of {audit.totalEligibleRows} eligible rows</p>
        </div>
        <div className="rounded-lg border border-[#8b6239]/20 bg-[#1f1712]/80 p-3">
          <p className="text-[#E0D8C8]/50 uppercase tracking-wider text-[10px]">Standard Price Rows</p>
          <p className="text-[#F5F1E7] text-lg font-semibold mt-0.5">{audit.standardPriceCount}</p>
          <p className="text-[#E0D8C8]/40 mt-0.5">&gt; ${audit.introPriceThreshold} threshold</p>
        </div>
        <div className="rounded-lg border border-yellow-800/30 bg-yellow-900/10 p-3">
          <p className="text-yellow-300/70 uppercase tracking-wider text-[10px]">Intro/Trial Price Rows</p>
          <p className="text-yellow-200 text-lg font-semibold mt-0.5">{audit.introPriceCount}</p>
          <p className="text-yellow-300/40 mt-0.5">≤ ${audit.introPriceThreshold} (excluded from avg)</p>
        </div>
        <div className="rounded-lg border border-red-800/30 bg-red-900/10 p-3">
          <p className="text-red-300/70 uppercase tracking-wider text-[10px]">Malformed / Excluded</p>
          <p className="text-red-200 text-lg font-semibold mt-0.5">{audit.excludedMalformedCount}</p>
          <p className="text-red-300/40 mt-0.5">no amount / interval / provider</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
        <div className="rounded-lg border border-[#8b6239]/20 bg-[#1f1712]/80 p-3">
          <p className="text-[#E0D8C8]/50 uppercase tracking-wider text-[10px]">Avg Billing Amount</p>
          <p className="text-[#F5F1E7] text-lg font-semibold mt-0.5">${formatMoney(audit.avgFirstBillingAmount)}</p>
          <p className="text-[#E0D8C8]/40 mt-0.5">{audit.avgSourceNote}</p>
        </div>
        <div className="rounded-lg border border-[#8b6239]/20 bg-[#1f1712]/80 p-3">
          <p className="text-[#E0D8C8]/50 uppercase tracking-wider text-[10px]">Min Amount</p>
          <p className="text-[#F5F1E7] text-lg font-semibold mt-0.5">${formatMoney(audit.minAmount)}</p>
        </div>
        <div className="rounded-lg border border-[#8b6239]/20 bg-[#1f1712]/80 p-3">
          <p className="text-[#E0D8C8]/50 uppercase tracking-wider text-[10px]">Max Amount</p>
          <p className="text-[#F5F1E7] text-lg font-semibold mt-0.5">${formatMoney(audit.maxAmount)}</p>
        </div>
        <div className="rounded-lg border border-[#8b6239]/20 bg-[#1f1712]/80 p-3">
          <p className="text-[#E0D8C8]/50 uppercase tracking-wider text-[10px]">Median Amount</p>
          <p className="text-[#F5F1E7] text-lg font-semibold mt-0.5">${formatMoney(audit.medianAmount)}</p>
        </div>
      </div>
      {audit.introAmounts?.length > 0 && (
        <p className="text-yellow-300/60">Intro/promo amounts found: {audit.introAmounts.map((a) => `$${a}`).join(', ')}</p>
      )}
      {audit.excludedSamples?.length > 0 && (
        <div className="mt-2">
          <p className="text-red-300/70 font-semibold mb-1">Excluded malformed samples:</p>
          <div className="space-y-0.5">
            {audit.excludedSamples.map((s, i) => (
              <p key={i} className="text-[#E0D8C8]/50 font-mono">
                {s.email || '(no email)'} · {s.provider} · amt={s.amount ?? 'null'} · interval={s.interval ?? 'null'} · {s.reason}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatMoney(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function exportCsv(rows) {
  const headers = ['email', 'canonicalProduct', 'modules', 'status', 'subscriptionCount'];
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        csvValue(row.email),
        csvValue(row.canonicalProduct),
        csvValue((row.modules || []).join('|')),
        csvValue(row.status),
        csvValue(row.subscriptionCount),
      ].join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'user-subscription-report.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function csvValue(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}