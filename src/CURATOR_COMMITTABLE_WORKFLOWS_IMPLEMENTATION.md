# CURATOR COMMITTABLE WORKFLOWS — COMPLETE IMPLEMENTATION

**Status: COMPLETE** ✓  
**Date: 2026-03-20**  
**Scope: Convert Curator from advice chatbot to actionable decision engine**

---

## ARCHITECTURE SHIFT

### Before (Chatbot Model)
```
User clicks "Optimize Collection"
    ↓
Action runs silently
    ↓
AI returns freeform text advice
    ↓
Displayed as chat message
    ↓
User reads advice (no action possible)
```

### After (Decision Engine Model)
```
User clicks "Optimize Collection"
    ↓
Action runs silently
    ↓
AI returns structured recommendations
    ↓
Parsed into action result card
    ↓
User sees: Groups → Items → Accept/Apply OR Clarify
    ↓
Accept → Collection updated immediately
Clarify → Chat reopens with clean context
```

---

## FILES CREATED

### 1. `components/curator/actionResultParser.js` (NEW)

**Purpose:** Transform unstructured AI responses into canonical action result format.

**Exports:**

```javascript
parseActionResult(actionId, aiResponse, context)
  → Returns structured action output for rendering

parseOptimizeCollectionResult(aiResponse, context)
  → Pipe specializations + tobacco classifications + bottle suggestions

parseSpecializationsResult(aiResponse, context)
  → Pipe specialization strategy recommendations

parseTobaccoReclassificationResult(aiResponse, context)
  → Tobacco blend normalization recommendations
```

**Canonical Format:**
```javascript
{
  actionId: string,
  title: string,
  summary: string,
  groups: [
    {
      groupTitle: string,
      items: [
        {
          id: string,
          type: "pipe" | "tobacco" | "bottle" | "collection",
          itemId?: string,
          itemName: string,
          issue: string,
          recommendation: string,
          proposedChange: {
            type: string,
            payload: {...}
          },
          confidence: 0-1
        }
      ]
    }
  ]
}
```

---

### 2. `components/curator/CuratorActionResultCard.jsx` (NEW)

**Purpose:** Interactive decision card for action results.

**Features:**
- **Collapsible Groups** — Organize recommendations by category
- **Item-level Selection** — Choose which items to apply
- **Select All** — Apply all recommendations at once
- **Confidence Display** — Show confidence % for each recommendation
- **Apply All Button** — Commit all selected changes to collection
- **Apply Selected Button** — Commit only selected items
- **Clarify Button** — Reopen chat with clean follow-up question

**UI Layout:**
```
┌─────────────────────────────────────┐
│ [Title] Collection Optimization     │
│ [Summary] Found 5 recommendations   │
├─────────────────────────────────────┤
│ ☐ Select All                        │
├─────────────────────────────────────┤
│ ▼ Pipe Specializations (3)          │
│  ┌──────────────────────────────┐   │
│  │ ☐ Peterson 305               │   │
│  │  Issue: No specialization    │   │
│  │  Recommend: Virginia blends  │   │
│  │  Confidence: 85%             │   │
│  └──────────────────────────────┘   │
├─────────────────────────────────────┤
│ [Apply All] [Apply (3)] [Clarify]   │
└─────────────────────────────────────┘
```

---

### 3. `components/curator/actionApplyHandlers.js` (NEW)

**Purpose:** Commit structured recommendations to the database.

**Exports:**

```javascript
applyPipeSpecializations(groups)
  → Updates pipe.focus array with specializations
  → Returns { success, failed, errors }

applyTobaccoReclassifications(groups)
  → Updates blend_type on TobaccoBlend
  → Returns { success, failed, errors }

applyCollectionOptimization(groups)
  → Dispatcher for all optimization changes
  → Handles pipes, tobacco, bottles, collection reviews

applyActionChanges(actionId, groups)
  → Main entry point, routes to correct handler

buildClarificationPrompt(clarificationContext)
  → Generate clean chat prompt for clarification flow
```

**Database Updates:**
- Pipe specializations → `Pipe.update(id, { focus: [...] })`
- Tobacco classifications → `TobaccoBlend.update(id, { blend_type })`
- Bottle suggestions → Logged to UI (informational)
- Collection reviews → Logged to UI (informational)

---

## FILES MODIFIED

### `components/curator/CuratorWorkspace.jsx`

**Changes:**

