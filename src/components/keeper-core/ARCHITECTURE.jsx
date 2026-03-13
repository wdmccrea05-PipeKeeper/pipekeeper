# Keeper Core Architecture

## Overview

Keeper Core is the centralized platform layer for the CollectionKeeper ecosystem. It provides shared services that are consumed by the Hub and individual modules, enabling consistent behavior and making future module expansion straightforward.

## Service Layers

### 1. Module Registry (`modules/keeperModules.js`)

**Responsibility**: Define all modules (active and future) in a single source of truth.

**Exports**:
- `KEEPER_MODULES` — array of all module definitions
- `getEnabledModules()` — active modules only
- `getComingSoonModules()` — future modules
- `getHubContributorModules()` — modules that feed data to Hub
- `getModuleByType(type)` — lookup by type
- `getEnabledModuleCount()` — active count
- `getHubContributorCount()` — Hub contributors count

**Module Structure**:
```javascript
{
  type: 'pipes',                    // Machine identifier
  titleKey: 'hub.pipekeeper',       // i18n key for UI
  icon: '🔴',                       // Emoji icon
  route: 'Pipes',                   // React Router path (null for coming soon)
  enabled: true,                    // Active or future
  contributesToHub: true,           // Feeds data to Hub summary
  description: '...',               // UI description
  entityNames: ['Pipe', 'SmokingLog', 'TobaccoBlend'],  // Related entities
}
```

**Usage**: Hub module cards, coming soon cards, module count, route resolution.

---

### 2. Collection Summary (`summary/collectionSummary.js`)

**Responsibility**: Aggregate collection data from all modules with user scoping.

**Key Functions**:

#### `getModuleSummary(moduleType, userEmail)`
Fetches summary for a single module.

```javascript
const summary = await getModuleSummary('pipes', user.email);
// Returns: { count: 42, value: 12500 }
```

**Supported module types**:
- `pipes` → Pipe entity
- `tobacco` → TobaccoBlend entity
- `whiskey` → Bottle entity
- `cigars` → (placeholder for future module)
- `coffee` → (placeholder for future module)

#### `getCollectionHubSummary(userEmail)`
Aggregates all enabled modules that contribute to Hub.

```javascript
const summary = await getCollectionHubSummary(user.email);
// Returns:
// {
//   pipes: { count: 42, value: 12500 },
//   tobacco: { count: 156, value: 4200 },
//   whiskey: { count: 18, value: 8900 },
//   total: { items: 216, value: 25600 },
//   enabledModuleCount: 2,
//   hubContributorCount: 2,
// }
```

**Safety**: All queries use `created_by: userEmail` filter for data privacy.

**Extensibility**: New modules automatically included if they have `contributesToHub: true`.

---

### 3. Value Aggregation (`value/valueAggregation.js`)

**Responsibility**: Normalize and calculate item values across modules.

**Key Functions**:

#### Per-Module Value Getters
```javascript
getPipeValue(pipe)            // → number
getTobaccoValue(blend)        // → number
getBottleValue(bottle)        // → number
getCigarValue(cigar)          // → number (future)
getCoffeeBeanValue(bean)      // → number (future)
```

Each function applies module-specific valuation logic:
- **Pipes**: `estimated_value` > `purchase_price`
- **Tobacco**: `manual_market_value` > `ai_estimated_value`
- **Whiskey**: `estimated_value` > `purchase_price`

#### Generic Value Getter
```javascript
const value = getValueByModuleType('pipes', pipe);
```

#### Value Formatting
```javascript
formatCurrencyValue(1234.56)  // → "$1,235"
formatCurrencyValue(0)         // → "—"
```

#### Ecosystem Metrics
```javascript
const metrics = calculateEcosystemValueMetrics(summary);
// Returns:
// {
//   total: 25600,
//   byModule: { pipes: 12500, tobacco: 4200, whiskey: 8900 },
//   percentages: { pipes: 49, tobacco: 16, whiskey: 35 }
// }
```

