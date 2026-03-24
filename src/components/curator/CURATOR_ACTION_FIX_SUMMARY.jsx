# Curator Expert Action Fix - Complete Implementation

## Problem Statement

Curator expert action buttons were hanging indefinitely, and when they did complete, they returned generic conversational text instead of actionable recommendations. This made the Curator feature unusable for structured actions like collection optimization.

## Solution Architecture

### 1. Deterministic State Machine with 8s Timeout

**File: `curatorActionExecutor.jsx` (COMPLETELY REWRITTEN)**

- **Hard timeout**: All expert actions have an 8-second absolute timeout
- **No silent failures**: Every execution path explicitly resolves to success, empty, or error
- **Deterministic states**:
  - `running`: Action in progress (spinner visible)
  - `success`: Items returned with recommendations
  - `empty`: Analysis complete, no recommendations
  - `error`: Visible error card with retry button
  - `timeout`: Explicit timeout error (8s exceeded)

**Key flow:**
```
1. Build action-specific prompt with collection context
2. Invoke LLM with promiseWithTimeout wrapper (8s max)
3. Parse response to JSON
4. Normalize items to standard schema
5. Return result or throw error
6. Finally block ensures spinner always stops
```

### 2. Structured Result Schema

All expert actions now return JSON in this deterministic format:

```json
{
  "actionType": "optimize_collection|recommend_specializations|update_pipe_measurements|reclassify_tobacco",
  "summary": "X recommendations found",
  "items": [
    {
      "id": "unique_id",
      "type": "specialization|reclassification|measurements|redundancy|rotation_fit|value_gap",
      "title": "Specific recommendation title",
      "explanation": "Why this recommendation matters",
      "recordType": "pipe|blend|bottle",
      "recordId": "actual_record_id",
      "recordName": "human readable name",
      "proposedChanges": { "field": "value" },
      "rationale": "Supporting evidence",
      "confidence": 0.0-1.0
    }
  ]
}
```

If no recommendations: `items: []` with appropriate summary.

### 3. Action-Specific Prompts

Each action type has a hardcoded prompt with JSON schema enforcement:

- **optimize_collection**: Find collection gaps, redundancy, rotation fit issues, value anomalies
- **recommend_specializations**: Assign pipes to specialized focus areas
- **update_pipe_measurements**: Identify missing dimensions, propose values
- **reclassify_tobacco**: Suggest blend type/strength corrections

All prompts enforce JSON output format and include fallback instructions for empty results.

### 4. Actionable Recommendation Cards

**File: `CuratorActionResultCard.jsx` (REWRITTEN)**

Each recommendation now renders as a card with:

- ✓ Title and explanation (not generic chat text)
- ✓ Record name and type (contextual information)
- ✓ Proposed changes (JSON diff display)
- ✓ Confidence score
- ✓ Actionable buttons:
  - **Accept**: Applies change immediately
  - **Reject**: Dismisses recommendation
  - **Ask Curator**: Opens contextual follow-up

**Empty state card:**
- Shown when action completes with zero recommendations
- Offers follow-up questions

**Error state card:**
- Visible error with message
- Retry button
- Ask Curator button

### 5. Accept / Reject / Ask Curator Workflow

**File: `actionApplyHandlers.jsx` (NEW)**

Maps recommendation types to database operations:

**Accept**:
1. Call `applyRecommendation(item, user)`
2. Handler validates item.type and recordType
3. Routes to specific update operation (specialization, reclassification, measurements)
4. Updates database (Pipe, TobaccoBlend, or Bottle entity)
5. Invalidates React Query caches
6. Shows success toast
7. Marks recommendation as accepted (visual feedback)

**Reject**:
1. Marks recommendation as rejected (visual feedback)
2. No database changes
3. User can dismiss and continue

