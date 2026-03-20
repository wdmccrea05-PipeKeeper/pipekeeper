/**
 * CANONICAL TOBACCO CLASSIFICATION & NORMALIZATION LAYER
 * 
 * Single source of truth for:
 *   - canonical blend family categories (matches TobaccoBlend.blend_type enum)
 *   - user-input normalization (handling freeform variants)
 *   - taxonomy relationships (family hierarchies, common aliases)
 * 
 * Used by: Expert Tobacconist, Curator actions, reclassification workflows
 */

// ─── CANONICAL BLEND FAMILIES ────────────────────────────────────────────────
// These are the authoritative blend type values from TobaccoBlend entity schema.
// All normalization and classification logic maps towards these canonical values.

export const CANONICAL_BLEND_FAMILIES = {
  AMERICAN: "American",
  AROMATIC: "Aromatic",
  BALKAN: "Balkan",
  BURLEY: "Burley",
  BURLEY_BASED: "Burley-based",
  CAVENDISH: "Cavendish",
  CODGER_BLEND: "Codger Blend",
  DARK_FIRED_KENTUCKY: "Dark Fired Kentucky",
  ENGLISH: "English",
  ENGLISH_AROMATIC: "English Aromatic",
  ENGLISH_BALKAN: "English Balkan",
  FULL_ENGLISH_ORIENTAL: "Full English/Oriental",
  KENTUCKY: "Kentucky",
  LAKELAND: "Lakeland",
  LATAKIA_BLEND: "Latakia Blend",
  NAVY_FLAKE: "Navy Flake",
  ORIENTAL_TURKISH: "Oriental/Turkish",
  OTHER: "Other",
  PERIQUE: "Perique",
  SHAG: "Shag",
  VIRGINIA: "Virginia",
  VIRGINIA_BURLEY: "Virginia/Burley",
  VIRGINIA_ORIENTAL: "Virginia/Oriental",
  VIRGINIA_PERIQUE: "Virginia/Perique",
};

export const CANONICAL_BLEND_FAMILIES_LIST = Object.values(CANONICAL_BLEND_FAMILIES);

// ─── NORMALIZATION MAP ──────────────────────────────────────────────────────
// Maps freeform user-input variants to canonical blend family values.
// Handles common typos, abbreviations, spacing, case variations.
// DETERMINISTIC: same input always → same output.

