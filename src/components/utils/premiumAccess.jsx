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
  
  // 7-day trial for new accounts
  const isWithinSevenDayTrial = user?.created_date ? 
    Date.now() - new Date(user.created_date).getTime() < 7 * 24 * 60 * 60 * 1000 : false;

  return isPaid || inTrial || isWithinSevenDayTrial;
}

/**
 * Legacy alias - use hasPremiumAccess instead
 */
export function checkPremiumAccess(user) {
  return hasPremiumAccess(user);
}