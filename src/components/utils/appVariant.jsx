// src/components/utils/appVariant.jsx
//
// Central build/runtime config for PipeKeeper.
// Supports Base44 env vars AND optional runtime overrides (useful for iOS WKWebView wrappers).
//
// Precedence (highest → lowest):
// 1) window.__PIPEKEEPER_VARIANT__  (native wrapper can inject this)
// 2) URL query param: ?variant=apple|full
// 3) localStorage: pipekeeper_variant = apple|full
// 4) VITE_APP_VARIANT environment variable (Base44 deployment config)
// 5) default: "full"

function safeGetQueryParam(name) {
  try {
    if (typeof window === "undefined") return null;
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  } catch {
    return null;
  }
}

function safeGetLocalStorage(key) {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function normalizeVariant(v) {
  const s = String(v || "").toLowerCase().trim();
  if (s === "apple" || s === "ios") return "apple";
  if (s === "full" || s === "web" || s === "android") return "full";
  return "";
}

export function resolveAppVariant() {
  // 1) Native wrapper override (recommended for WKWebView)
  const native = typeof window !== "undefined" ? normalizeVariant(window.__PIPEKEEPER_VARIANT__) : "";
  if (native) return native;

  // 2) URL param override (handy for testing)
  const qp = normalizeVariant(safeGetQueryParam("variant"));
  if (qp) return qp;

  // 3) Local override (handy for internal QA)
  const ls = normalizeVariant(safeGetLocalStorage("pipekeeper_variant"));
  if (ls) return ls;

  // 4) Base44 env var
  const env = normalizeVariant(import.meta?.env?.VITE_APP_VARIANT || "");
  if (env) return env;

  // 5) Default
  return "full";
}

export const APP_VARIANT = resolveAppVariant();

/**
 * Apple compliant build behavior:
 * - Collection & Cellar Management only
 * - No recommendation-style features, optimization, break-in instructions, smoking logs, community
 */
export const isAppleBuild = APP_VARIANT === "apple";

/**
 * Single source of truth for capability gating.
 * Anything set to false MUST:
 * - not appear in nav
 * - not be reachable via routing
 * - not render at component level
 */
export const FEATURES = Object.freeze({
  recommendations: !isAppleBuild, // pairings / match scores / "best" / "what to smoke"
  optimization: !isAppleBuild, // optimizer / what-if scenarios
  breakInSchedules: !isAppleBuild, // break-in guidance/instructions
  smokingLogs: !isAppleBuild, // session logs, streaks
  community: !isAppleBuild, // social/community features
});

/**
 * Optional helper you can use in guards:
 * - returns true if a feature is allowed in this build
 */
export function isFeatureEnabled(featureKey) {
  return FEATURES?.[featureKey] !== false;
}