1. **New Imports:**
   ```javascript
   import { parseActionResult } from "@/components/curator/actionResultParser";
   import { applyActionChanges, buildClarificationPrompt } from "@/components/curator/actionApplyHandlers";
   import CuratorActionResultCard from "@/components/curator/CuratorActionResultCard";
   ```

2. **New State:**
   ```javascript
   const [actionResult, setActionResult] = useState(null);
   const [applyLoading, setApplyLoading] = useState(false);
   ```

3. **Updated `sendMessage` Signature:**
   ```javascript
   async function sendMessage(
     textOverride = null,
     contextOverride = null,
     isActionExecution = false,
     actionLaunchContext = null  // NEW
   )
   ```

4. **Action Result Parsing:**
   - When `isActionExecution = true`, response is parsed into structured output
   - `parseActionResult()` transforms AI text → action result card format
   - Result stored in `actionResult` state for rendering

5. **New Handlers:**
   ```javascript
   handleApplyActionItems(groups, selectedItemIds)
     → Calls applyActionChanges()
     → Updates collection
     → Clears action result card
     → Shows success toast

   handleClarifyAction(clarificationContext)
     → Builds clean follow-up prompt
     → Sets input field
     → Clears action result card
     → Focuses on chat input
   ```

6. **UI Updates:**
   - Added `<CuratorActionResultCard />` component above messages
   - Shows only when action completes (not during running state)
   - Passes `onApplyItems` and `onClarify` callbacks

---

## HOW IT WORKS END-TO-END

### Phase 1: Action Execution (Unchanged)

```
User clicks "Optimize Collection"
  → CuratorActionBar.handleActionClick()
  → Creates actionExecutionContext (unique executionId)
  → Passes to CuratorWorkspace via launchContext
  → useEffect detects new executionId
  → sendMessage(prompt, context, isActionExecution=true, launchContext)
```

### Phase 2: Silent AI Response

```
sendMessage() in action mode:
  1. Does NOT create optimistic user message
  2. Sends full context + prompt to agent
  3. Receives unstructured AI response
  4. Adds response to messages (marked as action_execution)
  5. Calls parseActionResult(actionId, response)
  6. Sets actionResult state
```

### Phase 3: Result Card Rendering

```
CuratorWorkspace rendering:
  IF actionResult exists AND runningAction is null
    Render: <CuratorActionResultCard actionResult={actionResult} />
  ELSE
    Render: <MessageBubble /> for normal chat messages
```

### Phase 4a: User Accepts Changes

```
User clicks "Apply All"
  → handleApplyActionItems(groups, selectedItemIds)
  → applyActionChanges(actionId, groups)
  → For each item, calls appropriate handler:
     - applyPipeSpecializations()
     - applyTobaccoReclassifications()
     - applyCollectionOptimization()
  → Each handler updates database via base44.entities
  → Success toast shown
  → actionResult cleared
```

### Phase 4b: User Wants Clarification

```
User clicks "Clarify"
  → handleClarifyAction(clarificationContext)
  → buildClarificationPrompt() creates clean follow-up
  → Example prompt:
     "I'd like to understand more about these recommendations:
      - Peterson 305: No specialization
      - Savinelli Bing: No specialization
      Can you explain the reasoning in more detail?"
  → Input field set to this prompt
  → User clicks Send (normal chat flow)
  → Chat continues without raw internals
```

---

## DECISION FLOW DIAGRAM

```
┌─────────────────────────────┐
│ Action Button Clicked       │
│ (Optimize Collection)       │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ Silent AI Execution         │
│ (No user message)           │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ Parse Response              │
│ (AI text → Structure)       │
└──────────┬──────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│ Render Action Result Card            │
│ Groups → Items → Confidence          │
└──────────┬──────────────┬────────────┘
           │              │
    ┌──────┘              └──────┐
    ↓                            ↓
┌────────────────────┐    ┌──────────────────┐
│ Apply All / Apply  │    │ Clarify          │
│ Selected           │    │                  │
└────────┬───────────┘    └────────┬─────────┘
         │                         │
         ↓                         ↓
    ┌─────────────┐          ┌──────────────┐
    │ Update DB   │          │ Reopen Chat  │
    │ Clear Card  │          │ with Context │
    │ Show Toast  │          │ No Raw Prompts
    └─────────────┘          └──────────────┘
```

---

## ACCEPTANCE CRITERIA — ALL MET ✓

**Prompt Visibility**
- ✓ Raw AI prompts never display in chat
- ✓ Internal context blocks (EXPERT TOBACCONIST, etc.) hidden
- ✓ Only structured action results shown

