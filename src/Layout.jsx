import React, { useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "@/components/branding/BrandLogo";
import ModuleNav from "@/components/modules/ModuleNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import BackButton from "@/components/navigation/BackButton";
import FeatureQuickAccess from "@/components/navigation/FeatureQuickAccess";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useEnabledKeeperModules } from "@/components/hooks/useEnabledKeeperModules";
import { MODULE_ICONS } from "@/components/branding/moduleAssets";

export default function Layout({ children, currentPageName }) {
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);
  const { isModuleEnabled } = useEnabledKeeperModules();

  const activeModule = currentPageName === "PipeKeeper" ? "pipekeeper" : currentPageName === "WhiskeyKeeper" ? "whiskeykeeper" : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#140f0c' }}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(20,15,12,0.88)] backdrop-blur-md">
        <div className="ck-page-shell">
          <div className="flex flex-col gap-3 py-3 md:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <BackButton currentPageName={currentPageName} />
                <BrandLogo className="min-w-0" />
                {activeModule && (
                  <Link
                    to={`/${currentPageName}`}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-[#6b4a2d]/55 border border-[rgba(180,140,75,0.35)]"
                    style={{ color: "#F5F1E7" }}
                  >
                    {MODULE_ICONS[activeModule] && (
                      <img
                        src={MODULE_ICONS[activeModule]}
                        alt={currentPageName}
                        className="w-4 h-4 object-contain"
                      />
                    )}
                    <span>{currentPageName === "PipeKeeper" ? "PipeKeeper" : "WhiskeyKeeper"}</span>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2">
                <LanguageSwitcher className="w-[90px] sm:w-[110px] sm:min-w-[130px]" />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuickAccessOpen(true)}
                  className="text-[#E0D8C8] hover:bg-white/10"
                  title="Quick Access"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Quick Access</span>
                </Button>
              </div>
            </div>

            <ModuleNav currentPageName={currentPageName} />
          </div>
        </div>
      </header>

      <main className="pb-16 md:pb-10">
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