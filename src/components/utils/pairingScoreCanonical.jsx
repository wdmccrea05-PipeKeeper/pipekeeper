import { expandPipesToVariants } from "@/components/utils/pipeVariants";

/**
 * CANONICAL pairing scorer — single source of truth for tobacco ⇄ pipe compatibility.
 *
 * Used by: PairingMatrix / PairingGrid, MatchingEngine, TopPipeMatches,
 * TopBlendMatches, TobaccoDetail (Best Pipes), aiGenerators.
 *
 * Model: multi-dimensional weighted compatibility.
 *   technicalScore = Σ(component.score × component.weight)
 *   finalScore     = technicalScore                    (no personalization evidence)
 *                or = technicalScore × 0.80 + personalFit × 0.20
 *
 * Personal preference factors are kept SEPARATE from the technical score so
 * that a pipe/blend pairing can be explained on physical/technical grounds.
 */

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const round1 = (n) => Math.round(n * 10) / 10;

const toArray = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);
const lower = (v) => String(v ?? "").toLowerCase().trim();
const joinText = (v) => toArray(v).map((x) => lower(x)).join(" ");

/* ------------------------------------------------------------------ *
 * Component weights
 * ------------------------------------------------------------------ */
export const COMPONENT_WEIGHTS = Object.freeze({
  dedication: 0.30,
  chamberGeometry: 0.20,
  tobaccoCut: 0.15,
  blendComposition: 0.15,
  aromaticCompatibility: 0.10,
  material: 0.05,
  smokingCharacter: 0.05,
});


export const AROMATIC_CLASSIFICATION_PRECEDENCE = Object.freeze([
  'explicit is_aromatic boolean',
  'explicit blend family/type identifying aromatic',
  'structured casing/topping metadata identifying added aromatic flavoring',
  'explicit aromatic_intensity metadata',
  'recognized structurally non-aromatic family',
  'otherwise unknown',
]);

export const BLEND_FAMILY_NORMALIZATION_RULES = Object.freeze([
  'lakeland when explicit lakeland metadata exists',
  'aromatic when aromatic classification is explicit or strongly evidenced',
  'balkan when explicit balkan metadata exists',
  'english when explicit english/oriental/latakia metadata exists',
  'vaper only when explicit Virginia/Perique metadata exists or both Virginia and Perique are confirmed in composition',
  'darkFired when explicit dark-fired/Kentucky metadata exists',
  'burley when explicit burley/codger/American metadata exists',
  'virginia when explicit Virginia metadata exists or composition is Virginia-led without stronger evidence',
  'unknown/other when evidence is insufficient',
]);

export const GEOMETRY_INFERENCE_HIERARCHY = Object.freeze([
  'measured chamber dimensions',
  'explicit chamber volume/size metadata',
  'reliable bowl-style inference',
  'weak shape inference',
  'unknown',
]);

export const MATERIAL_SCORING_RATIONALE = Object.freeze({
  meerschaum: 'Small bonus for low ghosting and neutral flavour carryover, especially useful for aromatics and ghost-sensitive leaf.',
  cob: 'Small bonus when moisture forgiveness or easy cross-blend use helps, especially with aromatics and burley-forward blends.',
  clay: 'Useful for flavour purity with Virginia/VaPer leaf, but slightly penalised for hot/wet heavy aromatics.',
  morta: 'Near-neutral, low-carryover wood-like material.',
  briar: 'Neutral baseline reference material.',
  cherryWood: 'Slight penalty because fruitwoods can add their own sweetness or character.',
  oliveWood: 'Slight penalty because fruitwoods can add their own sweetness or character.',
  other: 'Unknown material treated as neutral baseline.',
});

export const COMPONENT_RULES = Object.freeze([
  {
    rule: 'Dedication / ghosting fit',
    rawInputs: ['pipe.focus', 'blend.name', 'blend.blend_type', 'blend.blend_family', 'blend.tobacco_components', 'blend.is_aromatic'],
    component: 'dedication',
    weight: COMPONENT_WEIGHTS.dedication,
    confidence: 'strong compatibility signal',
    rationale: 'Dedicated pipes mainly matter through ghosting risk and family-specific purpose matching.',
  },
  {
    rule: 'Chamber geometry fit',
    rawInputs: ['pipe.bowl_diameter_mm', 'pipe.bowl_depth_mm', 'pipe.chamber_volume', 'pipe.shape', 'pipe.bowlStyle', 'blend.cut', 'blend.blend_family', 'blend.aromatic_intensity'],
    component: 'chamberGeometry',
    weight: COMPONENT_WEIGHTS.chamberGeometry,
    confidence: 'strong compatibility signal when measured; fallback inference otherwise',
    rationale: 'Measured chamber geometry is a primary physical compatibility signal; inferred geometry is damped toward neutral.',
  },
  {
    rule: 'Cut / packing behaviour',
    rawInputs: ['blend.cut', 'pipe.bowl_diameter_mm', 'pipe.bowl_depth_mm', 'pipe.chamber_volume', 'pipe.shape', 'pipe.bowlStyle'],
    component: 'tobaccoCut',
    weight: COMPONENT_WEIGHTS.tobaccoCut,
    confidence: 'moderate expert heuristic',
    rationale: 'Cut influences packing density and burn rate, but should not dominate ghosting or geometry fundamentals.',
  },
  {
    rule: 'Leaf-composition geometry fit',
    rawInputs: ['blend.tobacco_components', 'blend.blend_type', 'pipe.bowl_diameter_mm', 'pipe.chamber_volume'],
    component: 'blendComposition',
    weight: COMPONENT_WEIGHTS.blendComposition,
    confidence: 'moderate expert heuristic',
    rationale: 'Virginia, Latakia, Perique, and dark-fired leaf respond differently to chamber width and airflow.',
  },
  {
    rule: 'Aromatic moisture / topping behaviour',
    rawInputs: ['blend.is_aromatic', 'blend.aromatic_intensity', 'pipe.bowl_diameter_mm', 'pipe.chamber_volume'],
    component: 'aromaticCompatibility',
    weight: COMPONENT_WEIGHTS.aromaticCompatibility,
    confidence: 'moderate expert heuristic',
    rationale: 'Topped blends often benefit from more room and can punish tiny wet-smoking chambers.',
  },
  {
    rule: 'Material-specific compatibility',
    rawInputs: ['pipe.bowl_material', 'blend.is_aromatic', 'blend.blend_family'],
    component: 'material',
    weight: COMPONENT_WEIGHTS.material,
    confidence: 'weak tendency',
    rationale: 'Material only receives small, defensible adjustments tied to ghosting, flavour carryover, or heat behaviour.',
  },
  {
    rule: 'Smoking character fit',
    rawInputs: ['pipe.usage_characteristics', 'pipe.smoking_characteristics', 'blend.is_aromatic', 'blend.aromatic_intensity', 'blend.cut', 'blend.blend_family'],
    component: 'smokingCharacter',
    weight: COMPONENT_WEIGHTS.smokingCharacter,
    confidence: 'weak tendency',
    rationale: 'Recorded smoking behaviour can refine otherwise-close matches, but only modestly.',
  },
]);

