import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useAppreciationCampaign } from './useAppreciationCampaign';

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
    /* ignore */
  }
}

/**
 * Friendly end-of-week message, shown once per expired grant. No automatic
 * charge is ever involved: the collector chooses whether to continue with Pro.
 */
export default function AppreciationExpiredDialog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { expiredGrant, expiredKey, isLoading, recordExpiredNotice } = useAppreciationCampaign({
    surface: 'expiration',
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !expiredKey) return;
    if (readFlag(expiredKey)) return;
    writeFlag(expiredKey);
    setOpen(true);
    recordExpiredNotice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiredKey, isLoading]);

  if (!expiredGrant) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-lg"
        style={{ background: 'linear-gradient(160deg, #241811 0%, #17100c 100%)', border: '1px solid rgba(212,165,116,0.32)' }}
      >
        <DialogHeader>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
            style={{ background: 'rgba(212,165,116,0.16)', border: '1px solid rgba(212,165,116,0.36)' }}
          >
            <Crown className="w-6 h-6" style={{ color: GOLD }} />
          </div>
          <DialogTitle
            className="text-2xl font-bold text-wrap-mobile"
            style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
          >
            {t('appreciation.expiredTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm text-wrap-mobile" style={{ color: 'rgba(224,216,200,0.8)' }}>
            {t('appreciation.expiredBody')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-wrap-mobile" style={{ color: 'rgba(224,216,200,0.8)' }}>
            {t('appreciation.expiredSafe')}
          </p>
          <p className="text-sm font-semibold" style={{ color: GOLD }}>
            {t('appreciation.expiredHappy')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-1">
          <Button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/upgrade');
            }}
            className="flex-1 font-bold"
            style={{ background: 'linear-gradient(135deg, #E7C193, #C89A63)', color: '#241811', minHeight: 46 }}
          >
            {t('appreciation.expiredPrimary')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="flex-1 font-semibold"
            style={{ color: 'rgba(245,241,231,0.78)', minHeight: 46 }}
          >
            {t('appreciation.expiredSecondary')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}