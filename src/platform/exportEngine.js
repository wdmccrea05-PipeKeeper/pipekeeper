/**
 * Universal Export Engine
 * Centralized export functionality for all modules
 * Modules register their record types, engine handles export
 */

import { base44 } from '@/api/base44Client';
import { MODULE_REGISTRY } from './moduleRegistry';
import { aggregateCollection } from '@/components/keeper-core/aggregation/collectionAggregation';

function getModuleId(module) {
  return module?.id || module?.key || module?.moduleKey || module?.entityName || 'unknown';
}

/**
 * Export collection to CSV
 */
export async function exportToCSV(userEmail, options = {}) {
  try {
    const { modules = null, format = 'standard' } = options;
    
    const modulesToExport = modules 
      ? modules.map(m => MODULE_REGISTRY[m]).filter(Boolean)
      : Object.values(MODULE_REGISTRY).filter(m => m.status === 'active');
    
    const rows = [];
    
    // CSV header
    rows.push(['Module', 'Name', 'Brand', 'Category', 'Rating', 'Estimated Value', 'Notes', 'Date Added']);
    
    // Collect items from all modules
    for (const module of modulesToExport) {
      const items = await base44.entities[module.entityName].filter({
        created_by: userEmail,
      });
      
      for (const item of (items || [])) {
        rows.push([
          module.name,
          item.name || '',
          item.brand || '',
          item.category || '',
          item.rating || '',
          item.estimated_value || '',
          (item.notes || '').replace(/"/g, '""'),  // Escape quotes
          item.created_date || '',
        ]);
      }
    }
    
    // Convert to CSV string
    const csv = rows
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return {
      filename: `collection-export-${new Date().toISOString().split('T')[0]}.csv`,
      content: csv,
      mimetype: 'text/csv',
    };
  } catch (err) {
    console.error('CSV export failed:', err);
    throw err;
  }
}

/**
 * Export to JSON
 */
export async function exportToJSON(userEmail, options = {}) {
  try {
    const { modules = null } = options;
    
    const modulesToExport = modules 
      ? modules.map(m => MODULE_REGISTRY[m]).filter(Boolean)
      : Object.values(MODULE_REGISTRY).filter(m => m.status === 'active');
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      modules: {},
    };
    
    for (const module of modulesToExport) {
      const items = await base44.entities[module.entityName].filter({
        created_by: userEmail,
      });
      const moduleId = getModuleId(module);
      
      exportData.modules[moduleId] = {
        name: module.name || module.displayName || moduleId,
        count: items?.length || 0,
        items: items || [],
      };
    }
    
    return {
      filename: `collection-export-${new Date().toISOString().split('T')[0]}.json`,
      content: JSON.stringify(exportData, null, 2),
      mimetype: 'application/json',
    };
  } catch (err) {
    console.error('JSON export failed:', err);
    throw err;
  }
}

/**
 * Generate collection summary report
 */
export async function generateCollectionReport(userEmail, options = {}) {
  try {
    const { modules = null, includePhotos = false } = options;
    
    const modulesToInclude = modules 
      ? modules.map(m => MODULE_REGISTRY[m]).filter(Boolean)
      : Object.values(MODULE_REGISTRY).filter(m => m.status === 'active');
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {},
      modules: {},
    };
    const agg = await aggregateCollection(userEmail);
    const moduleStats = {
      pipekeeper: agg?.pipes,
      tobacco: agg?.tobacco,
      whiskeykeeper: agg?.whiskey,
      cigarkeeper: agg?.cigar,
      winekeeper: agg?.wine,
    };
    
    let totalValue = 0;
    let totalItems = 0;
    
    for (const module of modulesToInclude) {
      const moduleId = getModuleId(module);
      const items = await base44.entities[module.entityName].filter({
        created_by: userEmail,
      });
      const stats = moduleStats[moduleId] || {};
      const moduleValue = Number(stats?.value || 0);
      const moduleCount = Number(stats?.count || 0);
      
      totalValue += moduleValue;
      totalItems += moduleCount;
      
      report.modules[moduleId] = {
        name: module.name || module.displayName || moduleId,
        count: moduleCount,
        totalValue: moduleValue,
        averageValue: moduleCount > 0 ? moduleValue / moduleCount : 0,
        topItems: (items || [])
          .sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0))
          .slice(0, 5)
          .map(i => ({
            name: i.name,
            value: i.estimated_value,
            rating: i.rating,
          })),
      };
    }
    
    report.summary = {
      totalItems,
      totalValue,
      averageValuePerItem: totalItems > 0 ? totalValue / totalItems : 0,
      moduleCount: Object.keys(report.modules).length,
    };
    
    return report;
  } catch (err) {
    console.error('Report generation failed:', err);
    throw err;
  }
}

/**
 * Export module-specific format
 * Each module can have custom export logic
 */
export async function exportModuleFormat(userEmail, moduleId, format = 'standard') {
  try {
    const module = MODULE_REGISTRY[moduleId];
    if (!module) throw new Error(`Unknown module: ${moduleId}`);
    
    const items = await base44.entities[module.entityName].filter({
      created_by: userEmail,
    });
    
    // Modules can define custom export handlers
    if (module.exportHandler) {
      return await module.exportHandler(items, format);
    }
    
    // Default: return as JSON
    return {
      filename: `${getModuleId(module)}-export-${new Date().toISOString().split('T')[0]}.json`,
      content: JSON.stringify({ module: module.name, items }, null, 2),
      mimetype: 'application/json',
    };
  } catch (err) {
    console.error('Module export failed:', err);
    throw err;
  }
}