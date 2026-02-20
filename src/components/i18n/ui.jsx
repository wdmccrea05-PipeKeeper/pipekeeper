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
  try {
    localStorage.setItem("pk_lang", normalized);
    // also write i18nextLng so any i18next usage stays aligned
    localStorage.setItem("i18nextLng", normalized);
  } catch {}

  try {
    document.documentElement.lang = normalized;
  } catch {}
}

export function setHtmlLang(lng) {
  try { 
    document.documentElement.lang = normalizePkLang(lng); 
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