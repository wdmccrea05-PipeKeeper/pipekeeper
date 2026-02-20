import i18n from "./index";

// normalize to the resource keys your i18n setup actually ships: en/es/fr/de/it/pt/zh/ja
function normalizeLng(raw) {
  const lng = String(raw || "").trim();
  if (!lng) return "en";
  if (lng.startsWith("pt")) return "pt";
  if (lng.startsWith("zh")) return "zh";
  const base = lng.split("-")[0];
  return ["en","es","fr","de","it","pt","zh","ja"].includes(lng)
    ? lng
    : ["en","es","fr","de","it","pt","zh","ja"].includes(base)
      ? base
      : "en";
}

export function setHtmlLang(lng) {
  try {
    document.documentElement.lang = normalizeLng(lng);
  } catch {}
}

export function ui(key, options) {
  return i18n.t(key, options);
}

// keep <html lang="..."> synced anytime language changes
try {
  setHtmlLang(i18n.language);
  i18n.on("languageChanged", (lng) => setHtmlLang(lng));
} catch {}