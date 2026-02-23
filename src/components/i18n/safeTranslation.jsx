// src/components/i18n/safeTranslation.jsx
/**
 * Safe translation helper
 *
 * Why this exists:
 * - i18next can return keys ("home.heroTitle") or explicit missing markers
 *   ("[MISSING] home.heroTitle") when a resource is incomplete.
 * - Some parts of the app pass a defaultValue; we should reliably fall back to it.
 */

export function safeT(t, key, fallback = "") {
  try {
    const value = t(key, { defaultValue: fallback });

    // Explicit missing marker from our i18n setup.
    if (typeof value === "string" && value.startsWith("[MISSING]")) {
      return fallback || "";
    }

    // When i18next returns the key itself (or something that still looks like a key).
    if (looksLikeKeyLeak(value, key)) {
      return fallback || "";
    }

    // Prevent “humanized placeholder” leaks for core home cards.
    // If the translation equals the humanized key (e.g., "Pipe Collection Title"),
    // prefer the provided fallback.
    if (fallback && typeof value === "string" && isHumanizedKey(value, key)) {
      return fallback;
    }

    return value;
  } catch {
    return fallback || "";
  }
}

function looksLikeKeyLeak(value, key) {
  if (typeof value !== "string") return false;
  if (!value) return true;
  if (value === key) return true;
  // dot-keys, namespaces, or bracket markers
  if (/^[a-z0-9_]+(\.[a-z0-9_]+)+$/i.test(value)) return true;
  if (/^\[missing\]/i.test(value)) return true;
  return false;
}

function humanizeKey(key) {
  const last = String(key || "").split(".").pop() || "";
  // pipeCollectionTitle -> Pipe Collection Title
  return last
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function isHumanizedKey(value, key) {
  if (typeof value !== "string") return false;
  const h = humanizeKey(key);
  return value.trim() === h;
}
