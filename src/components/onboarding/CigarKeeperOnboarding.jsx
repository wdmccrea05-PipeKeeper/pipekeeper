/**
 * CigarKeeperOnboarding
 *
 * A purpose-built 5-step onboarding experience for CigarKeeper users.
 * No pipe/whiskey references. Cigar collector tone throughout.
 * Works for both free and pro tier users.
 *
 * Steps:
 *   1. Welcome — what CigarKeeper is
 *   2. Start Your Collection — optional quick add
 *   3. Preferences — body, strength, flavors, experience (all skippable)
 *   4. Feature Preview — demonstrate humidor management, sessions, insights
 *   5. Enter App
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Check, X,
  Cigarette, BarChart3, Sparkles, Droplets, BookOpen,
} from 'lucide-react';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { base44 } from '@/api/base44Client';
import { markCigarOnboardingComplete } from './onboardingState';
import { useTranslation } from '@/components/i18n/safeTranslation';

// ── Design tokens ─────────────────────────────────────────────────────────────

const BG          = '#140f0c';
const CARD_BG     = 'rgba(255,255,255,0.035)';
const CARD_BORDER = '1px solid rgba(180,140,75,0.18)';
const GOLD        = '#D4A574';
const GOLD_MUTED  = 'rgba(212,165,116,0.7)';
const TEXT_MAIN   = '#F5F1E7';
const TEXT_DIM    = 'rgba(224,216,200,0.6)';
const TEXT_DIMMER = 'rgba(224,216,200,0.38)';
const ACCENT_BG   = 'rgba(180,140,75,0.1)';
const ACCENT_BDR  = '1px solid rgba(180,140,75,0.28)';

// ── Preference options ────────────────────────────────────────────────────────

const BODY_LEVELS = [
  { key: 'mild',        label: 'Mild',         note: 'Light, easy-smoking, approachable' },
  { key: 'medium',      label: 'Medium',        note: 'Balanced complexity and strength' },
  { key: 'full',        label: 'Full',          note: 'Bold, rich, for experienced smokers' },
];

const FLAVOR_NOTES = [
  { key: 'cedar',     label: 'Cedar / Wood' },
  { key: 'leather',   label: 'Leather' },
  { key: 'coffee',    label: 'Coffee / Espresso' },
  { key: 'cocoa',     label: 'Cocoa / Dark Chocolate' },
  { key: 'spice',     label: 'Spice / Pepper' },
  { key: 'cream',     label: 'Cream / Sweetness' },
  { key: 'earth',     label: 'Earth / Nuts' },
];

const EXPERIENCE_LEVELS = [
  { key: 'casual',     label: 'Casual',     note: 'I enjoy a cigar occasionally.' },
  { key: 'enthusiast', label: 'Enthusiast', note: 'I smoke regularly and know what I like.' },
  { key: 'collector',  label: 'Collector',  note: 'I manage a deliberate humidor with variety.' },
];

// ── Shared sub-components ─────────────────────────────────────────────────────

function ToggleChip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm font-medium transition-all"
      style={{
        background: selected ? 'rgba(180,140,75,0.22)' : 'rgba(255,255,255,0.04)',
        border: selected ? '1px solid rgba(180,140,75,0.55)' : '1px solid rgba(180,140,75,0.14)',
        color: selected ? GOLD : TEXT_DIM,
        outline: 'none',
      }}
    >
      {children}
    </button>
  );
}

function ExperienceCard({ level, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full rounded-xl p-4 transition-all"
      style={{
        background: selected ? 'rgba(180,140,75,0.13)' : CARD_BG,
        border: selected ? '1px solid rgba(180,140,75,0.45)' : CARD_BORDER,
      }}
    >
      <p className="text-sm font-bold mb-0.5" style={{ color: selected ? GOLD : TEXT_MAIN }}>{level.label}</p>
      <p className="text-xs" style={{ color: TEXT_DIMMER }}>{level.note}</p>
    </button>
  );
}

function FeaturePreviewCard({ icon: Icon, title, description, accent = GOLD }) {
  return (
    <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: CARD_BG, border: CARD_BORDER }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: ACCENT_BG }}>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold mb-0.5" style={{ color: TEXT_MAIN }}>{title}</p>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{description}</p>
      </div>
    </div>
  );
}

// ── Step components ───────────────────────────────────────────────────────────

function StepWelcome() {
  const { t } = useTranslation();
  return (
    <div className="text-center space-y-6">
      <div
        className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center"
        style={{ background: ACCENT_BG, border: ACCENT_BDR }}
      >
        <Cigarette className="w-10 h-10" style={{ color: GOLD }} />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: TEXT_MAIN }}>
          {t("auto.components_onboarding_CigarKeeperOnboarding.welcome_to_cigarkeeper_5ukr5i")}
        </h1>
        <p className="text-lg" style={{ color: TEXT_DIM }}>
          {t("auto.components_onboarding_CigarKeeperOnboarding.track_manage_and_enjoy_your_cigar_19l7nb")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-left mt-4">
        <div className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
          <Cigarette className="w-5 h-5 mb-2" style={{ color: GOLD }} />
          <p className="text-sm font-semibold mb-1" style={{ color: TEXT_MAIN }}>{t("auto.components_onboarding_CigarKeeperOnboarding.your_collection_wi20u8")}</p>
          <p className="text-xs" style={{ color: TEXT_DIM }}>{t("auto.components_onboarding_CigarKeeperOnboarding.track_every_cigar_across_brands_vitolas_1sohjr")}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
          <Droplets className="w-5 h-5 mb-2" style={{ color: GOLD }} />
          <p className="text-sm font-semibold mb-1" style={{ color: TEXT_MAIN }}>{t("auto.components_onboarding_CigarKeeperOnboarding.humidor_management_19zb2b")}</p>
          <p className="text-xs" style={{ color: TEXT_DIM }}>{t("auto.components_onboarding_CigarKeeperOnboarding.monitor_humidity_maintenance_alerts_and_storage_182r1e")}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
          <BookOpen className="w-5 h-5 mb-2" style={{ color: GOLD }} />
          <p className="text-sm font-semibold mb-1" style={{ color: TEXT_MAIN }}>{t("auto.components_onboarding_CigarKeeperOnboarding.smoking_sessions_1dziy9")}</p>
          <p className="text-xs" style={{ color: TEXT_DIM }}>{t("auto.components_onboarding_CigarKeeperOnboarding.log_sessions_ratings_pairings_and_tasting_o37jnx")}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
          <BarChart3 className="w-5 h-5 mb-2" style={{ color: GOLD }} />
          <p className="text-sm font-semibold mb-1" style={{ color: TEXT_MAIN }}>{t("auto.components_onboarding_CigarKeeperOnboarding.insights_izlta")}</p>
          <p className="text-xs" style={{ color: TEXT_DIM }}>{t("auto.components_onboarding_CigarKeeperOnboarding.understand_your_collection_preferences_and_habit_1ovk83")}</p>
        </div>
      </div>
    </div>
  );
}

function StepStartCollection({ onAddFirst, onSkip }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold" style={{ color: TEXT_MAIN }}>{t("auto.components_onboarding_CigarKeeperOnboarding.start_your_humidor_3lurju")}</h2>
        <p style={{ color: TEXT_DIM }}>{t("auto.components_onboarding_CigarKeeperOnboarding.how_would_you_like_to_begin_17kjq1")}</p>
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onAddFirst}
          className="w-full rounded-xl p-4 text-left flex items-center justify-between transition-all"
          style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.35)', color: TEXT_MAIN }}
        >
          <div>
            <p className="text-sm font-bold">{t("auto.components_onboarding_CigarKeeperOnboarding.add_your_first_cigar_2eg7pn")}</p>
            <p className="text-xs mt-0.5" style={{ color: TEXT_DIM }}>{t("auto.components_onboarding_CigarKeeperOnboarding.start_with_one_cigar_add_more_di8kce")}</p>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0 ml-2" style={{ color: GOLD_MUTED }} />
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full rounded-xl p-4 text-left flex items-center justify-between transition-all"
          style={{ background: CARD_BG, border: CARD_BORDER }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: TEXT_MAIN }}>{t("auto.components_onboarding_CigarKeeperOnboarding.explore_the_app_first_9oy80e")}</p>
            <p className="text-xs mt-0.5" style={{ color: TEXT_DIM }}>{t("auto.components_onboarding_CigarKeeperOnboarding.browse_around_add_cigars_when_you_slhzk")}</p>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0 ml-2" style={{ color: TEXT_DIMMER }} />
        </button>
      </div>
    </div>
  );
}

function StepPreferences({ prefs, onChange }) {
  const { t } = useTranslation();
  const toggle = (key, value) => {
    const current = prefs[key] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...prefs, [key]: next });
  };

  const setExperience = (value) => onChange({ ...prefs, experience_level: value });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold" style={{ color: TEXT_MAIN }}>{t("auto.components_onboarding_CigarKeeperOnboarding.your_preferences_ner7s6")}</h2>
        <p className="text-sm" style={{ color: TEXT_DIM }}>{t("auto.components_onboarding_CigarKeeperOnboarding.helps_personalize_recommendations_all_optional_s_15xcq9")}</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: TEXT_DIMMER }}>{t("auto.components_onboarding_CigarKeeperOnboarding.body_preference_brqqdu")}</p>
        <div className="space-y-2 pt-1">
          {BODY_LEVELS.map((b) => (
            <ExperienceCard
              key={b.key}
              level={b}
              selected={(prefs.preferred_body || []).includes(b.key)}
              onClick={() => toggle('preferred_body', b.key)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: TEXT_DIMMER }}>{t("auto.components_onboarding_CigarKeeperOnboarding.flavor_notes_you_enjoy_vn197e")}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {FLAVOR_NOTES.map((f) => (
            <ToggleChip
              key={f.key}
              selected={(prefs.flavor_notes || []).includes(f.key)}
              onClick={() => toggle('flavor_notes', f.key)}
            >
              {f.label}
            </ToggleChip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: TEXT_DIMMER }}>{t("auto.components_onboarding_CigarKeeperOnboarding.experience_level_1yxppf")}</p>
        <div className="space-y-2">
          {EXPERIENCE_LEVELS.map((lvl) => (
            <ExperienceCard
              key={lvl.key}
              level={lvl}
              selected={prefs.experience_level === lvl.key}
              onClick={() => setExperience(lvl.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepFeaturePreview() {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold" style={{ color: TEXT_MAIN }}>{t("auto.components_onboarding_CigarKeeperOnboarding.what_you_ll_have_14lmec")}</h2>
        <p style={{ color: TEXT_DIM }}>{t("auto.components_onboarding_CigarKeeperOnboarding.your_humidor_gets_smarter_with_every_17rw7a")}</p>
      </div>

      <FeaturePreviewCard
        icon={Cigarette}
        title={t("auto.components_onboarding_CigarKeeperOnboarding.full_collection_tracking_pe3913")}
        description="Vitola, wrapper, binder, filler, strength, aging date — everything in one place. Free tier includes up to 10 cigars."
      />
      <FeaturePreviewCard
        icon={Droplets}
        title={t("auto.components_onboarding_CigarKeeperOnboarding.humidor_maintenance_1ykrtw")}
        description="Get alerts when humidity checks or aid replacements are due. Never lose a cigar to neglect again."
      />
      <FeaturePreviewCard
        icon={BookOpen}
        title={t("auto.components_onboarding_CigarKeeperOnboarding.session_logs_iy4p9a")}
        description="Record every smoke with tasting notes, burn quality, draw, pairings, and enjoyment ratings."
        accent="#93C5FD"
      />
      <FeaturePreviewCard
        icon={Sparkles}
        title={t("auto.components_onboarding_CigarKeeperOnboarding.curator_and_insights_pro_augtna")}
        description="Upgrade to Pro for AI-powered recommendations, collection insights, and growth suggestions."
        accent="#a78bfa"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CigarKeeperOnboarding({ onComplete, onSkip }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState({
    preferred_body: [],
    flavor_notes: [],
    experience_level: null,
  });
  const [saving, setSaving] = useState(false);
  const { user } = useCurrentUser();

  const STEPS = [
    { key: 'welcome',     skipLabel: null },
    { key: 'collection',  skipLabel: 'Skip' },
    { key: 'preferences', skipLabel: 'Skip' },
    { key: 'preview',     skipLabel: null },
  ];

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  async function savePrefsToProfile() {
    if (!user?.email) return;
    const hasAnyPref =
      prefs.preferred_body.length ||
      prefs.flavor_notes.length ||
      prefs.experience_level;
    if (!hasAnyPref) return;

    try {
      setSaving(true);
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      const profile  = profiles?.[0];
      const payload  = {
        cigar_preferred_body: prefs.preferred_body,
        cigar_flavor_notes: prefs.flavor_notes,
        cigar_experience_level: prefs.experience_level || null,
      };
      if (profile?.id) {
        await base44.entities.UserProfile.update(profile.id, payload);
      } else {
        await base44.entities.UserProfile.create({ user_email: user.email, ...payload });
      }
    } catch (e) {
      console.warn('[CigarOnboarding] Could not save preferences:', e);
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish() {
    await savePrefsToProfile();
    markCigarOnboardingComplete();
    onComplete?.();
  }

  function handleCollectionAdd() {
    savePrefsToProfile().catch(() => {});
    markCigarOnboardingComplete();
    onComplete?.();
    try {
      window.history.pushState({}, '', '/CigarForm');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {}
  }

  function handleCollectionSkip() {
    setStep(2);
  }

  function handleNext() {
    if (isLast) {
      handleFinish();
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-lg py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: BG, border: '1px solid rgba(180,140,75,0.2)' }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all"
                    style={{
                      width: i === step ? 24 : 8,
                      height: 8,
                      background: i <= step ? GOLD : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => onSkip?.()}
                className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-full transition-all"
                style={{ color: TEXT_DIMMER, background: 'rgba(255,255,255,0.04)' }}
              >
                {t("auto.components_onboarding_CigarKeeperOnboarding.skip_all_hcupmd")} <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: TEXT_DIMMER }}>
              {step + 1} / {STEPS.length}
            </p>
          </div>

          {/* Step content */}
          <div className="px-6 py-6 max-h-[65vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                {current.key === 'welcome'     && <StepWelcome />}
                {current.key === 'collection'  && (
                  <StepStartCollection onAddFirst={handleCollectionAdd} onSkip={handleCollectionSkip} />
                )}
                {current.key === 'preferences' && (
                  <StepPreferences prefs={prefs} onChange={setPrefs} />
                )}
                {current.key === 'preview'     && <StepFeaturePreview />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer — hidden on collection step (has inline nav) */}
          {current.key !== 'collection' && (
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-all disabled:opacity-30"
                style={{ color: TEXT_DIM, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                {t("auto.components_onboarding_CigarKeeperOnboarding.back_yjpjkm")}
              </button>

              {current.skipLabel && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="text-xs"
                  style={{ color: TEXT_DIMMER }}
                >
                  {current.skipLabel}
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm font-bold px-5 py-2 rounded-lg transition-all disabled:opacity-60"
                style={{ background: 'rgba(180,140,75,0.25)', color: GOLD, border: '1px solid rgba(180,140,75,0.45)' }}
              >
                {isLast ? (
                  <>
                    {t("auto.components_onboarding_CigarKeeperOnboarding.enter_cigarkeeper_41t5s5")}
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    {t("auto.components_onboarding_CigarKeeperOnboarding.continue_1fqfxw")}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}