/**
 * Universal Collection Item Model
 * All collector items inherit from this base structure
 * Module-specific fields extend this base
 */

/**
 * Base collection item schema
 * Shared across all modules (PipeKeeper, WhiskeyKeeper, CigarKeeper, WineKeeper, etc)
 */
export const COLLECTION_ITEM_BASE = {
  // Core identification
  id: { type: 'string', description: 'Unique item identifier' },
  module: { type: 'string', description: 'Module ID (pipekeeper, whiskeykeeper, etc)' },
  name: { type: 'string', description: 'Item name/label' },
  brand: { type: 'string', description: 'Brand/maker/producer' },
  
  // Categorization
  category: { type: 'string', description: 'Item category (type, style, etc)' },
  tags: { type: 'array', description: 'User tags for organization' },
  
  // Valuation
  purchase_price: { type: 'number', description: 'Original purchase price' },
  estimated_value: { type: 'number', description: 'Current estimated value' },
  value_confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  value_source: { type: 'string', description: 'Where valuation came from' },
  value_last_updated: { type: 'date-time', description: 'Last valuation update' },
  
  // Metadata
  notes: { type: 'string', description: 'User notes' },
  rating: { type: 'number', min: 0, max: 5, description: 'Personal rating' },
  photos: { type: 'array', description: 'Photo URLs' },
  is_favorite: { type: 'boolean', default: false },
  
  // Timestamps
  created_date: { type: 'date-time', description: 'When added to collection' },
  updated_date: { type: 'date-time', description: 'Last update' },
  created_by: { type: 'string', description: 'User email' },
  
  // AI & Search
  ai_excluded: { type: 'boolean', default: false, description: 'Exclude from AI matching' },
  indexed_text: { type: 'string', description: 'Full-text search index' },
};

/**
 * Inventory unit model
 * Handles multiple units of same item with different statuses
 * Works for tins, bottles, cigars, etc
 */
export const INVENTORY_UNIT_MODEL = {
  id: { type: 'string' },
  item_id: { type: 'string', description: 'Parent item' },
  item_name: { type: 'string', description: 'Denormalized item name' },
  module: { type: 'string', description: 'Module ID' },
  
  // Status varies by module
  // Pipes: collection, smoking, rotation, restoration
  // Whiskey: sealed, open, empty
  // Cigars: humidor, aged, smoked
  // Wine: cellaring, ready_to_drink, consumed
  status: { type: 'string', description: 'Inventory status' },
  
  // For consumables (open, open_in_progress)
  quantity: { type: 'number', description: 'Remaining units/oz/ml' },
  quantity_unit: { type: 'string', description: 'Unit (oz, ml, count)' },
  
  // Location tracking
  location: { type: 'string', description: 'Where stored' },
  location_details: { type: 'object', description: 'Shelf, humidor, cellar, etc' },
  
  // Dates
  acquired_date: { type: 'date', description: 'When acquired' },
  opened_date: { type: 'date', description: 'When opened/started' },
  consumed_date: { type: 'date', description: 'When consumed/finished' },
  
  // Pricing
  unit_price: { type: 'number', description: 'Price per unit' },
  current_unit_value: { type: 'number', description: 'Current market value per unit' },
  
  // Notes
  notes: { type: 'string', description: 'Unit-specific notes' },
};

/**
 * Collection event model
 * Shared across all modules (smoking sessions, tastings, purchases, etc)
 */
export const COLLECTION_EVENT_MODEL = {
  id: { type: 'string' },
  event_type: { 
    type: 'string',
    enum: ['smoking_session', 'whiskey_tasting', 'wine_tasting', 'cigar_session', 'purchase', 'maintenance', 'other']
  },
  
  // What was involved
  item_ids: { type: 'array', description: 'Items involved' },
  item_details: { type: 'array', description: 'Denormalized item names' },
  
  // Pairing (optional)
  pairings: { 
    type: 'array', 
    description: 'Which items were paired (e.g., pipe + tobacco + whiskey)' 
  },
  
  // Event details
  date: { type: 'date-time' },
  location: { type: 'string' },
  notes: { type: 'string' },
  rating: { type: 'number', min: 0, max: 5 },
  
  // Session metadata
  duration_minutes: { type: 'number' },
  mood: { type: 'string' },
  companions: { type: 'array' },
  
  // Created by
  created_date: { type: 'date-time' },
  created_by: { type: 'string' },
};

/**
 * Universal image configuration
 * Each module defines its image requirements
 */
export const IMAGE_CONFIG_BASE = {
  module: { type: 'string', description: 'Module ID' },
  item_id: { type: 'string' },
  
  // Image categories vary by module
  // Pipes: main (5), stamping (2)
  // Whiskey: main (2)
  // Cigars: main (1), band (1)
  // Wine: main (1), cellar (1)
  
  image_type: { 
    type: 'string',
    description: 'main, label, detail, stamping, band, cellar, etc'
  },
  
  image_url: { type: 'string' },
  thumbnail_url: { type: 'string' },
  
  // Metadata
  width: { type: 'number' },
  height: { type: 'number' },
  file_size: { type: 'number' },
  uploaded_date: { type: 'date-time' },
  
  // AI processing
  ai_analyzed: { type: 'boolean' },
  ai_tags: { type: 'array' },
};

/**
 * Helper: Create item with module context
 */
export function createCollectionItem(module, itemData) {
  return {
    ...COLLECTION_ITEM_BASE,
    module: module.id,
    // Extend with module-specific fields
    ...itemData,
  };
}

/**
 * Helper: Validate item against base model
 */
export function validateCollectionItem(item) {
  const required = ['id', 'module', 'name', 'brand'];
  const missing = required.filter(f => !item[f]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  return true;
}

/**
 * Helper: Get searchable text from item
 */
export function getIndexedText(item) {
  const parts = [
    item.name,
    item.brand,
    item.category,
    item.notes,
    (item.tags || []).join(' '),
  ];
  
  return parts.filter(Boolean).join(' ').toLowerCase();
}