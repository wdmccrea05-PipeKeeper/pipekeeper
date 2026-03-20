# TOBACCO DOMAIN ARCHITECTURE — DETAILED INTEGRATION GUIDE

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CURATOR (UI ENTRY POINT)                   │
│                                                                     │
│  Pages/Curator.jsx → Renders CuratorActionBar + CuratorWorkspace   │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ↓
         ┌───────────────────────────────────────────┐
         │      CURATOR ACTION BAR (5 ACTIONS)        │
         │                                           │
         │  1. Optimize Collection                  │
         │  2. Recommend Specializations            │
         │  3. Update Pipe Measurements             │
         │  4. Update Bottle Data                   │
         │  5. Reclassify Tobacco Blends ←──┐       │
         └───────────────────────────────────┼───────┘
                     │                       │
         ┌───────────↓───────────────────────↓───────────────────┐
         │     CURATOR ACTIONS REGISTRY                         │
         │  (components/curator/curatorActions.js)              │
         │                                                       │
         │  CURATOR_ACTIONS = [                                 │
         │    { id: 'optimize_collection',                      │
         │      buildPrompt: (ctx) => {...},                    │
         │      buildContext: (ctx) => {...},                   │
         │      sourceExpert: 'expert_tobacconist' },           │
         │                                                       │
         │    { id: 'recommend_specializations',                │
         │      buildPrompt: (ctx) =>                           │
         │        buildSpecializationContext(...),   ← HELPER   │
         │      buildContext: (ctx) => {...},                   │
         │      sourceExpert: 'expert_tobacconist' },           │
         │                                                       │
         │    { id: 'reclassify_tobacco_blends',                │
         │      buildPrompt: (ctx) =>                           │
         │        getTobaccoReclassificationCandidates(...),    │
         │        buildReclassificationCandidatesContext(...),  │
         │      buildContext: (ctx) => {...},                   │
         │      sourceExpert: 'expert_tobacconist' },           │
         │  ]                                                    │
         └───────────┬──────────────────────────────────────────┘
                     │
        ┌────────────┴────────────────────────────┐
        ↓                                         ↓
  ┌─────────────────┐  ┌──────────────────────────────────────────┐
  │  ACTION CLICK   │  │  EXPERT TOBACCONIST HELPER LAYER         │
  │                 │  │  (components/curator/               │
  │  User clicks    │  │   expertTobacconistHelpers.js)      │
  │  "Reclassify"   │  │                                     │
  └────────┬────────┘  │  getTobaccoReclassificationCandidates() │
           │           │  getTobaccoNormalizationIssues()       │
           │           │  getTobaccoSpecializationProfile()     │
           │           │  getTobaccoOptimizationSignals()       │
           │           │  buildExpertTobacconistContext()       │
           │           │  buildReclassificationCandidatesContext()
           │           │  buildSpecializationContext()          │
           │           │  buildOptimizationContext()            │
           ↓           │                                          │
  ┌─────────────────┐  └──────────────┬───────────────────────────┘
  │ CuratorActionBar│                 │
  │  .handleAction  │                 │
  │  Click()        │                 │
  └────────┬────────┘  ┌──────────────↓───────────────────────┐
           │           │ CLASSIFICATION CONSTANTS              │
           │           │ (components/tobacco/                  │
           │           │  tobaccoClassificationConstants.js)  │
           │           │                                      │
           │           │ CANONICAL_BLEND_FAMILIES             │
           │           │ BLEND_NORMALIZATION_MAP              │
           │           │ BLEND_FAMILY_GROUPS                  │
           │           │ CELLAR_CHARACTERISTICS               │
           │           │                                      │
           │           │ normalizeBlendType()                 │
           │           │ needsNormalization()                 │
           │           │ getBlendFamilyGroup()                │
           │           │ isAgingWorthy()                      │
           │           └──────────────┬───────────────────────┘
           │                          ↑
           └──────────────────────────┼────────────────────┐
                                      │                    │
                                      │           ┌────────↓──────────┐
                                      │           │ TASTE PROFILE     │
                                      │           │ useTasteProfile.js│
                                      │           │                   │
                                      └───────────├─ Flavor mappings  │
                                                  │ Usage patterns    │
                                                  │ Preferences       │
                                                  └───────────────────┘
                                      │
           ┌──────────────────────────┴──────────────────────┐
           ↓                                                  ↓
    ┌─────────────────┐                           ┌──────────────────┐
    │  buildPrompt()  │                           │  buildContext()  │
    │  Returns: str   │                           │  Returns: obj    │
    │                 │                           │                  │
    │ "You are the    │                           │ {                │
    │ Expert          │                           │   type: 'reclassify',
    │ Tobacconist     │                           │   dataRequirement:
    │                 │                           │     ['blends'],
    │ EXPERT CONTEXT: │                           │   sourceExpert:
    │ [cellar stats,  │                           │     'expert_...',
    │  issues, etc]   │                           │   candidates: [...]
    │                 │                           │ }
    │ CANDIDATES:     │                           │
    │ 1. Blend X      │                           └──────────────────┘
    │    (currently:  │
    │    'va/per')    │
    │  → Virginia/    │
    │    Perique      │
    │ 2. Blend Y      │
    │    (no class)   │
    │                 │
    │ For each:       │
    │ - Suggest...    │
    │ - Confidence... │
    │"                │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────────────────────────┐
    │ buildActionLaunchContext()           │
    │ (getVisibleActions, etc)            │
    │                                     │
    │ Returns: {                          │
    │   initialPrompt: str,               │
    │   sourceAction: 'reclassify_...',  │
    │   sourceExpert: 'expert_tobacc...',│
    │   recommendationContext: {          │
    │     type: 'reclassify_...',        │
    │     candidates: [...],             │
    │   }                                 │
    │ }                                   │
    └────────┬────────────────────────────┘
             │
             ↓
    ┌─────────────────────────────────────────┐
    │  CuratorActionBar.onActionSelect()       │
    │  (handleExpertAction callback)           │
    │                                         │
    │  setLaunchContext(launchContext)         │
    └────────┬────────────────────────────────┘
             │
             ↓
    ┌─────────────────────────────────────────┐
    │  CURATOR WORKSPACE (UI)                  │
    │  (components/curator/CuratorWorkspace)  │
    │                                         │
    │  Receives launchContext                 │
    │  - Initializes expert_tobacconist thread│
    │  - Injects taste profile                │
    │  - Seeds prompt with candidate list     │
    │  - Sends to Expert Agent                │
    └────────┬────────────────────────────────┘
             │
             ↓
    ┌─────────────────────────────────────────┐
    │  EXPERT TOBACCONIST AGENT                │
    │  (base44.agents.expert_tobacconist)     │
    │                                         │
    │  Receives structured prompt:            │
    │  - Context blocks (cellar, stats)       │
    │  - Candidate list with metadata         │
    │  - Canonical taxonomy reference         │
    │  - Specialization/optimization signals  │
    │                                         │
    │  Returns structured response:           │
    │  - Recommendation for each candidate    │
    │  - Confidence levels                    │
    │  - Normalization mappings               │
    │  - Priority rankings                    │
    │  - Next actions                         │
    └────────┬────────────────────────────────┘
             │
             ↓
    ┌─────────────────────────────────────────┐
    │  USER REVIEWS RECOMMENDATIONS            │
    │                                         │
    │  - Accepts/rejects classifications      │
    │  - Refines as needed                    │
    │  - Explicitly saves changes             │
    └─────────────────────────────────────────┘
