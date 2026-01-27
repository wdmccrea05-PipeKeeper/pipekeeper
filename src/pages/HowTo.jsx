import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, HelpCircle, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HowTo() {
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

  const Guide = ({ id, title, children }) => (
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
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">How-To Guides</h1>
          <p className="text-[#E0D8C8]/80 mb-4">Step-by-step instructions for using PipeKeeper</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl('FAQ')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <HelpCircle className="w-4 h-4 mr-2" />
                FAQ
              </Button>
            </Link>
            <Link to={createPageUrl('Troubleshooting')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <Wrench className="w-4 h-4 mr-2" />
                Troubleshooting
              </Button>
            </Link>
          </div>
        </div>

        <Section title="Tobacco Management">
          <Guide id="inventory" title="How to add tobacco inventory and lots">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open a tobacco blend detail page</li>
              <li>Go to the 'Inventory' tab</li>
              <li>Enter tin/pouch/bulk quantities</li>
              <li>Mark items as open or cellared</li>
              <li>Save your changes</li>
            </ol>
          </Guide>

          <Guide id="aging" title="How aging works in PipeKeeper">
            <p>Cellaring tobacco preserves and sometimes improves flavor over time.</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Use the 'Cellared Tobacco' tab to log additions and removals</li>
              <li>Track dates, quantities, and aging potential ratings</li>
              <li>PipeKeeper shows net cellared amounts on your Home dashboard</li>
            </ul>
          </Guide>

          <Guide id="manual-value" title="How to enter manual market value (Premium)">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open a tobacco blend detail page</li>
              <li>Find the 'Tobacco Valuation' section</li>
              <li>Enter current market price in 'Manual Market Value'</li>
              <li>Optionally enter cost basis</li>
              <li>Save to track appreciation over time</li>
            </ol>
            <p className="text-sm text-gray-600 mt-3">Premium feature</p>
          </Guide>

          <Guide id="ai-value" title="How to run AI-assisted valuation (Pro)">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open a tobacco blend detail page</li>
              <li>Find the 'Tobacco Valuation' section</li>
              <li>Click 'Run AI Valuation'</li>
              <li>AI scans public listings and provides estimated value, range, confidence, and evidence sources</li>
              <li>Review projections for 12-month and 36-month estimates</li>
            </ol>
            <p className="text-sm text-gray-600 mt-3">Pro feature</p>
          </Guide>

          <Guide id="predictive" title="How predictive valuation works">
            <p>Predictive valuation (Pro) uses historical pricing trends and aging data to forecast future value.</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Projections assume typical cellaring conditions and market stability</li>
              <li>Results are shown for 12-month and 36-month timeframes</li>
              <li>Not financial advice - for informational purposes only</li>
            </ul>
          </Guide>
        </Section>
      </div>
    </div>
  );
}