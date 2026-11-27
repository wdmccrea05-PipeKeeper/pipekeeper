import React, { useState } from 'react';
import { Gift, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useAppreciationCampaign } from './useAppreciationCampaign';
import AppreciationConfirmDialog from './AppreciationConfirmDialog';

const GOLD = '#D4A574';

/**
 * Compact version of the offer for the profile, subscription screen, module
 * dashboards and the notification center. Stays available after the hub banner
 * is dismissed, and disappears once the offer is redeemed or the user pays.
 */
export default function AppreciationOfferCard({ surface = 'profile', className = '' }) {
  const { t } = useTranslation();
  const { showOffer, activate, activating, activateError, isLoading } = useAppreciationCampaign({ surface });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [grant, setGrant] = useState(null);

  if (isLoading || !showOffer) return null;

  const handleActivate = async () => {
    const result = await activate();
    if (result?.ok) {
      setGrant(result.grant || null);
      setConfirmOpen(true);
    }
  };

  return (
    <>
      <div
        className={`rounded-2xl p-4 sm:p-5 ${className}`}
        style={{
          background: 'linear-gradient(135deg, rgba(212,165,116,0.14), rgba(36,24,17,0.95))',
          border: '1px solid rgba(180,140,75,0.3)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,165,116,0.16)', border: '1px solid rgba(212,165,116,0.35)' }}
          >
            <Gift className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-wrap-mobile" style={{ color: '#F5F1E7' }}>
              {t('appreciation.offerCardTitle')}
            </p>
            <p className="text-xs sm:text-sm mt-1 text-wrap-mobile" style={{ color: 'rgba(224,216,200,0.78)' }}>
              {t('appreciation.offerCardBody')}
            </p>
            <Button
              type="button"
              onClick={handleActivate}
              disabled={activating}
              size="sm"
              className="mt-3 font-bold"
              style={{ background: 'linear-gradient(135deg, #E7C193, #C89A63)', color: '#241811', minHeight: 40 }}
            >
              {activating ? t('appreciation.activating') : t('appreciation.offerCardCta')}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
            {activateError && (
              <p className="mt-2 text-[11px]" style={{ color: '#F0B9A8' }}>
                {activateError === 'activation_failed'
                  ? t('appreciation.activationFailed')
                  : t('appreciation.unavailable')}
              </p>
            )}
          </div>
        </div>
      </div>

      <AppreciationConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} grant={grant} />
    </>
  );
}