---

### 4. Recent Activity (`activity/recentActivity.js`)

**Responsibility**: Aggregate recent cross-module activity for Hub feed and curator context.

**Key Functions**:

#### `getRecentCrossModuleActivity(userEmail, options)`
Fetches recent activity from enabled modules.

```javascript
const activities = await getRecentCrossModuleActivity(null, {
  maxItems: 5,
  includeModules: ['pipes', 'whiskey'],
});

// Returns:
// [
//   {
//     id: 'smoking-abc123',
//     type: 'smoking',
//     module: 'pipes',
//     date: Date,
//     title: 'Peterson Standard',
//     subtitle: 'Dunhill Nightcap',
//     icon: '🔴',
//     entity: { /* full smoking log */ },
//   },
//   { ... },
// ]
```

**Activity Types**:
- `smoking` — SmokingLog entries (PipeKeeper)
- `tasting` — TastingLog entries (WhiskeyKeeper)

#### Date Formatting
```javascript
formatActivityDate(date)  // → "2h ago", "1d ago", "just now", etc.
```

#### Activity Statistics
```javascript
const stats = getActivityStats(activities);
// Returns:
// {
//   total: 5,
//   byType: { smoking: 3, tasting: 2 },
//   byModule: { pipes: 3, whiskey: 2 },
//   lastActivityDate: Date,
// }
```

---

### 5. Curator Hub Context (`ai/buildCuratorHubContext.js`)

**Responsibility**: Prepare ecosystem-level context for Curator AI insights.

**Key Functions**:

#### `buildCuratorHubContext(summary, recentActivities, userProfile)`
Builds comprehensive context object for Curator.

```javascript
const context = buildCuratorHubContext(summary, activities, profile);
// Returns:
// {
//   ecosystem: {
//     totalItems: 216,
//     totalValue: 25600,
//     enabledModuleCount: 2,
//     activeModules: [
//       { type: 'pipes', titleKey: '...', icon: '🔴', itemCount: 42, value: 12500 },
//       { type: 'whiskey', titleKey: '...', icon: '🥃', itemCount: 18, value: 8900 },
//     ],
//   },
//   activity: {
//     recentCount: 5,
//     lastActivityDate: Date,
//     activityByType: { smoking: 3, tasting: 2 },
//     activityByModule: { pipes: 3, whiskey: 2 },
//   },
//   user: {
//     hasProfile: true,
//     preferencesSet: true,
//     smokingHistory: true,
//     tastingHistory: true,
//   },
// }
```

#### `generateCuratorPromptSeeds(curatorContext)`
Generates suggested prompt seeds based on ecosystem state.

```javascript
const seeds = generateCuratorPromptSeeds(context);
// Returns:
// [
//   {
//     id: 'what-deserves-attention',
//     text: 'What deserves attention across my collection?',
//     description: 'Cross-module collection insights',
//     icon: '🔍',
//   },
//   { ... },
// ]
```

#### `buildCuratorEntryText(curatorContext)`
Generates summary text for Curator entry button.

```javascript
buildCuratorEntryText(context)
// → "216 items across 2 modules. What insights would you like?"
```

#### `prepareCuratorNavigationState(curatorContext)`
Prepares navigation payload for `/Curator` page.

```javascript
const state = prepareCuratorNavigationState(context);
navigate('/Curator', { state });
// State includes: context, ecosystemContext, promptSeeds, timestamp
```

---

## Consumption Patterns

### Hub Page
```javascript
import {
  getCollectionHubSummary,
  getEnabledModules,
  getComingSoonModules,
  getRecentCrossModuleActivity,
} from '@/components/keeper-core';

// Load data
const summary = await getCollectionHubSummary(user.email);
const activities = await getRecentCrossModuleActivity();
const modules = getEnabledModules();
```