**Committable Workflows**
- ✓ Accept & Apply immediately updates collection
- ✓ Clarify reopens chat with clean question
- ✓ No user sees raw internal architecture

**Action Result Quality**
- ✓ Structured groups (Pipes, Tobacco, Bottles)
- ✓ Item-level recommendations with confidence
- ✓ Proposed changes include type and payload

**Database Integrity**
- ✓ Pipe specializations update via Pipe.update()
- ✓ Tobacco classifications update via TobaccoBlend.update()
- ✓ Changes invalidate relevant React Query caches
- ✓ UI reflects changes immediately

**UX**
- ✓ Looks like a decision tool, not a chatbot
- ✓ Polished action result card
- ✓ Clear decision paths (Apply vs Clarify)
- ✓ Confidence scores increase user trust

**Architecture**
- ✓ Completely separate action execution path
- ✓ Action results bypass chat rendering
- ✓ Clarification flow uses chat but with clean context
- ✓ No architectural leakage (prompts not visible)

---

## EXAMPLE USAGE

### Scenario 1: Accept All Changes

```
User opens Curator → Clicks "Optimize Collection"

AI Response (structured internally):
"Peterson 305 → Virginia blends focus
 Savinelli Bing → English blends focus
 Consider: Peated Islay Scotch for balance"

Rendered Card:
┌─────────────────────────────┐
│ Collection Optimization     │
│ Found 3 opportunities       │
├─────────────────────────────┤
│ ☐ Select All                │
├─────────────────────────────┤
│ ▼ Pipe Specializations (2)  │
│  ☐ Peterson 305: Virginia   │
│  ☐ Savinelli Bing: English  │
├─────────────────────────────┤
│ ▼ Bottle Suggestions (1)    │
│  • Peated Islay Scotch      │
├─────────────────────────────┤
│ [Apply All] [Clarify]       │
└─────────────────────────────┘

User clicks "Apply All"
  → Peterson 305.focus = ["Virginia blends"]
  → Savinelli Bing.focus = ["English blends"]
  → Database updated
  → Card cleared
  → Toast: "Applied 2 changes to your collection"
```

### Scenario 2: Clarify Before Applying

```
User clicks "Clarify"
  → Chat reopens with:
     "I'd like to understand more about these:
      - Peterson 305: Why Virginia blends?
      - Savinelli Bing: Why English blends?
      Can you explain the reasoning?"

AI responds with detailed explanation

User then:
  Option A: Return to card and apply
  Option B: Have follow-up conversation in chat
  Option C: Ask different question entirely
```

---

## KEY DESIGN DECISIONS

### 1. Structured Result Format

Instead of rendering freeform AI text, we parse into canonical groups + items. This allows:
- Interactive selection
- Confidence display
- Type-aware apply handlers
- Bulk operations

### 2. Separate Rendering Path

Action results render as cards, NOT chat messages. Prevents:
- Raw prompts appearing
- Confusion between chat and actions
- Loss of data structure during display

### 3. Item-level Selection

Users can pick and choose which recommendations to apply. Supports:
- "I like specializations but not the bottle suggestion"
- "Only apply Peterson 305, skip Savinelli"
- Batch operations OR cherry-picking

### 4. Clean Clarification

Clarify button generates human-readable follow-up WITHOUT:
- Re-injecting system prompt
- Dumping JSON
- Showing internal context

Instead: "Why should Peterson 305 be Virginia blends?"

### 5. Immediate Database Updates

Apply handlers update via `base44.entities.update()` immediately:
- No confirmation dialogs
- No pending state
- Changes are persistent and reversible (user can edit manually)

---

## REMAINING NOTES

### What Still Works

- Normal typed chat (unchanged)
- Quick prompts (unchanged)
- Message history (unchanged)
- AI context injection (unchanged)

### What's New

- Action results as interactive cards
- Item-level selection UI
- Apply handlers for all action types
- Clarification flow with clean prompts

### Future Enhancements

1. **Undo/Rollback** — Store previous values, allow reversion
2. **Batch Action Preview** — Show what will change before applying
3. **Comparative View** — Show before/after side-by-side
4. **Per-Item Clarification** — Clarify just one pipe instead of all

---

## FINAL STATEMENT

Curator is now a **collection management engine**, not a chatbot.

Actions no longer produce advice in chat. They produce **committable decisions** with interactive Accept/Apply and Clarify flows.

This is the product shift from:
- "Tell me what to do" → "Do this for me"
- "Read advice" → "Make decisions"
- "Chat interface" → "Decision engine"

---

**IMPLEMENTATION COMPLETE**