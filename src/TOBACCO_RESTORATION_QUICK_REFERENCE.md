# TOBACCO RESTORATION — QUICK REFERENCE

## What Was Restored

Three **Expert Tobacconist** workflows now visible through Curator:

1. **Reclassify Tobacco Blends** — Detect & normalize classifications
2. **Recommend Specializations** — Identify collection focus patterns
3. **Optimize Collection** — Cellar, rotation, acquisition strategy

## Files to Know

### Taxonomy (Single Source of Truth)
**`components/tobacco/tobaccoClassificationConstants.js`**
- Canonical blend families
- User input normalization (va/per → Virginia/Perique)
- Cellar characteristics
- Blend groupings

### Helper Layer (Expert Functions)
**`components/curator/expertTobacconistHelpers.js`**
- `getTobaccoReclassificationCandidates(blends)` — finds candidates
- `getTobaccoSpecializationProfile(blends, logs)` — analyzes patterns
- `getTobaccoOptimizationSignals(blends, logs)` — finds opportunities
- `buildExpertTobacconistContext(blends, logs)` — context for prompts

### Curator Integration
**`components/curator/curatorActions.js`**
- Three tobacco actions enhanced with helpers
- Each action builds domain-specific prompt
- Launches Expert Tobacconist agent with structured context

## Key Design Decisions

### 1. Single Canonical Taxonomy
✓ No competing classifications  
✓ All normalization maps to same set of values  
✓ Deterministic (same input → same output)

### 2. Structured, Not Generic
✓ Helper functions return structured data  
✓ Prompts include candidate lists, signals, analysis  
✓ Not just "help me classify my blends"

### 3. Suggestive, Not Destructive
✓ Normalization recommends changes  
✓ No auto-save without user confirmation  
✓ Full undo history possible (future feature)

### 4. Domain-Aware Context
✓ Cellar depth analysis  
✓ Rotation balance assessment  
✓ Aging-worthy blend identification  
✓ Specialization pattern detection

## Common Workflows

### Add New Helper Function

1. Edit `expertTobacconistHelpers.js`
2. Function receives `(blends, smokingLogs)` arrays
3. Returns structured object with signals/candidates/analysis
4. Export function name
5. Use in Curator action `buildPrompt()` or `buildContext()`

### Add New Normalization Variant

1. Edit `tobaccoClassificationConstants.js`
2. Add entry to `BLEND_NORMALIZATION_MAP`:
   ```javascript
   "my_variant": CANONICAL_BLEND_FAMILIES.TARGET_FAMILY,
   ```
3. Test: `normalizeBlendType("my_variant")` should return TARGET_FAMILY

### Enhance a Curator Action

1. Edit action in `curatorActions.js`
2. Call helper functions in `buildPrompt()`:
   ```javascript
   const candidates = getTobaccoReclassificationCandidates(blends);
   const context = buildExpertTobacconistContext(blends, smokingLogs);
   ```
3. Inject context into prompt string
4. Update `buildContext()` with any metadata

## Testing Checklist

- [ ] Can open Curator and see three tobacco actions
- [ ] Click "Reclassify" → shows candidates
- [ ] Click "Specializations" → shows focus pattern
- [ ] Click "Optimize" → shows signals
- [ ] Each action seeds workspace with structured prompt
- [ ] Expert Tobacconist agent receives context blocks
- [ ] No errors in console

## Files NOT Modified

- `pages/Curator.jsx` — No changes
- `components/curator/CuratorWorkspace.jsx` — No changes
- `components/curator/CuratorActionBar.jsx` — No changes
- `components/agent/ExpertTobacconistChat.jsx` — Still available (unused)
- `components/agent/TobacconistChat.jsx` — Still available (unused)

---

**Expert Tobacconist is now integrated into Curator.**  
**No duplicate systems. No orphaned code. All logic is reachable.**