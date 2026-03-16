import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, BookOpen, CircleHelp, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";
import DocumentationSearch from "@/components/help/DocumentationSearch";
import SelfDiagnosticPanel from "@/components/help/SelfDiagnosticPanel";

function TroubleshootingItem({ id, title, children, openItems, setOpenItems }) {
  const open = !!openItems[id];

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpenItems((p) => ({ ...p, [id]: !p[id] }))}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="font-semibold text-[#F5F1E7] pr-4">{title}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#D7C9B2] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <CardContent className="px-4 pb-4 pt-0 text-[#D7C9B2] leading-relaxed">
          {children}
        </CardContent>
      ) : null}
    </Card>
  );
}

function Section({ icon: Icon, title, children, accentClass = "text-amber-300" }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-7 h-7 ${accentClass}`} />
        <h2 className="text-2xl font-bold text-[#F5F1E7]">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function TroubleshootingFull() {
  const { t } = useTranslation();
  const [openItems, setOpenItems] = useState({});

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(90,58,30,0.18),transparent_28%),linear-gradient(180deg,#140f0b_0%,#0b0908_100%)]">
      <div className="max-w-[980px] mx-auto px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#F5F1E7] mb-2">
            {t("help.troubleshooting", "Troubleshooting")}
          </h1>
          <p className="text-[#D7C9B2]/80 mb-4">
            {t("helpCenter.troubleshootingSubtitle", "Common issues and solutions")}
          </p>

          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl("HowTo")}>
              <Button
                variant="outline"
                className="border-[rgba(140,105,65,0.35)] text-[#F5F1E7] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                {t("help.howTo", "How-To Guides")}
              </Button>
            </Link>

            <Link to={createPageUrl("FAQFull")}>
              <Button
                variant="outline"
                className="border-[rgba(140,105,65,0.35)] text-[#F5F1E7] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]"
              >
                <CircleHelp className="w-4 h-4 mr-2" />
                {t("help.faq", "FAQ")}
              </Button>
            </Link>
          </div>

          <div className="mt-6 max-w-md mx-auto">
            <DocumentationSearch />
          </div>

          <div className="mt-6 max-w-md mx-auto">
            <SelfDiagnosticPanel />
          </div>
        </div>

        <Section icon={RefreshCw} title={t("helpCenter.troubleshootCaching", "Caching & Page Refresh")} accentClass="text-sky-300">
          <TroubleshootingItem
            id="changes-not-appearing"
            title={t("helpCenter.changesNotAppearing", "Changes aren't appearing after I update something")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <ul className="list-disc list-inside space-y-2">
              <li>{t("helpCenter.refreshPage", "Refresh the page once after saving changes.")}</li>
              <li>{t("helpCenter.waitSync", "Give the app a moment to sync your latest data.")}</li>
              <li>{t("helpCenter.checkFilters", "Check whether a filter, sort, or search is hiding the updated item.")}</li>
            </ul>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="missing-new-features"
            title={t("helpCenter.newFeaturesMissing", "New features or cards are missing")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("helpCenter.newFeaturesMissingDesc", "Refresh the app, sign out and back in, and confirm you are on the latest build.")}</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="stale-data"
            title={t("helpCenter.dataOutdated", "Data seems outdated or stale")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("helpCenter.dataOutdatedDesc", "Stale data is usually resolved by refreshing the page or revisiting the screen after a save completes.")}</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="old-version-after-update"
            title={t("helpCenter.oldVersionAfterUpdate", "App is showing old version after an update")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("helpCenter.oldVersionAfterUpdateDesc", "Close and reopen the app or reload the website fully to pull the newest assets.")}</p>
          </TroubleshootingItem>
        </Section>

        <Section icon={Sparkles} title={t("helpCenter.aiFeatures", "AI Features")} accentClass="text-violet-300">
          <TroubleshootingItem
            id="regenerate-pairings"
            title={t("helpCenter.whyRegeneratePairings", "Why do I need to regenerate pairings?")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("helpCenter.whyRegeneratePairingsDesc", "Pairings can change when your collection changes, so regenerated results reflect your current pipes and blends.")}</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="ai-updates-out-of-date"
            title={t("helpCenter.outOfDateAiUpdates", "What does 'out of date' mean on AI Updates?")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("helpCenter.outOfDateAiUpdatesDesc", "It means your last AI-generated results were based on older collection data and may need refreshing.")}</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="undo-ai-regeneration"
            title={t("helpCenter.undoAiRegenerations", "Can I undo AI regenerations?")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("helpCenter.undoAiRegenerationsDesc", "Most AI refreshes replace prior generated outputs, so review and save anything important before rerunning them.")}</p>
          </TroubleshootingItem>
        </Section>
      </div>
    </div>
  );
}