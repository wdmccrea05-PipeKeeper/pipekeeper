import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { exportContractsCsv } from '@/lib/exportUserReportCsv';

export default function UserReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.functions
      .invoke('getUserReport', {})
      .then((response) => setData(response?.data ?? response))
      .catch((err) => {
        console.error('Failed to load getUserReport', err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-[#E0D8C8]">Loading user report...</div>;
  if (error) return <div className="p-6 text-[#E0D8C8]">Unable to load user report: {error?.message || 'Unknown error'}</div>;
  if (!data) return <div className="p-6 text-[#E0D8C8]">No data returned.</div>;

  // Validation failure surfaced by the function
  if (data.validation && !data.validation.passed) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold text-[#F5F1E7]">User Report</h1>
        <div className="rounded-xl border border-red-800/40 bg-red-900/20 p-4">
          <p className="text-red-400 font-semibold mb-2">Report generation blocked</p>
          {(data.validation.errors || []).map((e, i) => (
            <p key={i} className="text-red-300 text-sm">{e}</p>
          ))}
        </div>
      </div>
    );
  }

  const accounts  = data.accounts  || {};
  const counts    = data.counts    || {};
  const revenue   = data.revenue   || {};
  const products  = data.products  || {};
  const paidUsers = data.paid_users || [];
  const freeUsers = data.free_users || [];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#F5F1E7]">User Report</h1>
        <button
          type="button"
          onClick={() => exportContractsCsv([...paidUsers, ...freeUsers])}
          className="px-3 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20"
        >
          Export CSV
        </button>
      </div>

      {/* Accounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card title="Total Accounts" value={accounts.totalUsers ?? 0} />
        <Card title="Paid Accounts" value={accounts.paidUsers ?? 0} />
        <Card title="Free Accounts" value={accounts.freeUsers ?? 0} />
        <Card title="Paid %" value={`${accounts.paidPercentage ?? '0.0'}%`} />
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card title="Active Subscriptions" value={counts.totalSubscriptions ?? 0} />
        <Card title="MRR" value={`$${revenue.mrr ?? 0}`} />
        <Card title="ARR" value={`$${revenue.arr ?? 0}`} />
        <Card title="Paying Users" value={counts.uniquePayingUsers ?? 0} />
      </div>

      {/* Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card title="PipeKeeper" value={products.pipekeeper ?? 0} />
        <Card title="WhiskeyKeeper" value={products.whiskeykeeper ?? 0} />
        <Card title="CigarKeeper" value={products.cigarkeeper ?? 0} />
        <Card title="Bundles" value={products.bundle ?? 0} />
      </div>

      {/* Paid users table */}
      <div>
        <h2 className="text-lg font-semibold text-[#F5F1E7] mb-2">Paid Users ({paidUsers.length})</h2>
        <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#2a1f18]">
              <tr>
                <Th>Email</Th>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Tier</Th>
                <Th>Interval</Th>
                <Th>Platform</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {paidUsers.map((u, i) => (
                <tr key={i} className="border-t border-[#8b6239]/15">
                  <Td>{u.email}</Td>
                  <Td>{u.full_name || '-'}</Td>
                  <Td>{u.subscription_status}</Td>
                  <Td>{u.subscription_tier}</Td>
                  <Td>{u.billing_interval || '-'}</Td>
                  <Td>{u.platform}</Td>
                  <Td>{u.created_date ? new Date(u.created_date).toLocaleDateString() : '-'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Free users table */}
      <div>
        <h2 className="text-lg font-semibold text-[#F5F1E7] mb-2">Free Users ({freeUsers.length})</h2>
        <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#2a1f18]">
              <tr>
                <Th>Email</Th>
                <Th>Name</Th>
                <Th>Platform</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {freeUsers.map((u, i) => (
                <tr key={i} className="border-t border-[#8b6239]/15">
                  <Td>{u.email}</Td>
                  <Td>{u.full_name || '-'}</Td>
                  <Td>{u.platform}</Td>
                  <Td>{u.created_date ? new Date(u.created_date).toLocaleDateString() : '-'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4">
      <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/70">{title}</p>
      <p className="text-2xl font-semibold text-[#F5F1E7] mt-1">{value}</p>
    </div>
  );
}

function Th({ children }) {
  return <th className="text-left px-3 py-2 text-[#E0D8C8] font-semibold">{children}</th>;
}

function Td({ children }) {
  return <td className="px-3 py-2 text-[#E0D8C8]/90">{children}</td>;
}