# Unified Collection Aggregation — Usage Guide

## Quick Start

```javascript
import { aggregateCollection } from '@/components/keeper-core/aggregation';

// Get all collection data
const agg = await aggregateCollection(userEmail);

// Access per-module statistics
console.log(agg.pipes.count);      // Number of pipes
console.log(agg.pipes.value);      // Total pipe value
console.log(agg.pipes.avgRating);  // Average pipe rating

console.log(agg.tobacco.open);     // Open tobacco quantity
console.log(agg.tobacco.cellared); // Cellared quantity

console.log(agg.whiskey.tastings); // Total tasting logs

// Access combined totals
console.log(agg.total.items);   // All items across modules
console.log(agg.total.value);   // Total collection value

// Access highlights
console.log(agg.highlights.mostUsedPipe);   // { id, name, uses, value }
console.log(agg.highlights.mostValuedBottle); // { id, name, value }
console.log(agg.highlights.oldestBottle);   // Full Bottle object

// Access raw data for custom processing
const pipes = agg.raw.pipes;        // Pipe[]
const logs = agg.raw.smokingLogs;   // SmokingLog[]
```

## Value Calculation Rules

All modules use consistent value prioritization:

**Bottles (Whiskey):**
```
collector_value (highest priority)
  ↓ if empty
aftermarket_price
  ↓ if empty
retail_price
  ↓ if empty
purchase_price
  ↓ if empty
0
```

**Pipes:**
```
estimated_value (highest priority)
  ↓ if empty
purchase_price
  ↓ if empty
0
```

**Tobacco Blends:**
```
manual_market_value (highest priority)
  ↓ if empty
ai_estimated_value
  ↓ if empty
0
```

## Common Use Cases

### Hub Overview
```javascript
const agg = await aggregateCollection(user.email);

const hubData = {
  pipes: agg.pipes.count,
  blends: agg.tobacco.count,
  bottles: agg.whiskey.count,
  totalValue: agg.total.value,
};
```

### Collection Story
```javascript
const agg = await aggregateCollection(user.email);

const story = {
  pipeCount: agg.pipes.count,
  blendCount: agg.tobacco.count,
  bottleCount: agg.whiskey.count,
  totalValue: agg.total.value,
  mostUsed: agg.highlights.mostUsedPipe,
  mostValued: agg.highlights.mostValuedBottle,
  dominantBlendType: /* compute from agg.raw.tobaccos */,
};
```

### Whiskey Insights Cards
```javascript
const agg = await aggregateCollection(user.email);

const cards = [
  { label: 'Total Bottles', value: agg.whiskey.count },
  { label: 'Open', value: agg.whiskey.open },
  { label: 'Sealed', value: agg.whiskey.sealed },
  { label: 'Collection Value', value: agg.total.value },
  { label: 'Average Rating', value: agg.whiskey.avgRating },
  { label: 'Total Tastings', value: agg.whiskey.tastings },
];
```

### Share Cards
```javascript
const agg = await aggregateCollection(user.email);

// PipeKeeper share card
const pipeCard = {
  pipes: agg.pipes.count,
  blends: agg.tobacco.count,
  sessions: agg.total.sessions,
  totalValue: agg.pipes.value,
};

// WhiskeyKeeper share card
const whiskeyCard = {
  bottles: agg.whiskey.count,
  tastings: agg.whiskey.tastings,
  totalValue: agg.whiskey.value,
  avgRating: agg.whiskey.avgRating,
};
```

### Reports
```javascript
const agg = await aggregateCollection(user.email);

const report = {
  // Summary
  totalItems: agg.total.items,
  totalValue: agg.total.value,
  
  // Details
  pipes: agg.raw.pipes,
  tobaccos: agg.raw.tobaccos,
  bottles: agg.raw.bottles,
  
  // Metrics
  pipeMetrics: {
    count: agg.pipes.count,
    value: agg.pipes.value,
    avgRating: agg.pipes.avgRating,
  },
};
```

## Highlighting Rules

The aggregation automatically computes highlights:

- **Most Used Pipe**: Most frequent in SmokingLog
- **Most Tasted Bottle**: Most frequent in TastingLog
- **Most Valued Bottle**: Highest value (using value priority rules)
- **Oldest Bottle**: Earliest purchase_date
- **Oldest Pipe**: Earliest purchase_date
- **Highest Rated Bottle**: Highest rating among rated bottles

## Error Handling

Aggregation returns empty structure on error:

```javascript
const agg = await aggregateCollection(email);

if (agg.total.items === 0 && agg.total.value === 0) {
  // Could be empty collection OR error
  // Check if user has data by trying individual queries
  // Or display "collection empty" message
}
```

For null checks on highlights:

```javascript
if (agg.highlights.mostUsedPipe) {
  console.log(`Most used: ${agg.highlights.mostUsedPipe.name}`);
} else {
  console.log('No pipes in collection');
}
```

## Performance Notes

- All data fetched in parallel (not sequential)
- One aggregation call replaces multiple independent queries
- Use `agg.raw` data instead of refetching entities
- Highlights are computed once, not repeatedly in UI

## Backward Compatibility

Legacy functions still work:

```javascript
// Old API (still works, delegates to aggregation)
import { getCollectionHubSummary } from '@/components/keeper-core/summary/collectionSummary';
const summary = await getCollectionHubSummary(email);

// Same as:
const agg = await aggregateCollection(email);
const summary = {
  pipes: agg.pipes,
  tobacco: agg.tobacco,
  whiskey: agg.whiskey,
  total: agg.total,
};
```

## Testing

```javascript
// Empty collection
const empty = await aggregateCollection('nodata@test.com');
// Returns structure with all counts = 0, all highlights = null

// Single module
const pipeOnly = await aggregateCollection('pipekeeper@test.com');
// agg.pipes populated, agg.tobacco and agg.whiskey empty

// Cross-module
const full = await aggregateCollection('collector@test.com');
// All modules populated with consistent values
```

---

**For questions**: Refer to `components/keeper-core/aggregation/collectionAggregation.js