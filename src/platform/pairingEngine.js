/**
 * Universal Pairing Engine
 * Cross-module item pairing logic
 * Works for any combination of collector items
 * 
 * Examples:
 * - pipe + tobacco + whiskey
 * - cigar + whiskey + coffee
 * - wine + food + cheese
 * 
 * Modules simply define their pairing compatibility
 */

import { base44 } from '@/api/base44Client';
import { MODULE_REGISTRY } from './moduleRegistry';

/**
 * Pairing modes — used to classify the type of recommendation.
 * direct_pairing: two items consumed together in one session (e.g. cigar + whiskey)
 * collection_mix_match: multiple pairing options generated across the full collection
 * incompatible_simultaneous: combinations that should NEVER be suggested together
 */
export const PAIRING_MODES = {
  DIRECT: 'direct_pairing',
  COLLECTION_MIX_MATCH: 'collection_mix_match',
  INCOMPATIBLE: 'incompatible_simultaneous',
};

/**
 * Pairing compatibility matrix
 * Which modules can pair with which
 */
const PAIRING_MATRIX = {
  pipekeeper: {
    compatible: ['tobacco', 'whiskeykeeper'],
    incompatible: [],
  },
  tobacco: {
    compatible: ['pipekeeper', 'whiskeykeeper'],
    incompatible: [],
  },
  whiskeykeeper: {
    compatible: ['pipekeeper', 'tobacco', 'cigarkeeper', 'winekeeper'],
    incompatible: [],
  },
  cigarkeeper: {
    compatible: ['whiskeykeeper', 'winekeeper', 'coffeekeeper'],
    incompatible: [],
  },
  winekeeper: {
    compatible: ['food', 'cheese', 'cigarkeeper'],
    incompatible: [],
  },
  coffeekeeper: {
    compatible: ['cigarkeeper', 'pastry'],
    incompatible: [],
  },
};

/**
 * Module pairs that must NEVER be recommended as a simultaneous live experience.
 * These are alternatives in a session — not complements.
 *
 * Examples:
 *  - You smoke a pipe OR a cigar (not both at once)
 *  - You drink whiskey OR wine (not both at once)
 */
const SIMULTANEOUS_INCOMPATIBLE = new Set([
  // Normalised as "module_a|module_b" (alphabetical order for lookup)
  'cigarkeeper|pipekeeper',
  'tobacco|cigarkeeper',   // tobacco is the pipe-tobacco module
  'winekeeper|whiskeykeeper',
]);

/**
 * Return a normalised key for a module pair (alphabetical, pipe-delimited).
 */
function pairKey(module1, module2) {
  return [module1, module2].sort().join('|');
}

/**
 * Check if two modules should NOT be presented as a simultaneous live experience.
 * Use this to filter nonsensical combined recommendations before surfacing them.
 *
 * @param {string} module1
 * @param {string} module2
 * @returns {boolean} true if the pair is incompatible for simultaneous use
 */
export function isSimultaneouslyIncompatible(module1, module2) {
  if (!module1 || !module2 || module1 === module2) return false;
  return SIMULTANEOUS_INCOMPATIBLE.has(pairKey(module1, module2));
}

/**
 * Given a list of active module IDs, return all valid two-way direct pairing paths.
 * Filters out any pair that is incompatible for simultaneous use.
 *
 * @param {string[]} activeModuleIds - e.g. ['cigarkeeper', 'whiskeykeeper', 'pipekeeper']
 * @returns {Array<{a: string, b: string}>} valid pairing paths
 */
export function getValidDirectPairingPaths(activeModuleIds = []) {
  const paths = [];
  const seen = new Set();

  for (const modA of activeModuleIds) {
    const compatible = PAIRING_MATRIX[modA]?.compatible || [];
    for (const modB of compatible) {
      if (!activeModuleIds.includes(modB)) continue;
      if (isSimultaneouslyIncompatible(modA, modB)) continue;
      const key = pairKey(modA, modB);
      if (seen.has(key)) continue;
      seen.add(key);
      paths.push({ a: modA, b: modB });
    }
  }

  return paths;
}

/**
 * Given a set of active module IDs, generate human-readable collection-wide
 * mix-and-match pairing suggestion labels.  This is a local (no-LLM) helper
 * that produces the scaffolding Curator can use to frame its recommendations.
 *
 * @param {string[]} activeModuleIds
 * @returns {string[]} suggestion labels
 */
export function generateCollectionPairingSuggestions(activeModuleIds = []) {
  const paths = getValidDirectPairingPaths(activeModuleIds);

  const labels = {
    'cigarkeeper|whiskeykeeper': 'Best cigar + whiskey pairings from your current inventory',
    'cigarkeeper|winekeeper': 'Best cigar + wine pairings from your current inventory',
    'pipekeeper|whiskeykeeper': 'Best pipe + whiskey pairings from your current inventory',
    'pipekeeper|tobacco': 'Best pipe + tobacco pairings from your current inventory',
    'cigarkeeper|coffeekeeper': 'Best cigar + coffee pairings from your current inventory',
  };

  return paths
    .map(({ a, b }) => labels[pairKey(a, b)])
    .filter(Boolean);
}

