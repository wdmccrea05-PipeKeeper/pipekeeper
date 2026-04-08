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

// ─── Pairing compatibility maps (for gap explanations) ───────────────────────

const BLEND_WHISKEY_COMPAT = {
  'Virginia':            ['Bourbon', 'Irish Whiskey'],
  'Virginia/Perique':    ['Bourbon', 'Rye'],
  'Virginia/Burley':     ['Bourbon', 'Rye'],
  'Virginia/Oriental':   ['Single Malt Scotch', 'Bourbon'],
  'English':             ['Islay Single Malt', 'Single Malt Scotch'],
  'English/Balkan':      ['Islay Single Malt', 'Single Malt Scotch'],
  'Aromatic':            ['Irish Whiskey', 'Blended Scotch', 'Bourbon'],
  'Burley':              ['Bourbon', 'Tennessee Whiskey'],
  'Oriental':            ['Single Malt Scotch'],
  'Balkan':              ['Single Malt Scotch'],
  'Cavendish':           ['Bourbon', 'Irish Whiskey'],
  'Dark Fired Kentucky': ['Bourbon', 'Rye'],
};

const WHISKEY_BLEND_COMPAT = {
  'Bourbon':            ['Virginia', 'Virginia/Burley', 'Virginia/Perique', 'Burley'],
  'Rye':                ['Virginia/Perique', 'Virginia/Burley', 'Dark Fired Kentucky'],
  'Single Malt Scotch': ['Virginia/Oriental', 'Oriental', 'Balkan', 'English'],
  'Islay Single Malt':  ['English', 'English/Balkan'],
  'Irish Whiskey':      ['Aromatic', 'Virginia', 'Cavendish'],
  'Blended Scotch':     ['Aromatic', 'Cavendish', 'Virginia'],
  'Japanese Whisky':    ['Virginia', 'Virginia/Oriental', 'Oriental'],
  'Tennessee Whiskey':  ['Burley', 'Dark Fired Kentucky'],
};

// ─── Context-aware summary builders ──────────────────────────────────────────

const BLEND_CHARACTER_NOTES = {
  'Virginia':            'Virginia\'s natural hay sweetness and clean burn provide the foundational profile most other blend families build on',
  'Virginia/Perique':    'Virginia/Perique adds Perique\'s peppery complexity to a Virginia base — more dimension than straight Virginia, without leaving familiar territory',
  'Virginia/Burley':     'Virginia/Burley bridges Virginia sweetness and Burley earthiness — the most versatile crossover family, suitable for most pipe specializations',
  'Virginia/Oriental':   'Virginia/Oriental combines Virginia sweetness with Oriental\'s floral spice — lighter than full English blends but significantly more complex than plain Virginia',
  'English':             'English blends are built around Latakia\'s campfire smoke and leather depth — nothing else in the pipe tradition covers this character',
  'English/Balkan':      'English/Balkan blends layer Latakia, Oriental, and Virginia into one of the most complex profiles in the tradition',
  'Aromatic':            'Aromatics produce an entirely different kind of session and require a dedicated pipe — adding one reshapes how you plan your rotation',
  'Burley':              'Burley\'s dry, nutty earth contributes a distinct base that no other blend family replicates — and pairs directly with bourbon',
  'Oriental':            'Pure Oriental blends carry a floral, incense-like quality that nothing else in a cellar reproduces',
  'Balkan':              'Balkan blends layer Oriental, Virginia, and Latakia into a deeply complex profile — your cellar has no representative of this family',
  'Cavendish':           'Cavendish adds a smooth, processed sweetness suited for shorter, lighter sessions — distinct in character from unflavored blends',
  'Dark Fired Kentucky': 'Dark Fired Kentucky brings intense, assertive smokiness and bold depth — the most distinctive blend family not yet in your cellar',
};