export const BLEND_NORMALIZATION_MAP = {
  // Virginia family
  "virginia": CANONICAL_BLEND_FAMILIES.VIRGINIA,
  "va": CANONICAL_BLEND_FAMILIES.VIRGINIA,
  "virg": CANONICAL_BLEND_FAMILIES.VIRGINIA,
  "virgina": CANONICAL_BLEND_FAMILIES.VIRGINIA,
  "virginias": CANONICAL_BLEND_FAMILIES.VIRGINIA,
  "virginia flakes": CANONICAL_BLEND_FAMILIES.VIRGINIA,
  "pure virginia": CANONICAL_BLEND_FAMILIES.VIRGINIA,
  "straight virginia": CANONICAL_BLEND_FAMILIES.VIRGINIA,
  "virginia leaf": CANONICAL_BLEND_FAMILIES.VIRGINIA,
  "virginia tobacco": CANONICAL_BLEND_FAMILIES.VIRGINIA,

  // Virginia/Perique
  "virginia/perique": CANONICAL_BLEND_FAMILIES.VIRGINIA_PERIQUE,
  "va/per": CANONICAL_BLEND_FAMILIES.VIRGINIA_PERIQUE,
  "va/perique": CANONICAL_BLEND_FAMILIES.VIRGINIA_PERIQUE,
  "vaper": CANONICAL_BLEND_FAMILIES.VIRGINIA_PERIQUE,
  "va per": CANONICAL_BLEND_FAMILIES.VIRGINIA_PERIQUE,
  "virginia perique": CANONICAL_BLEND_FAMILIES.VIRGINIA_PERIQUE,
  "virgina/perique": CANONICAL_BLEND_FAMILIES.VIRGINIA_PERIQUE,
  "virginia & perique": CANONICAL_BLEND_FAMILIES.VIRGINIA_PERIQUE,
  "va & perique": CANONICAL_BLEND_FAMILIES.VIRGINIA_PERIQUE,
  "virginia+perique": CANONICAL_BLEND_FAMILIES.VIRGINIA_PERIQUE,

  // Virginia/Burley
  "virginia/burley": CANONICAL_BLEND_FAMILIES.VIRGINIA_BURLEY,
  "va/burley": CANONICAL_BLEND_FAMILIES.VIRGINIA_BURLEY,
  "virginia burley": CANONICAL_BLEND_FAMILIES.VIRGINIA_BURLEY,
  "virginia & burley": CANONICAL_BLEND_FAMILIES.VIRGINIA_BURLEY,
  "va burley": CANONICAL_BLEND_FAMILIES.VIRGINIA_BURLEY,

  // Virginia/Oriental
  "virginia/oriental": CANONICAL_BLEND_FAMILIES.VIRGINIA_ORIENTAL,
  "va/oriental": CANONICAL_BLEND_FAMILIES.VIRGINIA_ORIENTAL,
  "virginia oriental": CANONICAL_BLEND_FAMILIES.VIRGINIA_ORIENTAL,
  "virginia & oriental": CANONICAL_BLEND_FAMILIES.VIRGINIA_ORIENTAL,

  // Burley family
  "burley": CANONICAL_BLEND_FAMILIES.BURLEY,
  "burly": CANONICAL_BLEND_FAMILIES.BURLEY,
  "burleys": CANONICAL_BLEND_FAMILIES.BURLEY,
  "burley tobacco": CANONICAL_BLEND_FAMILIES.BURLEY,
  "pure burley": CANONICAL_BLEND_FAMILIES.BURLEY,
  "straight burley": CANONICAL_BLEND_FAMILIES.BURLEY,
  "burley-based": CANONICAL_BLEND_FAMILIES.BURLEY_BASED,
  "burley based": CANONICAL_BLEND_FAMILIES.BURLEY_BASED,

  // English family
  "english": CANONICAL_BLEND_FAMILIES.ENGLISH,
  "english blend": CANONICAL_BLEND_FAMILIES.ENGLISH,
  "eng": CANONICAL_BLEND_FAMILIES.ENGLISH,
  "englishe": CANONICAL_BLEND_FAMILIES.ENGLISH,
  "english blends": CANONICAL_BLEND_FAMILIES.ENGLISH,

  // English Aromatic
  "english aromatic": CANONICAL_BLEND_FAMILIES.ENGLISH_AROMATIC,
  "english arom": CANONICAL_BLEND_FAMILIES.ENGLISH_AROMATIC,
  "english aro": CANONICAL_BLEND_FAMILIES.ENGLISH_AROMATIC,
  "aromatic english": CANONICAL_BLEND_FAMILIES.ENGLISH_AROMATIC,

  // English Balkan
  "english balkan": CANONICAL_BLEND_FAMILIES.ENGLISH_BALKAN,
  "eng balkan": CANONICAL_BLEND_FAMILIES.ENGLISH_BALKAN,
  "balkan english": CANONICAL_BLEND_FAMILIES.ENGLISH_BALKAN,

  // Full English/Oriental
  "full english/oriental": CANONICAL_BLEND_FAMILIES.FULL_ENGLISH_ORIENTAL,
  "full english oriental": CANONICAL_BLEND_FAMILIES.FULL_ENGLISH_ORIENTAL,
  "full english & oriental": CANONICAL_BLEND_FAMILIES.FULL_ENGLISH_ORIENTAL,

  // Balkan family
  "balkan": CANONICAL_BLEND_FAMILIES.BALKAN,
  "balkans": CANONICAL_BLEND_FAMILIES.BALKAN,
  "balkan blend": CANONICAL_BLEND_FAMILIES.BALKAN,
  "balkan tobacco": CANONICAL_BLEND_FAMILIES.BALKAN,
  "balkanic": CANONICAL_BLEND_FAMILIES.BALKAN,

  // Aromatic family
  "aromatic": CANONICAL_BLEND_FAMILIES.AROMATIC,
  "arom": CANONICAL_BLEND_FAMILIES.AROMATIC,
  "aromatc": CANONICAL_BLEND_FAMILIES.AROMATIC,
  "aromatics": CANONICAL_BLEND_FAMILIES.AROMATIC,
  "aromatic blend": CANONICAL_BLEND_FAMILIES.AROMATIC,
  "aromatic tobacco": CANONICAL_BLEND_FAMILIES.AROMATIC,

  // Latakia family
  "latakia": CANONICAL_BLEND_FAMILIES.LATAKIA_BLEND,
  "latakia blend": CANONICAL_BLEND_FAMILIES.LATAKIA_BLEND,
  "latakia tobacco": CANONICAL_BLEND_FAMILIES.LATAKIA_BLEND,
  "latakia-forward": CANONICAL_BLEND_FAMILIES.LATAKIA_BLEND,
  "latakia forward": CANONICAL_BLEND_FAMILIES.LATAKIA_BLEND,

  // Oriental/Turkish
  "oriental": CANONICAL_BLEND_FAMILIES.ORIENTAL_TURKISH,
  "oriental/turkish": CANONICAL_BLEND_FAMILIES.ORIENTAL_TURKISH,
  "oriental turkish": CANONICAL_BLEND_FAMILIES.ORIENTAL_TURKISH,
  "oriental & turkish": CANONICAL_BLEND_FAMILIES.ORIENTAL_TURKISH,
  "turkish": CANONICAL_BLEND_FAMILIES.ORIENTAL_TURKISH,
  "turkish blend": CANONICAL_BLEND_FAMILIES.ORIENTAL_TURKISH,

  // Cavendish family
  "cavendish": CANONICAL_BLEND_FAMILIES.CAVENDISH,
  "cavendish blend": CANONICAL_BLEND_FAMILIES.CAVENDISH,
  "cavendish tobacco": CANONICAL_BLEND_FAMILIES.CAVENDISH,
  "cavandish": CANONICAL_BLEND_FAMILIES.CAVENDISH,

  // Kentucky family
  "kentucky": CANONICAL_BLEND_FAMILIES.KENTUCKY,
  "dark fired kentucky": CANONICAL_BLEND_FAMILIES.DARK_FIRED_KENTUCKY,
  "dfk": CANONICAL_BLEND_FAMILIES.DARK_FIRED_KENTUCKY,
  "dark fired": CANONICAL_BLEND_FAMILIES.DARK_FIRED_KENTUCKY,

  // American
  "american": CANONICAL_BLEND_FAMILIES.AMERICAN,
  "american blend": CANONICAL_BLEND_FAMILIES.AMERICAN,
  "american tobacco": CANONICAL_BLEND_FAMILIES.AMERICAN,

  // Perique
  "perique": CANONICAL_BLEND_FAMILIES.PERIQUE,
  "perrique": CANONICAL_BLEND_FAMILIES.PERIQUE,
  "pure perique": CANONICAL_BLEND_FAMILIES.PERIQUE,
  "straight perique": CANONICAL_BLEND_FAMILIES.PERIQUE,

  // Navy Flake
  "navy flake": CANONICAL_BLEND_FAMILIES.NAVY_FLAKE,
  "navy": CANONICAL_BLEND_FAMILIES.NAVY_FLAKE,

  // Codger Blend
  "codger": CANONICAL_BLEND_FAMILIES.CODGER_BLEND,
  "codger blend": CANONICAL_BLEND_FAMILIES.CODGER_BLEND,

  // Lakeland
  "lakeland": CANONICAL_BLEND_FAMILIES.LAKELAND,
  "lakeland blend": CANONICAL_BLEND_FAMILIES.LAKELAND,

  // Shag
  "shag": CANONICAL_BLEND_FAMILIES.SHAG,
  "shag tobacco": CANONICAL_BLEND_FAMILIES.SHAG,

  // Fallback
  "other": CANONICAL_BLEND_FAMILIES.OTHER,
  "unknown": CANONICAL_BLEND_FAMILIES.OTHER,
  "generic": CANONICAL_BLEND_FAMILIES.OTHER,
  "mixed": CANONICAL_BLEND_FAMILIES.OTHER,
  "blend": CANONICAL_BLEND_FAMILIES.OTHER,
  "tobacco": CANONICAL_BLEND_FAMILIES.OTHER,
};

