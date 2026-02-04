import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HelpCircle, BookOpen, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Help() {
  const { t } = useTranslation();
  const helpCategories = [
    {
      title: "FAQ",
      description: "Definitions, general information, and disclaimers",
      icon: HelpCircle,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
      borderColor: "border-blue-400/30",
      link: createPageUrl("FAQ"),
      topics: [
        "What is PipeKeeper?",
        "Privacy and data policies",
        "Subscription and billing information",
        "Field definitions and terminology",
        "Community guidelines",
        "AI feature explanations"
      ]
    },
    {
      title: "How To",
      description: "Step-by-step instructions for using app features",
      icon: BookOpen,
      color: "text-green-400",
      bgColor: "bg-green-400/10",
      borderColor: "border-green-400/30",
      link: createPageUrl("HowTo"),
      topics: [
        "Adding and editing pipes",
        "Managing tobacco inventory",
        "Using AI features",
        "Tracking cellaring and smoking logs",
        "Community and messaging",
        "Export and import data"
      ]
    },
    {
      title: "Troubleshooting",
      description: "Solutions when something isn't working correctly",
      icon: Wrench,
      color: "text-orange-400",
      bgColor: "bg-orange-400/10",
      borderColor: "border-orange-400/30",
      link: createPageUrl("Troubleshooting"),
      topics: [
        "Page refresh and caching issues",
        "AI features not updating",
        "Inventory discrepancies",
        "Search and filter problems",
        "Photo upload issues",
        "Terms of Service on launch"
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
                    <CardTitle className="text-2xl text-gray-900 mb-2">
                     {category.title}
                    </CardTitle>
                    <CardDescription className="text-gray-700">
                     {category.description}
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ul className="space-y-2">
                     {category.topics.map((topic, topicIdx) => (
                       <li key={topicIdx} className="flex items-start gap-2 text-sm text-gray-700">
                         <span className="text-blue-500 mt-1">•</span>
                          <span>{topic}</span>
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
        <Card className="border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-gray-900">{t("helpCenter.quickLinks")}</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <Link to={createPageUrl("Support")} className="text-blue-500 hover:text-blue-700 hover:underline">
              → {t("helpCenter.contactSupport")}
            </Link>
            <Link to={createPageUrl("TermsOfService")} className="text-blue-500 hover:text-blue-700 hover:underline">
              → {t("helpCenter.termsOfService")}
            </Link>
            <Link to={createPageUrl("PrivacyPolicy")} className="text-blue-500 hover:text-blue-700 hover:underline">
              → {t("helpCenter.privacyPolicy")}
            </Link>
            <Link to={createPageUrl("Subscription")} className="text-blue-500 hover:text-blue-700 hover:underline">
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
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
              {t("helpCenter.contactSupport")}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}