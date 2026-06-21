/**
 * ReferralAdminReport - admin-only referral analytics page
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { AlertCircle, RefreshCw, AlertTriangle, TrendingUp, CreditCard, Smartphone, Gift, Activity, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';

function Tile({ label, value, warn }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? 'border-yellow-700/40 bg-yellow-900/10' : 'border-[#8b6239]/25 bg-[#1f1712]/70'}`}>
      <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/50">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${warn ? 'text-yellow-300' : 'text-[#F5F1E7]'}`}>{value}</p>
    </div>
  );
}

export default function ReferralAdminReport() {
  const { t } = useTranslation();
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
          <AlertCircle className="w-5 h-5" /> {t("auto.pages_ReferralAdminReport.admin_access_required_1yiv4j")}
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
            <h1 className="text-2xl font-bold text-[#F5F1E7]">{t("auto.pages_ReferralAdminReport.referral_program_admin_report_porbft")}</h1>
            {data?.generatedAt && (
              <p className="text-xs text-[#E0D8C8]/40 mt-1">{t("auto.pages_ReferralAdminReport.generated_yyi5h0")} {new Date(data.generatedAt).toLocaleString()}</p>
            )}
          </div>
          <Button onClick={load} variant="outline" className="border-[#8b6239]/40 text-[#E0D8C8] gap-2">
            <RefreshCw className="w-4 h-4" /> {t("auto.pages_ReferralAdminReport.refresh_183tk5")}
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-800/40 bg-red-900/10 text-red-300 text-sm">{error}</div>
        )}

        {data && (
          <>
            {/* ── Abuse Protection Metrics ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide border-b border-[#8b6239]/25 pb-1 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> {t("auto.pages_ReferralAdminReport.abuse_protection_metrics_xs8drn")}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Tile label="Total Invites Sent" value={data.shareActions?.invites_sent ?? data.funnel?.invites_sent ?? 0} />
                <Tile label="Conversions (Qualified)" value={data.funnel?.qualified ?? 0} />
                <Tile label="Rewards Granted" value={data.rewards?.totalCreditsGranted ?? 0} />
                <Tile
                  label="Suspicious Accounts"
                  value={(data.funnel?.fraud_flagged ?? 0) + (data.funnel?.manual_review_pending ?? 0)}
                  warn={(data.funnel?.fraud_flagged ?? 0) + (data.funnel?.manual_review_pending ?? 0) > 0}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Tile label="Self-Referrals Blocked" value={data.abuseStats?.selfReferralsBlocked ?? '—'} />
                <Tile label="Cooldown Blocks (90d)" value={data.abuseStats?.cooldownBlocks ?? '—'} />
                <Tile label="Monthly Cap Hits" value={data.abuseStats?.monthlyCapHits ?? '—'} warn={(data.abuseStats?.monthlyCapHits ?? 0) > 0} />
                <Tile label="Reward Cap Blocks" value={data.abuseStats?.rewardCapBlocks ?? '—'} warn={(data.abuseStats?.rewardCapBlocks ?? 0) > 0} />
              </div>
            </section>

            {/* Expiry job health */}
            <section className={`rounded-xl border p-4 space-y-2 ${
              data.expiryJobHealth?.isStale
                ? 'border-red-700/40 bg-red-900/10'
                : 'border-emerald-700/30 bg-emerald-900/10'
            }`}>
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${data.expiryJobHealth?.isStale ? 'text-red-400' : 'text-emerald-400'}`} />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#F5F1E7]">
                  {t("auto.pages_ReferralAdminReport.expiry_job_health_5vqywn")}
                </h2>
                {data.expiryJobHealth?.isStale && (
                  <span className="ml-2 text-xs font-bold text-red-400 uppercase">{t("auto.pages_ReferralAdminReport.stale_never_run_y5t7z6")}</span>
                )}
                {!data.expiryJobHealth?.isStale && (
                  <span className="ml-2 text-xs font-medium text-emerald-400">{t("auto.pages_ReferralAdminReport.running_1ncfhj")}</span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                <Tile
                  label="Last Run"
                  value={data.expiryJobHealth?.lastRunAt
                    ? new Date(data.expiryJobHealth.lastRunAt).toLocaleString()
                    : 'Never'}
                  warn={!data.expiryJobHealth?.lastRunAt}
                />
                <Tile
                  label="Records Expired"
                  value={data.expiryJobHealth?.lastExpiredCount ?? '—'}
                />
                <Tile
                  label="Users Resynced"
                  value={data.expiryJobHealth?.lastSyncedCount ?? '—'}
                />
                <div className={`rounded-xl border p-4 ${data.expiryJobHealth?.isStale ? 'border-red-700/40 bg-red-900/10' : 'border-[#8b6239]/25 bg-[#1f1712]/70'}`}>
                  <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/50">{t("auto.pages_ReferralAdminReport.scheduler_l84n7o")}</p>
                  <p className="text-xs text-[#E0D8C8]/70 mt-1 leading-snug">
                    {data.expiryJobHealth?.schedulerNote || 'See .github/workflows/expire-referral-access.yml'}
                  </p>
                </div>
              </div>
            </section>

            {/* Share actions summary */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide border-b border-[#8b6239]/25 pb-1">{t("auto.pages_ReferralAdminReport.referrer_share_actions_sqmw9y")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Invites Sent', data.shareActions?.invites_sent ?? data.funnel.invites_sent ?? 0],
                  ['Links Copied', data.shareActions?.links_copied ?? 0],
                  ['Shares Opened', data.shareActions?.shares_opened ?? 0],
                  ['Recipient Clicks', data.shareActions?.recipient_clicks ?? data.funnel.recipient_clicks ?? 0],
                ].map(([label, val]) => (
                  <Tile key={label} label={label} value={val} />
                ))}
              </div>
            </section>

            {/* Conversion funnel */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide border-b border-[#8b6239]/25 pb-1">{t("auto.pages_ReferralAdminReport.conversion_funnel_1atru0")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                  ['Signed Up', data.funnel.signed_up],
                  ['Activated', data.funnel.activated],
                  ['Qualified', data.funnel.qualified],
                  ['Rewarded', data.funnel.rewarded],
                  ['Rejected', data.funnel.rejected],
                  ['Fraud Flagged', data.funnel.fraud_flagged],
                  ['Manual Review', data.funnel.manual_review_pending],
                  ['Total Events', data.funnel.total_events],
                ].map(([label, val]) => (
                  <Tile key={label} label={label} value={val}
                    warn={(label === 'Fraud Flagged' || label === 'Manual Review') && val > 0} />
                ))}
              </div>
            </section>

            {/* Rewards */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide border-b border-[#8b6239]/25 pb-1">{t("auto.pages_ReferralAdminReport.rewards_issued_r2fydm")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Tile label="Credits Granted" value={data.rewards.totalCreditsGranted} />
                <Tile label="Total Months Granted" value={data.rewards.totalMonthsGranted} />
                <Tile label="Pending Credits" value={data.rewards.pendingCredits} warn={data.rewards.pendingCredits > 0} />
                <Tile label="Applied Credits" value={data.rewards.appliedCredits} />
              </div>
            </section>

            {/* Manual review queue */}
            {data.manualReviewQueue?.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide border-b border-amber-800/30 pb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {t("auto.pages_ReferralAdminReport.manual_review_queue_s1xz6q")}{data.manualReviewQueue.length})
                </h2>
                <p className="text-xs text-[#E0D8C8]/50">{t("auto.pages_ReferralAdminReport.these_referrals_have_a_fraud_score_zryjgp")}</p>
                <div className="rounded-xl border border-amber-800/30 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#2a1f18]">
                      <tr>
                        {['Referrer', 'Referred', 'Score', 'Reason', 'Status'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-[#E0D8C8]/60">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.manualReviewQueue.map((f, i) => (
                        <tr key={i} className="border-t border-amber-800/15">
                          <td className="px-3 py-2 text-[#E0D8C8]/80 font-mono">{f.referrerEmail}</td>
                          <td className="px-3 py-2 text-[#E0D8C8]/80 font-mono">{f.referredEmail}</td>
                          <td className="px-3 py-2 text-amber-300 font-bold">{f.fraudScore}</td>
                          <td className="px-3 py-2 text-[#E0D8C8]/60 max-w-[200px] truncate">{f.fraudReason}</td>
                          <td className="px-3 py-2 text-[#E0D8C8]/80">{f.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Fraud flags */}
            {data.fraudFlags.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide border-b border-yellow-800/30 pb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {t("auto.pages_ReferralAdminReport.fraud_flagged_npc4g9")}{data.fraudFlags.length})
                </h2>
                <p className="text-xs text-[#E0D8C8]/50">{t("auto.pages_ReferralAdminReport.note_ios_referrals_are_never_penalized_4beoew")}</p>
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
                          <td className="px-3 py-2">{f.manualReview ? <span className="text-yellow-400">{t("auto.pages_ReferralAdminReport.yes_1i3z7c")}</span> : '—'}</td>
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
                <TrendingUp className="w-4 h-4" /> {t("auto.pages_ReferralAdminReport.top_referrers_1d44ah")}
              </h2>
              <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#2a1f18]">
                    <tr>
                      {['Email', 'Invites Sent', 'Recipient Clicks', 'Qualified', 'Rewarded'].map(h => (
                       <th key={h} className="text-left px-3 py-2 text-[#E0D8C8]/70 font-semibold">{h}</th>
                      ))}
                      </tr>
                      </thead>
                      <tbody>
                      {data.topReferrers.map((r, i) => (
                      <tr key={i} className="border-t border-[#8b6239]/15 hover:bg-white/[0.02]">
                       <td className="px-3 py-2 font-mono text-xs text-[#E0D8C8]/90">{r.email}</td>
                       <td className="px-3 py-2 text-[#E0D8C8]/80">{r.invitesSent}</td>
                       <td className="px-3 py-2 text-[#E0D8C8]/80">{r.recipientClicks}</td>
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
                <Gift className="w-4 h-4" /> {t("auto.pages_ReferralAdminReport.reward_ledger_by_provider_15rhx1")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Referral Earned (free users — non-revenue) */}
                {data.rewards.referralEarned && (
                  <div className="rounded-xl border border-emerald-800/30 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F1E7] mb-1">
                      <Gift className="w-4 h-4 text-emerald-400" /> {t("auto.pages_ReferralAdminReport.referral_earned_access_1zq67a")}
                    </div>
                    <p className="text-xs text-emerald-300/60 mb-2">{t("auto.pages_ReferralAdminReport.free_users_not_revenue_1l2m1x")}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ['Total', data.rewards.referralEarned.total],
                        ['Pending Selection', data.rewards.referralEarned.pendingModuleSelection],
                        ['Active', data.rewards.referralEarned.active],
                        ['Expired', data.rewards.referralEarned.expired],
                      ].map(([label, val]) => (
                        <Tile key={label} label={label} value={val} />
                      ))}
                    </div>
                    {Object.keys(data.rewards.referralEarned.byModule || {}).length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-[#E0D8C8]/40 uppercase tracking-wide">{t("auto.pages_ReferralAdminReport.by_module_2ppye")}</p>
                        {Object.entries(data.rewards.referralEarned.byModule).map(([mod, count]) => (
                          <div key={mod} className="flex justify-between text-xs">
                            <span className="text-[#E0D8C8]/70 capitalize">{mod}</span>
                            <span className="text-emerald-300 font-bold">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Stripe */}
                <div className="rounded-xl border border-[#8b6239]/25 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F1E7] mb-2">
                    <CreditCard className="w-4 h-4 text-[#D4A574]" /> {t("auto.pages_ReferralAdminReport.stripe_rewards_15wec2")}
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
                    <Smartphone className="w-4 h-4 text-[#D4A574]" /> {t("auto.pages_ReferralAdminReport.app_store_ios_rewards_5cupif")}
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
                <h2 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide border-b border-[#8b6239]/25 pb-1">{t("auto.pages_ReferralAdminReport.reward_audit_trail_1tzj67")}</h2>
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
                              r.status === 'ready_to_apply' ? 'text-emerald-300' :
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

            {/* Earned Access audit (free users — non-revenue) */}
            {data.earnedAccessAudit?.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide border-b border-emerald-800/30 pb-1 flex items-center gap-2">
                  <Gift className="w-4 h-4" /> {t("auto.pages_ReferralAdminReport.referral_earned_access_records_5kkb1c")}{data.earnedAccessAudit.length})
                </h2>
                <p className="text-xs text-[#E0D8C8]/40">{t("auto.pages_ReferralAdminReport.these_are_non_revenue_access_grants_1itt2w")}</p>
                <div className="rounded-xl border border-emerald-800/25 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#1a2a1f]">
                      <tr>
                        {['User', 'Module', 'Reward Type', 'Months', 'Status', 'Granted', 'Activated', 'Expires'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-[#E0D8C8]/60">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.earnedAccessAudit.map((a) => (
                        <tr key={a.id} className="border-t border-emerald-800/15 hover:bg-white/[0.02]">
                          <td className="px-3 py-2 font-mono text-[#E0D8C8]/80 max-w-[130px] truncate">{a.userEmail}</td>
                          <td className="px-3 py-2 text-emerald-300 capitalize">{a.module || <span className="text-amber-400">pending</span>}</td>
                          <td className="px-3 py-2 text-[#D4A574]">{a.rewardType}</td>
                          <td className="px-3 py-2 text-[#E0D8C8]/70">{a.monthsGranted}</td>
                          <td className="px-3 py-2">
                            <span className={`font-medium ${
                              a.status === 'active' ? 'text-green-400' :
                              a.status === 'pending_module_selection' ? 'text-amber-400' :
                              a.status === 'expired' ? 'text-[#6b7280]' :
                              'text-[#E0D8C8]/60'
                            }`}>{a.status}</span>
                          </td>
                          <td className="px-3 py-2 text-[#E0D8C8]/60">{a.grantedAt ? new Date(a.grantedAt).toLocaleDateString() : '—'}</td>
                          <td className="px-3 py-2 text-[#E0D8C8]/60">{a.activatedAt ? new Date(a.activatedAt).toLocaleDateString() : '—'}</td>
                          <td className="px-3 py-2 text-[#E0D8C8]/60">{a.endAt ? new Date(a.endAt).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Per-user program summary */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide border-b border-[#8b6239]/25 pb-1">{t("auto.pages_ReferralAdminReport.all_referral_programs_1mubdk")}</h2>
              <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#2a1f18]">
                    <tr>
                      {['Email', 'Code', 'Invites Sent', 'Links Copied', 'Shares', 'Clicks', 'Qualified', 'Free Months', 'Pending'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[#E0D8C8]/70 font-semibold text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.programs.map((p, i) => (
                      <tr key={i} className="border-t border-[#8b6239]/15 hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-mono text-xs text-[#E0D8C8]/90">{p.userEmail}</td>
                         <td className="px-3 py-2 font-mono text-xs text-[#D4A574]">{p.code}</td>
                         <td className="px-3 py-2 text-[#E0D8C8]/80">{p.invitesSent}</td>
                         <td className="px-3 py-2 text-[#E0D8C8]/80">{p.linksCopied}</td>
                         <td className="px-3 py-2 text-[#E0D8C8]/80">{p.sharesOpened}</td>
                         <td className="px-3 py-2 text-[#E0D8C8]/80">{p.recipientClicks}</td>
                         <td className="px-3 py-2 text-[#E0D8C8]/80">{p.qualifiedReferrals}</td>
                         <td className="px-3 py-2 text-[#E0D8C8]/80">{p.earnedFreeMonths}</td>
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