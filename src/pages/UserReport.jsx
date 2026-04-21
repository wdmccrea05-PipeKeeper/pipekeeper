import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { exportContractsCsv } from '@/lib/exportUserReportCsv';

export default function UserReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.functions
      .invoke('getUserSubscriptionReport', {})
      .then((response) => setData(response?.data ?? response))
      .catch((err) => {
        console.error('Failed to load getUserSubscriptionReport', err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-[#E0D8C8]">Loading user report...</div>;
  if (error) return <div className="p-6 text-[#E0D8C8]">Unable to load user report.</div>;
  if (!data) return <div className="p-6 text-[#E0D8C8]">Unable to load user report.</div>;

  const { summary = {}, modules = {}, contracts = [] } = data;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#F5F1E7]">User Report</h1>
        <button
          type="button"
          onClick={() => exportContractsCsv(contracts)}
          className="px-3 py-2 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card title="Total Accounts" value={summary.totalAccounts ?? 0} />
        <Card title="Paid Accounts" value={summary.paidAccounts ?? 0} />
        <Card title="Free Accounts" value={summary.freeAccounts ?? 0} />
        <Card title="Paid %" value={`${summary.paidPct ?? '0.0'}%`} />
        <Card title="Active Contracts" value={summary.activeContracts ?? 0} />
        <Card title="MRR" value={`$${summary.mrr ?? 0}`} />
        <Card title="ARR" value={`$${summary.arr ?? 0}`} />
        <Card title="Unknown Contracts" value={summary.unknownContracts ?? 0} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card title="PipeKeeper" value={modules.pipekeeper ?? 0} />
        <Card title="WhiskeyKeeper" value={modules.whiskeykeeper ?? 0} />
        <Card title="CigarKeeper" value={modules.cigarkeeper ?? 0} />
        <Card title="Total Entitlements" value={modules.totalEntitlements ?? 0} />
      </div>

      <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#2a1f18]">
            <tr>
              <Th>User ID</Th>
              <Th>Provider</Th>
              <Th>Product</Th>
              <Th>Modules</Th>
              <Th>Interval</Th>
              <Th>Amount</Th>
              <Th>Renewal Date</Th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id} className="border-t border-[#8b6239]/15">
                <Td>{c.user_id}</Td>
                <Td>{c.provider}</Td>
                <Td>{c.product}</Td>
                <Td>{Array.isArray(c.modules) && c.modules.length > 0 ? c.modules.join(', ') : '-'}</Td>
                <Td>{c.interval}</Td>
                <Td>{c.amount}</Td>
                <Td>{c.renewal_date || '-'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
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
