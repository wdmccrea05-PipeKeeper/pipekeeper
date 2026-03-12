/**
 * PipeKeeper Canonical Theme System
 * ===================================
 * Single source of truth for the collector visual system.
 * Warm brown/espresso, muted gold accents, restrained burgundy states.
 * No legacy blue dashboard theme values remain.
 */
export const PK_THEME = {
  // Page background (handled by Layout, kept for reference)
  pageBg: "bg-gradient-to-br from-[#0f0b08] via-[#1a1410] to-[#0f0b08]",

  // Card surfaces - collector theme only
  card: "bg-gradient-to-br from-[#2a1f18] to-[#1f1510] border border-[#8b6239]/25 rounded-xl shadow-lg",
  cardSoft: "bg-gradient-to-br from-[#2a1f18]/90 to-[#1f1510]/90 border border-[#8b6239]/20 rounded-xl shadow-lg",

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
  buttonPrimary: "bg-[#A35C5C] hover:bg-[#8F4E4E] text-[#F5F1E7]",
  buttonSecondary: "bg-gradient-to-br from-[#3a2a20] to-[#2a1a10] border border-[#8b6239]/30 text-[#E0D8C8] hover:from-[#4a3a2a] hover:to-[#3a2a1a]",
  buttonDanger: "bg-[#D45C5C] hover:bg-[#C44A4A] text-[#F5F1E7]",

  // Forms - collector input style
  input: "bg-[#1a1510] border border-[#8b6239]/25 text-[#E0D8C8] placeholder:text-[#8b6239]/50 rounded-lg",
  inputFocus: "focus:outline-none focus:ring-2 focus:ring-[#A35C5C]/50 focus:border-[#8b6239]/40",

  // Tabs - burgundy accent for active
  tabInactive: "text-[#8b6239]/70 border-b-2 border-transparent",
  tabActive: "text-[#E0D8C8] border-b-2 border-[#A35C5C] bg-[#A35C5C]/10 rounded-t-md",
};