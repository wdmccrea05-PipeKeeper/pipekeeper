# CollectionKeeper Modular Framework — Architecture Guide

## OVERVIEW

CollectionKeeper has been refactored from isolated modules into a **unified modular collector framework** supporting unlimited modules without code duplication.

**Key Achievement:** Adding a new module (CigarKeeper, WineKeeper, CoffeeKeeper, etc.) now requires only:
1. Define module config
2. Define record fields
3. Register in module registry

**No platform rewrite required.**

---

## ARCHITECTURE LAYERS

```
┌─────────────────────────────────────────────────┐
│          Hub & UI Layer                         │  Dynamic module cards
│          (Module-driven)                        │  Universal components
└─────────────────────────────────────────────────┘
                       ↑
┌─────────────────────────────────────────────────┐
│     Module Layer                                │
│   (PipeKeeper, WhiskeyKeeper, etc)              │
│   - Define record schema                        │
│   - Define capabilities                         │
│   - Register module config                      │
└─────────────────────────────────────────────────┘
                       ↑
┌─────────────────────────────────────────────────┐
│   Universal Platform Services                   │
│                                                 │
│   ├─ Value Engine (calculate totals)            │
│   ├─ Inventory Engine (track units)             │
│   ├─ Insights Engine (generate insights)        │
│   ├─ Pairing Engine (cross-module pairs)        │
│   ├─ Export Engine (CSV, JSON, PDF)             │
│   ├─ Search Engine (unified search)             │
│   └─ AI Data Layer (Curator access)             │
└─────────────────────────────────────────────────┘
                       ↑
┌─────────────────────────────────────────────────┐
│   Data Layer                                    │
│                                                 │
│   ├─ CollectionItem (base model)                │
│   ├─ InventoryUnit (units tracking)             │
│   ├─ CollectionEvent (sessions/tastings)        │
│   └─ Module-specific entities                   │
└─────────────────────────────────────────────────┘
```

---

## KEY FILES

### Module Registry (platform/moduleRegistry.js)
**Purpose:** Central configuration for all modules  
**Contains:** Module definitions, capabilities, fields, image configs

```javascript
MODULE_REGISTRY = {
  pipekeeper: { id, name, icon, capabilities, fields, ... },
  whiskeykeeper: { ... },
  cigarkeeper: { ... },
  winekeeper: { ... },
}
```

### Universal Item Model (platform/itemModel.js)
**Purpose:** Base schema for all collection items  
**Contains:** COLLECTION_ITEM_BASE, INVENTORY_UNIT_MODEL, COLLECTION_EVENT_MODEL

### Collection Engine (platform/collectionEngine.js)
**Purpose:** Shared business logic (NO module-specific code)  
**Contains:**
- `calculateCollectionValue()` — Total value across all modules
- `generateCollectionInsights()` — Universal insights
- `getInventorySummary()` — Inventory status across modules
- `searchCollection()` — Global search

### Pairing Engine (platform/pairingEngine.js)
**Purpose:** Cross-module pairing logic  
**Contains:**
- `getPairingRecommendations()` — Get compatible items
- `registerPairing()` — Log sessions with pairings
- `getPairingPatterns()` — What items pair together?
- `addPairingRule()` — Runtime extension

### Export Engine (platform/exportEngine.js)
**Purpose:** Centralized export for all formats  
**Contains:**
- `exportToCSV()` — CSV export
- `exportToJSON()` — JSON export
- `generateCollectionReport()` — Summary report

### AI Data Layer (platform/aiDataLayer.js)
**Purpose:** Clean module-agnostic data access for Curator  
**Contains:**
- `getAllCollectionItems()` — All items across modules
- `getSmokableItems()` — Pipes + tobacco (for sessions)
- `getTastableItems()` — Whiskey + wine (for tastings)
- `getUnderusedItems()` — Cross-module underused
- `getCollectionStats()` — Statistics
- `search()` — Global search

---

## ADDING A NEW MODULE

### Step 1: Define Module Config
Edit `platform/moduleRegistry.js`:

```javascript
MODULE_REGISTRY.coffeekeeper = {
  id: 'coffeekeeper',
  name: 'CoffeeKeeper',
  displayName: 'Coffee Collection',
  icon: '☕',
  itemType: 'Coffee',
  entityName: 'Coffee',
  status: 'upcoming',
  
  capabilities: {
    insights: ['by_origin', 'by_roast', 'by_grind'],
    views: ['grid', 'list'],
    pairing: ['cigarkeeper', 'pastry'],
    events: ['coffee_tasting'],
    ai: ['recommendation'],
  },
  
  fields: {
    origin: { type: 'string', label: 'Origin' },
    roast: { type: 'enum', label: 'Roast Level' },
    grind: { type: 'enum', label: 'Grind' },
  },
  
  images: { main: 1 },
  inventoryStatuses: ['sealed', 'open', 'consumed'],
};
```

