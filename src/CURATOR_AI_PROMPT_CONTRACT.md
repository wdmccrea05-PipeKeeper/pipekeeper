# CURATOR ACTION AI PROMPT CONTRACT

## REQUIRED SYSTEM INSTRUCTION

Append this to the curator AI system prompt:

```
Return ONLY valid JSON. Do not include markdown code blocks, prose, or explanatory text outside the JSON.
Do not echo the user's prompt.
Do not include "recommendations" as a top-level field unless it is also wrapped into the "groups" array structure.

If providing recommendations, specializations, or insights, wrap them into:
{
  "actionId": "curator_action",
  "title": "...",
  "summary": "...",
  "status": "completed",
  "executionId": "...",
  "groups": [
    {
      "groupKey": "string",
      "groupTitle": "string",
      "itemCount": number,
      "items": [...]
    }
  ]
}

If you return alternative structures (currentSpecializationAssessment, underexploredOpportunities, recommendations at root),
they MUST be transformed by the client normalizer into the groups structure above.

REQUIRED: Ensure groups[].items[] always contains all actionable recommendations, with each item including:
- id (unique identifier)
- type (pipe, tobacco, bottle, or collection)
- itemId (entity ID or null)
- itemName (human-readable name)
- issue (what problem was detected)
- recommendation (what should be done)
- proposedChange { type, payload } (how to apply it)
- confidence (high, medium, or low)
```

---

## NO LONGER ACCEPTABLE

❌ Markdown code fences around JSON
❌ Prose before or after JSON
❌ Top-level "recommendations" field without "groups" wrapper
❌ Raw analysis text
❌ Multiple unrelated JSON objects
❌ Commented JSON
❌ Explanatory text like "Here's my analysis:"

## ALWAYS REQUIRED

✅ Valid JSON object (not array at root)
✅ "groups" array with items
✅ Each item has id, type, itemId, itemName, issue, recommendation, proposedChange, confidence
✅ Only JSON, no prose
✅ Use literal strings: "high", "medium", "low" for confidence

---

## EXAMPLE VALID RESPONSE

```json
{
  "actionId": "optimize_collection",
  "title": "Collection Optimization",
  "summary": "Found 3 optimization opportunities in your collection.",
  "status": "completed",
  "executionId": "optimize_collection_1234567890",
  "groups": [
    {
      "groupKey": "pipe_specializations",
      "groupTitle": "Pipe Specializations",
      "description": "Pipes that could benefit from specialization recommendations.",
      "priority": "medium",
      "itemCount": 2,
      "items": [
        {
          "id": "rec_001",
          "type": "pipe",
          "itemId": "pipe_123",
          "itemName": "Peterson 305",
          "issue": "No specialization assigned for optimal tobacco pairing.",
          "recommendation": "Specialize this pipe for English blends to maximize its performance.",
          "proposedChange": {
            "type": "pipe_specialization",
            "payload": {
              "specialization": ["English"],
              "reasoning": "Large chamber suits English blends well"
            }
          },
          "confidence": "high"
        },
        {
          "id": "rec_002",
          "type": "pipe",
          "itemId": "pipe_456",
          "itemName": "Savinelli",
          "issue": "Could benefit from Burley focus.",
          "recommendation": "Consider specializing for Burley-based blends.",
          "proposedChange": {
            "type": "pipe_specialization",
            "payload": {
              "specialization": ["Burley"]
            }
          },
          "confidence": "medium"
        }
      ]
    },
    {
      "groupKey": "underexplored",
      "groupTitle": "Underexplored Opportunities",
      "description": "Collection areas that could be developed.",
      "priority": "low",
      "itemCount": 1,
      "items": [
        {
          "id": "rec_003",
          "type": "collection",
          "itemId": null,
          "itemName": "Latakia Blends",
          "issue": "Latakia blends are underrepresented in your cellar.",
          "recommendation": "Explore Latakia-based blends to add depth to your collection.",
          "proposedChange": {
            "type": "collection_expansion",
            "payload": {
              "category": "Latakia",
              "reason": "Diversification opportunity"
            }
          },
          "confidence": "low"
        }
      ]
    }
  ]
}
```

---

## LEGACY FORMAT HANDLING

If you were returning formats like:

```json
{
  "currentSpecializationAssessment": {...},
  "recommendations": [...]
}
```

Or:

```json
{
  "underexploredOpportunities": [...]
}
```

These are acceptable, but the **client normalizer will transform them** into the canonical groups structure.

**To reduce parsing overhead, migrate to the canonical structure above.**

---

## VALIDATION RULES (for you to follow)

1. Root object must have "groups" key (or "recommendations" that the client transforms)
2. "groups" must be an array
3. Each group must have "items" array
4. Each item MUST have: id, type, itemId, itemName, issue, recommendation, proposedChange, confidence
5. type must be one of: "pipe", "tobacco", "bottle", "collection"
6. confidence must be one of: "high", "medium", "low"
7. proposedChange must be { type, payload } or null
8. No markdown, no prose, no extra text

---

## WHY THIS MATTERS

- **Client Parser**: Expects valid JSON; multiple attempts to extract if wrapped in fences
- **Client Normalizer**: Transforms legacy shapes into canonical; validates all items have required fields
- **Client UI**: Renders groups and items; fails gracefully if validation fails
- **User Experience**: Sees actionable result card, not raw JSON or error

By following this contract, your responses will:
1. Parse correctly (valid JSON)
2. Normalize cleanly (match expected structure)
3. Render as actionable cards (no fallback to text)
4. Enable user actions (Accept, Apply, Clarify)

---

## ERROR CASES

If you return invalid JSON:
- Parser fails → error card shown to user
- User clicks "Ask Curator Instead" to clarify

If you return valid JSON but don't wrap recommendations:
- Normalizer catches unmapped data → error card
- User gets clear message: "Response could not be processed into actionable insights"

If you return missing item fields:
- Normalizer filters out incomplete items
- If all items filtered, error card shown
- User knows data was received but incomplete

**All of these are better than showing raw JSON to the user.**