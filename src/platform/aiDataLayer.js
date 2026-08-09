/**
 * Unified AI Data Access Layer
 * Provides clean, module-agnostic data access for Curator AI
 * AI doesn't need to know about specific modules - just use this interface
 * 
 * Example: AI asks "what should I smoke tonight?"
 * Instead of module-specific queries, it uses: getSmokableItems() → gets pipes + tobacco
 */

import { base44 } from '@/api/base44Client';
import { MODULE_REGISTRY } from './moduleRegistry';
import { fetchAllEntities } from '@/lib/base44/fetchAllEntities';
import { aggregateCollection } from '@/components/keeper-core/aggregation/collectionAggregation';


function getRegistryList() {
  return Array.isArray(MODULE_REGISTRY) ? MODULE_REGISTRY : Object.values(MODULE_REGISTRY || {});
}

function getRegistryModule(moduleId) {
  const list = getRegistryList();
  return list.find((m) => m?.key === moduleId || m?.moduleKey === moduleId || m?.id === moduleId) || null;
}

function decorateModuleItem(item, module) {
  return {
    ...item,
    module: module?.key || module?.moduleKey || module?.id,
    moduleName: module?.displayName || module?.name,
  };
}


/**
 * Get all items from collection
 */
export async function getAllCollectionItems(userEmail, filters = {}) {
  try {
    const modules = getRegistryList().filter(m => m && m.status === 'active' && m.entityName);
    const allItems = [];
    
    for (const module of modules) {
      const items = await base44.entities[module.entityName].filter({
        created_by: userEmail,
      });
      
      allItems.push(...(items || []).map(i => ({
        ...i,
        module: module.key || module.moduleKey || module.id,
        moduleName: module.displayName || module.name,
      })));
    }
    
    // Apply filters if provided
    if (filters.minRating) {
      return allItems.filter(i => (i.rating || 0) >= filters.minRating);
    }
    
    if (filters.favorites) {
      return allItems.filter(i => i.is_favorite);
    }
    
    return allItems;
  } catch (err) {
    console.error('Get all items failed:', err);
    return [];
  }
}

/**
 * Get module-specific items
 */
export async function getModuleItems(userEmail, moduleId) {
  try {
    const module = getRegistryModule(moduleId);
    if (!module) throw new Error(`Unknown module: ${moduleId}`);
    
    const items = await base44.entities[module.entityName].filter({
      created_by: userEmail,
    });
    
    return (items || []).map(i => ({
      ...i,
      module: module.id,
      moduleName: module.name,
    }));
  } catch (err) {
    console.error(`Get module items failed for ${moduleId}:`, err);
    return [];
  }
}

/**
 * Get smokable items (pipes + tobacco)
 * Used for smoking session recommendations
 */
export async function getSmokableItems(userEmail) {
  try {
    const pipes = await getModuleItems(userEmail, 'pipekeeper');
    const tobaccos = await base44.entities.TobaccoBlend.filter({
      created_by: userEmail,
    });
    
    return {
      pipes,
      tobaccos: (tobaccos || []).map(t => ({
        ...t,
        module: 'tobacco',
        moduleName: 'Tobacco',
      })),
    };
  } catch (err) {
    console.error('Get smokable items failed:', err);
    return { pipes: [], tobaccos: [] };
  }
}

/**
 * Get tastable items (whiskey + wine + etc)
 */
export async function getTastableItems(userEmail) {
  try {
    const whiskey = await getModuleItems(userEmail, 'whiskeykeeper');
    const wine = await getModuleItems(userEmail, 'winekeeper');
    
    return {
      whiskey,
      wine,
    };
  } catch (err) {
    console.error('Get tastable items failed:', err);
    return { whiskey: [], wine: [] };
  }
}

/**
 * Get favorite items across all modules
 */
export async function getFavorites(userEmail, moduleId = null) {
  try {
    if (moduleId) {
      const module = getRegistryModule(moduleId);
      const items = await base44.entities[module.entityName].filter({
        created_by: userEmail,
        is_favorite: true,
      });
      
      return (items || []).map(i => ({
        ...i,
        module: module.key || module.moduleKey || module.id,
        moduleName: module.displayName || module.name,
      }));
    }
    
    const allItems = await getAllCollectionItems(userEmail);
    return allItems.filter(i => i.is_favorite);
  } catch (err) {
    console.error('Get favorites failed:', err);
    return [];
  }
}

/**
 * Get underused items
 */
