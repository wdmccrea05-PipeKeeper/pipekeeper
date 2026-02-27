export const FOCUS_OPTIONS = [
  { canonical: "Aromatic",            labelKey: "focusOptions.aromatic" },
  { canonical: "Non-Aromatic",        labelKey: "focusOptions.nonAromatic" },
  { canonical: "Light Aromatics",     labelKey: "focusOptions.lightAromatics" },
  { canonical: "Medium Aromatics",    labelKey: "focusOptions.mediumAromatics" },
  { canonical: "Heavy Aromatics",     labelKey: "focusOptions.heavyAromatics" },
  { canonical: "English",             labelKey: "focusOptions.english" },
  { canonical: "Balkan",              labelKey: "focusOptions.balkan" },
  { canonical: "Latakia Blend",       labelKey: "focusOptions.latakiaBlend" },
  { canonical: "Virginia",            labelKey: "focusOptions.virginia" },
  { canonical: "Virginia/Perique",    labelKey: "focusOptions.virginiaPericue" },
  { canonical: "Burley",              labelKey: "focusOptions.burley" },
  { canonical: "Burley-based",        labelKey: "focusOptions.burleyBased" },
  { canonical: "Oriental/Turkish",    labelKey: "focusOptions.oriental" },
  { canonical: "Kentucky",            labelKey: "focusOptions.kentucky" },
];

export const FOCUS_LABEL_KEY = Object.fromEntries(
  FOCUS_OPTIONS.map(o => [o.canonical, o.labelKey])
);
