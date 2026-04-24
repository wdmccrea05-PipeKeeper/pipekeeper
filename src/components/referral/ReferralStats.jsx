/**
 * ReferralStats
 * Grid of referral funnel stats for the subscriber dashboard.
 */
import React from 'react';
import { Users, UserCheck, Gift, Star } from 'lucide-react';

function StatTile({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 space-y-1">
      <div className="flex items-center gap-2 text-xs text-[#E0D8C8]/50 uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        {label}
      </div>
      <p className="text-2xl font-bold" style={{ color: '#F5F1E7' }}>{value}</p>
    </div>
  );
}

export default function ReferralStats({ program }) {
  if (!program) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatTile icon={Users} label="Invites Sent" value={program.total_referrals || 0} color="#D4A574" />
      <StatTile icon={UserCheck} label="Qualified" value={program.qualified_referrals || 0} color="#2e7d5c" />
      <StatTile icon={Gift} label="Free Months" value={program.earned_free_months || 0} color="#A35C5C" />
      <StatTile icon={Star} label="Free Years" value={program.earned_free_years || 0} color="#f59e0b" />
    </div>
  );
}