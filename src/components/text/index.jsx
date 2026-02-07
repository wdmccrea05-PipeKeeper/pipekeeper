import { TEXT as EN } from "./en";
import { TEXT as JA } from "./ja";
import { TEXT as SV } from "./sv";
import { TEXT as NL } from "./nl";

export function getText(lang) {
  switch (lang) {
    case "ja": return JA;
    case "sv": return SV;
    case "nl": return NL;
    default: return EN;
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "sv", label: "Svenska" },
  { code: "nl", label: "Nederlands" },
];