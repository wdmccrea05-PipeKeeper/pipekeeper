import React, { useState } from 'react';
import { Bell, Gift, Sparkles, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useAppreciationCampaign } from './useAppreciationCampaign';
import AppreciationOfferCard from './AppreciationOfferCard';

const GOLD = '#D4A574';

/**
 * In-app notification entry for the appreciation campaign. Lives in the header
 * so the offer stays reachable after the hub banner is dismissed, without
 * interrupting the collector with another banner.
 */
export default function AppreciationNotificationCenter() {
  const { t } = useTranslation();
  const { isLoading, showOffer, activeGrant } = useAppreciationCampaign({ surface: 'notification_center' });
  const [open, setOpen] = useState(false);

  if (isLoading || (!showOffer && !activeGrant)) return null;

  const endsAt = activeGrant?.endsAt
    ? new Date(activeGrant.endsAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative text-[#E0D8C8] hover:bg-white/10 rounded-lg"
        style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        aria-label={t('appreciation.notifications')}
        title={t('appreciation.notifications')}
      >
        <Bell className="w-5 h-5" />
        {showOffer && (
          <span
            className="absolute rounded-full"
            style={{ width: 8, height: 8, top: 10, right: 10, background: GOLD }}
          />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-md"
          style={{ background: 'linear-gradient(160deg, #241811 0%, #17100c 100%)', border: '1px solid rgba(212,165,116,0.3)' }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold" style={{ color: '#F5F1E7' }}>
              {t('appreciation.notifications')}
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: 'rgba(224,216,200,0.65)' }}>
              {t('appreciation.notifSubtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {activeGrant && (
              <div
                className="rounded-xl p-3 flex items-start gap-3"
                style={{ background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.28)' }}
              >
                <Crown className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
                    {t('appreciation.activeTitle')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.72)' }}>
                    {activeGrant.daysRemaining > 1
                      ? t('proTrial.daysLeft', { count: activeGrant.daysRemaining })
                      : t('proTrial.hoursLeft', { count: Math.max(1, activeGrant.hoursRemaining) })}
                  </p>
                  {endsAt && (
                    <p className="text-[11px] mt-1" style={{ color: 'rgba(224,216,200,0.5)' }}>
                      {t('proTrial.endsOn', { date: endsAt })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {showOffer && (
              <>
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4" style={{ color: GOLD }} />
                  <p className="text-xs uppercase tracking-[0.12em] font-bold" style={{ color: GOLD }}>
                    {t('appreciation.badge')}
                  </p>
                </div>
                <AppreciationOfferCard surface="notification_center" />
              </>
            )}

            {!showOffer && !activeGrant && (
              <p className="text-sm flex items-center gap-2" style={{ color: 'rgba(224,216,200,0.6)' }}>
                <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
                {t('appreciation.notifEmpty')}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}