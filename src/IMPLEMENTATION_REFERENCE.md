# CollectionKeeper Modular Framework — Implementation Reference

## QUICK API REFERENCE

### Module Registry (moduleRegistry.js)
```javascript
import { MODULE_REGISTRY, getActiveModules, getModule } from 'platform/moduleRegistry';

// Get all active modules
const modules = getActiveModules();

// Get specific module
const pipekeeper = getModule('pipekeeper');

// Get all modules (including upcoming)
const allModules = Object.values(MODULE_REGISTRY);

// Filter by status
const active = Object.values(MODULE_REGISTRY).filter(m => m.status === 'active');
```

---

### Collection Engine (collectionEngine.js)
```javascript
import { 
  calculateCollectionValue,
  getMostValuableItem,
  getInventorySummary,
  generateCollectionInsights,
  searchCollection,
  createInventoryUnit,
  AiDataLayer,
} from 'platform/collectionEngine';

// VALUE CALCULATIONS
const totalValue = await calculateCollectionValue(userEmail);
// {total: 5000, breakdown: {pipekeeper: 2000, whiskeykeeper: 3000}}

const valueByModule = await calculateCollectionValue(userEmail, 'pipekeeper');
// {total: 2000, breakdown: {pipekeeper: 2000}}

const topItem = await getMostValuableItem(userEmail);
// {id, name, estimated_value, module, ...}

// INVENTORY MANAGEMENT
const inventory = await getInventorySummary(userEmail);
// {total_items: 45, by_status: {...}, by_module: {...}}

await createInventoryUnit(itemId, 'pipekeeper', 'collection', null);
// Creates InventoryUnit record

// INSIGHTS
const insights = await generateCollectionInsights(userEmail);
// {pipekeeper: {...insights...}, whiskeykeeper: {...insights...}}

// SEARCH
const results = await searchCollection(userEmail, 'rosewood');
// {total: 3, by_module: {...}, items: [...]}

// AI DATA LAYER
const items = await AiDataLayer.getCollectionItems(userEmail, 'pipekeeper');
const favorites = await AiDataLayer.getFavorites(userEmail);
const underused = await AiDataLayer.getUnderusedItems(userEmail);
const value = await AiDataLayer.getCollectionValue(userEmail);
const profile = await AiDataLayer.getUserProfile(userEmail);
```

---

### Pairing Engine (pairingEngine.js)
```javascript
import {
  getPairingRecommendations,
  registerPairing,
  getPairingPatterns,
  getItemPairingHistory,
  addPairingRule,
  canPair,
} from 'platform/pairingEngine';

// Get pairing recommendations
const pairings = await getPairingRecommendations(
  userEmail,
  'pipe_id_123',
  'pipekeeper',
  5 // limit
);
// {
//   item: 'Dunhill Billiard',
//   module: 'pipekeeper',
//   pairings: [
//     {module: 'tobacco', items: [{id, name, rating}]},
//     {module: 'whiskeykeeper', items: [...]}
//   ]
// }

// Log a pairing
await registerPairing(userEmail, ['pipe1', 'blend2', 'whiskey3'], 'smoking_session');

// Get common pairing patterns
const patterns = await getPairingPatterns(userEmail, 10);
// [{itemIds: [...], frequency: 5}, ...]

// Get pairing history for item
const history = await getItemPairingHistory(userEmail, 'pipe123');
// [{paired_with: [...], date, event_type, rating}, ...]

// Runtime extensibility
addPairingRule('coffeekeeper', 'cigarkeeper');
const compatible = canPair('coffee', 'cigar'); // true
```

---

### Export Engine (exportEngine.js)
```javascript
import {
  exportToCSV,
  exportToJSON,
  generateCollectionReport,
  exportModuleFormat,
} from 'platform/exportEngine';

// CSV export
const csv = await exportToCSV(userEmail, {
  modules: ['pipekeeper', 'whiskeykeeper'],
  format: 'standard',
});
// {filename: '...csv', content: '...', mimetype: 'text/csv'}

// JSON export
const json = await exportToJSON(userEmail);
// {filename: '...json', content: '{...}', mimetype: 'application/json'}

// Report generation
const report = await generateCollectionReport(userEmail, {
  modules: ['pipekeeper'],
  includePhotos: true,
});
// {
//   generatedAt, 
//   summary: {totalItems, totalValue, ...},
//   modules: {pipekeeper: {count, totalValue, topItems}}
// }

// Module-specific export
const moduleExport = await exportModuleFormat(userEmail, 'pipekeeper', 'standard');
```

---