```

---

## Data Flow Example: "Reclassify Tobacco Blends"

### Step 1: User Clicks Action

```javascript
// CuratorActionBar.jsx
const reclassifyAction = CURATOR_ACTIONS.find(a => a.id === 'reclassify_tobacco_blends');
const launchContext = buildActionLaunchContext(reclassifyAction, collectionContext);
onActionSelect(launchContext);  // → handleExpertAction in Curator page
```

### Step 2: Build Action Context

```javascript
// curatorActions.js - reclassify_tobacco_blends action
buildPrompt: (ctx) => {
  // Step 2a: Detect candidates
  const candidates = getTobaccoReclassificationCandidates(ctx.blends);
  
  // Step 2b: Build natural language context
  const candidatesContext = buildReclassificationCandidatesContext(ctx.blends);
  const expertContext = buildExpertTobacconistContext(ctx.blends, ctx.smokingLogs);
  
  // Step 2c: Inject into prompt
  return `You are the Expert Tobacconist...
${expertContext}
CLASSIFICATION CANDIDATES:
${candidatesContext}
For each candidate: ...`;
},

buildContext: (ctx) => ({
  type: 'reclassify_tobacco_blends',
  candidates: getTobaccoReclassificationCandidates(ctx.blends),
  sourceExpert: 'expert_tobacconist',
})
```

### Step 3: Candidate Detection

```javascript
// expertTobacconistHelpers.js
getTobaccoReclassificationCandidates(blends) → [
  {
    id: 'blend_123',
    name: 'My VA/Per Blend',
    blend_type: 'va/per',
    issue_type: 'non_canonical',
    suggested_canonical: normalizeBlendType('va/per'),  // 'Virginia/Perique'
    confidence: 0.95,
    priority: 'high',
  },
  {
    id: 'blend_456',
    name: 'Unknown Blend',
    blend_type: null,
    issue_type: 'missing_classification',
    priority: 'high',
  },
  // ...
]
```

### Step 4: Normalization Lookup

```javascript
// tobaccoClassificationConstants.js
normalizeBlendType('va/per') → {
  const normalized = 'va/per'.toLowerCase().trim();
  return BLEND_NORMALIZATION_MAP[normalized];
  // Returns: 'Virginia/Perique'
}
```

### Step 5: Prompt Injection

```
Expert context block:
─────────────────────
EXPERT TOBACCONIST CONTEXT:
Total tobacco blends owned: 24
Classification status:
  - 2 blends need classification review
  - 1 missing classification
  - 1 non-canonical variant
  - 1 can be auto-normalized

