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
                {t("help.howTo", "How-To")}
              </Button>
            </Link>
            <Link to={createPageUrl("TroubleshootingFull")}>
              <Button variant="outline" className="border-[rgba(140,105,65,0.35)] bg-[rgba(28,21,16,0.72)] text-[#F5F1E7] hover:bg-[rgba(163,92,92,0.12)]">
                <Wrench className="mr-2 h-4 w-4" />
                {t("help.troubleshooting", "Troubleshooting")}
              </Button>
            </Link>
            <Button 
              onClick={() => setShowTutorial(true)}
              className="border-[rgba(180,140,75,0.35)] bg-[rgba(58,40,22,0.72)] text-[#F5F1E7] hover:bg-[rgba(180,140,75,0.2)]"
              variant="outline"
            >
              <Play className="mr-2 h-4 w-4" />
              {t("help.launchTutorial", "Launch Tutorial")}
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
                  {t("faqFullAdditional.item1")}
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
              {t("faqExtended.legacySubscriberNote", { date: "2026", defaultValue: "Founding subscribers have grandfathered access to all Pro features." })}
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

        <Section title={t("faqFullAdditional.item2")}>
          <Q id="cigarkeeper-what" q="What is CigarKeeper?">
            <p>{t("faqFullAdditional.item3")}</p>
          </Q>
          <Q id="cigarkeeper-free-vs-pro" q="What's included in the free vs. pro CigarKeeper plan?">
            <div className="space-y-3">
              <div className="rounded-xl border border-[rgba(140,105,65,0.25)] bg-[rgba(28,21,16,0.72)] p-4">
                <h4 className="mb-2 font-semibold text-[#F5F1E7]">{t("faqFullAdditional.item4")}</h4>
                <ul className="ml-4 list-disc space-y-1">
                  <li>{t("faqFullAdditional.item5")}</li>
                  <li>{t("faqFullAdditional.item6")}</li>
                  <li>{t("faqFullAdditional.item7")}</li>
                  <li>{t("faqFullAdditional.item8")}</li>
                </ul>
              </div>
              <div className="rounded-xl border border-[rgba(180,140,75,0.32)] bg-[rgba(58,40,22,0.72)] p-4">
                <h4 className="mb-2 font-semibold text-[#F5F1E7]">{t("faqFullAdditional.item9")}</h4>
                <ul className="ml-4 list-disc space-y-1">
                  <li>{t("faqFullAdditional.item10")}</li>
                  <li>{t("faqFullAdditional.item11")}</li>
                  <li>{t("faqFullAdditional.item12")}</li>
                  <li>{t("faqFullAdditional.item13")}</li>
                  <li>{t("faqFullAdditional.item14")}</li>
                  <li>{t("faqFullAdditional.item15")}</li>
                </ul>
              </div>
              <p className="text-sm text-[#D8C7A6]/75">{t("faqFullAdditional.item16")}</p>
            </div>
          </Q>
          <Q id="cigarkeeper-humidor" q="How do humidor maintenance alerts work?">
            <p>{t("faqFullAdditional.item17")}</p>
          </Q>
          <Q id="cigarkeeper-sessions" q="Can I log sessions for cigars not in my collection?">
            <p>{t("faqFullAdditional.item18")} <strong>{t("faqFullAdditional.item19")}</strong> {t("faqFullAdditional.item20")}</p>
          </Q>
          <Q id="cigarkeeper-onboarding" q="How do I get started with CigarKeeper?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("faqFullAdditional.item21")}</li>
              <li>{t("faqFullAdditional.item22")}</li>
              <li>{t("faqFullAdditional.item23")}</li>
              <li>{t("faqFullAdditional.item24")}</li>
            </ol>
          </Q>
        </Section>

        <Section title={t("faqFullAdditional.item25")}>
          <Q id="curator-chat-overview" q="What can I ask the Curator?">
            <p>{t("faqFullAdditional.item26")}</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>{t("faqFullAdditional.item27")}</li>
              <li>{t("faqFullAdditional.item28")}</li>
              <li>{t("faqFullAdditional.item29")}</li>
              <li>{t("faqFullAdditional.item30")}</li>
              <li>{t("faqFullAdditional.item31")}</li>
            </ul>
          </Q>
          <Q id="curator-follow-ups" q="How do I follow up in Curator conversations?">
            <p className="mb-2">{t("faqFullAdditional.item32")}</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>{t("faqFullAdditional.item33")}</strong> {t("faqFullAdditional.item34")}</li>
              <li><strong>{t("faqFullAdditional.item35")}</strong> {t("faqFullAdditional.item36")}</li>
              <li><strong>{t("faqFullAdditional.item37")}</strong> {t("faqFullAdditional.item38")}</li>
            </ul>
          </Q>
          <Q id="curator-confidence" q="What do confidence levels mean in Curator recommendations?">
            <p className="mb-2">{t("faqFullAdditional.item39")}</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>{t("faqFullAdditional.item40")}</strong> {t("faqFullAdditional.item41")}</li>
              <li><strong>{t("faqFullAdditional.item42")}</strong> {t("faqFullAdditional.item43")}</li>
              <li><strong>{t("faqFullAdditional.item44")}</strong> {t("faqFullAdditional.item45")}</li>
            </ul>
            <p className="mt-2">{t("faqFullAdditional.item46")}</p>
          </Q>
          <Q id="curator-constraints" q="What happens when I apply a constraint?">
            <p>{t("faqFullAdditional.item47")}</p>
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

        <Section title={t("faqFullAdditional.item48")}>
          <Q id="value-strategy-what" q="What is the Value &amp; Strategy section?">
            <p className="mb-2">{t("faqFullAdditional.item49")} <strong>{t("faqFullAdditional.item50")}</strong> {t("faqFullAdditional.item51")}</p>
            <p>{t("faqFullAdditional.item52")}</p>
          </Q>
          <Q id="value-strategy-checkpoint" q="How do I save a value checkpoint?">
            <p>{t("faqFullAdditional.item53")} <strong>{t("faqFullAdditional.item54")}</strong>{t("faqFullAdditional.item55")}</p>
          </Q>
          <Q id="value-strategy-observation" q="How do I add a market price observation?">
            <p>{t("faqFullAdditional.item56")} <strong>{t("faqFullAdditional.item57")}</strong> {t("faqFullAdditional.item58")}</p>
          </Q>
          <Q id="value-strategy-rarity" q="How is the Rarity Score calculated?">
            <p>{t("faqFullAdditional.item59")}</p>
            <p className="mt-2">{t("faqFullAdditional.item60")}</p>
          </Q>
          <Q id="value-strategy-badges" q="What do the status badges mean?">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>{t("faqFullAdditional.item61")}</strong> {t("faqFullAdditional.item62")}</li>
              <li><strong>{t("faqFullAdditional.item63")}</strong> {t("faqFullAdditional.item64")}</li>
              <li><strong>{t("faqFullAdditional.item65")}</strong> {t("faqFullAdditional.item66")}</li>
              <li><strong>{t("faqFullAdditional.item67")}</strong> {t("faqFullAdditional.item68")}</li>
              <li><strong>{t("faqFullAdditional.item69")}</strong> {t("faqFullAdditional.item70")}</li>
              <li><strong>{t("faqFullAdditional.item71")}</strong> {t("faqFullAdditional.item72")}</li>
              <li><strong>{t("faqFullAdditional.item73")}</strong> {t("faqFullAdditional.item74")}</li>
            </ul>
            <p className="mt-2">{t("faqFullAdditional.item75")}</p>
          </Q>
        </Section>

        <Section title={t("faqFullAdditional.item76")}>
          <Q id="curator-history" q="Can Curator search my past sessions and tasting notes?">
            <p>{t("faqFullAdditional.item77")}</p>
          </Q>
          <Q id="curator-history-pipe" q="What historical questions can I ask about pipes and tobacco?">
            <div className="space-y-2">
              <p>{t("faqFullAdditional.item78")}</p>
              <p>{t("faqFullAdditional.item79")} <strong>{t("faqFullAdditional.item80")}</strong> <strong>{t("faqFullAdditional.item81")}</strong> or <strong>{t("faqFullAdditional.item82")}</strong></p>
            </div>
          </Q>
          <Q id="curator-history-whiskey" q="What historical questions can I ask about whiskey?">
            <p>{t("faqFullAdditional.item83")} <strong>{t("faqFullAdditional.item84")}</strong></p>
          </Q>
          <Q id="curator-history-cigar" q="What historical questions can I ask about cigars?">
            <p>{t("faqFullAdditional.item85")} <strong>{t("faqFullAdditional.item86")}</strong></p>
          </Q>
          <Q id="curator-history-wine" q="What historical questions can I ask about wine?">
            <p>{t("faqFullAdditional.item87")} <strong>{t("faqFullAdditional.item88")}</strong></p>
          </Q>
          <Q id="curator-history-source" q="Where does Curator get historical answers?">
            <p>{t("faqFullAdditional.item89")}</p>
          </Q>
        </Section>

        <Section title={t("faqFullAdditional.item90")}>
          <Q id="pipe-club-what" q="What is Pipe Club?">
            <p>{t("faqFullAdditional.item91")}</p>
          </Q>
          <Q id="pipe-club-start" q="How do I start a Pipe Club session?">
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to <strong>{t("faqFullAdditional.item92")}</strong> {t("faqFullAdditional.item93")}</li>
              <li>{t("faqFullAdditional.item94")} <strong>{t("faqFullAdditional.item95")}</strong>.</li>
              <li>{t("faqFullAdditional.item96")}</li>
              <li>{t("faqFullAdditional.item97")}</li>
              <li>{t("faqFullAdditional.item98")}</li>
              <li>{t("faqFullAdditional.item99")}</li>
            </ol>
          </Q>
          <Q id="pipe-club-recommendation" q="How does the Pipe Club recommendation work?">
            <p>{t("faqFullAdditional.item100")}</p>
          </Q>
          <Q id="pipe-club-blend-sources" q="Where can I select the club blend from?">
            <p>{t("faqFullAdditional.item101")}</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li><strong>{t("faqFullAdditional.item102")}</strong> {t("faqFullAdditional.item103")}</li>
              <li><strong>{t("faqFullAdditional.item104")}</strong> {t("faqFullAdditional.item105")}</li>
              <li><strong>{t("faqFullAdditional.item106")}</strong> {t("faqFullAdditional.item107")} <strong>{t("faqFullAdditional.item108")}</strong> {t("faqFullAdditional.item109")}</li>
            </ul>
          </Q>
          <Q id="pipe-club-quick-lookup" q="What is Quick Lookup and how do I use it?">
            <p>{t("faqFullAdditional.item110")}</p>
          </Q>
          <Q id="pipe-club-identify-ai" q="What does the Identify Blend (AI) button do?">
            <p>{t("faqFullAdditional.item111")} <strong>{t("faqFullAdditional.item112")}</strong>{t("faqFullAdditional.item113")}</p>
          </Q>
          <Q id="pipe-club-bowl-variants" q="Can I select a specific interchangeable bowl for a system pipe?">
            <p>{t("faqFullAdditional.item114")}</p>
          </Q>
          <Q id="pipe-club-log" q="What should I record after the session?">
            <p>{t("faqFullAdditional.item115")}</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li><strong>{t("faqFullAdditional.item116")}</strong> {t("faqFullAdditional.item117")}</li>
              <li><strong>{t("faqFullAdditional.item118")}</strong> {t("faqFullAdditional.item119")}</li>
              <li><strong>{t("faqFullAdditional.item120")}</strong> {t("faqFullAdditional.item121")}</li>
              <li><strong>{t("faqFullAdditional.item122")}</strong> {t("faqFullAdditional.item123")}</li>
              <li><strong>{t("faqFullAdditional.item124")}</strong> {t("faqFullAdditional.item125")}</li>
              <li><strong>{t("faqFullAdditional.item126")}</strong> {t("faqFullAdditional.item127")}</li>
            </ul>
          </Q>
          <Q id="pipe-club-history" q="Where can I see my past Pipe Club sessions?">
            <p>{t("faqFullAdditional.item128")} <strong>{t("faqFullAdditional.item129")}</strong>{t("faqFullAdditional.item130")}</p>
          </Q>
        </Section>

        <Section title={t("faqFullAdditional.item131")}>
          <Q id="pipe-reassignment-what" q="What is pipe reassignment?">
            <p className="mb-2">{t("faqFullAdditional.item132")}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("faqFullAdditional.item133")}</li>
              <li>{t("faqFullAdditional.item134")}</li>
            </ul>
            <p className="mt-2">{t("faqFullAdditional.item135")}</p>
          </Q>
          <Q id="pipe-reassignment-action" q="What should I do with a reassignment recommendation?">
            <p className="mb-2">{t("faqFullAdditional.item136")}</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>{t("faqFullAdditional.item137")}</strong> {t("faqFullAdditional.item138")}</li>
              <li><strong>{t("faqFullAdditional.item139")}</strong> {t("faqFullAdditional.item140")}</li>
              <li><strong>{t("faqFullAdditional.item141")}</strong> {t("faqFullAdditional.item142")}</li>
            </ul>
          </Q>
          <Q id="collection-redundancy" q="How do I know if a pipe is redundant?">
            <p className="mb-2">{t("faqFullAdditional.item143")}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("faqFullAdditional.item144")}</li>
              <li>{t("faqFullAdditional.item145")}</li>
            </ul>
            <p className="mt-2">{t("faqFullAdditional.item146")}</p>
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