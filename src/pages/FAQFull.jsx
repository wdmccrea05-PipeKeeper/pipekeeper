import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, Wrench, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function FAQFull() {
  const { t } = useTranslation();
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
    <Card className="overflow-hidden" style={{
      background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
      border: "1px solid rgba(140,105,65,0.35)",
      boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)"
    }}>
      <button
        onClick={() => toggleItem(id)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-[#3a2a20]/50 transition-colors"
      >
        <span className="font-semibold text-[#E0D8C8] pr-4">{q}</span>
        <ChevronDown 
          className={`w-5 h-5 text-[#8b6239] flex-shrink-0 transition-transform ${openItems[id] ? 'rotate-180' : ''}`}
        />
      </button>
      {openItems[id] && (
        <CardContent className="px-4 pb-4 pt-0 text-[#E0D8C8]/80 leading-relaxed">
          {children}
        </CardContent>
      )}
    </Card>
  );

  // Note: Using simplified object access - all keys now in en.json under faqFull namespace
  // These will fallback to empty objects if keys are missing, preventing blank sections

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, rgba(15,11,8,0.95), rgba(20,15,10,0.95))" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 16px" }}>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">{t("faqExtended.pageTitle")}</h1>
           <p className="text-[#E0D8C8]/80 mb-4">{t("faqExtended.pageSubtitle")}</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl('HowTo')}>
              <Button variant="outline" style={{
                background: "rgba(60, 42, 28, 0.35)",
                borderColor: "rgba(120, 90, 65, 0.3)",
                color: "#F5F1E7"
              }}>
                <BookOpen className="w-4 h-4 mr-2" />
                {t("help.howTo", "How-To")}
                </Button>
                </Link>
                <Link to={createPageUrl('TroubleshootingFull')}>
                <Button variant="outline" style={{
                  background: "rgba(60, 42, 28, 0.35)",
                  borderColor: "rgba(120, 90, 65, 0.3)",
                  color: "#F5F1E7"
                }}>
                 <Wrench className="w-4 h-4 mr-2" />
                 {t("help.troubleshooting", "Troubleshooting")}
               </Button>
             </Link>
           </div>
         </div>

      <Section title={t("helpCenter.topicGeneral")}>
         <Q id="verification-help" q={t("verificationHelp.pageTitle")}>
           <div className="space-y-3">
             <p>{t("verificationHelp.expiredDesc")}</p>
             <div className="bg-stone-50 p-3 rounded">
               <p className="font-semibold mb-2">{t("verificationHelp.option1Title")}</p>
               <p className="text-sm">{t("verificationHelp.option1Desc")}</p>
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
             <li>{t("faqExtended.whatCanDoList6")}</li>
             <li>{t("faqExtended.whatCanDoList7")}</li>
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

        {/* Subscription Tiers Comparison */}
        <Q id="subscription-tiers" q={t("faqFull.subscriptionTiersQuestion")}>
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{
              background: "rgba(60, 45, 30, 0.3)",
              border: "1px solid rgba(140, 105, 65, 0.25)"
            }}>
              <h4 className="font-semibold text-[#E0D8C8] mb-2">{t("faqFull.freeTier")}</h4>
              <ul className="list-disc ml-4 space-y-1 text-[#E0D8C8]/80">
                <li>{t("faqFull.freeTrial7Days")}</li>
                <li>{t("faqFull.upTo5Pipes")}</li>
                <li>{t("faqFull.upTo10Tobacco")}</li>
                <li>{t("faqFull.basicCollection")}</li>
                <li>{t("faqFull.photoUploads")}</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg" style={{
              background: "rgba(140, 100, 60, 0.15)",
              border: "1px solid rgba(180, 140, 75, 0.3)"
            }}>
              <h4 className="font-semibold text-[#D4A574] mb-2">{t("faqFull.premiumTier")}</h4>
              <ul className="list-disc ml-4 space-y-1 text-[#E0D8C8]/80">
                <li>{t("faqFull.unlimitedPipesTobacco")}</li>
                <li>{t("faqFull.aiMatching")}</li>
                <li>{t("faqFull.pairingMatrix")}</li>
                <li>{t("faqFull.smokingLog")}</li>
                <li>{t("faqFull.collectionInsights")}</li>
                <li>{t("faqFull.exportReports")}</li>
                <li>{t("faqFull.publicProfile")}</li>
                <li>{t("faqFull.breakInSchedules")}</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg" style={{
              background: "rgba(100, 70, 130, 0.15)",
              border: "1px solid rgba(150, 100, 180, 0.3)"
            }}>
              <h4 className="font-semibold text-[#D4A574] mb-2">{t("faqFull.proTier")}</h4>
              <ul className="list-disc ml-4 space-y-1 text-[#E0D8C8]/80">
                <li>{t("faqFull.everythingInPremium")}</li>
                <li>{t("faqFull.aiPipeIdentification")}</li>
                <li>{t("faqFull.marketValueLookup")}</li>
                <li>{t("faqFull.geometryAnalysis")}</li>
                <li>{t("faqFull.tobaccoAgingProjections")}</li>
                <li>{t("faqFull.advancedValuation")}</li>
                <li>{t("faqFull.prioritySupport")}</li>
              </ul>
            </div>

            <p className="text-sm text-[#E0D8C8]/70 mt-4">
              {t("faqFull.fullFeatureDescription")}:{" "}
              <a href="https://www.pipekeeperapp.com/features" target="_blank" rel="noopener noreferrer" className="text-[#8b3a3a] hover:text-[#a94747] underline">
                https://www.pipekeeperapp.com/features
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
            <li><strong>{t("subscription.premium")}:</strong> {t("faqExtended.premiumTierDesc")}</li>
            <li><strong>{t("subscription.pro")}:</strong> {t("faqExtended.proTierDesc", { date: "February 1, 2026" })}</li>
          </ul>
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
        <Q id="collection-value" q={t("faqExtended.collectValueQ")}>
          <p>{t("faqExtended.collectValueAnswer")}</p>
        </Q>
        <Q id="curator" q={t("faqExtended.curatorQ")}>
          <p>{t("faqExtended.curatorAnswer")}</p>
        </Q>
        <Q id="story-cards" q={t("faqExtended.storyCardsQ")}>
          <p>{t("faqExtended.storyCardsAnswer")}</p>
        </Q>
        <Q id="ai-valuation" q={t("faqExtended.aiValueQ")}>
          <p>{t("faqExtended.aiValueAnswer")}</p>
        </Q>
        <Q id="logging-optional" q={t("faqExtended.loggingOptionalQ")}>
          <p>{t("faqExtended.loggingOptionalAnswer")}</p>
        </Q>
      </Section>

      <Section title={t("helpCenter.topicSupport")}>
        <Q id="contact-support" q={t("help.contactSupport")}>
          <div className="space-y-3">
            <p>{t("helpCenter.contactDesc")}</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link to={createPageUrl('Support')} className="text-[#8b3a3a] hover:text-[#a94747] underline">{t("nav.support")}</Link>
              </li>
              <li>
                <Link to={createPageUrl('TermsOfService')} className="text-[#8b3a3a] hover:text-[#a94747] underline">{t("nav.terms")}</Link>
              </li>
              <li>
                <Link to={createPageUrl('PrivacyPolicy')} className="text-[#8b3a3a] hover:text-[#a94747] underline">{t("nav.privacy")}</Link>
              </li>
            </ul>
          </div>
        </Q>
      </Section>
    </div>
    </div>
  );
}