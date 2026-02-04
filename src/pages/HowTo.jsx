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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A]">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 16px" }}>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">How-To Guides</h1>
          <p className="text-[#E0D8C8]/80 mb-4">Quick answers with clear navigation paths</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl('FAQ')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <HelpCircle className="w-4 h-4 mr-2" />
                FAQ
              </Button>
            </Link>
            <Link to={createPageUrl('Troubleshooting')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <BookOpen className="w-4 h-4 mr-2" />
                Troubleshooting
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4 mt-8">Getting Started</h2>

          <Q id="add-pipe" q="How do I add a pipe?" path="Home → Pipes → Add Pipe">
            Add your pipes manually or use AI identification from photos. Include details like maker, shape, dimensions, and condition to unlock insights and recommendations.
          </Q>

          <Q id="add-tobacco" q="How do I add a cellar item?" path="Home → Tobacco → Add Tobacco">
            Track your tobacco blends with details like manufacturer, blend type, quantity, and storage dates. Use the cellar log to record aging progress.
          </Q>

          <Q id="add-note" q="How do I add notes to an item?" path="Pipes/Tobacco → Select item → Edit → Add notes">
            Click any pipe or tobacco to open its detail page. Tap "Edit" and add notes in the designated field. Notes help you remember personal preferences and observations.
          </Q>

          <Q id="view-insights" q="How do I view insights?" path="Home → Collection Insights">
            Insights appear on your Home page after adding items. View stats, pairing grids, aging dashboards, and reports. Click tabs to explore different insights.
          </Q>

          <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4 mt-8">Managing Your Collection</h2>

          <Q id="organize" q="How do I organize my collection?" path="Pipes/Tobacco → Filters and Sort">
            Use filters to narrow down by shape, blend type, or focus. Sort by date added, value, or rating. Save favorite filters for quick access.
          </Q>

          <Q id="export" q="How do I export my data?" path="Home → Insights → Reports tab" badge="Premium">
            Premium and Pro users can export collection data as CSV or PDF. Find export buttons in the Reports tab under Collection Insights.
          </Q>

          <Q id="cellar-log" q="How do I track my cellar?" path="Tobacco → Select blend → Cellar Log" badge="Premium">
            Record when tobacco is added or removed from your cellar. Track quantities, dates, and container types. View aging progress on the Aging Dashboard.
          </Q>

          <Q id="smoking-log" q="How do I log a smoking session?" path="Home → Insights → Log tab" badge="Premium">
            Track which pipe you smoked with which tobacco. Record date, number of bowls, and notes. This data powers pairing recommendations.
          </Q>

          <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4 mt-8">AI Tools</h2>

          <Q id="identify-pipe" q="How do I identify a pipe from a photo?" path="Home → Expert Tobacconist → Identify" badge="Pro">
            Upload photos of your pipe and the AI analyzes markings, shape, and characteristics to identify maker, model, and approximate value.
          </Q>

          <Q id="pairing-suggestions" q="How do I get pairing suggestions?" path="Home → Insights → Pairing Grid" badge="Pro">
            The Pairing Matrix generates compatibility scores for every pipe-tobacco combination. View recommendations on pipe detail pages or in the Pairing Grid.
          </Q>

          <Q id="optimize-collection" q="How do I optimize my collection?" path="Home → Expert Tobacconist → Optimize" badge="Pro">
            The Collection Optimizer analyzes your pipes and tobaccos to recommend specializations, identify gaps, and suggest your next purchase.
          </Q>

          <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4 mt-8">Subscriptions</h2>

          <Q id="subscribe" q="How do subscriptions work?" path="Profile → Subscription">
            PipeKeeper offers Free, Premium, and Pro tiers. Subscribe to unlock unlimited items, advanced tools, and AI features. View pricing and manage subscriptions in your Profile.
          </Q>

          <Q id="manage-subscription" q="How do I manage my subscription?" path="Profile → Manage Subscription">
            <div className="space-y-2">
              <p><b>iOS:</b> Manage through iOS Settings → [Your Name] → Subscriptions → PipeKeeper</p>
              <p><b>Web/Android:</b> Go to Profile → Manage Subscription to update payment, view invoices, or cancel</p>
            </div>
          </Q>

          <Q id="cancel" q="How do I cancel my subscription?" path="Profile → Manage Subscription">
            <div className="space-y-2">
              <p><b>iOS:</b> Open iOS Settings → [Your Name] → Subscriptions → PipeKeeper → Cancel Subscription</p>
              <p><b>Web/Android:</b> Go to Profile → Manage Subscription → Cancel Subscription</p>
              <p className="text-sm text-gray-600 mt-2">You'll keep access until the end of your billing period.</p>
            </div>
          </Q>

          <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4 mt-8">Troubleshooting</h2>

          <Q id="cant-login" q="I can't log in or my code expired" path="Login screen → Request new code">
            Try logging in again—the system sends a new verification code automatically. Check your spam folder, or visit the Verification Help page for detailed instructions.
          </Q>

          <Q id="missing-features" q="Why can't I see certain features?" path="Profile → Subscription">
            Some features require Premium or Pro access. Check your subscription status in Profile. Free users have access to core collection management for up to 5 pipes and 10 tobacco blends.
          </Q>

          <Q id="sync-issues" q="My data isn't syncing" path="Profile → Refresh / Log out and back in">
            Try refreshing your browser or logging out and back in. Your collection is automatically synced to the cloud when you make changes.
          </Q>
        </div>

        <div className="mt-12 p-6 bg-[#A35C5C]/10 border border-[#A35C5C]/40 rounded-xl">
          <h3 className="text-xl font-bold text-[#E0D8C8] mb-2">Still need help?</h3>
          <p className="text-[#E0D8C8]/80 mb-4">Visit our full FAQ or contact support for additional assistance.</p>
          <div className="flex gap-3 flex-wrap">
            <Link to={createPageUrl('FAQ')}>
              <Button variant="outline">View Full FAQ</Button>
            </Link>
            <Link to={createPageUrl('Support')}>
              <Button>Contact Support</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}