export const SCORER_VARIABLE_INVENTORY = Object.freeze([
  { field: 'pipe.focus', normalization: 'normalizeFocus()', component: 'dedication', scoringEffect: 'dedication family and explicitness', missingDataBehavior: 'neutral dedication', confidenceEffect: 'lowers pipe confidence' },
  { field: 'pipe.bowl_diameter_mm', normalization: 'numeric mm → width category', component: 'chamberGeometry, tobaccoCut, blendComposition, aromaticCompatibility', scoringEffect: 'measured width drives geometry', missingDataBehavior: 'fallback to metadata/inference/neutral', confidenceEffect: 'major geometry confidence factor' },
  { field: 'pipe.bowl_depth_mm', normalization: 'numeric mm → depth category', component: 'chamberGeometry, tobaccoCut', scoringEffect: 'measured depth adjusts burn fit', missingDataBehavior: 'fallback to metadata/inference/neutral', confidenceEffect: 'major geometry confidence factor' },
  { field: 'pipe.chamber_volume', normalization: 'enum/derived volume', component: 'chamberGeometry, aromaticCompatibility, personalFit', scoringEffect: 'fallback geometry and session-size fit', missingDataBehavior: 'no fallback volume bonus', confidenceEffect: 'medium pipe-confidence factor' },
  { field: 'pipe.shape', normalization: 'weak shape geometry map', component: 'chamberGeometry', scoringEffect: 'weak fallback only for reliable shapes', missingDataBehavior: 'unknown geometry', confidenceEffect: 'shape inference lowers confidence' },
  { field: 'pipe.bowlStyle', normalization: 'reliable bowl-style geometry map', component: 'chamberGeometry', scoringEffect: 'reliable fallback when measured data absent', missingDataBehavior: 'unknown geometry', confidenceEffect: 'moderate confidence support' },
  { field: 'pipe.bowl_material', normalization: 'normalizeMaterial()', component: 'material', scoringEffect: 'small material adjustment', missingDataBehavior: 'neutral baseline', confidenceEffect: 'minor pipe-confidence factor' },
  { field: 'pipe.usage_characteristics', normalization: 'parseSmokingText()', component: 'smokingCharacter', scoringEffect: 'cool/hot/wet/open/restricted adjustments', missingDataBehavior: 'neutral smoking character', confidenceEffect: 'missing lowers pipe confidence' },
  { field: 'pipe.smoking_characteristics', normalization: 'parseSmokingText()', component: 'smokingCharacter', scoringEffect: 'same as usage_characteristics', missingDataBehavior: 'neutral smoking character', confidenceEffect: 'missing lowers pipe confidence' },
  { field: 'blend.name / tobacco_name', normalization: 'lower-cased exact-name compare', component: 'dedication', scoringEffect: 'exact named-blend dedication match', missingDataBehavior: 'no exact-match bonus', confidenceEffect: 'none' },
  { field: 'blend.blend_type / type', normalization: 'lower()', component: 'dedication, aromatic classification, blend family', scoringEffect: 'family classification and explicit aromatic/VaPer detection', missingDataBehavior: 'rely on other metadata', confidenceEffect: 'lowers tobacco confidence' },
  { field: 'blend.blend_family', normalization: 'lower()', component: 'aromatic classification, blend family', scoringEffect: 'family classification fallback', missingDataBehavior: 'rely on other metadata', confidenceEffect: 'lowers tobacco confidence' },
  { field: 'blend.is_aromatic', normalization: 'explicit boolean', component: 'dedication, aromaticCompatibility, blend family', scoringEffect: 'highest-priority aromatic classification', missingDataBehavior: 'tri-state remains possible', confidenceEffect: 'major tobacco-confidence factor' },
  { field: 'blend.aromatic_intensity', normalization: 'light/medium/heavy enum', component: 'aromaticCompatibility', scoringEffect: 'heavy/light aromatic geometry handling', missingDataBehavior: 'unknown aromatic intensity', confidenceEffect: 'supports tobacco confidence when present' },
  { field: 'blend.casing', normalization: 'structured flavoring treatment parser', component: 'aromatic classification', scoringEffect: 'can explicitly identify added flavouring but does not auto-classify every casing', missingDataBehavior: 'no flavoring-treatment evidence', confidenceEffect: 'supports confidence when explicit' },
  { field: 'blend.topping', normalization: 'structured flavoring treatment parser', component: 'aromatic classification', scoringEffect: 'can explicitly identify added flavouring but does not auto-classify every topping', missingDataBehavior: 'no flavoring-treatment evidence', confidenceEffect: 'supports confidence when explicit' },
  { field: 'blend.flavor_notes', normalization: 'joined lowercase text', component: 'aromatic intensity only after aromatic classification', scoringEffect: 'supports intensity/reasoning only', missingDataBehavior: 'no note-based intensity support', confidenceEffect: 'minor support only' },
  { field: 'blend.flavor_profile', normalization: 'joined lowercase text', component: 'aromatic intensity only after aromatic classification', scoringEffect: 'supports intensity/reasoning only', missingDataBehavior: 'no profile-based intensity support', confidenceEffect: 'minor support only' },
  { field: 'blend.tobacco_components', normalization: 'normalized component array', component: 'dedication, blendComposition, blend family', scoringEffect: 'composition and VaPer/Latakia evidence', missingDataBehavior: 'neutral composition score', confidenceEffect: 'major tobacco-confidence factor' },
  { field: 'blend.cut', normalization: 'lower()', component: 'tobaccoCut, chamberGeometry', scoringEffect: 'packing/burn heuristics', missingDataBehavior: 'neutral cut score', confidenceEffect: 'missing lowers tobacco confidence' },
  { field: 'blend.strength', normalization: 'mild/medium/full enum', component: 'personalFit only', scoringEffect: 'personal strength preference match', missingDataBehavior: 'no strength preference evidence', confidenceEffect: 'minor tobacco-confidence factor' },
  { field: 'profile.preferred_blend_types', normalization: 'normalized array', component: 'personalFit', scoringEffect: 'personalized family/type preference', missingDataBehavior: 'no personalization effect', confidenceEffect: 'none' },
  { field: 'profile.strength_preference', normalization: 'lower()', component: 'personalFit', scoringEffect: 'personalized strength preference', missingDataBehavior: 'no personalization effect', confidenceEffect: 'none' },
  { field: 'profile.smoke_duration_preference', normalization: 'lower() against chamber volume', component: 'personalFit', scoringEffect: 'personalized session-length fit', missingDataBehavior: 'no personalization effect', confidenceEffect: 'none' },
  { field: 'profile.pipe_size_preference', normalization: 'lower() against chamber volume', component: 'personalFit', scoringEffect: 'personalized size preference', missingDataBehavior: 'no personalization effect', confidenceEffect: 'none' },
]);

export const CONFIDENCE_FACTORS = Object.freeze({
  pipe: Object.freeze({
    geometryEvidence: 0.4,
    dedicationEvidence: 0.2,
    chamberVolumeEvidence: 0.15,
    materialEvidence: 0.1,
    smokingEvidence: 0.15,
  }),
  tobacco: Object.freeze({
    aromaticEvidence: 0.3,
    familyEvidence: 0.2,
    compositionEvidence: 0.25,
    cutEvidence: 0.15,
    strengthEvidence: 0.1,
  }),
});

/* ------------------------------------------------------------------ *
 * Keyword tables
 * ------------------------------------------------------------------ */

// Recognized aromatic category focus keywords
export const AROMATIC_FOCUS_KEYWORDS = ["aromatic", "aromatics"];

// Recognized non-aromatic blend-type category focus keywords.
// NOTE: "cavendish" is deliberately NOT here — Cavendish is a *processing*
// style used by both aromatic and non-aromatic blends.
export const NON_AROMATIC_FOCUS_KEYWORDS = [
  "english", "virginia", "burley", "balkan", "latakia",
  "oriental", "turkish", "virginia/perique", "vaper", "virginia/burley",
  "navy flake", "dark fired", "kentucky", "perique", "american",
  "burley-based", "lakeland",
];


const UTILITY_KEYWORDS = [
  "utility", "versatile", "multi", "multiple", "any", "general",
  "all-purpose", "all purpose", "everyday", "rotation",
];

// Flavor-note text may support intensity after aromatic classification,
// but never creates aromatic status on its own.
const HEAVY_AROMATIC_NOTE_RE =
  /(vanilla|cherry|maple|rum|caramel|honey|chocolate|coconut|amaretto|butterscotch|whisk(e)?y|bourbon|toffee|goopy|very sweet|strong topping|heavy topping|syrup|intense)/;

const LIGHT_AROMATIC_NOTE_RE =
  /(light topping|subtle|hint of|mild casing|lightly cased|light casing)/;

const EXPLICIT_FLAVORING_TREATMENT_RE =
  /(vanilla|cherry|maple|rum|bourbon|whisk(e)?y|caramel|chocolate|cocoa|coconut|amaretto|butterscotch|fruit|berry|citrus|plum|fig|honey|molasses|liqueur|floral|lakeland|topping|syrup)/;

// Blend types whose structure is unambiguously non-aromatic
const KNOWN_NON_AROMATIC_BLEND_TYPES = [
  "english", "balkan", "english balkan", "full english/oriental",
  "latakia blend", "oriental/turkish", "virginia", "virginia/oriental",
  "virginia/perique", "perique", "dark fired kentucky", "kentucky",
  "burley", "burley-based",
];

// Blend types that say nothing about casing/topping either way
const AMBIGUOUS_BLEND_TYPES = [
  "cavendish", "navy flake", "virginia/burley", "american", "codger blend",
  "shag", "other", "lakeland", "plug",
];

/* ------------------------------------------------------------------ *
 * Tobacco normalization
 * ------------------------------------------------------------------ */

function blendTypeOf(blend) {
  return lower(blend?.blend_type || blend?.type || "");
}

function flavorTextOf(blend) {
  return [joinText(blend?.flavor_notes), joinText(blend?.flavor_profile)].join(" ").trim();
}

function hasMeaningfulValue(v) {
  const s = lower(v);
  return !!s && s !== 'none' && s !== 'unknown' && s !== 'n/a';
}

function parseFlavoringTreatment(blend) {
  const casing = lower(blend?.casing);
  const topping = lower(blend?.topping);
  const joined = [casing, topping].filter(Boolean).join(' ').trim();
  if (!joined) {
    return { hasFlavoringTreatment: false, explicitAromaticFlavoring: false, source: 'none', text: '' };
  }
  const hasTreatment = [casing, topping].some(hasMeaningfulValue);
  const explicitAromaticFlavoring = hasTreatment && EXPLICIT_FLAVORING_TREATMENT_RE.test(joined);
  return {
    hasFlavoringTreatment: hasTreatment,
    explicitAromaticFlavoring,
    source: explicitAromaticFlavoring ? 'structured_flavoring' : 'generic_treatment',
    text: joined,
  };
}

/**
 * True when the blend's *structure* (blend type / components) is a recognized
 * non-aromatic family. Does not look at explicit aromatic fields.
 */
export function isKnownNonAromaticBlend(blend) {
  const bt = blendTypeOf(blend);
  if (!bt) return false;
  if (bt.includes("aromatic")) return false;
  if (AMBIGUOUS_BLEND_TYPES.includes(bt)) return false;
  return KNOWN_NON_AROMATIC_BLEND_TYPES.includes(bt);
}

/**
 * Infer aromatic status + intensity from all available fields.
 * Returns { isAromatic: true|false|null, intensity: 'light'|'medium'|'heavy'|null, source }
 *
 * IMPORTANT: nicotine strength is NEVER used as a proxy for aromatic intensity.
 */
