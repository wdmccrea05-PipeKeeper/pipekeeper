import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Mail, CheckCircle, ChevronDown, ChevronUp, CreditCard,
  Bug, HelpCircle, RefreshCw, User, MessageSquare, Smartphone,
  Shield, BookOpen
} from "lucide-react";

const SUPPORT_EMAIL = "admin@pipekeeperapp.com";

const SUPPORT_TOPICS = [
  "General Question",
  "Account & Login",
  "Subscription & Billing",
  "Bug Report",
  "Feature Request",
  "Data / Sync Issue",
  "Other",
];

const FAQ_ITEMS = [
  {
    q: "How do I restore my subscription after reinstalling?",
    a: "On the web app, go to Settings → Subscription and click 'Restore Purchases' or re-login with the same email. On iOS, open the app, go to Settings → Subscription, and tap 'Restore Purchases'. Your subscription is tied to your account and will restore automatically. If it doesn't, contact us with your Apple receipt or order number.",
  },
  {
    q: "My data isn't syncing across devices — what should I do?",
    a: "Make sure you are signed in to the same account on both devices. Refresh the page or pull down to refresh the main list. If the issue persists, try logging out and back in. If data is still missing after 5 minutes, contact support with your account email.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Web subscriptions can be cancelled through the Billing Portal — go to Settings → Subscription → Manage Billing. iOS subscriptions are managed through Apple: Settings → [your name] → Subscriptions, find CollectionKeeper / PipeKeeper, and tap Cancel. You'll retain access until the end of the billing period.",
  },
  {
    q: "I was charged but my premium features aren't unlocked.",
    a: "First, try 'Restore Purchases' in the app settings (or re-login on the web app). If that doesn't work within a few minutes, email us at admin@pipekeeperapp.com with your order number or Apple receipt and we'll resolve it manually.",
  },
  {
    q: "How do I add a new pipe, blend, or bottle?",
    a: "All items are added through the unified Add Flow wizard. Click 'Add' from any module page, or use the Quick Access button (lightning bolt icon in the top header) from any page. The wizard guides you through: choosing item type, searching an online library to auto-fill details, entering basic info, optional details, inventory, and photos.",
  },
  {
    q: "How do I use Plan Session in the Curator?",
    a: "Open the Curator from the top navigation. In the Expert Actions panel, click 'Plan Session'. The AI generates 3 curated session recommendations — each pairing a pipe with a tobacco blend (and a whiskey bottle if WhiskeyKeeper is active). Each card shows a confidence score and rationale. Click 'Try This' to use a session, 'Skip' to dismiss it, or 'Ask Curator' to discuss it.",
  },
  {
    q: "Can I export or back up my collection data?",
    a: "Yes — use the Export feature in PipeKeeper (Insights → Export) or WhiskeyKeeper. Your data is stored in your account and persists across devices and reinstalls as long as you sign in with the same credentials.",
  },
  {
    q: "How do I delete my account?",
    a: "To request account deletion and removal of all your data, email us at admin@pipekeeperapp.com with the subject 'Account Deletion Request'. We will process your request within 7 business days.",
  },
];

