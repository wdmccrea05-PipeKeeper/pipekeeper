import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, RefreshCw, AlertCircle, Sparkles, Tags, Target, Info, BookOpen, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function TroubleshootingFull() {
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

  const troubleshootingTopics = [
    {
      id: "pageRefresh",
      icon: RefreshCw,
      title: t("helpCenter.topicPageRefresh"),
      color: "text-blue-400",
      questions: [
        { q: t("troubleshooting.pageRefresh_q1"), a: t("troubleshooting.pageRefresh_a1") },
        { q: t("troubleshooting.pageRefresh_q2"), a: t("troubleshooting.pageRefresh_a2") },
        { q: t("troubleshooting.pageRefresh_q3"), a: t("troubleshooting.pageRefresh_a3") },
        { q: t("troubleshooting.pageRefresh_q4"), a: t("troubleshooting.pageRefresh_a4") },
      ]
    },
    {
      id: "aiFeatures",
      icon: Sparkles,
      title: t("helpCenter.topicAIFeatures"),
      color: "text-purple-400",
      questions: [
        { q: t("troubleshooting.aiFeatures_q1"), a: t("troubleshooting.aiFeatures_a1") },
        { q: t("troubleshooting.aiFeatures_q2"), a: t("troubleshooting.aiFeatures_a2") },
        { q: t("troubleshooting.aiFeatures_q3"), a: t("troubleshooting.aiFeatures_a3") },
        { q: t("troubleshooting.aiFeatures_q4"), a: t("troubleshooting.aiFeatures_a4") },
        { q: t("troubleshooting.aiFeatures_q5"), a: t("troubleshooting.aiFeatures_a5") },
        { q: t("troubleshooting.aiFeatures_q6"), a: t("troubleshooting.aiFeatures_a6") },
        { q: t("troubleshooting.aiFeatures_q7"), a: t("troubleshooting.aiFeatures_a7") },
        { q: t("troubleshooting.aiFeatures_q8"), a: t("troubleshooting.aiFeatures_a8") },
        { q: t("troubleshooting.aiFeatures_q9"), a: t("troubleshooting.aiFeatures_a9") },
      ]
    },
    {
      id: "blendTypes",
      icon: Tags,
      title: t("helpCenter.topicBlendTypes"),
      color: "text-amber-400",
      questions: [
        { q: t("troubleshooting.blendTypes_q1"), a: t("troubleshooting.blendTypes_a1") },
        { q: t("troubleshooting.blendTypes_q2"), a: t("troubleshooting.blendTypes_a2") },
        { q: t("troubleshooting.blendTypes_q3"), a: t("troubleshooting.blendTypes_a3") },
        { q: t("troubleshooting.blendTypes_q4"), a: t("troubleshooting.blendTypes_a4") },
        { q: t("troubleshooting.blendTypes_q5"), a: t("troubleshooting.blendTypes_a5") },
        { q: t("troubleshooting.blendTypes_q6"), a: t("troubleshooting.blendTypes_a6") },
      ]
    },
    {
      id: "specialization",
      icon: Target,
      title: t("helpCenter.topicSpecialization"),
      color: "text-green-400",
      questions: [
        { q: t("troubleshooting.specialization_q1"), a: t("troubleshooting.specialization_a1") },
        { q: t("troubleshooting.specialization_q2"), a: t("troubleshooting.specialization_a2") },
        { q: t("troubleshooting.specialization_q3"), a: t("troubleshooting.specialization_a3") },
        { q: t("troubleshooting.specialization_q4"), a: t("troubleshooting.specialization_a4") },
        { q: t("troubleshooting.specialization_q5"), a: t("troubleshooting.specialization_a5") },
        { q: t("troubleshooting.specialization_q6"), a: t("troubleshooting.specialization_a6") },
      ]
    },
    {
      id: "proFeatures",
      icon: Crown,
      title: t("helpCenter.topicProFeatures"),
      color: "text-amber-400",
      questions: [
        { q: t("troubleshooting.proFeatures_q1"), a: t("troubleshooting.proFeatures_a1") },
        { q: t("troubleshooting.proFeatures_q2"), a: t("troubleshooting.proFeatures_a2") },
        { q: t("troubleshooting.proFeatures_q3"), a: t("troubleshooting.proFeatures_a3") },
        { q: t("troubleshooting.proFeatures_q4"), a: t("troubleshooting.proFeatures_a4") },
        { q: t("troubleshooting.proFeatures_q5"), a: t("troubleshooting.proFeatures_a5") },
        { q: t("troubleshooting.proFeatures_q6"), a: t("troubleshooting.proFeatures_a6") },
        { q: t("troubleshooting.proFeatures_q7"), a: t("troubleshooting.proFeatures_a7") },
        { q: t("troubleshooting.proFeatures_q8"), a: t("troubleshooting.proFeatures_a8") },
      ]
    },
    {
      id: "appFunctions",
      icon: AlertCircle,
      title: t("helpCenter.topicAppFunctions"),
      color: "text-red-400",
      questions: [
        { q: t("troubleshooting.appFunctions_q1"), a: t("troubleshooting.appFunctions_a1") },
        { q: t("troubleshooting.appFunctions_q2"), a: t("troubleshooting.appFunctions_a2") },
        { q: t("troubleshooting.appFunctions_q3"), a: t("troubleshooting.appFunctions_a3") },
        { q: t("troubleshooting.appFunctions_q4"), a: t("troubleshooting.appFunctions_a4") },
        { q: t("troubleshooting.appFunctions_q5"), a: t("troubleshooting.appFunctions_a5") },
        { q: t("troubleshooting.appFunctions_q6"), a: t("troubleshooting.appFunctions_a6") },
        { q: t("troubleshooting.appFunctions_q7"), a: t("troubleshooting.appFunctions_a7") },
        { q: t("troubleshooting.appFunctions_q8"), a: t("troubleshooting.appFunctions_a8") },
        { q: t("troubleshooting.appFunctions_q9"), a: t("troubleshooting.appFunctions_a9") },
        { q: t("troubleshooting.appFunctions_q10"), a: t("troubleshooting.appFunctions_a10") },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A]">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 16px" }}>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">{t("troubleshooting.title")}</h1>
          <p className="text-[#E0D8C8]/80 mb-4">{t("troubleshooting.subtitle")}</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl('HowTo')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <BookOpen className="w-4 h-4 mr-2" />
                {t("troubleshooting.navHowTo")}
              </Button>
            </Link>
            <Link to={createPageUrl('FAQ')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <Info className="w-4 h-4 mr-2" />
                {t("troubleshooting.navFAQ")}
              </Button>
            </Link>
          </div>
        </div>

        {troubleshootingTopics.map((topic) => {
          const IconComponent = topic.icon;
          return (
            <Section
              key={topic.id}
              title={<span className="flex items-center gap-2"><IconComponent className={`w-6 h-6 ${topic.color}`} />{topic.title}</span>}
            >
              {topic.questions.map((item, idx) => (
                <Q key={idx} id={`${topic.id}-${idx}`} q={item.q}>
                  <p>{item.a}</p>
                </Q>
              ))}
            </Section>
          );
        })}

        <div className="mt-8 p-6 bg-white border border-gray-200 rounded-2xl text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t("troubleshooting.stillNeedHelp")}</h2>
          <p className="text-gray-700 mb-4">
            {t("troubleshooting.contactText")}{" "}
            <Link to={createPageUrl('Support')} className="text-[#8b3a3a] hover:text-[#a94747] underline">{t("help.contactSupport")}</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}