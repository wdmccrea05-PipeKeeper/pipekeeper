/**
 * Grow & Expand Engine
 *
 * Generates outside-of-collection suggestions based on the user's existing
 * taste profile and collection gaps. Uses domain knowledge and preference
 * inference — no LLM calls.
 *
 * Recommendation logic:
 *   1. Infer what the user likes from blend types, usage history, and preferences
 *   2. Identify natural next steps (adjacent families, complementary styles)
 *   3. Suggest specific blend families or bottle types — not generic categories
 *   4. Score by preference alignment + diversity contribution
 *
 * Hard rules:
 *   - Never suggest something the user already owns
 *   - No redundant suggestions (one per logical expansion vector)
 *   - Low confidence if collection is too small to infer from
 */

import {
  createRecommendation,
  computeConfidence,
  CATEGORY,
  ACTION_TYPE,
  MODULE_KEY,
  OWNERSHIP_CONTEXT,
  PRIORITY,
} from './recommendationSchema.js';
import { buildGrowRationale } from './curatorVoice.js';

// ─── Specific product catalog — maps progression targets to concrete products ──

const BLEND_PROGRESSION_PRODUCTS = {
  'Virginia':            'Samuel Gawith Golden Glow',
  'Virginia/Perique':    'G.L. Pease Odyssey',
  'Virginia/Burley':     'Lane Limited 1-Q',
  'Virginia/Oriental':   'G.L. Pease Abingdon',
  'English':             'Esoterica Dunbar',
  'English/Balkan':      'Peterson Elizabethan Mixture',
  'Balkan':              'Esoterica Stonehaven',
  'Burley':              'Solani Aged Burley Flake',
  'Aromatic':            'Lane Limited RLP-6',
  'Oriental':            "Rattray's Marlin Flake",
  'Dark Fired Kentucky': 'Cornell & Diehl Old Dark Fired',
};

const WHISKEY_PROGRESSION_PRODUCTS = {
  'Bourbon':            'Eagle Rare 10 Year',
  'Rye':                'Rittenhouse Rye 100',
  'Single Malt Scotch': 'GlenDronach 12',
  'Islay Single Malt':  'Laphroaig 10 Year',
  'Irish Whiskey':      'Redbreast 12',
  'Blended Scotch':     'Monkey Shoulder',
  'Tennessee Whiskey':  'George Dickel No. 12',
  'Japanese Whisky':    'Nikka From The Barrel',
};

// ─── Domain Knowledge — Natural Progressions ─────────────────────────────────

