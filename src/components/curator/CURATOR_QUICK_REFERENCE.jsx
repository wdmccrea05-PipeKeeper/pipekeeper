# Curator Hardening — Quick Reference

## At a Glance

**What changed?** Expert actions now use a separate, reliable pipeline with guaranteed outcomes.

**Why?** No more endless spinners, dead ends, or non-actionable chat responses.

## File Map

| File | Purpose |
|------|---------|
| `types/curatorActionTypes.js` | Action constants |
| `curatorActionService.js` | Execution engine with timeout |
| `curatorActionExecutor.jsx` | AI invocation + parsing |
| `curatorApplyHandlers.js` | Database updates |
| `normalizeCuratorActionResult.js` | Result normalization |
| `parseCuratorActionResponse.jsx` | JSON validation |
| `CuratorActionPanel.jsx` | Result container |
| `CuratorActionResultCard.jsx` | Individual card |
| `CuratorActionErrorCard.jsx` | Error display |
| `EmptyActionResultCard.jsx` | Empty state |

## Usage Example

```javascript
import { CURATOR_ACTIONS } from "@/components/curator/types/curatorActionTypes";
import { handleExpertAction } from "@/components/curator/CuratorWorkspace";

// In your component:
<Button
  onClick={() => handleExpertAction(CURATOR_ACTIONS.OPTIMIZE_COLLECTION)}
>
  Optimize Collection
</Button>
```

## Result States

| State | UI Shows |
|-------|----------|
| `running` | "Curator is reviewing your collection..." |
| `success` | Structured cards with Accept/Reject/Ask |
| `empty` | "No actionable recommendations right now" |
| `error` | "Curator could not complete this action" + Retry |
| `timeout` | "Curator took too long to respond" + Retry |

## Recommendation Schema

```javascript
{
  id: "rec_1",
  type: "specialization" | "reclassification" | "measurement_update",
  title: "Assign Pipe A to Outdoor Rotation",
  explanation: "This pipe is underused indoors",
  rationale: "Physically durable, better for outdoor use",
  confidence: 0.85,
  recordType: "pipe" | "blend",
  recordId: "pipe_123",
  recordName: "Dunhill Shell Briar",
  proposedChanges: { focus: ["Outdoor Rotation"] },
  followUpPrompt: "Why is this a good fit?"
}
```

## Key Guarantees

- ✅ **8-second timeout** — never spins forever
- ✅ **Structured output** — always cards, never plain chat
- ✅ **Actionable buttons** — Accept/Reject/Ask on every card
- ✅ **Database updates** — Accept actually changes records
- ✅ **Visible failures** — errors shown to user, not console

## Testing Checklist

1. Click each expert button
2. Verify spinner → result within 8s
3. Accept a recommendation → check database updated
4. Reject a recommendation → card shows dismissed
5. Ask Curator → opens contextual follow-up
6. Trigger error → visible error state with retry

## Next Steps

After this foundation:
- Add analytics tracking
- Persist recommendation history
- Batch operations
- Conflict detection
- Richer previews