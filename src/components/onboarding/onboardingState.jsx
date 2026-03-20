/**
 * ONBOARDING STATE MANAGEMENT
 * ═════════════════════════════════════════════════════════════════════════════════
 *
 * Manages onboarding flow state persistently.
 * Syncs to localStorage and UserProfile.
 */

import type { ModuleKey } from "@/components/access";

const ONBOARDING_KEYS = {
  COMPLETED: "ck_onboarding_completed",
  CURRENT_STEP: "ck_onboarding_step",
  SELECTED_MODULES: "ck_onboarding_modules",
};

/**
 * Get onboarding completion status.
 */
export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEYS.COMPLETED) === "true";
  } catch {
    return false;
  }
}

/**
 * Mark onboarding as completed.
 */
export function markOnboardingCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_KEYS.COMPLETED, "true");
  } catch {}
}

/**
 * Get current onboarding step.
 */
export function getCurrentOnboardingStep(): number {
  try {
    const step = localStorage.getItem(ONBOARDING_KEYS.CURRENT_STEP);
    return step ? parseInt(step, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Set current onboarding step.
 */
export function setCurrentOnboardingStep(step: number): void {
  try {
    localStorage.setItem(ONBOARDING_KEYS.CURRENT_STEP, String(step));
  } catch {}
}

/**
 * Get selected modules from onboarding.
 */
export function getSelectedModules(): ModuleKey[] {
  try {
    const modules = localStorage.getItem(ONBOARDING_KEYS.SELECTED_MODULES);
    return modules ? JSON.parse(modules) : ["pipekeeper"];
  } catch {
    return ["pipekeeper"];
  }
}

/**
 * Save selected modules.
 */
export function saveSelectedModules(modules: ModuleKey[]): void {
  try {
    localStorage.setItem(ONBOARDING_KEYS.SELECTED_MODULES, JSON.stringify(modules));
  } catch {}
}

/**
 * Clear all onboarding state.
 */
export function clearOnboardingState(): void {
  try {
    localStorage.removeItem(ONBOARDING_KEYS.COMPLETED);
    localStorage.removeItem(ONBOARDING_KEYS.CURRENT_STEP);
    localStorage.removeItem(ONBOARDING_KEYS.SELECTED_MODULES);
  } catch {}
}