const TOPIC_CARDS = [
  { icon: CreditCard, label: "Subscription & Billing", desc: "Charges, upgrades, restores, cancellations", color: "#d4a574" },
  { icon: User, label: "Account & Login", desc: "Sign in issues, password reset, account access", color: "#6fcf97" },
  { icon: RefreshCw, label: "Data & Sync", desc: "Missing data, sync problems, cross-device issues", color: "#56b4e0" },
  { icon: Bug, label: "Report a Bug", desc: "Crashes, UI errors, unexpected behavior", color: "#a35c5c" },
  { icon: Smartphone, label: "App Performance", desc: "Slow loading, freezing, display issues", color: "#b48c4b" },
  { icon: HelpCircle, label: "General Help", desc: "How-to questions, feature guidance", color: "#9b8ecf" },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(180,140,75,0.18)" }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-medium text-[#F5F1E7]">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-[#B48C4B]" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 text-[#B48C4B]" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-[#E0D8C8]/80 leading-relaxed border-t" style={{ borderColor: "rgba(180,140,75,0.12)" }}>
          <p className="pt-3">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function SupportFull() {
  const [formData, setFormData] = useState({ topic: "", name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  // Pre-fill email if logged in
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email, name: user.full_name || prev.name }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const emailBody = `New Support Request — CollectionKeeper / PipeKeeper

Topic: ${formData.topic}
From: ${formData.name}
Email: ${formData.email}
Logged-in Account: ${user?.email || 'Not logged in'}
Submitted: ${new Date().toISOString()}

Message:
${formData.message}
      `;

      await base44.integrations.Core.SendEmail({
        to: SUPPORT_EMAIL,
        subject: `[Support] ${formData.topic} — from ${formData.name}`,
        body: emailBody,
        from_name: "CollectionKeeper Support Form",
      });

      setSubmitted(true);
      setFormData({ topic: "", name: "", email: user?.email || "", message: "" });
    } catch (error) {
      console.error("Support submission error:", error);
      setSubmitError("We couldn't send your message automatically. Please email us directly at " + SUPPORT_EMAIL);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = formData.topic && formData.name && formData.email && formData.message && !isSubmitting;

  return (
    <div
      className="min-h-screen"
      style={{
        background: "radial-gradient(circle at top, rgba(180,140,75,0.07), transparent 35%), linear-gradient(180deg, #241913 0%, #1d1511 50%, #140f0c 100%)",
        color: "#F5F1E7",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-2"
            style={{ background: "rgba(180,140,75,0.14)", border: "1px solid rgba(180,140,75,0.28)", color: "#D4A574" }}>
            CollectionKeeper · PipeKeeper
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Georgia', serif", color: "#F5F1E7" }}>
            Support
          </h1>
          <p className="text-base text-[#E0D8C8]/75 max-w-2xl mx-auto leading-relaxed">
            We're here to help. Whether you have a question about your collection, a subscription issue, or found a bug — reach out and we'll get back to you promptly.
          </p>
          {/* Always-visible email */}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: "rgba(163,92,92,0.9)", color: "#fff", border: "1px solid rgba(163,92,92,0.5)" }}
          >
            <Mail className="w-4 h-4" />
            {SUPPORT_EMAIL}
          </a>
        </div>

        {/* Topic cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#D4A574" }}>How can we help?</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TOPIC_CARDS.map(({ icon: CardIcon, label, desc, color }) => (
              <div
                key={label}
                className="rounded-xl p-4 space-y-1"
                style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(180,140,75,0.15)" }}
              >
                <CardIcon className="w-5 h-5 mb-2" style={{ color }} />
                <div className="text-sm font-semibold text-[#F5F1E7]">{label}</div>
                <div className="text-xs text-[#E0D8C8]/65 leading-snug">{desc}</div>
              </div>
            ))}
            </div>
            </div>

        {/* Contact Form */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(145deg, rgba(44,30,22,0.97), rgba(29,21,16,0.99))", border: "1px solid rgba(180,140,75,0.2)" }}
        >
          <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(180,140,75,0.15)" }}>
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-[#B48C4B]" />
              <h2 className="text-xl font-semibold text-[#F5F1E7]">Contact Support</h2>
            </div>
            <p className="text-sm text-[#E0D8C8]/65 mt-1">
              Fill out the form below and we'll respond within 1–2 business days. You can also email us directly at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline text-[#D4A574]">{SUPPORT_EMAIL}</a>.
            </p>
          </div>

          <div className="px-6 py-6">
            {submitted ? (
              <div className="flex flex-col items-center text-center py-10 gap-4">
                <CheckCircle className="w-14 h-14 text-green-400" />
                <h3 className="text-xl font-semibold text-[#F5F1E7]">Message Sent!</h3>
                <p className="text-sm text-[#E0D8C8]/70 max-w-sm">
                  Thanks for reaching out. We've received your message and will reply to <strong>{formData.email || "your email"}</strong> within 1–2 business days.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSubmitted(false)}
                  className="mt-2"
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label className="text-[#E0D8C8] text-sm font-medium">Topic *</Label>
                  <Select
                    value={formData.topic}
                    onValueChange={(v) => setFormData(p => ({ ...p, topic: v }))}
                    required
                  >
                    <SelectTrigger className="mt-1.5" style={{ background: "rgba(20,15,12,0.6)", border: "1px solid rgba(180,140,75,0.28)", color: "#F5F1E7" }}>
                      <SelectValue placeholder="Select a topic…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_TOPICS.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#E0D8C8] text-sm font-medium">Your Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Full name"
                      required
                      className="mt-1.5"
                      style={{ background: "rgba(20,15,12,0.6)", border: "1px solid rgba(180,140,75,0.28)", color: "#F5F1E7" }}
                    />
                  </div>
                  <div>
                    <Label className="text-[#E0D8C8] text-sm font-medium">Your Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                      placeholder="you@example.com"
                      required
                      className="mt-1.5"
                      style={{ background: "rgba(20,15,12,0.6)", border: "1px solid rgba(180,140,75,0.28)", color: "#F5F1E7" }}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#E0D8C8] text-sm font-medium">Message *</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
                    placeholder="Describe your issue or question in as much detail as possible…"
                    required
                    className="mt-1.5 min-h-[140px]"
                    style={{ background: "rgba(20,15,12,0.6)", border: "1px solid rgba(180,140,75,0.28)", color: "#F5F1E7" }}
                  />
                </div>

                {submitError && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(163,92,92,0.15)", border: "1px solid rgba(163,92,92,0.35)", color: "#f4a0a0" }}>
                    {submitError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full"
                  style={{ background: "linear-gradient(135deg, #a35c5c, #8f4e4e)", color: "#fff" }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Sending…" : "Send Message"}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* What to include */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.15)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-[#B48C4B]" />
            <h2 className="text-lg font-semibold text-[#F5F1E7]">What to Include in Your Message</h2>
          </div>
          <p className="text-sm text-[#E0D8C8]/70">To help us resolve your issue quickly, please include:</p>
          <ul className="space-y-2 text-sm text-[#E0D8C8]/80">
            {[
              "Your device model and iOS version (e.g., iPad Air, iOS 17.4)",
              "The app version (found in Settings → About)",
              "A clear description of what happened and what you expected",
              "Steps to reproduce the issue, if it's a bug",
              "Screenshots or screen recordings if available",
              "Your Apple ID or account email if it's a billing issue",
              "Your order number or Apple receipt if it's a subscription issue",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center" style={{ background: "rgba(180,140,75,0.2)", color: "#D4A574" }}>{i + 1}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#D4A574" }}>Common Questions</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

        {/* Troubleshooting */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.15)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-5 h-5 text-[#B48C4B]" />
            <h2 className="text-lg font-semibold text-[#F5F1E7]">Troubleshooting</h2>
          </div>
          <div className="space-y-3 text-sm text-[#E0D8C8]/80">
            <p><strong className="text-[#F5F1E7]">App won't load or shows a blank screen:</strong> Force-close the app completely and reopen it. If it persists, check your internet connection, then try deleting and reinstalling.</p>
            <p><strong className="text-[#F5F1E7]">Premium features disappeared after update:</strong> Go to Settings → Subscription → Restore Purchases. Your entitlements will sync within 30 seconds.</p>
            <p><strong className="text-[#F5F1E7]">Can't sign in:</strong> Make sure you're using the same login method (Apple Sign-In, Google, or email) that you originally used to create your account.</p>
            <p><strong className="text-[#F5F1E7]">Data not appearing after adding it:</strong> Pull down to refresh the list. If data is still missing, log out and back in to force a full sync.</p>
            <p><strong className="text-[#F5F1E7]">Pairing or AI features not working:</strong> These require an active internet connection and an active subscription. Check both, then try again. If Curator Expert Actions appear stuck, reload the page.</p>
            <p><strong className="text-[#F5F1E7]">Plan Session shows 0% confidence:</strong> This has been resolved. If you still see it, reload the page to get fresh recommendations.</p>
            <p><strong className="text-[#F5F1E7]">Plan Session including whiskey unexpectedly:</strong> Whiskey pairings only appear when WhiskeyKeeper is active and you have bottles in your collection. Toggle WhiskeyKeeper in your Profile settings.</p>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm pt-4 pb-6" style={{ color: "rgba(224,216,200,0.5)", borderTop: "1px solid rgba(180,140,75,0.12)" }}>
          <a href="/PrivacyPolicy" className="hover:text-[#D4A574] transition-colors flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Privacy Policy
          </a>
          <a href="/TermsOfService" className="hover:text-[#D4A574] transition-colors">Terms of Service</a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-[#D4A574] transition-colors flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" /> {SUPPORT_EMAIL}
          </a>
        </div>

      </div>
    </div>
  );
}