import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translationsExtended } from "./translations-extended";

/**
 * Normalize incoming language codes.
 * Must match LanguageSwitcher + stored values.
 */
function normalizeLang(raw) {
  const v = (raw || "").toString().trim();
  if (!v) return "en";
  if (v === "pt") return "pt-BR";
  if (v === "zh") return "zh-Hans";
  if (v.toLowerCase() === "zh-cn") return "zh-Hans";
  if (v.toLowerCase() === "pt-br") return "pt-BR";
  return v;
}

/**
 * The codebase uses a mix of keys:
 * - nav.home
 * - common.nav.home
 *
 * translationsExtended stores nav under common.nav.
 * We expose BOTH paths so nothing silently fails.
 */
function normalizePack(pack) {
  const common = pack?.common || {};
  const navFromCommon = common?.nav || {};
  const navAtRoot = pack?.nav || {};

  return {
    ...pack,
    common: {
      ...common,
      nav: { ...navFromCommon, ...navAtRoot },
    },
    // root-level alias so t("nav.home") works
    nav: { ...navFromCommon, ...navAtRoot },
  };
}

const resources = Object.fromEntries(
  Object.entries(translationsExtended).map(([lng, pack]) => [
    lng,
    { translation: normalizePack(pack) },
  ])
);

// language aliases (keep them)
resources.pt = resources["pt-BR"];
resources.zh = resources["zh-Hans"];

const stored =
  typeof window !== "undefined"
    ? normalizeLang(window.localStorage.getItem("pk_lang"))
    : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: stored,
  fallbackLng: "en",
  returnNull: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

// persist + normalize changes
i18n.on("languageChanged", (lng) => {
  try {
    const normalized = normalizeLang(lng);
    window.localStorage.setItem("pk_lang", normalized);
    if (lng !== normalized) i18n.changeLanguage(normalized);
  } catch {}
});

export default i18n;