const BLEND_PAIRING_NOTES = {
  'Virginia':            (w) => `Virginia\'s hay sweetness pairs as a complement to ${w}\'s warm, sweet character — each reinforces the other without competing`,
  'Virginia/Perique':    (w) => `Perique\'s peppery bite contrasts ${w}\'s spice in a way that lets Virginia\'s sweetness come through clean`,
  'Virginia/Burley':     (w) => `Burley\'s nutty earth amplifies the caramel and vanilla in ${w} without overriding the Virginia base`,
  'English':             (w) => `Latakia\'s campfire smoke and leather find their natural match in ${w}\'s smoke and peat — one reinforces the other`,
  'English/Balkan':      (w) => `The layered spice of Balkan-style blends tracks the complex, smoky character of ${w} note for note`,
  'Aromatic':            (w) => `${w}\'s light grain sweetness softens the aromatic\'s topping without masking it — a contrast pairing that works because neither is too assertive`,
  'Burley':              (w) => `Burley\'s dry, nutty character was built for ${w} — the sweetness rounds out the dryness without overwhelming it`,
  'Oriental':            (w) => `Oriental\'s floral, spiced notes contrast ${w}\'s malt complexity in a way that opens both up`,
  'Balkan':              (w) => `Balkan\'s incense-like Oriental leaf finds a natural companion in ${w}\'s fruit and malt`,
  'Virginia/Oriental':   (w) => `Oriental\'s floral spice and Virginia\'s sweetness both open up alongside ${w}\'s fruity complexity`,
};

const WHISKEY_CHARACTER_NOTES = {
  'Bourbon':            'corn-forward sweetness and vanilla oak',
  'Rye':                'dry spice and peppery finish',
  'Single Malt Scotch': 'malt complexity and regional character',
  'Islay Single Malt':  'heavy peat, brine, and smoke',
  'Irish Whiskey':      'light body and clean grain sweetness',
  'Blended Scotch':     'approachable malt and grain balance',
  'Japanese Whisky':    'delicate fruit and restrained grain complexity',
  'Tennessee Whiskey':  'charcoal-filtered smoothness and caramel',
};

const WHISKEY_PAIRING_NOTES = {
  'Bourbon':            (b) => `Your ${b} blends pair naturally with bourbon\'s vanilla and caramel notes — add this and the Curator can build those pairings immediately`,
  'Rye':                (b) => `Rye\'s dry spice contrasts ${b}\'s pepper in a way bourbon doesn\'t — it\'s the complement pairing that opens up the peppery side of your tobacco shelf`,
  'Single Malt Scotch': (b) => `${b} blends are built for single malt — the malt complexity creates the backdrop that lets ${b}\'s character fully express`,
  'Islay Single Malt':  (b) => `Your ${b} blends are waiting for an Islay — that peat-and-Latakia combination is one of the most classic pairings in the tradition`,
  'Irish Whiskey':      (b) => `${b} blends pair as a contrast with Irish whiskey\'s light body — the softness of the pour prevents the blend\'s topping from overwhelming`,
  'Blended Scotch':     (b) => `A blended Scotch provides an approachable pairing backdrop for your ${b} blends without demanding a specific tobacco profile`,
  'Japanese Whisky':    (b) => `Japanese whisky\'s delicate balance of fruit and grain opens a lighter, more precise pairing axis for your ${b} blends`,
  'Tennessee Whiskey':  (b) => `The Lincoln County Process\'s charcoal-filtered smoothness pairs gently with ${b}\'s bold depth — a mellow complement to an assertive blend`,
};

/**
 * Build a context-aware summary for a blend gap suggestion.
 */
function buildBlendGapSummary(type, isPreferred, ownedBlendTypes, ownedWhiskeyTypes) {
  const compatWhiskeys = BLEND_WHISKEY_COMPAT[type] || [];
  const matchingWhiskey = compatWhiskeys.find((wt) =>
    [...ownedWhiskeyTypes].some((ot) => ot.toLowerCase().includes(wt.toLowerCase()) || wt.toLowerCase().includes(ot.toLowerCase()))
  );

  if (isPreferred && matchingWhiskey) {
    const pairingNote = BLEND_PAIRING_NOTES[type]?.(matchingWhiskey) ||
      `pairs directly with your ${matchingWhiskey}`;
    return `${type} is in your preferred types and your shelf already has ${matchingWhiskey}. ${pairingNote}. Adding this blend activates that pairing immediately.`;
  }

  if (isPreferred) {
    const charNote = BLEND_CHARACTER_NOTES[type] || `${type} blends are not yet in your cellar`;
    return `${type} matches your taste profile but isn't in your cellar yet. ${charNote} — your rotation is missing this entire flavor axis.`;
  }

  if (matchingWhiskey) {
    const pairingNote = BLEND_PAIRING_NOTES[type]?.(matchingWhiskey) ||
      `creates a compatible pairing with your ${matchingWhiskey}`;
    return `Your ${matchingWhiskey} has no matching tobacco blend. ${pairingNote}. This fills the tobacco side of that pairing.`;
  }

  const charNote = BLEND_CHARACTER_NOTES[type];
  return charNote
    ? `${charNote}. Your cellar currently has no representative of this family.`
    : `${type} blends are absent from your cellar — adding one would fill this gap in your collection's blend diversity.`;
}

