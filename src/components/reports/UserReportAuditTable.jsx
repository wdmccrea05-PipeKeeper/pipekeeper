import React, { useMemo, useState } from 'react';

export default function UserReportAuditTable({ users, subscriptions }) {
  const [view, setView] = useState('users');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [matchedFilter, setMatchedFilter] = useState('all');

  const filteredUsers = useMemo(() => {
    return (users || []).filter((u) => {
      if (filter) {
        const q = filter.toLowerCase();
        if (!String(u.email || '').toLowerCase().includes(q) && !String(u.user_id || '').toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== 'all') {
        const isPaying = u.current_payment_status === 'paying';
        const isEntitled = u.current_entitlement === true;
        if (statusFilter === 'paying' && !isPaying) return false;
        if (statusFilter === 'entitled' && !isEntitled) return false;
        if (statusFilter === 'free' && (isPaying || isEntitled)) return false;
        if (statusFilter === 'synthetic' && !u.is_synthetic) return false;
      }
      if (matchedFilter !== 'all') {
        if (matchedFilter === 'matched' && u.matching_confidence !== 'matched') return false;
        if (matchedFilter === 'unmatched' && u.matching_confidence === 'matched') return false;
      }
      return true;
    });
  }, [users, filter, statusFilter, matchedFilter]);

  const filteredSubs = useMemo(() => {
    return (subscriptions || []).filter((s) => {
      if (filter) {
        const q = filter.toLowerCase();
        if (!String(s.email || '').toLowerCase().includes(q) && !String(s.canonical_subscription_id || '').toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'paying' && !s.is_currently_paying) return false;
        if (statusFilter === 'entitled' && !s.is_currently_entitled) return false;
        if (statusFilter === 'canceled' && s.normalized_status !== 'canceled' && s.normalized_status !== 'canceling_but_entitled') return false;
        if (statusFilter === 'expired' && s.normalized_status !== 'expired') return false;
      }
      if (matchedFilter !== 'all') {
        if (matchedFilter === 'matched' && !s.matched_to_user) return false;
        if (matchedFilter === 'unmatched' && s.matched_to_user) return false;
      }
      return true;
    });
  }, [subscriptions, filter, statusFilter, matchedFilter]);

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-[#8b6239]/40 overflow-hidden">
          <button
            onClick={() => setView('users')}
            className={`px-3 py-1.5 text-sm ${view === 'users' ? 'bg-[#D4A574] text-[#140f0c] font-semibold' : 'bg-[#140f0c] text-[#E0D8C8]'}`}
          >
            Users ({users?.length || 0})
          </button>
          <button
            onClick={() => setView('subscriptions')}
            className={`px-3 py-1.5 text-sm ${view === 'subscriptions' ? 'bg-[#D4A574] text-[#140f0c] font-semibold' : 'bg-[#140f0c] text-[#E0D8C8]'}`}
          >
            Subscriptions ({subscriptions?.length || 0})
          </button>
        </div>
        <input
          type="text"
          placeholder="Search email or ID…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-[#8b6239]/40 bg-[#140f0c] text-[#E0D8C8] text-sm px-3 py-1.5 min-w-[180px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[#8b6239]/40 bg-[#140f0c] text-[#E0D8C8] text-sm px-3 py-1.5"
        >
          <option value="all">All statuses</option>
          <option value="paying">Paying</option>
          <option value="entitled">Entitled</option>
          <option value="free">Free</option>
          <option value="synthetic">Synthetic</option>
          {view === 'subscriptions' && <option value="canceled">Canceled</option>}
          {view === 'subscriptions' && <option value="expired">Expired</option>}
        </select>
        <select
          value={matchedFilter}
          onChange={(e) => setMatchedFilter(e.target.value)}
          className="rounded-lg border border-[#8b6239]/40 bg-[#140f0c] text-[#E0D8C8] text-sm px-3 py-1.5"
        >
          <option value="all">All identities</option>
          <option value="matched">Matched only</option>
          <option value="unmatched">Unmatched only</option>
        </select>
        <span className="text-xs text-[#E0D8C8]/50">
          Showing {view === 'users' ? filteredUsers.length : filteredSubs.length} of {view === 'users' ? (users?.length || 0) : (subscriptions?.length || 0)}
        </span>
      </div>

      {view === 'users' ? (
        <UserTable rows={filteredUsers} />
      ) : (
        <SubscriptionTable rows={filteredSubs} />
      )}
    </div>
  );
}

function UserTable({ rows }) {
  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'created_at', label: 'Created', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    { key: 'last_real_activity', label: 'Last Activity', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    { key: 'current_payment_status', label: 'Payment' },
    { key: 'provider', label: 'Provider' },
    { key: 'products', label: 'Products' },
    { key: 'first_paid_at', label: 'First Paid', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    { key: 'first_paid_source', label: 'First Paid Source' },
    { key: 'matching_confidence', label: 'Match' },
    { key: 'data_quality_status', label: 'Quality' },
  ];
  return (
    <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
      <table className="w-full text-xs">
        <thead className="bg-[#2a1f18] sticky top-0">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left px-2 py-2 text-[#E0D8C8]/70 whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-3 py-4 text-[#E0D8C8]/50 text-center">No matching users</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className={`border-t border-[#8b6239]/15 ${row.is_synthetic ? 'bg-yellow-900/5' : ''}`}>
                {columns.map((c) => (
                  <td key={c.key} className="px-2 py-1.5 text-[#E0D8C8]/80 font-mono whitespace-nowrap" title={String(row[c.key] ?? '')}>
                    {c.format ? c.format(row[c.key]) : (String(row[c.key] ?? '-') || '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SubscriptionTable({ rows }) {
  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'provider', label: 'Provider' },
    { key: 'product', label: 'Product' },
    { key: 'normalized_status', label: 'Status' },
    { key: 'is_currently_paying', label: 'Paying', format: (v) => v ? '✓' : '—' },
    { key: 'first_paid_at', label: 'First Paid', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    { key: 'first_paid_source', label: 'Source' },
    { key: 'current_period_end', label: 'Period End', format: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    { key: 'amount', label: 'Amount', format: (v) => v != null ? `$${Number(v).toFixed(2)}` : '-' },
    { key: 'billing_interval', label: 'Interval' },
    { key: 'matched_to_user', label: 'Matched', format: (v) => v ? '✓' : '✗' },
    { key: 'reconciliation_issues', label: 'Issues' },
  ];
  return (
    <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
      <table className="w-full text-xs">
        <thead className="bg-[#2a1f18] sticky top-0">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left px-2 py-2 text-[#E0D8C8]/70 whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-3 py-4 text-[#E0D8C8]/50 text-center">No matching subscriptions</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-t border-[#8b6239]/15">
                {columns.map((c) => (
                  <td key={c.key} className="px-2 py-1.5 text-[#E0D8C8]/80 font-mono whitespace-nowrap">
                    {c.format ? c.format(row[c.key]) : (String(row[c.key] ?? '-') || '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}