# Curator Hardening — Complete Implementation

## Overview

This document describes the complete hardening of the Curator expert action system, transforming it from a conversational AI feature into a production-safe, reliable recommendation engine.

## What "Rock Solid" Means

The hardened Curator now guarantees:

- ✅ Expert action buttons **never spin forever**
- ✅ Every action ends in **success**, **empty**, **error**, or **timeout**
- ✅ Expert actions return **structured recommendation cards**, not plain chat text
- ✅ Every recommendation supports **Accept**, **Reject**, and **Ask Curator**
- ✅ **Accept actually updates records** in the database
- ✅ Failures are **visible in UI**, not hidden in console
- ✅ **Generic chat stays separate** from expert actions

## Architecture: Two Lanes

### Lane A: Chat Mode

For freeform questions:
- "What should I smoke tonight?"
- "Which pipes are underused?"
- "What blends overlap?"

This remains conversational and uses the standard chat renderer.

### Lane B: Action Mode

For expert buttons:
- **Optimize Collection**
- **Recommend Specializations**
- **Update Pipe Measurements**
- **Reclassify Tobacco Blends**

This uses:
- Strict JSON schema
- Dedicated execution pipeline (`curatorActionExecutor`)
- Dedicated result panel (`CuratorActionPanel`)
- Dedicated apply handlers (`curatorApplyHandlers`)

**Critical:** Expert action output does NOT go through the normal chat renderer.

## File Structure

### New Files Created

```
src/components/curator/
├── types/
│   └── curatorActionTypes.js          # Action type constants
├── curatorActionService.js            # Core execution service with timeout
├── curatorActionExecutor.jsx          # AI invocation + parsing
├── curatorApplyHandlers.js            # Database update handlers
├── normalizeCuratorActionResult.js    # Result normalization
├── parseCuratorActionResponse.jsx     # JSON parsing + validation
├── CuratorActionPanel.jsx             # Result panel component
├── CuratorActionResultCard.jsx        # Individual result card
├── CuratorActionErrorCard.jsx         # Error state component
├── EmptyActionResultCard.jsx          # Empty state component
└── __tests__/
    ├── curatorActionService.test.js   # Service tests
    └── normalizeCuratorActionResult.test.js  # Normalizer tests
```

### Modified Files

```
src/components/curator/CuratorWorkspace.jsx
```

## Strict Result Schema

Every expert action result normalizes to:

```javascript
{
  requestId: "uuid",
  actionType: "optimize_collection",
  status: "success" | "empty" | "error" | "timeout",
  summary: "3 recommendations found",
  items: [
    {
      id: "rec_1",
      type: "specialization" | "reclassification" | "measurement_update" | "rotation_optimization" | "redundancy_flag",
      title: "Reclassify Dunhill Shell Briar as Outdoor Rotation",
      explanation: "Usage pattern and durability suggest this pipe is better suited to outdoor rotation.",
      rationale: "This pipe is underused, overlaps with other indoor favorites, and is physically better suited to outdoor use.",
      confidence: 0.84,
      recordType: "pipe" | "blend",
      recordId: "pipe_123",
      recordName: "Dunhill Shell Briar",
      proposedChanges: { focus: ["Outdoor Rotation"] },
      followUpPrompt: "Why is Outdoor Rotation a better fit for this pipe?"
    }
  ],
  error: null
}
```

If output does not normalize to this shape:
- Do NOT fake success
- Show **error** or **empty** state

## Supported Recommendation Types

Initial implementation covers:

1. **specialization** — Assign pipes to rotation categories
2. **reclassification** — Update blend types or pipe categories
3. **measurement_update** — Add missing pipe measurements
4. **rotation_optimization** — Optimize pipe rotation assignments
5. **redundancy_flag** — Identify redundant blends

## Execution Flow

### 1. User Clicks Expert Button

```javascript
handleExpertAction(CURATOR_ACTIONS.OPTIMIZE_COLLECTION)
```

### 2. State Initialized

```javascript
setActionRun({
  requestId: "uuid",
  actionType: "optimize_collection",
  status: "running",
  summary: "",
  items: [],
  error: null,
})
```

### 3. Action Executed with Timeout

```javascript
const result = await runCuratorAction({
  actionType,
  executor: curatorActionExecutor,
  normalizer: normalizeCuratorActionResult,
  context: buildCuratorContext(),
  onAudit: logCuratorAuditEvent,
});
```

### 4. Result Rendered

```jsx
<CuratorActionPanel
  actionRun={actionRun}
  itemStates={itemStates}
  onRetry={handleRetryAction}
  onAccept={handleAcceptRecommendation}
  onReject={handleRejectRecommendation}
  onAskCurator={handleAskCuratorAboutRecommendation}
/>
```

