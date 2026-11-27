import { base44 } from "@/api/base44Client";

/**
 * Where did this activation come from? Read from an explicit query parameter
 * first, then the referring site. Used only for campaign attribution — it never
 * changes eligibility or the grant itself.
 */
export function resolveActivationChannel() {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get("channel");
    if (fromQuery) return String(fromQuery).toLowerCase();
    const referrer = String(document.referrer || "").toLowerCase();
    if (referrer.includes("facebook.com") || referrer.includes("fb.com") || referrer.includes("fb.me")) {
      return "facebook";
    }
    return "in_app";
  } catch {
    return "in_app";
  }
}

/** Persists the collector's language so campaign email can match it. */
export function rememberPreferredLanguage(code) {
  if (!code) return;
  base44.auth
    .updateMe({ preferred_language: code })
    .catch(() => {});
}