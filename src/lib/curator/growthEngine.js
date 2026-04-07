/**
 * Growth Engine
 *
 * Generates specific product recommendations for collection expansion.
 * Based on preference matching, collection gap analysis, and usage history.
 *
 * Each suggestion includes:
 *   - name         (specific product, e.g. "Eagle Rare 10 Year")
 *   - category     (tobacco | whiskey | cigar)
 *   - reason       (preference_match | collection_gap)
 *   - confidence   (high | medium | low)
 *
 * Hard rules:
 *   - Only specific named products — never generic "Explore X category" entries
 *   - Never suggest something the user already owns
 *   - Respects disliked types from preferences
 */

import { computeConfidence } from './recommendationSchema.js';

// ─── Specific product catalogs ────────────────────────────────────────────────

const BLEND_TYPE_PRODUCTS = {
  'Virginia':            ['Samuel Gawith Golden Glow', 'Mac Baren Virginia No. 1', 'Peter Stokkebye Luxury Bullseye Flake'],
  'Virginia/Perique':    ['G.L. Pease Odyssey', 'Esoterica Penzance', 'Samuel Gawith Full Virginia Flake'],
  'Virginia/Burley':     ['Lane Limited 1-Q', 'C&D Old Joe Krantz', 'Mac Baren Classic Burley Blend'],
  'Virginia/Oriental':   ['G.L. Pease Abingdon', 'Peterson University Flake', 'Germain Flake Mixture'],
  'English':             ['Esoterica Dunbar', 'G.L. Pease Union Square', 'Samuel Gawith Squadron Leader'],
  'English/Balkan':      ['Peterson Elizabethan Mixture', 'Dunhill London Mixture', "Rattray's Old Gowrie"],
  'Balkan':              ['Esoterica Stonehaven', 'G.L. Pease Cairo', 'Balkan Sobranie Original'],
  'Burley':              ['Solani Aged Burley Flake', 'C&D Billy Budd', 'Mac Baren Burley London Blend'],
  'Aromatic':            ['Lane Limited RLP-6', 'Captain Black White', 'Mac Baren Plumcake'],
  'Oriental':            ["Rattray's Marlin Flake", 'G.L. Pease Abingdon', 'Cornell & Diehl Pasha'],
  'Cavendish':           ['Mac Baren HH Burley Flake', 'Samuel Gawith Black Cherry Flake'],
  'Dark Fired Kentucky': ['Cornell & Diehl Old Dark Fired', 'C&D Haunted Bookshop', 'Gawith Hoggarth Dark Flake'],
};

const WHISKEY_TYPE_PRODUCTS = {
  'Bourbon':            ['Buffalo Trace', 'Eagle Rare 10 Year', 'Wild Turkey 101', 'Four Roses Small Batch'],
  'Rye':                ['Rittenhouse Rye 100', 'WhistlePig 10 Year', 'Sazerac 6 Year Rye'],
  'Single Malt Scotch': ['GlenDronach 12', 'Balvenie DoubleWood 12', 'Glenfarclas 15'],
  'Blended Scotch':     ['Famous Grouse', 'Monkey Shoulder', 'Johnnie Walker Black'],
  'Islay Single Malt':  ['Laphroaig 10 Year', 'Ardbeg 10 Year', 'Bowmore 12 Year'],
  'Irish Whiskey':      ['Redbreast 12', 'Jameson Black Barrel', 'Green Spot'],
  'Japanese Whisky':    ['Nikka From The Barrel', 'Suntory Toki', 'Hakushu 12 Year'],
  'Tennessee Whiskey':  ['George Dickel No. 12', "Jack Daniel's Single Barrel"],
};

const CIGAR_STRENGTH_PRODUCTS = {
  'Mild':         'Macanudo Café Hyde Park',
  'Mild-Medium':  'Arturo Fuente Rothschild',
  'Medium':       'Oliva Serie G Torpedo',
  'Medium-Full':  'Padron 3000 Natural',
  'Full':         'Liga Privada No. 9',
};

// ─── Blend types and whiskey types to check for gaps ─────────────────────────

