export const EMAIL_LANGUAGE_LABELS = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  "pt-BR": "Português (BR)",
  nl: "Nederlands",
  pl: "Polski",
  ja: "日本語",
  "zh-Hans": "中文 (简体)",
};

export const EMAIL_LANGUAGE_CODES = Object.keys(EMAIL_LANGUAGE_LABELS);

export const CAMPAIGN_STATUS_STYLES = {
  draft: { label: "Draft", color: "#E0D8C8" },
  approved: { label: "Approved", color: "#8FB8E0" },
  scheduled: { label: "Scheduled", color: "#B79BE0" },
  sending: { label: "Sending", color: "#E0C87B" },
  sent: { label: "Sent", color: "#7BC29A" },
  cancelled: { label: "Cancelled", color: "#E09B9B" },
  failed: { label: "Failed", color: "#E09B9B" },
};