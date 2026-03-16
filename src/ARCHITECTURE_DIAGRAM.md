# CollectionKeeper Modular Architecture — Visual Diagrams

## 1. SYSTEM ARCHITECTURE LAYERS

```
┌────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE LAYER                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Hub Page (Dynamic Module Cards)                         │  │
│  │  ├─ Renders modules from registry                        │  │
│  │  ├─ Shows counts, values per module                      │  │
│  │  └─ No hardcoded module UI                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Module-Specific Pages                                   │  │
│  │  ├─ PipeKeeper (active)                                  │  │
│  │  ├─ WhiskeyKeeper (active)                               │  │
│  │  ├─ CigarKeeper (upcoming)                               │  │
│  │  └─ WineKeeper (upcoming)                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              ↑
┌────────────────────────────────────────────────────────────────┐
│                    MODULE REGISTRY LAYER                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  moduleRegistry.js                                       │  │
│  │                                                          │  │
│  │  PipeKeeper Config:                                      │  │
│  │    ├─ id: 'pipekeeper'                                  │  │
│  │    ├─ name: 'PipeKeeper'                                │  │
│  │    ├─ entityName: 'Pipe'                                │  │
│  │    ├─ capabilities: [insights, views, ai]               │  │
│  │    ├─ fields: {shape, finish, material, ...}            │  │
│  │    └─ images: {main: 5, stamping: 2}                    │  │
│  │                                                          │  │
│  │  WhiskeyKeeper Config: {...}                            │  │
│  │  CigarKeeper Config: {...}                              │  │
│  │  WineKeeper Config: {...}                               │  │
│  │                                                          │  │
│  │  Functions:                                              │  │
│  │    ├─ getActiveModules()                                │  │
│  │    ├─ getModule(id)                                     │  │
│  │    ├─ getUserModules(entitlements)                      │  │
│  │    └─ hasModuleAccess()                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              ↑
┌────────────────────────────────────────────────────────────────┐
│                   UNIVERSAL ENGINES LAYER                       │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Collection Engine (collectionEngine.js)                 │  │
│  │                                                         │  │
│  │ Value Calculations:                                     │  │
│  │   ├─ calculateCollectionValue(user, moduleId?)         │  │
│  │   ├─ getMostValuableItem(user)                         │  │
│  │   └─ Returns: {total, breakdown, lastUpdated}          │  │
│  │                                                         │  │
│  │ Inventory Management:                                   │  │
│  │   ├─ getInventorySummary(user)                         │  │
│  │   ├─ createInventoryUnit(itemId, module, status)       │  │
│  │   └─ Returns: {total, by_status, by_module}            │  │
│  │                                                         │  │
│  │ Insights Generation:                                    │  │
│  │   ├─ generateCollectionInsights(user)                  │  │
│  │   ├─ generateModuleInsights(user, module)              │  │
│  │   └─ Returns: insights by module                       │  │
│  │                                                         │  │
│  │ Search:                                                 │  │
│  │   ├─ searchCollection(user, query)                     │  │
│  │   └─ Returns: results across all modules               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Pairing Engine (pairingEngine.js)                       │  │
│  │                                                         │  │
│  │ Cross-Module Pairing:                                   │  │
│  │   ├─ getPairingRecommendations(user, itemId, module)  │  │
│  │   ├─ registerPairing(user, itemIds, eventType)        │  │
│  │   ├─ getPairingPatterns(user)                         │  │
│  │   ├─ getItemPairingHistory(user, itemId)              │  │
│  │   ├─ addPairingRule(module1, module2) [runtime]       │  │
│  │   └─ canPair(module1, module2)                        │  │
│  │                                                         │  │
│  │ Pairing Matrix:                                         │  │
│  │   ├─ pipekeeper ↔ tobacco                             │  │
│  │   ├─ pipekeeper ↔ whiskeykeeper                       │  │
│  │   ├─ whiskeykeeper ↔ cigarkeeper                      │  │
│  │   ├─ cigarkeeper ↔ winekeeper                         │  │
│  │   └─ [Extensible at runtime]                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Export Engine (exportEngine.js)                         │  │
│  │                                                         │  │
│  │ Multi-Format Export:                                    │  │
│  │   ├─ exportToCSV(user, options)                        │  │
│  │   ├─ exportToJSON(user, options)                       │  │
│  │   ├─ generateCollectionReport(user, options)           │  │
│  │   └─ exportModuleFormat(user, moduleId, format)        │  │
│  │                                                         │  │
│  │ Features:                                               │  │
│  │   ├─ Select modules to export                          │  │
│  │   ├─ Include/exclude photos                            │  │
│  │   ├─ Module-specific custom exports                    │  │
│  │   └─ Standard field mappings                           │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              ↑
┌────────────────────────────────────────────────────────────────┐
│                    AI DATA ACCESS LAYER                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  aiDataLayer.js - Module-Agnostic Data Access           │  │
│  │                                                          │  │
│  │  Collection Queries:                                     │  │
│  │    ├─ getAllCollectionItems(user, filters?)             │  │
│  │    ├─ getModuleItems(user, moduleId)                    │  │
│  │    └─ search(user, query, moduleId?)                    │  │
│  │                                                          │  │
│  │  Specialized Queries:                                    │  │
│  │    ├─ getSmokableItems(user) → pipes + tobacco          │  │
│  │    ├─ getTastableItems(user) → whiskey + wine           │  │
│  │    ├─ getFavorites(user, moduleId?)                     │  │
│  │    ├─ getUnderusedItems(user, moduleId?)                │  │
│  │    └─ getRecentEvents(user, limit)                      │  │
│  │                                                          │  │
│  │  Statistics:                                             │  │
│  │    ├─ getCollectionStats(user, moduleId?)               │  │
│  │    ├─ getCollectionTimeline(user)                       │  │
│  │    └─ getUserPreferences(user)                          │  │
│  │                                                          │  │
│  │  ✨ AI gets structured data, not module queries          │  │
│  │  ✨ AI doesn't know about Pipe/Bottle entities          │  │
│  │  ✨ Works seamlessly with new modules                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Usage by Curator AI:                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  import { aiDataLayer } from 'platform/aiDataLayer'     │  │
│  │                                                          │  │
│  │  // Get smokable items for session recommendation        │  │
│  │  const items = await aiDataLayer.getSmokableItems(user) │  │
│  │  // → {pipes: [...], tobaccos: [...]}                   │  │
│  │                                                          │  │
│  │  // Get favorites across entire collection              │  │
│  │  const favorites = await aiDataLayer.getFavorites(user) │  │
│  │  // → [{pipe}, {whiskey}, {cigar}]                      │  │
│  │                                                          │  │
│  │  // Get underused items by module                       │  │
│  │  const underused = await aiDataLayer.getUnderusedItems( │  │
│  │    user, 'pipekeeper'                                   │  │
│  │  )                                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              ↑
┌────────────────────────────────────────────────────────────────┐
│                      DATA MODEL LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Universal Models (itemModel.js)                          │  │
│  │                                                          │  │
│  │ COLLECTION_ITEM_BASE:                                    │  │
│  │   ├─ id                          ├─ module               │  │
│  │   ├─ name                        ├─ category             │  │
│  │   ├─ brand                       ├─ rating               │  │
│  │   ├─ purchase_price              ├─ is_favorite          │  │
│  │   ├─ estimated_value             ├─ notes                │  │
│  │   ├─ value_confidence            ├─ photos               │  │
│  │   ├─ created_date                ├─ ai_excluded          │  │
│  │   └─ updated_date                └─ [+ module-specific]  │  │
│  │                                                          │  │
│  │ INVENTORY_UNIT_MODEL:                                    │  │
│  │   ├─ item_id           ├─ quantity                       │  │
│  │   ├─ module            ├─ location                       │  │
│  │   ├─ status            ├─ opened_date                    │  │
│  │   ├─ acquired_date     └─ unit_price                     │  │
│  │                                                          │  │
│  │ COLLECTION_EVENT_MODEL:                                  │  │
│  │   ├─ event_type                                          │  │
│  │   │  ├─ smoking_session  ├─ wine_tasting                │  │
│  │   │  ├─ whiskey_tasting  ├─ cigar_session               │  │
│  │   │  └─ purchase, maintenance, other                     │  │
│  │   ├─ item_ids          ├─ pairings                       │  │
│  │   ├─ date              ├─ rating                         │  │
│  │   └─ notes             └─ duration_minutes               │  │
│  │                                                          │  │
│  │ IMAGE_CONFIG_BASE:                                       │  │
│  │   ├─ image_type (main, label, stamping, etc)             │  │
│  │   ├─ image_url, thumbnail_url                            │  │
│  │   └─ ai_analyzed, ai_tags                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              ↑
┌────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                              │
│                                                                │
│  Module-Specific Entities:                                     │
│    ├─ Pipe (PipeKeeper)                                        │
│    ├─ TobaccoBlend                                             │
│    ├─ Bottle (WhiskeyKeeper)                                   │
│    ├─ Cigar (CigarKeeper) [upcoming]                           │
│    └─ Wine (WineKeeper) [upcoming]                             │
│                                                                │
│  Universal Entities:                                           │
│    ├─ InventoryUnit (shared across all modules)                │
│    ├─ CollectionEvent (smoking, tasting, purchase, etc)        │
│    ├─ UserProfile                                              │
│    └─ SmokingLog (session history)                             │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. DATA FLOW: SESSION RECOMMENDATION

```
User opens Hub
      ↓
