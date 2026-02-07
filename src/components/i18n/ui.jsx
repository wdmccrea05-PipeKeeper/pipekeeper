import { STRINGS } from "./strings";

const FALLBACK_LANG = "en";

function humanize(key) {
  return key.split(".").pop()?.replace(/([A-Z])/g, " $1") ?? key;
}

export function ui(key) {
  const lang = typeof window !== "undefined" ? localStorage.getItem("pk_lang") || FALLBACK_LANG : FALLBACK_LANG;

  const value = key.split(".").reduce((o, k) => o?.[k], STRINGS[lang]);
  
  if (value) return value;
  
  const fallback = key.split(".").reduce((o, k) => o?.[k], STRINGS[FALLBACK_LANG]);
  
  if (fallback) return fallback;
  
  return humanize(key);
}

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "sv", label: "Svenska" },
  { code: "nl", label: "Nederlands" },
];