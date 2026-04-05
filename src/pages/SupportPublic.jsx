import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Mail, CheckCircle, AlertCircle } from "lucide-react";

const FAQS = [
  {
    q: "How do I manage my subscription?",
    a: "Go to Settings → Subscription inside the app to view, upgrade, or cancel your plan. For billing issues, email us directly at admin@pipekeeperapp.com.",
  },
  {
    q: "How do I restore my purchases?",
    a: "Open the app, go to Settings → Subscription, and tap 'Restore Purchases'. If the issue persists, contact support with your Apple ID email.",
  },
  {
    q: "How do I contact support?",
    a: "You can email us at admin@pipekeeperapp.com or use the form on this page. We respond within 24–48 hours.",
  },
  {
    q: "What is included in each module?",
    a: "CollectionKeeper includes PipeKeeper (pipes & tobacco), WhiskeyKeeper (spirits), and coming soon: WineKeeper and CigarKeeper. Each module tracks your collection, logs sessions, and provides AI-driven insights.",
  },
  {
    q: "My data isn't syncing. What should I do?",
    a: "Make sure you're connected to the internet and logged in with the same account. Try force-quitting and relaunching the app. If the issue continues, contact support with a description of what you're seeing.",
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[rgba(180,140,75,0.2)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
      >
        <span className="font-medium text-[#F5F1E7] text-sm pr-4">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#D4A574] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#D4A574] shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 py-4 bg-[rgba(0,0,0,0.15)] border-t border-[rgba(180,140,75,0.1)]">
          <p className="text-sm text-[#E0D8C8]/80 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function SupportPublic() {
  const [form, setForm] = useState({ topic: "General Help", name: "", email: "", message: "" });
  const [status, setStatus] = useState(null); // null | "sending" | "success" | "error"

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      await base44.integrations.Core.SendEmail({
        to: "admin@pipekeeperapp.com",
        subject: `[CollectionKeeper Support] ${form.topic} — from ${form.name}`,
        body: `Topic: ${form.topic}\nName: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`,
      });
      setStatus("success");
      setForm({ topic: "General Help", name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "#140f0c" }}>
      {/* Header bar */}
      <div className="border-b border-[rgba(180,140,75,0.15)] bg-[rgba(20,15,12,0.9)] px-4 py-4 flex items-center gap-3">
        <span className="text-[#D4A574] font-bold text-lg tracking-tight">CollectionKeeper</span>
      </div>

      {/* ══ APPLE GUIDELINE 1.5 — CONTACT SUPPORT BLOCK (above the fold, no scroll) ══ */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(44,28,20,0.98), rgba(28,18,12,0.99))',
          borderBottom: '2px solid rgba(180,140,75,0.35)',
        }}
        className="px-4 py-6"
      >
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-[#F5F1E7] mb-1">Contact Support</h1>
          <p className="text-[#E0D8C8]/75 text-sm mb-5">Need help with CollectionKeeper? We're here to help.</p>

          <a
            href="mailto:admin@pipekeeperapp.com?subject=CollectionKeeper Support"
            className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-xl font-bold text-white text-base mb-3"
            style={{ background: 'linear-gradient(135deg, #a35c5c, #8f4e4e)', fontSize: '1rem' }}
          >
            <Mail className="w-5 h-5" />
            Email Support
          </a>

          <p
            className="text-center font-semibold text-base mb-1"
            style={{ color: '#D4A574', letterSpacing: '0.01em' }}
          >
            admin@pipekeeperapp.com
          </p>
          <p className="text-center text-[#E0D8C8]/55 text-sm">
            We typically respond within 24–48 hours.
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-8">

        {/* ── SUPPORT FORM ── */}
        <div className="rounded-2xl border border-[rgba(180,140,75,0.2)] bg-[rgba(255,255,255,0.03)] p-6 mb-8">
          <h2 className="text-xl font-semibold text-[#F5F1E7] mb-5">Submit a Support Request</h2>

          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-[#F5F1E7] font-semibold text-lg">Request Sent!</p>
              <p className="text-[#E0D8C8]/70 text-sm">Your request has been sent. We'll get back to you shortly.</p>
              <button
                onClick={() => setStatus(null)}
                className="mt-2 text-[#D4A574] text-sm underline"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E0D8C8]/80 mb-1.5">Topic</label>
                <select
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-[rgba(28,21,16,0.8)] border border-[rgba(140,105,65,0.3)] text-[#F5F1E7] text-sm focus:outline-none focus:ring-2 focus:ring-[#A35C5C]"
                >
                  <option>Billing</option>
                  <option>Account</option>
                  <option>Bug</option>
                  <option>Data Sync</option>
                  <option>General Help</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8]/80 mb-1.5">Name <span className="text-red-400">*</span></label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full h-10 px-3 rounded-xl bg-[rgba(28,21,16,0.8)] border border-[rgba(140,105,65,0.3)] text-[#F5F1E7] text-sm placeholder:text-[#D8C7A6]/40 focus:outline-none focus:ring-2 focus:ring-[#A35C5C]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8]/80 mb-1.5">Email <span className="text-red-400">*</span></label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full h-10 px-3 rounded-xl bg-[rgba(28,21,16,0.8)] border border-[rgba(140,105,65,0.3)] text-[#F5F1E7] text-sm placeholder:text-[#D8C7A6]/40 focus:outline-none focus:ring-2 focus:ring-[#A35C5C]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8]/80 mb-1.5">Message <span className="text-red-400">*</span></label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Describe your issue or question..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[rgba(28,21,16,0.8)] border border-[rgba(140,105,65,0.3)] text-[#F5F1E7] text-sm placeholder:text-[#D8C7A6]/40 focus:outline-none focus:ring-2 focus:ring-[#A35C5C] resize-none"
                />
              </div>

              {status === "error" && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Submission failed. Please email us directly at admin@pipekeeperapp.com
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #a35c5c, #8f4e4e)" }}
              >
                {status === "sending" ? "Sending…" : "Send Request"}
              </button>
            </form>
          )}
        </div>

        {/* ── FAQ ── */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#F5F1E7] mb-4">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        <p className="text-center text-[#E0D8C8]/30 text-xs pb-4">
          © {new Date().getFullYear()} CollectionKeeper · <a href="mailto:admin@pipekeeperapp.com" className="underline">admin@pipekeeperapp.com</a>
        </p>
      </div>
    </div>
  );
}