Specialization profile:
  - English: 8 blends (32%)
  - Virginia: 5 blends (20%)

Optimization signals:
  ✓ Cellar composition: 8 aging-worthy blends cellared
  ⚠ Rotation balance: Only 25% open for rotation

─────────────────────

Classification candidates:
─────────────────────
1. My VA/Per Blend (currently: 'va/per')
   → suggest: Virginia/Perique
   
2. Unknown Blend (no classification)
   [needs input from user/AI]

─────────────────────

For each candidate:
1. Suggest the correct canonical value
2. Explain the issue
3. Provide confidence
4. Recommend next action
```

### Step 6: Expert Tobacconist Response

```
RECOMMENDATION:

1. **My VA/Per Blend**
   - Canonical: Virginia/Perique ✓
   - Reason: User entered 'va/per', which normalizes to 'Virginia/Perique' in the canonical taxonomy
   - Confidence: HIGH (95%)
   - Impact: Enabling proper aging potential assessment (VA/Per ages well), improved pairing suggestions
   - Action: Reclassify immediately

2. **Unknown Blend**
   - Issue: No blend_type provided
   - Analysis: Based on [any flavor notes, room note, etc], likely Virginia or Virginia/Burley
   - Confidence: MEDIUM (60%)
   - Action: Request more metadata from user or accept medium-confidence classification
   
3. Overall Assessment: Collection has solid English foundation (32%) with emerging Virginia focus (20%). Classifying these 2 blends will improve rotation and aging recommendations.
```

### Step 7: User Acts

User in Curator workspace can:
- Accept recommendations
- Ask follow-up questions
- Request more detail
- Refine classifications
- Commit changes via explicit update workflow

---

## Key Connecting Points

### 1. Classification Constants → Helpers

```javascript
// tobaccoClassificationConstants.js
export const BLEND_NORMALIZATION_MAP = { ... };
export const CELLAR_CHARACTERISTICS = { ... };
export function isAgingWorthy(blendFamily) { ... }

// expertTobacconistHelpers.js
import { 
  normalizeBlendType,
  isAgingWorthy,
  getCellarCharacteristics,
} from '@/components/tobacco/tobaccoClassificationConstants';