/**
 * Build a context-aware summary for a whiskey gap suggestion.
 */
function buildWhiskeyGapSummary(type, isPreferred, ownedBlendTypes) {
  const compatBlends = WHISKEY_BLEND_COMPAT[type] || [];
  const matchingBlend = compatBlends.find((bt) => ownedBlendTypes.has(bt));
  const charNote = WHISKEY_CHARACTER_NOTES[type] || '';

  if (isPreferred && matchingBlend) {
    const pairingNote = WHISKEY_PAIRING_NOTES[type]?.(matchingBlend) ||
      `pairs directly with your ${matchingBlend} blends`;
    return `${type} is in your preferred whiskey types. ${pairingNote}. Adding this unlocks those pairings without requiring anything else.`;
  }

  if (isPreferred) {
    return `${type} is in your preferred types but absent from your shelf. Without it, this pairing category is entirely unavailable to the Curator's recommendation engine.`;
  }

  if (matchingBlend) {
    const pairingNote = WHISKEY_PAIRING_NOTES[type]?.(matchingBlend) ||
      `your ${matchingBlend} blends have a natural pairing in ${type}`;
    return `Your ${matchingBlend} blends have no natural pairing whiskey on your shelf. ${pairingNote}. This is the missing half of a pairing your tobacco collection already supports.`;
  }

  return charNote
    ? `${type} brings ${charNote} — a distinct pairing axis your current shelf doesn't cover.`
    : `${type} would add whiskey diversity and expand your pairing options beyond what's currently on your shelf.`;
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
  const ownedWhiskeyTypes = new Set(
    bottles.map((b) => b.type || b.whiskey_type || b.spirit_type).filter(Boolean)
  );

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
      title:       specificName,
      summary:     buildBlendGapSummary(type, isPreferred, ownedBlendTypes, ownedWhiskeyTypes),
      reason:      isPreferred ? 'preference_match' : 'collection_gap',
      confidence,
      priority:    isPreferred ? 'high' : 'medium',
      blendFamily: type,
      itemType:    'blend',
    });
  }

  // ── Whiskey gap analysis ────────────────────────────────────────────────────

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
      title:        specificName,
      summary:      buildWhiskeyGapSummary(type, isPreferred, ownedBlendTypes),
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

    const CIGAR_STRENGTH_NOTES = {
      'Mild':         'A mild cigar broadens your lighter pairing options — pairs cleanly with Irish whiskey and blended Scotch for accessible, lower-commitment sessions.',
      'Mild-Medium':  'Mild-medium cigars add a versatile middle range — strong enough to be interesting, light enough to pair with a wide range of whiskeys without one dominating.',
      'Medium':       'A medium-bodied cigar is the backbone of most pairings — pairs as complement or contrast depending on the whiskey, and suits a wide range of occasions.',
      'Medium-Full':  'Medium-full cigars pair well with bourbon\'s body and single malt\'s complexity. Your humidor lacks this range — it would expand pairing options significantly.',
      'Full':         'Full-bodied cigars need a pour with presence. This fills the bold end of your humidor\'s range and pairs with high-proof bourbons or rye — currently unpairable.',
    };

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
        title:     specificName,
        summary:   CIGAR_STRENGTH_NOTES[strength] ||
          `${specificName} (${strength} strength) isn't represented in your humidor — adding it broadens your pairing range.`,
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
