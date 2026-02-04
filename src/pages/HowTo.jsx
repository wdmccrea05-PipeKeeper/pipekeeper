import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, HelpCircle, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function HowTo() {
  const { t } = useTranslation();
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (id) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const Q = ({ id, q, children, path, badge }) => {
    const badgeClass = badge === 'Pro' 
      ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold' 
      : 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
    
    return (
      <Card className="bg-white border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleItem(id)}
          className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 flex-1">
            <span className="font-semibold text-gray-900 pr-4">{q}</span>
            {badge && <Badge variant="outline" className={`text-xs ${badgeClass}`}>{badge}</Badge>}
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${openItems[id] ? 'rotate-180' : ''}`}
          />
        </button>
      {openItems[id] && (
        <CardContent className="px-4 pb-4 pt-0 text-gray-700 leading-relaxed">
          <div className="mb-2">{children}</div>
          {path && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-900">Go to: {path}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
    );
  };

  const sections = t("helpContent.howTo.sections", { returnObjects: true });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A]">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 16px" }}>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">{t("helpContent.howTo.pageTitle")}</h1>
          <p className="text-[#E0D8C8]/80 mb-4">{t("helpContent.howTo.pageSubtitle")}</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl('FAQ')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <HelpCircle className="w-4 h-4 mr-2" />
                {t("helpContent.howTo.navFAQ")}
              </Button>
            </Link>
            <Link to={createPageUrl('Troubleshooting')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <BookOpen className="w-4 h-4 mr-2" />
                {t("helpContent.howTo.navTroubleshooting")}
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4 mt-8">{sections.gettingStarted?.title || "Getting Started"}</h2>

          {sections.gettingStarted?.items?.map((item) => (
            <Q key={item.id} id={item.id} q={item.q} path={item.path} badge={item.badge}>
              {item.a}
            </Q>
          ))}

          <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4 mt-8">{sections.managingCollection?.title || "Managing Your Collection"}</h2>

          {sections.managingCollection?.items?.map((item) => (
            <Q key={item.id} id={item.id} q={item.q} path={item.path} badge={item.badge}>
              {item.a}
            </Q>
          ))}

          <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4 mt-8">{sections.aiTools?.title || "AI Tools"}</h2>

          {sections.aiTools?.items?.map((item) => (
            <Q key={item.id} id={item.id} q={item.q} path={item.path} badge={item.badge}>
              {item.a}
            </Q>
          ))}

          <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4 mt-8">{sections.subscriptions?.title || "Subscriptions"}</h2>

          {sections.subscriptions?.items?.map((item) => (
            <Q key={item.id} id={item.id} q={item.q} path={item.path} badge={item.badge}>
              {item.iosPart && <div><b>iOS:</b> {item.iosPart}</div>}
              {item.webPart && <div className={item.iosPart ? "mt-2" : ""}><b>Web/Android:</b> {item.webPart}</div>}
              {!item.iosPart && !item.webPart && item.a}
              {item.note && <p className="text-sm text-gray-600 mt-2">{item.note}</p>}
            </Q>
          ))}

          <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4 mt-8">{sections.troubleshooting?.title || "Troubleshooting"}</h2>

          {sections.troubleshooting?.items?.map((item) => (
            <Q key={item.id} id={item.id} q={item.q} path={item.path}>
              {item.a}
            </Q>
          ))}
        </div>

        <div className="mt-12 p-6 bg-[#A35C5C]/10 border border-[#A35C5C]/40 rounded-xl">
          <h3 className="text-xl font-bold text-[#E0D8C8] mb-2">{t("helpContent.howTo.footerTitle")}</h3>
          <p className="text-[#E0D8C8]/80 mb-4">{t("helpContent.howTo.footerDesc")}</p>
          <div className="flex gap-3 flex-wrap">
            <Link to={createPageUrl('FAQ')}>
              <Button variant="outline">{t("helpContent.howTo.footerFAQ")}</Button>
            </Link>
            <Link to={createPageUrl('Support')}>
              <Button>{t("helpContent.howTo.footerSupport")}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}