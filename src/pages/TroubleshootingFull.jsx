import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RefreshCw, AlertCircle, Sparkles, Tags, Target, Info, BookOpen, Crown } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function TroubleshootingFull() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredTopics = troubleshootingTopics.map(topic => ({
    ...topic,
    questions: topic.questions.filter(
      item =>
        (item.q || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.a || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        topic.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(topic => topic.questions.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">{t("troubleshooting.title")}</h1>
          <p className="text-[#E0D8C8]/80 mb-4">{t("troubleshooting.subtitle")}</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <a href="/HowTo">
              <button className="px-4 py-2 border border-gray-300 text-[#1a2c42] bg-white rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {t("troubleshooting.navHowTo")}
              </button>
            </a>
            <a href="/FAQ">
              <button className="px-4 py-2 border border-gray-300 text-[#1a2c42] bg-white rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                <Info className="w-4 h-4" />
                {t("troubleshooting.navFAQ")}
              </button>
            </a>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder={t("search.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-[#1a2c42] placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {filteredTopics.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-8 text-center">
              <Info className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-[#1a2c42]/80">{t("search.noResults")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredTopics.map((topic) => {
              const IconComponent = topic.icon;
              return (
                <Card key={topic.id} className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <IconComponent className={`w-6 h-6 ${topic.color}`} />
                      {topic.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {topic.questions.map((item, idx) => (
                        <AccordionItem key={idx} value={`item-${idx}`} className="border-gray-200">
                          <AccordionTrigger className="text-left text-gray-900 hover:text-blue-600">
                            {item.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-700 leading-relaxed">
                            {item.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 p-6 bg-white border border-gray-200 rounded-2xl text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t("troubleshooting.stillNeedHelp")}</h2>
          <p className="text-gray-700 mb-4">
            {t("messages.checkYourEmail")} <a href="/HowTo" className="text-blue-600 hover:underline">{t("help.howTo")}</a>, <a href="/FAQ" className="text-blue-600 hover:underline">{t("help.faq")}</a>, {t("common.or")} <a href="/Support" className="text-blue-600 hover:underline">{t("help.contactSupport")}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}