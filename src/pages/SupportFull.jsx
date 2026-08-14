import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { trackedSendEmail } from '@/lib/integrationTelemetry';
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
import { useTranslation } from "@/components/i18n/safeTranslation";

const SUPPORT_EMAIL = "admin@pipekeeperapp.com";

const SUPPORT_TOPIC_KEYS = [
  'support.topicGeneral',
  'support.topicAccount',
  'support.topicBilling',
  'support.topicBug',
  'support.topicFeature',
  'support.topicData',
  'support.topicOther',
];

const SUPPORT_TOPIC_VALUES = [
  "General Question",
  "Account & Login",
  "Subscription & Billing",
  "Bug Report",
  "Feature Request",
  "Data / Sync Issue",
  "Other",
];

const FAQ_KEYS = [
  { qKey: 'support.faq1q', aKey: 'support.faq1a' },
  { qKey: 'support.faq2q', aKey: 'support.faq2a' },
  { qKey: 'support.faq3q', aKey: 'support.faq3a' },
  { qKey: 'support.faq4q', aKey: 'support.faq4a' },
  { qKey: 'support.faq5q', aKey: 'support.faq5a' },
  { qKey: 'support.faq6q', aKey: 'support.faq6a' },
  { qKey: 'support.faq7q', aKey: 'support.faq7a' },
  { qKey: 'support.faq8q', aKey: 'support.faq8a' },
];

const TOPIC_CARD_KEYS = [
  { icon: CreditCard, labelKey: 'support.cardBillingLabel', descKey: 'support.cardBillingDesc', color: "#d4a574" },
  { icon: User,       labelKey: 'support.cardAccountLabel', descKey: 'support.cardAccountDesc', color: "#6fcf97" },
  { icon: RefreshCw,  labelKey: 'support.cardDataLabel',    descKey: 'support.cardDataDesc',    color: "#56b4e0" },
  { icon: Bug,        labelKey: 'support.cardBugLabel',     descKey: 'support.cardBugDesc',     color: "#a35c5c" },
  { icon: Smartphone, labelKey: 'support.cardPerfLabel',    descKey: 'support.cardPerfDesc',    color: "#b48c4b" },
  { icon: HelpCircle, labelKey: 'support.cardHelpLabel',    descKey: 'support.cardHelpDesc',    color: "#9b8ecf" },
];

const INCLUDE_KEYS = [
  'support.include1', 'support.include2', 'support.include3', 'support.include4',
  'support.include5', 'support.include6', 'support.include7',
];

