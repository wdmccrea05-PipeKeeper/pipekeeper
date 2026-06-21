import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from '@/components/i18n/safeTranslation';

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
    a: "CollectionKeeper currently includes PipeKeeper (pipes & tobacco) and WhiskeyKeeper (spirits). Both modules track your collection, logs, and insights.",
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
  const { t } = useTranslation();
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
        <span className="text-[#D4A574] font-bold text-lg tracking-tight">{t("auto.pages_SupportPublic.collectionkeeper_1ukoz8")}</span>
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
          <h1 className="text-2xl font-bold text-[#F5F1E7] mb-1">{t("auto.pages_SupportPublic.contact_support_1iw7ql")}</h1>
          <p className="text-[#E0D8C8]/75 text-sm mb-5">{t("auto.pages_SupportPublic.need_help_with_collectionkeeper_we_re_idzzc5")}</p>

          <a
            href="mailto:admin@pipekeeperapp.com?subject=CollectionKeeper Support"
            className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-xl font-bold text-white text-base mb-3"
            style={{ background: 'linear-gradient(135deg, #a35c5c, #8f4e4e)', fontSize: '1rem' }}
          >
            <Mail className="w-5 h-5" />
            {t("auto.pages_SupportPublic.email_support_158jvi")}
          </a>

          <p
            className="text-center font-semibold text-base mb-1"
            style={{ color: '#D4A574', letterSpacing: '0.01em' }}
          >
            admin@pipekeeperapp.com
          </p>
          <p className="text-center text-[#E0D8C8]/55 text-sm">
            {t("auto.pages_SupportPublic.we_typically_respond_within_24_48_glx0dq")}
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-8">

        {/* ── SUPPORT FORM ── */}
        <div className="rounded-2xl border border-[rgba(180,140,75,0.2)] bg-[rgba(255,255,255,0.03)] p-6 mb-8">
          <h2 className="text-xl font-semibold text-[#F5F1E7] mb-5">{t("auto.pages_SupportPublic.submit_a_support_request_1p1ye1")}</h2>

          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-[#F5F1E7] font-semibold text-lg">{t("auto.pages_SupportPublic.request_sent_bdd5m1")}</p>
              <p className="text-[#E0D8C8]/70 text-sm">{t("auto.pages_SupportPublic.your_request_has_been_sent_we_sfole2")}</p>
              <button
                onClick={() => setStatus(null)}
                className="mt-2 text-[#D4A574] text-sm underline"
              >
                {t("auto.pages_SupportPublic.submit_another_request_2jv7oz")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E0D8C8]/80 mb-1.5">{t("auto.pages_SupportPublic.topic_3xmokk")}</label>
                <select
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-[rgba(28,21,16,0.8)] border border-[rgba(140,105,65,0.3)] text-[#F5F1E7] text-sm focus:outline-none focus:ring-2 focus:ring-[#A35C5C]"
                >
                  <option>{t("auto.pages_SupportPublic.billing_1o86sh")}</option>
                  <option>{t("auto.pages_SupportPublic.account_yt74s2")}</option>
                  <option>{t("auto.pages_SupportPublic.bug_376d5v")}</option>
                  <option>{t("auto.pages_SupportPublic.data_sync_ctma2k")}</option>
                  <option>{t("auto.pages_SupportPublic.general_help_16oirf")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8]/80 mb-1.5">{t("auto.pages_SupportPublic.name_yjyskm")} <span className="text-red-400">*</span></label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("auto.pages_SupportPublic.your_name_7ysc45")}
                  className="w-full h-10 px-3 rounded-xl bg-[rgba(28,21,16,0.8)] border border-[rgba(140,105,65,0.3)] text-[#F5F1E7] text-sm placeholder:text-[#D8C7A6]/40 focus:outline-none focus:ring-2 focus:ring-[#A35C5C]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8]/80 mb-1.5">{t("auto.pages_SupportPublic.email_3mzikt")} <span className="text-red-400">*</span></label>
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
                <label className="block text-sm font-medium text-[#E0D8C8]/80 mb-1.5">{t("auto.pages_SupportPublic.message_8llioa")} <span className="text-red-400">*</span></label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t("auto.pages_SupportPublic.describe_your_issue_or_question_bpleu9")}
                  className="w-full px-3 py-2.5 rounded-xl bg-[rgba(28,21,16,0.8)] border border-[rgba(140,105,65,0.3)] text-[#F5F1E7] text-sm placeholder:text-[#D8C7A6]/40 focus:outline-none focus:ring-2 focus:ring-[#A35C5C] resize-none"
                />
              </div>

              {status === "error" && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {t("auto.pages_SupportPublic.submission_failed_please_email_us_directly_13pp4b")}
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
          <h2 className="text-xl font-semibold text-[#F5F1E7] mb-4">{t("auto.pages_SupportPublic.frequently_asked_questions_1synnn")}</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        <p className="text-center text-[#E0D8C8]/30 text-xs pb-4">
          © {new Date().getFullYear()} {t("auto.pages_SupportPublic.collectionkeeper_1cgq7i")} <a href="mailto:admin@pipekeeperapp.com" className="underline">admin@pipekeeperapp.com</a>
        </p>
      </div>
    </div>
  );
}
