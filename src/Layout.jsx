import React, { useState } from "react";
import BrandLogo from "@/components/branding/BrandLogo";
import ModuleNav from "@/components/modules/ModuleNav";
import BackButton from "@/components/navigation/BackButton";
import FeatureQuickAccess from "@/components/navigation/FeatureQuickAccess";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(20,15,12,0.88)] backdrop-blur-md">
        <div className="ck-page-shell">
          <div className="flex flex-col gap-3 py-3 md:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <BackButton currentPageName={currentPageName} />
                <BrandLogo className="min-w-0" />
              </div>

              <div className="flex items-center gap-2">
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

      <main className="pb-10">
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