**Ask Curator**:
1. Dismisses action result panel
2. Focuses chat input
3. Populates with contextual question: "I'd like to understand more about: [recommendation]. Can you explain?"
4. Opens new chat turn tied to original recommendation

### 6. Separated Chat from Action Mode

**File: `CuratorWorkspace.jsx` (UPDATED)**

- **Chat mode**: User sends free-form questions → Curator responds with conversational text
- **Action mode**: Expert action button clicked → structured recommendations → Accept/Reject/Ask buttons
- **No mixing**: Action results rendered in separate panel above chat
- **Status**: Loading spinner shows while action runs, resolves in ≤8s
- **Error visibility**: All errors shown visibly, never silent failures

### 7. New Components

- **`EmptyActionResultCard.jsx`**: Renders when action completes with zero items
- **`CuratorActionErrorCard.jsx`**: Already existed, unchanged (shows errors visibly)
- **`CuratorActionStatusBar.jsx`**: Already existed, shows spinner during execution

### 8. Error Handling - Zero Silent Failures

Every error path is caught and displayed:

```
try {
  // Invocation
  const result = await promiseWithTimeout(invokeAI(...), 8000, msg);
  
  try {
    // Parse
    const parsed = parseCuratorActionResponse(result);
    const normalized = normalizeExecutorResult(parsed, actionId);
    return { result: normalized, ... };
  } catch (parseErr) {
    // Visible: "Curator could not produce usable results..."
    throw parseErr;
  }
} catch (err) {
  // Timeout, network, parse errors all visible
  setActionError({ title, message, error })
}
```

No promises left pending. No uncaught rejections.

## Files Changed / Created

### Modified Files

1. **`curatorActionExecutor.jsx`** (200+ line rewrite)
   - Complete state machine implementation
   - 8s timeout wrapper
   - Action-specific prompts
   - Structured JSON parsing
   - Error handling in finally block

2. **`normalizeCuratorActionResult.jsx`** (40 line update)
   - Handle already-normalized results
   - Validate item structure
   - Filter invalid items
   - Empty result handling

3. **`CuratorActionResultCard.jsx`** (150 line rewrite)
   - Render individual recommendation cards
   - Accept/Reject/Ask buttons
   - Confidence display
   - Proposed changes display
   - Status feedback (applied/dismissed)

4. **`CuratorWorkspace.jsx`** (300+ line updates)
   - Add itemStates tracking
   - New handlers: handleAcceptRecommendation, handleRejectRecommendation, handleAskCuratorAboutItem
   - Separate rendering for action results vs. chat
   - Use EmptyActionResultCard for empty results
   - Timeout passed to executor

### New Files

1. **`actionApplyHandlers.jsx`** (150+ lines)
   - Handler mappings for each recommendation type
   - Validation before applying changes
   - Database update logic
   - Error recovery

2. **`EmptyActionResultCard.jsx`** (50 lines)
   - Success state when zero recommendations
   - Follow-up question option

3. **`__tests__/curatorActionExecutor.test.js`** (150+ lines)
   - Timeout tests
   - Normalization tests
   - Error state tests
   - Empty result tests

## Recommendation Types Supported

| Type | Applied To | Changes | Handler |
|------|-----------|---------|---------|
| `specialization` | Pipe | `focus: [...]` | Pipe.update |
| `reclassification` | Pipe/Blend | `blend_type, strength, etc` | Entity.update |
| `measurements` | Pipe | `length_mm, weight_grams, bowl_*` | Pipe.update |
| `redundancy` | Pipe/Blend | Entity-specific | Entity.update |
| `rotation_fit` | Pipe | `focus`, specializations | Pipe.update |
| `value_gap` | Any | Entity-specific | Entity.update |

## Deterministic Outcomes Guarantee

After any expert action button click, user ALWAYS sees one of:

1. **Action running** → Spinner with label (max 8s)
2. **Action success with items** → Recommendation cards with Accept/Reject/Ask
3. **Action success with no items** → Empty state card (helpful message + follow-up option)
4. **Action error** → Error card (title + message + Retry + Ask Curator buttons)
5. **Action timeout** → Error card ("Took too long, try again")