export function inferAromaticFromFields(blend) {
  const explicitIntensity = normalizeIntensityValue(blend?.aromatic_intensity);
  const treatment = parseFlavoringTreatment(blend);

  // 1. Explicit boolean field wins
  if (typeof blend?.is_aromatic === 'boolean') {
    return {
      isAromatic: blend.is_aromatic,
      intensity: blend.is_aromatic ? explicitIntensity ?? intensityFromNotes(blend) : null,
      source: 'explicit_field',
      hasFlavoringTreatment: treatment.hasFlavoringTreatment,
    };
  }

  // 2. Explicit family/type metadata that literally identifies an aromatic
  const bt = blendTypeOf(blend);
  const family = lower(blend?.blend_family);
  if (bt.includes('aromatic')) {
    return {
      isAromatic: true,
      intensity: explicitIntensity ?? intensityFromNotes(blend),
      source: 'blend_type',
      hasFlavoringTreatment: treatment.hasFlavoringTreatment,
    };
  }
  if (family.includes('aromatic')) {
    return {
      isAromatic: true,
      intensity: explicitIntensity ?? intensityFromNotes(blend),
      source: 'blend_family',
      hasFlavoringTreatment: treatment.hasFlavoringTreatment,
    };
  }

  // 3. Structured flavoring metadata can identify added aromatic flavouring.
  if (treatment.explicitAromaticFlavoring) {
    return {
      isAromatic: true,
      intensity: explicitIntensity ?? intensityFromNotes(blend),
      source: 'structured_flavoring',
      hasFlavoringTreatment: true,
    };
  }

  // 4. Explicit aromatic intensity is direct aromatic metadata.
  if (explicitIntensity) {
    return {
      isAromatic: true,
      intensity: explicitIntensity,
      source: 'aromatic_intensity',
      hasFlavoringTreatment: treatment.hasFlavoringTreatment,
    };
  }

  // 5. Structurally-known non-aromatic families.
  if (isKnownNonAromaticBlend(blend)) {
    return {
      isAromatic: false,
      intensity: null,
      source: 'blend_type_structure',
      hasFlavoringTreatment: treatment.hasFlavoringTreatment,
    };
  }

  // 6. Unknown — natural tasting notes do not create aromatic status.
  return {
    isAromatic: null,
    intensity: null,
    source: 'unknown',
    hasFlavoringTreatment: treatment.hasFlavoringTreatment,
  };
}

function normalizeIntensityValue(v) {
  const s = lower(v);
  if (s === "light" || s === "mild") return "light";
  if (s === "medium" || s === "moderate") return "medium";
  if (s === "heavy" || s === "strong") return "heavy";
  return null;
}

function intensityFromNotes(blend) {
  const notes = flavorTextOf(blend);
  if (!notes) return null;
  if (LIGHT_AROMATIC_NOTE_RE.test(notes)) return "light";
  if (HEAVY_AROMATIC_NOTE_RE.test(notes)) return "heavy";
  return null;
}

function normalizeComponents(blend) {
  return toArray(blend?.tobacco_components)
    .map((c) => lower(c))
    .filter(Boolean);
}

function normalizeStrength(blend) {
  const s = lower(blend?.strength);
  if (!s) return null;
  if (s.includes("full")) return "full";
  if (s.includes("mild")) return "mild";
  if (s.includes("medium")) return "medium";
  return null;
}

const FLAKE_CUTS = new Set(["flake", "coin", "plug", "broken flake", "navy flake", "crumble cake", "rope", "twist"]);

function normalizeCut(blend) {
  const c = lower(blend?.cut);
  if (!c) return null;
  return c;
}

function inferBlendFamily(blend, aromaticInfo, components) {
  const bt = blendTypeOf(blend);
  const family = lower(blend?.blend_family);
  const comps = components.join(' ');
  const all = `${bt} ${family} ${comps}`;
  const hasVirginia = /virginia/.test(comps) || bt.includes('virginia') || family.includes('virginia');
  const hasPerique = /perique/.test(comps) || bt.includes('perique') || family.includes('perique');
  const hasLatakia = /latakia/.test(comps) || bt.includes('latakia') || family.includes('latakia');
  const hasOriental = /oriental|turkish/.test(comps) || bt.includes('oriental') || bt.includes('turkish') || family.includes('oriental');
  const hasBurley = /burley/.test(comps) || bt.includes('burley') || family.includes('burley');
  const hasDarkFired = /dark fired|dark-fired|kentucky/.test(comps) || bt.includes('dark fired') || family.includes('dark fired') || bt === 'kentucky';

  if (bt === 'lakeland' || family.includes('lakeland') || /lakeland/.test(all)) return 'lakeland';
  if (aromaticInfo.isAromatic === true) return 'aromatic';
  if (bt.includes('balkan') || family.includes('balkan')) return 'balkan';
  if (bt.includes('english') || family.includes('english') || hasLatakia || hasOriental) return 'english';
  if (bt.includes('virginia/perique') || bt.includes('va/per') || family.includes('vaper') || family.includes('virginia/perique')) return 'vaper';
  if (hasVirginia && hasPerique) return 'vaper';
  if (hasDarkFired) return 'darkFired';
  if (bt.includes('burley') || family.includes('burley') || bt === 'american' || bt === 'codger blend' || (hasBurley && !hasVirginia)) return 'burley';
  if (bt.includes('virginia') || family.includes('virginia')) return 'virginia';
  if (!bt || bt === 'cavendish' || bt === 'shag' || bt === 'other' || bt === 'navy flake') {
    if (hasVirginia && !hasBurley && !hasLatakia) return 'virginia';
    if (hasBurley && !hasLatakia) return 'burley';
    return 'unknown';
  }
  if (hasVirginia && !hasLatakia) return 'virginia';
  if (hasBurley && !hasLatakia) return 'burley';
  return 'other';
}

/**
 * Normalize a tobacco blend record into the pairing model.
 */
export function normalizeTobaccoForPairing(blend) {
  const b = blend || {};
  const aromaticInfo = inferAromaticFromFields(b);
  const components = normalizeComponents(b);
  const compText = components.join(" ");
  const bt = blendTypeOf(b);
  const family = inferBlendFamily(b, aromaticInfo, components);

  const treatment = parseFlavoringTreatment(b);
  const aromaticEvidenceScore =
    aromaticInfo.source === 'explicit_field' ? 1
      : aromaticInfo.source === 'blend_type' || aromaticInfo.source === 'blend_family' ? 0.85
      : aromaticInfo.source === 'structured_flavoring' ? 0.75
      : aromaticInfo.source === 'aromatic_intensity' ? 0.7
      : aromaticInfo.source === 'blend_type_structure' ? 0.65
      : 0;
  const familyEvidenceScore = family === 'unknown' ? 0 : family === 'other' ? 0.35 : 1;
  const discoveryMetadataComplete = !(b?.metadata_source === 'ai_discovery') || b?.metadata_complete !== false;
  const confidenceDetails = {
    explicitAromaticStatus: typeof b?.is_aromatic === 'boolean',
    aromaticStatusKnown: aromaticInfo.isAromatic !== null,
    aromaticStatusSource: aromaticInfo.source,
    blendCompositionKnown: components.length > 0,
    cutKnown: !!normalizeCut(b),
    strengthKnown: !!normalizeStrength(b),
    blendFamilyKnown: family !== 'unknown',
    hasFlavoringTreatment: treatment.hasFlavoringTreatment,
    aiDiscoveryMetadataComplete: discoveryMetadataComplete,
    inferredFields: [],
    missingFields: [],
  };

  if (!confidenceDetails.explicitAromaticStatus && aromaticInfo.isAromatic !== null) confidenceDetails.inferredFields.push('is_aromatic');
  if (!confidenceDetails.blendCompositionKnown) confidenceDetails.missingFields.push('tobacco_components');
  if (!confidenceDetails.cutKnown) confidenceDetails.missingFields.push('cut');
  if (!confidenceDetails.aromaticStatusKnown) confidenceDetails.missingFields.push('is_aromatic');
  if (!confidenceDetails.strengthKnown) confidenceDetails.missingFields.push('strength');
  if (!confidenceDetails.aiDiscoveryMetadataComplete) confidenceDetails.missingFields.push('ai_discovery_metadata');

  const confidenceBase =
    CONFIDENCE_FACTORS.tobacco.aromaticEvidence * aromaticEvidenceScore +
    CONFIDENCE_FACTORS.tobacco.familyEvidence * familyEvidenceScore +
    CONFIDENCE_FACTORS.tobacco.compositionEvidence * (confidenceDetails.blendCompositionKnown ? 1 : 0) +
    CONFIDENCE_FACTORS.tobacco.cutEvidence * (confidenceDetails.cutKnown ? 1 : 0) +
    CONFIDENCE_FACTORS.tobacco.strengthEvidence * (confidenceDetails.strengthKnown ? 1 : 0);
  const confidence = round1(clamp(confidenceBase - (discoveryMetadataComplete ? 0 : 0.15), 0, 1));

  return {
    name: String(b.tobacco_name ?? b.name ?? ""),
    blendType: bt || null,
    blendFamily: family,
    isAromatic: aromaticInfo.isAromatic,
    aromaticSource: aromaticInfo.source,
    aromaticIntensity: aromaticInfo.isAromatic === true ? aromaticInfo.intensity : null,
    hasFlavoringTreatment: aromaticInfo.hasFlavoringTreatment,
    flavoringTreatmentSource: treatment.source,
    tobaccoComponents: components,
    hasLatakia: /latakia/.test(compText) || bt.includes("latakia") || bt.includes("balkan"),
    hasPerique: /perique/.test(compText) || bt.includes("perique"),
    hasBlackCavendish: /cavendish/.test(compText) || bt === "cavendish",
    hasDarkFired: /dark fired|dark-fired|kentucky/.test(compText) || bt.includes("dark fired") || bt === "kentucky",
    hasVirginia: /virginia/.test(compText) || bt.includes("virginia"),
    hasBurley: /burley/.test(compText) || bt.includes("burley"),
    hasOriental: /oriental|turkish|izmir|yenidje|smyrna|drama/.test(compText) || bt.includes("oriental") || bt.includes("turkish"),
    isLakeland: family === "lakeland",
    cut: normalizeCut(b),
    strength: normalizeStrength(b),
    confidence,
    confidenceDetails,
  };
}

/* ------------------------------------------------------------------ *
 * Backward-compatible tobacco helpers
 * ------------------------------------------------------------------ */

