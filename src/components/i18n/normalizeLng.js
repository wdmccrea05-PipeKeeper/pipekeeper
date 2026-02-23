// src/components/i18n/normalizeLng.js
// Normalizes locale strings to the 2-letter codes PipeKeeper supports.
// Examples:
//  - "en-US" -> "en"
//  - "ES" -> "es"
//  - "de_DE" -> "de"
//  - "ja-JP" -> "ja"
//  - anything else -> "en"

export const normalizeLng = (input) => {
  try {
    const raw = String(input || "").trim();
    if (!raw) return "en";

    const lower = raw.toLowerCase().replace("_", "-");

    // common cases
    if (lower.startsWith("en")) return "en";
    if (lower.startsWith("es")) return "es";
    if (lower.startsWith("de")) return "de";
    if (lower.startsWith("ja")) return "ja";

    // sometimes people store human labels by accident
    if (lower === "english") return "en";
    if (lower === "español" || lower === "spanish") return "es";
    if (lower === "deutsch" || lower === "german") return "de";
    if (lower === "日本語" || lower === "japanese") return "ja";

    return "en";
  } catch {
    return "en";
  }
};