const ALL_BLEND_TYPES = [
  'Virginia', 'Virginia/Perique', 'Virginia/Burley', 'Virginia/Oriental',
  'English', 'English/Balkan', 'Balkan', 'Burley', 'Aromatic', 'Oriental',
  'Cavendish', 'Dark Fired Kentucky',
];

const ALL_WHISKEY_TYPES = [
  'Bourbon', 'Rye', 'Single Malt Scotch', 'Blended Scotch', 'Islay Single Malt',
  'Irish Whiskey', 'Japanese Whisky', 'Tennessee Whiskey',
];

const ALL_CIGAR_STRENGTHS = ['Mild', 'Mild-Medium', 'Medium', 'Medium-Full', 'Full'];

// ─── Product picker ───────────────────────────────────────────────────────────

/**
 * Pick a deterministic specific product for a given type string.
 * Uses a stable hash to select consistently without randomness.
 */
function pickProduct(catalog, typeKey, fallback) {
  const products = catalog[typeKey];
  if (!products || products.length === 0) return fallback;
  let hash = 0;
  for (let i = 0; i < typeKey.length; i++) hash = (hash * 31 + typeKey.charCodeAt(i)) & 0xffff;
  return products[hash % products.length];
}

// ─── Gap analysis ─────────────────────────────────────────────────────────────

/**
 * Generate growth suggestions based on collection gaps and preference matching.
 *
 * @param {object} collectionContext - { blends, bottles, cigars, smokingLogs, tastingLogs, cigarModuleActive }
 * @param {object} [preferences]    - { preferred_blend_types, preferred_whiskey_types, disliked_blend_types, disliked_whiskey_types }
 * @returns {GrowthSuggestion[]}
 */
