import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function FAQ() {
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (id) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 32 }}>
      <h2 className="text-2xl font-bold text-[#e8d5b7] mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const Q = ({ id, q, children }) => (
    <Card className="bg-white border-[#8b3a3a]/30 overflow-hidden">
      <button
        onClick={() => toggleItem(id)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-[#1a2c42]/5 transition-colors"
      >
        <span className="font-semibold text-[#1a2c42] pr-4">{q}</span>
        <ChevronDown 
          className={`w-5 h-5 text-[#1a2c42]/70 flex-shrink-0 transition-transform ${openItems[id] ? 'rotate-180' : ''}`}
        />
      </button>
      {openItems[id] && (
        <CardContent className="px-4 pb-4 pt-0 text-[#1a2c42]/80 leading-relaxed">
          {children}
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 16px" }}>
        <h1 className="text-4xl font-bold text-[#e8d5b7] mb-8">PipeKeeper FAQ</h1>

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
      </Section>

      <Section title="Getting Started">
        <Q id="how-install" q="How do I install PipeKeeper on my phone?">
          PipeKeeper is available as a web app and through companion apps. To use on your phone:
          <ul className="mt-2 space-y-1">
            <li><b>Web:</b> Visit pipekeeper.app in your mobile browser and add to home screen</li>
            <li><b>iOS:</b> Download the PipeKeeper companion app from the Apple App Store</li>
            <li><b>Android:</b> Download the PipeKeeper companion app from Google Play</li>
          </ul>
          Note: Subscriptions are managed through the web version, not through app stores.
        </Q>

        <Q id="tutorial" q="Is there a tutorial or walkthrough?">
          Yes! When you first create your account, PipeKeeper offers a guided onboarding flow that walks you through:
          <ul className="mt-2 space-y-1">
            <li>Setting up your smoking profile preferences</li>
            <li>Adding your first pipe to your collection</li>
            <li>Adding your first tobacco blend</li>
            <li>Logging your first smoking session</li>
            <li>Accessing AI-powered features</li>
          </ul>
          <div className="mt-4">
            <a href={createPageUrl('Home?restart_tutorial=true')} className="inline-block">
              <button className="px-4 py-2 bg-[#8b3a3a] text-white rounded-lg hover:bg-[#a94747] transition-colors">
                Restart Tutorial
              </button>
            </a>
          </div>
        </Q>

        <Q id="how-add-pipe" q="How do I add a pipe to my collection?">
          Go to the <b>Pipes</b> tab and tap the <b>+</b> button. Fill in as much or as little detail as you want—only the pipe name is required. You can use the AI identification tool to help fill in details from photos.
        </Q>

        <Q id="how-add-tobacco" q="How do I add tobacco to my collection?">
          Go to the <b>Tobacco</b> tab and tap the <b>+</b> button. Enter the blend name and any other details you want to track (manufacturer, blend type, quantities, etc.). The AI can help identify blends from photos or labels.
        </Q>

        <Q id="what-cellaring" q="What is cellaring?">
          Cellaring refers to storing sealed tins or bulk tobacco for aging. PipeKeeper includes a detailed cellaring log system that tracks when tobacco is added to or removed from your cellar, quantities in ounces, container types, and notes. This feature is available to Premium subscribers.
        </Q>

        <Q id="smoking-log" q="What is the smoking log?">
          The smoking log tracks which pipes you've smoked with which tobaccos. It helps you remember what works well together and contributes to AI pairing recommendations.
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
        <Q id="pairing-matrix" q="What is the Pairing Matrix?">
          The AI-powered Pairing Matrix suggests which tobacco blends work best with each pipe in your collection based on pipe characteristics, blend profiles, and your preferences. Basic pairing suggestions are available to all users.
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

      <Section title="Premium Feature Definitions">
        <Q id="premium-included" q="What is included in Premium?">
          Premium includes advanced tools such as enhanced pairing/optimization features, deeper reporting/export options,
          and other upgraded capabilities. See below for detailed feature descriptions.
        </Q>

        <Q id="premium-pairing-matrix" q="Premium: Advanced Pairing Matrix">
          The enhanced Pairing Matrix uses AI to analyze your entire collection and generate compatibility scores between every pipe and tobacco combination. It considers pipe characteristics (shape, size, chamber volume), blend profiles (type, strength, cut), and your personal preferences to suggest optimal pairings.
        </Q>

        <Q id="premium-collection-optimizer" q="Premium: Collection Optimization">
          This AI feature analyzes your collection to identify gaps, redundancies, and specialization opportunities. It suggests dedicating specific pipes to certain blend types, recommends what pipe to buy next based on your collection needs, and helps you make the most of what you own.
        </Q>

        <Q id="premium-break-in" q="Premium: AI Break-in Schedules">
          Generate customized break-in schedules for new pipes. The AI recommends specific tobaccos from your cellar and a progression of bowl counts designed to build proper cake without risking burnout. It adapts to your pipe's characteristics and your smoking preferences.
        </Q>

        <Q id="premium-pipe-specialization" q="Premium: Pipe Specialization">
          The system can recommend which pipes to dedicate to specific tobacco types (Virginias, Latakia blends, Aromatics, etc.) based on each pipe's smoking characteristics and your collection composition.
        </Q>

        <Q id="premium-community" q="Premium: Community Features">
          Access the full Community section to make your profile public, follow other collectors, view and comment on their collections, and send direct messages to friends. Find collectors near you or with similar interests.
        </Q>

        <Q id="premium-advanced-exports" q="Premium: Advanced Export & Reporting">
          Generate comprehensive PDF reports of your collection with photos, detailed analytics, valuation summaries, and pairing guides. Export your data in multiple formats for insurance documentation or personal records.
        </Q>

        <Q id="premium-ai-updates" q="Premium: AI Updates & Recommendations">
          Receive ongoing AI-powered recommendations as your collection grows. The system learns from your smoking logs and preferences to continuously improve pairing suggestions and collection insights.
        </Q>

        <Q id="premium-bulk-operations" q="Premium: Bulk Operations">
          Perform bulk updates on multiple pipes or tobacco entries at once. Quickly update quantities, apply tags, or modify settings across your entire collection efficiently.
        </Q>

        <Q id="premium-value-tracking" q="Premium: Enhanced Value Tracking">
          Track estimated market values for your collection over time, receive alerts on market trends for rare pipes or tobaccos you own, and generate valuation reports for insurance purposes.
        </Q>

        <Q id="premium-messaging" q="Premium: Direct Messaging">
          Send and receive instant messages with friends in the PipeKeeper community. Share photos, discuss blends, coordinate trades, and connect with fellow enthusiasts privately. Edit or delete sent messages as needed.
        </Q>

        <Q id="premium-cellaring-log" q="Premium: Cellaring Log System">
          Track detailed cellaring transactions with the dedicated cellaring log. Record when tobacco is added to or removed from your cellar with precise amounts in ounces, container types (tin, jar, bulk, pouch), dates, and notes. View net cellared amounts for each blend and drill down into cellar inventory from the home page.
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
            Subscriptions are purchased on the web and managed through a secure customer portal accessible from the app's Profile section.
          </div>
          <div className="mt-2 font-semibold">
            PipeKeeper does not use Apple App Store or Google Play billing systems for subscriptions.
          </div>
        </Q>

        <Q id="manage-subscription" q="How do I manage, change, or cancel my subscription?">
          PipeKeeper subscriptions are purchased on the web and managed securely through our payment provider's customer portal.
          <div className="mt-2">
            To manage your subscription (update payment method, view invoices, or cancel), go to <b>Profile → Manage subscription</b>.
          </div>
          <div className="mt-2">
            From the customer portal, you can:
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Cancel or restart your subscription</li>
              <li>Update your payment method</li>
              <li>View invoices and billing history</li>
            </ul>
          </div>
          <div className="mt-2">
            If you don't see the <b>Manage subscription</b> option, contact support and we'll help you access your subscription portal.
          </div>
        </Q>

        <Q id="continue-trial" q="How do I continue my subscription after a free trial?">
          If your account includes a free trial, you will be prompted to subscribe before the trial ends to continue Premium access. Subscription status and renewal options are always available from your Profile page.
        </Q>

        <Q id="premium-activate" q="I already paid—when do Premium features activate?">
          If your account shows <b className="text-[#e8d5b7]">Paid</b> status (for example, your account subscription level is marked as paid),
          Premium features are available immediately unless the app is currently in a time-limited testing window. If a
          testing window is active, the app will display the timing and your access level in the Subscription screen.
        </Q>

        <Q id="refunds" q="Refunds and billing questions">
          For web subscriptions, billing is handled through our third-party payment processor. Please contact support for billing
          questions, refunds (where applicable), or account access issues.
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