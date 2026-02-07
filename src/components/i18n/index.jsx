import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translations } from "./translations-complete";

/**
 * Normalize language codes coming from UI / storage.
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
 * Add backward-compatible aliases so old keys still resolve.
 * This avoids chasing every historical key name in the UI.
 */
function applyAliasesToPack(pack) {
  if (!pack || typeof pack !== "object") return pack;

  // alias: aidentifier.* -> aiIdentifier.*
  if (!pack.aidentifier && pack.aiIdentifier) {
    pack.aidentifier = pack.aiIdentifier;
  }

  // alias for subscription banner key seen in UI
  // If UI asks for subscription.premiumActiveSubtextPaid, map it to a sensible existing string.
  // Prefer profile.fullAccess if present, else fall back to common/premium wording if present.
  if (pack.subscription) {
    if (!pack.subscription.premiumActiveSubtextPaid) {
      const fallback =
        pack.profile?.fullAccess ||
        pack.subscription?.premiumActiveSubtext ||
        pack.common?.premiumActive ||
        "Premium Active";
      pack.subscription.premiumActiveSubtextPaid = fallback;
    }
  }

  return pack;
}

/**
 * Build i18next resources from ONE source of truth.
 */
function buildResources(source) {
  const out = {};
  Object.entries(source || {}).forEach(([lng, pack]) => {
    const fixed = applyAliasesToPack(structuredClone(pack));
    out[lng] = { translation: fixed };
  });

  // Also register aliases at language level so selection works even if UI stores these
  if (out["pt-BR"] && !out.pt) out.pt = out["pt-BR"];
  if (out["zh-Hans"] && !out.zh) out.zh = out["zh-Hans"];

  return out;
}

const resources = buildResources(translations);

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
  returnObjects: false,

  // CRITICAL: make missing keys obvious so we can finish coverage fast.
  parseMissingKeyHandler: (key) => `⟦${key}⟧`,

  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on("languageChanged", (lng) => {
  try {
    const normalized = normalizeLang(lng);
    window.localStorage.setItem("pk_lang", normalized);
    if (lng !== normalized) i18n.changeLanguage(normalized);
  } catch {}
});

export default i18n;