/**
 * ReferralAdminReport - admin-only referral analytics page
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { AlertCircle, RefreshCw, AlertTriangle, TrendingUp, CreditCard, Smartphone, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

function Tile({ label, value, warn }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? 'border-yellow-700/40 bg-yellow-900/10' : 'border-[#8b6239]/25 bg-[#1f1712]/70'}`}>
      <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/50">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${warn ? 'text-yellow-300' : 'text-[#F5F1E7]'}`}>{value}</p>
    </div>
  );
}

export default function ReferralAdminReport() {
  const { user, isLoading } = useCurrentUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('getReferralAdminReport', {});
      setData(res?.data);
    } catch (err) {
      setError(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!isLoading && user?.role === 'admin') load(); }, [isLoading, user]);

  if (!isLoading && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#140f0c' }}>
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" /> Admin access required
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#140f0c' }}>
        <div className="w-8 h-8 border-4 border-[#D4A574]/30 border-t-[#D4A574] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#140f0c' }}>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F1E7]">Referral Program — Admin Report</h1>
            {data?.generatedAt && (
              <p className="text-xs text-[#E0D8C8]/40 mt-1">Generated {new Date(data.generatedAt).toLocaleString()}</p>
            )}
          </div>
          <Button onClick={load} variant="outline" className="border-[#8b6239]/40 text-[#E0D8C8] gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-800/40 bg-red-900/10 text-red-300 text-sm">{error}</div>
        )}

        {data && (
          <>
            {/* Funnel */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide border-b border-[#8b6239]/25 pb-1">Referral Funnel</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                  ['Invited', data.funnel.invited],
                  ['Clicked', data.funnel.clicked],
                  ['Signed Up', data.funnel.signed_up],
                  ['Activated', data.funnel.activated],
                  ['Qualified', data.funnel.qualified],
                  ['Rewarded', data.funnel.rewarded],
                  ['Rejected', data.funnel.rejected],
                  ['Fraud', data.funnel.fraud_flagged],
                ].map(([label, val]) => (
                  <Tile key={label} label={label} value={val} warn={label === 'Fraud' && val > 0} />
                ))}
              </div>
            </section>

            {/* Rewards */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide border-b border-[#8b6239]/25 pb-1">Rewards Issued</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Tile label="Credits Granted" value={data.rewards.totalCreditsGranted} />
                <Tile label="Total Months Granted" value={data.rewards.totalMonthsGranted} />
                <Tile label="Pending Credits" value={data.rewards.pendingCredits} warn={data.rewards.pendingCredits > 0} />
                <Tile label="Applied Credits" value={data.rewards.appliedCredits} />
              </div>
            </section>

            {/* Fraud flags */}
            {data.fraudFlags.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide border-b border-yellow-800/30 pb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Fraud / Manual Review ({data.fraudFlags.length})
                </h2>
                <div className="rounded-xl border border-yellow-800/30 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#2a1f18]">
                      <tr>
                        {['Referrer', 'Referred', 'Score', 'Reason', 'Status', 'Manual'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-[#E0D8C8]/60">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.fraudFlags.map((f, i) => (
                        <tr key={i} className="border-t border-yellow-800/15">
                          <td className="px-3 py-2 text-[#E0D8C8]/80 font-mono">{f.referrerEmail}</td>
                          <td className="px-3 py-2 text-[#E0D8C8]/80 font-mono">{f.referredEmail}</td>
                          <td className="px-3 py-2 text-yellow-300 font-bold">{f.fraudScore}</td>
                          <td className="px-3 py-2 text-[#E0D8C8]/60 max-w-[200px] truncate">{f.fraudReason}</td>
                          <td className="px-3 py-2 text-[#E0D8C8]/80">{f.status}</td>
                          <td className="px-3 py-2">{f.manualReview ? <span className="text-yellow-400">⚠ Yes</span> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Top referrers */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide border-b border-[#8b6239]/25 pb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Top Referrers
              </h2>
              <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#2a1f18]">
                    <tr>
                      {['Email', 'Invited', 'Qualified', 'Rewarded'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[#E0D8C8]/70 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.topReferrers.map((r, i) => (
                      <tr key={i} className="border-t border-[#8b6239]/15 hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-mono text-xs text-[#E0D8C8]/90">{r.email}</td>
                        <td className="px-3 py-2 text-[#E0D8C8]/80">{r.invited}</td>
                        <td className="px-3 py-2 text-[#E0D8C8]/80">{r.qualified}</td>
                        <td className="px-3 py-2 text-[#E0D8C8]/80">{r.rewarded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Reward ledger by provider */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide border-b border-[#8b6239]/25 pb-1 flex items-center gap-2">
                <Gift className="w-4 h-4" /> Reward Ledger by Provider
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Stripe */}
                <div className="rounded-xl border border-[#8b6239]/25 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F1E7] mb-2">
                    <CreditCard className="w-4 h-4 text-[#D4A574]" /> Stripe Rewards
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Total', data.rewards.stripe?.total || 0],
                      ['Pending', data.rewards.stripe?.pending || 0],
                      ['Applied', data.rewards.stripe?.applied || 0],
                      ['Failed', data.rewards.stripe?.failed || 0],
                    ].map(([label, val]) => (
                      <Tile key={label} label={label} value={val} warn={label === 'Failed' && val > 0} />
                    ))}
                  </div>
                </div>
                {/* iOS */}
                <div className="rounded-xl border border-[#8b6239]/25 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F1E7] mb-2">
                    <Smartphone className="w-4 h-4 text-[#D4A574]" /> App Store (iOS) Rewards
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Total', data.rewards.ios?.total || 0],
                      ['Awaiting', data.rewards.ios?.awaitingRedemption || 0],
                      ['Redeemed', data.rewards.ios?.redeemed || 0],
                      ['Failed', data.rewards.ios?.failed || 0],
                    ].map(([label, val]) => (
                      <Tile key={label} label={label} value={val} warn={label === 'Failed' && val > 0} />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Reward audit trail */}
            {data.rewardAudit?.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide border-b border-[#8b6239]/25 pb-1">Reward Audit Trail</h2>
                <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#2a1f18]">
                      <tr>
                        {['User', 'Type', 'Fixed Value', 'Provider', 'Status', 'Granted', 'Applied/Redeemed', 'Ref', 'Attempts', 'Failure'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-[#E0D8C8]/60">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rewardAudit.map((r) => (
                        <tr key={r.id} className="border-t border-[#8b6239]/15 hover:bg-white/[0.02]">
                          <td className="px-3 py-2 font-mono text-[#E0D8C8]/80 max-w-[130px] truncate">{r.userEmail}</td>
                          <td className="px-3 py-2 text-[#D4A574]">{r.rewardType}</td>
                          <td className="px-3 py-2 text-[#E0D8C8]/70 font-mono">
                            {r.rewardType === 'free_year' ? '$29.99' : '$2.99'}
                          </td>
                          <td className="px-3 py-2 text-[#E0D8C8]/70">{r.provider}</td>
                          <td className="px-3 py-2">
                            <span className={`font-medium ${
                              r.status === 'applied' || r.status === 'redeemed' ? 'text-green-400' :
                              r.status === 'failed' ? 'text-red-400' :
                              r.status === 'awaiting_user_redemption' ? 'text-amber-400' :
                              'text-[#E0D8C8]/70'
                            }`}>{r.status}</span>
                          </td>
                          <td className="px-3 py-2 text-[#E0D8C8]/60">{r.grantedAt ? new Date(r.grantedAt).toLocaleDateString() : '—'}</td>
                          <td className="px-3 py-2 text-[#E0D8C8]/60">{r.appliedAt ? new Date(r.appliedAt).toLocaleDateString() : r.redeemedAt ? new Date(r.redeemedAt).toLocaleDateString() : '—'}</td>
                          <td className="px-3 py-2 font-mono text-[#E0D8C8]/50 max-w-[100px] truncate" title={r.providerRef}>{r.providerRef || '—'}</td>
                          <td className="px-3 py-2 text-[#E0D8C8]/60">{r.attempts}</td>
                          <td className="px-3 py-2 text-red-400/80 max-w-[150px] truncate" title={r.failureReason}>{r.failureReason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Per-user program summary */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide border-b border-[#8b6239]/25 pb-1">All Referral Programs</h2>
              <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#2a1f18]">
                    <tr>
                      {['Email', 'Code', 'Sent', 'Qualified', 'Free Months', 'Free Years', 'Pending'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[#E0D8C8]/70 font-semibold text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.programs.map((p, i) => (
                      <tr key={i} className="border-t border-[#8b6239]/15 hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-mono text-xs text-[#E0D8C8]/90">{p.userEmail}</td>
                        <td className="px-3 py-2 font-mono text-xs text-[#D4A574]">{p.code}</td>
                        <td className="px-3 py-2 text-[#E0D8C8]/80">{p.totalReferrals}</td>
                        <td className="px-3 py-2 text-[#E0D8C8]/80">{p.qualifiedReferrals}</td>
                        <td className="px-3 py-2 text-[#E0D8C8]/80">{p.earnedFreeMonths}</td>
                        <td className="px-3 py-2 text-[#E0D8C8]/80">{p.earnedFreeYears}</td>
                        <td className="px-3 py-2 text-[#E0D8C8]/80">{p.pendingRewards}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}