/**
 * CANONICAL blend category inference.
 * Returns "aromatic" | "non_aromatic" | "unknown".
 * Unknown is a real state — a missing record is NOT assumed non-aromatic.
 */
export function inferBlendCategory(blend) {
  const { isAromatic } = inferAromaticFromFields(blend);
  if (isAromatic === true) return "aromatic";
  if (isAromatic === false) return "non_aromatic";
  return "unknown";
}

export function isAromaticBlend(blend) {
  return inferBlendCategory(blend) === "aromatic";
}

/**
 * CANONICAL aromatic intensity.
 * Priority: explicit aromatic_intensity field > flavor-note heuristic.
 * Nicotine strength is NEVER used — it describes nicotine, not topping.
 */
export function getAromaticIntensity(blend) {
  const explicit = normalizeIntensityValue(blend?.aromatic_intensity);
  if (explicit) return explicit;
  return intensityFromNotes(blend);
}

/* ------------------------------------------------------------------ *
 * Pipe normalization
 * ------------------------------------------------------------------ */

const SHARED_GEOMETRY_TENDENCIES = {
  chimney: ['narrow', 'deep'],
  stack: ['narrow', 'deep'],
  pot: ['wide', 'shallow'],
};

// The same labels intentionally appear in both maps below because bowlStyle and
// shape are distinct fields with different confidence levels.
const RELIABLE_BOWL_STYLE_GEOMETRY = {
  ...SHARED_GEOMETRY_TENDENCIES,
};

const WEAK_SHAPE_GEOMETRY = {
  ...SHARED_GEOMETRY_TENDENCIES,
  prince: ['medium', 'shallow'],
};

const VOLUME_TO_WIDTH = {
  small: "narrow",
  medium: "medium",
  large: "wide",
  "extra large": "wide",
};

function widthCategoryFromMm(mm) {
  if (!Number.isFinite(mm) || mm <= 0) return null;
  if (mm < 17) return "narrow";
  if (mm <= 22) return "medium";
  return "wide";
}

function depthCategoryFromMm(mm) {
  if (!Number.isFinite(mm) || mm <= 0) return null;
  if (mm < 32) return "shallow";
  if (mm <= 42) return "medium";
  return "deep";
}

function volumeCategoryFromMm(diameterMm, depthMm) {
  if (!Number.isFinite(diameterMm) || !Number.isFinite(depthMm)) return null;
  const r = diameterMm / 2;
  const mm3 = Math.PI * r * r * depthMm;
  if (mm3 < 5000) return "small";
  if (mm3 < 9500) return "medium";
  if (mm3 < 13500) return "large";
  return "extraLarge";
}

function normalizeVolumeEnum(v) {
  const s = lower(v);
  if (!s) return null;
  if (s === "small") return "small";
  if (s === "medium") return "medium";
  if (s === "large") return "large";
  if (s === "extra large" || s === "extralarge" || s === "xl") return "extraLarge";
  return null;
}

function normalizeMaterial(pipe) {
  const m = lower(pipe?.bowl_material);
  if (!m) return "other";
  if (m.includes("briar")) return "briar";
  if (m.includes("meer")) return "meerschaum";
  if (m.includes("cob") || m.includes("corn")) return "cob";
  if (m.includes("clay")) return "clay";
  if (m.includes("morta")) return "morta";
  if (m.includes("cherry")) return "cherryWood";
  if (m.includes("olive")) return "oliveWood";
  return "other";
}

function parseSmokingText(pipe) {
  const text = `${lower(pipe?.usage_characteristics)} ${lower(pipe?.smoking_characteristics)}`.trim();
  if (!text) {
    return { text: "", smokesCool: false, smokesHot: false, isWet: false, isDry: false, openDraw: false, restricted: false, hasData: false };
  }
  return {
    text,
    smokesCool: /(smokes cool|cool smoker|runs cool|cool smoking)/.test(text),
    smokesHot: /(smokes hot|hot smoker|runs hot|hot smoking)/.test(text),
    isWet: /(wet|gurgl)/.test(text),
    isDry: /\bdry\b/.test(text),
    openDraw: /(open draw|open drawing|airy draw)/.test(text),
    restricted: /(restricted|tight draw)/.test(text),
    hasData: true,
  };
}

function classifyFocusToken(token) {
  const t = lower(token);
  if (!t) return null;
  if (UTILITY_KEYWORDS.some((k) => t.includes(k))) return "generalPurpose";
  if (/non[-\s]?aromatic/.test(t)) return "nonAromatic";
  if (t.includes("aromatic")) return "aromatic";
  if (t.includes("lakeland")) return "lakeland";
  if (t.includes("perique") || t.includes("vaper")) return "vaper";
  if (t.includes("english") || t.includes("balkan") || t.includes("latakia") || t.includes("oriental") || t.includes("turkish")) return "english";
  if (t.includes("virginia")) return "virginia";
  if (t.includes("burley") || t.includes("american") || t.includes("codger")) return "burley";
  if (t.includes("dark fired") || t.includes("kentucky")) return "burley";
  return null;
}

/**
 * Normalize focus array into searchable tokens (backward compatible shape,
 * with additional dedication metadata).
 */
export function normalizeFocus(focusArr) {
  const focus = toArray(focusArr).map((x) => String(x || "").trim()).filter(Boolean);
  const low = focus.map((x) => x.toLowerCase());

  const isUtility = low.some((x) => UTILITY_KEYWORDS.some((k) => x.includes(k)));

  const wantsHeavyAromatics = low.some((x) => x.includes("heavy arom"));
  const wantsLightAromatics = low.some((x) => x.includes("light arom"));
  const wantsMediumAromatics =
    low.some((x) => x.includes("medium arom")) ||
    (low.some((x) => x.includes("arom")) && !hasNonAromaticToken(low) && !wantsHeavyAromatics && !wantsLightAromatics);

  const categories = low.map(classifyFocusToken).filter(Boolean);
  const nonUtilityCategories = categories.filter((c) => c !== "generalPurpose");
  const uniqueCategories = [...new Set(nonUtilityCategories)];

  const allAromaticCategory = low.length > 0 && uniqueCategories.length === 1 && uniqueCategories[0] === "aromatic";
  const allNonAromaticCategory =
    low.length > 0 &&
    uniqueCategories.length > 0 &&
    uniqueCategories.every((c) => c !== "aromatic" && c !== "generalPurpose");

  const explicitLanguage = low.some((x) =>
    /(only|dedicated|dedicate)/.test(x)
  );

  const aromaticOnly = !isUtility && (low.some((x) =>
    /(aromatic(s)?\s*only|aromatic[-\s]*dedicated|dedicated\s*to\s*aromatic)/.test(x)
  ) || allAromaticCategory);

  const nonAromaticOnly = !isUtility && (low.some((x) =>
    /(non[-\s]?aromatic(s)?\s*only|non[-\s]?aromatic[-\s]*dedicated|dedicated\s*to\s*non)/.test(x)
  ) || allNonAromaticCategory);

  // Focus entries that are not recognized categories are treated as blend names
  const exactBlendFocus = focus.filter((x) => classifyFocusToken(x) === null);

  return {
    focus,
    lower: low,
    isUtility,
    aromaticOnly,
    nonAromaticOnly,
    wantsHeavyAromatics,
    wantsLightAromatics,
    wantsMediumAromatics,
    categories: uniqueCategories,
    explicitLanguage,
    exactBlendFocus,
  };
}

function hasNonAromaticToken(low) {
  return low.some((x) => /non[-\s]?aromatic/.test(x));
}

/**
 * Normalize a pipe (or pipe/bowl variant) record into the pairing model.
 */
