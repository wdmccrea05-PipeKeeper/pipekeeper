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
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
      borderColor: "border-amber-400/30",
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
      link: createPageUrl("TroubleshootingFull"),
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
    <div className="ck-paper-workspace ck-secondary-workspace max-w-5xl mx-auto">
      <div className="space-y-7">
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#e1ded4] mb-6">
            <HelpCircle className="w-6 h-6" style={{ color: "rgba(180,140,75,0.9)" }} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t("helpCenter.helpCenter")}</h1>
          <p className="text-base text-[var(--ck-paper-muted)] max-w-2xl">
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
                  className="ck-help-card h-full border transition-shadow hover:shadow-md"
                >
                  <CardHeader className="text-center pb-4">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${category.bgColor} mx-auto mb-4`}>
                      <Icon className={`w-8 h-8 ${category.color}`} />
                    </div>
                    <CardTitle className="text-2xl text-[var(--ck-espresso)] mb-2">
                      {category.title}
                     </CardTitle>
                     <CardDescription className="text-[var(--ck-paper-muted)]">
                      {category.description}
                     </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ul className="space-y-2">
                      {category.topicsKeys.map((topicKey, topicIdx) => (
                        <li key={topicIdx} className="flex items-start gap-2 text-sm text-[var(--ck-paper-muted)]">
                          <span className="text-[var(--ck-paper-muted)] mt-1">•</span>
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
        <Card style={{
          background: "#f5f4f0",
          border: "1px solid rgba(140,105,65,0.35)"
        }}>
           <CardHeader>
             <CardTitle className="text-[var(--ck-espresso)]">{t("helpCenter.quickLinks")}</CardTitle>
           </CardHeader>
           <CardContent className="grid sm:grid-cols-2 gap-4">
             <Link to={createPageUrl("Support")} className="text-[var(--ck-paper-muted)] hover:text-[var(--ck-espresso)] hover:underline">
               → {t("helpCenter.contactSupport")}
             </Link>
             <Link to={createPageUrl("TermsOfService")} className="text-[var(--ck-paper-muted)] hover:text-[var(--ck-espresso)] hover:underline">
               → {t("helpCenter.termsOfService")}
             </Link>
             <Link to={createPageUrl("PrivacyPolicy")} className="text-[var(--ck-paper-muted)] hover:text-[var(--ck-espresso)] hover:underline">
               → {t("helpCenter.privacyPolicy")}
             </Link>
             <Link to={createPageUrl("Subscription")} className="text-[var(--ck-paper-muted)] hover:text-[var(--ck-espresso)] hover:underline">
               → {t("helpCenter.subscriptionBilling")}
             </Link>
           </CardContent>
         </Card>

        {/* Contact Section */}
        <div className="mt-12 text-center">
          <p className="text-[var(--ck-paper-muted)] mb-4">
            {t("helpCenter.cantFind")}
          </p>
          <Link to={createPageUrl("Support")}>
            <button className="px-6 py-3 bg-[#303436] text-white rounded-lg hover:bg-[#44494b] transition-colors font-semibold">
              {t("helpCenter.contactSupport")}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}