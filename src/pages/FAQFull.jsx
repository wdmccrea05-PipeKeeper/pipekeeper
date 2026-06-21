import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import TutorialSystemPreview from "@/components/onboarding/TutorialSystem";
import { ChevronDown, Wrench, BookOpen, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function FAQFull() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState({});
  const [showTutorial, setShowTutorial] = useState(false);

  const toggleItem = (id) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const Section = ({ title, children }) => (
    <div className="mb-10">
      <h2 className="mb-4 text-2xl font-bold text-[#F5F1E7]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const Q = ({ id, q, children }) => (
    <Card className="overflow-hidden">
      <button
        onClick={() => toggleItem(id)}
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-[rgba(255,255,255,0.03)] transition-colors"
      >
        <span className="font-semibold text-[#F5F1E7] pr-4">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#D8C7A6]/80 flex-shrink-0 transition-transform ${openItems[id] ? "rotate-180" : ""}`}
        />
      </button>
      {openItems[id] && (
        <CardContent className="px-5 pb-5 pt-0 text-[#D8C7A6]/90 leading-relaxed">
          {children}
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(78,48,24,0.18),transparent_24%),linear-gradient(180deg,#0d0806_0%,#160f0b_50%,#0b0705_100%)]">
      <div className="mx-auto max-w-[980px] px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-[#F5F1E7]">{t("helpCenter.howToTitle")}</h1>
          <p className="mb-4 text-[#D8C7A6]/80">{t("helpCenter.howToSubtitle")}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link to={createPageUrl("HowTo")}>
              <Button variant="outline" className="border-[rgba(140,105,65,0.35)] bg-[rgba(28,21,16,0.72)] text-[#F5F1E7] hover:bg-[rgba(163,92,92,0.12)]">
                <BookOpen className="mr-2 h-4 w-4" />
                {t("help.howTo")}
              </Button>
            </Link>
            <Link to={createPageUrl("TroubleshootingFull")}>
              <Button variant="outline" className="border-[rgba(140,105,65,0.35)] bg-[rgba(28,21,16,0.72)] text-[#F5F1E7] hover:bg-[rgba(163,92,92,0.12)]">
                <Wrench className="mr-2 h-4 w-4" />
                {t("help.troubleshooting")}
              </Button>
            </Link>
            <Button 
              onClick={() => setShowTutorial(true)}
              className="border-[rgba(180,140,75,0.35)] bg-[rgba(58,40,22,0.72)] text-[#F5F1E7] hover:bg-[rgba(180,140,75,0.2)]"
              variant="outline"
            >
              <Play className="mr-2 h-4 w-4" />
              {t("help.launchTutorial")}
            </Button>
          </div>
        </div>

        <Section title={t("helpCenter.topicGeneral")}>
          <Q id="verification-help" q={t("verificationHelp.pageTitle")}>
            <div className="space-y-3">
              <p>{t("verificationHelp.expiredDesc")}</p>
              <div className="rounded-xl border border-[rgba(140,105,65,0.25)] bg-[rgba(28,21,16,0.72)] p-3">
                <p className="mb-2 font-semibold text-[#F5F1E7]">{t("verificationHelp.option1Title")}</p>
                <p className="text-sm text-[#D8C7A6]/85">{t("verificationHelp.option1Desc")}</p>
              </div>
            </div>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicGettingStarted")}>
          <Q id="getting-started" q={t("help.gettingStarted")}>
            <p>{t("helpCenter.gettingStartedDesc")}</p>
          </Q>
          <Q id="what-is-pipekeeper" q={t("faqExtended.whatIsApp")}>
            <p>{t("faqExtended.whatIsAppAnswer")}</p>
          </Q>
          <Q id="what-can-do" q={t("faqExtended.whatCanDo")}>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("faqExtended.whatCanDoList1")}</li>
              <li>{t("faqExtended.whatCanDoList2")}</li>
              <li>{t("faqExtended.whatCanDoList3")}</li>
              <li>{t("faqExtended.whatCanDoList4")}</li>
              <li>{t("faqExtended.whatCanDoList5")}</li>
            </ul>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicFieldDefinitions")}>
          <Q id="field-definitions" q={t("help.fieldDefinitions")}>
            <p>{t("helpCenter.fieldDefinitionsDesc")}</p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicTobaccoValuation")}>
          <Q id="tobacco-valuation" q={t("help.tobaccoValuation")}>
            <p>{t("helpCenter.tobaccoValuationDesc")}</p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicFeaturesAndTools")}>
          <Q id="features-ai" q={t("help.aiFeatures")}>
            <p>{t("helpCenter.aiDesc")}</p>
          </Q>

          <Q id="subscription-tiers" q={t("faqFull.subscriptionTiersQuestion")}>
            <div className="space-y-4">
              <div className="rounded-xl border border-[rgba(140,105,65,0.25)] bg-[rgba(28,21,16,0.72)] p-4">
                <h4 className="mb-2 font-semibold text-[#F5F1E7]">{t("faqFull.freeTier")}</h4>
                <ul className="ml-4 list-disc space-y-1 text-[#D8C7A6]/90">
                  <li>{t("faqFull.freeTrial7Days")}</li>
                  <li>{t("faqFull.upTo5Pipes")}</li>
                  <li>{t("faqFull.upTo10Tobacco")}</li>
                  <li>{t("faqFull.basicCollection")}</li>
                  <li>{t("faqFull.photoUploads")}</li>
                </ul>
              </div>

              <div className="rounded-xl border border-[rgba(180,140,75,0.32)] bg-[rgba(58,40,22,0.72)] p-4">
                <h4 className="mb-2 font-semibold text-[#F5F1E7]">{t("faqFull.proTier")}</h4>
                <ul className="ml-4 list-disc space-y-1 text-[#D8C7A6]/90">
                  <li>{t("faqFull.unlimitedPipesTobacco")}</li>
                  <li>{t("faqFull.aiMatching")}</li>
                  <li>{t("faqFull.pairingMatrix")}</li>
                  <li>{t("faqFull.smokingLog")}</li>
                  <li>{t("faqFull.collectionInsights")}</li>
                  <li>{t("faqFull.exportReports")}</li>
                  <li>{t("faqFull.publicProfile")}</li>
                  <li>{t("faqFull.breakInSchedules")}</li>
                  <li>{t("faqFull.aiPipeIdentification")}</li>
                  <li>{t("faqFull.marketValueLookup")}</li>
                  <li>{t("faqFull.geometryAnalysis")}</li>
                  <li>{t("faqFull.tobaccoAgingProjections")}</li>
                  <li>{t("faqFull.advancedValuation")}</li>
                  <li>{t("faqFull.prioritySupport")}</li>
                </ul>
              </div>

              <p className="mt-4 text-sm text-[#D8C7A6]/75">
                {t("faqFull.fullFeatureDescription")}: {" "}
                <a href="https://www.pipekeeperapp.com/features" target="_blank" rel="noopener noreferrer" className="text-[#D8C7A6] underline decoration-[rgba(163,92,92,0.6)] underline-offset-2 hover:text-[#F5F1E7]">
                  pipekeeperapp.com/features
                </a>
              </p>
            </div>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicAccountsAndData")}>
          <Q id="account-security" q={t("help.accountSecurity")}>
            <p>{t("helpCenter.accountSecurityDesc")}</p>
          </Q>
          <Q id="data-privacy" q={t("help.dataPrivacy")}>
            <p>{t("helpCenter.dataPrivacyDesc")}</p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicPlansAndSubscriptions")}>
          <Q id="tiers" q={t("faqExtended.whatAreTiers")}>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>{t("subscription.free")}:</strong> {t("faqExtended.freeTierDesc")}</li>
              <li><strong>{t("subscription.pro")}:</strong> {t("faqExtended.proTierDesc", { date: "2026" })}</li>
            </ul>
            <p className="mt-3 text-sm text-[#D8C7A6]/75">
              {t("faqExtended.legacySubscriberNote", { date: "2026" })}
            </p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicAI")}>
          <Q id="ai-accuracy" q={t("help.aiAccuracy")}>
            <p>{t("helpCenter.aiAccuracyDesc")}</p>
          </Q>
          <Q id="ai-how-it-works" q={t("help.aiHowItWorks")}>
            <p>{t("helpCenter.aiHowItWorksDesc")}</p>
          </Q>
          <Q id="ai-regenerate" q={t("help.aiRegenerate")}>
            <p>{t("helpCenter.aiRegenerateDesc")}</p>
          </Q>
        </Section>

        <Section title={t("auto.pages_FAQFull.cigarkeeper_1oz7i9")}>
          <Q id="cigarkeeper-what" q="What is CigarKeeper?">
            <p>{t("auto.pages_FAQFull.cigarkeeper_is_a_dedicated_module_for_1y3rqm")}</p>
          </Q>
          <Q id="cigarkeeper-free-vs-pro" q="What's included in the free vs. pro CigarKeeper plan?">
            <div className="space-y-3">
              <div className="rounded-xl border border-[rgba(140,105,65,0.25)] bg-[rgba(28,21,16,0.72)] p-4">
                <h4 className="mb-2 font-semibold text-[#F5F1E7]">{t("auto.pages_FAQFull.free_tier_lpe0uz")}</h4>
                <ul className="ml-4 list-disc space-y-1">
                  <li>{t("auto.pages_FAQFull.up_to_10_cigars_in_your_1lh8th")}</li>
                  <li>1 humidor with maintenance alerts</li>
                  <li>{t("auto.pages_FAQFull.session_logging_unlimited_1rsa98")}</li>
                  <li>{t("auto.pages_FAQFull.basic_collection_view_and_search_ph0syf")}</li>
                </ul>
              </div>
              <div className="rounded-xl border border-[rgba(180,140,75,0.32)] bg-[rgba(58,40,22,0.72)] p-4">
                <h4 className="mb-2 font-semibold text-[#F5F1E7]">{t("auto.pages_FAQFull.pro_tier_17l0x0")}</h4>
                <ul className="ml-4 list-disc space-y-1">
                  <li>{t("auto.pages_FAQFull.unlimited_cigars_and_humidors_1kwq0z")}</li>
                  <li>{t("auto.pages_FAQFull.curator_ai_recommendations_hpfviv")}</li>
                  <li>{t("auto.pages_FAQFull.collection_insights_and_analytics_1jssnm")}</li>
                  <li>{t("auto.pages_FAQFull.aging_readiness_and_value_tracking_ptx8ks")}</li>
                  <li>{t("auto.pages_FAQFull.advanced_session_analytics_1tmo1r")}</li>
                  <li>{t("auto.pages_FAQFull.export_reports_1lk3cg")}</li>
                </ul>
              </div>
              <p className="text-sm text-[#D8C7A6]/75">{t("auto.pages_FAQFull.you_can_start_using_cigarkeeper_on_te9jtc")}</p>
            </div>
          </Q>
          <Q id="cigarkeeper-humidor" q="How do humidor maintenance alerts work?">
            <p>{t("auto.pages_FAQFull.when_you_set_up_a_humidor_v9pev0")}</p>
          </Q>
          <Q id="cigarkeeper-sessions" q="Can I log sessions for cigars not in my collection?">
            <p>{t("auto.pages_FAQFull.yes_when_logging_a_session_toggle_r3t24w")} <strong>{t("auto.pages_FAQFull.smoked_outside_my_collection_1jgp9f")}</strong> to record a cigar you tried elsewhere. You can capture the brand, line, vitola, tasting notes, and ratings — and optionally add it to your wishlist afterward.</p>
          </Q>
          <Q id="cigarkeeper-onboarding" q="How do I get started with CigarKeeper?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("auto.pages_FAQFull.enable_cigarkeeper_from_your_profile_module_4oh5ax")}</li>
              <li>{t("auto.pages_FAQFull.the_cigarkeeper_onboarding_wizard_will_walk_h2n5zq")}</li>
              <li>{t("auto.pages_FAQFull.add_a_humidor_to_organize_your_54b6si")}</li>
              <li>{t("auto.pages_FAQFull.start_logging_smoking_sessions_to_build_7t79e3")}</li>
            </ol>
          </Q>
        </Section>

        <Section title={t("auto.pages_FAQFull.curator_chat_118pm1")}>
          <Q id="curator-chat-overview" q="What can I ask the Curator?">
            <p>{t("auto.pages_FAQFull.the_curator_is_an_ai_advisor_1towfq")}</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>{t("auto.pages_FAQFull.which_pipe_should_i_reassign_identifies_1um75k")}</li>
              <li>{t("auto.pages_FAQFull.what_is_my_most_redundant_pipe_1qzda2")}</li>
              <li>{t("auto.pages_FAQFull.what_should_i_smoke_tonight_generates_3l2ldt")}</li>
              <li>{t("auto.pages_FAQFull.what_s_the_biggest_gap_in_1iwuqe")}</li>
              <li>{t("auto.pages_FAQFull.explain_this_pairing_rationale_for_why_1lbqh9")}</li>
            </ul>
          </Q>
          <Q id="curator-follow-ups" q="How do I follow up in Curator conversations?">
            <p className="mb-2">{t("auto.pages_FAQFull.after_the_curator_gives_a_recommendation_1ustch")}</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>{t("auto.pages_FAQFull.next_best_option_hkpvmt")}</strong> {t("auto.pages_FAQFull.ask_what_comes_next_and_then_1fkq1b")}</li>
              <li><strong>{t("auto.pages_FAQFull.apply_a_constraint_1rowfo")}</strong> {t("auto.pages_FAQFull.say_i_want_to_keep_it_2l3pmw")}</li>
              <li><strong>{t("auto.pages_FAQFull.correct_something_1kli5d")}</strong> {t("auto.pages_FAQFull.if_the_curator_misunderstood_your_collection_1eaf49")}</li>
            </ul>
          </Q>
          <Q id="curator-confidence" q="What do confidence levels mean in Curator recommendations?">
            <p className="mb-2">{t("auto.pages_FAQFull.confidence_reflects_the_strength_of_the_u6d0y7")}</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>{t("auto.pages_FAQFull.strong_4dj5y4")}</strong> 6+ sessions with 70%+ consistent signal. The recommendation is well-supported by usage data.</li>
              <li><strong>{t("auto.pages_FAQFull.moderate_vjrwpc")}</strong> 3-5 sessions with a lean in one direction. The pattern is visible but still building.</li>
              <li><strong>{t("auto.pages_FAQFull.weak_3zivvr")}</strong> {t("auto.pages_FAQFull.early_signal_with_limited_data_more_g602nh")}</li>
            </ul>
            <p className="mt-2">{t("auto.pages_FAQFull.higher_confidence_recommendations_are_safer_to_14khj0")}</p>
          </Q>
          <Q id="curator-constraints" q="What happens when I apply a constraint?">
            <p>{t("auto.pages_FAQFull.when_you_mention_a_constraint_like_f0zcws")}</p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicWhiskeyAI")}>
          <Q id="whiskey-quick-add" q={t("help.whiskeyQuickAdd")}>
            <p>{t("helpCenter.whiskeyQuickAddDesc")}</p>
          </Q>
          <Q id="whiskey-bottle-lookup" q={t("help.whiskeyBottleLookup")}>
            <p>{t("helpCenter.whiskeyBottleLookupDesc")}</p>
          </Q>
          <Q id="whiskey-auto-fill" q={t("help.whiskeyAutoFill")}>
            <p>{t("helpCenter.whiskeyAutoFillDesc")}</p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicWhiskeyInsights")}>
          <Q id="whiskey-value" q={t("help.whiskeyValue")}>
            <p>{t("helpCenter.whiskeyValueDesc")}</p>
          </Q>
          <Q id="whiskey-tasting-analytics" q={t("help.whiskeyTastingAnalytics")}>
            <p>{t("helpCenter.whiskeyTastingAnalyticsDesc")}</p>
          </Q>
        </Section>

        <Section title={t("auto.pages_FAQFull.value_and_strategy_1bnfwi")}>
          <Q id="value-strategy-what" q="What is the Value &amp; Strategy section?">
            <p className="mb-2">{t("auto.pages_FAQFull.every_item_detail_page_bottles_pipes_seco2c")} <strong>{t("auto.pages_FAQFull.value_and_strategy_1bnfwi")}</strong> section that shows computed valuation data and a strategic recommendation tailored to that item type.</p>
            <p>{t("auto.pages_FAQFull.it_displays_current_value_with_a_1y1kyx")}</p>
          </Q>
          <Q id="value-strategy-checkpoint" q="How do I save a value checkpoint?">
            <p>{t("auto.pages_FAQFull.from_any_item_s_detail_page_eosh1r")} <strong>{t("auto.pages_FAQFull.save_checkpoint_1tg0r4")}</strong>{t("auto.pages_FAQFull.this_records_the_item_s_current_iqzvp6")}</p>
          </Q>
          <Q id="value-strategy-observation" q="How do I add a market price observation?">
            <p>{t("auto.pages_FAQFull.click_3lk3aj")} <strong>{t("auto.pages_FAQFull.add_observation_1v7odn")}</strong> in the Value &amp; Strategy section. You can record a real-world price you found (e.g. an auction result, a retailer listing, a secondary market price), along with the source name, URL, and price type (retail, auction, secondary market, etc.). Observations provide evidence for valuation and are stored separately from computed checkpoints.</p>
          </Q>
          <Q id="value-strategy-rarity" q="How is the Rarity Score calculated?">
            <p>{t("auto.pages_FAQFull.the_rarity_score_0_100_is_14jba9")}</p>
            <p className="mt-2">{t("auto.pages_FAQFull.a_score_of_0_25_is_1ih7e9")}</p>
          </Q>
          <Q id="value-strategy-badges" q="What do the status badges mean?">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>{t("auto.pages_FAQFull.discontinued_10hh6x")}</strong> {t("auto.pages_FAQFull.production_has_ended_supply_is_finite_dmstt9")}</li>
              <li><strong>{t("auto.pages_FAQFull.allocated_1e9tua")}</strong> {t("auto.pages_FAQFull.supply_is_restricted_or_rationed_by_1jgilm")}</li>
              <li><strong>{t("auto.pages_FAQFull.seasonal_q71x4r")}</strong> {t("auto.pages_FAQFull.only_available_at_certain_times_of_1k7as2")}</li>
              <li><strong>{t("auto.pages_FAQFull.one_of_a_kind_gcqqub")}</strong> {t("auto.pages_FAQFull.unique_pipe_irreplaceable_wdh2pe")}</li>
              <li><strong>{t("auto.pages_FAQFull.maker_deceased_v0k7sz")}</strong> {t("auto.pages_FAQFull.the_artisan_is_no_longer_alive_okn97f")}</li>
              <li><strong>{t("auto.pages_FAQFull.maker_retired_e0otic")}</strong> {t("auto.pages_FAQFull.the_maker_no_longer_produces_existing_1px70u")}</li>
              <li><strong>{t("auto.pages_FAQFull.exclusive_1q2st6")}</strong> {t("auto.pages_FAQFull.market_or_retailer_exclusive_release_gwq8vx")}</li>
            </ul>
            <p className="mt-2">{t("auto.pages_FAQFull.badges_appear_automatically_when_the_correspondi_nz6503")}</p>
          </Q>
        </Section>

        <Section title={t("auto.pages_FAQFull.pipe_reassignment_and_collection_analysis_5apszd")}>
          <Q id="pipe-reassignment-what" q="What is pipe reassignment?">
            <p className="mb-2">{t("auto.pages_FAQFull.pipe_reassignment_is_when_the_curator_1w20m8")}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("auto.pages_FAQFull.a_pipe_labeled_english_only_but_vol96s")}</li>
              <li>{t("auto.pages_FAQFull.a_pipe_with_no_focus_but_shc2w0")}</li>
            </ul>
            <p className="mt-2">{t("auto.pages_FAQFull.the_curator_ranks_reassignment_candidates_by_1gru9h")}</p>
          </Q>
          <Q id="pipe-reassignment-action" q="What should I do with a reassignment recommendation?">
            <p className="mb-2">{t("auto.pages_FAQFull.you_have_three_options_1td7y0")}</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>{t("auto.pages_FAQFull.accept_it_51tnnw")}</strong> {t("auto.pages_FAQFull.update_the_pipe_s_focus_field_13xpl0")}</li>
              <li><strong>{t("auto.pages_FAQFull.apply_a_constraint_1rowfo")}</strong> {t("auto.pages_FAQFull.if_you_want_to_keep_the_pi8b5e")}</li>
              <li><strong>{t("auto.pages_FAQFull.skip_it_hcuwib")}</strong> {t("auto.pages_FAQFull.ignore_the_recommendation_ask_for_the_44fj1x")}</li>
            </ul>
          </Q>
          <Q id="collection-redundancy" q="How do I know if a pipe is redundant?">
            <p className="mb-2">{t("auto.pages_FAQFull.a_pipe_is_redundant_when_it_1fs405")}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("auto.pages_FAQFull.you_have_3_billard_pipes_but_hi93u0")}</li>
              <li>{t("auto.pages_FAQFull.the_low_usage_pipe_doesn_t_8p9v6e")}</li>
            </ul>
            <p className="mt-2">{t("auto.pages_FAQFull.ask_the_curator_what_s_my_ijqv13")}</p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicSupport")}>
          <Q id="contact-support" q={t("help.contactSupport")}>
            <div className="space-y-3">
              <p>{t("helpCenter.contactDesc")}</p>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link to={createPageUrl("Support")} className="text-[#D8C7A6] underline decoration-[rgba(163,92,92,0.6)] underline-offset-2 hover:text-[#F5F1E7]">{t("nav.support")}</Link>
                </li>
                <li>
                  <Link to={createPageUrl("TermsOfService")} className="text-[#D8C7A6] underline decoration-[rgba(163,92,92,0.6)] underline-offset-2 hover:text-[#F5F1E7]">{t("nav.terms")}</Link>
                </li>
                <li>
                  <Link to={createPageUrl("PrivacyPolicy")} className="text-[#D8C7A6] underline decoration-[rgba(163,92,92,0.6)] underline-offset-2 hover:text-[#F5F1E7]">{t("nav.privacy")}</Link>
                </li>
              </ul>
            </div>
          </Q>
        </Section>

        {showTutorial && (
          <TutorialSystemPreview onClose={() => setShowTutorial(false)} />
        )}
      </div>
    </div>
    );
  }