export function normalizePipeForPairing(pipe) {
  const p = pipe || {};
  const nf = normalizeFocus(p.focus);

  const diameter = Number(p.bowl_diameter_mm);
  const depth = Number(p.bowl_depth_mm);
  const chamberDiameterMm = Number.isFinite(diameter) && diameter > 0 ? diameter : null;
  const chamberDepthMm = Number.isFinite(depth) && depth > 0 ? depth : null;

  const shapeKey = lower(p.shape).replace(/^bent\s+/, '');
  const bowlStyleKey = lower(p.bowlStyle);
  const reliableBowlStyleGeom =
    Object.entries(RELIABLE_BOWL_STYLE_GEOMETRY).find(([key]) => bowlStyleKey.includes(key))?.[1] || null;
  const weakShapeGeom = WEAK_SHAPE_GEOMETRY[shapeKey] || null;

  const volumeEnum = normalizeVolumeEnum(p.chamber_volume);

  const hasMeasuredWidth = chamberDiameterMm !== null;
  const hasMeasuredDepth = chamberDepthMm !== null;
  let chamberWidthCategory = widthCategoryFromMm(chamberDiameterMm);
  let chamberDepthCategory = depthCategoryFromMm(chamberDepthMm);
  let widthSource = hasMeasuredWidth ? 'measured' : null;
  let depthSource = hasMeasuredDepth ? 'measured' : null;

  if (!chamberWidthCategory) {
    if (volumeEnum) {
      chamberWidthCategory = VOLUME_TO_WIDTH[lower(p.chamber_volume)] || (volumeEnum === 'extraLarge' ? 'wide' : null);
      widthSource = chamberWidthCategory ? 'volumeEnum' : null;
    } else if (reliableBowlStyleGeom) {
      chamberWidthCategory = reliableBowlStyleGeom[0];
      widthSource = chamberWidthCategory ? 'reliableBowlStyle' : null;
    } else if (weakShapeGeom) {
      chamberWidthCategory = weakShapeGeom[0];
      widthSource = chamberWidthCategory ? 'weakShape' : null;
    }
  }
  if (!chamberDepthCategory) {
    if (reliableBowlStyleGeom) {
      chamberDepthCategory = reliableBowlStyleGeom[1];
      depthSource = chamberDepthCategory ? 'reliableBowlStyle' : null;
    } else if (weakShapeGeom) {
      chamberDepthCategory = weakShapeGeom[1];
      depthSource = chamberDepthCategory ? 'weakShape' : null;
    } else if (volumeEnum === 'small') {
      chamberDepthCategory = 'shallow';
      depthSource = 'volumeEnum';
    } else if (volumeEnum === 'large' || volumeEnum === 'extraLarge') {
      chamberDepthCategory = 'deep';
      depthSource = 'volumeEnum';
    }
  }

  const geometrySource =
    hasMeasuredWidth && hasMeasuredDepth ? 'measured'
      : hasMeasuredWidth || hasMeasuredDepth ? 'partialMeasured'
      : widthSource || depthSource || 'unknown';

  const chamberVolume =
    volumeCategoryFromMm(chamberDiameterMm, chamberDepthMm) || volumeEnum || null;

  // Dedication
  const categories = nf.categories;
  let dedicationType = "unknown";
  let dedicationStrength = "general";

  if (nf.isUtility && categories.length === 0) {
    dedicationType = "generalPurpose";
    dedicationStrength = "general";
  } else if (categories.length === 1) {
    dedicationType = categories[0] === "nonAromatic" ? "generalPurpose" : categories[0];
    dedicationStrength = nf.explicitLanguage ? "explicit" : "inferred";
    if (categories[0] === "nonAromatic") dedicationStrength = "inferred";
  } else if (categories.length > 1) {
    // Mixed but coherent families collapse to the dominant non-aromatic bucket
    if (categories.includes("aromatic")) {
      dedicationType = "aromatic";
    } else if (categories.includes("english")) {
      dedicationType = "english";
    } else if (categories.includes("vaper")) {
      dedicationType = "vaper";
    } else if (categories.includes("virginia")) {
      dedicationType = "virginia";
    } else {
      dedicationType = categories[0];
    }
    dedicationStrength = "general";
  } else if (nf.exactBlendFocus.length > 0) {
    dedicationType = "specificBlend";
    dedicationStrength = nf.explicitLanguage ? "explicit" : "inferred";
  }

  const smoking = parseSmokingText(p);
  const smokingCharacter = smoking.smokesCool ? "cool" : smoking.smokesHot ? "hot" : smoking.hasData ? "neutral" : null;
  const drawCharacter = smoking.openDraw ? "open" : smoking.restricted ? "restricted" : smoking.hasData ? "neutral" : null;
  const isWetSmoker = smoking.hasData ? (smoking.isWet ? true : smoking.isDry ? false : null) : null;

  const geometryEvidenceScore =
    geometrySource === 'measured' ? 1
      : geometrySource === 'partialMeasured' ? 0.85
      : geometrySource === 'volumeEnum' ? 0.65
      : geometrySource === 'reliableBowlStyle' ? 0.5
      : geometrySource === 'weakShape' ? 0.25
      : 0;
  const dedicationEvidenceScore =
    dedicationStrength === 'explicit' ? 1
      : dedicationType !== 'unknown' ? 0.55
      : 0.2;
  const confidenceDetails = {
    measuredGeometry: geometrySource === 'measured',
    geometrySource,
    chamberVolumeKnown: chamberVolume !== null || !!volumeEnum,
    explicitPipeDedication: dedicationStrength === 'explicit',
    pipeDedicationKnown: dedicationType !== 'unknown',
    smokingCharacteristicsKnown: smoking.hasData,
    materialKnown: normalizeMaterial(p) !== 'other',
    inferredFields: [],
    missingFields: [],
  };

  if (geometrySource === 'weakShape') confidenceDetails.inferredFields.push('chamber_geometry');
  if (geometrySource === 'reliableBowlStyle') confidenceDetails.inferredFields.push('chamber_geometry');
  if (dedicationStrength === 'inferred') confidenceDetails.inferredFields.push('pipe_dedication');
  if (geometrySource === 'unknown') confidenceDetails.missingFields.push('chamber_geometry');
  if (!confidenceDetails.chamberVolumeKnown) confidenceDetails.missingFields.push('chamber_volume');
  if (!confidenceDetails.pipeDedicationKnown) confidenceDetails.missingFields.push('focus');
  if (!confidenceDetails.smokingCharacteristicsKnown) confidenceDetails.missingFields.push('smoking_characteristics');
  if (!confidenceDetails.materialKnown) confidenceDetails.missingFields.push('bowl_material');

  const confidence = round1(clamp(
    CONFIDENCE_FACTORS.pipe.geometryEvidence * geometryEvidenceScore +
    CONFIDENCE_FACTORS.pipe.dedicationEvidence * dedicationEvidenceScore +
    CONFIDENCE_FACTORS.pipe.chamberVolumeEvidence * (confidenceDetails.chamberVolumeKnown ? 1 : 0) +
    CONFIDENCE_FACTORS.pipe.materialEvidence * (confidenceDetails.materialKnown ? 1 : 0) +
    CONFIDENCE_FACTORS.pipe.smokingEvidence * (confidenceDetails.smokingCharacteristicsKnown ? 1 : 0),
    0,
    1,
  ));

  return {
    pipeId: p.pipe_id ?? p.id ?? null,
    pipeName: String(p.pipe_name ?? p.name ?? ""),
    bowlVariantId: p.bowl_variant_id ?? null,
    dedicationType,
    dedicationStrength,
    exactBlendFocus: nf.exactBlendFocus,
    focusCategories: categories,
    chamberDiameterMm,
    chamberDepthMm,
    chamberVolume,
    chamberWidthCategory,
    chamberDepthCategory,
    geometrySource,
    bowlMaterial: normalizeMaterial(p),
    smokingCharacter,
    drawCharacter,
    isWetSmoker,
    confidence,
    confidenceDetails,
  };
}

/* ------------------------------------------------------------------ *
 * Component scorers
 * ------------------------------------------------------------------ */

function scoreDedication(pipeN, tobN) {
  const { dedicationType: ded, dedicationStrength: strength } = pipeN;
  const fam = tobN.blendFamily;
  const strongScore = strength === "explicit" ? 9 : 8;

  // Exact blend-name dedication
  const blendName = lower(tobN.name);
  if (blendName && pipeN.exactBlendFocus.some((f) => lower(f) === blendName)) {
    return { score: 10, reason: "Exact blend match to pipe focus." };
  }

  if (ded === "unknown") {
    return { score: 6, reason: "Pipe has no declared dedication — treated as neutral." };
  }
  if (ded === "generalPurpose") {
    return { score: 6, reason: "General-purpose pipe — compatible but no specialization advantage." };
  }
  if (ded === "specificBlend") {
    return { score: 5, reason: "Pipe is dedicated to specific named blends rather than this one." };
  }
  if (fam === "unknown") {
    return { score: 5, reason: "Blend family is unknown — dedication fit cannot be confirmed." };
  }

  const isEnglishFamily = fam === "english" || fam === "balkan" || tobN.hasLatakia;

  if (ded === "aromatic") {
    if (fam === "aromatic") {
      return {
        score: strongScore,
        reason: strength === "explicit"
          ? "Aromatic-dedicated pipe matches this aromatic blend and avoids ghosting your non-aromatic pipes."
          : "Aromatic-focused pipe matches this aromatic blend and avoids ghosting your non-aromatic pipes.",
      };
    }
    if (isEnglishFamily) {
      return { score: 1, reason: "Aromatic-dedicated pipe — Latakia/English blends would clash with existing sweet ghosting." };
    }
    if (fam === "lakeland") {
      return { score: 2, reason: "Lakeland blends need their own pipe; this one is dedicated to aromatics." };
    }
    return { score: 3, reason: "Aromatic-dedicated pipe carries sweet ghosting that muddies non-aromatic blends." };
  }

  if (ded === "english") {
    if (isEnglishFamily) {
      return {
        score: strongScore,
        reason: "English/Latakia-dedicated pipe is purpose-built for this smoky mixture.",
      };
    }
    if (fam === "aromatic") {
      return { score: 1, reason: "English/Latakia-dedicated pipe — aromatic blends risk flavor carryover." };
    }
    if (fam === "lakeland") {
      return { score: 2, reason: "Lakeland floral casing would ghost an English-dedicated pipe." };
    }
    if (fam === "virginia" || fam === "vaper") {
      return { score: 5, reason: "Latakia ghosting in this English pipe will mask delicate Virginia sweetness." };
    }
    return { score: 6, reason: "English-dedicated pipe handles this blend acceptably." };
  }

  if (ded === "virginia") {
    if (fam === "virginia") return { score: 8, reason: "Virginia-dedicated pipe keeps this Virginia clean and bright." };
    if (fam === "vaper") return { score: 7, reason: "Virginia-dedicated pipe suits this Virginia/Perique blend." };
    if (fam === "burley" || fam === "darkFired") return { score: 6, reason: "Virginia-dedicated pipe is workable for this blend." };
    if (fam === "aromatic") return { score: 2, reason: "Virginia-dedicated pipe — aromatic topping would ghost it." };
    if (fam === "lakeland") return { score: 2, reason: "Lakeland casing would ghost this Virginia-dedicated pipe." };
    if (isEnglishFamily) return { score: 3, reason: "Latakia would ghost this Virginia-dedicated pipe." };
    return { score: 6, reason: "Virginia-dedicated pipe is workable for this blend." };
  }

  if (ded === "vaper") {
    if (fam === "vaper") return { score: 9, reason: "VaPer-dedicated pipe is a purpose match for this Virginia/Perique blend." };
    if (fam === "virginia") return { score: 8, reason: "VaPer-dedicated pipe handles straight Virginias well." };
    if (fam === "burley" || fam === "darkFired") return { score: 6, reason: "VaPer-dedicated pipe is workable for this blend." };
    if (fam === "aromatic") return { score: 2, reason: "VaPer-dedicated pipe — aromatic topping would ghost it." };
    if (fam === "lakeland") return { score: 2, reason: "Lakeland casing would ghost this VaPer-dedicated pipe." };
    if (isEnglishFamily) return { score: 3, reason: "Latakia would ghost this VaPer-dedicated pipe." };
    return { score: 6, reason: "VaPer-dedicated pipe is workable for this blend." };
  }

  if (ded === "burley") {
    if (fam === "burley" || fam === "darkFired") return { score: 8, reason: "Burley-dedicated pipe suits this nutty/dark-fired blend." };
    if (fam === "virginia" || fam === "vaper") return { score: 6, reason: "Burley-dedicated pipe is workable for this blend." };
    if (isEnglishFamily) return { score: 5, reason: "Burley-dedicated pipe can take Latakia but is not optimized for it." };
    if (fam === "aromatic") return { score: 3, reason: "Burley-dedicated pipe — aromatic topping risks ghosting." };
    if (fam === "lakeland") return { score: 2, reason: "Lakeland casing would ghost this Burley-dedicated pipe." };
    return { score: 6, reason: "Burley-dedicated pipe is workable for this blend." };
  }

  if (ded === "lakeland") {
    if (fam === "lakeland") return { score: 9, reason: "Lakeland-dedicated pipe contains the floral casing where it belongs." };
    if (fam === "aromatic") return { score: 5, reason: "Lakeland-dedicated pipe carries floral ghosting into aromatics." };
    return { score: 3, reason: "Lakeland-dedicated pipe would impose floral ghosting on this blend." };
  }

  return { score: 6, reason: "Pipe dedication is neutral for this blend." };
}

