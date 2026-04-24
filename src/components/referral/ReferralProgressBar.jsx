/**
 * ReferralProgressBar
 * Shows progress toward the next free month and free year milestones.
 */
import React from 'react';
import { Gift, Star } from 'lucide-react';

const REFERRALS_PER_FREE_MONTH = 1;
const MONTHS_PER_FREE_YEAR = 12;

export default function ReferralProgressBar({ program }) {
  if (!program) return null;

  const qualified = program.qualified_referrals || 0;
  // Since every referral earns a free month, show cumulative months earned toward the next year milestone
  const monthsEarned = program.earned_free_months || 0;
  const progressToNextMonth = REFERRALS_PER_FREE_MONTH === 1 ? 1 : (qualified % REFERRALS_PER_FREE_MONTH) / REFERRALS_PER_FREE_MONTH;

  const progressToYear = (qualified % MONTHS_PER_FREE_YEAR) / MONTHS_PER_FREE_YEAR;
  const nextYearTarget = MONTHS_PER_FREE_YEAR - (qualified % MONTHS_PER_FREE_YEAR);

  return (
    <div className="space-y-4">
      {/* Free month progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-base font-medium text-[#E0D8C8]">
            <Gift className="w-4 h-4 text-[#D4A574]" />
            <span>Free month</span>
          </div>
          <span className="text-sm text-[#E0D8C8]/60">
            {qualified % MONTHS_PER_FREE_YEAR}/{MONTHS_PER_FREE_YEAR} toward free year
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(progressToNextMonth * 100, 100)}%`,
              background: 'linear-gradient(90deg, #D4A574, #A35C5C)',
            }}
          />
        </div>
        <p className="text-sm text-[#E0D8C8]/50 mt-1.5">
          {monthsEarned > 0
            ? `✓ ${monthsEarned} free month${monthsEarned !== 1 ? 's' : ''} earned`
            : '1 qualified referral earns your first free month'}
        </p>
      </div>

      {/* Free year progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-base font-medium text-[#E0D8C8]">
            <Star className="w-4 h-4 text-amber-400" />
            <span>Free year</span>
          </div>
          <span className="text-sm text-[#E0D8C8]/60">
            {qualified % MONTHS_PER_FREE_YEAR}/{MONTHS_PER_FREE_YEAR} qualified referrals
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(progressToYear * 100, 100)}%`,
              background: 'linear-gradient(90deg, #f59e0b, #d97706)',
            }}
          />
        </div>
        <p className="text-sm text-[#E0D8C8]/50 mt-1.5">
          {(program.earned_free_years || 0) > 0
            ? `✓ ${program.earned_free_years} free year${program.earned_free_years !== 1 ? 's' : ''} earned`
            : `${nextYearTarget} more referral${nextYearTarget !== 1 ? 's' : ''} to a free year`}
        </p>
      </div>
    </div>
  );
}