/**
 * Validate a requested pairing between two or more modules.
 *
 * Returns { valid: true } when all module pairs are compatible.
 * Returns { valid: false, reason: string } if any pair is invalid.
 *
 * Use this before generating pairing recommendations to prevent
 * nonsensical combinations (e.g. pipe + cigar, whiskey + wine).
 *
 * @param {string[]} moduleIds - modules the user wants to pair
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validatePairingModules(moduleIds = []) {
  if (!Array.isArray(moduleIds) || moduleIds.length < 2) {
    return { valid: false, reason: 'At least two modules required for pairing.' };
  }

  for (let i = 0; i < moduleIds.length; i++) {
    for (let j = i + 1; j < moduleIds.length; j++) {
      const a = moduleIds[i];
      const b = moduleIds[j];
      if (isSimultaneouslyIncompatible(a, b)) {
        return {
          valid: false,
          reason: `${a} and ${b} cannot be paired simultaneously — they are session alternatives, not complements.`,
        };
      }
      const compatA = PAIRING_MATRIX[a]?.compatible || [];
      if (!compatA.includes(b)) {
        return {
          valid: false,
          reason: `${a} and ${b} have no defined pairing compatibility.`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Synchronous pairing recommendations using pre-fetched collection data.
 *
 * Unlike getPairingRecommendations this function does NOT make any API calls.
 * It works entirely from the context already available in the Curator workspace,
 * which prevents UI hangs and timeouts.
 *
 * Results are deterministic (sorted by rating desc, then name asc) and capped
 * at `limit` items per compatible module to prevent oversized payloads.
 *
 * @param {{
 *   pipes?: Array,
 *   blends?: Array,
 *   bottles?: Array,
 *   cigars?: Array,
 * }} collectionContext - pre-fetched collection data
 * @param {string[]} activeModuleIds  - e.g. ['pipekeeper', 'whiskeykeeper']
 * @param {number}   [limit=5]        - max items per pairing partner
 * @returns {{
 *   valid: boolean,
 *   reason?: string,
 *   pairings: Array<{ module: string, moduleName: string, items: Array }>
 * }}
 */
export function getPairingRecommendationsFromContext(
  collectionContext = {},
  activeModuleIds = [],
  limit = 5
) {
  const validation = validatePairingModules(activeModuleIds);
  if (!validation.valid) {
    return { valid: false, reason: validation.reason, pairings: [] };
  }

  const paths = getValidDirectPairingPaths(activeModuleIds);
  if (paths.length === 0) {
    return {
      valid: false,
      reason: 'No valid pairing paths found for the selected modules.',
      pairings: [],
    };
  }

  // Module → collection items (pre-fetched)
  const moduleItems = {
    pipekeeper:    (collectionContext.pipes   || []).filter(i => i.ai_excluded !== true),
    tobacco:       (collectionContext.blends  || []).filter(i => i.ai_excluded !== true),
    whiskeykeeper: (collectionContext.bottles || []).filter(i => i.ai_excluded !== true),
    cigarkeeper:   (collectionContext.cigars  || []).filter(i => i.ai_excluded !== true),
  };

  const moduleNames = {
    pipekeeper:    'PipeKeeper',
    tobacco:       'Tobacco',
    whiskeykeeper: 'WhiskeyKeeper',
    cigarkeeper:   'CigarKeeper',
  };

  function topItems(items, n) {
    return [...items]
      .sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (a.name || '').localeCompare(b.name || '');
      })
      .slice(0, n)
      .map(i => ({ id: i.id, name: i.name, rating: i.rating || null }));
  }

  const seen = new Set();
  const pairings = [];

  for (const { a, b } of paths) {
    const key = pairKey(a, b);
    if (seen.has(key)) continue;
    seen.add(key);

    const itemsA = moduleItems[a] || [];
    const itemsB = moduleItems[b] || [];

    if (itemsA.length > 0) {
      pairings.push({
        module: a,
        moduleName: moduleNames[a] || a,
        items: topItems(itemsA, limit),
      });
    }
    if (itemsB.length > 0) {
      pairings.push({
        module: b,
        moduleName: moduleNames[b] || b,
        items: topItems(itemsB, limit),
      });
    }
  }

  return { valid: true, pairings };
}