// ─── HELPER: Normalize User Input ───────────────────────────────────────────

/**
 * Normalize a user-entered tobacco classification to a canonical blend family.
 * Returns canonical value or null if no match found.
 * 
 * @param {string} input - User-entered blend type (case-insensitive, spaces normalized)
 * @returns {string|null} - Canonical blend family or null
 */
export function normalizeBlendType(input) {
  if (!input || typeof input !== "string") return null;
  const normalized = input.trim().toLowerCase();
  return BLEND_NORMALIZATION_MAP[normalized] || null;
}

/**
 * Check if a blend type is a freeform variant (not yet canonical).
 * 
 * @param {string} blendType - User-entered blend type
 * @returns {boolean} - true if needs normalization, false if already canonical
 */
export function needsNormalization(blendType) {
  if (!blendType) return false;
  if (!CANONICAL_BLEND_FAMILIES_LIST.includes(blendType)) return true;
  return false;
}

/**
 * Suggest a canonical value for a non-canonical blend type.
 * Returns suggested canonical value or null.
 * 
 * @param {string} blendType - User-entered blend type
 * @returns {string|null} - Suggested canonical value
 */
export function suggestBlendTypeNormalization(blendType) {
  if (CANONICAL_BLEND_FAMILIES_LIST.includes(blendType)) return null; // Already canonical
  return normalizeBlendType(blendType);
}

