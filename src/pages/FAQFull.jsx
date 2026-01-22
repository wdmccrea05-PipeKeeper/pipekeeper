import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, Wrench, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function FAQFull() {
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

  const Q = ({ id, q, children }) => (
    <Card className="bg-white border-gray-200 overflow-hidden">
      <button
        onClick={() => toggleItem(id)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 pr-4">{q}</span>
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
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">PipeKeeper FAQ</h1>
          <p className="text-[#E0D8C8]/80 mb-4">Definitions, general information, and disclaimers</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl('HowTo')}>
              <Button variant="outline" className="border-gray-300 text-[#1a2c42] bg-white hover:bg-gray-50">
                <BookOpen className="w-4 h-4 mr-2" />
                How-To Guides
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

      <Section title="General">
        <Q id="what-is" q="What is PipeKeeper?">
          PipeKeeper is a collection-management and informational app designed for pipe-smoking enthusiasts. It helps you track pipes, tobacco blends, cellared tins, and related notes, and provides optional AI-assisted insights and valuation estimates.
          <div className="mt-2 font-semibold">
            PipeKeeper does not sell tobacco products and does not facilitate tobacco purchases.
          </div>
        </Q>

        <Q id="tobacco-sales" q="Is PipeKeeper selling or promoting tobacco?">
          No. PipeKeeper is a hobby and collection-tracking app only. It does not sell, advertise, or facilitate the purchase of tobacco products.
        </Q>

        <Q id="data-privacy" q="Is my data private?">
          Yes. Your collection data belongs to you. PipeKeeper uses your data only to operate the app and provide features. We do not sell personal data.
        </Q>

        <Q id="first-launch" q="Why do I see Terms of Service when I first open the app?">
          On your first use, PipeKeeper requires you to accept the Terms of Service and Privacy Policy before accessing the app. This is a one-time requirement. Once accepted, you'll proceed directly to your Home page on future visits. You can review these documents anytime from the Help menu or footer links.
        </Q>
      </Section>

      <Section title="Getting Started">
        <Q id="tutorial" q="Is there a tutorial or walkthrough?">
          Yes! When you first create your account, PipeKeeper offers a guided onboarding flow that walks you through setting up your profile, adding your first pipe and tobacco, and accessing AI features. You can restart the tutorial anytime from the Home page.
          <div className="mt-4">
            <a href={createPageUrl('Home?restart_tutorial=true')} className="inline-block">
              <button className="px-4 py-2 bg-[#8b3a3a] text-white rounded-lg hover:bg-[#a94747] transition-colors">
                Restart Tutorial
              </button>
            </a>
          </div>
        </Q>

        <Q id="what-cellaring" q="What is cellaring?">
          Cellaring refers to storing sealed tins or bulk tobacco for aging. PipeKeeper includes a detailed cellaring log system that tracks when tobacco is added to or removed from your cellar, quantities in ounces, container types, and notes. This feature is available to Premium subscribers.
        </Q>

        <Q id="smoking-log" q="What is the smoking log?">
          The smoking log tracks which pipes you've smoked with which tobaccos. It helps you remember what works well together and contributes to AI pairing recommendations. Premium subscribers benefit from automatic inventory reduction based on logged sessions.
        </Q>
      </Section>

      <Section title="Field Definitions">
        <Q id="pipe-shape" q="What is pipe shape?">
          The shape classification describes the overall form of the pipe (Billiard, Dublin, Bent, etc.). PipeKeeper includes 30+ common shapes. Shape affects smoking characteristics like clenching comfort and smoke coolness.
        </Q>

        <Q id="chamber-volume" q="What is chamber volume?">
          Chamber volume (Small/Medium/Large/Extra Large) indicates bowl capacity and smoke duration. Small chambers are good for 15-30 minute smokes, while Extra Large can provide 90+ minutes.
        </Q>

        <Q id="stem-material" q="What are the stem material options?">
          Common stem materials include Vulcanite (traditional, soft bite), Acrylic/Lucite (durable, harder), Cumberland (marbled appearance), and specialty materials like Amber or Horn.
        </Q>

        <Q id="bowl-material" q="What are bowl materials?">
          Most pipes are Briar (heat-resistant wood), but other materials include Meerschaum (mineral, colors with use), Corn Cob (affordable, disposable), Morta (bog oak), and various other woods.
        </Q>

        <Q id="finish-types" q="What are finish types?">
          Finish refers to the bowl surface treatment: Smooth (polished, shows grain), Sandblasted (textured, hides fills), Rusticated (carved texture), or Natural (unfinished). Finish is largely aesthetic but can affect grip.
        </Q>

        <Q id="blend-type" q="What are tobacco blend types?">
          Blend types categorize tobacco by primary leaf composition: Virginia (sweet, grassy), English (with Latakia, smoky), Aromatic (added flavoring), Burley (nutty), VaPer (Virginia/Perique), etc. Each has distinct flavor profiles and smoking characteristics.
        </Q>

        <Q id="tobacco-cut" q="What are tobacco cut types?">
          Cut describes how tobacco is prepared: Ribbon (thin strips, easy to pack), Flake (pressed sheets, needs rubbing), Plug (solid block), Coin (sliced plug), Shag (very fine), etc. Cut affects packing method and burn rate.
        </Q>

        <Q id="tobacco-strength" q="What is tobacco strength?">
          Strength refers to nicotine content ranging from Mild to Full. Beginners typically start with Mild-Medium blends. Full-strength blends can cause nicotine sickness if you're not accustomed to them.
        </Q>
      </Section>

      <Section title="Features & Tools">
        <Q id="interchangeable-bowls" q="What are interchangeable bowls?">
          Some pipe systems (Falcon, Gabotherm, Yello-Bole, Viking, etc.) allow you to swap different bowls on the same stem/shank assembly. PipeKeeper treats each bowl as a distinct "pipe variant" with its own:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Focus tags (dedicate one bowl to Virginias, another to Aromatics, etc.)</li>
            <li>Chamber dimensions and characteristics</li>
            <li>Tobacco pairing recommendations</li>
            <li>Break-in schedules and smoking logs</li>
          </ul>
          This allows optimal specialization—use the same stem with multiple bowls for different tobacco types without ghosting.
        </Q>

        <Q id="pipe-focus" q="What are pipe focus tags?">
          Focus tags let you specialize pipes for specific tobacco types. Common tags include:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li><b>Aromatic:</b> Dedicates pipe to aromatic blends only (Heavy/Medium/Light intensity supported)</li>
            <li><b>Non-Aromatic:</b> Excludes aromatic blends</li>
            <li><b>Virginia, VaPer, English, Balkan, Latakia:</b> Automatically treated as non-aromatic families</li>
            <li><b>Utility/Versatile:</b> Allows mixed use without restrictions</li>
          </ul>
          The pairing system respects these tags—aromatic-only pipes won't recommend non-aromatic blends and vice versa. Focus tags work at the pipe level or per-bowl for interchangeable systems.
        </Q>
        <Q id="pairing-matrix" q="What is the Pairing Matrix?">
          The Pairing Matrix generates compatibility scores (0-10) between each pipe and tobacco blend in your collection. It considers pipe characteristics (shape, chamber volume, bowl material), blend profiles (type, strength, aromatic intensity), pipe focus tags (Virginia, English, Aromatic, etc.), and your personal preferences. The system generates recommendations once and stores them for instant access across the app. For pipes with interchangeable bowls, each bowl variant is treated separately with its own recommendations.
        </Q>

        <Q id="pipe-identification" q="How does pipe identification work?">
          Upload photos of your pipe and the AI will analyze markings, shape, and other visual characteristics to identify the maker, model, and approximate value. You can also manually search a database of known pipe makers.
        </Q>

        <Q id="value-lookup" q="Can PipeKeeper estimate pipe values?">
          Yes. The AI can provide estimated market values based on maker, condition, and current market trends. These are estimates only and should not be relied upon for insurance or sales purposes.
        </Q>

        <Q id="export-tools" q="Can I export my collection data?">
          Yes. Export tools allow you to download your pipes and tobacco inventory as CSV files for backup or use in other applications. Look for export buttons on the Pipes and Tobacco pages.
        </Q>
      </Section>

      <Section title="Plans & Subscriptions">
        <Q id="free-vs-premium" q="What's the difference between Free, Premium, and Pro?">
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-[#1a2c42] mb-2">Free</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Add up to <b>5 pipes</b></li>
                <li>Add up to <b>10 tobacco blends</b></li>
                <li>View, edit, and organize your collection</li>
                <li>Basic notes and ratings</li>
                <li>Search pipes and tobaccos</li>
                <li>Multilingual support (10 languages)</li>
                <li>Cloud sync</li>
                <li>Access to community features</li>
              </ul>
              <p className="text-sm text-stone-600 mt-2">
                Already have more than the Free limits? You&apos;ll keep everything you&apos;ve added — Free limits only apply when adding new items.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[#1a2c42] mb-2">Premium</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li><b>Unlimited</b> pipes and tobacco blends</li>
                <li>Unlimited notes and photos</li>
                <li>Cellar tracking and aging logs</li>
                <li>Smoking logs and history</li>
                <li>Pipe maintenance and condition tracking</li>
                <li>Advanced filters and sorting</li>
                <li>Manual pipe ↔ tobacco pairings</li>
                <li>Tobacco library sync</li>
                <li>Multilingual support (10 languages)</li>
                <li>Cloud sync across devices</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#1a2c42] mb-2">Pro</h4>
              <p className="text-sm text-stone-600 mb-2">
                Pro is active starting <b>February 1, 2026</b>.
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Everything in Premium</li>
                <li><b>AI Updates</b></li>
                <li><b>AI Identification tools</b> (identify pipes and tobaccos from photos)</li>
                <li>Advanced analytics & insights</li>
                <li>Smart pairing intelligence</li>
                <li>Bulk editing tools</li>
                <li>Export & reports (CSV / PDF)</li>
                <li>Collection optimization tools</li>
                <li>Early access to new advanced features</li>
              </ul>
              <p className="text-sm text-stone-600 mt-2">
                If you subscribed to Premium before <b>February 1, 2026</b>, you keep AI Updates and AI Identification tools.
              </p>
            </div>
          </div>
        </Q>

        <Q id="free-getting-started" q="Free: Getting Started">
          The Free tier provides essential collection management features:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Add up to <b>5 pipes</b></li>
            <li>Add up to <b>10 tobacco blends</b></li>
            <li>View, edit, and organize your collection</li>
            <li>Basic notes and ratings</li>
            <li>Search pipes and tobaccos</li>
            <li>Multilingual support (10 languages)</li>
            <li>Cloud sync</li>
          </ul>
          <p className="text-sm text-stone-600 mt-2">
            Already have more than the Free limits? You&apos;ll keep everything you&apos;ve added — Free limits only apply when adding new items.
          </p>
        </Q>

        <Q id="free-community" q="Free: Community (Browse & Share)">
          Community features are available to all users:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Browse public profiles and collections</li>
            <li>Follow other collectors</li>
            <li>Share basic collection cards</li>
            <li>Comment on public pipes and tobacco</li>
            <li>Search and discover new collectors</li>
          </ul>
          <p className="text-sm text-stone-600 mt-2">
            <b>Note:</b> Direct messaging is available with Premium.
          </p>
        </Q>

        <Q id="premium-smoking-log" q="Premium: Smoking Log">
          Track your smoking sessions with detailed logging capabilities:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Log each session with pipe, blend, date, and notes</li>
            <li>Track number of bowls smoked and estimated tobacco usage</li>
            <li>Monitor pipe rest periods (24-hour recommended rest)</li>
            <li>Mark sessions as part of break-in schedules</li>
            <li>Automatically reduce tobacco inventory after each session</li>
            <li>Build a detailed smoking history to power AI recommendations</li>
            <li>View session statistics and patterns over time</li>
          </ul>
          The smoking log helps you maintain your pipes properly, track your preferences, and provides valuable data for AI-powered pairing and optimization features.
        </Q>

        <Q id="premium-cellaring-log" q="Premium: Cellaring Log System">
          Track detailed cellaring transactions with the dedicated cellaring log. Record when tobacco is added to or removed from your cellar with precise amounts in ounces, container types (tin, jar, bulk, pouch), dates, and notes. View net cellared amounts for each blend and drill down into cellar inventory from the home page.
        </Q>

        <Q id="premium-manual-pairing" q="Premium: Manual Pipe ↔ Tobacco Pairing">
          Create and manage your own custom pipe-tobacco pairings:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Link specific pipes to your favorite tobacco blends</li>
            <li>Track which combinations work well for you</li>
            <li>Quick access to your preferred pairings</li>
            <li>Notes on each pairing for future reference</li>
          </ul>
        </Q>

        <Q id="premium-filters" q="Premium: Advanced Filters & Sorting">
          Organize and find items in your collection with powerful filtering:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Multi-criteria filtering (shape, material, blend type, etc.)</li>
            <li>Custom sort options (value, date added, rating, etc.)</li>
            <li>Saved filter presets for quick access</li>
            <li>Batch operations on filtered results</li>
          </ul>
        </Q>

        <Q id="premium-tobacco-library" q="Premium: Tobacco Library Sync">
          Access and synchronize with comprehensive tobacco databases:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Auto-fill blend information from curated libraries</li>
            <li>Keep your collection data up-to-date</li>
            <li>Access manufacturer specs and descriptions</li>
            <li>Community-contributed tasting notes</li>
          </ul>
        </Q>

        <Q id="premium-messaging" q="Premium: Community Messaging">
          Connect directly with friends and fellow collectors:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Send and receive instant messages with connections</li>
            <li>Share photos and collection details privately</li>
            <li>Discuss blends and coordinate trades</li>
            <li>Message notifications and history</li>
            <li>Edit or delete sent messages as needed</li>
          </ul>
          Direct messaging is a Premium feature, enabling private communication within the PipeKeeper community.
        </Q>

        <Q id="premium-share-cards" q="Premium: Shareable Collection Cards">
          Create custom share cards to showcase your collection:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Generate beautiful shareable cards of pipes and blends</li>
            <li>Choose what details to display (hide values, photos, notes)</li>
            <li>Share via direct link with friends or online</li>
            <li>Create collection showcase without making full profile public</li>
            <li>Track shares and engagement</li>
          </ul>
        </Q>

        <Q id="premium-community-safety" q="Premium: Community Safety Features">
          Safely connect with the PipeKeeper community with robust moderation:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Private-by-default profiles (choose to make public)</li>
            <li>Block and report tools for objectionable content</li>
            <li>Abuse reporting queue reviewed by moderators</li>
            <li>Comment moderation and removal capabilities</li>
            <li>Share cards for selective profile visibility</li>
            <li>Privacy controls over what others can see</li>
          </ul>
        </Q>

        <Q id="premium-condition-tracking" q="Premium: Advanced Pipe Condition Tracking">
          Monitor your pipes' condition over time with detailed tracking metrics:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Record condition changes and restoration work</li>
            <li>Track maintenance history with dates and costs</li>
            <li>Document professional restoration vs. personal care</li>
            <li>Monitor pipe rest periods and usage frequency</li>
            <li>Impact on valuation estimates</li>
          </ul>
        </Q>

        <Q id="premium-maintenance-logs" q="Premium: Pipe Maintenance & Restoration Logs">
          Keep detailed records of all work done on your pipes:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Log cleaning, restoration, reaming, polishing, and stem work</li>
            <li>Track who performed the work (self, professional, etc.)</li>
            <li>Record dates, costs, and before/after photos</li>
            <li>Build a complete pipe history for collector value</li>
            <li>Export maintenance history for insurance documentation</li>
          </ul>
        </Q>

        <Q id="premium-rotation-planner" q="Premium: Pipe Rotation Planner">
          Optimize pipe health with the rotation planner:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Tracks mandatory 24-hour rest periods between sessions</li>
            <li>Recommends which pipes are ready to smoke</li>
            <li>Prevents overuse and burnout of favorite pipes</li>
            <li>Helps balance collection usage</li>
            <li>Integrates with smoking logs for automated tracking</li>
          </ul>
        </Q>

        <Q id="premium-cellar-aging" q="Premium: Aging Dashboard & Recommendations">
          Monitor and manage your cellar with intelligent aging tracking:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Visual dashboard showing all cellared tobacco by age</li>
            <li>Automatic aging recommendations based on blend type</li>
            <li>Track time since cellaring for each blend</li>
            <li>Progress indicators showing aging status vs. potential</li>
            <li>Aging readiness suggestions (ready to smoke, continue aging, etc.)</li>
            <li>Integration with cellar log for transaction history</li>
          </ul>
        </Q>

        <Q id="premium-inventory-forecast" q="Premium: Inventory Forecasting">
          Project your tobacco consumption and predict when supplies will run out:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Analyze smoking frequency from your logs</li>
            <li>Estimate depletion dates for open tobacco</li>
            <li>Alert when cellared stock is ready for rotation</li>
            <li>Help plan future purchases</li>
            <li>Track consumption trends over time</li>
          </ul>
        </Q>

        <Q id="premium-blend-journal" q="Premium: Blend Journal & Tasting Notes">
          Create detailed records of your tobacco experiences:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Add tasting notes and personal impressions to each session</li>
            <li>Track flavor evolution as tobacco ages</li>
            <li>Record pipe pairings and recommended combinations</li>
            <li>Document smoking conditions (temperature, time, mood)</li>
            <li>Build a personal tobacco reference database</li>
          </ul>
        </Q>

        <Q id="pro-pairing-intelligence" q="Pro: Smart Pairing Intelligence">
          The enhanced Pairing Matrix generates detailed compatibility scores (0-10) for every pipe-tobacco combination in your collection:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li><b>Smart Focus Matching:</b> Pipes with "Aromatic" focus only match aromatic blends; "Virginia" or "English" focus matches non-aromatic families</li>
            <li><b>Interchangeable Bowl Support:</b> Each bowl variant gets its own recommendations based on its specific focus and characteristics</li>
            <li><b>Aromatic Intensity:</b> Pipes dedicated to aromatics consider light/medium/heavy intensity preferences</li>
            <li><b>Top 10 Storage:</b> For performance, only the top 10 recommendations per pipe are stored</li>
            <li><b>Live Scoring:</b> Use "Check Any Blend" on pipe detail pages to calculate scores for any blend on-demand</li>
            <li><b>One-Click Regeneration:</b> Regenerate all pairings when your collection changes significantly</li>
          </ul>
          The system uses deterministic scoring logic for consistency—no randomness, always the same result for the same inputs.
        </Q>

        <Q id="pro-collection-optimizer" q="Pro: Collection Optimization">
          This AI feature analyzes your collection to identify gaps, redundancies, and specialization opportunities:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li><b>Specialization Suggestions:</b> Recommends dedicating pipes to specific blend families (Virginias, Latakia blends, Aromatics)</li>
            <li><b>Bowl-Specific Focus:</b> For interchangeable bowl systems, suggests focus tags for individual bowls</li>
            <li><b>Gap Analysis:</b> Identifies missing pipe styles or blend types in your collection</li>
            <li><b>Next Purchase Recommendations:</b> Suggests what pipe to buy next based on your current collection</li>
            <li><b>One-Click Apply:</b> Apply recommended focus changes directly from the optimizer interface</li>
            <li><b>Undo Support:</b> Revert optimization changes if needed</li>
          </ul>
          The optimizer works with your pairing matrix to ensure every pipe is used optimally.
        </Q>

        <Q id="pro-break-in" q="Pro: AI Break-in Schedules">
          Generate customized break-in schedules for new pipes:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li><b>Smart Tobacco Selection:</b> Recommends specific blends from your collection for each break-in stage</li>
            <li><b>Progressive Conditioning:</b> Starts with mild, forgiving blends then transitions to your pipe's intended focus</li>
            <li><b>Bowl Count Tracking:</b> Track progress bowl-by-bowl with automated checkmarks</li>
            <li><b>Interchangeable Bowl Support:</b> Generate separate break-in schedules for each bowl variant</li>
            <li><b>Smoking Log Integration:</b> Sessions marked as "break-in" automatically update your schedule</li>
            <li><b>Regeneration:</b> Update schedules as your tobacco collection changes</li>
          </ul>
          <p className="text-sm text-stone-600 mt-2">
            Pro is active starting <b>February 1, 2026</b>. If you subscribed to Premium before February 1, 2026, you keep AI-powered features like break-in schedules.
          </p>
        </Q>

        <Q id="pro-pipe-specialization" q="Pro: AI Pipe Specialization">
          AI-powered recommendations for pipe specialization:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Analyzes pipe characteristics and smoking properties</li>
            <li>Recommends which pipes to dedicate to specific tobacco types</li>
            <li>Suggestions based on collection composition and usage patterns</li>
            <li>Helps optimize each pipe for Virginias, Latakia blends, Aromatics, etc.</li>
          </ul>
          <p className="text-sm text-stone-600 mt-2">
            Pro is active starting <b>February 1, 2026</b>. If you subscribed to Premium before February 1, 2026, you keep AI-powered specialization recommendations.
          </p>
        </Q>

        <Q id="pro-ai-updates" q="Pro: AI Updates">
          Receive ongoing AI-powered insights and recommendations:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Continuous learning from your smoking logs and preferences</li>
            <li>Evolving pairing suggestions as your collection grows</li>
            <li>Personalized collection insights and trends</li>
            <li>Smart notifications for optimal pipe rotation and cellar management</li>
          </ul>
          <p className="text-sm text-stone-600 mt-2">
            Pro is active starting <b>February 1, 2026</b>. If you subscribed to Premium before February 1, 2026, you keep AI Updates.
          </p>
        </Q>

        <Q id="pro-ai-identification" q="Pro: AI Identification Tools">
          Advanced AI-powered identification and analysis:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Photo identification for pipes (stamps, shapes, makers)</li>
            <li>AI market value lookup and automated tracking</li>
            <li>Measurement calculator from photos</li>
            <li>Web search for auto-filling pipe & tobacco details</li>
            <li>Visual analysis of condition and authenticity</li>
          </ul>
          <p className="text-sm text-stone-600 mt-2">
            Pro is active starting <b>February 1, 2026</b>. If you subscribed to Premium before February 1, 2026, you keep AI Identification tools.
          </p>
        </Q>

        <Q id="pro-analytics" q="Pro: Analytics & Insights">
          Comprehensive analytics and data visualization:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Detailed collection statistics and trends</li>
            <li>Smoking pattern analysis and insights</li>
            <li>Value tracking and investment performance</li>
            <li>Usage heatmaps and rotation recommendations</li>
            <li>Predictive analytics for inventory planning</li>
          </ul>
        </Q>

        <Q id="pro-bulk-editing" q="Pro: Bulk Editing Tools">
          Efficiently manage large collections with powerful bulk operations:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Batch update multiple pipes or tobacco entries at once</li>
            <li>Quickly apply tags, categories, and metadata changes</li>
            <li>Bulk photo uploads and organization</li>
            <li>Mass price updates and value adjustments</li>
            <li>Streamlined data correction and standardization</li>
          </ul>
        </Q>

        <Q id="pro-export-reporting" q="Pro: Export & Reporting">
          Generate comprehensive PDF reports of your collection with photos, detailed analytics, valuation summaries, and pairing guides. Export your data in multiple formats for insurance documentation or personal records:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>PDF pipe valuations with detailed specs and photos</li>
            <li>CSV/Excel exports for all collection data</li>
            <li>Year-in-review reports with statistics and trends</li>
            <li>Smoking history summaries</li>
            <li>Cellar inventory reports</li>
            <li>Insurance-ready documentation with valuations</li>
          </ul>
        </Q>

        <Q id="premium-share-cards" q="Premium: Shareable Collection Cards">
          Create custom share cards to showcase your collection:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Generate beautiful shareable cards of pipes and blends</li>
            <li>Choose what details to display (hide values, photos, notes)</li>
            <li>Share via direct link with friends or online</li>
            <li>Create collection showcase without making full profile public</li>
            <li>Track shares and engagement</li>
          </ul>
        </Q>

        <Q id="premium-community-safety" q="Premium: Community Safety Features">
          Safely connect with the PipeKeeper community with robust moderation:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Private-by-default profiles (choose to make public)</li>
            <li>Block and report tools for objectionable content</li>
            <li>Abuse reporting queue reviewed by moderators</li>
            <li>Comment moderation and removal capabilities</li>
            <li>Share cards for selective profile visibility</li>
            <li>Privacy controls over what others can see</li>
          </ul>
        </Q>

        <Q id="premium-condition-tracking" q="Premium: Advanced Pipe Condition Tracking">
          Monitor your pipes' condition over time with detailed tracking metrics:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Record condition changes and restoration work</li>
            <li>Track maintenance history with dates and costs</li>
            <li>Document professional restoration vs. personal care</li>
            <li>Monitor pipe rest periods and usage frequency</li>
            <li>Impact on valuation estimates</li>
          </ul>
        </Q>

        <Q id="premium-maintenance-logs" q="Premium: Pipe Maintenance & Restoration Logs">
          Keep detailed records of all work done on your pipes:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Log cleaning, restoration, reaming, polishing, and stem work</li>
            <li>Track who performed the work (self, professional, etc.)</li>
            <li>Record dates, costs, and before/after photos</li>
            <li>Build a complete pipe history for collector value</li>
            <li>Export maintenance history for insurance documentation</li>
          </ul>
        </Q>

        <Q id="premium-rotation-planner" q="Premium: Pipe Rotation Planner">
          Optimize pipe health with the rotation planner:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Tracks mandatory 24-hour rest periods between sessions</li>
            <li>Recommends which pipes are ready to smoke</li>
            <li>Prevents overuse and burnout of favorite pipes</li>
            <li>Helps balance collection usage</li>
            <li>Integrates with smoking logs for automated tracking</li>
          </ul>
        </Q>

        <Q id="premium-cellar-aging" q="Premium: Aging Dashboard & Recommendations">
          Monitor and manage your cellar with intelligent aging tracking:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Visual dashboard showing all cellared tobacco by age</li>
            <li>Automatic aging recommendations based on blend type</li>
            <li>Track time since cellaring for each blend</li>
            <li>Progress indicators showing aging status vs. potential</li>
            <li>Aging readiness suggestions (ready to smoke, continue aging, etc.)</li>
            <li>Integration with cellar log for transaction history</li>
          </ul>
        </Q>

        <Q id="premium-inventory-forecast" q="Premium: Inventory Forecasting">
          Project your tobacco consumption and predict when supplies will run out:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Analyze smoking frequency from your logs</li>
            <li>Estimate depletion dates for open tobacco</li>
            <li>Alert when cellared stock is ready for rotation</li>
            <li>Help plan future purchases</li>
            <li>Track consumption trends over time</li>
          </ul>
        </Q>

        <Q id="premium-blend-journal" q="Premium: Blend Journal & Tasting Notes">
          Create detailed records of your tobacco experiences:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Add tasting notes and personal impressions to each session</li>
            <li>Track flavor evolution as tobacco ages</li>
            <li>Record pipe pairings and recommended combinations</li>
            <li>Document smoking conditions (temperature, time, mood)</li>
            <li>Build a personal tobacco reference database</li>
          </ul>
        </Q>


      </Section>

      <Section title="Accounts & Data">
        <Q id="need-account" q="Do I need an account?">
          Yes. Creating an account allows your collection and settings to be saved and synced across devices.
        </Q>

        <Q id="export-data" q="Can I export my data?">
          Yes. Export tools allow you to generate CSV/PDF reports of your pipes, tobacco inventory, and smoking logs. Look for export buttons on the Pipes and Tobacco pages.
        </Q>

        <Q id="bulk-import" q="Can I import data in bulk?">
          Yes. Go to the Import page from the Home screen. You can paste CSV data or upload a file to quickly add multiple pipes or tobacco blends at once.
        </Q>
      </Section>

      <Section title="Subscriptions & Premium">
        <Q id="free-trial" q="Is there a free trial?">
          PipeKeeper may offer a limited trial window that temporarily enables Premium features. If a trial is active for
          your account, the app will display the remaining time in the Subscription area.
        </Q>

        <Q id="how-subscribe" q="How do subscriptions work?">
          PipeKeeper offers optional Premium features through a paid subscription. Subscription pricing and trial availability are displayed in the app.
          <div className="mt-2">
            <b>iOS:</b> Subscriptions are managed through Apple's in-app purchase system. Purchase and manage your subscription through the iOS Settings app.
          </div>
          <div className="mt-2">
            <b>Web/Android:</b> Subscriptions are purchased on the web and managed through a secure customer portal accessible from the app's Profile section.
          </div>
        </Q>

        <Q id="manage-subscription" q="How do I manage, change, or cancel my subscription?">
          <div className="space-y-3">
            <div>
              <b>iOS Subscriptions:</b>
              <div className="mt-1">
                Subscriptions purchased through the iOS app are managed through Apple's system. To manage your subscription:
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Open iOS <b>Settings</b> → [Your Name] → <b>Subscriptions</b></li>
                  <li>Select PipeKeeper</li>
                  <li>Cancel, change plans, or view billing details</li>
                </ul>
              </div>
            </div>
            <div>
              <b>Web/Android Subscriptions:</b>
              <div className="mt-1">
                To manage your subscription (update payment method, view invoices, or cancel), go to <b>Profile → Manage subscription</b>.
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Cancel or restart your subscription</li>
                  <li>Update your payment method</li>
                  <li>View invoices and billing history</li>
                </ul>
              </div>
            </div>
          </div>
        </Q>

        <Q id="continue-trial" q="How do I continue my subscription after a free trial?">
          If your account includes a free trial, you will be prompted to subscribe before the trial ends to continue Premium access.
          <div className="mt-2">
            <b>iOS:</b> Subscribe through the app using Apple's in-app purchase system. Your subscription will be managed through iOS Settings.
          </div>
          <div className="mt-2">
            <b>Web/Android:</b> Subscribe through your Profile page. Subscription status and renewal options are always available there.
          </div>
        </Q>

        <Q id="premium-activate" q="I already paid—when do Premium features activate?">
          If your account shows <b className="text-[#e8d5b7]">Paid</b> status (for example, your account subscription level is marked as paid),
          Premium features are available immediately unless the app is currently in a time-limited testing window. If a
          testing window is active, the app will display the timing and your access level in the Subscription screen.
        </Q>

        <Q id="refunds" q="Refunds and billing questions">
          <div className="space-y-2">
            <div>
              <b>iOS Subscriptions:</b> Billing is handled by Apple. For refund requests or billing questions, contact Apple Support directly or request a refund through reportaproblem.apple.com.
            </div>
            <div>
              <b>Web/Android Subscriptions:</b> Billing is handled through our third-party payment processor. Please contact PipeKeeper support for billing questions, refunds (where applicable), or account access issues.
            </div>
          </div>
        </Q>
      </Section>

      <Section title="Community & Content">
        <Q id="user-content" q="Does PipeKeeper include user-generated content?">
          Yes. PipeKeeper allows users to create and manage content such as notes, reviews, descriptions, images, and collection details.
        </Q>

        <Q id="content-rules" q="What content is not allowed?">
          PipeKeeper has zero tolerance for objectionable or abusive content. Prohibited content includes:
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Harassment, hate speech, or threats</li>
            <li>Sexually explicit or pornographic material</li>
            <li>Violence or promotion of illegal activities</li>
            <li>Spam, impersonation, or misleading content</li>
          </ul>
          <div className="mt-2">
            Accounts or content violating these rules may be restricted or removed.
          </div>
        </Q>

        <Q id="report-abuse" q="How do I report objectionable content or abuse?">
          You can report objectionable content or abusive behavior by contacting PipeKeeper support. Reports are reviewed promptly, and appropriate action is taken.
        </Q>
      </Section>

      <Section title="AI Features & Accuracy">
        <Q id="ai-accuracy" q="Are AI recommendations guaranteed to be correct?">
          No. AI features provide best-effort suggestions and may be incomplete or inaccurate. You should use your own
          judgment and verify important information from reliable sources.
        </Q>

        <Q id="medical-advice" q="Does PipeKeeper provide medical or professional advice?">
          No. PipeKeeper provides informational tools for hobby and collection management only.
        </Q>
      </Section>

      <Section title="Support">
        <Q id="contact-support" q="How do I contact support?">
          Use the support link inside the app or visit{" "}
          <a href="https://pipekeeper.app" target="_blank" rel="noreferrer" className="text-[#8b3a3a] hover:text-[#a94747] underline">
            pipekeeper.app
          </a>
          . You can also review our policies here:
          <ul className="mt-2 space-y-1">
            <li>
              <Link to={createPageUrl('TermsOfService')} className="text-[#8b3a3a] hover:text-[#a94747] underline">Terms of Service</Link>
            </li>
            <li>
              <Link to={createPageUrl('PrivacyPolicy')} className="text-[#8b3a3a] hover:text-[#a94747] underline">Privacy Policy</Link>
            </li>
          </ul>
        </Q>
      </Section>
    </div>
    </div>
  );
}