export async function getUnderusedItems(userEmail, moduleId = null) {
  try {
    if (moduleId) {
      const module = getRegistryModule(moduleId);
      const items = await base44.entities[module.entityName].filter({
        created_by: userEmail,
      });
      
      return (items || []).filter(i => 
        !i.rating || i.rating < 2 || !i.is_favorite
      ).map(i => ({
        ...i,
        module: module.key || module.moduleKey || module.id,
        moduleName: module.displayName || module.name,
      }));
    }
    
    const allItems = await getAllCollectionItems(userEmail);
    return allItems.filter(i => !i.rating || i.rating < 2 || !i.is_favorite);
  } catch (err) {
    console.error('Get underused items failed:', err);
    return [];
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(userEmail, moduleId = null) {
  try {
    const agg = await aggregateCollection(userEmail);
    const moduleMap = {
      pipekeeper: agg?.pipes,
      tobacco: agg?.tobacco,
      whiskeykeeper: agg?.whiskey,
      cigarkeeper: agg?.cigar,
      winekeeper: agg?.wine,
    };

    if (moduleId) {
      const moduleStats = moduleMap[moduleId] || {};
      const itemCount = Number(moduleStats?.count || 0);
      const totalValue = Number(moduleStats?.value || 0);

      return {
        moduleId,
        itemCount,
        totalValue,
        averageValue: itemCount > 0 ? totalValue / itemCount : 0,
        favoriteCount: Number(moduleStats?.favorite || 0),
        averageRating: moduleStats?.avgRating ?? 0,
      };
    }

    const byModule = Object.fromEntries(
      Object.entries(moduleMap).map(([key, moduleStats]) => [
        key,
        {
          itemCount: Number(moduleStats?.count || 0),
          totalValue: Number(moduleStats?.value || 0),
        },
      ]),
    );

    const totalItems = Number(agg?.total?.items || 0);
    const totalValue = Number(agg?.total?.value || 0);

    return {
      totalItems,
      totalValue,
      averageValuePerItem: totalItems > 0 ? totalValue / totalItems : 0,
      byModule,
    };
  } catch (err) {
    console.error('Get stats failed:', err);
    return { totalItems: 0, totalValue: 0, byModule: {} };
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userEmail) {
  try {
    const profiles = await base44.entities.UserProfile.filter({
      user_email: userEmail,
    });
    
    return profiles?.[0] || {};
  } catch (err) {
    console.error('Get user preferences failed:', err);
    return {};
  }
}

/**
 * Get item details (single item from any module)
 */
export async function getItem(itemId, moduleId) {
  try {
    const module = getRegistryModule(moduleId);
    if (!module) throw new Error(`Unknown module: ${moduleId}`);
    
    const items = await base44.entities[module.entityName].filter({
      id: itemId,
    });
    
    return items?.[0] || null;
  } catch (err) {
    console.error('Get item failed:', err);
    return null;
  }
}

/**
 * Get recent events/sessions
 */
export async function getRecentEvents(userEmail, limit = 20) {
  try {
    const events = await fetchAllEntities(
      base44.entities.SmokingLog,
      { created_by: userEmail },
      '-date',
      5000,
      200,
      'aiDataLayer:getRecentEvents:SmokingLog',
    );
    
    return (events || []).slice(0, limit);
  } catch (err) {
    console.error('Get recent events failed:', err);
    return [];
  }
}

/**
 * Get collection timeline
 */
export async function getCollectionTimeline(userEmail) {
  try {
    const items = await getAllCollectionItems(userEmail);
    
    return items
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .map(i => ({
        date: i.created_date,
        item: i.name,
        module: i.module,
        action: 'added',
      }));
  } catch (err) {
    console.error('Get timeline failed:', err);
    return [];
  }
}

/**
 * Search across collection
 */
export async function search(userEmail, query, moduleId = null) {
  try {
    const q = query.toLowerCase();
    
    if (moduleId) {
      const items = await getModuleItems(userEmail, moduleId);
      
      return items.filter(item => {
        const searchText = [
          item.name,
          item.brand,
          item.category,
          item.notes,
        ].join(' ').toLowerCase();
        
        return searchText.includes(q);
      });
    }
    
    // Search all modules
    const allItems = await getAllCollectionItems(userEmail);
    
    return allItems.filter(item => {
      const searchText = [
        item.name,
        item.brand,
        item.category,
        item.notes,
      ].join(' ').toLowerCase();
      
      return searchText.includes(q);
    });
  } catch (err) {
    console.error('Search failed:', err);
    return [];
  }
}