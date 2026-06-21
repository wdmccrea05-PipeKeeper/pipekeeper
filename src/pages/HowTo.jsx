import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, Info, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function HowTo() {
  const { t } = useTranslation();
  const tArray = (key) => {
    const result = t(key, { returnObjects: true });
    return Array.isArray(result) ? result : [];
  };
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (id) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 32 }}>
      <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const Q = ({ id, q, children }) => (
    <Card style={{
      background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
      border: "1px solid rgba(140,105,65,0.25)"
    }} className="overflow-hidden">
      <button
        onClick={() => toggleItem(id)}
        className="w-full text-left p-4 flex items-center justify-between transition-colors"
        style={{ color: "#E0D8C8" }}
      >
        <span className="font-semibold pr-4" style={{ color: "#E0D8C8" }}>{q}</span>
        <ChevronDown 
          className={`w-5 h-5 flex-shrink-0 transition-transform ${openItems[id] ? 'rotate-180' : ''}`}
          style={{ color: "rgba(180,140,75,0.7)" }}
        />
      </button>
      {openItems[id] && (
        <CardContent className="px-4 pb-4 pt-0 leading-relaxed space-y-3" style={{ color: "rgba(224,216,200,0.8)" }}>
          {children}
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, rgba(15,11,8,0.95), rgba(20,15,10,0.95))" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 16px" }}>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">{t("howTo.pageTitle")}</h1>
          <p className="text-[#E0D8C8]/80 mb-4">{t("howTo.pageSubtitle")}</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl('FAQ')}>
              <Button variant="outline" style={{
                background: "linear-gradient(135deg, rgba(60,45,30,0.5), rgba(50,35,25,0.6))",
                border: "1px solid rgba(140,105,65,0.4)",
                color: "#E0D8C8"
              }}>
                <Info className="w-4 h-4 mr-2" />
                {t("help.faq")}
              </Button>
            </Link>
            <Link to={createPageUrl('TroubleshootingFull')}>
              <Button variant="outline" style={{
                background: "linear-gradient(135deg, rgba(60,45,30,0.5), rgba(50,35,25,0.6))",
                border: "1px solid rgba(140,105,65,0.4)",
                color: "#E0D8C8"
              }}>
                <Wrench className="w-4 h-4 mr-2" />
                {t("help.troubleshooting")}
              </Button>
            </Link>
          </div>
        </div>

        <Section title={t("howTo.managingPipes")}>
           <Q id="add-pipe-basic" q={t("howTo.addPipeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.addPipeBasicSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>



          <Q id="update-pipe" q={t("howTo.updatePipeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.updatePipeSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="mark-favorite" q={t("howTo.markFavoriteQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.markFavoriteSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="delete-pipe" q={t("howTo.deletePipeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.deletePipeSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.managingTobacco")}>
          <Q id="add-tobacco" q={t("howTo.addTobaccoQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.addTobaccoSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="update-tobacco" q={t("howTo.updateTobaccoQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.updateTobaccoSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="manage-cellar" q={t("howTo.manageCellarQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.manageCellarSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="delete-tobacco" q={t("howTo.deleteTobaccoQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.deleteTobaccoSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.loggingSessions")}>
          <Q id="log-session" q={t("howTo.logSessionQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.logSessionSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="view-logs" q={t("howTo.viewLogsQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.viewLogsSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="streaks" q={t("howTo.streaksQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.streaksSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.measurements")}>
          <Q id="measure-pipe" q={t("howTo.measurePipeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.measurePipeSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.insights")}>
          <Q id="insights-general" q={t("howTo.insightsQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.insightsSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="curator" q={t("howTo.curator")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.curatorSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="story-cards" q={t("howTo.storyCard")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.storyCardSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.aiFeatures")}>
          <Q id="generate-pairings" q={t("howTo.generatePairingsQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.generatePairingsSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="identify-pipe" q={t("howTo.identifyPipeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.identifyPipeSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="optimize" q={t("howTo.optimizeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.optimizeSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="geometry" q={t("howTo.geometryQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.geometrySteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.sharing")}>
          <Q id="share" q={t("howTo.shareQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.shareSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="export" q={t("howTo.exportQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.exportSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="profile" q={t("howTo.profileQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.profileSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("auto.pages_HowTo.managing_whiskey_whiskeykeeper_57t2rg")}>
          <Q id="add-bottle" q="How do I add a whiskey bottle to my collection?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("auto.pages_HowTo.go_to_3oedtq")} <strong>{t("auto.pages_HowTo.whiskeykeeper_1kgmc1")}</strong> from the nav or Collection Hub.</li>
              <li>{t("auto.pages_HowTo.tap_376rsa")} <strong>{t("auto.pages_HowTo.add_bottle_jzfmew")}</strong> or use the <strong>+</strong> button.</li>
              <li>{t("auto.pages_HowTo.search_by_name_to_auto_fill_2kyc80")}</li>
              <li>{t("auto.pages_HowTo.set_purchase_price_fill_level_and_k4e0aq")}</li>
              <li>{t("auto.pages_HowTo.tap_376rsa")} <strong>{t("auto.pages_HowTo.save_yk2ng4")}</strong> to add it to your collection.</li>
            </ol>
          </Q>
          <Q id="whiskey-inventory" q="How does inventory tracking work for whiskey?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("auto.pages_HowTo.each_bottle_has_an_inventory_unit_1al42q")}</li>
              <li>{t("auto.pages_HowTo.open_a_bottle_s_detail_page_1jzioz")} <strong>{t("auto.pages_HowTo.fill_level_136bpk")}</strong> as you work through it.</li>
              <li>{t("auto.pages_HowTo.you_can_also_track_multiple_bottles_2nphbt")}</li>
            </ol>
          </Q>
          <Q id="whiskey-tasting" q="How do I log a whiskey tasting?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("auto.pages_HowTo.open_the_bottle_s_detail_page_qi4rac")} <strong>{t("auto.pages_HowTo.log_tasting_1njc2o")}</strong>.</li>
              <li>{t("auto.pages_HowTo.record_flavor_notes_rating_and_any_f3zaal")}</li>
              <li>{t("auto.pages_HowTo.tasting_history_appears_in_the_bottle_a7hm14")}</li>
            </ol>
          </Q>
          <Q id="whiskey-value" q="How does bottle valuation work?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("auto.pages_HowTo.open_any_bottle_s_detail_page_11kplm")} <strong>{t("auto.pages_HowTo.value_and_strategy_1bnfwi")}</strong>.</li>
              <li>{t("auto.pages_HowTo.the_system_computes_a_current_value_1w4jlj")}</li>
              <li>{t("auto.pages_HowTo.tap_376rsa")} <strong>{t("auto.pages_HowTo.save_checkpoint_1tg0r4")}</strong> to record a timestamped value snapshot for tracking over time.</li>
              <li>{t("auto.pages_HowTo.add_manual_1bjbvf")} <strong>{t("auto.pages_HowTo.price_observations_atuf2v")}</strong> from auctions or retailers to improve accuracy.</li>
            </ol>
          </Q>
        </Section>

        <Section title={t("auto.pages_HowTo.managing_cigars_cigarkeeper_5nletv")}>
          <Q id="add-cigar" q="How do I add a cigar to my collection?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("auto.pages_HowTo.go_to_3oedtq")} <strong>{t("auto.pages_HowTo.cigarkeeper_1oz7i9")}</strong> from the nav or Collection Hub.</li>
              <li>{t("auto.pages_HowTo.tap_376rsa")} <strong>{t("auto.pages_HowTo.add_cigar_djas50")}</strong> or navigate to <strong>{t("auto.pages_HowTo.cigars_o9oba3")}</strong>.</li>
              <li>{t("auto.pages_HowTo.enter_the_brand_line_vitola_wrapper_9tnt6k")}</li>
              <li>{t("auto.pages_HowTo.set_your_quantity_and_unit_type_1cm4k5")}</li>
              <li>{t("auto.pages_HowTo.tap_376rsa")} <strong>{t("auto.pages_HowTo.save_yk2ng4")}</strong> to add it to your humidor.</li>
            </ol>
          </Q>
          <Q id="cigar-humidor" q="How do I set up and manage a humidor?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("auto.pages_HowTo.go_to_3oedtq")} <strong>{t("auto.pages_HowTo.cigars_humidors_tab_1te4tg")}</strong>.</li>
              <li>{t("auto.pages_HowTo.tap_376rsa")} <strong>{t("auto.pages_HowTo.add_humidor_a151ty")}</strong> and name it.</li>
              <li>{t("auto.pages_HowTo.set_capacity_target_humidity_and_maintenance_1qvxc2")}</li>
              <li>{t("auto.pages_HowTo.assign_cigars_to_the_humidor_from_15nm6t")}</li>
              <li>{t("auto.pages_HowTo.log_maintenance_events_to_reset_alert_1lzly3")}</li>
            </ol>
          </Q>
          <Q id="cigar-session" q="How do I log a cigar smoking session?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("auto.pages_HowTo.tap_376rsa")} <strong>{t("auto.pages_HowTo.log_session_14rlw5")}</strong> from CigarKeeper or the cigar's detail page.</li>
              <li>{t("auto.pages_HowTo.select_the_cigar_or_enter_a_1hnhnp")}</li>
              <li>{t("auto.pages_HowTo.fill_in_tasting_notes_burn_draw_1ymp38")}</li>
              <li>{t("auto.pages_HowTo.tap_376rsa")} <strong>{t("auto.pages_HowTo.save_yk2ng4")}</strong> to record the session.</li>
            </ol>
          </Q>
          <Q id="cigar-free-vs-pro" q="What's included in the free vs. pro CigarKeeper plan?">
            <p><strong>{t("auto.pages_HowTo.free_tier_lq2o6z")}</strong> {t("auto.pages_HowTo.add_up_to_10_cigars_log_ddard")}</p>
            <p><strong>{t("auto.pages_HowTo.pro_tier_17lpkc")}</strong> {t("auto.pages_HowTo.unlimited_cigars_and_humidors_curator_ai_1gfq7y")}</p>
            <p>{t("auto.pages_HowTo.you_can_start_on_the_free_16oacu")}</p>
          </Q>
        </Section>

        <Section title={t("howTo.subscriptions")}>
          <Q id="upgrade" q="How do I upgrade to Pro?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("auto.pages_HowTo.go_to_the_skf7j3")} <strong>{t("auto.pages_HowTo.subscription_1byji4")}</strong> page (accessible from Profile or the upgrade prompts).</li>
              <li>{t("auto.pages_HowTo.choose_what_you_want_to_unlock_9tjxju")} <strong>{t("auto.pages_HowTo.pipekeeper_pro_9ebjs0")}</strong>, <strong>{t("auto.pages_HowTo.whiskeykeeper_pro_ty96s6")}</strong>, <strong>{t("auto.pages_HowTo.cigarkeeper_pro_yhhmqg")}</strong>{t("auto.pages_HowTo.the_33p6sy")} <strong>{t("auto.pages_HowTo.founders_bundle_drx8xx")}</strong> {t("auto.pages_HowTo.pipekeeper_whiskeykeeper_or_the_zsdny1")} <strong>3-Module Bundle</strong> {t("auto.pages_HowTo.pipekeeper_whiskeykeeper_cigarkeeper_1st3jj")}</li>
              <li>{t("auto.pages_HowTo.select_a_monthly_or_annual_plan_1cw0jr")}</li>
              <li>{t("auto.pages_HowTo.complete_payment_via_the_secure_checkout_3ovv3c")}</li>
              <li>{t("auto.pages_HowTo.your_pro_features_activate_immediately_5l16d3")}</li>
            </ol>
          </Q>
          <Q id="cancel" q={t("howTo.cancelQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.cancelSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="tier-diff" q="What is the difference between Free and Pro?">
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>{t("auto.pages_HowTo.free_3nsvi9")}</strong> {t("auto.pages_HowTo.pipekeeper_allows_up_to_5_pipes_8buhq")}</li>
              <li><strong>{t("auto.pages_HowTo.pro_yk0qc0")}</strong> {t("auto.pages_HowTo.unlimited_items_per_module_ai_pairings_mhynva")}</li>
              <li>{t("auto.pages_HowTo.each_module_pipekeeper_whiskeykeeper_and_cigarke_1ngdph")}</li>
              <li>{t("auto.pages_HowTo.the_376rye")} <strong>{t("auto.pages_HowTo.founders_bundle_drx8xx")}</strong> includes PipeKeeper and WhiskeyKeeper together at a discounted rate. CigarKeeper is not included in the Founders Bundle.</li>
              <li>A <strong>3-Module Bundle</strong> covers PipeKeeper, WhiskeyKeeper, and CigarKeeper together at a further discount.</li>
              <li>{t("auto.pages_HowTo.founding_members_have_grandfathered_lifetime_pro_9llha5")}</li>
            </ol>
          </Q>
        </Section>
      </div>
    </div>
  );
}