const GEOMETRY_TABLE = {
  virginia: { narrow: 9, medium: 7.5, wide: 5.5 },
  vaper: { narrow: 8.5, medium: 8, wide: 6 },
  english: { narrow: 5.5, medium: 8, wide: 9 },
  balkan: { narrow: 5.5, medium: 8, wide: 9 },
  burley: { narrow: 6.5, medium: 8, wide: 7.5 },
  darkFired: { narrow: 6, medium: 7.5, wide: 8 },
  lakeland: { narrow: 7, medium: 7.5, wide: 7 },
  other: { narrow: 6.5, medium: 7, wide: 6.5 },
  unknown: { narrow: 6, medium: 6.5, wide: 6 },
};

const AROMATIC_GEOMETRY = {
  heavy: { narrow: 6, medium: 8, wide: 7.5 },
  medium: { narrow: 6.5, medium: 8, wide: 7.5 },
  light: { narrow: 7, medium: 8, wide: 7.5 },
  unknown: { narrow: 6.5, medium: 8, wide: 7.5 },
};

function scoreChamberGeometry(pipeN, tobN) {
  const width = pipeN.chamberWidthCategory;
  const depth = pipeN.chamberDepthCategory;

  if (!width) {
    return { score: 6, reason: "Chamber dimensions unknown — geometry treated as neutral.", damped: true };
  }

  const fam = tobN.blendFamily;
  const table =
    fam === "aromatic"
      ? AROMATIC_GEOMETRY[tobN.aromaticIntensity || "unknown"]
      : GEOMETRY_TABLE[fam] || GEOMETRY_TABLE.other;

  let score = table[width];

  // Depth interacts with how the leaf burns
  const isFlakeish = tobN.cut ? FLAKE_CUTS.has(tobN.cut) : false;
  if (fam === "virginia" || fam === "vaper") {
    if (depth === "deep") score += 0.5;
    if (depth === "shallow") score -= 0.5;
  }
  if (isFlakeish && depth === "deep") score += 0.25;
  if (fam === "aromatic" && depth === "deep" && tobN.aromaticIntensity === "heavy") score -= 0.25;
  if ((fam === "english" || fam === "balkan") && depth === "shallow") score += 0.25;

  score = clamp(score, 0, 10);

  const geometryDamping = {
    measured: 1,
    partialMeasured: 0.85,
    volumeEnum: 0.75,
    reliableBowlStyle: 0.55,
    weakShape: 0.35,
    unknown: 0,
  };
  let damped = false;
  const factor = geometryDamping[pipeN.geometrySource] ?? 0;
  if (factor <= 0) {
    return { score: 6, reason: 'Chamber dimensions unknown — geometry treated as neutral.', damped: true };
  }
  if (factor < 1) {
    score = 6.5 + (score - 6.5) * factor;
    damped = true;
  }

  const sizeText = pipeN.chamberDiameterMm
    ? `${Math.round(pipeN.chamberDiameterMm)}mm`
    : width;

  let reason;
  if (fam === "english" || fam === "balkan") {
    reason = width === "narrow"
      ? `Narrow ${sizeText} chamber crowds this Latakia mixture — it prefers more air.`
      : `${width === "wide" ? "Wide" : "Medium"} ${sizeText} chamber suits this complex Latakia/Oriental mixture.`;
  } else if (fam === "virginia" || fam === "vaper") {
    reason = width === "wide"
      ? `Wide ${sizeText} chamber can push Virginias toward harshness.`
      : `${width === "narrow" ? "Narrow" : "Medium"} ${sizeText} chamber concentrates Virginia sweetness.`;
  } else if (fam === "aromatic") {
    reason = width === "narrow"
      ? `Small ${sizeText} chamber can run hot and wet with a topped blend.`
      : `${width === "wide" ? "Wide" : "Medium"} ${sizeText} chamber gives this topped blend room to burn cleanly.`;
  } else {
    reason = `${width === "narrow" ? "Narrow" : width === "wide" ? "Wide" : "Medium"} ${sizeText} chamber is a reasonable fit for this blend.`;
  }

  return { score: clamp(score, 0, 10), reason, damped };
}

function scoreTobaccoCut(pipeN, tobN) {
  const cut = tobN.cut;
  const width = pipeN.chamberWidthCategory || "medium";
  const depth = pipeN.chamberDepthCategory || "medium";

  if (!cut) {
    // Unknown cut is genuinely neutral — it reduces confidence, not compatibility.
    return { score: 6.5, reason: "Cut is unknown — packing behaviour cannot be assessed." };
  }

  let score = 6;
  let reason = "";

  const narrowOrMedium = width === "narrow" || width === "medium";

  switch (cut) {
    case "flake":
    case "coin":
    case "plug":
    case "broken flake":
    case "navy flake": {
      if (narrowOrMedium && depth === "deep") { score = 9; reason = "Deep flake-friendly chamber gives folded flake a long, controlled burn."; }
      else if (narrowOrMedium) { score = 8.5; reason = "Chamber suits folded or rubbed-out flake."; }
      else if (width === "wide" && depth === "shallow") { score = 6; reason = "Wide shallow bowl is workable for flake but not ideal geometry."; }
      else { score = 7; reason = "Wide chamber takes rubbed-out flake, though folded flake prefers a narrower bowl."; }
      break;
    }
    case "ribbon": {
      if (width === "medium") { score = 8; reason = "Ribbon cut packs easily and burns consistently in this chamber."; }
      else if (width === "narrow") { score = 7; reason = "Ribbon works in a narrow chamber but packs denser."; }
      else { score = 7.5; reason = "Ribbon cut burns evenly in this wider chamber."; }
      break;
    }
    case "shag": {
      score = width === "narrow" ? 7.5 : 7;
      reason = "Shag is forgiving but burns fast — shorter chambers suit it best.";
      break;
    }
    case "cube cut": {
      if (width === "wide" || width === "medium") { score = 8; reason = "Cube cut loads loosely and burns well in this chamber."; }
      else { score = 6.5; reason = "Cube cut is bulky for a narrow chamber."; }
      break;
    }
    case "ready rubbed": {
      score = width === "medium" ? 8 : 7.5;
      reason = "Ready rubbed packs like ribbon with a little more air.";
      break;
    }
    case "rope":
    case "twist": {
      score = width === "medium" ? 7 : 6.5;
      reason = "Rope/twist needs slicing and rubbing but works in most chambers.";
      break;
    }
    case "crumble cake": {
      score = width === "medium" ? 8 : 7.5;
      reason = "Crumble cake breaks apart easily and packs well here.";
      break;
    }
    default: {
      score = 6;
      reason = "Cut has no strong geometry preference.";
    }
  }

  return { score: clamp(Math.max(score, 3), 0, 10), reason };
}

function scoreBlendComposition(pipeN, tobN) {
  if (!tobN.tobaccoComponents.length) {
    // Unknown composition is genuinely neutral — it reduces confidence, not compatibility.
    return { score: 6.5, reason: "Tobacco components are not recorded." };
  }

  const width = pipeN.chamberWidthCategory;
  let score = 6;
  const notes = [];

  const virginiaHeavy = tobN.hasVirginia && !tobN.hasLatakia;
  if (virginiaHeavy && (width === "narrow" || width === "medium")) {
    score += 1;
    notes.push("Virginia-forward leaf rewards this narrower chamber.");
  } else if (virginiaHeavy && width === "wide") {
    score -= 0.5;
    notes.push("Virginia-forward leaf can get hot in a wide chamber.");
  }

  if (tobN.hasLatakia) {
    if (width === "wide" || width === "medium") {
      score += 1;
      notes.push("Latakia-bearing leaf opens up in a roomier chamber.");
    } else if (width === "narrow") {
      score -= 0.5;
      notes.push("Latakia can turn ashy when crowded into a narrow chamber.");
    }
  }

  if (tobN.hasPerique) {
    if (width === "wide") {
      score -= 0.5;
      notes.push("Perique intensifies in large bowls.");
    } else {
      score += 0.5;
      notes.push("Perique stays balanced in this chamber size.");
    }
  }

  if (tobN.hasDarkFired && (width === "medium" || width === "wide")) {
    score += 0.5;
    notes.push("Dark-fired leaf benefits from a medium-to-wide chamber.");
  }

  if (tobN.tobaccoComponents.length >= 4) {
    if (width === "narrow") {
      score -= 0.5;
      notes.push("A complex multi-leaf mixture prefers more air than this chamber gives.");
    } else {
      score += 0.5;
      notes.push("A complex multi-leaf mixture has room to develop here.");
    }
  }

  return {
    score: clamp(score, 0, 10),
    reason: notes[0] || "Composition is compatible with this chamber.",
  };
}