export function generateGrowthSuggestions(collectionContext = {}, preferences = {}) {
  const {
    blends      = [],
    bottles     = [],
    cigars      = [],
    smokingLogs = [],
    cigarModuleActive = false,
  } = collectionContext;

  const suggestions = [];

  // ── Tobacco gap analysis ──────────────────────────────────────────────────

  const ownedBlendTypes  = new Set(blends.map((b) => b.blend_type || b.blend_family).filter(Boolean));
  const preferredTypes   = new Set(preferences?.preferred_blend_types  || []);
  const dislikedTypes    = new Set(preferences?.disliked_blend_types   || []);

  // Weight blend types by usage history for better preference inference
  const blendTypeUsageCounts = {};
  for (const log of smokingLogs) {
    const blend = blends.find((b) => b.id === log.blend_id);
    if (!blend) continue;
    const t = blend.blend_type || blend.blend_family;
    if (t) blendTypeUsageCounts[t] = (blendTypeUsageCounts[t] || 0) + 1;
  }

  for (const type of ALL_BLEND_TYPES) {
    if (ownedBlendTypes.has(type)) continue;
    if (dislikedTypes.has(type)) continue;

    const isPreferred   = preferredTypes.has(type);
    const specificName  = pickProduct(BLEND_TYPE_PRODUCTS, type, `${type} Blend`);
    const confidence    = computeConfidence({
      preferenceAlignment:   isPreferred ? 0.9 : 0.55,
      usageHistoryRelevance: smokingLogs.length > 5 ? 0.75 : 0.4,
      dataCompleteness:      blends.length >= 3 ? 0.8 : 0.5,
      diversityContribution: 0.9,
    });

    suggestions.push({
      id:          `gap_blend_${type.replace(/[\s/]/g, '_')}`,
      name:        specificName,
      category:    'tobacco',
      type:        'blend_type_gap',
      moduleKey:   'tobacco',
      title:       `Explore ${specificName}`,
      summary:     isPreferred
        ? `${specificName} is a ${type} blend that fits your taste profile but isn't in your collection yet`
        : `${specificName} (${type}) isn't represented in your cellar`,
      reason:      isPreferred ? 'preference_match' : 'collection_gap',
      confidence,
      priority:    isPreferred ? 'high' : 'medium',
      blendFamily: type,
      itemType:    'blend',
    });
  }

  // ── Whiskey gap analysis ────────────────────────────────────────────────────

  const ownedWhiskeyTypes    = new Set(
    bottles.map((b) => b.type || b.whiskey_type || b.spirit_type).filter(Boolean)
  );
  const preferredWhiskeyTypes = new Set(preferences?.preferred_whiskey_types || []);
  const dislikedWhiskeyTypes  = new Set(preferences?.disliked_whiskey_types  || []);

  for (const type of ALL_WHISKEY_TYPES) {
    if (ownedWhiskeyTypes.has(type)) continue;
    if (dislikedWhiskeyTypes.has(type)) continue;

    const isPreferred  = preferredWhiskeyTypes.has(type);
    const specificName = pickProduct(WHISKEY_TYPE_PRODUCTS, type, type);
    const confidence   = computeConfidence({
      preferenceAlignment:   isPreferred ? 0.9 : 0.55,
      usageHistoryRelevance: bottles.length > 0 ? 0.7 : 0.4,
      dataCompleteness:      bottles.length >= 2 ? 0.8 : 0.5,
      diversityContribution: 0.9,
    });

    suggestions.push({
      id:           `gap_whiskey_${type.replace(/[\s/]/g, '_')}`,
      name:         specificName,
      category:     'whiskey',
      type:         'whiskey_type_gap',
      moduleKey:    'whiskey',
      title:        `Explore ${specificName}`,
      summary:      isPreferred
        ? `${specificName} (${type}) fits your whiskey profile but you don't have any yet`
        : `${specificName} (${type}) would add whiskey diversity to your collection`,
      reason:       isPreferred ? 'preference_match' : 'collection_gap',
      confidence,
      priority:     isPreferred ? 'high' : 'low',
      whiskeyStyle: type,
      itemType:     'bottle',
    });
  }

  // ── Cigar gap analysis (if active) ─────────────────────────────────────────

  if (cigarModuleActive && cigars.length > 0) {
    const ownedStrengths = new Set(cigars.map((c) => c.strength || c.body).filter(Boolean));

    for (const strength of ALL_CIGAR_STRENGTHS) {
      if (ownedStrengths.has(strength)) continue;

      const specificName = CIGAR_STRENGTH_PRODUCTS[strength] || `${strength} Strength Cigar`;
      const confidence   = computeConfidence({
        preferenceAlignment:   0.55,
        usageHistoryRelevance: 0.4,
        dataCompleteness:      cigars.length >= 2 ? 0.7 : 0.5,
        diversityContribution: 0.8,
      });

      suggestions.push({
        id:        `gap_cigar_${strength.replace(/[\s-]/g, '_')}`,
        name:      specificName,
        category:  'cigar',
        type:      'cigar_strength_gap',
        moduleKey: 'cigar',
        title:     `Explore ${specificName}`,
        summary:   `${specificName} (${strength} strength) isn't represented in your humidor`,
        reason:    'collection_gap',
        confidence,
        priority:  'low',
        itemType:  'cigar',
      });
    }
  }

  // Sort: preference matches first, then by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => {
    if (a.reason !== b.reason) {
      return (a.reason === 'preference_match' ? 0 : 1) - (b.reason === 'preference_match' ? 0 : 1);
    }
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });
}

/**
 * @typedef {object} GrowthSuggestion
 * @property {string} id
 * @property {string} name           - Specific product name (e.g. "Eagle Rare 10 Year")
 * @property {string} category       - 'tobacco' | 'whiskey' | 'cigar'
 * @property {string} type           - 'blend_type_gap' | 'whiskey_type_gap' | 'cigar_strength_gap'
 * @property {string} moduleKey      - 'tobacco' | 'whiskey' | 'cigar'
 * @property {string} title          - Display title
 * @property {string} summary        - One-line description
 * @property {string} reason         - 'preference_match' | 'collection_gap'
 * @property {string} confidence     - 'high' | 'medium' | 'low'
 * @property {string} priority       - 'high' | 'medium' | 'low'
 * @property {string} itemType       - 'blend' | 'bottle' | 'cigar'
 * @property {string} [blendFamily]  - Blend type key (for tobacco suggestions)
 * @property {string} [whiskeyStyle] - Whiskey type key (for whiskey suggestions)
 */
