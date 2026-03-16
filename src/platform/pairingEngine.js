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
 * Get pairing recommendations for item
 */
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
        // Get TobaccoBlend recommendations (exclude collection-only)
        const blends = await base44.entities.TobaccoBlend.filter({
          created_by: userEmail,
        });
        
        const topBlends = (blends || [])
          .filter(b => b.ai_excluded !== true) // CRITICAL: Exclude collection-only blends
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