const TROUBLE_KEYS = [
  { titleKey: 'support.troubleBlank',      descKey: 'support.troubleBlankDesc' },
  { titleKey: 'support.troublePremium',    descKey: 'support.troublePremiumDesc' },
  { titleKey: 'support.troubleSignIn',     descKey: 'support.troubleSignInDesc' },
  { titleKey: 'support.troubleData',       descKey: 'support.troubleDataDesc' },
  { titleKey: 'support.troubleAI',         descKey: 'support.troubleAIDesc' },
  { titleKey: 'support.troubleConfidence', descKey: 'support.troubleConfidenceDesc' },
  { titleKey: 'support.troubleWhiskey',    descKey: 'support.troubleWhiskeyDesc' },
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
  const { t } = useTranslation();
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

      await trackedSendEmail({
        to: SUPPORT_EMAIL,
        subject: `[Support] ${formData.topic} — from ${formData.name}`,
        body: emailBody,
        from_name: "CollectionKeeper Support Form",
      }, { feature: 'support.email', module: 'shared' });

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
            {t('support.pageTitle')}
          </h1>
          <p className="text-base text-[#E0D8C8]/75 max-w-2xl mx-auto leading-relaxed">
            {t('support.pageSubtitle')}
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
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#D4A574" }}>{t('support.howCanWeHelp')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TOPIC_CARD_KEYS.map(({ icon: CardIcon, labelKey, descKey, color }) => (
              <div
                key={labelKey}
                className="rounded-xl p-4 space-y-1"
                style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(180,140,75,0.15)" }}
              >
                <CardIcon className="w-5 h-5 mb-2" style={{ color }} />
                <div className="text-sm font-semibold text-[#F5F1E7]">{t(labelKey)}</div>
                <div className="text-xs text-[#E0D8C8]/65 leading-snug">{t(descKey)}</div>
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
              <h2 className="text-xl font-semibold text-[#F5F1E7]">{t('support.contactSupport')}</h2>
            </div>
            <p className="text-sm text-[#E0D8C8]/65 mt-1">
              {t('support.contactSupportDesc')}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline text-[#D4A574]">{SUPPORT_EMAIL}</a>.
            </p>
          </div>

          <div className="px-6 py-6">
            {submitted ? (
              <div className="flex flex-col items-center text-center py-10 gap-4">
                <CheckCircle className="w-14 h-14 text-green-400" />
                <h3 className="text-xl font-semibold text-[#F5F1E7]">{t('support.messageSent')}</h3>
                <p className="text-sm text-[#E0D8C8]/70 max-w-sm">
                  {t('support.messageSentDesc')} <strong>{formData.email || t('support.yourEmail')}</strong> {t('support.messageSentDesc2')}
                </p>
                <Button variant="outline" onClick={() => setSubmitted(false)} className="mt-2">
                  {t('support.sendAnother')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label className="text-[#E0D8C8] text-sm font-medium">{t('support.topicLabel')}</Label>
                  <Select
                    value={formData.topic}
                    onValueChange={(v) => setFormData(p => ({ ...p, topic: v }))}
                    required
                  >
                    <SelectTrigger className="mt-1.5" style={{ background: "rgba(20,15,12,0.6)", border: "1px solid rgba(180,140,75,0.28)", color: "#F5F1E7" }}>
                      <SelectValue placeholder={t('support.topicPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_TOPIC_KEYS.map((key, idx) => (
                        <SelectItem key={key} value={SUPPORT_TOPIC_VALUES[idx]}>{t(key)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#E0D8C8] text-sm font-medium">{t('support.yourName')}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder={t('support.namePlaceholder')}
                      required
                      className="mt-1.5"
                      style={{ background: "rgba(20,15,12,0.6)", border: "1px solid rgba(180,140,75,0.28)", color: "#F5F1E7" }}
                    />
                  </div>
                  <div>
                    <Label className="text-[#E0D8C8] text-sm font-medium">{t('support.yourEmail')}</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                      placeholder={t('support.emailPlaceholder')}
                      required
                      className="mt-1.5"
                      style={{ background: "rgba(20,15,12,0.6)", border: "1px solid rgba(180,140,75,0.28)", color: "#F5F1E7" }}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#E0D8C8] text-sm font-medium">{t('support.messageLabel')}</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
                    placeholder={t('support.messagePlaceholder')}
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
                  {isSubmitting ? t('support.sending') : t('support.sendMessage')}
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
            <h2 className="text-lg font-semibold text-[#F5F1E7]">{t('support.whatToInclude')}</h2>
          </div>
          <p className="text-sm text-[#E0D8C8]/70">{t('support.whatToIncludeDesc')}</p>
          <ul className="space-y-2 text-sm text-[#E0D8C8]/80">
            {INCLUDE_KEYS.map((key, i) => (
              <li key={key} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center" style={{ background: "rgba(180,140,75,0.2)", color: "#D4A574" }}>{i + 1}</span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#D4A574" }}>{t('support.commonQuestions')}</h2>
          <div className="space-y-2">
            {FAQ_KEYS.map(({ qKey, aKey }) => (
              <FAQItem key={qKey} q={t(qKey)} a={t(aKey)} />
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
            <h2 className="text-lg font-semibold text-[#F5F1E7]">{t('support.troubleshooting')}</h2>
          </div>
          <div className="space-y-3 text-sm text-[#E0D8C8]/80">
            {TROUBLE_KEYS.map(({ titleKey, descKey }) => (
              <p key={titleKey}>
                <strong className="text-[#F5F1E7]">{t(titleKey)}</strong> {t(descKey)}
              </p>
            ))}
          </div>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm pt-4 pb-6" style={{ color: "rgba(224,216,200,0.5)", borderTop: "1px solid rgba(180,140,75,0.12)" }}>
          <a href="/PrivacyPolicy" className="hover:text-[#D4A574] transition-colors flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> {t('support.privacyPolicy')}
          </a>
          <a href="/TermsOfService" className="hover:text-[#D4A574] transition-colors">{t('support.termsOfService')}</a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-[#D4A574] transition-colors flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" /> {SUPPORT_EMAIL}
          </a>
        </div>

      </div>
    </div>
  );
}