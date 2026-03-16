/**
 * Universal Module Registry
 * Dynamically registers and manages collector modules
 * Replaces hardcoded module logic with plugin architecture
 */

export const MODULE_REGISTRY = {
  pipekeeper: {
    id: 'pipekeeper',
    name: 'PipeKeeper',
    displayName: 'Pipe Collection',
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/15563e4ee_PipeiconUpdated-fotor-20260110195319.png',
    itemType: 'Pipe',
    entityName: 'Pipe',
    color: '#A35C5C',
    description: 'Manage and track your pipe collection',
    status: 'active',
    tier: 'premium',
    
    // Module capabilities
    capabilities: {
      insights: ['most_valuable', 'most_used', 'underused', 'by_shape', 'by_maker', 'condition_analysis'],
      views: ['grid', 'list', 'gallery', 'statistics', 'maintenance_log'],
      pairing: ['tobacco', 'whiskey'],
      events: ['smoking_session', 'maintenance'],
      ai: ['identification', 'recommendation', 'specialization', 'break_in_schedule'],
    },
    
    // Record field extensions beyond base CollectionItem
    fields: {
      maker: { type: 'string', label: 'Maker/Brand' },
      shape: { type: 'enum', label: 'Shape' },
      bend: { type: 'enum', label: 'Bend' },
      finish: { type: 'enum', label: 'Finish' },
      bowl_material: { type: 'enum', label: 'Bowl Material' },
      stem_material: { type: 'enum', label: 'Stem Material' },
      condition: { type: 'enum', label: 'Condition' },
      length_mm: { type: 'number', label: 'Length (mm)' },
      weight_grams: { type: 'number', label: 'Weight (g)' },
      is_favorite: { type: 'boolean', label: 'Favorite' },
    },
    
    // Image configuration
    images: {
      main: 5,        // 5 main angles/views
      stamping: 2,    // Maker markings
    },
    
    // Inventory statuses specific to pipes
    inventoryStatuses: ['collection', 'smoking', 'rotation', 'restoration'],
  },
  
  whiskeykeeper: {
    id: 'whiskeykeeper',
    name: 'WhiskeyKeeper',
    displayName: 'Whiskey Collection',
    icon: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 2h6v3l2 3v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8l2-3V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    itemType: 'Bottle',
    entityName: 'Bottle',
    color: '#D4A574',
    description: 'Manage and track your whiskey collection',
    status: 'active',
    tier: 'premium',
    
    capabilities: {
      insights: ['most_valuable', 'most_used', 'by_type', 'by_region', 'by_distillery', 'value_distribution', 'tasting_notes'],
      views: ['grid', 'list', 'gallery', 'statistics', 'tasting_log'],
      pairing: ['pipe', 'cigar', 'tobacco'],
      events: ['whiskey_tasting', 'purchase'],
      ai: ['identification', 'valuation', 'recommendation', 'pairing'],
    },
    
    fields: {
      distillery: { type: 'string', label: 'Distillery' },
      region: { type: 'string', label: 'Region' },
      type: { type: 'enum', label: 'Type' },
      age: { type: 'number', label: 'Age (Years)' },
      abv: { type: 'number', label: 'ABV (%)' },
      bottle_size: { type: 'enum', label: 'Size' },
      retail_price: { type: 'number', label: 'Retail Price' },
      collector_value: { type: 'number', label: 'Collector Value' },
      favorite: { type: 'boolean', label: 'Favorite' },
    },
    
    images: {
      main: 2,        // Front & back label
    },
    
    inventoryStatuses: ['sealed', 'open', 'empty'],
  },
  
  cigarkeeper: {
    id: 'cigarkeeper',
    name: 'CigarKeeper',
    displayName: 'Cigar Collection',
    icon: '🚬',
    itemType: 'Cigar',
    entityName: 'Cigar',
    color: '#8B6F47',
    description: 'Coming soon: Manage your cigar collection',
    status: 'upcoming',
    tier: 'premium',
    
    capabilities: {
      insights: ['by_brand', 'by_country', 'by_strength', 'aging_status', 'value_distribution'],
      views: ['grid', 'list', 'humidor_view'],
      pairing: ['whiskey', 'wine'],
      events: ['cigar_session', 'aging_milestone'],
      ai: ['recommendation', 'aging_optimization', 'pairing'],
    },
    
    fields: {
      brand: { type: 'string', label: 'Brand' },
      country: { type: 'string', label: 'Country' },
      strength: { type: 'enum', label: 'Strength' },
      length_mm: { type: 'number', label: 'Length (mm)' },
      gauge: { type: 'number', label: 'Ring Gauge' },
      aged_years: { type: 'number', label: 'Aged (Years)' },
    },
    
    images: {
      main: 1,        // Cigar photo
      band: 1,        // Band close-up
    },
    
    inventoryStatuses: ['humidor', 'aged', 'smoked'],
  },
  
  winekeeper: {
    id: 'winekeeper',
    name: 'WineKeeper',
    displayName: 'Wine Collection',
    icon: '🍷',
    itemType: 'Wine',
    entityName: 'Wine',
    color: '#8B3A3A',
    description: 'Coming soon: Manage your wine collection',
    status: 'upcoming',
    tier: 'premium',
    
    capabilities: {
      insights: ['by_vintage', 'by_region', 'by_grape', 'cellaring_status', 'value_appreciation'],
      views: ['grid', 'cellar_view', 'tasting_notes'],
      pairing: ['food', 'cheese', 'cigar'],
      events: ['wine_tasting', 'cellaring_update'],
      ai: ['recommendation', 'pairing', 'cellaring_advice'],
    },
    
    fields: {
      vineyard: { type: 'string', label: 'Vineyard' },
      vintage: { type: 'number', label: 'Vintage' },
      region: { type: 'string', label: 'Region' },
      grape: { type: 'array', label: 'Grape Varieties' },
      alcohol_content: { type: 'number', label: 'Alcohol %' },
      cellar_location: { type: 'string', label: 'Cellar Location' },
    },
    
    images: {
      main: 1,        // Bottle label
      cellar: 1,      // Cellar position
    },
    
    inventoryStatuses: ['cellaring', 'ready_to_drink', 'consumed'],
  },
};

/**
 * Get all active modules
 */
export function getActiveModules() {
  return Object.values(MODULE_REGISTRY).filter(m => m.status === 'active');
}

/**
 * Get all modules (active + upcoming)
 */
export function getAllModules() {
  return Object.values(MODULE_REGISTRY);
}

/**
 * Get module by ID
 */
export function getModule(moduleId) {
  return MODULE_REGISTRY[moduleId];
}

/**
 * Check if user has access to module
 */
export function hasModuleAccess(module, userEntitlements) {
  if (module.status === 'active') return true;
  // Check if user has tier for upcoming modules
  return userEntitlements?.[module.tier];
}

/**
 * Get modules user has access to
 */
export function getUserModules(userEntitlements = {}) {
  return getActiveModules().filter(m => hasModuleAccess(m, userEntitlements));
}

/**
 * Get total enabled modules for user
 */
export function getEnabledModuleCount(userEntitlements = {}) {
  return getUserModules(userEntitlements).length;
}