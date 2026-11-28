import React, { useState } from "react";
import BrandLogo from "@/components/branding/BrandLogo";
import ModuleNav from "@/components/modules/ModuleNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CurrencySwitcher from "@/components/nav/CurrencySwitcher";
import BackButton from "@/components/navigation/BackButton";
import FeatureQuickAccess from "@/components/navigation/FeatureQuickAccess";
import GlobalReferralBanner from "@/components/referral/GlobalReferralBanner";
import AppreciationNotificationCenter from "@/components/campaign/AppreciationNotificationCenter";
import { Menu, X } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function Layout({ children, currentPageName }) {
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useCurrentUser();
  const { t } = useTranslation();

  return (
    <div className="min-h-[100dvh] max-h-[100dvh] flex flex-col" style={{ backgroundColor: 'var(--ck-nav-bg)' }}>
      <header className="sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)]" style={{ backgroundColor: 'var(--ck-nav-bg)', borderColor: 'var(--ck-nav-border)' }}>
        <div className="ck-page-shell">
          <div className="flex flex-col gap-3 py-3 md:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <BackButton currentPageName={currentPageName} />
                <BrandLogo className="min-w-0" />
              </div>

              <div className="flex items-center gap-2">
                <CurrencySwitcher className="w-[80px] sm:w-[100px]" />
                <AppreciationNotificationCenter />
                <LanguageSwitcher className="min-w-[80px] w-[80px] sm:w-[110px] sm:min-w-[130px]" />

                {/* Hamburger — mobile/tablet only */}
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  style={{ width: 48, height: 48, minWidth: 48, minHeight: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#E0D8C8', padding: 0 }}
                  className="md:hidden"
                  aria-label={menuOpen ? t('nav.closeMenu', 'Close menu') : t('nav.openMenu', 'Open menu')}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-module-navigation"
                >
                  {menuOpen ? <X style={{ width: 30, height: 30, display: 'block' }} /> : <Menu style={{ width: 30, height: 30, display: 'block' }} />}
                </button>
              </div>
            </div>

            {/* Desktop nav row */}
            <div className="hidden md:block">
              <ModuleNav
                currentPageName={currentPageName}
                user={user}
                onQuickAccess={() => setQuickAccessOpen(true)}
              />
            </div>
          </div>
        </div>

        {/* Mobile / tablet nav drawer */}
        {menuOpen && (
          <div
            id="mobile-module-navigation"
            className="md:hidden fixed left-0 right-0 z-50 border-t shadow-2xl overflow-y-auto"
            style={{
              backgroundColor: 'var(--ck-nav-bg)',
              borderColor: 'var(--ck-nav-border)',
              top: 'calc(env(safe-area-inset-top) + 72px)',
              maxHeight: 'calc(100dvh - env(safe-area-inset-top) - 72px)',
            }}
          >
            <div className="ck-page-shell py-3">
              <ModuleNav
                currentPageName={currentPageName}
                user={user}
                vertical
                onItemClick={() => setMenuOpen(false)}
                onQuickAccess={() => {
                  setMenuOpen(false);
                  setQuickAccessOpen(true);
                }}
              />
            </div>
          </div>
        )}
      </header>

      <GlobalReferralBanner />

      <main className="flex-1 overflow-y-auto pb-28 md:pb-16" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
        <div className="ck-page-shell pt-6 md:pt-8 lg:pt-10">
          {children}
        </div>
      </main>

      <FeatureQuickAccess
        isOpen={quickAccessOpen}
        onClose={() => setQuickAccessOpen(false)}
      />
    </div>
  );
}