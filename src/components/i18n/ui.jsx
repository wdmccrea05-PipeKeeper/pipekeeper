import i18n from "./index";

// Usage: ui("nav.home") -> translated string, falls back to key if missing
export function ui(key, options = {}) {
  try {
    const out = i18n.t(key, { ...options, defaultValue: key });
    return out || key;
  } catch {
    return key;
  }
}