### Step 2: Create Entity (if needed)
Create `entities/Coffee.json` with base + fields:

```json
{
  "name": "Coffee",
  "type": "object",
  "properties": {
    ...COLLECTION_ITEM_BASE,
    "origin": { "type": "string" },
    "roast": { "type": "enum" },
    "grind": { "type": "enum" }
  }
}
```

### Step 3: Register Pairings (optional)
In `platform/pairingEngine.js`:

```javascript
addPairingRule('coffeekeeper', 'cigarkeeper');
addPairingRule('coffeekeeper', 'pastry');
```

### Done!
- Module appears in Hub automatically
- Works with all universal engines
- No other code changes needed

---

## UNIVERSAL MODELS

### Collection Item Base
```javascript
{
  id,                    // Unique identifier
  module,                // Which module (pipekeeper, etc)
  name,                  // Item name
  brand,                 // Brand/maker
  category,              // Type/style
  purchase_price,        // Cost
  estimated_value,       // Current value
  rating,                // Personal rating (0-5)
  photos,                // URLs
  is_favorite,           // Favorite?
  notes,                 // User notes
  created_date,          // Added to collection
  updated_date,          // Last update
}
```

### Inventory Unit
```javascript
{
  id,
  item_id,               // Parent item
  module,                // Which module
  status,                // sealed/open/consumed/etc (module-specific)
  quantity,              // For consumables
  location,              // Where stored
  acquired_date,         // When acquired
  opened_date,           // When opened
  notes,                 // Unit-specific notes
}
```

### Collection Event
```javascript
{
  id,
  event_type,            // smoking_session, tasting, purchase, etc
  item_ids,              // Items involved
  date,                  // When
  location,              // Where
  pairings,              // Which items paired
  rating,                // How was it? (0-5)
  notes,                 // Session notes
  duration_minutes,      // How long
}
```

---

## SHARED ENGINES

### Value Engine
**Function:** `calculateCollectionValue(userEmail, moduleId?)`

```javascript
// Get total value
const value = await calculateCollectionValue('user@email.com');
// { total: 5000, breakdown: { pipekeeper: 2000, whiskeykeeper: 3000 } }

// Get value for module
const pipeValue = await calculateCollectionValue('user@email.com', 'pipekeeper');
// { total: 2000, breakdown: { pipekeeper: 2000 } }
```

### Inventory Engine
**Function:** `getInventorySummary(userEmail)`

```javascript
const summary = await getInventorySummary('user@email.com');
// {
//   total_items: 45,
//   by_status: { sealed: 10, open: 5, consumed: 30 },
//   by_module: { pipekeeper: 20, whiskeykeeper: 25 }
// }
```

### Insights Engine
**Function:** `generateCollectionInsights(userEmail)`

```javascript
const insights = await generateCollectionInsights('user@email.com');
// {
//   pipekeeper: {
//     count: 20,
//     value: 2000,
//     insights: [
//       { type: 'most_valuable', item: 'Dunhill', value: 500 },
//       { type: 'highest_rated', item: 'Peterson', rating: 5 },
//       { type: 'underused_items', count: 5 }
//     ]
//   },
//   whiskeykeeper: { ... }
// }
```

### Pairing Engine
**Function:** `getPairingRecommendations(userEmail, itemId, moduleId)`

```javascript
const pairings = await getPairingRecommendations('user@email.com', 'item123', 'pipekeeper');
// {
//   item: 'Rosewood Billiard',
//   module: 'pipekeeper',
//   pairings: [
//     {
//       module: 'tobacco',
//       items: [
//         { id: 'blend1', name: 'English Mixture', rating: 5 },
//         { id: 'blend2', name: 'Balkan Blend', rating: 4 }
//       ]
//     },
//     {
//       module: 'whiskeykeeper',
//       items: [ ... ]
//     }
//   ]
// }
```

### Search Engine
**Function:** `searchCollection(userEmail, query)`

```javascript
const results = await searchCollection('user@email.com', 'rosewood');
// {
//   total: 3,
//   by_module: { pipekeeper: 2, whiskeykeeper: 1 },
//   items: [
//     { id: 'pipe1', name: 'Rosewood Billiard', module: 'pipekeeper', ... },
//     { id: 'pipe2', name: 'Rosewood Apple', module: 'pipekeeper', ... },
//     { id: 'bottle1', name: 'Highland Park Rosewood', module: 'whiskeykeeper', ... }
//   ]
// }
```

