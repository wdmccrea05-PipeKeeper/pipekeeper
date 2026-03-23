/**
 * ONBOARDING STATE MANAGEMENT
 */

const ONBOARDING_KEYS = {
  COMPLETED: "ck_onboarding_completed",
  CURRENT_STEP: "ck_onboarding_step",
  SELECTED_MODULES: "ck_onboarding_modules",
};

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
    return modules ? JSON.parse(modules) : ["pipekeeper"];
  } catch {
    return ["pipekeeper"];
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
  } catch {}
}