/**
export async function getPairingRecommendations(userEmail, itemId, moduleId, limit = 5) {
  try {
    const module = MODULE_REGISTRY[moduleId];
    if (!module) throw new Error(`Unknown module: ${moduleId}`);
    
    const item = (await base44.entities[module.entityName].filter({
      id: itemId,
    }))?.[0];
    
    if (!item) throw new Error(`Item not found: ${itemId}`);
    
    // Get compatible modules
    const compatible = PAIRING_MATRIX[moduleId]?.compatible || [];
    
    const recommendations = {
      item: item.name,
      module: moduleId,
      pairings: [],
    };
    
    // For each compatible module, get best items
    for (const compatibleModule of compatible) {
      // Handle special cases (tobacco is not an entity, it's part of pipes)
      if (compatibleModule === 'tobacco') {
        // Get TobaccoBlend recommendations
        const blends = await base44.entities.TobaccoBlend.filter({
          created_by: userEmail,
        });
        
        // CRITICAL: Exclude collection-only blends (ai_excluded=true)
        const topBlends = (blends || [])
          .filter(b => b.ai_excluded !== true)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, limit);
        
        recommendations.pairings.push({
          module: 'tobacco',
          items: topBlends.map(b => ({ id: b.id, name: b.name, rating: b.rating })),
        });
        
        continue;
      }
      
      // Regular module pairing
      const moduleConfig = MODULE_REGISTRY[compatibleModule];
      if (!moduleConfig) continue;
      
      try {
        const items = await base44.entities[moduleConfig.entityName].filter({
          created_by: userEmail,
        });
        
        const topItems = (items || [])
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, limit);
        
        if (topItems.length > 0) {
          recommendations.pairings.push({
            module: compatibleModule,
            moduleName: moduleConfig.name,
            items: topItems.map(i => ({ id: i.id, name: i.name, rating: i.rating })),
          });
        }
      } catch (err) {
        console.warn(`Could not fetch items for ${compatibleModule}:`, err.message);
      }
    }
    
    return recommendations;
  } catch (err) {
    console.error('Pairing recommendation failed:', err);
    throw err;
  }
}

/**
 * Check if two items can be paired
 */
export function canPair(module1, module2) {
  const compatible1 = PAIRING_MATRIX[module1]?.compatible || [];
  const compatible2 = PAIRING_MATRIX[module2]?.compatible || [];
  
  return compatible1.includes(module2) && compatible2.includes(module1);
}

/**
 * Register pairing for event logging
 */
export async function registerPairing(userEmail, itemIds, eventType = 'session') {
  try {
    const pairing = {
      item_ids: itemIds,
      event_type: eventType,
      date: new Date().toISOString(),
      created_by: userEmail,
    };
    
    // Store in event log for future pattern analysis
    // This enables learning which pairings work best
    return await base44.entities.CollectionEvent.create(pairing);
  } catch (err) {
    console.error('Pairing registration failed:', err);
    // Non-critical, don't throw
    return null;
  }
}

/**
 * Get pairing patterns for user
 * What items are frequently paired together?
 */
export async function getPairingPatterns(userEmail, limit = 10) {
  try {
    const events = await base44.entities.CollectionEvent.filter({
      created_by: userEmail,
    });
    
    const patterns = {};
    
    for (const event of (events || [])) {
      if (!event.item_ids || event.item_ids.length < 2) continue;
      
      // Create combination key
      const key = event.item_ids.sort().join('-');
      patterns[key] = (patterns[key] || 0) + 1;
    }
    
    // Sort by frequency
    const sorted = Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([itemIds, count]) => ({
        itemIds: itemIds.split('-'),
        frequency: count,
      }));
    
    return sorted;
  } catch (err) {
    console.error('Pairing patterns lookup failed:', err);
    return [];
  }
}

/**
 * Get most common pairings for item
 */
export async function getItemPairingHistory(userEmail, itemId) {
  try {
    const events = await base44.entities.CollectionEvent.filter({
      created_by: userEmail,
    });
    
    const pairings = (events || [])
      .filter(e => e.item_ids && e.item_ids.includes(itemId))
      .map(e => ({
        paired_with: e.item_ids.filter(id => id !== itemId),
        date: e.date,
        event_type: e.event_type,
        rating: e.rating,
      }));
    
    return pairings;
  } catch (err) {
    console.error('Item pairing history lookup failed:', err);
    return [];
  }
}

/**
 * Add new pairing compatibility rule
 * Allows runtime extension of pairing rules
 */
export function addPairingRule(module1, module2) {
  if (!PAIRING_MATRIX[module1]) PAIRING_MATRIX[module1] = { compatible: [], incompatible: [] };
  if (!PAIRING_MATRIX[module2]) PAIRING_MATRIX[module2] = { compatible: [], incompatible: [] };
  
  if (!PAIRING_MATRIX[module1].compatible.includes(module2)) {
    PAIRING_MATRIX[module1].compatible.push(module2);
  }
  
  if (!PAIRING_MATRIX[module2].compatible.includes(module1)) {
    PAIRING_MATRIX[module2].compatible.push(module1);
  }
}

/**
 * Remove pairing compatibility rule
 */
export function removePairingRule(module1, module2) {
  if (PAIRING_MATRIX[module1]) {
    PAIRING_MATRIX[module1].compatible = PAIRING_MATRIX[module1].compatible.filter(m => m !== module2);
  }
  
  if (PAIRING_MATRIX[module2]) {
    PAIRING_MATRIX[module2].compatible = PAIRING_MATRIX[module2].compatible.filter(m => m !== module1);
  }
}