import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, HelpCircle, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function Troubleshooting() {
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

  const Issue = ({ id, title, children }) => (
    <Card className="bg-white border-gray-200 overflow-hidden">
      <button
        onClick={() => toggleItem(id)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 pr-4">{title}</span>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A]">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 16px" }}>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">Troubleshooting</h1>
          <p className="text-[#E0D8C8]/80 mb-4">Common issues and solutions</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl('FAQ')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <HelpCircle className="w-4 h-4 mr-2" />
                FAQ
              </Button>
            </Link>
            <Link to={createPageUrl('HowTo')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <BookOpen className="w-4 h-4 mr-2" />
                How-To Guides
              </Button>
            </Link>
          </div>
        </div>

        <Section title="Tobacco Valuation">
          <Issue id="missing-value" title="Why is my tobacco value missing?">
            <p>Value requires either manual entry (Premium) or AI estimation (Pro).</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Free users see inventory only</li>
              <li>Ensure you have the correct subscription tier</li>
              <li>Run valuation after upgrading</li>
            </ul>
          </Issue>

          <Issue id="low-confidence" title="Why does my estimate show low confidence?">
            <p>Low confidence means limited marketplace data was found for this blend.</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>It may be rare, discontinued, or regionally exclusive</li>
              <li>Estimates with low confidence should be treated as rough approximations</li>
              <li>Consider using manual valuation for rare blends</li>
            </ul>
          </Issue>

          <Issue id="locked-ai" title="Why is AI valuation locked?">
            <p>AI-assisted valuation requires Pro.</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>If you're a Premium subscriber who joined before Feb 1, 2026, you have legacy access</li>
              <li>Otherwise, upgrade to Pro to unlock AI features</li>
            </ul>
          </Issue>

          <Issue id="no-auto-update" title="Why doesn't value update automatically?">
            <p>AI valuations are generated on-demand to preserve credits and performance.</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Click 'Run AI Valuation' to refresh estimates</li>
              <li>Scheduled auto-refresh may be added in future Pro updates</li>
            </ul>
          </Issue>
        </Section>
      </div>
    </div>
  );
}