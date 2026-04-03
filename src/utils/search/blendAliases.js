/**
 * Manufacturer and blend alias dictionary for international brand recognition.
 *
 * Each entry maps a canonical manufacturer name to a list of alternate spellings,
 * abbreviations, and regional label variants. This enables fuzzy search to match
 * user input against the canonical name and all its aliases.
 *
 * Keys are lowercase canonical names. Values are arrays of lowercase aliases
 * (including the canonical name itself for uniform handling).
 *
 * This is a static in-repo constant — no backend job or infra required.
 */

export const MANUFACTURER_ALIASES = {
  // ── German / European ──────────────────────────────────────────────────────
  "kohlhase & kopp": [
    "kohlhase & kopp",
    "kohlhase and kopp",
    "kohlhase kopp",
    "k&k",
  ],
  "hu tobacco": [
    "hu tobacco",
    "h.u. tobacco",
    "hu",
  ],
  "dan tobacco": [
    "dan tobacco",
    "dan",
  ],
  "mac baren": [
    "mac baren",
    "mac-baren",
    "macbaren",
  ],
  "planta": [
    "planta",
  ],
  "solani": [
    "solani",
  ],
  "vauen": [
    "vauen",
  ],
  "agio": [
    "agio",
  ],
  "von eicken": [
    "von eicken",
    "voneicken",
  ],
  "stokkebye": [
    "stokkebye",
    "w.o. larsen",
    "larsen",
  ],
  "stanwell": [
    "stanwell",
  ],
  "davidoff": [
    "davidoff",
  ],
  // ── UK / British ───────────────────────────────────────────────────────────
  "samuel gawith": [
    "samuel gawith",
    "sam gawith",
    "s. gawith",
    "gawith",
    "gawith & hoggarth",
    "gawith hoggarth",
  ],
  "gawith hoggarth": [
    "gawith hoggarth",
    "gawith & hoggarth",
    "gawith and hoggarth",
    "g&h",
  ],
  "rattray's": [
    "rattray's",
    "rattrays",
    "rattray",
    "rattray & cie",
    "charles rattray",
  ],
  "fribourg & treyer": [
    "fribourg & treyer",
    "fribourg and treyer",
    "fribourg treyer",
    "f&t",
  ],
  "robert mcconnell": [
    "robert mcconnell",
    "mcconnell",
    "r mcconnell",
  ],
  "dunhill": [
    "dunhill",
    "alfred dunhill",
    "a. dunhill",
  ],
  "peterson": [
    "peterson",
    "peterson of dublin",
    "peterson's",
  ],
  "mclelland": [
    "mclelland",
    "mcclelland",
    "mc clelland",
  ],
  "ashton": [
    "ashton",
  ],
  "savinelli": [
    "savinelli",
  ],
  "castello": [
    "castello",
  ],
  // ── American ───────────────────────────────────────────────────────────────
  "cornell & diehl": [
    "cornell & diehl",
    "cornell and diehl",
    "c&d",
    "c & d",
  ],
  "gl pease": [
    "gl pease",
    "g.l. pease",
    "g l pease",
    "pease",
    "gp tobacco",
  ],
  "mcclelland": [
    "mcclelland",
    "mclelland",
    "mc clelland",
  ],
  "lane limited": [
    "lane limited",
    "lane",
    "lane ltd",
  ],
  "orlik": [
    "orlik",
  ],
  "stokkebye": [
    "stokkebye",
  ],
  "sutliff": [
    "sutliff",
    "sutliff tobacco",
  ],
  "hearth & home": [
    "hearth & home",
    "hearth and home",
    "h&h",
  ],
  "esoterica": [
    "esoterica",
    "esoterica tobacciana",
  ],
  "pipes & cigars": [
    "pipes & cigars",
    "pipes and cigars",
    "p&c",
  ],
  "blending room": [
    "blending room",
  ],
  "tobacco by mike": [
    "tobacco by mike",
    "tbm",
  ],
  // ── Nordic / Scandinavian ──────────────────────────────────────────────────
  "w.o. larsen": [
    "w.o. larsen",
    "wo larsen",
    "larsen",
    "w o larsen",
  ],
  "amphora": [
    "amphora",
  ],
  // ── Eastern European / Other ───────────────────────────────────────────────
  "balkanski govedari": [
    "balkanski govedari",
  ],
  "kavalan": [
    "kavalan",
  ],
};

/**
 * Given a normalized (lowercase) manufacturer name, return an array of all
 * alias strings for that manufacturer, including the canonical form.
 * Returns empty array if no aliases found.
 */
export function getManufacturerAliases(normalizedName) {
  if (!normalizedName) return [];
  const direct = MANUFACTURER_ALIASES[normalizedName];
  if (direct) return direct;

  // Partial key match — check if the input is contained in a key or vice versa
  const matches = [];
  for (const [key, aliases] of Object.entries(MANUFACTURER_ALIASES)) {
    if (
      key.includes(normalizedName) ||
      normalizedName.includes(key) ||
      aliases.some((a) => a === normalizedName)
    ) {
      matches.push(...aliases);
    }
  }
  return [...new Set(matches)];
}

/**
 * Build a flat lookup: alias → canonical key.
 * Used to normalize manufacturer names to canonical form during indexing/matching.
 */
const _aliasToCanonical = new Map();
for (const [canonical, aliases] of Object.entries(MANUFACTURER_ALIASES)) {
  for (const alias of aliases) {
    _aliasToCanonical.set(alias, canonical);
  }
}

/**
 * Given a normalized manufacturer name, return its canonical form if known,
 * or the input itself if not found.
 */
export function canonicalizeManufacturer(normalizedName) {
  return _aliasToCanonical.get(normalizedName) || normalizedName;
}