Hub loads module registry
      ↓
For each active module:
  ├─ fetchModuleItems(user, moduleId)
  ├─ calculateModuleValue()
  └─ generateModuleInsights()
      ↓
Display module cards dynamically
      ↓
User clicks "Tonight's Session"
      ↓
Call generateSessionRecommendation()
      ↓
Backend uses AI Data Layer:
  ├─ getSmokableItems(user)
  │  └─ {pipes: [...], tobaccos: [...]}
  ├─ getTastableItems(user)
  │  └─ {whiskey: [...], wine: [...]}
  ├─ getFavorites(user)
  ├─ getUnderusedItems(user)
  └─ getUserPreferences(user)
      ↓
Score items (no module knowledge)
      ↓
Check pairing compatibility
      ↓
Return recommendation
      ↓
User clicks "Record Session"
      ↓
Create SmokingLog entry
      ↓
Register pairing in CollectionEvent
      ↓
Done! Event logged for pattern learning
```

---

## 3. MODULE ADDITION WORKFLOW

```
Want to add CoffeeKeeper? Follow this:

Step 1: Define Module Config
  ├─ Edit platform/moduleRegistry.js
  ├─ Add coffeekeeper entry with:
  │  ├─ id, name, icon
  │  ├─ capabilities (insights, views, ai)
  │  ├─ fields (origin, roast, grind, etc)
  │  └─ images (limits)
  └─ Done!

