/**
 * OnboardingRouter
 *
 * Renders the correct onboarding overlay based on which modules the user
 * has enabled and which per-module flows they've already completed.
 *
 * Rules:
 *   - Pipe-only users  → PipeKeeper onboarding (OnboardingFlow)
 *   - Whiskey-only     → WhiskeyKeeper onboarding (WhiskeyKeeperOnboarding)
 *   - Both modules     → ask which to start with (or show combined)
 *   - Already complete → render nothing
 *
 * Per-module completion is tracked independently so completing one flow
 * does not suppress the other.
 */

import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';

// Session-based gate to prevent refresh from relaunching onboarding
function shouldAutoLaunchOnboarding() {
  try {
    return sessionStorage.getItem('pk_auto_launch_onboarding') === 'true';
  } catch {
    return false;
  }
}

function clearAutoLaunchOnboarding() {
  try {
    sessionStorage.removeItem('pk_auto_launch_onboarding');
  } catch {}
}
import {
  isPipeOnboardingComplete,
  isWhiskeyOnboardingComplete,
  markPipeOnboardingComplete,
  markWhiskeyOnboardingComplete,
} from './onboardingState';
import OnboardingFlow from './OnboardingFlow';
import WhiskeyKeeperOnboarding from './WhiskeyKeeperOnboarding';

// ── Multi-module starter — let user pick which onboarding to run first ────────

function MultiModuleStarter({ onSelectPipe, onSelectWhiskey, onSkip }) {
  const BG          = '#140f0c';
  const CARD_BG     = 'rgba(255,255,255,0.035)';
  const CARD_BORDER = '1px solid rgba(180,140,75,0.18)';
  const GOLD        = '#D4A574';
  const TEXT_MAIN   = '#F5F1E7';
  const TEXT_DIM    = 'rgba(224,216,200,0.6)';
  const TEXT_DIMMER = 'rgba(224,216,200,0.38)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: BG, border: '1px solid rgba(180,140,75,0.2)' }}
      >
        <div className="px-6 py-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: TEXT_DIMMER }}>Welcome</p>
            <h2 className="text-2xl font-bold" style={{ color: TEXT_MAIN }}>What are you starting with?</h2>
            <p className="text-sm mt-1.5" style={{ color: TEXT_DIM }}>
              Pick one — you can set up the other anytime.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={onSelectPipe}
              className="w-full rounded-xl p-4 text-left flex items-center justify-between transition-all"
              style={{ background: CARD_BG, border: CARD_BORDER }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: TEXT_MAIN }}>PipeKeeper</p>
                <p className="text-xs mt-0.5" style={{ color: TEXT_DIM }}>Pipes, tobacco, sessions, pairings</p>
              </div>
              <span className="text-lg" aria-hidden="true">🪴</span>
            </button>
            <button
              type="button"
              onClick={onSelectWhiskey}
              className="w-full rounded-xl p-4 text-left flex items-center justify-between transition-all"
              style={{ background: CARD_BG, border: CARD_BORDER }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: TEXT_MAIN }}>WhiskeyKeeper</p>
                <p className="text-xs mt-0.5" style={{ color: TEXT_DIM }}>Bottles, value, strategy, growth</p>
              </div>
              <span className="text-lg" aria-hidden="true">🥃</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="w-full text-center text-xs py-2 transition-all"
            style={{ color: TEXT_DIMMER }}
          >
            Skip onboarding and explore the app
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main router ───────────────────────────────────────────────────────────────

export default function OnboardingRouter({ initialSelection = null }) {
  const { user, isLoading: userLoading } = useCurrentUser();
  const { enabled, isLoading: modulesLoading } = useEnabledModules();

  // Track which flow is currently visible
  // 'pipe' | 'whiskey' | 'multi_picker' | null
  const [activeFlow, setActiveFlow] = useState(null);

  const seededPipe = typeof initialSelection?.pipekeeper === 'boolean' ? initialSelection.pipekeeper : null;
  const seededWhiskey = typeof initialSelection?.whiskeykeeper === 'boolean' ? initialSelection.whiskeykeeper : null;

  const hasPipe = seededPipe ?? enabled.pipekeeper;
  const hasWhiskey = seededWhiskey ?? enabled.whiskeykeeper;

  // Re-evaluate whenever module enablement changes (e.g. pipe user adds WhiskeyKeeper).
  // Only set an active flow when none is currently showing — don't interrupt a
  // flow that's already in progress.
  useEffect(() => {
    if (userLoading || modulesLoading || !user) return;
    if (activeFlow !== null) return; // already showing something — leave it

    // Gate: only auto-launch if session flag is set (after module selection)
    if (!shouldAutoLaunchOnboarding()) return;

    const pipeComplete    = isPipeOnboardingComplete();
    const whiskeyComplete = isWhiskeyOnboardingComplete();

    if (!hasPipe && !hasWhiskey) {
      // Brand-new user with no modules yet: fall into the generic pipe onboarding
      // which includes the module-selection step.
      if (!pipeComplete) setActiveFlow('pipe');
      return;
    }

    if (hasPipe && !hasWhiskey) {
      if (!pipeComplete) setActiveFlow('pipe');
      return;
    }

    if (hasWhiskey && !hasPipe) {
      if (!whiskeyComplete) setActiveFlow('whiskey');
      return;
    }

    // Both enabled — covers pipe users who later add WhiskeyKeeper.
    const needPipe    = !pipeComplete;
    const needWhiskey = !whiskeyComplete;
    if (needPipe && needWhiskey) {
      setActiveFlow('multi_picker');
    } else if (needWhiskey) {
      // PipeKeeper already done; only whiskey onboarding is outstanding.
      setActiveFlow('whiskey');
    } else if (needPipe) {
      setActiveFlow('pipe');
    }
    // Both complete → nothing to show
  }, [userLoading, modulesLoading, user, hasPipe, hasWhiskey, activeFlow]);

  // ── Dismiss helpers ─────────────────────────────────────────────────────────

  function finishPipe() {
    markPipeOnboardingComplete();
    clearAutoLaunchOnboarding();
    setActiveFlow(null);
  }

  function finishWhiskey() {
    markWhiskeyOnboardingComplete();
    clearAutoLaunchOnboarding();
    setActiveFlow(null);
  }

  function skipPipe() {
    markPipeOnboardingComplete();
    clearAutoLaunchOnboarding();
    setActiveFlow(null);
  }

  function skipWhiskey() {
    markWhiskeyOnboardingComplete();
    clearAutoLaunchOnboarding();
    setActiveFlow(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!activeFlow) return null;

  if (activeFlow === 'pipe') {
    return (
      <OnboardingFlow
        onComplete={finishPipe}
        onSkip={skipPipe}
      />
    );
  }

  if (activeFlow === 'whiskey') {
    return (
      <WhiskeyKeeperOnboarding
        onComplete={finishWhiskey}
        onSkip={skipWhiskey}
      />
    );
  }

  if (activeFlow === 'multi_picker') {
    return (
      <MultiModuleStarter
        onSelectPipe={() => setActiveFlow('pipe')}
        onSelectWhiskey={() => setActiveFlow('whiskey')}
        onSkip={skipPipe}
      />
    );
  }

  return null;
}