---

## AI DATA LAYER

### For Curator AI
The AI doesn't query modules directly. It uses this clean interface:

```javascript
import { AiDataLayer } from 'platform/collectionEngine';

// Get all items
const items = await AiDataLayer.getCollectionItems(email, 'pipekeeper');

// Get favorites
const favorites = await AiDataLayer.getFavorites(email);

// Get underused
const underused = await AiDataLayer.getUnderusedItems(email);

// Get value
const value = await AiDataLayer.getCollectionValue(email, 'whiskeykeeper');

// Get user preferences
const prefs = await AiDataLayer.getUserProfile(email);
```

This decouples AI from module-specific queries.

---

## HUB INTEGRATION

### Before (Hardcoded)
```javascript
export default function CollectionHub() {
  return (
    <>
      <ModuleCard for={PipeKeeper} />
      <ModuleCard for={WhiskeyKeeper} />
      {/* Need to manually add CigarKeeper, WineKeeper, etc */}
    </>
  );
}
```

### After (Module-Driven)
```javascript
import { getActiveModules } from 'platform/moduleRegistry';

export default function CollectionHub() {
  const modules = getActiveModules();
  
  return (
    <div className="grid">
      {modules.map(module => (
        <DynamicModuleCard key={module.id} module={module} />
      ))}
    </div>
  );
}
```

New modules appear automatically. No UI code changes.

---

## MIGRATION STRATEGY

### Existing Data
PipeKeeper and WhiskeyKeeper data remains intact. No migration needed.

### New Data
New items created use the universal `CollectionItem` base + module-specific fields.

### Backward Compatibility
Existing Pipe and Bottle entities continue to work. They now inherit from base model via code.

---

## PERFORMANCE CONSIDERATIONS

### Caching Strategy
```javascript
// Cache collection totals (expensive)
const CACHE_KEY = `collection_value_${userEmail}`;
const cached = getCacheItem(CACHE_KEY);
if (cached && !isStale(cached)) return cached;

// Calculate, cache, return
const value = await calculateCollectionValue(userEmail);
setCacheItem(CACHE_KEY, value, { ttl: 1800 }); // 30 min
return value;
```

### Query Optimization
- Batch queries across modules
- Filter at database level
- Index searchable text
- Denormalize frequently accessed fields

### Scalability
- Stateless functions (horizontal scaling)
- No circular dependencies
- Modular caching per service
- Lazy-load module configs

---

## TESTING STRATEGY

### Unit Tests
```javascript
// Test value calculations
test('calculateCollectionValue', async () => {
  const value = await calculateCollectionValue(testUser);
  expect(value.total).toBeGreaterThanOrEqual(0);
});

// Test search
test('searchCollection', async () => {
  const results = await searchCollection(testUser, 'rosewood');
  expect(results.items.length).toBeGreaterThan(0);
});
```

### Integration Tests
```javascript
// Test new module addition
test('addNewModule', () => {
  addModule({
    id: 'testkeeper',
    name: 'Test Module',
    fields: { ... }
  });
  
  const modules = getActiveModules();
  expect(modules.some(m => m.id === 'testkeeper')).toBe(true);
});
```

---

## ACCEPTANCE CRITERIA — VERIFICATION

✅ Modules use shared framework  
✅ Records inherit base model  
✅ Inventory uses shared system  
✅ Insights engine works across modules  
✅ Pairing engine works across modules  
✅ AI can query unified data layer  
✅ Hub dynamically renders modules  
✅ Adding new module requires minimal code  
✅ PipeKeeper data intact  
✅ WhiskeyKeeper data intact  
✅ No breaking changes  
✅ Performance maintained  

---

## FUTURE MODULES ROADMAP

### Phase 1: Core (Active)
- ✅ PipeKeeper
- ✅ WhiskeyKeeper

### Phase 2: Expansion (Upcoming)
- 🔄 CigarKeeper
- 🔄 WineKeeper

### Phase 3: Extended (Planned)
- 📋 CoffeeKeeper
- 📋 WatchKeeper
- 📋 KnifeKeeper
- 📋 VinylKeeper

### Phase 4+: Community Modules
- User-defined modules
- Custom record types
- Plugin architecture

---

**Status:** ✅ Architecture Complete  
**Scalability:** ✅ Unlimited modules  
**Performance:** ✅ Optimized  
**Backward Compatibility:** ✅ Maintained