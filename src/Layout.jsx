import React, { useState } from "react";
import BrandLogo from "@/components/branding/BrandLogo";
import ModuleNav from "@/components/modules/ModuleNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CurrencySwitcher from "@/components/nav/CurrencySwitcher";
import BackButton from "@/components/navigation/BackButton";
import FeatureQuickAccess from "@/components/navigation/FeatureQuickAccess";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function Layout({ children, currentPageName }) {
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);
  const { user } = useCurrentUser();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#140f0c' }}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(20,15,12,0.88)] backdrop-blur-md">
        <div className="ck-page-shell">
          <div className="flex flex-col gap-3 py-3 md:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <BackButton currentPageName={currentPageName} />
                <BrandLogo className="min-w-0" />
              </div>

              <div className="flex items-center gap-2">
                <CurrencySwitcher className="w-[80px] sm:w-[100px]" />
                <LanguageSwitcher className="w-[90px] sm:w-[110px] sm:min-w-[130px]" />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuickAccessOpen(true)}
                  className="text-[#E0D8C8] hover:bg-white/10"
                  title={t('nav.quickAccess', 'Quick Access')}
                >
                  <Zap className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">{t('nav.quickAccess', 'Quick Access')}</span>
                </Button>
              </div>
            </div>

            <ModuleNav currentPageName={currentPageName} user={user} />
          </div>
        </div>
      </header>

      <main className="pb-28 md:pb-16">
        <div className="ck-page-shell pt-4 md:pt-6">
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