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

  const sections = t("helpContent.faqFull.sections", { returnObjects: true });
  const verificationHelp = t("helpContent.faqFull.verificationHelp", { returnObjects: true });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A]">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 16px" }}>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">{t("helpContent.faqFull.pageTitle")}</h1>
          <p className="text-[#E0D8C8]/80 mb-4">{t("helpContent.faqFull.pageSubtitle")}</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl('HowTo')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <BookOpen className="w-4 h-4 mr-2" />
                {t("helpContent.faqFull.navHowTo")}
              </Button>
            </Link>
            <Link to={createPageUrl('Troubleshooting')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <Wrench className="w-4 h-4 mr-2" />
                {t("helpContent.faqFull.navTroubleshooting")}
              </Button>
            </Link>
          </div>
        </div>

      <Section title={sections.general?.title || "General"}>
        <Card className="bg-[#A35C5C]/10 border-[#A35C5C]/40 mb-6">
          <button
            onClick={() => toggleItem('verification-help')}
            className="w-full text-left p-4 flex items-center justify-between hover:bg-[#A35C5C]/5 transition-colors"
          >
            <span className="font-semibold text-[#E0D8C8] pr-4">{verificationHelp.q}</span>
            <ChevronDown 
              className={`w-5 h-5 text-[#E0D8C8]/70 flex-shrink-0 transition-transform ${openItems['verification-help'] ? 'rotate-180' : ''}`}
            />
          </button>
          {openItems['verification-help'] && (
            <CardContent className="px-4 pb-4 pt-0 text-[#E0D8C8]/80 leading-relaxed space-y-3">
              <p>{verificationHelp.intro}</p>
              <ol className="list-decimal list-inside space-y-2">
                {verificationHelp.steps?.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
              <p className="text-sm mt-3">{verificationHelp.note}</p>
            </CardContent>
          )}
        </Card>

        {sections.general?.items?.map((item) => (
          <Q key={item.id} id={item.id} q={item.q}>
            <p>{item.a}</p>
            {item.disclaimer && <div className="mt-2 font-semibold">{item.disclaimer}</div>}
          </Q>
        ))}
      </Section>

      <Section title={sections.gettingStarted?.title || "Getting Started"}>
        {sections.gettingStarted?.items?.map((item) => (
          <Q key={item.id} id={item.id} q={item.q}>
            {item.a}
            {item.cta && (
              <div className="mt-4">
                <a href={createPageUrl('Home?restart_tutorial=true')} className="inline-block">
                  <button className="px-4 py-2 bg-[#8b3a3a] text-white rounded-lg hover:bg-[#a94747] transition-colors">
                    {item.cta}
                  </button>
                </a>
              </div>
            )}
          </Q>
        ))}
      </Section>

      <Section title={sections.fieldDefinitions?.title || "Field Definitions"}>
        {sections.fieldDefinitions?.items?.map((item) => (
          <Q key={item.id} id={item.id} q={item.q}>{item.a}</Q>
        ))}
      </Section>

      <Section title={sections.tobaccoValuation?.title || "Tobacco Valuation"}>
        {sections.tobaccoValuation?.items?.map((item) => (
          <Q key={item.id} id={item.id} q={item.q}>{item.a}</Q>
        ))}
      </Section>

      <Section title={sections.featuresAndTools?.title || "Features & Tools"}>
        {sections.featuresAndTools?.items?.map((item) => (
          <Q key={item.id} id={item.id} q={item.q}>
            {item.intro && <p>{item.intro}</p>}
            {item.points && (
              <ul className="list-disc ml-6 mt-2 space-y-1">
                {item.points.map((point, i) => <li key={i}>{point}</li>)}
              </ul>
            )}
            {item.a && <p>{item.a}</p>}
            {item.conclusion && <p className="mt-2">{item.conclusion}</p>}
          </Q>
        ))}

        {/* Subscription Tiers Comparison */}
        <Q id="subscription-tiers" q="What are the subscription tiers and what's included?">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Free Tier</h4>
              <ul className="list-disc ml-4 space-y-1 text-gray-700">
                <li>7-day trial of all premium features</li>
                <li>Up to 5 pipes</li>
                <li>Up to 10 tobacco blends</li>
                <li>Basic collection management</li>
                <li>Photo uploads</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2">Premium Tier</h4>
              <ul className="list-disc ml-4 space-y-1 text-gray-700">
                <li>Unlimited pipes and tobacco blends</li>
                <li>AI tobacco matching recommendations</li>
                <li>Pairing matrix and optimization</li>
                <li>Smoking log and rotation planner</li>
                <li>Collection insights and statistics</li>
                <li>Export reports (PDF, CSV, Excel)</li>
                <li>Public profile and community features</li>
                <li>Break-in schedules</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">Pro Tier</h4>
              <ul className="list-disc ml-4 space-y-1 text-gray-700">
                <li>Everything in Premium, plus:</li>
                <li>AI pipe identification from photos</li>
                <li>Market value lookup for pipes and tobacco</li>
                <li>Geometry analysis from photos</li>
                <li>Tobacco aging projections and cellar trends</li>
                <li>Advanced valuation tracking</li>
                <li>Priority support</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              For a full feature description visit:{" "}
              <a href="https://www.pipekeeperapp.com/features" target="_blank" rel="noopener noreferrer" className="text-[#8b3a3a] hover:text-[#a94747] underline">
                https://www.pipekeeperapp.com/features
              </a>
            </p>
          </div>
        </Q>
      </Section>

      <Section title={sections.accountsAndData?.title || "Accounts & Data"}>
        {sections.accountsAndData?.items?.map((item) => (
          <Q key={item.id} id={item.id} q={item.q}>{item.a}</Q>
        ))}
      </Section>

      <Section title={sections.ai?.title || "AI Features & Accuracy"}>
        {sections.ai?.items?.map((item) => (
          <Q key={item.id} id={item.id} q={item.q}>{item.a}</Q>
        ))}
      </Section>

      <Section title={sections.support?.title || "Support"}>
        <Q id="contact-support" q={sections.support?.contactQ || "How do I contact support?"}>
          {sections.support?.contactIntro}{" "}
          <a href="https://pipekeeper.app" target="_blank" rel="noreferrer" className="text-[#8b3a3a] hover:text-[#a94747] underline">
            pipekeeper.app
          </a>
          . {sections.support?.contactLinks}
          <ul className="mt-2 space-y-1">
            <li>
              <Link to={createPageUrl('TermsOfService')} className="text-[#8b3a3a] hover:text-[#a94747] underline">{t("nav.terms")}</Link>
            </li>
            <li>
              <Link to={createPageUrl('PrivacyPolicy')} className="text-[#8b3a3a] hover:text-[#a94747] underline">{t("nav.privacy")}</Link>
            </li>
          </ul>
        </Q>
      </Section>
    </div>
    </div>
  );
}