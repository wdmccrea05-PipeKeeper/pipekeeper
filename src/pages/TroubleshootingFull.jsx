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
            {t("help.troubleshooting")}
          </h1>
          <p className="text-[#D7C9B2]/80 mb-4">
            {t("helpCenter.troubleshootingSubtitle")}
          </p>

          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl("HowTo")}>
              <Button
                variant="outline"
                className="border-[rgba(140,105,65,0.35)] text-[#F5F1E7] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                {t("help.howTo")}
              </Button>
            </Link>

            <Link to={createPageUrl("FAQFull")}>
              <Button
                variant="outline"
                className="border-[rgba(140,105,65,0.35)] text-[#F5F1E7] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]"
              >
                <CircleHelp className="w-4 h-4 mr-2" />
                {t("help.faq")}
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

        <Section icon={RefreshCw} title={t("helpCenter.troubleshootCaching")} accentClass="text-sky-300">
          <TroubleshootingItem
            id="changes-not-appearing"
            title={t("helpCenter.changesNotAppearing")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <ul className="list-disc list-inside space-y-2">
              <li>{t("helpCenter.refreshPage")}</li>
              <li>{t("helpCenter.waitSync")}</li>
              <li>{t("helpCenter.checkFilters")}</li>
            </ul>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="missing-new-features"
            title={t("helpCenter.newFeaturesMissing")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("helpCenter.newFeaturesMissingDesc")}</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="stale-data"
            title={t("helpCenter.dataOutdated")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("helpCenter.dataOutdatedDesc")}</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="old-version-after-update"
            title={t("helpCenter.oldVersionAfterUpdate")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("helpCenter.oldVersionAfterUpdateDesc")}</p>
          </TroubleshootingItem>
        </Section>

        <Section icon={Sparkles} title={t("helpCenter.aiFeatures")} accentClass="text-violet-300">
          <TroubleshootingItem
            id="regenerate-pairings"
            title={t("helpCenter.whyRegeneratePairings")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("helpCenter.whyRegeneratePairingsDesc")}</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="ai-updates-out-of-date"
            title={t("helpCenter.outOfDateAiUpdates")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("helpCenter.outOfDateAiUpdatesDesc")}</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="undo-ai-regeneration"
            title={t("helpCenter.undoAiRegenerations")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("helpCenter.undoAiRegenerationsDesc")}</p>
          </TroubleshootingItem>
        </Section>

        <Section icon={Sparkles} title="Value &amp; Strategy" accentClass="text-amber-300">
          <TroubleshootingItem
            id="rarity-score-unexpected"
            title="My rarity score seems too high or too low"
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p className="mb-2">The rarity score is computed from the fields stored on the item record. If the score looks wrong, check these fields on the item’s edit form:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Production Status (Discontinued, Limited Edition, Allocated, etc.)</li>
              <li>Maker Status (Deceased, Retired, Inactive) for pipes</li>
              <li>Production Type (One-Off, Limited Artisan Batch) for pipes</li>
              <li>Age Statement for whiskey bottles</li>
              <li>Cellar age for tobacco blends</li>
            </ul>
            <p className="mt-2">Once the field is corrected and saved, return to the detail page — the rarity score updates immediately.</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="value-not-showing"
            title="The Value & Strategy section shows ‘—’ for Current Value"
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>No value is shown when none of the value fields have been set on the item. To fix this, open the item’s edit form and enter at least one value: Purchase Price, Estimated Value, Retail Price, or Aftermarket/Collector Value. The section will then display the most relevant value with a confidence badge. You can also save a manual checkpoint via the Value &amp; Strategy section’s <strong>Save Checkpoint</strong> button.</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="strategy-recommendation-unexpected"
            title="The strategy recommendation doesn't seem right for my item"
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>The recommendation (e.g. Hold, Cellar, Preserve) is computed automatically from the rarity score, replacement difficulty, and item data. If the recommendation seems wrong, review the item’s production status, maker status (for pipes), and pricing fields — inaccurate inputs produce inaccurate recommendations. You can override specific fields like <strong>Replacement Difficulty</strong> directly on the item record if the computed value doesn’t match reality.</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="value-history-empty"
            title="My Value History is empty"
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>Value history records are created only when you manually click <strong>Save Checkpoint</strong> in the Value &amp; Strategy section, or when a Refresh is triggered (which also saves a checkpoint). They are not created automatically on item creation. Click <strong>Save Checkpoint</strong> on any item to start building its history.</p>
          </TroubleshootingItem>
        </Section>

        <Section icon={RefreshCw} title="Collector's Snapshot" accentClass="text-sky-300">
          <TroubleshootingItem
            id="snapshot-only-shows-one-module"
            title="My Snapshot only shows pipes (or only shows whiskey)"
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>The Collector’s Snapshot is module-aware — it only shows cards for your <strong>enabled</strong> modules. If WhiskeyKeeper or PipeKeeper is disabled in your Profile settings, those cards will not appear. Go to <strong>Profile &gt; Module Settings</strong> to enable the modules you want included.</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="snapshot-not-updating"
            title="My Snapshot looks outdated or doesn’t reflect recent additions"
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>Click the <strong>Regenerate</strong> button on the Collection Story card on the Hub to rebuild the snapshot from your current data. The snapshot is also regenerated automatically when significant collection changes are detected, but manual regeneration ensures it reflects your latest items immediately.</p>
          </TroubleshootingItem>
        </Section>
      </div>
    </div>
  );
}