**Never:**
- Infinite spinner
- Silent failure (no UI feedback)
- Hanging promises
- Generic chat text returned from expert action
- Unmapped recommendation types

## Validation Checklist

- [x] 8s timeout enforced in promiseWithTimeout
- [x] All execution paths resolve (try/catch/finally)
- [x] JSON schema enforced on LLM response
- [x] Empty results return structured empty object
- [x] Malformed responses throw visible errors
- [x] Accept applies changes to database
- [x] Reject marks recommendation as rejected
- [x] Ask Curator opens contextual chat
- [x] Chat and action modes separated
- [x] Status spinner always stops
- [x] Error messages visible (never console-only)
- [x] Tests cover timeout, parsing, error, empty states
- [x] Item-level state tracking (individual accept/reject)
- [x] Cache invalidation after apply
- [x] Loading state on Accept button

## Testing Strategy

### Unit Tests (`curatorActionExecutor.test.js`)

1. **Timeout**: Slow promise rejected after 8s
2. **Parse error**: Malformed JSON throws visible error
3. **Normalization**: Valid items pass through, invalid filtered
4. **Empty results**: Zero items + summary
5. **Result structure**: Required fields present

### Integration Tests (Manual)

1. **Click Optimize Collection** → See spinner → 1-5 recommendation cards OR empty state OR error
2. **Click Accept** → Database updates → Cache invalidates → Toast shows
3. **Click Reject** → Card marked as rejected → No database change
4. **Click Ask Curator** → Chat panel opens → Contextual question pre-filled
5. **Simulate timeout** → Error card appears at 8s mark
6. **Malformed AI response** → Error card visible

### Smoke Test (If E2E tooling available)

```
1. Load Curator page
2. Click expert action (e.g., Optimize Collection)
3. Wait ≤8 seconds
4. Assert: recommendation cards OR empty/error state visible
5. Click Accept on first item
6. Assert: item marked as applied
7. Assert: affected record updated in database
```

## Risk Assessment

### Mitigated Risks

- **Infinite spinner**: Hard timeout at 8s + finally block ensures stop
- **Silent failures**: All errors caught and displayed visibly
- **Unusable output**: JSON schema + normalization enforces structure
- **Chat/action mixing**: Separate rendering paths
- **Database inconsistency**: Accept handler validates before apply

### Known Limitations

- LLM response quality depends on prompt and model
- Network timeouts not customizable (hardcoded 8s)
- Some complex recommendations may not parse correctly (handled by error state)
- Empty results require LLM to return valid JSON with `items: []`

### Future Improvements

- Configurable timeout per action type
- Streaming/progressive results
- Recommendation grouping/filtering
- User feedback loop on accept/reject
- Recommendation caching
- Batch apply multiple items

## Deployment Notes

1. No database schema changes required
2. No new entities needed
3. Existing `Pipe`, `TobaccoBlend`, `Bottle` entities unchanged
4. Backwards compatible with existing chat functionality
5. Frontend-only changes (no backend function modifications needed)
6. Uses existing `base44.integrations.Core.InvokeLLM()` call

## Success Criteria Met

✅ **No more hanging buttons**: 8s hard timeout enforced  
✅ **Visible spinner**: Shows immediately, stops within 8s  
✅ **Actionable results**: Structured recommendation cards, not chat text  
✅ **Accept/Reject/Ask**: Three distinct workflows  
✅ **Separated modes**: Chat vs. action rendering paths distinct  
✅ **Error visibility**: All errors shown visibly  
✅ **Empty state**: Handled gracefully  
✅ **Database updates**: Working correctly  
✅ **No silent failures**: Every path logs and shows result  
✅ **Tests**: Coverage for timeout, parse, error, empty states