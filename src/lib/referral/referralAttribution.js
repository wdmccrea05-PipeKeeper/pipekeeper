/**
 * Referral attribution helpers.
 * On page load, captures ?ref= code from URL and persists to localStorage.
 * On user login, calls attributeReferral to attach it to the account.
 */

const STORAGE_KEY = 'ck_referral_code';
const SOURCE_KEY = 'ck_referral_source';
const ATTRIBUTED_KEY = 'ck_referral_attributed';

/**
 * Call once at app startup. Captures ?ref= from URL, saves to localStorage,
 * and fires an anonymous click-tracking event to the backend.
 */
export function captureReferralFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const moduleKey = params.get('m');
    if (ref && !localStorage.getItem(ATTRIBUTED_KEY)) {
      localStorage.setItem(STORAGE_KEY, ref);
      localStorage.setItem(SOURCE_KEY, moduleKey ? `link_${moduleKey}` : 'link');

      // Fire click-tracking event — anonymous, fire-and-forget
      // Uses fetch directly since the SDK may not be initialized yet at startup
      const appId = import.meta?.env?.VITE_APP_ID || '';
      fetch(`/api/v1/apps/${appId}/functions/trackReferralClick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: ref, module: moduleKey, channel: 'link' }),
      }).catch(() => {});
    }
  } catch (_) {}
}

/**
 * Returns the stored referral code, or null.
 */
export function getStoredReferralCode() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch (_) { return null; }
}

/**
 * Call after user logs in/signs up. Sends attribution to backend.
 */
export async function attributeStoredReferral(invokeFn) {
  try {
    const code = getStoredReferralCode();
    if (!code || localStorage.getItem(ATTRIBUTED_KEY)) return;

    const source = localStorage.getItem(SOURCE_KEY) || 'link';
    const res = await invokeFn('attributeReferral', { referralCode: code, referralSource: source });
    if (res?.data?.ok || res?.data?.alreadyAttributed) {
      localStorage.setItem(ATTRIBUTED_KEY, '1');
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SOURCE_KEY);
    }
  } catch (_) {}
}