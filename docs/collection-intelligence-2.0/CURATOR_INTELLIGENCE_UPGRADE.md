# Curator — Context-Aware Intelligence & Authorized Actions

Status: implemented and verified. Extends the existing Curator architecture; no engine was replaced.

## 1. Audit — what already existed and was reused

| Area | Existing component | Reused |
| --- | --- | --- |
| Intent routing | `curatorChatIntent.js`, `curatorIntentClassifier.js`, `curatorDeterministicChat.js` | Yes — untouched |
| Prompt contract | `curatorSystemPrompt.js` (13 principles, boundary clause) | Yes — untouched |
| Conversation state | `conversationState.js` (rejections, references, recommendations) | Yes — untouched |
| Collection context | `buildCuratorContext.js` (single builder, module gating) | Yes — untouched |
| Engines | `engineRouter.js`, `pairingEngine`, `specializationReview` | Yes — untouched |
| Model call | `invokeCuratorLLM` backend function | Yes — called through a new bounded wrapper |
| Persistence | `persistCuratorMessage` + `CuratorMessage` / `CuratorSession` | Yes — writes reused, reads added |
| Record writes | `collectionItemBulkUpdate`, `collectionItemMerge`, `shared/collectionRecords.ts` | Yes — merge is delegated, allowlist and ownership reused |
| Audit trail | `CollectionActivity`, `CuratorActionRun`, `CuratorActionApplyResult` | Yes — same tables |

### Gaps the audit found

1. The chat never **loaded** its own history: `CuratorMessage` was written but never read, so a reload started cold.
2. `CuratorMessage` / `CuratorSession` had **no RLS** — any signed-in collector could read every other collector's conversation.
3. The model received collection lists but no **explicit grounding** on condition, provenance, storage, valuation coverage, gaps or previous decisions, and no instruction separating a recorded fact from an interpretation.
4. Curator could **describe** a change but not make one: the only write paths were the specialization button and the optimization board. There was no preview, no confirmation, no undo, and no server-side re-validation for an assistant-proposed edit.
5. A model call that hung surfaced as the generic "something went wrong" fallback.

## 2. What was added

| File | Purpose |
| --- | --- |
| `src/lib/curator/curatorInvocation.js` | Bounded model call: timeout, uniform result, honest failure text. |
| `src/lib/curator/curatorGrounding.js` | Record-grounded context block, documentation-gap analysis, history block, report and boundary detection. |
| `src/lib/curator/curatorRecordChanges.js` | Deterministic parser + proposal builder: resolves the record, maps the field per module, computes existing → proposed. |
| `src/lib/curator/curatorRequestRouter.js` | One decision point: undo, boundary refusal, report, proposal, or hand to the model. |
| `src/components/curator/CuratorChangeProposalCard.jsx` | Preview with Confirm / Cancel / Undo. |
| `src/components/curator/useCuratorRecordProposals.js` | Confirm, cancel and reverse; failures are reported as failures. |
| `base44/shared/curatorRecordChanges.ts` | Curator-writable field allowlist per module, patch sanitisation, diff, undo planning. |
| `base44/functions/curatorRecordChange/entry.ts` | Server authority: auth, ownership, allowlist, write, audit, undo. |
| `base44/functions/curatorConversationHistory/entry.ts` | Restores the caller's own recent thread. |
| `src/__tests__/curatorIntelligenceUpgrade.test.js` | 46 regression tests. |

