// src/components/utils/appVariant.jsx
//
// Variant resolution order:
// 1) window.__PIPEKEEPER_VARIANT__ (set by iOS WKWebView wrapper)
// 2) ?variant=apple|full
// 3) localStorage pipekeeper_variant
// 4) VITE_APP_VARIANT env var (Base44 deployment config)
// 5) default: full

function norm(v) {
  const s = String(v || "").toLowerCase().trim();
  if (s === "apple" || s === "ios") return "apple";
  if (s === "full" || s === "web" || s === "android") return "full";
  return "";
}

function getQueryParam(name) {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  } catch {
    return null;
  }
}

function getLS(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function resolveAppVariant() {
  // 1) iOS wrapper injection
  if (typeof window !== "undefined") {
    const injected = norm(window.__PIPEKEEPER_VARIANT__);
    if (injected) return injected;
  }

  // 2) URL param
  const qp = typeof window !== "undefined" ? norm(getQueryParam("variant")) : "";
  if (qp) return qp;

  // 3) localStorage override
  const ls = typeof window !== "undefined" ? norm(getLS("pipekeeper_variant")) : "";
  if (ls) return ls;

  // 4) Base44 env var
  const env = norm(import.meta?.env?.VITE_APP_VARIANT || "");
  if (env) return env;

  return "full";
}

export const APP_VARIANT = resolveAppVariant();
export const isAppleBuild = APP_VARIANT === "apple";

export const FEATURES = Object.freeze({
  recommendations: !isAppleBuild,
  optimization: !isAppleBuild,
  breakInSchedules: !isAppleBuild,
  smokingLogs: !isAppleBuild,
  community: !isAppleBuild,
});

export function isFeatureEnabled(key) {
  return FEATURES?.[key] !== false;
}