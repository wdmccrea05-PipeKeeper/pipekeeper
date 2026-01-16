// src/components/utils/trialAccess.jsx

/**
 * Check if user is within their 7-day trial window
 * @param {object} user - Current user object
 * @returns {boolean} Whether user is within trial period
 */
export function isWithinTrialWindow(user) {
  if (!user?.created_date) return false;
  
  const TRIAL_DAYS = 7;
  const accountAge = Date.now() - new Date(user.created_date).getTime();
  const trialWindow = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  
  return accountAge < trialWindow;
}