function scoreAromaticCompatibility(pipeN, tobN) {
  if (tobN.isAromatic === null) {
    // Unknown aromatic status is genuinely neutral — it reduces confidence, not compatibility.
    return { score: 6.5, reason: "Aromatic status unknown for this blend." };
  }
  if (tobN.isAromatic === false) {
    return { score: 6, reason: "Non-aromatic blend — no topping-related moisture concerns." };
  }

  const width = pipeN.chamberWidthCategory;
  const volume = pipeN.chamberVolume;
  const intensity = tobN.aromaticIntensity || "unknown";

  let score;
  if (intensity === "heavy") {
    if (width === "narrow" || volume === "small") score = 4;
    else if (width === "wide" && volume === "extraLarge") score = 6.5;
    else score = width === "medium" ? 8 : 7;
  } else if (intensity === "light") {
    score = width === "narrow" ? 7.5 : 8;
  } else {
    score = width === "narrow" ? 6 : 8;
  }

  const reason =
    intensity === "heavy" && (width === "narrow" || volume === "small")
      ? "Heavily topped tobacco can gunk up and smoke wet in a small chamber."
      : intensity === "heavy"
        ? "Chamber size lets a heavily topped blend burn without going wet."
        : "Lightly topped blend is easy-going across chamber sizes.";

  return { score: clamp(score, 0, 10), reason };
}

function scoreMaterial(pipeN, tobN) {
  const mat = pipeN.bowlMaterial;
  const fam = tobN.blendFamily;
  const isAromatic = tobN.isAromatic === true || fam === 'aromatic';
  const isGhostSensitive = fam === 'virginia' || fam === 'vaper';

  switch (mat) {
    case 'meerschaum':
      if (isAromatic || isGhostSensitive) {
        return { score: 7, reason: 'Meerschaum gets a small compatibility bonus here because its low carryover helps topped or ghost-sensitive leaf.' };
      }
      return { score: 6.5, reason: 'Meerschaum is a neutral, low-carryover material.' };
    case 'cob':
      if (isAromatic || fam === 'burley' || fam === 'darkFired') {
        return { score: 6.8, reason: 'Corn cob earns a small bonus here for moisture forgiveness and easy cross-blend use.' };
      }
      return { score: 6.2, reason: 'Corn cob is serviceable and fairly neutral for this blend.' };
    case 'clay':
      if (fam === 'virginia' || fam === 'vaper') return { score: 6.8, reason: 'Clay gets a small bonus for flavour purity with Virginia-forward leaf.' };
      if (isAromatic && tobN.aromaticIntensity === 'heavy') return { score: 5.5, reason: 'Clay is slightly penalised here because a hot-smoke-prone material can punish a heavy aromatic.' };
      return { score: 6.2, reason: 'Clay is close to neutral for this blend.' };
    case 'morta':
      return { score: 6.4, reason: 'Morta is nearly neutral and low-carryover, so it gets only a slight bonus.' };
    case 'briar':
      return { score: 6, reason: 'Briar is the neutral baseline reference material.' };
    case 'cherryWood':
    case 'oliveWood':
      return { score: 5.7, reason: 'Fruitwoods take a slight compatibility penalty because they can add their own sweetness or flavour.' };
    default:
      return { score: 6, reason: 'Bowl material is unrecorded — treated as the neutral baseline.' };
  }
}

function scoreSmokingCharacter(pipeN, tobN) {
  let score = 6;
  const notes = [];

  const heavyAromatic = tobN.isAromatic === true && tobN.aromaticIntensity === "heavy";

  if (pipeN.smokingCharacter === "hot" && heavyAromatic) {
    score -= 0.5;
    notes.push("Pipe runs hot, and a heavily topped blend already tends hot and wet.");
  }
  if (pipeN.smokingCharacter === "cool") {
    score += 0.3;
    notes.push("Pipe smokes cool, which flatters this blend.");
  }
  if (pipeN.isWetSmoker === true && heavyAromatic) {
    score -= 0.5;
    notes.push("Pipe tends to gurgle; a moist topped blend will make that worse.");
  }
  if (pipeN.drawCharacter === "open" && (tobN.blendFamily === "english" || tobN.blendFamily === "balkan")) {
    score += 0.2;
    notes.push("Open draw suits a Latakia mixture.");
  }
  if (pipeN.drawCharacter === "restricted" && tobN.cut && FLAKE_CUTS.has(tobN.cut)) {
    score += 0.2;
    notes.push("Restricted draw pairs nicely with a slow-burning flake.");
  }

  return {
    score: clamp(score, 0, 10),
    reason: notes[0] || (pipeN.smokingCharacter ? "Smoking character is neutral for this blend." : "No recorded smoking characteristics."),
  };
}

/* ------------------------------------------------------------------ *
 * Personal fit (kept OUT of the technical score)
 * ------------------------------------------------------------------ */

function scorePersonalFit(pipeN, tobN, userProfile, blend) {
  if (!userProfile) {
    return {
      score: null,
      reasons: [],
      hasProfile: false,
      hasPersonalizationEvidence: false,
      evidenceCount: 0,
    };
  }

  let score = 5;
  const reasons = [];
  let evidenceCount = 0;

  const prefTypes = toArray(userProfile.preferred_blend_types).map((x) => lower(x));
  const blendType = lower(blend?.blend_type || blend?.type);
  if (prefTypes.length) {
    evidenceCount += 1;
    if (
      prefTypes.includes(blendType) ||
      prefTypes.some((p) => p && (p === tobN.blendFamily || (blendType && (p.includes(blendType) || blendType.includes(p)))))
    ) {
      score += 2.5;
      reasons.push('Matches your preferred blend types.');
    }
  }

  const strengthPref = lower(userProfile.strength_preference);
  if (strengthPref && tobN.strength) {
    evidenceCount += 1;
    if (strengthPref.includes(tobN.strength)) {
      score += 1.5;
      reasons.push('Matches your preferred strength.');
    }
  }

  const duration = lower(userProfile.smoke_duration_preference);
  const volume = pipeN.chamberVolume;
  if (duration && volume) {
    evidenceCount += 1;
    const isLong = /long|extended|hour/.test(duration);
    const isShort = /short|quick|15|20|30/.test(duration);
    const isBig = volume === 'large' || volume === 'extraLarge';
    const isSmall = volume === 'small';
    if ((isLong && isBig) || (isShort && isSmall)) {
      score += 1;
      reasons.push('Chamber capacity matches your usual session length.');
    } else if ((isLong && isSmall) || (isShort && isBig)) {
      score -= 1;
      reasons.push('Chamber capacity does not match your usual session length.');
    }
  }

  const sizePref = lower(userProfile.pipe_size_preference);
  if (sizePref && volume) {
    evidenceCount += 1;
    const wantsLarge = /large|big|magnum/.test(sizePref);
    const wantsSmall = /small|pocket|nose/.test(sizePref);
    if ((wantsLarge && (volume === 'large' || volume === 'extraLarge')) || (wantsSmall && volume === 'small')) {
      score += 0.5;
      reasons.push('Pipe size matches your stated preference.');
    }
  }

  if (evidenceCount === 0) {
    return {
      score: null,
      reasons: [],
      hasProfile: true,
      hasPersonalizationEvidence: false,
      evidenceCount: 0,
    };
  }

  return {
    score: clamp(score, 0, 10),
    reasons,
    hasProfile: true,
    hasPersonalizationEvidence: true,
    evidenceCount,
  };
}

/* ------------------------------------------------------------------ *
 * Score calibration
 *
 * The raw weighted sum of component scores clusters around 6–8 even for
 * excellent matches because:
 *   • low-weight components (material, smokingCharacter) anchor near 6
 *   • missing-data neutrals previously dragged mediocre and good toward
 *     the same band
 *
 * calibrateScore() maps the raw compatibility output to a display scale
 * that uses the full 1–10 range meaningfully.  The curve is:
 *   • monotonically increasing — ranking is always preserved
 *   • fixed at (0,0) and (10,10) — hard limits are unchanged
 *   • neutral at (6.5, 6.5) — a truly average match stays average
 *   • expands the upper range so a strong raw score (≈ 8) maps to ≈ 8.5–9
 *   • slightly compresses the lower range so hard conflicts stay clearly low
 *
 * Piecewise linear control points:
 *   raw →  calibrated
 *   0.0  →   0.0
 *   4.0  →   3.5    (hard conflicts remain clearly low)
 *   5.5  →   5.0    (mediocre / acceptable stays below 5)
 *   6.5  →   6.5    (neutral fixed-point)
 *   7.5  →   7.8    (good/very good — slight upward nudge)
 *   8.0  →   8.5    (strong → excellent display score)
 *   9.0  →   9.5    (near-ceiling raw → outstanding display score)
 *   9.5  →   9.8    (theoretical raw ceiling → near-perfect display)
 *  10.0  →  10.0    (perfect stays perfect)
 * ------------------------------------------------------------------ */

const CALIBRATION_POINTS = [
  [0.0, 0.0],
  [4.0, 3.5],
  [5.5, 5.0],
  [6.5, 6.5],
  [7.5, 7.8],
  [8.0, 8.5],
  [9.0, 9.5],
  [9.5, 9.8],
  [10.0, 10.0],
];