// ─── BLEND FAMILY GROUPINGS ─────────────────────────────────────────────────
// Meta-groupings for analysis and recommendations.

export const BLEND_FAMILY_GROUPS = {
  VIRGINIA_FORWARD: [
    CANONICAL_BLEND_FAMILIES.VIRGINIA,
    CANONICAL_BLEND_FAMILIES.VIRGINIA_PERIQUE,
    CANONICAL_BLEND_FAMILIES.VIRGINIA_BURLEY,
    CANONICAL_BLEND_FAMILIES.VIRGINIA_ORIENTAL,
    CANONICAL_BLEND_FAMILIES.NAVY_FLAKE,
  ],
  ENGLISH_STYLE: [
    CANONICAL_BLEND_FAMILIES.ENGLISH,
    CANONICAL_BLEND_FAMILIES.ENGLISH_AROMATIC,
    CANONICAL_BLEND_FAMILIES.ENGLISH_BALKAN,
    CANONICAL_BLEND_FAMILIES.FULL_ENGLISH_ORIENTAL,
    CANONICAL_BLEND_FAMILIES.LATAKIA_BLEND,
  ],
  AROMATIC: [
    CANONICAL_BLEND_FAMILIES.AROMATIC,
    CANONICAL_BLEND_FAMILIES.LAKELAND,
    CANONICAL_BLEND_FAMILIES.ENGLISH_AROMATIC,
  ],
  BALKAN: [
    CANONICAL_BLEND_FAMILIES.BALKAN,
    CANONICAL_BLEND_FAMILIES.ENGLISH_BALKAN,
    CANONICAL_BLEND_FAMILIES.ORIENTAL_TURKISH,
  ],
  BURLEY_HEAVY: [
    CANONICAL_BLEND_FAMILIES.BURLEY,
    CANONICAL_BLEND_FAMILIES.BURLEY_BASED,
    CANONICAL_BLEND_FAMILIES.VIRGINIA_BURLEY,
    CANONICAL_BLEND_FAMILIES.DARK_FIRED_KENTUCKY,
    CANONICAL_BLEND_FAMILIES.KENTUCKY,
    CANONICAL_BLEND_FAMILIES.AMERICAN,
  ],
  SPECIALTY: [
    CANONICAL_BLEND_FAMILIES.PERIQUE,
    CANONICAL_BLEND_FAMILIES.CAVENDISH,
    CANONICAL_BLEND_FAMILIES.CODGER_BLEND,
    CANONICAL_BLEND_FAMILIES.SHAG,
  ],
};

