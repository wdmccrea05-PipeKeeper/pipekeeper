/**
 * LockedModuleGuard — enforces module release state at the route level.
 *
 * Checks the canonical MODULE_RELEASE_STATES table. Blocked modules
 * show a clean "not available" message. Internal modules redirect
 * non-internal users. User-hidden modules offer a settings link.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';
import {
  isModuleBlocked,
  isModuleInternal,
  isInternalModuleTester,
  canUserAccessModule,
} from '@/components/utils/moduleReleaseState';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { EyeOff, Settings, Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import BrandLogo from '@/components/branding/BrandLogo';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { hasModuleProAccess, hasModuleFreeAccess } from '@/components/utils/moduleEntitlements';
import { hasPaidAccess } from '@/components/utils/premiumAccess';

const MODULE_LABELS = {
  pipekeeper:    'PipeKeeper',
  whiskeykeeper: 'WhiskeyKeeper',
  winekeeper:    'WineKeeper',
  cigarkeeper:   'CigarKeeper',
};

export default function LockedModuleGuard({ moduleKey, children }) {
  const { isModuleEnabled, isLoading: visibilityLoading } = useModuleVisibility();
  const { user, subscription, isLoading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isLoading = visibilityLoading || userLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E0D8C8]/20 border-t-[#E0D8C8]/60 rounded-full animate-spin" />
      </div>
    );
  }

  const key = String(moduleKey || '').toLowerCase();
  const label = MODULE_LABELS[key] || moduleKey;

  // 1. Blocked — no access for anyone in production (unless admin local override)
  if (isModuleBlocked(key) && !canUserAccessModule(key, user, true)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div
          className="max-w-sm w-full rounded-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(145deg, rgba(42,30,20,0.96), rgba(28,18,12,0.98))',
            border: '1px solid rgba(120,90,65,0.35)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <BrandLogo compact showWordmark={false} imageClassName="w-10 h-10 mx-auto mb-4 opacity-80" />
          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.2)' }}>
            <Lock className="w-5 h-5" style={{ color: 'rgba(180,140,75,0.6)' }} />
          </div>
          <p className="text-xs uppercase tracking-[0.12em] font-bold mb-1" style={{ color: '#B48C4B' }}>CollectionKeeper</p>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{t('modules.notAvailable')}</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.55)' }}>
            {t('modules.notAvailableInRelease', { moduleName: label })}
          </p>
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('CollectionHub'))}
            className="text-[#E0D8C8]/60 hover:text-[#E0D8C8]"
          >
            {t('common.backToHub')}
          </Button>
        </div>
      </div>
    );
  }

  // 2. Internal — only for internal testers
  if (isModuleInternal(key) && !isInternalModuleTester(user) && !canUserAccessModule(key, user, true)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div
          className="max-w-sm w-full rounded-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(145deg, rgba(42,30,20,0.96), rgba(28,18,12,0.98))',
            border: '1px solid rgba(120,90,65,0.35)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <BrandLogo compact showWordmark={false} imageClassName="w-10 h-10 mx-auto mb-4 opacity-80" />
          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.2)' }}>
            <Lock className="w-5 h-5" style={{ color: 'rgba(180,140,75,0.6)' }} />
          </div>
          <p className="text-xs uppercase tracking-[0.12em] font-bold mb-1" style={{ color: '#B48C4B' }}>CollectionKeeper</p>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{t('hub.comingSoonLabel')}</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.55)' }}>
            {t('modules.notYetAvailable', { moduleName: label })}
          </p>
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('CollectionHub'))}
            className="text-[#E0D8C8]/60 hover:text-[#E0D8C8]"
          >
            {t('common.backToHub')}
          </Button>
        </div>
      </div>
    );
  }

  // 3. Module is launched but user has no access tier (pro or free).
  //    Launched modules are free-tier accessible — limits are enforced inside each module.
  //    Admins and legacy broad-access users are always granted access.
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin' || user?.is_admin === true;
  const hasLegacyAccess = Boolean(user?.isFoundingMember || user?.legacy_broad_module_access);

  if (!isAdmin && !hasLegacyAccess && !hasModuleProAccess(user, key) && !hasModuleFreeAccess(user, key)) {
    // If user has any paid access at all (wrong module), show upgrade prompt.
    // Otherwise show the standard subscribe CTA.
    const hasSomePaidAccess = hasPaidAccess(user, subscription);

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div
          className="max-w-sm w-full rounded-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(145deg, rgba(42,30,20,0.96), rgba(28,18,12,0.98))',
            border: '1px solid rgba(180,140,75,0.35)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <BrandLogo compact showWordmark={false} imageClassName="w-10 h-10 mx-auto mb-4 opacity-80" />
          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.2)' }}>
            <Crown className="w-5 h-5" style={{ color: 'rgba(212,175,55,0.8)' }} />
          </div>
          <p className="text-xs uppercase tracking-[0.12em] font-bold mb-1" style={{ color: '#B48C4B' }}>
            {label}
          </p>
          <h2 className="text-lg font-bold mb-2" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            {hasSomePaidAccess
              ? t('modules.upgradeRequired', `Upgrade Required`)
              : t('modules.subscriptionRequired', `Subscription Required`)}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.65)' }}>
            {hasSomePaidAccess
              ? t('modules.upgradeToAddModule', `Your current plan doesn't include ${label}. Upgrade to the Founders Bundle or subscribe separately.`)
              : t('modules.subscribeToAccessModule', `A ${label} Pro subscription is required to access this module.`)}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate('/upgrade')}
              style={{
                background: 'linear-gradient(135deg, rgba(180,140,75,0.85), rgba(140,100,60,0.95))',
                border: '1px solid rgba(180,140,75,0.4)',
                color: '#F5F1E7',
              }}
            >
              <Crown className="w-4 h-4 mr-2" />
              {hasSomePaidAccess
                ? t('modules.viewUpgradeOptions', `View Upgrade Options`)
                : t('modules.subscribeToPro', `Subscribe to Pro`)}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/CollectionHub')}
              className="text-[#E0D8C8]/60 hover:text-[#E0D8C8]"
            >
              {t('common.backToHub')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 5. User has hidden this module in their preferences (launched modules only)
  if (!isModuleEnabled(key)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div
          className="rounded-2xl p-8 text-center max-w-sm w-full"
          style={{
            background: 'linear-gradient(145deg, rgba(42,30,20,0.9), rgba(28,18,12,0.95))',
            border: '1px solid rgba(180,140,75,0.2)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.2)' }}
          >
            <EyeOff className="w-8 h-8" style={{ color: 'rgba(180,140,75,0.6)' }} />
          </div>
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
          >
            {t('modules.isHidden', { moduleName: label })}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {t('modules.hiddenDescription')}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate(createPageUrl('Profile'))}
              style={{
                background: 'linear-gradient(135deg, rgba(180,140,75,0.85), rgba(140,100,60,0.95))',
                border: '1px solid rgba(180,140,75,0.4)',
                color: '#F5F1E7',
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              {t('modules.manageModules')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('CollectionHub'))}
              className="text-[#E0D8C8]/60 hover:text-[#E0D8C8]"
            >
              {t('common.backToHub')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}