export function calibrateScore(raw) {
  const r = clamp(raw, 0, 10);
  for (let i = 1; i < CALIBRATION_POINTS.length; i++) {
    const [x0, y0] = CALIBRATION_POINTS[i - 1];
    const [x1, y1] = CALIBRATION_POINTS[i];
    if (r <= x1) {
      const t = (r - x0) / (x1 - x0);
      return round1(y0 + t * (y1 - y0));
    }
  }
  return 10;
}

/* ------------------------------------------------------------------ *
 * Main scorer
 * ------------------------------------------------------------------ */

/**
 * Full multi-dimensional scoring result.
 * Prefer this for new callers that want the component breakdown.
 */
export function scorePipeBlendDiagnostic(pipeVariant, blend, userProfile) {
  const pipeN = normalizePipeForPairing(pipeVariant);
  const tobN = normalizeTobaccoForPairing(blend);

  const raw = {
    dedication: scoreDedication(pipeN, tobN),
    chamberGeometry: scoreChamberGeometry(pipeN, tobN),
    tobaccoCut: scoreTobaccoCut(pipeN, tobN),
    blendComposition: scoreBlendComposition(pipeN, tobN),
    aromaticCompatibility: scoreAromaticCompatibility(pipeN, tobN),
    material: scoreMaterial(pipeN, tobN),
    smokingCharacter: scoreSmokingCharacter(pipeN, tobN),
  };

  const components = {};
  let rawTechnicalScore = 0;
  for (const [key, weight] of Object.entries(COMPONENT_WEIGHTS)) {
    const part = raw[key];
    const score = round1(clamp(part.score, 0, 10));
    const contribution = round1(score * weight);
    rawTechnicalScore += score * weight;
    components[key] = { score, weight, contribution, reason: part.reason };
  }
  rawTechnicalScore = round1(clamp(rawTechnicalScore, 0, 10));
  const technicalScore = calibrateScore(rawTechnicalScore);

  const personal = scorePersonalFit(pipeN, tobN, userProfile, blend);
  const personalFit = personal.score == null ? null : round1(personal.score);

  const finalScore = personal.hasPersonalizationEvidence
    ? round1(clamp(technicalScore * 0.8 + personalFit * 0.2, 0, 10))
    : technicalScore;

  // Confidence: how complete the underlying records are
  const confidence = round1(clamp((tobN.confidence * 0.5 + pipeN.confidence * 0.5), 0, 1));
  const confidenceDetails = {
    measuredGeometry: pipeN.confidenceDetails?.measuredGeometry || false,
    geometrySource: pipeN.geometrySource,
    explicitAromaticStatus: tobN.confidenceDetails?.explicitAromaticStatus || false,
    aromaticStatusKnown: tobN.confidenceDetails?.aromaticStatusKnown || false,
    blendCompositionKnown: tobN.confidenceDetails?.blendCompositionKnown || false,
    cutKnown: tobN.confidenceDetails?.cutKnown || false,
    explicitPipeDedication: pipeN.confidenceDetails?.explicitPipeDedication || false,
    smokingCharacteristicsKnown: pipeN.confidenceDetails?.smokingCharacteristicsKnown || false,
    aiDiscoveryMetadataComplete: tobN.confidenceDetails?.aiDiscoveryMetadataComplete !== false,
    inferredFields: [...new Set([...(pipeN.confidenceDetails?.inferredFields || []), ...(tobN.confidenceDetails?.inferredFields || [])])],
    missingFields: [...new Set([...(pipeN.confidenceDetails?.missingFields || []), ...(tobN.confidenceDetails?.missingFields || [])])],
  };

  const whyList = buildWhy(components, personal, pipeN, tobN, confidenceDetails);

  return {
    score: finalScore,
    finalScore,
    technicalScore,
    rawTechnicalScore,
    personalFit,
    hasPersonalizationEvidence: personal.hasPersonalizationEvidence,
    confidence,
    confidenceDetails,
    components,
    why: whyList.join(' '),
    whyList,
    reasons: whyList,
    normalizedPipe: pipeN,
    normalizedTobacco: tobN,
  };
}

// Contribution above/below the neutral 6.0 baseline decides whether a
// component is worth mentioning to the user.
const NEUTRAL_COMPONENT_SCORE = 6;
const MENTION_THRESHOLD = 0.25;

function buildWhy(components, personal, pipeN, tobN, confidenceDetails) {
  const entries = Object.entries(components)
    .map(([key, c]) => ({
      key,
      reason: c.reason,
      delta: (c.score - NEUTRAL_COMPONENT_SCORE) * c.weight,
    }))
    .filter((e) => Math.abs(e.delta) >= MENTION_THRESHOLD && e.reason)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const why = entries.slice(0, 3).map((e) => e.reason);

  if (!why.length) {
    why.push(
      components.dedication.reason ||
        "General compatibility based on pipe and blend characteristics."
    );
  }

  if (tobN.isAromatic === null) {
    why.push('Blend record does not say whether it is aromatic — score is provisional.');
  } else if (!pipeN.chamberDiameterMm && pipeN.geometrySource !== 'measured') {
    why.push('Chamber measurements are missing, so geometry is estimated.');
  }

  if (confidenceDetails?.aiDiscoveryMetadataComplete === false) {
    why.push('AI discovery metadata is incomplete, so no authoritative canonical score is shown.');
  }

  if (personal.hasPersonalizationEvidence && personal.reasons.length) {
    why.push(personal.reasons[0]);
  }

  return why;
}

/**
 * CANONICAL scoring function for pipe ⇄ blend compatibility.
 *
 * Backward compatible: returns `{ score, why }` where `why` is a string.
 * New callers can additionally read `whyList`, `components`, `technicalScore`,
 * `personalFit` and `confidence` from the same object.
 */
export function scorePipeBlend(pipeVariant, blend, userProfile) {
  return scorePipeBlendDiagnostic(pipeVariant, blend, userProfile);
}

/**
 * Build pairings for all pipe variants.
 * Returns array of { pipe_id, pipe_name, bowl_variant_id, recommendations[] }
 */
export function buildPairingsForPipes(pipeVariants, blends, userProfile) {
  return (pipeVariants || []).map((pv) => {
    const recs = (blends || []).map((b) => {
      const result = scorePipeBlend(pv, b, userProfile);
      return {
        tobacco_id: String(b.tobacco_id ?? b.id),
        tobacco_name: String(b.tobacco_name ?? b.name),
        score: result.score,
        reasoning: result.why,
        confidence: result.confidence,
        technical_score: result.technicalScore,
        raw_technical_score: result.rawTechnicalScore,
        personal_fit: result.personalFit,
        has_personalization_evidence: result.hasPersonalizationEvidence,
      };
    });

    // Deterministic ordering: score desc, then name asc for stable ties
    recs.sort((a, b) =>
      (b.score || 0) - (a.score || 0) ||
      String(a.tobacco_name).localeCompare(String(b.tobacco_name))
    );

    return {
      pipe_id: String(pv.pipe_id ?? pv.id),
      pipe_name: String(pv.pipe_name ?? pv.name),
      bowl_variant_id: pv.bowl_variant_id ?? null,
      recommendations: recs.slice(0, 10),
    };
  });
}

export function rankPipesForBlend(pipes, blend, userProfile, {
  includeMainWhenBowls = true,
  collapseToParent = true,
  limit = 3,
} = {}) {
  const variants = expandPipesToVariants(pipes || [], { includeMainWhenBowls });
  const scored = variants.map((variant) => {
    const result = scorePipeBlendDiagnostic(variant, blend, userProfile);
    return {
      pipe_id: String(variant.pipe_id ?? variant.id),
      pipe_name: String(variant.pipe_name ?? variant.name ?? ""),
      bowl_variant_id: variant.bowl_variant_id ?? null,
      variant_name: variant.variant_name ?? variant.name ?? "",
      bowl_name: variant.bowl_variant_id
        ? String(variant.__bowl?.name ?? variant.variant_name?.replace(/^.*?\s-\s/, "") ?? variant.bowl_variant_id)
        : null,
      score: result.score,
      finalScore: result.finalScore,
      technicalScore: result.technicalScore,
      personalFit: result.personalFit,
      hasPersonalizationEvidence: result.hasPersonalizationEvidence,
      confidence: result.confidence,
      confidenceDetails: result.confidenceDetails,
      why: result.why,
      components: result.components,
      normalizedPipe: result.normalizedPipe,
      normalizedTobacco: result.normalizedTobacco,
      variant,
    };
  }).sort((a, b) =>
    (b.score || 0) - (a.score || 0) ||
    (b.technicalScore || 0) - (a.technicalScore || 0) ||
    String(a.variant_name || "").localeCompare(String(b.variant_name || ""))
  );

  if (!collapseToParent) return scored.slice(0, limit);

  const bestByPipe = new Map();
  for (const entry of scored) {
    const current = bestByPipe.get(entry.pipe_id);
    if (!current) {
      bestByPipe.set(entry.pipe_id, entry);
      continue;
    }
    if (
      entry.score > current.score ||
      (entry.score === current.score && entry.technicalScore > current.technicalScore) ||
      (
        entry.score === current.score &&
        entry.technicalScore === current.technicalScore &&
        !!entry.bowl_variant_id &&
        !current.bowl_variant_id
      )
    ) {
      bestByPipe.set(entry.pipe_id, entry);
    }
  }

  return [...bestByPipe.values()]
    .sort((a, b) =>
      (b.score || 0) - (a.score || 0) ||
      (b.technicalScore || 0) - (a.technicalScore || 0) ||
      String(a.pipe_name || "").localeCompare(String(b.pipe_name || ""))
    )
    .slice(0, limit);
}