// What blend types naturally follow or complement existing collection patterns
const BLEND_PROGRESSION_MAP = {
  'Aromatic': {
    next: ['Virginia', 'Virginia/Burley'],
    rationale: (existing) =>
      `Your aromatic collection is solid, but a mild ${existing.length > 3 ? 'unflavored ' : ''}Virginia blend would give you a clean reference point — ` +
      `the natural sweetness of Virginia leaf does the work without added toppings, ` +
      `and it opens up a whole category of pairings your current pipes can't touch.`,
    recommendation: 'Explore a Virginia — the gateway out of aromatics that doesn\'t feel like a jump',
    action: 'Add a mild Virginia to your Want List as a gateway blend',
  },
  'Virginia': {
    next: ['Virginia/Perique', 'English'],
    rationale: (existing) =>
      `A Virginia collection this size is ready to move up. Virginia/Perique adds Perique's ` +
      `peppery complexity to the base you already know — same foundation, more dimension. ` +
      `The transition is intuitive because the Virginia character you're used to stays dominant.`,
    recommendation: 'A Virginia/Perique would expand your palette without leaving familiar territory',
    action: 'Add Virginia/Perique to your Want List to explore Perique\'s pepper and plum notes',
  },
  'Virginia/Perique': {
    next: ['English', 'Balkan'],
    rationale: () =>
      `Virginia/Perique smokers often find English blends a natural next step — the Latakia smoke ` +
      `adds a dimension that Perique's pepper already hinted at. Start with a mild-to-medium English ` +
      `to keep it approachable, not a full Latakia bomb.`,
    recommendation: 'A mild English blend is the logical next horizon for your palate',
    action: 'Add a mild-to-medium English to your Want List',
  },
  'English': {
    next: ['English/Balkan', 'Oriental'],
    rationale: () =>
      `Your English collection suggests you're comfortable with Latakia. Balkan blends dial ` +
      `back the Latakia and bring in more Oriental leaf — the incense-like spice opens up ` +
      `complexity that full English blends sometimes cover. It's the more nuanced side of the same family.`,
    recommendation: 'Add a Balkan-style blend to explore the Oriental dimension of your English collection',
    action: 'Add an English/Balkan to your Want List to experience the Oriental-forward profile',
  },
  'English/Balkan': {
    next: ['Oriental', 'Virginia/Oriental'],
    rationale: () =>
      `A pure Oriental/Turkish blend is the natural culmination of Balkan exploration. ` +
      `The Latakia is stripped away and what remains is the raw floral, spicy, almost ` +
      `wine-like character of Oriental leaf. It's an acquired taste that rewards the patient smoker.`,
    recommendation: 'Explore a pure Oriental blend — the refined endpoint of the Balkan direction',
    action: 'Add a pure Oriental to your Want List',
  },
  'Burley': {
    next: ['Virginia/Burley', 'English'],
    rationale: () =>
      `Heavy burley smokers often discover that adding a Virginia base transforms the ` +
      `experience. Virginia/Burley keeps the familiar nutty-earth character while introducing ` +
      `the sweetness and complexity that pure burley blends hold back.`,
    recommendation: 'Virginia/Burley is the natural complement to your burley-heavy collection',
    action: 'Add a Virginia/Burley to your Want List',
  },
};

// What whiskey types naturally extend a collection based on existing bottles
const WHISKEY_PROGRESSION_MAP = {
  'Bourbon': {
    next: ['Rye', 'Tennessee Whiskey'],
    rationale: (owned) =>
      `Your bourbon collection is a strong foundation. Rye is the most logical step — ` +
      `same American whiskey tradition, but the rye grain shifts the sweetness toward ` +
      `dry spice and pepper. It pairs differently with tobacco blends and creates contrast ` +
      `where bourbon creates complement.`,
    recommendation: 'Rye whiskey is bourbon\'s counterpart — same tradition, opposite flavor direction',
    action: 'Add a rye whiskey to your Want List',
  },
  'Rye': {
    next: ['Bourbon', 'Single Malt Scotch'],
    rationale: () =>
      `Rye and Single Malt Scotch sit at opposite ends of the whiskey spectrum. ` +
      `A Speyside or Highland single malt introduces sherry, dried fruit, and malt complexity ` +
      `that creates pairings rye simply can't — particularly with Virginia and English blends.`,
    recommendation: 'A Speyside or Highland single malt opens pairing vectors your ryes can\'t reach',
    action: 'Add a Speyside or Highland single malt to your Want List',
  },
  'Single Malt Scotch': {
    next: ['Islay Single Malt', 'Irish Whiskey'],
    rationale: (owned) => {
      const hasIslay = (owned || []).some((b) => {
        const t = (b.type || b.whiskey_type || '').toLowerCase();
        return t.includes('islay');
      });
      return hasIslay
        ? `Your Scotch collection is strong. An Irish Whiskey would add a completely ` +
          `different character — lighter, unpeated, and versatile. It creates pairings ` +
          `with aromatics and mild Virginias that none of your current bottles can match.`
        : `An Islay single malt is the next frontier for your Scotch collection. ` +
          `Heavy peat and brine create pairing possibilities with English blends ` +
          `that no other whiskey type can replicate.`;
    },
    recommendation: 'Expand your Scotch range — an Islay or Irish Whiskey opens distinct pairing territory',
    action: 'Add an Islay single malt or Irish whiskey to your Want List',
  },
  'Irish Whiskey': {
    next: ['Bourbon', 'Blended Scotch'],
    rationale: () =>
      `Irish Whiskey's light, approachable profile is excellent for aromatics, but a bourbon ` +
      `would give you access to the corn-sweet, vanilla-oak pairing that Virginias and Burleys need. ` +
      `It's the single most useful addition to a collection anchored in Irish.`,
    recommendation: 'A good bourbon would be the workhorse pairing partner your Irish Whiskey can\'t cover',
    action: 'Add an entry-level or mid-range bourbon to your Want List',
  },
};

