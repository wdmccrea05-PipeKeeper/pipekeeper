import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Sparkles, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useAppreciationCampaign } from '@/components/campaign/useAppreciationCampaign';
import { useTranslation } from '@/components/i18n/safeTranslation';

const GOLD = '#D4A574';

function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* storage unavailable — notices simply repeat */
  }
}

/**
 * ComplimentaryProBanner — the single status surface for the 7-day welcome
 * window. Driven by the account-level expiration timestamp, so it survives
 * restarts, sign-outs and device changes. Hidden entirely for paying
 * subscribers: paid access always wins.
 */
export default function ComplimentaryProBanner({ className = '' }) {
  const { user, hasPaid, complimentary, isLoading } = useCurrentUser();
  // When the appreciation offer is on screen, the old "trial ended" card is
  // suppressed so the collector never sees two competing notices.
  const { showOffer: appreciationOfferVisible, expiredGrant: appreciationExpired } = useAppreciationCampaign({
    surface: 'status_card',
  });
  const { t } = useTranslation();
  const [expiredDismissed, setExpiredDismissed] = useState(true);

  const isAppreciation = complimentary?.kind === 'appreciation';
  const endsAt = complimentary?.endsAt || null;
  const email = user?.email || 'anon';
  const dismissKey = `ck_pro_trial_expired_dismissed_${email}_${endsAt || 'none'}`;

  useEffect(() => {
    setExpiredDismissed(readFlag(dismissKey));
  }, [dismissKey]);

  const active = !!complimentary?.active;
  const expired = !active && !!complimentary?.known && !!complimentary?.expired;

  // One-time milestone notices: three days, one day, and expiry.
  useEffect(() => {
    if (isLoading || !user || hasPaid) return;
    if (active) {
      const threshold = complimentary.daysRemaining <= 1 ? '1d' : complimentary.daysRemaining <= 3 ? '3d' : null;
      if (!threshold) return;
      const key = `ck_pro_trial_notice_${email}_${endsAt}_${threshold}`;
      if (readFlag(key)) return;
      writeFlag(key);
      toast(
        threshold === '1d'
          ? t('proTrial.noticeOneDay')
          : t('proTrial.noticeThreeDays', { count: complimentary.daysRemaining }),
        { description: t('proTrial.body') }
      );
      return;
    }
    if (expired) {
      const key = `ck_pro_trial_notice_${email}_${endsAt}_expired`;
      if (readFlag(key)) return;
      writeFlag(key);
      toast(t('proTrial.expiredTitle'), {
        description: t('proTrial.expiredBody'),
      });
    }
  }, [active, expired, isLoading, user, hasPaid, complimentary?.daysRemaining, endsAt, email, t]);

  if (isLoading || !user || hasPaid) return null;
  if (!active && !(expired && !expiredDismissed && !appreciationOfferVisible && !appreciationExpired)) return null;

  const formattedEnd = endsAt
    ? new Date(endsAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  const remainingLabel =
    complimentary.hoursRemaining <= 24
      ? t('proTrial.hoursLeft', { count: Math.max(1, complimentary.hoursRemaining) })
      : t('proTrial.daysLeft', { count: complimentary.daysRemaining });

  if (expired) {
    return (
      <div
        className={`rounded-2xl p-4 sm:p-5 mb-4 ${className}`}
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.22)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(180,140,75,0.12)', border: '1px solid rgba(180,140,75,0.25)' }}
          >
            <Crown className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-wrap-mobile" style={{ color: '#F5F1E7' }}>
              {t('proTrial.expiredTitle')}
            </p>
            <p className="text-xs mt-1 text-wrap-mobile" style={{ color: 'rgba(224,216,200,0.7)' }}>
              {t('proTrial.expiredBody')}
            </p>
            <Link
              to="/upgrade"
              className="inline-flex items-center gap-1.5 text-xs font-semibold mt-2"
              style={{ color: GOLD }}
            >
              {t('proTrial.upgrade')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <button
            type="button"
            aria-label={t('proTrial.dismiss')}
            onClick={() => {
              writeFlag(dismissKey);
              setExpiredDismissed(true);
            }}
            className="p-1.5 rounded-lg flex-shrink-0"
            style={{ color: 'rgba(224,216,200,0.55)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 mb-4 ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(212,165,116,0.16), rgba(42,30,20,0.9))',
        border: '1px solid rgba(180,140,75,0.35)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(212,165,116,0.18)', border: '1px solid rgba(212,165,116,0.4)' }}
        >
          <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] font-bold" style={{ color: GOLD }}>
            {isAppreciation ? t('appreciation.activeTitle') : t('proTrial.title')}
          </p>
          <p
            className="text-xl sm:text-2xl font-bold mt-0.5 text-wrap-mobile"
            style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
          >
            {remainingLabel}
          </p>
          <p className="text-xs sm:text-sm mt-1 text-wrap-mobile" style={{ color: 'rgba(224,216,200,0.75)' }}>
            {isAppreciation ? t('appreciation.activeSubtitle') : t('proTrial.body')}
          </p>
          {isAppreciation && (
            <p className="text-xs sm:text-sm mt-1 text-wrap-mobile" style={{ color: 'rgba(224,216,200,0.7)' }}>
              {t('appreciation.activeBody')}
            </p>
          )}
          {formattedEnd && (
            <p className="text-[11px] mt-1.5" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {t('proTrial.endsOn', { date: formattedEnd })}
            </p>
          )}
        </div>
        <Link
          to="/upgrade"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0"
          style={{ color: '#140f0c', background: GOLD }}
        >
          {t('proTrial.upgrade')}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}