import React, { useMemo, useState } from 'react';

export default function UserReportAuditTable({ users, canonicalSubscriptions, subscriptionHistory, subscriptions }) {
  const [view, setView] = useState('canonical');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const q = filter.toLowerCase();
  const match = (s, ...fields) => !q || fields.some((f) => String(f ?? '').toLowerCase().includes(q));

  const filteredCanonical = useMemo(
    () => (canonicalSubscriptions || []).filter((s) => match(s, s.email, s.canonical_subscription_id)),
    [canonicalSubscriptions, filter],
  );
  const filteredUsers = useMemo(() => {
    return (users || []).filter((u) => {
      if (!match(u, u.email, u.user_id)) return false;
      if (statusFilter === 'paying' && u.current_payment_status !== 'paying') return false;
      if (statusFilter === 'entitled' && !u.current_entitlement) return false;
      if (statusFilter === 'free' && (u.current_payment_status === 'paying' || u.current_entitlement)) return false;
      if (statusFilter === 'synthetic' && !u.is_synthetic) return false;
      return true;
    });
  }, [users, filter, statusFilter]);
  const filteredHistory = useMemo(() => {
    return (subscriptionHistory || []).filter((s) => {
      if (!match(s, s.email, s.canonical_subscription_id)) return false;
      if (statusFilter === 'paying' && !s.is_currently_paying) return false;
      if (statusFilter === 'expired' && !s.is_expired_period) return false;
      if (statusFilter === 'fallback' && !s.is_fallback) return false;
      return true;
    });
  }, [subscriptionHistory, filter, statusFilter]);

  const canonicalCount = canonicalSubscriptions?.length || 0;
  const usersCount = users?.length || 0;
  const historyCount = subscriptionHistory?.length || 0;

  const tabs = [
    { key: 'canonical', label: 'Current Paid Subscriptions', count: canonicalCount },
    { key: 'users', label: 'Current Paying Users', count: usersCount },
    { key: 'history', label: 'Subscription History', count: historyCount },
  ];

  const activeCount = view === 'canonical' ? filteredCanonical.length : view === 'users' ? filteredUsers.length : filteredHistory.length;
  const totalCount = view === 'canonical' ? canonicalCount : view === 'users' ? usersCount : historyCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-[#8b6239]/40 overflow-hidden flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setView(tab.key); setStatusFilter('all'); }}
              className={`px-3 py-1.5 text-sm whitespace-nowrap ${view === tab.key ? 'bg-[#D4A574] text-[#140f0c] font-semibold' : 'bg-[#140f0c] text-[#E0D8C8]'}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search email or ID…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-[#8b6239]/40 bg-[#140f0c] text-[#E0D8C8] text-sm px-3 py-1.5 min-w-[180px]"
        />
        {view === 'users' && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[#8b6239]/40 bg-[#140f0c] text-[#E0D8C8] text-sm px-3 py-1.5">
            <option value="all">All users</option>
            <option value="paying">Paying</option>
            <option value="entitled">Entitled</option>
            <option value="free">Free</option>
            <option value="synthetic">Synthetic</option>
          </select>
        )}
        {view === 'history' && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[#8b6239]/40 bg-[#140f0c] text-[#E0D8C8] text-sm px-3 py-1.5">
            <option value="all">All rows</option>
            <option value="paying">Currently Paying</option>
            <option value="expired">Expired Period</option>
            <option value="fallback">Fallback Rows</option>
          </select>
        )}
        <span className="text-xs text-[#E0D8C8]/50">Showing {activeCount} of {totalCount}</span>
      </div>

      {view === 'canonical' ? (
        <CanonicalSubscriptionsTable rows={filteredCanonical} />
      ) : view === 'users' ? (
        <UserTable rows={filteredUsers} />
      ) : (
        <SubscriptionHistoryTable rows={filteredHistory} />
      )}
    </div>
  );
}

function fmtDate(v) { return v ? new Date(v).toLocaleDateString() : '-'; }
function fmtMoney(v) { return v != null ? `$${Number(v).toFixed(2)}` : '-'; }

function CanonicalSubscriptionsTable({ rows }) {
  const cols = [
    { key: 'email', label: 'Email' },
    { key: 'provider', label: 'Provider' },
    { key: 'normalized_product', label: 'Product' },
    { key: 'current_status', label: 'Status' },
    { key: 'first_paid_at', label: 'First Paid', fmt: fmtDate },
    { key: 'latest_successful_payment_at', label: 'Latest Payment', fmt: fmtDate },
    { key: 'current_period_end', label: 'Period End', fmt: fmtDate },
    { key: 'amount', label: 'Amount', fmt: fmtMoney },
    { key: 'interval', label: 'Interval' },
    { key: 'source_records_count', label: 'Src Records' },
    { key: 'account_classification', label: 'Account Type' },
  ];
  return (
    <div className="rounded-xl border border-[#8b6239]/25 overflow-auto max-h-[600px]">
      <table className="w-full text-xs">
        <thead className="bg-[#2a1f18] sticky top-0">
          <tr>{cols.map((c) => <th key={c.key} className="text-left px-2 py-2 text-[#E0D8C8]/70 whitespace-nowrap">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="px-3 py-4 text-[#E0D8C8]/50 text-center">No canonical paid subscriptions</td></tr>
          ) : rows.map((row, i) => {
            const isTest = row.account_classification && row.account_classification !== 'production_customer';
            return (
              <tr key={i} className="border-t border-[#8b6239]/15">
                {cols.map((c) => (
                  <td key={c.key} className={`px-2 py-1.5 font-mono whitespace-nowrap ${isTest ? 'text-yellow-300/80' : 'text-[#E0D8C8]/80'}`}>
                    {c.fmt ? c.fmt(row[c.key]) : (String(row[c.key] ?? '-') || '-')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubscriptionHistoryTable({ rows }) {
  const cols = [
    { key: 'email', label: 'Email' },
    { key: 'provider', label: 'Provider' },
    { key: 'product', label: 'Product' },
    { key: 'normalized_status', label: 'Status' },
    { key: 'is_currently_paying', label: 'Current?', fmt: (v) => v ? '✓' : '—' },
    { key: 'is_expired_period', label: 'Expired Period', fmt: (v) => v ? '✓' : '—' },
    { key: 'is_fallback', label: 'Fallback', fmt: (v) => v ? '✓' : '—' },
    { key: 'current_period_end', label: 'Period End', fmt: fmtDate },
    { key: 'amount', label: 'Amount', fmt: fmtMoney },
    { key: 'reconciliation_issues', label: 'Issues' },
  ];
  return (
    <div className="rounded-xl border border-[#8b6239]/25 overflow-auto max-h-[600px]">
      <table className="w-full text-xs">
        <thead className="bg-[#2a1f18] sticky top-0">
          <tr>{cols.map((c) => <th key={c.key} className="text-left px-2 py-2 text-[#E0D8C8]/70 whitespace-nowrap">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="px-3 py-4 text-[#E0D8C8]/50 text-center">No subscription history records</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className={`border-t border-[#8b6239]/15 ${row.is_expired_period ? 'bg-yellow-900/5' : ''}`}>
              {cols.map((c) => (
                <td key={c.key} className="px-2 py-1.5 text-[#E0D8C8]/80 font-mono whitespace-nowrap">
                  {c.fmt ? c.fmt(row[c.key]) : (String(row[c.key] ?? '-') || '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserTable({ rows }) {
  const cols = [
    { key: 'email', label: 'Email' },
    { key: 'created_at', label: 'Created', fmt: fmtDate },
    { key: 'last_real_activity', label: 'Last Activity', fmt: fmtDate },
    { key: 'current_payment_status', label: 'Payment' },
    { key: 'provider', label: 'Provider' },
    { key: 'products', label: 'Products' },
    { key: 'first_paid_at', label: 'First Paid', fmt: fmtDate },
    { key: 'first_paid_source', label: 'First Paid Source' },
    { key: 'matching_confidence', label: 'Match' },
    { key: 'data_quality_status', label: 'Quality' },
  ];
  return (
    <div className="rounded-xl border border-[#8b6239]/25 overflow-auto max-h-[600px]">
      <table className="w-full text-xs">
        <thead className="bg-[#2a1f18] sticky top-0">
          <tr>{cols.map((c) => <th key={c.key} className="text-left px-2 py-2 text-[#E0D8C8]/70 whitespace-nowrap">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="px-3 py-4 text-[#E0D8C8]/50 text-center">No matching users</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className={`border-t border-[#8b6239]/15 ${row.is_synthetic ? 'bg-yellow-900/5' : ''}`}>
              {cols.map((c) => (
                <td key={c.key} className="px-2 py-1.5 text-[#E0D8C8]/80 font-mono whitespace-nowrap" title={String(row[c.key] ?? '')}>
                  {c.fmt ? c.fmt(row[c.key]) : (String(row[c.key] ?? '-') || '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}