Step 2: Create Entity (optional)
  ├─ Create entities/Coffee.json
  ├─ Extend COLLECTION_ITEM_BASE
  ├─ Add module-specific fields
  └─ Done!

Step 3: Register Pairings (optional)
  ├─ Edit platform/pairingEngine.js
  ├─ addPairingRule('coffeekeeper', 'cigarkeeper')
  ├─ addPairingRule('coffeekeeper', 'pastry')
  └─ Done!

Result:
  ✓ Module appears in Hub (auto-rendered)
  ✓ Works with all universal engines
  ✓ AI can access via aiDataLayer
  ✓ Searches work across modules
  ✓ Value calculations include CoffeeKeeper
  ✓ Pairing recommendations work
  ✓ Exports include CoffeeKeeper

No other code changes needed!
```

---

## 4. HUB RENDERING: BEFORE → AFTER

### BEFORE (Hardcoded Modules)
```javascript
export default function CollectionHub() {
  return (
    <div>
      {/* PipeKeeper hardcoded */}
      <ModuleCard
        title="PipeKeeper"
        icon={PIPE_ICON}
        onClick={() => navigate('/PipeKeeper')}
      />
      
      {/* WhiskeyKeeper hardcoded */}
      <ModuleCard
        title="WhiskeyKeeper"
        icon={WHISKEY_ICON}
        onClick={() => navigate('/WhiskeyKeeper')}
      />
      
      {/* Need to manually add CigarKeeper, WineKeeper, etc */}
      
      {/* Adding module = code change + deployment */}
    </div>
  );
}
```

**Problem:** Adding module = code change needed

---

### AFTER (Module-Driven)
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

**Benefit:** Adding module = config change only (no deployment needed)

---

## 5. QUERY PATTERNS: BEFORE → AFTER

### BEFORE (Module-Specific Queries)
```javascript
// Get pipes
const pipes = await base44.entities.Pipe.list();

// Get whiskey
const bottles = await base44.entities.Bottle.list();

// Get cigars - NEW QUERY NEEDED
const cigars = await base44.entities.Cigar.list();

// Each module needs custom code
// Adding module = adding more queries
```

---

### AFTER (Unified Data Layer)
```javascript
import { aiDataLayer } from 'platform/aiDataLayer';

// Get all items across modules
const items = await aiDataLayer.getAllCollectionItems(user);

// Get favorites across modules
const favorites = await aiDataLayer.getFavorites(user);

// Get underused across modules
const underused = await aiDataLayer.getUnderusedItems(user);

// Get smokable items (pipes + tobacco)
const smokable = await aiDataLayer.getSmokableItems(user);

// ONE query works for all modules
// Adding module = no new queries needed
```

---

## 6. PERFORMANCE: CACHING STRATEGY

```
Value Calculation:
  User requests collection value
    ↓
  Check cache: collection_value_{user}
    ↓
  If fresh (< 30 min): Return cached
    ↓
  If stale: Calculate from database
    ↓
  Store in cache (30 min TTL)
    ↓
  Return value

Update Event:
  User adds pipe/whiskey
    ↓
  Invalidate: collection_value_{user}
    ↓
  Next request recalculates
    ↓
  Fresh value served

Benefit:
  ✓ Fast repeated calculations
  ✓ Automatic cache invalidation
  ✓ Scales to unlimited modules
```

---

**Status:** ✅ Architecture Complete & Documented