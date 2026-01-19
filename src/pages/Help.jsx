import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HelpCircle, BookOpen, Wrench } from "lucide-react";

export default function Help() {
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
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#8b3a3a]/20 mb-6">
            <HelpCircle className="w-10 h-10 text-[#e8d5b7]" />
          </div>
          <h1 className="text-5xl font-bold text-[#e8d5b7] mb-4">Help Center</h1>
          <p className="text-xl text-[#e8d5b7]/70 max-w-2xl mx-auto">
            Find answers, learn features, and troubleshoot issues
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
                    <CardTitle className="text-2xl text-[#e8d5b7] mb-2">
                      {category.title}
                    </CardTitle>
                    <CardDescription className="text-[#e8d5b7]/70">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.topics.map((topic, topicIdx) => (
                        <li key={topicIdx} className="flex items-start gap-2 text-sm text-[#e8d5b7]/80">
                          <span className="text-[#d1a761] mt-1">•</span>
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
        <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <Link to={createPageUrl("Support")} className="text-[#d1a761] hover:text-[#e8d5b7] hover:underline">
              → Contact Support
            </Link>
            <Link to={createPageUrl("TermsOfService")} className="text-[#d1a761] hover:text-[#e8d5b7] hover:underline">
              → Terms of Service
            </Link>
            <Link to={createPageUrl("PrivacyPolicy")} className="text-[#d1a761] hover:text-[#e8d5b7] hover:underline">
              → Privacy Policy
            </Link>
            <Link to={createPageUrl("Subscription")} className="text-[#d1a761] hover:text-[#e8d5b7] hover:underline">
              → Subscription & Billing
            </Link>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <div className="mt-12 text-center">
          <p className="text-[#e8d5b7]/70 mb-4">
            Can't find what you're looking for?
          </p>
          <Link to={createPageUrl("Support")}>
            <button className="px-6 py-3 bg-[#8b3a3a] text-[#e8d5b7] rounded-lg hover:bg-[#a94747] transition-colors font-semibold">
              Contact Support
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}