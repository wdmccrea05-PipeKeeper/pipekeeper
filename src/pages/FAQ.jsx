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
    <Card className="bg-[#243548] border-[#8b3a3a]/30 overflow-hidden">
      <button
        onClick={() => toggleItem(id)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-[#8b3a3a]/10 transition-colors"
      >
        <span className="font-semibold text-[#e8d5b7] pr-4">{q}</span>
        <ChevronDown 
          className={`w-5 h-5 text-[#e8d5b7]/70 flex-shrink-0 transition-transform ${openItems[id] ? 'rotate-180' : ''}`}
        />
      </button>
      {openItems[id] && (
        <CardContent className="px-4 pb-4 pt-0 text-[#e8d5b7]/80 leading-relaxed">
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
          PipeKeeper helps you track your pipes, tobaccos, cellared tins, and smoking sessions—plus optional tools like
          pairing suggestions, collection insights, and reports.
        </Q>

        <Q id="tobacco-sales" q="Does PipeKeeper sell tobacco or facilitate tobacco sales?">
          No. PipeKeeper is a tracking and informational app. We do not sell tobacco products, process tobacco orders, or
          arrange shipments.
        </Q>
      </Section>

      <Section title="Accounts & Data">
        <Q id="need-account" q="Do I need an account?">
          Yes. Creating an account allows your collection and settings to be saved and synced across devices.
        </Q>

        <Q id="export-data" q="Can I export my data?">
          Yes. If export tools are enabled for your account, you can generate CSV/PDF reports from the app.
        </Q>
      </Section>

      <Section title="Premium, Trials & Subscriptions">
        <Q id="premium-included" q="What is included in Premium?">
          Premium includes advanced tools such as enhanced pairing/optimization features, deeper reporting/export options,
          and other upgraded capabilities shown on the Subscription screen.
        </Q>

        <Q id="free-trial" q="Is there a free trial?">
          PipeKeeper may offer a limited trial window that temporarily enables Premium features. If a trial is active for
          your account, the app will display the remaining time in the Subscription area.
        </Q>

        <Q id="how-subscribe" q="How do I subscribe?">
          Subscriptions can be purchased on the web (through the in-app checkout flow) and/or through platform storefronts
          depending on how you installed PipeKeeper.
        </Q>

        <Q id="manage-subscription" q="How do I manage, change, or cancel my subscription?">
          <div style={{ marginBottom: 8 }}>
            PipeKeeper subscriptions are managed through our secure billing portal (web-based).
          </div>

          <ul style={{ marginTop: 0, marginBottom: 10 }}>
            <li>
              Go to <b>Profile</b> in the app and tap <b>Manage subscription</b> (or <b>Billing portal</b>).
            </li>
            <li>
              If you don't see the button, it usually means your account hasn't created a subscription customer record yet.
              Start a subscription once, then the portal link will appear.
            </li>
            <li>
              If you still can't access the portal, contact support and we'll help you locate your billing link.
            </li>
          </ul>

          <div style={{ opacity: 0.9 }}>
            Note: Subscriptions are not managed through Apple App Store or Google Play.
          </div>
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