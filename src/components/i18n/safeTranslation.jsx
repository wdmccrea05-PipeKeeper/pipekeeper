// src/components/i18n/safeTranslation.jsx
import { useMemo } from "react";
import { useTranslation as useI18nTranslation } from "react-i18next";

// Strings that should never appear as “real” translations.
// If we see them, we fall back to something user-friendly.
const PLACEHOLDER_VALUES = new Set([
  "Title",
  "Subtitle",
  "Page Title",
  "Page Subtitle",
  "Description",
  "Label",
  "Text",
  "Placeholder",
]);

function humanizeKey(key) {
  if (!key || typeof key !== "string") return "";
  const last = key.split(".").pop() || key;
  const spaced = last
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function looksLikeKey(value) {
  if (typeof value !== "string") return false;
  // common patterns: "home.pageTitle", "pipesPage.addPipe", etc.
  return /^[a-z0-9_]+(\.[a-z0-9_]+)+$/i.test(value);
}

function isMissingMarker(value) {
  if (typeof value !== "string") return false;
  return value.startsWith("[MISSING]");
}

function isPlaceholder(value) {
  if (typeof value !== "string") return false;
  const v = value.trim();

  if (!v) return true;
  if (PLACEHOLDER_VALUES.has(v)) return true;

  // Treat the runtime missing marker as "not a real translation"
  if (isMissingMarker(v)) return true;

  // Sometimes tooling leaves "TODO" or similar
  if (/^(todo|tbd)$/i.test(v)) return true;

  return false;
}

/**
 * Safe wrapper around i18n `t()`:
 * - Never show raw keys or [MISSING] markers to users
 * - If missing, prefer `options.defaultValue`, otherwise humanize the key
 */
export function useTranslation() {
  const { t: rawT, i18n } = useI18nTranslation();

  const t = useMemo(() => {
    return (key, options = {}) => {
      const opts = options && typeof options === "object" ? options : {};

      // If caller passed a bogus 2nd arg (string), ignore it safely.
      // The correct signature is: t(key, { defaultValue: "..." })
      const defaultValue =
        typeof opts.defaultValue === "string" && opts.defaultValue.trim()
          ? opts.defaultValue
          : undefined;

      let value;
      try {
        value = rawT(key, opts);
      } catch {
        value = undefined;
      }

      const fallback = defaultValue || humanizeKey(key);

      if (typeof value !== "string") return fallback;

      const v = value.trim();

      if (isPlaceholder(v)) return fallback;

      // If it returned the key itself (common i18n fallback)
      if (v === key) return fallback;

      // If it returned something that looks like another key
      if (looksLikeKey(v)) return fallback;

      return value;
    };
  }, [rawT]);

  return { t, i18n };
}
