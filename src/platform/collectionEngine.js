/**
 * Universal Collection Engine
 * Shared business logic for all modules:
 * - Value calculations
 * - Inventory management
 * - Insights generation
 * - Search & filtering
 * 
 * NO module-specific code here. Generic algorithms only.
 */

import { base44 } from '@/api/base44Client';
import { MODULE_REGISTRY, getModule } from './moduleRegistry';
import { aggregateCollection } from '@/components/keeper-core/aggregation/collectionAggregation';

// ============================
// COLLECTION VALUE ENGINE
// ============================

/**
 * Calculate total collection value across all modules or single module
 */
export async function calculateCollectionValue(userEmail, moduleId = null) {
  try {
    const agg = await aggregateCollection(userEmail);
    const moduleStats = {
      pipekeeper: agg?.pipes,
      tobacco: agg?.tobacco,
      whiskeykeeper: agg?.whiskey,
      cigarkeeper: agg?.cigar,
      winekeeper: agg?.wine,
    };

    if (moduleId) {
      const stats = moduleStats[moduleId] || {};
      return {
        total: Number(stats?.value || 0),
        breakdown: {
          [moduleId]: {
            count: Number(stats?.count || 0),
            value: Number(stats?.value || 0),
          },
        },
        lastUpdated: new Date().toISOString(),
      };
    }

    const breakdown = Object.fromEntries(
      Object.entries(moduleStats).map(([key, stats]) => [
        key,
        {
          count: Number(stats?.count || 0),
          value: Number(stats?.value || 0),
        },
      ]),
    );

    return {
      total: Number(agg?.total?.value || 0),
      breakdown,
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Value calculation failed:', err);
    return { total: 0, breakdown: {}, error: err.message };
  }
}

/**
 * Get most valuable item across collection
 */
export async function getMostValuableItem(userEmail) {
  try {
    const modules = Object.values(MODULE_REGISTRY).filter(m => m.status === 'active');
    let mostValuable = null;
    
    for (const module of modules) {
      const items = await base44.entities[module.entityName].filter({
        created_by: userEmail,
      });
      
      const topItem = (items || []).sort((a, b) => 
        (b.estimated_value || 0) - (a.estimated_value || 0)
      )[0];
      
      if (topItem && (!mostValuable || topItem.estimated_value > mostValuable.estimated_value)) {
        mostValuable = { ...topItem, module: module.id };
      }
    }
    
    return mostValuable;
  } catch (err) {
    console.error('Most valuable item lookup failed:', err);
    return null;
  }
}

// ============================
// INVENTORY ENGINE
// ============================

/**
 * Get inventory summary for user
 */
export async function getInventorySummary(userEmail) {
  try {
    const units = await base44.entities.InventoryUnit.filter({
      created_by: userEmail,
    });
    
    const summary = {
      total_items: units?.length || 0,
      by_status: {},
      by_module: {},
    };
    
    for (const unit of (units || [])) {
      // By status
      summary.by_status[unit.status] = (summary.by_status[unit.status] || 0) + 1;
      
      // By module
      summary.by_module[unit.module] = (summary.by_module[unit.module] || 0) + 1;
    }
    
    return summary;
  } catch (err) {
    console.error('Inventory summary failed:', err);
    return { total_items: 0, by_status: {}, by_module: {} };
  }
}

/**
 * Create inventory unit for item
 */
export async function createInventoryUnit(itemId, module, status, quantity = null) {
  try {
    const item = await base44.entities[MODULE_REGISTRY[module].entityName].filter({
      id: itemId,
    });
    
    if (!item || item.length === 0) {
      throw new Error(`Item ${itemId} not found`);
    }
    
    return await base44.entities.InventoryUnit.create({
      item_id: itemId,
      item_name: item[0].name,
      module,
      status,
      quantity,
      acquired_date: new Date().toISOString().split('T')[0],
    });
  } catch (err) {
    console.error('Inventory unit creation failed:', err);
    throw err;
  }
}

// ============================
// UNIVERSAL INSIGHTS ENGINE
// ============================

/**
 * Generate universal insights for user's collection
 */
export async function generateCollectionInsights(userEmail) {
  try {
    const modules = Object.values(MODULE_REGISTRY).filter(m => m.status === 'active');
    const insights = {};
    
    for (const module of modules) {
      insights[module.id] = await generateModuleInsights(userEmail, module);
    }
    
    return {
      insights,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Insights generation failed:', err);
    return { insights: {}, error: err.message };
  }
}

/**
 * Generate insights for single module
 */
async function generateModuleInsights(userEmail, module) {
  try {
    const items = await base44.entities[module.entityName].filter({
      created_by: userEmail,
    });
    
    if (!items || items.length === 0) {
      return { count: 0, value: 0, insights: [] };
    }
    
    const insights = [];
    
    // Most valuable
    const mostValuable = items.sort((a, b) => 
      (b.estimated_value || 0) - (a.estimated_value || 0)
    )[0];
    insights.push({
      type: 'most_valuable',
      item: mostValuable.name,
      value: mostValuable.estimated_value,
    });
    
    // Highest rated
    const topRated = items.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    if (topRated?.rating) {
      insights.push({
        type: 'highest_rated',
        item: topRated.name,
        rating: topRated.rating,
      });
    }
    
    // Favorites count
    const favoriteCount = items.filter(i => i.is_favorite).length;
    if (favoriteCount > 0) {
      insights.push({
        type: 'favorite_count',
        count: favoriteCount,
      });
    }
    
    // Underused (not rated, not favorite, older acquisition)
    const underused = items.filter(i => !i.rating && !i.is_favorite);
    if (underused.length > 0) {
      insights.push({
        type: 'underused_items',
        count: underused.length,
      });
    }
    
    const totalValue = items.reduce((sum, i) => sum + (i.estimated_value || 0), 0);
    
    return {
      count: items.length,
      value: totalValue,
      insights,
      averageValue: totalValue / items.length,
    };
  } catch (err) {
    console.error(`Insights generation failed for ${module.id}:`, err);
    return { count: 0, value: 0, insights: [], error: err.message };
  }
}

// ============================
// UNIVERSAL SEARCH
// ============================

/**
 * Search across all modules
 */
export async function searchCollection(userEmail, query, options = {}) {
  try {
    const modules = Object.values(MODULE_REGISTRY).filter(m => m.status === 'active');
    const results = {
      total: 0,
      by_module: {},
      items: [],
    };
    
    const q = query.toLowerCase();
    
    for (const module of modules) {
      const items = await base44.entities[module.entityName].filter({
        created_by: userEmail,
      });
      
      const moduleResults = (items || []).filter(item => {
        const searchText = [
          item.name,
          item.brand,
          item.category,
          item.notes,
          (item.tags || []).join(' '),
        ].join(' ').toLowerCase();
        
        return searchText.includes(q);
      });
      
      results.by_module[module.id] = moduleResults.length;
      results.total += moduleResults.length;
      
      results.items.push(...moduleResults.map(item => ({
        ...item,
        module: module.id,
        moduleName: module.name,
      })));
    }
    
    // Sort by relevance (exact match first)
    results.items.sort((a, b) => {
      const aExact = a.name.toLowerCase() === q ? 1 : 0;
      const bExact = b.name.toLowerCase() === q ? 1 : 0;
      return bExact - aExact;
    });
    
    return results;
  } catch (err) {
    console.error('Search failed:', err);
    return { total: 0, by_module: {}, items: [], error: err.message };
  }
}

// ============================
// AI DATA LAYER
// ============================

/**
 * Unified data access for AI/Curator
 * Provides structured access without module-specific queries
 */
export const AiDataLayer = {
  /**
   * Get all items for a module
   */
  async getCollectionItems(userEmail, moduleId) {
    const module = getModule(moduleId);
    return await base44.entities[module.entityName].filter({
      created_by: userEmail,
    });
  },
  
  /**
   * Get user's favorite items
   */
  async getFavorites(userEmail, moduleId = null) {
    const modules = moduleId 
      ? [getModule(moduleId)]
      : Object.values(MODULE_REGISTRY).filter(m => m.status === 'active');
    
    const favorites = [];
    
    for (const module of modules) {
      const items = await base44.entities[module.entityName].filter({
        created_by: userEmail,
        is_favorite: true,
      });
      
      favorites.push(...(items || []).map(i => ({ ...i, module: module.id })));
    }
    
    return favorites;
  },
  
  /**
   * Get underused items
   */
  async getUnderusedItems(userEmail, moduleId = null) {
    const modules = moduleId 
      ? [getModule(moduleId)]
      : Object.values(MODULE_REGISTRY).filter(m => m.status === 'active');
    
    const underused = [];
    
    for (const module of modules) {
      const items = await base44.entities[module.entityName].filter({
        created_by: userEmail,
      });
      
      const moduleUnderused = (items || []).filter(i => 
        !i.rating || i.rating < 2 || !i.is_favorite
      );
      
      underused.push(...moduleUnderused.map(i => ({ ...i, module: module.id })));
    }
    
    return underused;
  },
  
  /**
   * Get collection value for module
   */
  async getCollectionValue(userEmail, moduleId = null) {
    return await calculateCollectionValue(userEmail, moduleId);
  },
  
  /**
   * Get user profile data
   */
  async getUserProfile(userEmail) {
    const profiles = await base44.entities.UserProfile.filter({
      user_email: userEmail,
    });
    
    return profiles?.[0] || null;
  },
};