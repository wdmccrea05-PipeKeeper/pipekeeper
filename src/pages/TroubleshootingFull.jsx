import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RefreshCw, AlertCircle, Sparkles, Tags, Target, Info, BookOpen, Crown } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { helpContent } from "@/components/i18n/helpContent";

export default function TroubleshootingFull() {
  const { t, lang } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const content = helpContent[lang] || helpContent.en;
  const sections = content?.troubleshooting?.sections || {};

  const troubleshootingTopics = [
    {
      id: "pageRefresh",
      icon: RefreshCw,
      title: t("helpCenter.topicPageRefresh"),
      color: "text-blue-400",
      questions: (sections.pageRefresh?.items || []).map(item => ({
        q: item.q,
        a: item.a
      }))
    },
    {
      id: "aiFeatures",
      icon: Sparkles,
      title: t("helpCenter.topicAIFeatures"),
      color: "text-purple-400",
      questions: (sections.aiFeatures?.items || []).map(item => ({
        q: item.q,
        a: item.a
      }))
    },
    {
      id: "blendTypes",
      icon: Tags,
      title: t("helpCenter.topicBlendTypes"),
      color: "text-amber-400",
      questions: (sections.blendTypes?.items || []).map(item => ({
        q: item.q,
        a: item.a
      }))
    },
    {
      id: "specialization",
      icon: Target,
      title: t("helpCenter.topicSpecialization"),
      color: "text-green-400",
      questions: (sections.specialization?.items || []).map(item => ({
        q: item.q,
        a: item.a
      }))
    },
    {
      id: "proFeatures",
      icon: Crown,
      title: t("helpCenter.topicProFeatures"),
      color: "text-amber-400",
      questions: (sections.proFeatures?.items || []).map(item => ({
        q: item.q,
        a: item.a
      }))
    },
    {
      id: "appFunctions",
      icon: AlertCircle,
      title: t("helpCenter.topicAppFunctions"),
      color: "text-red-400",
      questions: (sections.appFunctions?.items || []).map(item => ({
        q: item.q,
        a: item.a
      }))
    }
  ];

  const filteredTopics = troubleshootingTopics.map(topic => ({
    ...topic,
    questions: topic.questions.filter(
      item =>
        item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.a.toLowerCase().includes(searchTerm.toLowerCase()) ||
        topic.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(topic => topic.questions.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">{content?.troubleshooting?.pageTitle || t("troubleshooting.title")}</h1>
          <p className="text-[#E0D8C8]/80 mb-4">{content?.troubleshooting?.pageSubtitle || t("helpCenter.troubleshootingDesc")}</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <a href="/HowTo">
              <button className="px-4 py-2 border border-gray-300 text-[#1a2c42] bg-white rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {content?.troubleshooting?.navHowTo || t("help.howTo")}
              </button>
            </a>
            <a href="/FAQ">
              <button className="px-4 py-2 border border-gray-300 text-[#1a2c42] bg-white rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                <Info className="w-4 h-4" />
                {content?.troubleshooting?.navFAQ || t("help.faq")}
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