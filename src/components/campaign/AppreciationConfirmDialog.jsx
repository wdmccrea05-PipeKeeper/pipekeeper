import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useAppreciationCampaign } from './useAppreciationCampaign';

const GOLD = '#D4A574';

/** Confirmation shown the moment the complimentary week begins. */
export default function AppreciationConfirmDialog({ open, onOpenChange, grant = null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { recordConfirmationView } = useAppreciationCampaign({ surface: 'activation_confirmation' });

  useEffect(() => {
    if (open) recordConfirmationView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const endsAt = grant?.expiresAt
    ? new Date(grant.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        style={{ background: 'linear-gradient(160deg, #241811 0%, #17100c 100%)', border: '1px solid rgba(212,165,116,0.35)' }}
      >
        <DialogHeader>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
            style={{ background: 'rgba(212,165,116,0.18)', border: '1px solid rgba(212,165,116,0.4)' }}
          >
            <Crown className="w-6 h-6" style={{ color: GOLD }} />
          </div>
          <DialogTitle
            className="text-2xl font-bold text-wrap-mobile"
            style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
          >
            {t('appreciation.confirmTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm text-wrap-mobile" style={{ color: 'rgba(224,216,200,0.8)' }}>
            {t('appreciation.confirmBody')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <p className="text-sm text-wrap-mobile" style={{ color: 'rgba(224,216,200,0.85)' }}>
            {t('appreciation.confirmDetail')}
          </p>
          <p className="text-sm text-wrap-mobile" style={{ color: 'rgba(224,216,200,0.7)' }}>
            {t('appreciation.confirmExplore')}
          </p>
          {endsAt && (
            <p className="text-xs font-semibold" style={{ color: GOLD }}>
              {t('appreciation.expiresOn', { date: endsAt })}
            </p>
          )}
          <p className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: GOLD }}>
            <Sparkles className="w-4 h-4" />
            {t('appreciation.confirmHappy')}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            onOpenChange(false);
            navigate('/CollectionHub');
          }}
          className="w-full mt-2 font-bold"
          style={{ background: 'linear-gradient(135deg, #E7C193, #C89A63)', color: '#241811', minHeight: 48 }}
        >
          {t('appreciation.confirmCta')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}