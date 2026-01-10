import { isIOSCompanion } from "./companion.jsx";
import { isTrialWindow } from "./access";

/**
 * Centralized premium access logic
 * CRITICAL: iOS companion MUST NOT unlock paid digital content (App Store compliance)
 * 
 * @param {object} user - Current user object
 * @returns {boolean} Whether user has premium access
 */
export function hasPremiumAccess(user) {
  // ✅ App Store compliance: iOS companion must NOT unlock paid digital content
  if (isIOSCompanion()) return false;

  const isPaid = user?.subscription_level === "paid";
  const inTrial = typeof isTrialWindow === "function" ? isTrialWindow() : false;

  return isPaid || inTrial;
}

/**
 * Legacy alias - use hasPremiumAccess instead
 */
export function checkPremiumAccess(user) {
  return hasPremiumAccess(user);
}