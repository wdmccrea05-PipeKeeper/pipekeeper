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

        <Section icon={Sparkles} title={t("auto.pages_TroubleshootingFull.value_and_strategy_1bnfwi")} accentClass="text-amber-300">
          <TroubleshootingItem
            id="rarity-score-unexpected"
            title={t("auto.pages_TroubleshootingFull.my_rarity_score_seems_too_high_19oypq")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p className="mb-2">{t("auto.pages_TroubleshootingFull.the_rarity_score_is_computed_from_za6fi1")}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("auto.pages_TroubleshootingFull.production_status_discontinued_limited_edition_a_lxm2lx")}</li>
              <li>{t("auto.pages_TroubleshootingFull.maker_status_deceased_retired_inactive_for_1a2kou")}</li>
              <li>{t("auto.pages_TroubleshootingFull.production_type_one_off_limited_artisan_1opw5t")}</li>
              <li>{t("auto.pages_TroubleshootingFull.age_statement_for_whiskey_bottles_17jzg3")}</li>
              <li>{t("auto.pages_TroubleshootingFull.cellar_age_for_tobacco_blends_1nzpcv")}</li>
            </ul>
            <p className="mt-2">{t("auto.pages_TroubleshootingFull.once_the_field_is_corrected_and_t723tc")}</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="value-not-showing"
            title={t("auto.pages_TroubleshootingFull.the_value_and_strategy_section_shows_ale54h")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("auto.pages_TroubleshootingFull.no_value_is_shown_when_none_igrg35")} <strong>{t("auto.pages_TroubleshootingFull.save_checkpoint_1tg0r4")}</strong> button.</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="strategy-recommendation-unexpected"
            title={t("auto.pages_TroubleshootingFull.the_strategy_recommendation_doesn_t_seem_kl54sm")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("auto.pages_TroubleshootingFull.the_recommendation_e_g_hold_cellar_1l71ks")} <strong>{t("auto.pages_TroubleshootingFull.replacement_difficulty_i84seg")}</strong> directly on the item record if the computed value doesn’t match reality.</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="value-history-empty"
            title={t("auto.pages_TroubleshootingFull.my_value_history_is_empty_1dvzby")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("auto.pages_TroubleshootingFull.value_history_records_are_created_only_12kpi0")} <strong>{t("auto.pages_TroubleshootingFull.save_checkpoint_1tg0r4")}</strong> in the Value &amp; Strategy section, or when a Refresh is triggered (which also saves a checkpoint). They are not created automatically on item creation. Click <strong>{t("auto.pages_TroubleshootingFull.save_checkpoint_1tg0r4")}</strong> on any item to start building its history.</p>
          </TroubleshootingItem>
        </Section>

        <Section icon={RefreshCw} title={t("auto.pages_TroubleshootingFull.collector_s_snapshot_wqtl92")} accentClass="text-sky-300">
          <TroubleshootingItem
            id="snapshot-only-shows-one-module"
            title={t("auto.pages_TroubleshootingFull.my_snapshot_only_shows_pipes_or_kayboe")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("auto.pages_TroubleshootingFull.the_collector_s_snapshot_is_module_1vsxdo")} <strong>enabled</strong> modules. If WhiskeyKeeper or PipeKeeper is disabled in your Profile settings, those cards will not appear. Go to <strong>{t("auto.pages_TroubleshootingFull.profile_module_settings_1njyeq")}</strong> to enable the modules you want included.</p>
          </TroubleshootingItem>

          <TroubleshootingItem
            id="snapshot-not-updating"
            title={t("auto.pages_TroubleshootingFull.my_snapshot_looks_outdated_or_doesn_1x7mpu")}
            openItems={openItems}
            setOpenItems={setOpenItems}
          >
            <p>{t("auto.pages_TroubleshootingFull.click_the_176uws")} <strong>{t("auto.pages_TroubleshootingFull.regenerate_1taw84")}</strong> button on the Collection Story card on the Hub to rebuild the snapshot from your current data. The snapshot is also regenerated automatically when significant collection changes are detected, but manual regeneration ensures it reflects your latest items immediately.</p>
          </TroubleshootingItem>
        </Section>
      </div>
    </div>
  );
}