// Now helpers can use canonical values, normalization, cellar logic
```

### 2. Helpers → Curator Actions

```javascript
// expertTobacconistHelpers.js
export function getTobaccoReclassificationCandidates(blends) { ... }
export function buildSpecializationContext(blends, logs) { ... }

// curatorActions.js
import {
  getTobaccoReclassificationCandidates,
  buildReclassificationCandidatesContext,
  buildSpecializationContext,
} from './expertTobacconistHelpers';

// Actions call helpers in buildPrompt/buildContext
```

### 3. Curator Actions → CuratorActionBar → CuratorWorkspace

```javascript
// CuratorActionBar clicks action
→ buildActionLaunchContext(action, context)
→ returns launchContext with initialPrompt + candidates
→ onActionSelect(launchContext)
→ handleExpertAction(launchContext)
→ setLaunchContext(launchContext)
→ CuratorWorkspace receives launchContext
→ Seeds prompt and launches expert_tobacconist thread
```

---

## Extending the System

### Add a New Normalization Rule

```javascript
// In tobaccoClassificationConstants.js
export const BLEND_NORMALIZATION_MAP = {
  // ... existing mappings ...
  "my_new_variant": CANONICAL_BLEND_FAMILIES.TARGET_FAMILY,
  "another_variant": CANONICAL_BLEND_FAMILIES.TARGET_FAMILY,
};

// No other changes needed — normalizeBlendType() will automatically find it
```

### Add a New Helper Function

```javascript
// In expertTobacconistHelpers.js
export function getTobaccoMissingMetadataBlends(blends = []) {
  return blends.filter(b => {
    const missing = [];
    if (!b.tobacco_components) missing.push('components');
    if (!b.strength) missing.push('strength');
    if (!b.room_note) missing.push('room_note');
    return missing.length > 0;
  }).map(b => ({
    ...b,
    missing_fields: missing,
  }));
}

// Then use in Curator action
buildPrompt: (ctx) => {
  const weakMetadata = getTobaccoMissingMetadataBlends(ctx.blends);
  return `Blends with weak metadata:\n${weakMetadata.map(b => b.name).join(', ')}`;
}
```

### Add a New Curator Action

```javascript
// In curatorActions.js
export const CURATOR_ACTIONS = [
  // ... existing actions ...
  {
    id: 'enrich_tobacco_metadata',
    label: 'Enrich Tobacco Metadata',
    description: 'Identify and improve missing tobacco metadata',
    icon: FileText,
    modules: ['tobacco'],
    sourceExpert: 'expert_tobacconist',
    visibility: (ctx) => {
      const weak = getTobaccoMissingMetadataBlends(ctx.blends || []);
      return weak.length > 0;
    },
    buildPrompt: (ctx) => {
      const weak = getTobaccoMissingMetadataBlends(ctx.blends || []);
      return `Help me enrich these tobacco blends with better metadata...\n${weak.map(...).join(...)}`;
    },
    buildContext: (ctx) => ({
      type: 'enrich_metadata',
      sourceExpert: 'expert_tobacconist',
      weak_metadata_blends: getTobaccoMissingMetadataBlends(ctx.blends),
    }),
    eventName: 'curator_action_enrich_tobacco_metadata',
  },
];
```

---

## No Duplicate Systems

### Single Tobacco Taxonomy
- ✓ One source: `tobaccoClassificationConstants.js`
- ✗ No competing constants in other files
- ✓ All normalization feeds into same canonical values

### Single Helper Layer
- ✓ One source: `expertTobacconistHelpers.js`
- ✗ No duplicate candidate detection
- ✓ All helpers use canonical taxonomy

### Single Curator Integration
- ✓ All actions in `curatorActions.js`
- ✗ No orphaned action systems
- ✓ All use same expert_tobacconist agent

### Single Expert Agent
- ✓ expert_tobacconist powers all tobacco actions
- ✗ No separate "TobacconistChat" (legacy component preserved but unused)
- ✓ Curator is the visible UI entry point

---

**This architecture ensures Expert Tobacconist is a cohesive, single system — not scattered across multiple files.**