### AI Data Layer (aiDataLayer.js)
```javascript
import * as aiDataLayer from 'platform/aiDataLayer';

// Get items across all modules
const all = await aiDataLayer.getAllCollectionItems(userEmail);
const filtered = await aiDataLayer.getAllCollectionItems(userEmail, {
  minRating: 3,
  favorites: true,
});

// Get items from specific module
const pipes = await aiDataLayer.getModuleItems(userEmail, 'pipekeeper');

// Get smokable items (pipes + tobacco)
const smokable = await aiDataLayer.getSmokableItems(userEmail);
// {pipes: [...], tobaccos: [...]}

// Get tastable items (whiskey + wine)
const tastable = await aiDataLayer.getTastableItems(userEmail);
// {whiskey: [...], wine: [...]}

// Get favorites
const allFavorites = await aiDataLayer.getFavorites(userEmail);
const pipeFavorites = await aiDataLayer.getFavorites(userEmail, 'pipekeeper');

// Get underused
const underused = await aiDataLayer.getUnderusedItems(userEmail);
const pipeUnderused = await aiDataLayer.getUnderusedItems(userEmail, 'pipekeeper');

// Get statistics
const stats = await aiDataLayer.getCollectionStats(userEmail);
// {totalItems, totalValue, averageValuePerItem, byModule}

const pipeStats = await aiDataLayer.getCollectionStats(userEmail, 'pipekeeper');

// Get timeline
const timeline = await aiDataLayer.getCollectionTimeline(userEmail);
// [{date, item, module, action}, ...]

// Get recent events
const recent = await aiDataLayer.getRecentEvents(userEmail, 20);

// Get user preferences
const prefs = await aiDataLayer.getUserPreferences(userEmail);

// Get single item
const item = await aiDataLayer.getItem('item123', 'pipekeeper');

// Global search
const results = await aiDataLayer.search(userEmail, 'rosewood');
const moduleResults = await aiDataLayer.search(userEmail, 'rosewood', 'pipekeeper');
```

---

## USAGE EXAMPLES

### Example 1: Generate Session Recommendation
```javascript
import { AiDataLayer } from 'platform/collectionEngine';
import { getPairingRecommendations } from 'platform/pairingEngine';

async function recommendSession(userEmail) {
  // Get smokable items
  const smokable = await AiDataLayer.getSmokableItems(userEmail);
  
  // Get user preferences
  const prefs = await AiDataLayer.getUserPreferences(userEmail);
  
  // Pick best pipe
  const topPipe = smokable.pipes
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  
  // Get pairing recommendations
  const pairings = await getPairingRecommendations(
    userEmail,
    topPipe.id,
    'pipekeeper'
  );
  
  // Pick best blend
  const topBlend = pairings.pairings
    .find(p => p.module === 'tobacco')?.items[0];
  
  return {
    pipe: topPipe,
    blend: topBlend,
    recommendation: pairings,
  };
}
```

### Example 2: Generate Collection Story
```javascript
import {
  calculateCollectionValue,
  generateCollectionInsights,
  getMostValuableItem,
} from 'platform/collectionEngine';

async function generateCollectionStory(userEmail) {
  // Get value
  const value = await calculateCollectionValue(userEmail);
  
  // Get insights
  const insights = await generateCollectionInsights(userEmail);
  
  // Get most valuable
  const crown = await getMostValuableItem(userEmail);
  
  // Generate narrative
  const narrative = `
    Your collection contains ${value.breakdown.pipekeeper ? Object.keys(value.breakdown).length : 0} modules
    with a total value of $${value.total.toLocaleString()}.
    Your crown jewel is the ${crown.name} worth $${crown.estimated_value}.
  `;
  
  return {
    narrative,
    value,
    insights,
    highlights: { crown },
  };
}
```

### Example 3: Add New Module (CigarKeeper)
```javascript
// 1. Edit platform/moduleRegistry.js
MODULE_REGISTRY.cigarkeeper = {
  id: 'cigarkeeper',
  name: 'CigarKeeper',
  displayName: 'Cigar Collection',
  icon: '🚬',
  itemType: 'Cigar',
  entityName: 'Cigar',
  status: 'active',
  tier: 'premium',
  
  capabilities: {
    insights: ['by_brand', 'by_country', 'by_strength'],
    views: ['grid', 'list', 'humidor_view'],
    pairing: ['whiskeykeeper', 'winekeeper'],
    events: ['cigar_session', 'aging'],
    ai: ['recommendation', 'aging_optimization'],
  },
  
  fields: {
    brand: { type: 'string', label: 'Brand' },
    country: { type: 'string', label: 'Country' },
    strength: { type: 'enum', label: 'Strength' },
    length_mm: { type: 'number', label: 'Length' },
    gauge: { type: 'number', label: 'Ring Gauge' },
    aged_years: { type: 'number', label: 'Aged' },
  },
  
  images: { main: 1, band: 1 },
  inventoryStatuses: ['humidor', 'aged', 'smoked'],
};

// 2. Create entities/Cigar.json
{
  "name": "Cigar",
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "module": {"type": "string", "default": "cigarkeeper"},
    "name": {"type": "string"},
    "brand": {"type": "string"},
    "country": {"type": "string"},
    "strength": {"type": "enum", "enum": ["mild", "medium", "full"]},
    "length_mm": {"type": "number"},
    "gauge": {"type": "number"},
    "aged_years": {"type": "number"},
    "purchase_price": {"type": "number"},
    "estimated_value": {"type": "number"},
    "rating": {"type": "number"},
    "is_favorite": {"type": "boolean"},
    "created_date": {"type": "date-time"},
    "updated_date": {"type": "date-time"}
  }
}

// 3. Edit platform/pairingEngine.js
addPairingRule('cigarkeeper', 'whiskeykeeper');
addPairingRule('cigarkeeper', 'winekeeper');

// Done! Now test:
const cigars = await AiDataLayer.getModuleItems(user, 'cigarkeeper');
const insights = await generateCollectionInsights(user);
// cigarkeeper insights auto-included
```

