import i18n from "./index";

export function normalizePkLang(lng) {
  if (!lng) return "en";
  const base = String(lng).replace("_", "-").split("-")[0].toLowerCase();
  const allowed = ["en","es","fr","de","it","pt","nl","pl","ja","zh"];
  return allowed.includes(base) ? base : "en";
}

export function getPkLanguage() {
  try {
    const saved = localStorage.getItem("pk_lang");
    if (saved) return normalizePkLang(saved);

    // compatibility if some library uses i18nextLng
    const i18nSaved = localStorage.getItem("i18nextLng");
    if (i18nSaved) return normalizePkLang(i18nSaved);
  } catch {}
  return "en";
}

export function setPkLanguage(lng) {
  const normalized = normalizePkLang(lng);
  console.log("[LANG_WRITE]", "pk_lang/i18n/html", { value: normalized, file: "components/i18n/ui.js" });
  console.trace("[LANG_WRITE_TRACE]");
  
  try {
    localStorage.setItem("pk_lang", normalized);
    // also write i18nextLng so any i18next usage stays aligned
    localStorage.setItem("i18nextLng", normalized);
  } catch {}

  try {
    document.documentElement.lang = normalized;
  } catch {}
  
  return normalized;
}

export function setHtmlLang(lng) {
  const normalized = normalizePkLang(lng);
  console.log("[LANG_WRITE]", "html", { value: normalized, file: "components/i18n/ui.js setHtmlLang" });
  console.trace("[LANG_WRITE_TRACE]");
  
  try { 
    document.documentElement.lang = normalized; 
  } catch {}
}

export function ui(key, options) {
  return i18n.t(key, options);
}

// keep <html lang="..."> synced anytime language changes
try {
  const bootLang = getPkLanguage();
  setHtmlLang(bootLang);
  i18n.on("languageChanged", (lng) => setHtmlLang(lng));
} catch {}