### Curator Entry
```javascript
import {
  buildCuratorHubContext,
  prepareCuratorNavigationState,
} from '@/components/keeper-core';

const context = buildCuratorHubContext(summary, activities);
const navState = prepareCuratorNavigationState(context);
navigate('/Curator', { state: navState });
```

### Value Display
```javascript
import { formatCurrencyValue, calculateEcosystemValueMetrics } from '@/components/keeper-core';

const value = formatCurrencyValue(12500);  // "$12,500"
const metrics = calculateEcosystemValueMetrics(summary);
```

---

## Data Scoping

All Keeper Core services maintain user-scoped data access:

```javascript
// Always scoped to current user
base44.entities.Pipe.filter({ created_by: userEmail })
base44.entities.TobaccoBlend.filter({ created_by: userEmail })
base44.entities.Bottle.filter({ created_by: userEmail })
```

**Contract**: If a service function accepts `userEmail` or uses an authenticated context, it guarantees user-scoped data access.

---

## Extension Points

### Adding a New Module

1. **Define in registry**:
   ```javascript
   KEEPER_MODULES.push({
     type: 'cigars',
     titleKey: 'hub.cigarkeeper',
     icon: '🔘',
     route: 'Cigars',
     enabled: false,  // Set to true when ready
     contributesToHub: false,  // Set to true when data is ready
     entityNames: ['Cigar', 'CigarSmokingLog'],
   });
   ```

2. **Add module summary logic**:
   ```javascript
   // In collectionSummary.js getModuleSummary()
   case 'cigars': {
     const cigars = await base44.entities.Cigar.filter({ created_by: userEmail });
     // ... aggregate values ...
     return { count, value };
   }
   ```

3. **Add value getter**:
   ```javascript
   export function getCigarValue(cigar) {
     return cigar.estimated_value || cigar.purchase_price || 0;
   }
   ```

4. **Add activity aggregation** (if needed):
   ```javascript
   // In recentActivity.js getRecentCrossModuleActivity()
   if (includeModules.includes('cigars')) {
     const logs = await base44.entities.CigarSmokingLog.list('-date', maxItems);
     // ... normalize and push to activities ...
   }
   ```

5. **Set `enabled: true` and `contributesToHub: true`** — Hub will automatically show it.

---

## What Remains Module-Specific

These concerns are intentionally NOT extracted to Keeper Core:

- **Pipe break-in schedules** — unique to PipeKeeper
- **Pairing matrices** — unique to PipeKeeper/TobaccoKeeper
- **Tasting note formats** — unique to WhiskeyKeeper
- **Module UI routes** → Pipes, Whiskey, etc. still own their pages
- **Module-specific AI (Photo ID, MatchingEngine, etc.)** → stay in component tree
- **Entity schema and detailed fields** → modules own their data model

---

## File Structure

```
components/keeper-core/
├── index.js                    # Public API exports
├── ARCHITECTURE.md             # This file
├── modules/
│   └── keeperModules.js        # Module registry
├── summary/
│   └── collectionSummary.js    # Collection aggregation
├── value/
│   └── valueAggregation.js     # Value calculations
├── activity/
│   └── recentActivity.js       # Activity aggregation
└── ai/
    └── buildCuratorHubContext.js  # Curator context
```

---

## Testing & Validation

For each new extraction or service:

1. **User scoping**: Verify data only returns current user's records
2. **Error handling**: Test with missing/incomplete entities
3. **Extensibility**: Verify new modules can be added without code changes
4. **Performance**: Check that parallel fetches are used (Promise.all)
5. **Null safety**: All functions handle undefined/null gracefully

---

## Future Work

- **Caching layer**: Memoize summary calculations for frequent Hub visits
- **Analytics service**: Track collection growth trends
- **Recommendation engine**: Cross-module pairing and collection insights
- **Sharing service**: Export collection snapshots
- **Backup/restore**: Serialize ecosystem state for user download