### Example 4: Dynamic Hub Rendering
```javascript
import { getActiveModules } from 'platform/moduleRegistry';

export default function CollectionHub() {
  const modules = getActiveModules();
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {modules.map(module => (
        <DynamicModuleCard key={module.id} module={module} />
      ))}
    </div>
  );
}

// DynamicModuleCard automatically:
// - Shows correct icon
// - Displays module name
// - Links to correct page
// - Shows correct color
// - Handles upcoming status
```

---

## DATA MODELS

### CollectionItem (Base)
```javascript
{
  // Core
  id: string,
  module: string,           // 'pipekeeper', 'whiskeykeeper', etc
  name: string,
  brand: string,
  
  // Metadata
  category: string,
  tags: string[],
  
  // Value
  purchase_price: number,
  estimated_value: number,
  value_confidence: 'high'|'medium'|'low',
  value_source: string,
  value_last_updated: date,
  
  // User data
  rating: number (0-5),
  is_favorite: boolean,
  notes: string,
  photos: string[],
  
  // System
  created_date: date,
  updated_date: date,
  created_by: email,
  ai_excluded: boolean,
  
  // Module-specific fields extend here
  // Examples:
  // Pipe: shape, finish, material, condition
  // Whiskey: distillery, abv, age
  // Cigar: brand, country, strength
}
```

### InventoryUnit
```javascript
{
  id: string,
  item_id: string,
  item_name: string,
  module: string,
  
  // Status varies by module
  status: string,           // 'sealed', 'open', 'consumed', etc
  
  // For consumables
  quantity: number,
  quantity_unit: string,    // 'oz', 'ml', 'count'
  
  // Location
  location: string,
  location_details: object,
  
  // Dates
  acquired_date: date,
  opened_date: date,
  consumed_date: date,
  
  // Pricing
  unit_price: number,
  current_unit_value: number,
  
  // Notes
  notes: string,
}
```

### CollectionEvent
```javascript
{
  id: string,
  
  // Type
  event_type: 'smoking_session'|'whiskey_tasting'|'wine_tasting'|'cigar_session'|'purchase'|'maintenance'|'other',
  
  // Items
  item_ids: string[],
  item_details: string[],   // denormalized names
  
  // Pairing
  pairings: string[],       // which items paired
  
  // Details
  date: date,
  location: string,
  notes: string,
  rating: number (0-5),
  
  // Session metadata
  duration_minutes: number,
  mood: string,
  companions: string[],
  
  // System
  created_date: date,
  created_by: email,
}
```

---

## PERFORMANCE TIPS

### Caching Strategy
```javascript
// Cache expensive calculations
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getCachedValue(userEmail) {
  const cacheKey = `collection_value_${userEmail}`;
  const cached = cache.get(cacheKey);
  
  if (cached && !isStale(cached)) {
    return cached.data;
  }
  
  const value = await calculateCollectionValue(userEmail);
  cache.set(cacheKey, { data: value, timestamp: Date.now() }, CACHE_TTL);
  
  return value;
}

// Invalidate on update
async function addItem(item) {
  await createItem(item);
  cache.invalidate(`collection_value_${item.created_by}`);
}
```

### Batch Operations
```javascript
// Instead of:
for (const module of modules) {
  const items = await getModuleItems(user, module.id);
}

// Do:
const allItems = await Promise.all(
  modules.map(m => getModuleItems(user, m.id))
);
```

### Index Searchable Text
```javascript
// When creating item:
const indexed_text = [
  item.name,
  item.brand,
  item.category,
  item.notes,
  (item.tags || []).join(' '),
].join(' ').toLowerCase();

// Search uses indexed_text field
const results = items.filter(i => 
  i.indexed_text.includes(query.toLowerCase())
);
```

---

## TESTING

### Unit Tests
```javascript
test('calculateCollectionValue', async () => {
  const value = await calculateCollectionValue(testUser);
  expect(value.total).toBeGreaterThanOrEqual(0);
  expect(value.breakdown).toBeDefined();
});

test('searchCollection', async () => {
  const results = await searchCollection(testUser, 'rosewood');
  expect(results.total).toBeGreaterThanOrEqual(0);
  expect(results.items).toBeArray();
});

test('addModule', () => {
  const before = getActiveModules().length;
  MODULE_REGISTRY.testkeeper = {id: 'testkeeper', status: 'active'};
  const after = getActiveModules().length;
  expect(after).toBe(before + 1);
});
```

---

## DEPLOYMENT CHECKLIST

- [ ] All platform files created
- [ ] Module registry configured
- [ ] Entities created for any new modules
- [ ] Pairing rules registered
- [ ] Hub updated to use dynamic modules
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Performance tested
- [ ] Documentation reviewed
- [ ] Backward compatibility verified

---

**Status:** ✅ Complete & Ready