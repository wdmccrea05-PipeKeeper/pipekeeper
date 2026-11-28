/**
 * PipeKeeper Canonical Theme System
 * ===================================
 * Single source of truth for the collector visual system.
 * Warm brown/espresso, muted gold accents, restrained burgundy states.
 * No legacy blue dashboard theme values remain.
 */
export const PK_THEME = {
  // Page background (handled by Layout, kept for reference)
  pageBg: "bg-gradient-to-br from-[#242729] via-[#292c2e] to-[#242729]",

  // Card surfaces - collector theme only
  card: "bg-gradient-to-br from-[#34383a] to-[#292c2e] border border-[#8b6239]/25 rounded-xl shadow-lg",
  cardSoft: "bg-gradient-to-br from-[#34383a]/90 to-[#292c2e]/90 border border-[#8b6239]/20 rounded-xl shadow-lg",

  // Text colors - warm ivory/cream palette
  textTitle: "#F5F1E7",
  textHeading: "#E0D8C8",
  textBody: "#E0D8C8",
  textSubtle: "rgba(224, 216, 200, 0.7)",
  textMuted: "rgba(180, 140, 75, 0.8)",

  // Accent - muted gold/bronze
  accentText: "text-[#D4A574]",
  accentBg: "bg-[#D4A574]/12",

  // Buttons - burgundy/maroon primary, collector secondary
  buttonPrimary: "bg-[#705d39] hover:bg-[#604e30] text-[#F5F1E7]",
  buttonSecondary: "bg-gradient-to-br from-[#3b4042] to-[#303436] border border-[#8b6239]/30 text-[#E0D8C8] hover:from-[#464c4e] hover:to-[#3b4042]",
  buttonDanger: "bg-[#D45C5C] hover:bg-[#C44A4A] text-[#F5F1E7]",

  // Forms - collector input style
  input: "bg-[#232628] border border-[#8b6239]/25 text-[#FFFFFF] placeholder:text-[#E0D8C8]/60 rounded-lg",
  inputFocus: "focus:outline-none focus:ring-2 focus:ring-[#705d39]/50 focus:border-[#8b6239]/40",

  // Tabs - burgundy accent for active
  tabInactive: "text-[#8b6239]/70 border-b-2 border-transparent",
  tabActive: "text-[#E0D8C8] border-b-2 border-[#705d39] bg-[#705d39]/10 rounded-t-md",
};