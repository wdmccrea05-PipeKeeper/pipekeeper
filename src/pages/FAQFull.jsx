import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
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
        </div>

        {showTutorial && (
        <TutorialSystemPreview onClose={() => setShowTutorial(false)} />
        )}
        </div>
        );
        }

        function TutorialSystemPreview({ onClose }) {
          const { t } = useTranslation();
          const navigate = useNavigate();

          const handleStartTutorial = async () => {
            try {
              // Get current user to clear skip flag
              const user = await (await import("@/api/base44Client")).base44.auth.me();
              if (user?.email) {
                localStorage.removeItem(`pk_quickstart_skipped_${user.email}`);
                localStorage.removeItem(`pk_quickstart_completed_${user.email}`);
                // Signal Home to force show tutorial
                localStorage.setItem(`pk_force_tutorial_${user.email}`, 'true');
              }
            } catch (e) {
              console.error('Error clearing tutorial state:', e);
            }

            // Navigate to Home where tutorial system is active
            navigate(createPageUrl("Home"));
            onClose();
          };

          return (
            <div className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-gradient-to-br from-[#2a1f18] to-[#1f1510] rounded-2xl border border-[rgba(140,105,65,0.35)] p-8 text-center space-y-4">
                <h2 className="text-2xl font-bold text-[#F5F1E7]">{t("help.tutorialModalTitle", "Start Your Tutorial?")}</h2>
                <p className="text-[#D8C7A6]/80">
                  {t("help.tutorialModalDesc", "The Quick Start guide will walk you through adding your first pipes, blends, and more.")}
                </p>
                <div className="flex gap-3 justify-center pt-4">
                  <Button variant="outline" onClick={onClose} className="border-[rgba(140,105,65,0.35)] text-[#F5F1E7]">
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button 
                    onClick={handleStartTutorial}
                    className="bg-amber-700 hover:bg-amber-600 text-[#F5F1E7]"
                  >
                    {t("help.startTutorial", "Start Tutorial")}
                  </Button>
                </div>
              </div>
            </div>
          );
        }