import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HelpCircle, BookOpen, Wrench } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function Help() {
  const { t } = useTranslation();
  const helpCategories = [
    {
      title: t("helpCenter.faq"),
      description: t("helpCenter.faqDesc"),
      icon: HelpCircle,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
      borderColor: "border-blue-400/30",
      link: createPageUrl("FAQ"),
      topicsKeys: [
        "helpCenter.topicWhatIsPipeKeeper",
        "helpCenter.topicPrivacy",
        "helpCenter.topicSubscription",
        "helpCenter.topicDefinitions",
        "helpCenter.topicCommunity",
        "helpCenter.topicAI"
      ]
    },
    {
      title: t("helpCenter.howTo"),
      description: t("helpCenter.howToDesc"),
      icon: BookOpen,
      color: "text-green-400",
      bgColor: "bg-green-400/10",
      borderColor: "border-green-400/30",
      link: createPageUrl("HowTo"),
      topicsKeys: [
        "helpCenter.topicAddingPipes",
        "helpCenter.topicTobaccoInventory",
        "helpCenter.topicAIFeatures",
        "helpCenter.topicCellaring",
        "helpCenter.topicCommunity",
        "helpCenter.topicExportImport"
      ]
    },
    {
      title: t("helpCenter.troubleshooting"),
      description: t("helpCenter.troubleshootingDesc"),
      icon: Wrench,
      color: "text-orange-400",
      bgColor: "bg-orange-400/10",
      borderColor: "border-orange-400/30",
      link: createPageUrl("Troubleshooting"),
      topicsKeys: [
        "helpCenter.topicCaching",
        "helpCenter.topicAIUpdating",
        "helpCenter.topicInventory",
        "helpCenter.topicSearch",
        "helpCenter.topicPhotos",
        "helpCenter.topicTerms"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A]">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#8b3a3a]/20 mb-6">
            <HelpCircle className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-5xl font-bold text-[#E0D8C8] mb-4">{t("helpCenter.helpCenter")}</h1>
          <p className="text-xl text-[#E0D8C8]/80 max-w-2xl mx-auto">
            {t("helpCenter.findAnswers")}
          </p>
        </div>

        {/* Help Categories */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {helpCategories.map((category, idx) => {
            const Icon = category.icon;
            return (
              <Link key={idx} to={category.link}>
                <Card 
                  className={`h-full border-2 ${category.borderColor} ${category.bgColor} hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105`}
                >
                  <CardHeader className="text-center pb-4">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${category.bgColor} mx-auto mb-4`}>
                      <Icon className={`w-8 h-8 ${category.color}`} />
                    </div>
                    <CardTitle className="text-2xl text-[#E0D8C8] mb-2">
                      {category.title}
                     </CardTitle>
                     <CardDescription className="text-[#E0D8C8]/80">
                      {category.description}
                     </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ul className="space-y-2">
                      {category.topicsKeys.map((topicKey, topicIdx) => (
                        <li key={topicIdx} className="flex items-start gap-2 text-sm text-[#E0D8C8]/80">
                          <span className="text-[#E0D8C8]/60 mt-1">•</span>
                           <span>{t(topicKey)}</span>
                         </li>
                       ))}
                     </ul>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Links */}
        <Card className="border-[#E0D8C8]/20 bg-[#243548]">
           <CardHeader>
             <CardTitle className="text-[#E0D8C8]">{t("helpCenter.quickLinks")}</CardTitle>
           </CardHeader>
           <CardContent className="grid sm:grid-cols-2 gap-4">
             <Link to={createPageUrl("Support")} className="text-[#E0D8C8]/80 hover:text-[#E0D8C8] hover:underline">
               → {t("helpCenter.contactSupport")}
             </Link>
             <Link to={createPageUrl("TermsOfService")} className="text-[#E0D8C8]/80 hover:text-[#E0D8C8] hover:underline">
               → {t("helpCenter.termsOfService")}
             </Link>
             <Link to={createPageUrl("PrivacyPolicy")} className="text-[#E0D8C8]/80 hover:text-[#E0D8C8] hover:underline">
               → {t("helpCenter.privacyPolicy")}
             </Link>
             <Link to={createPageUrl("Subscription")} className="text-[#E0D8C8]/80 hover:text-[#E0D8C8] hover:underline">
               → {t("helpCenter.subscriptionBilling")}
             </Link>
           </CardContent>
         </Card>

        {/* Contact Section */}
        <div className="mt-12 text-center">
          <p className="text-[#E0D8C8]/80 mb-4">
            {t("helpCenter.cantFind")}
          </p>
          <Link to={createPageUrl("Support")}>
            <button className="px-6 py-3 bg-[#A35C5C] text-white rounded-lg hover:bg-[#8F4E4E] transition-colors font-semibold">
              {t("helpCenter.contactSupport")}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}