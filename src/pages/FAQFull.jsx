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
    <Card className="bg-white border-gray-200 overflow-hidden">
      <button
        onClick={() => toggleItem(id)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 pr-4">{q}</span>
        <ChevronDown 
          className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${openItems[id] ? 'rotate-180' : ''}`}
        />
      </button>
      {openItems[id] && (
        <CardContent className="px-4 pb-4 pt-0 text-gray-700 leading-relaxed">
          {children}
        </CardContent>
      )}
    </Card>
  );

  // Note: Using simplified object access - all keys now in en.json under faqFull namespace
  // These will fallback to empty objects if keys are missing, preventing blank sections

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A]">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 16px" }}>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">{t("faqExtended.pageTitle")}</h1>
           <p className="text-[#E0D8C8]/80 mb-4">{t("faqExtended.pageSubtitle")}</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl('HowTo')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <BookOpen className="w-4 h-4 mr-2" />
                {t("help.howTo")}
                </Button>
                </Link>
                <Link to={createPageUrl('TroubleshootingFull')}>
                <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                 <Wrench className="w-4 h-4 mr-2" />
                 {t("help.troubleshooting")}
              </Button>
            </Link>
          </div>
        </div>

      <Section title={t("helpCenter.topicGeneral", "General")}>
         <Q id="verification-help" q={t("verificationHelp.pageTitle", "Email Verification Help")}>
           <div className="space-y-3">
             <p>{t("verificationHelp.expiredDesc", "If your email verification code expired or you missed the 10-minute window, you have a few options:")}</p>
             <div className="bg-stone-50 p-3 rounded">
               <p className="font-semibold mb-2">{t("verificationHelp.option1Title", "Option 1: Request a New Verification Code")}</p>
               <p className="text-sm">{t("verificationHelp.option1Desc", "Click below to return to the login page. Enter your email again and a fresh verification code will be sent automatically with a new 10-minute window.")}</p>
             </div>
           </div>
         </Q>
       </Section>

       <Section title={t("helpCenter.topicGettingStarted", "Getting Started")}>
         <Q id="getting-started" q={t("help.gettingStarted", "How do I get started with PipeKeeper?")}>
           <p>{t("helpCenter.gettingStartedDesc", "Start by adding your first pipe and tobacco blend to your collection. Then explore features like smoking logs, pairing recommendations, and collection insights.")}</p>
         </Q>
       </Section>

       <Section title={t("helpCenter.topicFieldDefinitions", "Field Definitions")}>
         <Q id="field-definitions" q={t("help.fieldDefinitions", "What do the different fields mean?")}>
           <p>{t("helpCenter.fieldDefinitionsDesc", "Check the Help menu for detailed explanations of each field in the pipe and tobacco forms.")}</p>
         </Q>
       </Section>

       <Section title={t("helpCenter.topicTobaccoValuation", "Tobacco Valuation")}>
         <Q id="tobacco-valuation" q={t("help.tobaccoValuation", "How is tobacco value calculated?")}>
           <p>{t("helpCenter.tobaccoValuationDesc", "AI valuation analyzes public marketplace data to estimate market value. Manual market value can be entered directly on the tobacco detail page.")}</p>
         </Q>
       </Section>

       <Section title={t("helpCenter.topicFeaturesAndTools", "Features & Tools")}>
         <Q id="features-ai" q={t("help.aiFeatures", "What AI features are available?")}>
           <p>{t("helpCenter.aiDesc", "PipeKeeper includes AI pipe identification, tobacco matching, collection optimization, and geometry analysis from photos.")}</p>
         </Q>

        {/* Subscription Tiers Comparison */}
        <Q id="subscription-tiers" q={t("faqFull.subscriptionTiersQuestion","What are the subscription tiers and what's included?")}>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">{t("faqFull.freeTier","Free Tier")}</h4>
              <ul className="list-disc ml-4 space-y-1 text-gray-700">
                <li>{t("faqFull.freeTrial7Days","7-day trial of all premium features")}</li>
                <li>{t("faqFull.upTo5Pipes","Up to 5 pipes")}</li>
                <li>{t("faqFull.upTo10Tobacco","Up to 10 tobacco blends")}</li>
                <li>{t("faqFull.basicCollection","Basic collection management")}</li>
                <li>{t("faqFull.photoUploads","Photo uploads")}</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2">{t("faqFull.premiumTier","Premium Tier")}</h4>
              <ul className="list-disc ml-4 space-y-1 text-gray-700">
                <li>{t("faqFull.unlimitedPipesTobacco","Unlimited pipes and tobacco blends")}</li>
                <li>{t("faqFull.aiMatching","AI tobacco matching recommendations")}</li>
                <li>{t("faqFull.pairingMatrix","Pairing matrix and optimization")}</li>
                <li>{t("faqFull.smokingLog","Smoking log and rotation planner")}</li>
                <li>{t("faqFull.collectionInsights","Collection insights and statistics")}</li>
                <li>{t("faqFull.exportReports","Export reports (PDF, CSV, Excel)")}</li>
                <li>{t("faqFull.publicProfile","Public profile and community features")}</li>
                <li>{t("faqFull.breakInSchedules","Break-in schedules")}</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">{t("faqFull.proTier","Pro Tier")}</h4>
              <ul className="list-disc ml-4 space-y-1 text-gray-700">
                <li>{t("faqFull.everythingInPremium","Everything in Premium, plus:")}</li>
                <li>{t("faqFull.aiPipeIdentification","AI pipe identification from photos")}</li>
                <li>{t("faqFull.marketValueLookup","Market value lookup for pipes and tobacco")}</li>
                <li>{t("faqFull.geometryAnalysis","Geometry analysis from photos")}</li>
                <li>{t("faqFull.tobaccoAgingProjections","Tobacco aging projections and cellar trends")}</li>
                <li>{t("faqFull.advancedValuation","Advanced valuation tracking")}</li>
                <li>{t("faqFull.prioritySupport","Priority support")}</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              {t("faqFull.fullFeatureDescription","For a full feature description visit")}:{" "}
              <a href="https://www.pipekeeperapp.com/features" target="_blank" rel="noopener noreferrer" className="text-[#8b3a3a] hover:text-[#a94747] underline">
                https://www.pipekeeperapp.com/features
              </a>
            </p>
          </div>
        </Q>
      </Section>

      <Section title={t("helpCenter.topicAccountsAndData", "Accounts & Data")}>
        <Q id="account-security" q={t("help.accountSecurity", "How is my account secured?")}>
          <p>{t("helpCenter.accountSecurityDesc", "Your account data is encrypted and secured by Base44's authentication system. We never store password data.")}</p>
        </Q>
      </Section>

      <Section title={t("helpCenter.topicAI", "AI Features & Accuracy")}>
        <Q id="ai-accuracy" q={t("help.aiAccuracy", "How accurate are the AI recommendations?")}>
          <p>{t("helpCenter.aiAccuracyDesc", "AI recommendations are based on your collection data and preferences. Results improve as you add more details and log smoking sessions.")}</p>
        </Q>
      </Section>

      <Section title={t("helpCenter.topicSupport", "Support")}>
        <Q id="contact-support" q={t("help.contactSupport", "How do I contact support?")}>
          <div className="space-y-3">
            <p>{t("helpCenter.contactDesc", "Visit the Support page in the app menu or email us directly. Links to all support resources are available in the footer.")}</p>
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