Modified: `ExpertTobacconistChat.jsx` (routing, history restore/persist, proposal rendering, bounded call, grounding in the prompt), `CuratorWorkspace.jsx` (passes the collector's email for storage scoping), `CuratorMessage` / `CuratorSession` schemas (owner-or-admin RLS), `serverAuthorizationGuard.test.js` (new premium functions), `ExpertTobacconistChat.test.jsx` (assertion now targets the model call specifically).

## 3. Behaviour

**Request → preview → confirm → write → audit → undo**

- A change request is parsed deterministically. Nothing is inferred: if the item cannot be resolved to exactly one record, Curator asks which one; if a storage location is not recorded, it says so; if the value already matches, it says there is nothing to change.
- The preview shows the recorded value beside the proposed value. No write happens before Confirm.
- The backend re-reads the record, re-checks ownership (`isAuthorizedForRecord`), re-validates every field against the allowlist, then writes.
- Every write produces a `CollectionActivity` row (record history) and a `CuratorActionRun` + `CuratorActionApplyResult` pair (audit + undo data).
- Undo restores the previous values **only** while the record still matches what was applied; a later edit blocks it rather than being overwritten.

**Writable fields** — documentation and classification only: tags, storage location, specialization (`focus`), condition, notes, blend classification, maker/brand/distillery/producer, year made, acquisition source, original owner, provenance, serial, batch, production date, condition notes. Valuation figures, quantities and lifecycle are deliberately not writable by Curator.

**Boundaries** — a purchase, retailer, price-comparison or restock request is refused with a documentation-only alternative. Curator continues to analyse items the collector already owns.

## 4. Worked examples (real function output)

Scratch record `Curator QA Scratch Pipe` (`6b09e42d97b39aacf199cbae`), created and removed for the test.

**Apply a tag change**

```
POST curatorRecordChange { mode: "apply", entityName: "Pipe",
  ids: ["6b09e42d97b39aacf199cbae"], patch: { tags: ["estate","qa"] } }

200 { mode: "apply", action_run_id: "6b09e4304f75197177637a96",
      applied: [{ before: { tags: [] }, after: { tags: ["estate","qa"] } }],
      skipped: [], denied: [], rejected_fields: [] }
```

**Undo it**

```
POST curatorRecordChange { mode: "undo", action_run_id: "6b09e4304f75197177637a96" }

200 { mode: "undo", action_run_id: "6b09e432cd64e5b0b03061ce",
      undone: [{ restored: { tags: [] }, blocked: [] }], skipped: [] }
```

Record verified afterwards: `tags: []`.

**Second undo of the same run**

```
409 { error: "That change has already been undone" }
```

**A field Curator may not write**

```
POST patch { ai_estimated_value: 5000, condition: "Mint" }

200 { applied: [{ before: { condition: null }, after: { condition: "Mint" } }],
      rejected_fields: ["ai_estimated_value"] }
```

**Unsupported entity / unknown record**

```
400 { error: "Unsupported collection entity: Invoice" }
404 { error: "No matching records" }
```

**Change history written by the three calls above** — `CollectionActivity` rows: 3; `CuratorActionApplyResult` rows: 3; `CuratorActionRun` rows: 3. All removed with the scratch record.

**History restore**

```
POST curatorConversationHistory { limit: 5 }
200 { messages: [ { role: "assistant", content: "For an easy-smoking and smooth blend…" },
                  { role: "user", content: "What about a non aromatic" }, … ], thread_id: "…" }
```

## 5. Test results

`npx vitest run src/__tests__/curatorIntelligenceUpgrade.test.js` → **46 passed / 46**, covering:

- specialization questions (intent, subject resolution, ambiguous reference)
- historical context (prompt block, persistence wiring, scoped restore)
- ambiguous item names (candidate list instead of a guess)
- change parsing per module and per field
- authorized actions (preview, patch, undoability)
- rejected actions (no record match, unknown storage, no-op, module not enabled, unsupported entity, non-writable field, foreign record)
- cancellation (no server call on the cancel path)
- undo (restore, blocked after a later edit, double undo)
- subscription restrictions (module not enabled blocks the change)
- cross-module context and module gating
- missing/inconsistent data analysis
- report requests and grounded report summaries
- product boundaries (purchase/restock refusal)
- timeout handling (hang, error, empty response, reply shapes, timer cleared)
- mobile behaviour (stacking, tap targets, wrapping)

Full suite: `npx vitest run` → **208 files, 3545 tests passed**. `npx vite build` → clean.

## 6. Deferred (not built in this pass)

- **Applying an approved bulk edit from chat** is supported by the same function (`ids[]`), but the chat only proposes it for an explicit "all" phrasing; the selection-driven bulk editor remains in Collection Tools.
- **Curator-originated appraisals** stay in the Valuation Center ledger; the assistant reads valuation coverage but does not write figures.
- **Streaming responses** are not used; the call is bounded and returns whole.
