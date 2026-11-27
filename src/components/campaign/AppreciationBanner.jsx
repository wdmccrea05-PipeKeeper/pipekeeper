import React, { useEffect, useState } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import BrandLogo from '@/components/branding/BrandLogo';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useAppreciationCampaign } from './useAppreciationCampaign';
import AppreciationConfirmDialog from './AppreciationConfirmDialog';

const GOLD = '#D4A574';
const CREAM = '#F5F1E7';

/**
 * Hub promotional banner for the collector appreciation campaign.
 * Dismissible without forfeiting the offer — the offer stays available from
 * the profile, subscription screen and module dashboards.
 */
export default function AppreciationBanner({ surface = 'hub', className = '', preview = false }) {
  const { t } = useTranslation();
  const { showBanner, activate, dismiss, activating, activateError, recordImpression, isLoading, deadlineLabel } =
    useAppreciationCampaign({ surface });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [grant, setGrant] = useState(null);

  useEffect(() => {
    if (!preview && showBanner) recordImpression();
  }, [preview, showBanner, recordImpression]);

  if (!preview && (isLoading || !showBanner)) return null;

  const handleActivate = async () => {
    const result = await activate();
    if (result?.ok) {
      setGrant(result.grant || null);
      setConfirmOpen(true);
    }
  };

  return (
    <>
      <section
        className={`relative overflow-hidden rounded-[26px] ${className}`}
        style={{
          background:
            'radial-gradient(120% 140% at 12% 0%, rgba(212,165,116,0.22) 0%, rgba(38,26,18,0.96) 46%, rgba(20,15,12,0.99) 100%)',
          border: '1px solid rgba(212,165,116,0.34)',
          boxShadow: '0 22px 60px rgba(0,0,0,0.42)',
        }}
        aria-labelledby="appreciation-headline"
      >
        <button
          type="button"
          onClick={preview ? () => {} : dismiss}
          aria-label={t('appreciation.later')}
          className="absolute top-3 right-3 z-10 p-2 rounded-full"
          style={{ background: 'rgba(0,0,0,0.25)', color: 'rgba(245,241,231,0.7)' }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 sm:p-8 lg:p-10">
          <div className="flex items-center gap-3 mb-5">
            <BrandLogo compact showWordmark={false} imageClassName="w-10 h-10 sm:w-12 sm:h-12" />
            <span
              className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] px-3 py-1 rounded-full"
              style={{ background: 'rgba(212,165,116,0.16)', color: GOLD, border: '1px solid rgba(212,165,116,0.32)' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t('appreciation.badge')}
            </span>
          </div>

          <div
            className="mb-5 rounded-2xl px-4 py-3"
            style={{
              background: 'rgba(212,165,116,0.14)',
              border: '1px solid rgba(212,165,116,0.45)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <p className="text-sm sm:text-base font-bold text-wrap-mobile" style={{ color: CREAM }}>
              {t('appreciation.deadlineHeadline')}
            </p>
            <p className="text-xs sm:text-sm mt-1 text-wrap-mobile" style={{ color: GOLD }}>
              {t('appreciation.deadlineLine', { date: deadlineLabel })}
            </p>
          </div>

          <h2
            id="appreciation-headline"
            className="text-2xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.1] text-wrap-mobile"
            style={{ color: CREAM, fontFamily: "'Georgia', serif", letterSpacing: '-0.01em' }}
          >
            {t('appreciation.headline')}
          </h2>

          <div className="mt-4 space-y-3 max-w-2xl">
            <p className="text-sm sm:text-base text-wrap-mobile" style={{ color: 'rgba(245,241,231,0.82)' }}>
              {t('appreciation.intro')}
            </p>
            <p className="text-sm sm:text-base text-wrap-mobile" style={{ color: 'rgba(245,241,231,0.82)' }}>
              {t('appreciation.welcome')}
            </p>
            <p className="text-sm sm:text-base font-semibold text-wrap-mobile" style={{ color: GOLD }}>
              {t('appreciation.gift')}
            </p>
            <p className="text-sm sm:text-base text-wrap-mobile" style={{ color: 'rgba(245,241,231,0.78)' }}>
              {t('appreciation.discover')}
            </p>
          </div>

          <p
            className="mt-5 text-sm sm:text-base font-semibold text-wrap-mobile"
            style={{ color: CREAM, borderLeft: '2px solid rgba(212,165,116,0.6)', paddingLeft: '0.85rem' }}
          >
            {t('appreciation.promise')}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <Button
              type="button"
              onClick={preview ? () => {} : handleActivate}
              disabled={activating}
              className="w-full sm:w-auto font-bold"
              style={{
                background: 'linear-gradient(135deg, #E7C193, #C89A63)',
                color: '#241811',
                minHeight: 48,
                paddingInline: 26,
              }}
            >
              {activating ? t('appreciation.activating') : t('appreciation.activate')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={preview ? () => {} : dismiss}
              className="w-full sm:w-auto font-semibold"
              style={{ color: 'rgba(245,241,231,0.78)', minHeight: 48 }}
            >
              {t('appreciation.later')}
            </Button>
          </div>

          {activateError && (
            <p className="mt-3 text-xs" style={{ color: '#F0B9A8' }}>
              {activateError === 'redemption_deadline_passed'
                ? t('appreciation.deadlineClosed', { date: deadlineLabel })
                : activateError === 'activation_failed'
                  ? t('appreciation.activationFailed')
                  : t('appreciation.unavailable')}
            </p>
          )}

          <p className="mt-4 text-[11px] sm:text-xs" style={{ color: 'rgba(245,241,231,0.5)' }}>
            {t('appreciation.timing')}
          </p>
        </div>
      </section>

      <AppreciationConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} grant={grant} />
    </>
  );
}