/**
 * Categorize a blend family into its meta-group.
 * 
 * @param {string} blendFamily - Canonical blend family
 * @returns {string|null} - Group name or null
 */
export function getBlendFamilyGroup(blendFamily) {
  for (const [groupName, families] of Object.entries(BLEND_FAMILY_GROUPS)) {
    if (families.includes(blendFamily)) {
      return groupName;
    }
  }
  return null;
}

// ─── CELLAR CHARACTERISTICS ─────────────────────────────────────────────────
// For Expert Tobacconist analysis: which blend families are aging-worthy, etc.

export const CELLAR_CHARACTERISTICS = {
  [CANONICAL_BLEND_FAMILIES.VIRGINIA]: {
    aging_potential: "excellent",
    age_sweetens: true,
    typical_age_range: "5-20+ years",
    cellar_priority: "high",
  },
  [CANONICAL_BLEND_FAMILIES.VIRGINIA_PERIQUE]: {
    aging_potential: "excellent",
    age_sweetens: true,
    typical_age_range: "3-15+ years",
    cellar_priority: "high",
  },
  [CANONICAL_BLEND_FAMILIES.VIRGINIA_BURLEY]: {
    aging_potential: "good",
    age_sweetens: true,
    typical_age_range: "3-10 years",
    cellar_priority: "high",
  },
  [CANONICAL_BLEND_FAMILIES.LATAKIA_BLEND]: {
    aging_potential: "excellent",
    age_mellows: true,
    typical_age_range: "3-20+ years",
    cellar_priority: "high",
  },
  [CANONICAL_BLEND_FAMILIES.BALKAN]: {
    aging_potential: "excellent",
    age_mellows: true,
    typical_age_range: "5-15+ years",
    cellar_priority: "high",
  },
  [CANONICAL_BLEND_FAMILIES.ENGLISH]: {
    aging_potential: "excellent",
    age_mellows: true,
    typical_age_range: "3-15+ years",
    cellar_priority: "high",
  },
  [CANONICAL_BLEND_FAMILIES.ENGLISH_BALKAN]: {
    aging_potential: "excellent",
    age_mellows: true,
    typical_age_range: "3-15+ years",
    cellar_priority: "high",
  },
  [CANONICAL_BLEND_FAMILIES.DARK_FIRED_KENTUCKY]: {
    aging_potential: "good",
    age_mellows: true,
    typical_age_range: "2-10 years",
    cellar_priority: "medium",
  },
  [CANONICAL_BLEND_FAMILIES.AROMATIC]: {
    aging_potential: "fair",
    age_mellows: false,
    typical_age_range: "1-5 years",
    cellar_priority: "low",
  },
  [CANONICAL_BLEND_FAMILIES.CAVENDISH]: {
    aging_potential: "fair",
    age_mellows: false,
    typical_age_range: "1-3 years",
    cellar_priority: "low",
  },
};

/**
 * Get cellar characteristics for a blend family.
 * 
 * @param {string} blendFamily - Canonical blend family
 * @returns {object|null} - Cellar characteristics or null
 */
export function getCellarCharacteristics(blendFamily) {
  return CELLAR_CHARACTERISTICS[blendFamily] || null;
}

/**
 * Determine if a blend is aging-worthy (prioritized for cellaring).
 * 
 * @param {string} blendFamily - Canonical blend family
 * @returns {boolean} - true if cellar-priority is high
 */
export function isAgingWorthy(blendFamily) {
  const chars = getCellarCharacteristics(blendFamily);
  return chars && chars.cellar_priority === "high";
}