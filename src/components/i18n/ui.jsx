import { translate } from "./index.jsx";

// Usage: ui("nav.home") -> translated string, falls back to key if missing
export function ui(key, options = {}) {
  try {
    const out = translate(key, options);
    return out || key;
  } catch {
    return key;
  }
}