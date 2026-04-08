/**
 * WhiskeyKeeperOnboarding
 *
 * A purpose-built 6-step onboarding experience for WhiskeyKeeper-only users.
 * Zero pipe/tobacco references. Premium collector tone throughout.
 *
 * Steps:
 *   1. Welcome
 *   2. Start Your Collection (optional quick add)
 *   3. Preferences (whiskey styles, flavor, experience — all skippable)
 *   4. Value Preview (demonstrate what the app does)
 *   5. Curator Introduction
 *   6. Enter App
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Check, X,
  GlassWater, BarChart3, Sparkles, ShieldCheck, Glasses,
} from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { base44 } from '@/api/base44Client';
import { markWhiskeyOnboardingComplete } from './onboardingState';

// ── Design tokens consistent with the app's dark identity ────────────────────

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

const WHISKEY_STYLES = [
  { key: 'Bourbon',            label: 'Bourbon',        note: 'Sweet, vanilla, oak' },
  { key: 'Single Malt Scotch', label: 'Scotch',         note: 'Malt, smoke, complexity' },
  { key: 'Rye',                label: 'Rye',            note: 'Spicy, dry, peppery' },
  { key: 'Irish Whiskey',      label: 'Irish',          note: 'Light, clean, smooth' },
  { key: 'Japanese Whisky',    label: 'Japanese',       note: 'Delicate, balanced' },
  { key: 'Blended Scotch',     label: 'Blended Scotch', note: 'Approachable, versatile' },
];

const FLAVOR_PREFS = [
  { key: 'sweet',  label: 'Sweet / Vanilla / Caramel' },
  { key: 'smoky',  label: 'Smoky / Peaty' },
  { key: 'spicy',  label: 'Spicy / Rye-forward' },
  { key: 'fruity', label: 'Fruity / Sherried' },
  { key: 'balanced', label: 'Balanced / Versatile' },
];

const EXPERIENCE_LEVELS = [
  { key: 'casual',      label: 'Casual',      note: 'I enjoy a good pour and want to explore more.' },
  { key: 'enthusiast',  label: 'Enthusiast',  note: 'I know what I like and track what I drink.' },
  { key: 'collector',   label: 'Collector',   note: 'I manage a deliberate collection with strategy.' },
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
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: CARD_BG, border: CARD_BORDER }}
    >
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

// ── Step definitions ──────────────────────────────────────────────────────────

function StepWelcome() {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center" style={{ background: ACCENT_BG, border: ACCENT_BDR }}>
        <GlassWater className="w-10 h-10" style={{ color: GOLD }} />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: TEXT_MAIN }}>
          Welcome to WhiskeyKeeper
        </h1>
        <p className="text-lg" style={{ color: TEXT_DIM }}>
          Track, understand, and grow your whiskey collection
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-left mt-4">
        <div className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
          <BarChart3 className="w-5 h-5 mb-2" style={{ color: GOLD }} />
          <p className="text-sm font-semibold mb-1" style={{ color: TEXT_MAIN }}>Collection Value</p>
          <p className="text-xs" style={{ color: TEXT_DIM }}>Track what you own and what it's worth</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
          <ShieldCheck className="w-5 h-5 mb-2" style={{ color: GOLD }} />
          <p className="text-sm font-semibold mb-1" style={{ color: TEXT_MAIN }}>Open vs. Hold</p>
          <p className="text-xs" style={{ color: TEXT_DIM }}>Know which bottles to open and which to protect</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
          <Glasses className="w-5 h-5 mb-2" style={{ color: GOLD }} />
          <p className="text-sm font-semibold mb-1" style={{ color: TEXT_MAIN }}>Pairings</p>
          <p className="text-xs" style={{ color: TEXT_DIM }}>Expert session combinations based on flavor logic</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
          <Sparkles className="w-5 h-5 mb-2" style={{ color: GOLD }} />
          <p className="text-sm font-semibold mb-1" style={{ color: TEXT_MAIN }}>Growth</p>
          <p className="text-xs" style={{ color: TEXT_DIM }}>Specific bottles that fit your taste and fill real gaps</p>
        </div>
      </div>
    </div>
  );
}

function StepStartCollection({ onAddFirst, onSkip }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold" style={{ color: TEXT_MAIN }}>Start Your Collection</h2>
        <p style={{ color: TEXT_DIM }}>How would you like to begin?</p>
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onAddFirst}
          className="w-full rounded-xl p-4 text-left flex items-center justify-between transition-all"
          style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.35)', color: TEXT_MAIN }}
        >
          <div>
            <p className="text-sm font-bold">Add your first bottle</p>
            <p className="text-xs mt-0.5" style={{ color: TEXT_DIM }}>Start with one bottle — add more anytime</p>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0 ml-2" style={{ color: GOLD_MUTED }} />
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full rounded-xl p-4 text-left flex items-center justify-between transition-all"
          style={{ background: CARD_BG, border: CARD_BORDER, color: TEXT_DIM }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: TEXT_MAIN }}>Skip for now</p>
            <p className="text-xs mt-0.5">Browse the app first, add bottles when ready</p>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0 ml-2" style={{ color: TEXT_DIMMER }} />
        </button>
      </div>
    </div>
  );
}

function StepPreferences({ prefs, onChange }) {
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
        <h2 className="text-2xl font-bold" style={{ color: TEXT_MAIN }}>Your Preferences</h2>
        <p className="text-sm" style={{ color: TEXT_DIM }}>Helps the Curator personalize recommendations. All optional.</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: TEXT_DIMMER }}>Whiskey Styles</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {WHISKEY_STYLES.map((s) => (
            <ToggleChip
              key={s.key}
              selected={(prefs.preferred_whiskey_types || []).includes(s.key)}
              onClick={() => toggle('preferred_whiskey_types', s.key)}
            >
              {s.label}
            </ToggleChip>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: TEXT_DIMMER }}>Flavor Preferences</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {FLAVOR_PREFS.map((f) => (
            <ToggleChip
              key={f.key}
              selected={(prefs.flavor_preferences || []).includes(f.key)}
              onClick={() => toggle('flavor_preferences', f.key)}
            >
              {f.label}
            </ToggleChip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: TEXT_DIMMER }}>Experience Level</p>
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

function StepValuePreview() {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold" style={{ color: TEXT_MAIN }}>What You'll Have</h2>
        <p style={{ color: TEXT_DIM }}>Your collection gets more useful with every bottle you add.</p>
      </div>

      <FeaturePreviewCard
        icon={BarChart3}
        title="Collection Intelligence"
        description="See your collection's total value, replacement risk, and strategy status at a glance — no manual tracking."
      />
      <FeaturePreviewCard
        icon={ShieldCheck}
        title="Safe to Open / Hold"
        description="For every bottle, the app tells you whether it's safe to open or worth holding — and exactly why."
      />
      <FeaturePreviewCard
        icon={Glasses}
        title="Expert Pairings"
        description="Complement and contrast pairings built from flavor logic, not guesswork. Every pairing explains itself."
        accent="#93C5FD"
      />
      <FeaturePreviewCard
        icon={Sparkles}
        title="Grow & Expand"
        description="Specific bottle recommendations that fill real gaps in your collection and match your proven preferences."
        accent="#a78bfa"
      />
    </div>
  );
}

function StepCuratorIntro() {
  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center" style={{ background: ACCENT_BG, border: ACCENT_BDR }}>
        <Sparkles className="w-10 h-10" style={{ color: GOLD }} />
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-bold" style={{ color: TEXT_MAIN }}>Meet the Curator</h2>
        <p className="text-base leading-relaxed max-w-md mx-auto" style={{ color: TEXT_DIM }}>
          Your collection gets smarter as you use it.
          The Curator helps you decide what to open, what to keep, and what to explore next.
        </p>
        <p className="text-sm leading-relaxed max-w-md mx-auto" style={{ color: TEXT_DIMMER }}>
          It reasons like a seasoned collector — not a generic assistant.
          The more you use the app, the more precise it gets.
        </p>
      </div>
      <div className="rounded-xl p-4 text-left" style={{ background: CARD_BG, border: CARD_BORDER }}>
        <p className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: TEXT_DIMMER }}>Example insight</p>
        <p className="text-sm leading-relaxed" style={{ color: TEXT_MAIN }}>
          "This bottle remains widely available and price-stable. Opening it carries little collector downside — it makes more sense to enjoy it than to hold it."
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WhiskeyKeeperOnboarding({ onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState({
    preferred_whiskey_types: [],
    flavor_preferences: [],
    experience_level: null,
  });
  const [saving, setSaving] = useState(false);
  const { user } = useCurrentUser();

  const STEPS = [
    { key: 'welcome',     label: 'Welcome',     skipLabel: null },
    { key: 'collection',  label: 'Collection',  skipLabel: 'Skip' },
    { key: 'preferences', label: 'Preferences', skipLabel: 'Skip' },
    { key: 'preview',     label: 'Value',       skipLabel: null },
    { key: 'curator',     label: 'Curator',     skipLabel: null },
  ];

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  async function savePrefsToProfile() {
    if (!user?.email) return;
    if (!prefs.preferred_whiskey_types.length && !prefs.flavor_preferences.length && !prefs.experience_level) {
      // Nothing to save — user skipped all preference fields
      return;
    }

    try {
      setSaving(true);
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      const profile  = profiles?.[0];

      const payload = {
        preferred_whiskey_types: prefs.preferred_whiskey_types,
        whiskey_experience_level: prefs.experience_level || null,
        whiskey_flavor_preferences: prefs.flavor_preferences,
      };

      if (profile?.id) {
        await base44.entities.UserProfile.update(profile.id, payload);
      } else {
        await base44.entities.UserProfile.create({ user_email: user.email, ...payload });
      }
    } catch (e) {
      console.warn('[WhiskeyOnboarding] Could not save preferences:', e);
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish() {
    await savePrefsToProfile();
    markWhiskeyOnboardingComplete();
    onComplete?.();
  }

  function handleCollectionAdd() {
    // Save prefs and navigate to add a bottle, then mark complete
    savePrefsToProfile().catch(() => {});
    markWhiskeyOnboardingComplete();
    onComplete?.();
    // Navigation to BottleFormPage is handled by the parent after onComplete
    try {
      window.history.pushState({}, '', createPageUrl('BottleFormPage'));
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {}
  }

  function handleCollectionSkip() {
    setStep(2); // jump to preferences
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

  function handleSkip() {
    onSkip?.();
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
          {/* Header with progress + skip */}
          <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              {/* Progress dots */}
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
                onClick={handleSkip}
                className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-full transition-all"
                style={{ color: TEXT_DIMMER, background: 'rgba(255,255,255,0.04)' }}
              >
                Skip all <X className="w-3 h-3" />
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
                {current.key === 'welcome'    && <StepWelcome />}
                {current.key === 'collection' && (
                  <StepStartCollection
                    onAddFirst={handleCollectionAdd}
                    onSkip={handleCollectionSkip}
                  />
                )}
                {current.key === 'preferences' && (
                  <StepPreferences prefs={prefs} onChange={setPrefs} />
                )}
                {current.key === 'preview'    && <StepValuePreview />}
                {current.key === 'curator'    && <StepCuratorIntro />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation footer — skip the collection step (it has its own inline nav) */}
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
                Back
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
                    Enter WhiskeyKeeper
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continue
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