// Pipe shape suggestions based on collection composition
const PIPE_SHAPE_SUGGESTIONS = {
  billiard: {
    suggests: 'Dublin',
    rationale: 'A Dublin\'s tapered bowl concentrates flavor in a way the billiard\'s straight walls don\'t. It\'s the most natural shape addition after a billiard.',
  },
  bent: {
    suggests: 'Straight (Billiard or Canadian)',
    rationale: 'A straight pipe smokes differently — cooler, with better moisture drainage. Useful for longer sessions where the bent\'s gravity helps but so does a straight\'s efficiency.',
  },
  dublin: {
    suggests: 'Pot or Apple',
    rationale: 'The Pot\'s compact, wide bowl offers a short, dense smoke that contrasts with the Dublin\'s taper. It\'s the logical variety addition.',
  },
};

// ─── Preference Inferencer ────────────────────────────────────────────────────

/**
 * Infer user's dominant taste profile from collection and usage.
 */
function inferTasteProfile(blends, bottles, smokingLogs, preferences = {}) {
  const typeCounts = {};
  const whiskeyTypeCounts = {};

  // Count blend types in collection
  for (const blend of blends) {
    const t = blend.blend_type || blend.blend_family;
    if (t && t !== 'Unknown') typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  // Weight by usage in logs
  for (const log of smokingLogs) {
    const blend = blends.find((b) => b.id === log.blend_id);
    if (!blend) continue;
    const t = blend.blend_type || blend.blend_family;
    if (t && t !== 'Unknown') typeCounts[t] = (typeCounts[t] || 0) + 0.5; // usage adds half weight
  }

  // Count whiskey types in collection
  for (const bottle of bottles) {
    const t = bottle.type || bottle.whiskey_type || bottle.spirit_type;
    if (t) whiskeyTypeCounts[t] = (whiskeyTypeCounts[t] || 0) + 1;
  }

  const sortedBlendTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const sortedWhiskeyTypes = Object.entries(whiskeyTypeCounts).sort((a, b) => b[1] - a[1]);

  // Explicit preferences override inference
  const explicitPrefs = preferences.preferred_blend_types || preferences.preferredBlendTypes || [];
  const dislikes = preferences.disliked_flavors || preferences.dislikes || [];

  return {
    dominantBlendType:   sortedBlendTypes[0]?.[0] || null,
    blendTypeRanking:    sortedBlendTypes.map(([t]) => t),
    dominantWhiskeyType: sortedWhiskeyTypes[0]?.[0] || null,
    whiskeyTypeRanking:  sortedWhiskeyTypes.map(([t]) => t),
    explicitPreferences: explicitPrefs,
    dislikes,
    totalBlends:         blends.length,
    totalBottles:        bottles.length,
    totalPipes:          0, // set by caller
    hasUsageHistory:     smokingLogs.length > 0,
  };
}

// ─── Deduplication helpers ────────────────────────────────────────────────────

/**
 * Check if an item name or type is already in the collection.
 */
function isAlreadyOwned(targetType, blends, bottles) {
  const normalizedTarget = targetType.toLowerCase();
  for (const blend of blends) {
    const t = (blend.blend_type || blend.blend_family || '').toLowerCase();
    if (t.includes(normalizedTarget) || normalizedTarget.includes(t)) return true;
  }
  for (const bottle of bottles) {
    const t = (bottle.type || bottle.whiskey_type || '').toLowerCase();
    if (t.includes(normalizedTarget) || normalizedTarget.includes(t)) return true;
  }
  return false;
}

// ─── Suggestion Generators ───────────────────────────────────────────────────

function generateBlendExpansion(blends, smokingLogs, preferences = {}) {
  const results = [];
  if (blends.length < 2) return results;

  const typeCounts = {};
  for (const blend of blends) {
    const t = blend.blend_type || blend.blend_family;
    if (t && t !== 'Unknown') typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const dominantType = sortedTypes[0]?.[0];
  if (!dominantType) return results;

  const progression = BLEND_PROGRESSION_MAP[dominantType];
  if (!progression) return results;

  const nextType = progression.next.find((t) => !isAlreadyOwned(t, blends, []));
  if (!nextType) return results;

  const dislikes = preferences.disliked_flavors || preferences.dislikes || [];
  if (dislikes.some((d) => nextType.toLowerCase().includes(d.toLowerCase()))) return results;

  const isWellEstablished = sortedTypes[0][1] >= 3;
  const confidence = computeConfidence({
    preferenceAlignment:   isWellEstablished ? 0.8 : 0.5,
    usageHistoryRelevance: smokingLogs.length > 5 ? 0.8 : 0.4,
    dataCompleteness:      sortedTypes.length >= 2 ? 0.8 : 0.5,
    diversityContribution: 0.9, // always high — we're expanding the collection
  });

  const specificProduct = BLEND_PROGRESSION_PRODUCTS[nextType] || `${nextType} Blend`;
  const dominantBlends  = blends.filter((b) => (b.blend_type || b.blend_family) === dominantType);
  const dynamicRationale = buildGrowRationale({
    existingType:    dominantType,
    suggestedType:   nextType,
    existingItems:   dominantBlends,
    suggestedProduct: specificProduct,
    moduleKey:       'tobacco',
  });

  results.push(createRecommendation({
    category:           CATEGORY.GROW_EXPAND,
    goal:               'blend_family_expansion',
    actionType:         ACTION_TYPE.SHOPPING_LIST_ACTION,
    title:              `Explore ${specificProduct}`,
    summary:            dynamicRationale,
    whyItMatters:       dynamicRationale,
    recommendationText: progression.action,
    gapReason:          `You lack ${nextType} blends in your collection`,
    whatItAdds:         progression.action ? progression.action.split('.')[0] : 'Expands collection variety',
    collectionConnection: progression.recommendation || 'Complements your existing collection',
    contextTag:         nextType || 'blend_gap',
    moduleKey:          MODULE_KEY.TOBACCO,
    ownershipContext:   OWNERSHIP_CONTEXT.EXTERNAL,
    priority:           isWellEstablished ? PRIORITY.MEDIUM : PRIORITY.LOW,
    confidence,
    items: [{
      id:             `grow_blend_${nextType.replace(/[\s/]/g, '_').toLowerCase()}`,
      recordId:       null,
      recordType:     'blend_suggestion',
      recordName:     specificProduct,
      itemName:       specificProduct,
      ownershipStatus: 'wishlist',
      shoppingType:   'buy_new_item',
      itemType:       'blend',
      suggestedFamily: nextType,
      rationale:       progression.rationale(blends.filter((b) => (b.blend_type || b.blend_family) === dominantType)),
    }],
    actionPayload: {
      shoppingType:   'buy_new_item',
      itemType:       'blend',
      suggestedFamily: nextType,
      specificProduct,
    },
  }));

  return results;
}

function generateWhiskeyExpansion(bottles, blends, preferences = {}) {
  const results = [];
  if (bottles.length === 0) return results;

  const whiskeyTypeCounts = {};
  for (const bottle of bottles) {
    const t = bottle.type || bottle.whiskey_type || bottle.spirit_type;
    if (t) whiskeyTypeCounts[t] = (whiskeyTypeCounts[t] || 0) + 1;
  }
  const sortedTypes = Object.entries(whiskeyTypeCounts).sort((a, b) => b[1] - a[1]);

  let progression = null;
  let dominantType = null;
  for (const [type] of sortedTypes) {
    const matchKey = Object.keys(WHISKEY_PROGRESSION_MAP).find((k) =>
      type.toLowerCase().includes(k.toLowerCase())
    );
    if (matchKey) {
      progression = WHISKEY_PROGRESSION_MAP[matchKey];
      dominantType = type;
      break;
    }
  }

  if (!progression || !dominantType) return results;

  const nextType = progression.next.find((t) => !isAlreadyOwned(t, [], bottles));
  if (!nextType) return results;

  const dislikes = preferences.disliked_flavors || preferences.dislikes || [];
  const peatedTypes = ['Islay', 'Peated'];
  let finalNextType = nextType;
  if (peatedTypes.some((p) => nextType.includes(p)) &&
      dislikes.some((d) => d.toLowerCase().includes('peat') || d.toLowerCase().includes('smoke'))) {
    const altNextType = progression.next.find((t) =>
      !isAlreadyOwned(t, [], bottles) &&
      !peatedTypes.some((p) => t.includes(p))
    );
    if (!altNextType) return results;
    finalNextType = altNextType;
  }

  const confidence = computeConfidence({
    preferenceAlignment:   0.75,
    usageHistoryRelevance: blends.length > 0 ? 0.7 : 0.4,
    dataCompleteness:      sortedTypes.length >= 1 ? 0.8 : 0.5,
    diversityContribution: 0.9,
  });

  const specificProduct = WHISKEY_PROGRESSION_PRODUCTS[finalNextType] || finalNextType;
  const whiskeyDynamicRationale = buildGrowRationale({
    existingType:     dominantType,
    suggestedType:    finalNextType,
    existingItems:    bottles.filter((b) => (b.type || b.whiskey_type) === dominantType),
    suggestedProduct: specificProduct,
    moduleKey:        'whiskey',
  });

  results.push(createRecommendation({
    category:           CATEGORY.GROW_EXPAND,
    goal:               'whiskey_type_expansion',
    actionType:         ACTION_TYPE.SHOPPING_LIST_ACTION,
    title:              `Explore ${specificProduct}`,
    summary:            whiskeyDynamicRationale,
    whyItMatters:       whiskeyDynamicRationale,
    recommendationText: progression.action,
    gapReason:          `You lack ${finalNextType} in your whiskey collection`,
    whatItAdds:         progression.action ? progression.action.split('.')[0] : 'Expands collection variety',
    collectionConnection: progression.recommendation || 'Complements your existing collection',
    contextTag:         finalNextType || 'whiskey_gap',
    moduleKey:          MODULE_KEY.WHISKEY,
    ownershipContext:   OWNERSHIP_CONTEXT.EXTERNAL,
    priority:           PRIORITY.LOW,
    confidence,
    items: [{
      id:             `grow_whiskey_${finalNextType.replace(/[\s/]/g, '_').toLowerCase()}`,
      recordId:       null,
      recordType:     'bottle_suggestion',
      recordName:     specificProduct,
      itemName:       specificProduct,
      ownershipStatus: 'wishlist',
      shoppingType:   'buy_new_item',
      itemType:       'bottle',
      suggestedType:   finalNextType,
      rationale:       progression.rationale(bottles),
    }],
    actionPayload: {
      shoppingType:   'buy_new_item',
      itemType:       'bottle',
      suggestedType:   finalNextType,
      specificProduct,
    },
  }));

  return results;
}

/**
 * Suggest a pipe shape gap based on existing collection shapes.
 */
function generatePipeShapeExpansion(pipes, blends) {
  if (pipes.length < 2 || blends.length === 0) return [];

  const ownedShapes = new Set(pipes.map((p) => (p.shape || '').toLowerCase()).filter(Boolean));
  if (ownedShapes.size === 0) return [];

  // Find the most common shape and suggest its complement
  const shapeCounts = {};
  for (const pipe of pipes) {
    const s = (pipe.shape || '').toLowerCase();
    if (s) shapeCounts[s] = (shapeCounts[s] || 0) + 1;
  }
  const dominantShape = Object.entries(shapeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!dominantShape) return [];

  const suggestion = PIPE_SHAPE_SUGGESTIONS[dominantShape];
  if (!suggestion) return [];

  const suggestedShape = suggestion.suggests.toLowerCase();
  if (ownedShapes.has(suggestedShape)) return [];

  const confidence = computeConfidence({
    preferenceAlignment:   0.6,
    usageHistoryRelevance: 0.5,
    dataCompleteness:      0.7,
    diversityContribution: 0.85,
  });

  return [createRecommendation({
    category:           CATEGORY.GROW_EXPAND,
    goal:               'pipe_shape_expansion',
    actionType:         ACTION_TYPE.ADVISORY,
    title:              `Add a ${suggestion.suggests} to Your Rotation`,
    summary:            `Your collection is ${dominantShape}-heavy. A ${suggestion.suggests} would introduce a different smoking experience.`,
    whyItMatters:       suggestion.rationale,
    recommendationText: `Look for a quality ${suggestion.suggests} from a trusted maker as your next pipe acquisition.`,
    gapReason:          `Your collection lacks a ${suggestion.suggests} shape`,
    whatItAdds:         `${suggestion.suggests} pipe shape — different smoking experience`,
    collectionConnection: `Your collection is ${dominantShape}-heavy; a ${suggestion.suggests} adds variety`,
    contextTag:         suggestion.suggests || 'pipe_gap',
    moduleKey:          MODULE_KEY.PIPE,
    ownershipContext:   OWNERSHIP_CONTEXT.EXTERNAL,
    priority:           PRIORITY.LOW,
    confidence,
    items: [{
      id:             `grow_pipe_${suggestedShape}`,
      recordId:       null,
      recordType:     'pipe_suggestion',
      recordName:     suggestion.suggests,
      itemName:       `${suggestion.suggests} Pipe`,
      ownershipStatus: 'wishlist',
      shoppingType:   'buy_new_item',
      itemType:       'pipe',
      suggestedShape:  suggestion.suggests,
      rationale:       suggestion.rationale,
    }],
    actionPayload: {
      shoppingType:   'buy_new_item',
      itemType:       'pipe',
      suggestedShape:  suggestion.suggests,
    },
  })];
}

// ─── Main Engine Entry Point ─────────────────────────────────────────────────

/**
 * Generate Grow & Expand recommendations.
 *
 * These are outside-of-collection suggestions grounded in the user's
 * existing taste profile. Never redundant with owned items.
 *
 * @param {object} context - { pipes, blends, bottles, smokingLogs, preferences }
 * @returns {import('./recommendationSchema.js').Recommendation[]}
 */
/**
 * RULE 5: GROW & EXPAND MUST INCLUDE ALL ACTIVE MODULES
 * RULE 9: Debug logging per generator
 */
export function generateGrowExpandRecommendations(context = {}) {
  const {
    pipes       = [],
    blends      = [],
    bottles     = [],
    smokingLogs = [],
    preferences = {},
    activeModules = {},
  } = context;

  const pipeActive    = activeModules.pipekeeper    !== false;
  const tobaccoActive = activeModules.tobacco       !== false;
  const whiskeyActive = activeModules.whiskeykeeper !== false;

  // RULE 3: Module gating enforced globally once
  const gatedPipes = pipeActive ? pipes : [];
  const gatedBlends = tobaccoActive ? blends : [];
  const gatedBottles = whiskeyActive ? bottles : [];

  const totalItems = gatedPipes.length + gatedBlends.length + gatedBottles.length;
  const whiskeyOnlyMode = whiskeyActive && !pipeActive && !tobaccoActive;
  const minItems = whiskeyOnlyMode ? 1 : 3;
  if (totalItems < minItems) {
    console.error('ENGINE_FAILURE', {
      engine: 'growExpandEngine',
      reason: 'insufficient_data',
      dataCounts: { pipes: gatedPipes.length, blends: gatedBlends.length, bottles: gatedBottles.length },
      activeModules,
    });
    return [];
  }

  const results = [];
  const seen = new Set();

  // RULE 5: Generators invoked per active module
  const generators = [];

  // Blend family expansion — only when Tobacco is active
  if (tobaccoActive) {
    const blendExpansion = generateBlendExpansion(gatedBlends, smokingLogs, preferences);
    for (const rec of blendExpansion) {
      if (!seen.has(rec.goal)) {
        results.push(rec);
        seen.add(rec.goal);
      }
    }
    generators.push('blendExpansion');
  }

  // Whiskey type expansion — only when WhiskeyKeeper is active
  if (whiskeyActive && gatedBottles.length > 0) {
    const whiskeyExpansion = generateWhiskeyExpansion(gatedBottles, gatedBlends, preferences);
    for (const rec of whiskeyExpansion) {
      if (!seen.has(rec.goal)) {
        results.push(rec);
        seen.add(rec.goal);
      }
    }
    generators.push('whiskeyExpansion');
  }

  // Pipe shape expansion — only when PipeKeeper is active
  if (pipeActive && gatedPipes.length >= 2) {
    const pipeExpansion = generatePipeShapeExpansion(gatedPipes, gatedBlends);
    for (const rec of pipeExpansion) {
      if (!seen.has(rec.goal)) {
        results.push(rec);
        seen.add(rec.goal);
      }
    }
    generators.push('pipeExpansion');
  }

  // ─── Fallbacks: produce at least one suggestion when the collection has items
  //     but nothing was surfaced by the normal generators ──────────────────────

  if (results.length === 0 && totalItems >= 3) {
    // Fallback tobacco family — suggest exploring a first blend family (tobacco or pipekeeper active)
    if (pipeActive || tobaccoActive) {
      const ownedTypes = new Set(blends.map((b) => b.blend_type || b.blend_family).filter(Boolean));
      const fallbackBlendType = ['Virginia', 'English', 'Virginia/Perique', 'Aromatic', 'Burley'].find(
        (t) => !ownedTypes.has(t)
      );
      if (fallbackBlendType) {
        const specificProduct = BLEND_PROGRESSION_PRODUCTS[fallbackBlendType] || `${fallbackBlendType} Blend`;
        results.push(createRecommendation({
          category:           CATEGORY.GROW_EXPAND,
          goal:               'blend_family_expansion',
          actionType:         ACTION_TYPE.SHOPPING_LIST_ACTION,
          title:              `Explore ${specificProduct}`,
          summary:            `Add a ${fallbackBlendType} blend to your collection to expand your palette.`,
          whyItMatters:       `${fallbackBlendType} blends offer a distinct character your current collection doesn't cover. ` +
                              `It's a natural next step for any pipe smoker looking to explore new territory.`,
          moduleKey:          MODULE_KEY.TOBACCO,
          ownershipContext:   OWNERSHIP_CONTEXT.EXTERNAL,
          priority:           PRIORITY.LOW,
          confidence:         'medium',
          items: [{
            id:              `grow_blend_fallback_${fallbackBlendType.replace(/[\s/]/g, '_').toLowerCase()}`,
            recordId:        null,
            recordType:      'blend_suggestion',
            recordName:      specificProduct,
            itemName:        specificProduct,
            ownershipStatus: 'wishlist',
            shoppingType:    'buy_new_item',
            itemType:        'blend',
            suggestedFamily: fallbackBlendType,
            rationale:       `Diversify your blend collection with a ${fallbackBlendType} offering.`,
          }],
          actionPayload: {
            shoppingType:    'buy_new_item',
            itemType:        'blend',
            suggestedFamily: fallbackBlendType,
            specificProduct,
          },
        }));
      }
    }

    // Fallback whiskey gap — suggest a starter bottle when none owned (whiskeykeeper only)
    if (whiskeyActive && bottles.length === 0 && blends.length > 0) {
      const starterType = 'Bourbon';
      const specificProduct = WHISKEY_PROGRESSION_PRODUCTS[starterType];
      results.push(createRecommendation({
        category:           CATEGORY.GROW_EXPAND,
        goal:               'whiskey_type_expansion',
        actionType:         ACTION_TYPE.SHOPPING_LIST_ACTION,
        title:              `Explore ${specificProduct}`,
        summary:            'Add a bourbon to your collection to unlock tobacco pairings.',
        whyItMatters:       'Bourbon is the most versatile pairing partner for pipe tobacco — its corn sweetness and vanilla-oak ' +
                            'notes complement Burley and Virginia blends in a way that makes a session feel complete. ' +
                            'A single well-chosen bottle opens a whole dimension of pairings.',
        moduleKey:          MODULE_KEY.WHISKEY,
        ownershipContext:   OWNERSHIP_CONTEXT.EXTERNAL,
        priority:           PRIORITY.LOW,
        confidence:         'medium',
        items: [{
          id:              'grow_whiskey_fallback_bourbon',
          recordId:        null,
          recordType:      'bottle_suggestion',
          recordName:      specificProduct,
          itemName:        specificProduct,
          ownershipStatus: 'wishlist',
          shoppingType:    'buy_new_item',
          itemType:        'bottle',
          suggestedType:   starterType,
          rationale:       'Bourbon is the most approachable and versatile pairing partner for pipe tobacco.',
        }],
        actionPayload: {
          shoppingType:    'buy_new_item',
          itemType:        'bottle',
          suggestedType:   starterType,
          specificProduct,
        },
      }));
    }

    // Fallback pipe shape — suggest a billiard when collection lacks one (pipekeeper only)
    if (pipeActive && pipes.length >= 1) {
      const ownedShapes = new Set(pipes.map((p) => (p.shape || '').toLowerCase()).filter(Boolean));
      if (!ownedShapes.has('billiard')) {
        const suggestedShape = 'Billiard';
        results.push(createRecommendation({
          category:           CATEGORY.GROW_EXPAND,
          goal:               'pipe_shape_expansion',
          actionType:         ACTION_TYPE.ADVISORY,
          title:              `Add a ${suggestedShape} to Your Rotation`,
          summary:            `A classic ${suggestedShape} is the most versatile pipe shape — a reliable addition to any collection.`,
          whyItMatters:       'The Billiard\'s straight chamber keeps smoke even and focused, making it ideal for a wide range of blend types. ' +
                              'It\'s the most widely available shape and the single most versatile addition you can make.',
          moduleKey:          MODULE_KEY.PIPE,
          ownershipContext:   OWNERSHIP_CONTEXT.EXTERNAL,
          priority:           PRIORITY.LOW,
          confidence:         'medium',
          items: [{
            id:              'grow_pipe_fallback_billiard',
            recordId:        null,
            recordType:      'pipe_suggestion',
            recordName:      suggestedShape,
            itemName:        `${suggestedShape} Pipe`,
            ownershipStatus: 'wishlist',
            shoppingType:    'buy_new_item',
            itemType:        'pipe',
            suggestedShape,
            rationale:       'A Billiard is the most versatile and widely available pipe shape.',
          }],
          actionPayload: {
            shoppingType:    'buy_new_item',
            itemType:        'pipe',
            suggestedShape,
          },
        }));
      }
    }
  }

  return results;
}