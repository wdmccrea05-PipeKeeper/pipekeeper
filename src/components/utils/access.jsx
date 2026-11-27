// src/components/utils/access.jsx
// LEGACY SHIM — access decisions come from premiumAccess.jsx and the
// complimentary window from proTrial.js. Import those directly in new code.

import { isProTrialActive } from "./proTrial";

export { hasPremiumAccess, hasPaidAccess, hasProAccess, getPlanLabel } from "./premiumAccess";

export function isTrialWindow(userOrCreatedDate) {
  if (typeof userOrCreatedDate === "string") {
    return isProTrialActive({ created_date: userOrCreatedDate });
  }
  return isProTrialActive(userOrCreatedDate);
}

export function isTrialWindowNow(user) {
  return isProTrialActive(user);
}