### 5. User Accepts Recommendation

```javascript
await applyCuratorRecommendation(item);
// Updates database via base44.entities.Pipe.update() or base44.entities.TobaccoBlend.update()
```

## UI States

### Running

```
"Curator is reviewing your collection..."
```

### Success

Structured cards with:
- Title
- Explanation
- Rationale
- Confidence
- Proposed changes
- **Accept / Reject / Ask Curator** buttons

### Empty

```
"Curator reviewed your collection but found no actionable recommendations right now."
```

### Error

```
"Curator could not complete this action. Please try again."
```

### Timeout

```
"Curator took too long to respond. Please try again."
```

## Never Happens

- ❌ Endless spinner
- ❌ Dead UI
- ❌ Generic advice paragraph
- ❌ Action buttons that dump prompts into chat
- ❌ Console-only dead ends

## AI Prompt Contract

For expert buttons, AI must return **JSON only**:

```
Return valid JSON only.
No markdown.
No prose outside JSON.

Schema:
{
  "summary": "string",
  "items": [
    {
      "id": "string",
      "type": "rotation_optimization" | "specialization" | "reclassification" | "measurement_update" | "redundancy_flag",
      "title": "string",
      "explanation": "string",
      "rationale": "string",
      "confidence": 0.0,
      "recordType": "pipe" | "blend",
      "recordId": "string",
      "recordName": "string",
      "proposedChanges": {},
      "followUpPrompt": "string"
    }
  ]
}
```

**No conversational wrapper. No markdown. No "Here are my thoughts."**

## Testing

### Manual Smoke Test Checklist

For each expert action:

1. Click **Optimize Collection**
2. Click **Recommend Specializations**
3. Click **Update Pipe Measurements**
4. Click **Reclassify Tobacco Blends**

For each:

- ✅ Spinner appears
- ✅ Resolves within 8 seconds
- ✅ Ends in cards, empty state, or visible error
- ✅ Never hangs forever

### Actionability Tests

- ✅ **Accept** updates correct record
- ✅ **Reject** marks card dismissed
- ✅ **Ask Curator** opens contextual follow-up, not generic junk

### Failure Handling

- ✅ Malformed AI output → visible error state
- ✅ Timeout → visible timeout state
- ✅ No console-only dead ends

## Integration with CuratorWorkspace

### Imports Added

```javascript
import CuratorActionPanel from "./CuratorActionPanel";
import normalizeCuratorActionResult from "./normalizeCuratorActionResult";
import curatorActionExecutor from "./curatorActionExecutor";
import { runCuratorAction } from "./curatorActionService";
import { applyCuratorRecommendation } from "./curatorApplyHandlers";
import { CURATOR_ACTIONS } from "./types/curatorActionTypes";
```

### State Added

```javascript
const [actionRun, setActionRun] = useState(null);
const [itemStates, setItemStates] = useState({});
const [lastActionType, setLastActionType] = useState(null);
```

### Handlers Added

- `handleExpertAction(actionType)`
- `handleRetryAction()`
- `handleAcceptRecommendation(item)`
- `handleRejectRecommendation(item)`
- `handleAskCuratorAboutRecommendation(item)`
- `handleAskCuratorAboutItem(item)`
- `handleDismissAction()`

## Future Hardening Improvements

After this foundation works:

- [ ] Persist accepted/rejected recommendations in audit history
- [ ] Add analytics for action click / success / empty / error / accept / reject
- [ ] Optimistic updates after Accept
- [ ] Conflict checks before apply
- [ ] Richer record preview inside cards
- [ ] Collapse/expand proposedChanges
- [ ] Batch accept for multi-item recommendations
- [ ] Recommendation deduping (same suggestion doesn't repeat)

## Final Standard

Curator is only "fixed" when all of this is true:

- ✅ Expert action buttons never spin indefinitely
- ✅ Expert actions never return plain non-actionable chat
- ✅ Every expert result ends in success, empty, error, or timeout
- ✅ Every recommendation has Accept / Reject / Ask Curator
- ✅ Accept actually updates records
- ✅ Malformed AI output fails visibly
- ✅ Timeout fails visibly
- ✅ Chat mode and action mode are separate

## Deployment Notes

1. **No breaking changes** — existing chat functionality preserved
2. **Backwards compatible** — old curator sessions still work
3. **Test coverage** — core service and normalizer have unit tests
4. **Production-safe** — 8-second timeout prevents hanging
5. **User-visible errors** — no silent failures

## Credits

Architecture and implementation plan provided by comprehensive hardening specification.
All code implemented following Base44 platform conventions and design system.