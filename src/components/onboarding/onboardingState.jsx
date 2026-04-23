/**
 * ONBOARDING STATE MANAGEMENT
 *
 * Tracks completion per module so onboarding never reruns unnecessarily
 * and whiskey-only users never see pipe context.
 */

const ONBOARDING_KEYS = {
  COMPLETED:        "ck_onboarding_completed",
  CURRENT_STEP:     "ck_onboarding_step",
  SELECTED_MODULES: "ck_onboarding_modules",
  PIPE_COMPLETE:    "ck_pipe_onboarding_complete",
  WHISKEY_COMPLETE: "ck_whiskey_onboarding_complete",
  CIGAR_COMPLETE:   "ck_cigar_onboarding_complete",
};

// ── Legacy (generic) ──────────────────────────────────────────────────────────

export function isOnboardingCompleted() {
  try {
    return localStorage.getItem(ONBOARDING_KEYS.COMPLETED) === "true";
  } catch {
    return false;
  }
}

export function markOnboardingCompleted() {
  try {
    localStorage.setItem(ONBOARDING_KEYS.COMPLETED, "true");
  } catch {}
}

export function getCurrentOnboardingStep() {
  try {
    const step = localStorage.getItem(ONBOARDING_KEYS.CURRENT_STEP);
    return step ? parseInt(step, 10) : 0;
  } catch {
    return 0;
  }
}

export function setCurrentOnboardingStep(step) {
  try {
    localStorage.setItem(ONBOARDING_KEYS.CURRENT_STEP, String(step));
  } catch {}
}

export function getSelectedModules() {
  try {
    const modules = localStorage.getItem(ONBOARDING_KEYS.SELECTED_MODULES);
    return modules ? JSON.parse(modules) : [];
  } catch {
    return [];
  }
}

export function saveSelectedModules(modules) {
  try {
    localStorage.setItem(ONBOARDING_KEYS.SELECTED_MODULES, JSON.stringify(modules));
  } catch {}
}

export function clearOnboardingState() {
  try {
    localStorage.removeItem(ONBOARDING_KEYS.COMPLETED);
    localStorage.removeItem(ONBOARDING_KEYS.CURRENT_STEP);
    localStorage.removeItem(ONBOARDING_KEYS.SELECTED_MODULES);
    localStorage.removeItem(ONBOARDING_KEYS.PIPE_COMPLETE);
    localStorage.removeItem(ONBOARDING_KEYS.WHISKEY_COMPLETE);
  } catch {}
}

// ── Per-module completion ─────────────────────────────────────────────────────

export function isPipeOnboardingComplete() {
  try {
    // Also treat the legacy generic flag as completion for pipe
    return (
      localStorage.getItem(ONBOARDING_KEYS.PIPE_COMPLETE) === "true" ||
      localStorage.getItem(ONBOARDING_KEYS.COMPLETED) === "true"
    );
  } catch {
    return false;
  }
}

export function markPipeOnboardingComplete() {
  try {
    localStorage.setItem(ONBOARDING_KEYS.PIPE_COMPLETE, "true");
    localStorage.setItem(ONBOARDING_KEYS.COMPLETED, "true");
  } catch {}
}

export function isWhiskeyOnboardingComplete() {
  try {
    return localStorage.getItem(ONBOARDING_KEYS.WHISKEY_COMPLETE) === "true";
  } catch {
    return false;
  }
}

export function markWhiskeyOnboardingComplete() {
  try {
    localStorage.setItem(ONBOARDING_KEYS.WHISKEY_COMPLETE, "true");
  } catch {}
}

export function isCigarOnboardingComplete() {
  try {
    return localStorage.getItem(ONBOARDING_KEYS.CIGAR_COMPLETE) === "true";
  } catch {
    return false;
  }
}

export function markCigarOnboardingComplete() {
  try {
    localStorage.setItem(ONBOARDING_KEYS.CIGAR_COMPLETE, "true");
  } catch {}
}