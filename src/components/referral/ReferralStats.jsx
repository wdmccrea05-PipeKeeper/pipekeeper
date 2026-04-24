/**
 * ReferralStats
 * Displays accurate per-action referral metrics.
 * Each metric means exactly one thing — no mixed event types.
 *
 * Metric semantics:
 *   invites_sent      — emails sent via the invite form
 *   links_copied      — referrer copied their link
 *   shares_opened     — referrer opened native share sheet
 *   recipient_clicks  — anonymous recipient clicked the referral URL
 *   qualified_referrals — conversions that cleared fraud checks
 *   earned_free_months  — free months earned (cumulative)
 *   pending_rewards     — rewards not yet applied/redeemed
 */
import React from 'react';
import { Mail, Copy, MousePointer, CheckCircle, Gift, Clock, Star } from 'lucide-react';

function StatTile({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#E0D8C8]/60 uppercase tracking-widest">
        <Icon className="w-4 h-4 shrink-0" style={{ color }} />
        {label}
      </div>
      <p className="text-3xl font-bold" style={{ color: '#F5F1E7' }}>{value ?? 0}</p>
    </div>
  );
}

export default function ReferralStats({ program }) {
  if (!program) return null;

  const tiles = [
    {
      icon: Mail,
      label: 'Invites Sent',
      value: program.invites_sent ?? program.total_referrals ?? 0,
      color: '#D4A574',
    },
    {
      icon: Copy,
      label: 'Links Copied',
      value: program.links_copied ?? 0,
      color: '#D4A574',
    },
    {
      icon: MousePointer,
      label: 'Recipient Clicks',
      value: program.recipient_clicks ?? 0,
      color: '#D4A574',
    },
    {
      icon: CheckCircle,
      label: 'Qualified',
      value: program.qualified_referrals ?? 0,
      color: '#2e7d5c',
    },
    {
      icon: Gift,
      label: 'Free Months Earned',
      value: program.earned_free_months ?? 0,
      color: '#D4A574',
    },
    {
      icon: Star,
      label: 'Free Years Earned',
      value: program.earned_free_years ?? 0,
      color: '#f59e0b',
    },
    {
      icon: Clock,
      label: 'Pending Rewards',
      value: program.pending_rewards ?? 0,
      color: program.pending_rewards > 0 ? '#f59e0b' : '#6b7280',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tiles.map(t => (
        <StatTile key={t.label} {...t} />
      ))}
    </div>
  );
}