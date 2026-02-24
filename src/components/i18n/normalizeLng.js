// src/components/i18n/normalizeLng.js
// Normalizes locale strings to the codes PipeKeeper supports.
// Examples:
//  - "en-US" -> "en"
//  - "ES" -> "es"
//  - "de_DE" -> "de"
//  - "ja-JP" -> "ja"
//  - "pt-BR" -> "pt-BR"
//  - "zh-CN" -> "zh-Hans"
//  - anything else -> "en"

export const normalizeLng = (input) => {
  try {
    const raw = String(input || "").trim();
    if (!raw) return "en";

    const lower = raw.toLowerCase().replace("_", "-");

    // exact match for special codes first
    if (lower === "pt-br" || lower === "pt") return "pt-BR";
    if (lower === "zh-hans" || lower === "zh-cn" || lower === "zh") return "zh-Hans";

    // prefix matches
    if (lower.startsWith("en")) return "en";
    if (lower.startsWith("es")) return "es";
    if (lower.startsWith("fr")) return "fr";
    if (lower.startsWith("de")) return "de";
    if (lower.startsWith("it")) return "it";
    if (lower.startsWith("nl")) return "nl";
    if (lower.startsWith("pl")) return "pl";
    if (lower.startsWith("ja")) return "ja";

    // human-readable labels
    if (lower === "english") return "en";
    if (lower === "español" || lower === "spanish") return "es";
    if (lower === "français" || lower === "french") return "fr";
    if (lower === "deutsch" || lower === "german") return "de";
    if (lower === "italiano" || lower === "italian") return "it";
    if (lower === "português" || lower === "portuguese") return "pt-BR";
    if (lower === "nederlands" || lower === "dutch") return "nl";
    if (lower === "polski" || lower === "polish") return "pl";
    if (lower === "日本語" || lower === "japanese") return "ja";
    if (lower === "中文" || lower === "chinese") return "zh-Hans";

    return "en";
  } catch {
    return "en";
  }
};
