import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function UserReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    base44.functions
      .invoke('getUserSubscriptionReportV3', {})
      .then((response) => setData(response?.data ?? response))
      .catch((err) => setError(err?.message || 'Unknown error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <div className="p-8 text-[#E0D8C8]">Loading user report…</div>;
  if (error)   return (
    <div className="p-8 space-y-3">
      <p className="text-red-400">Failed to load report: {error}</p>
      <button onClick={load} className="px-4 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20">Retry</button>
    </div>
  );
  if (!data)   return <div className="p-8 text-[#E0D8C8]">No data returned.</div>;

  const accounts   = data.accounts   || {};
  const counts     = data.counts     || {};
  const revenue    = data.revenue    || {};
  const products   = data.products   || {};
  const renewals   = data.renewals   || {};
  const exceptions = data.exceptions || {};
  const paidUsers  = data.paid_users || [];
  const freeUsers  = data.free_users || [];
  const meta       = data.meta       || {};

  const unknownProductRows  = exceptions.unknownProduct  || { count: 0, samples: [] };
  const unknownIntervalRows = exceptions.unknownInterval || { count: 0, samples: [] };
  const errorRows           = exceptions.errorRows       || { count: 0, samples: [] };
  const duplicatesRemoved   = exceptions.duplicatesRemoved || 0;

  const totalExceptions = unknownProductRows.count + unknownIntervalRows.count + errorRows.count + duplicatesRemoved;
  const dataHealthPct   = counts.dataHealthPct ?? 100;

  const healthColor = dataHealthPct >= 90 ? 'text-green-400'
    : dataHealthPct >= 70 ? 'text-yellow-400'
    : 'text-red-400';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F1E7]">User Report</h1>
          {meta.generatedAt && (
            <p className="text-xs text-[#E0D8C8]/50 mt-1">
              Generated {new Date(meta.generatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20 text-sm">
            Refresh
          </button>
          <button
            onClick={() => exportCsv(paidUsers, freeUsers, counts, revenue)}
            className="px-3 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20 text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* A. Accounts */}
      <Section title="A. Accounts">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card title="Total Accounts"   value={accounts.totalUsers ?? 0} />
          <Card title="Paid Accounts"    value={accounts.paidUsers ?? 0} />
          <Card title="Free Accounts"    value={accounts.freeUsers ?? 0} />
          <Card title="Paid %"           value={`${accounts.paidPercentage ?? 0}%`} />
          <Card title="Unique Payers"    value={data.subscriptions?.uniquePayingUsers ?? 0} />
          <Card title="Exceptions"       value={data.stats?.exceptionCount ?? 0} warn={data.stats?.exceptionCount > 0} />
        </div>
      </Section>

      {/* B. Revenue Metrics */}
      <Section title="B. Revenue Metrics (trusted + inferred)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card title="MRR"              value={`$${data.revenue?.mrr ?? 0}`} />
          <Card title="ARR"              value={`$${data.revenue?.arr ?? 0}`} />
          <Card title="Paying Users"     value={data.subscriptions?.uniquePayingUsers ?? 0} />
          <Card title="Paid %"           value={`${accounts.paidPercentage ?? '0.0'}%`} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <Card title="Monthly Subs"     value={data.subscriptions?.monthly ?? 0} />
          <Card title="Annual Subs"      value={data.subscriptions?.annual ?? 0} />
        </div>
      </Section>

      {/* B2. Reconciliation */}
      {data.reconciliation && (
        <Section title="B2. Data Reconciliation">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card title="Total Active"     value={data.stats?.totalActive ?? 0} />
            <Card title="Trusted Rows"     value={data.stats?.trustedCount ?? 0} />
            <Card title="Inferred Rows"    value={data.stats?.inferredCount ?? 0} />
            <Card title="Unknown Product"  value={data.reconciliation.unknown_product_rows ?? 0} warn={data.reconciliation.unknown_product_rows > 0} />
            <Card title="Unknown Renewal"  value={data.reconciliation.unknown_renewal_rows ?? 0} warn={data.reconciliation.unknown_renewal_rows > 0} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <Card title="Inferred Products" value={data.reconciliation.inferred_product_count ?? 0} />
            <Card title="Inferred Renewals" value={data.reconciliation.inferred_renewal_count ?? 0} />
          </div>
        </Section>
      )}

      {/* C. Product Mix */}
      <Section title="C. Product Mix (inferred + trusted)">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card title="PipeKeeper"       value={data.revenue?.byProduct?.pipekeeper ?? 0} />
          <Card title="WhiskeyKeeper"    value={data.revenue?.byProduct?.whiskeykeeper ?? 0} />
          <Card title="CigarKeeper"      value={data.revenue?.byProduct?.cigarkeeper ?? 0} />
          <Card title="WineKeeper"       value={data.revenue?.byProduct?.winekeeper ?? 0} />
          <Card title="Bundle"           value={data.revenue?.byProduct?.bundle ?? 0} />
        </div>
      </Section>

      {/* D. Renewals */}
      <Section title="D. Upcoming Renewals (confirmed + inferred)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <RenewalCard label="This Week"    period={data.renewals?.week} />
          <RenewalCard label="This Month"   period={data.renewals?.month} />
          <RenewalCard label="This Quarter" period={data.renewals?.quarter} />
          <RenewalCard label="This Year"    period={data.renewals?.year} />
        </div>
      </Section>

      {/* E. Exceptions Queue */}
      {data.stats?.exceptionCount > 0 && (
        <Section title="E. Exceptions Queue — Unresolvable">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <Card title="Exception Rows" value={data.stats?.exceptionCount} warn />
            <Card title="Unknown Product" value={data.reconciliation?.unknown_product_rows} warn />
            <Card title="Unknown Renewal" value={data.reconciliation?.unknown_renewal_rows} warn />
          </div>

          <div className="rounded-xl border border-yellow-800/30 bg-yellow-900/10 p-4">
            <p className="text-yellow-300 font-semibold mb-2">Exception Rows ({data.stats?.exceptionCount ?? 0} unresolvable)</p>
            <p className="text-yellow-200 text-sm">
              These subscriptions could not be fully classified. Trusted + inferred rows are included in revenue and product mix.
              Only truly unresolvable rows (unknown product AND unknown interval) are counted as exceptions.
            </p>
          </div>
        </Section>
      )}

      {/* F. Paid Users */}
      <Section title={`F. Paid Users (${(data.paid_users || []).length})`}>
        <UserTable users={data.paid_users || []} columns={['email', 'full_name', 'subscription_status', 'platform', 'created_date']} />
      </Section>

      {/* G. Free Users */}
      <Section title={`G. Free Users (${(data.free_users || []).length})`}>
        <UserTable users={data.free_users || []} columns={['email', 'full_name', 'platform', 'created_date']} />
      </Section>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-[#D4A574] border-b border-[#8b6239]/25 pb-1">{title}</h2>
      {children}
    </div>
  );
}

function Card({ title, value, warn = false, className = '' }) {
  return (
    <div className={`rounded-xl border ${warn ? 'border-yellow-700/40 bg-yellow-900/10' : 'border-[#8b6239]/25 bg-[#1f1712]/70'} p-4`}>
      <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/60">{title}</p>
      <p className={`text-2xl font-semibold mt-1 ${warn ? 'text-yellow-300' : 'text-[#F5F1E7]'} ${className}`}>{value}</p>
    </div>
  );
}

function RenewalCard({ label, period = {} }) {
   return (
     <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4">
       <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/60 mb-2">{label}</p>
       <p className="text-xl font-semibold text-[#F5F1E7]">${period.revenue ?? 0}</p>
       <p className="text-xs text-[#E0D8C8]/50 mt-1">
         {period.customers ?? 0} customers · {period.subscriptions ?? 0} subs
       </p>
       {(period.confirmed || period.inferred) && (
         <p className="text-xs text-[#D4A574] mt-2">
           {period.confirmed ?? 0} confirmed · {period.inferred ?? 0} inferred
         </p>
       )}
     </div>
   );
 }

function ExceptionTable({ title, rows, note }) {
  if (!rows || rows.length === 0) return null;
  const keys = ['id', 'user_id', 'user_email', 'provider', 'product_kind', 'price_id', 'billing_interval', 'amount', 'status'];
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-semibold text-yellow-300">{title}</p>
      {note && <p className="text-xs text-[#E0D8C8]/50">{note}</p>}
      <div className="rounded-xl border border-yellow-800/30 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#2a1f18]">
            <tr>{keys.map((k) => <th key={k} className="text-left px-2 py-2 text-[#E0D8C8]/70 whitespace-nowrap">{k}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#8b6239]/15">
                {keys.map((k) => (
                  <td key={k} className="px-2 py-1.5 text-[#E0D8C8]/80 font-mono max-w-[140px] truncate" title={String(r[k] ?? '')}>
                    {String(r[k] ?? '-')}
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

function UserTable({ users, columns }) {
  const labels = {
    email: 'Email', full_name: 'Name', subscription_status: 'Status',
    subscription_tier: 'Tier', billing_interval: 'Interval',
    platform: 'Platform', created_date: 'Joined',
  };
  return (
    <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#2a1f18]">
          <tr>{columns.map((c) => <th key={c} className="text-left px-3 py-2 text-[#E0D8C8] font-semibold whitespace-nowrap">{labels[c] || c}</th>)}</tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr><td colSpan={columns.length} className="px-3 py-4 text-[#E0D8C8]/50 text-center">No users</td></tr>
          )}
          {users.map((u, i) => (
            <tr key={i} className="border-t border-[#8b6239]/15 hover:bg-white/[0.02]">
              {columns.map((c) => (
                <td key={c} className="px-3 py-2 text-[#E0D8C8]/90">
                  {c === 'created_date' && u[c] ? new Date(u[c]).toLocaleDateString() : (u[c] || '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCsv(paidUsers, freeUsers, counts, revenue) {
  const rows = [
    ['Type', 'Email', 'Name', 'Status', 'Tier', 'Interval', 'Platform', 'Joined'],
    ...paidUsers.map((u) => ['paid', u.email, u.full_name, u.subscription_status, u.subscription_tier, u.billing_interval || '', u.platform, u.created_date || '']),
    ...freeUsers.map((u)  => ['free', u.email, u.full_name, '', '', '', u.platform, u.created_date || '']),
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `user-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}