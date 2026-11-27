# Universal Action and Acceptance Framework — implementation evidence

Date: 2026-11-27 · Collection Intelligence 2.0 · supersedes the separate Curator
acceptance path, the duplicate-merge path and the bulk-edit path

## 1. Principle

CollectionKeeper no longer presents a finding and then sends the collector
somewhere else to act on it. Any authorized action that originates in a
recommendation, a report, a dashboard metric or a module panel can be completed
from that same surface, through one framework:

**Identify → Present options → Select → Review → Accept → Execute → Verify → Confirm → Undo (where supported)**

There is exactly one place in the application where an action becomes a database
write: the `actionExecute` backend function. Every feature calls it with the same
action shape and reads back the same result shape.

## 2. The single write path

```
feature (Curator / hub / module / report / tools)
        │  createAction()            src/lib/actions/actionModel.js
        ▼
   ActionCard → ActionReviewDialog   src/components/actions/*
        │  executeActions()          src/lib/actions/actionClient.js
        ▼
   actionExecute (server)            base44/functions/actionExecute/entry.ts
        │  registry → entitlement → idempotency → ownership
        │  → staleness → allowlist → write → read back → audit → undo snapshot
        ▼
   ActionExecution (audit) + CollectionActivity (record history)
        ▼
   ActionResultSummary + refresh of records, dashboards and reports
```

Nothing in the client can author a mutation. `actionClient.js` contains no
`.create`, `.update` or `.delete` call at all — a test asserts this.

## 3. Registered action types (the authorized catalogue)

`base44/shared/actionRegistry.ts` is the authority; `src/lib/actions/actionRegistry.js`
mirrors it for display and a test asserts the two never drift.

| Type | Confirmation | Undo | High impact | Handler | Field scope |
|---|---|---|---|---|---|
| `record_update` | review | yes | no | patch | every field the documentation layer may write |
| `storage_assign` | review | yes | no | patch | `storage_location_id`, `humidor_id` |
| `lifecycle_change` | explicit | yes | yes (destructive) | patch | `lifecycle_status`, `lifecycle_note` |
| `record_merge` | explicit | no | yes (destructive) | merge | survivor + duplicates, union of arrays |
| `valuation_record` | explicit | yes | yes (financial) | valuation | appends a `ValuationRecord` |

Field scopes are intersected with `curatorWritableFields()`, so the registry can
only narrow what the shared documentation layer already permits. An action type
that is not in this table is refused by the server, which is what stops AI output
or a tampered client from inventing a new kind of mutation.

## 4. The action object

Every field the framework needs is carried on the action built by `createAction()`:

| Required field | Where it lives |
|---|---|
| Unique action identifier | `action.id` (also `ActionExecution.action_ref`) |
| Action type | `action.type` (registered id) |
| Originating feature | `action.origin` (`curator`, `collection_tools`, `duplicates`, `reports`, `hub`, `module`) |
| Applicable module | `action.module` |
| Target record identifiers | `action.targets[].recordId` (+ `entity`, `role`) |
| Concise title / short description | `action.title`, `action.description` |
| Detailed rationale | `action.rationale` (behind “Why this is suggested”) |
| Current / proposed values | `action.currentValues`, `action.proposedValues` (and per-target `expected` / `patch`) |
| Supporting evidence | `action.evidence[]` |
| Confidence / uncertainty | `action.confidence` |
| Available alternatives | `action.alternatives[]` (radio when more than one) |
| Dependencies | `action.dependsOn[]` → server-ordered |
| Required user input | `action.requiredInput`, `action.input` (e.g. valuation amount) |
| Required confirmation level | derived from the registry, never from the caller |
| Authorization requirements | ownership + module entitlement, re-checked server-side |
| Execution status / result | per-action `status`, per-target `results[]` |
| Audit history | `ActionExecution` row + `CollectionActivity` entry |
| Undo eligibility | registry `undo`, reported per run |

## 5. Selection semantics

- Independent actions use **checkboxes**; mutually exclusive ones use **radio**
  (either a `selectionGroup` across actions, or `alternatives` within one action).
- Destructive, financially consequential and privacy-sensitive actions are **never
  preselected** — `defaultSelected` is false for merge, lifecycle and valuation.
- Supported per action: individual acceptance, selective acceptance, bulk
  acceptance (“Accept N selected”), custom alternatives, deferral (“Not now”),
  rejection (“Dismiss”), “Why this is suggested” and links to the records.

## 6. Confirmation matrix

| Level | Used for | Behaviour |
|---|---|---|
| immediate | read-only actions and navigation | runs at once; no dialog |
| review | material record changes | concise preview in the shared review dialog, one press to accept |
| explicit | destructive, merge, lifecycle, financial | preview **plus** a deliberate acknowledgement; the apply button stays disabled until it is ticked |

Routine navigation and read-only work never open a confirmation dialog.

## 7. Execution guarantees (and where each is enforced)

| Guarantee | Enforcement |
|---|---|
| Authentication | `base44.auth.me()` at the top of `actionExecute`; 401 otherwise |
| Subscription entitlement | `resolveCuratorAccess()` when any action originates in Curator; module actions stay ownership-gated exactly as before |
| Record ownership | `isAuthorizedForRecord()` per target, before any write |
| Current state validated | client sends `expected`; a mismatch returns `record_changed_since_proposal` and writes nothing |
| Duplicate execution prevented | `idempotency_key` + `action_ref`; a replay returns the stored run with `duplicate_prevented: true` |
| Only registered types | `getActionDefinition()`; unknown type refused |
| Field allowlist | `resolveActionFields()` ∩ `sanitiseCuratorPatch()`; unsupported fields are reported, never applied |
| Verified persistence | every write is read back; a mismatch is reported as `verification_failed`, not as success |
| Audit | `ActionExecution` (run, targets, before/after, status) + `CollectionActivity` (record history) |
| Partial failures | per-target `completed / failed / skipped`; the run is reported `partial`, never rounded up |
| Independent actions not blocked | each target is processed on its own; one failure does not stop the others |
| Dependencies ordered | `depends_on`; a dependent whose prerequisite did not complete is `blocked` |
| Undo | `planUndo()` restores only while the record still holds what the run wrote; a later edit blocks the reversal and says so |

## 8. Integration status

Wired to the framework now:

- **Curator** — proposals become framework actions (`record_update`,
  `storage_assign`, `record_merge`); its own writer is no longer called, and undo
  goes through the framework. `src/components/curator/useCuratorRecordProposals.js`
- **Collection health / duplicate detection** — merge is now previewed in the
  shared dialog and executed by the framework. Previously it wrote immediately on
  a single click. `src/components/collection/DuplicateReviewPanel.jsx`
- **Inventory reconciliation / bulk documentation** — bulk edits are one
  `record_update` (or `storage_assign`) action across the selection, reported per
  record. `src/pages/CollectionTools.jsx`

Available through the shared components and not yet migrated (each is a
one-component change, no new server work): CollectionKeeper hub recommendations,
report findings, valuation entry, storage management panels, sharing revoke and
administrative workflows. They keep their current behaviour until migrated —
none of them gained a second write path.

## 9. Verified evidence (live run, production data)

A temporary pipe was created, driven through the framework, then removed:

| Step | Result |
|---|---|
| Apply `condition: Fair → Good` | `status: completed`, `before {condition: Fair}`, `after {condition: Good}`, `execution_id` returned |
| Replay with the same idempotency key | `duplicate_prevented: true`, no second write |
| Apply with a stale `expected` (`Mint`) | `status: failed`, `reason: record_changed_since_proposal`, record untouched |
| Undo the first run | `status: undone`, `restored: [condition]` |
| Re-read the record | `condition: Fair` — the original value was restored |
| Audit rows | one `failed`, one `undone` (`undone_at` set) |
| Cleanup | temp record deleted, audit rows deleted, `count: 0` remaining |

Automated: **215 test files, 3,681 tests passing**; the framework adds 25
(`src/__tests__/universalActionFramework.test.js`) covering registry parity,
preselection rules, radio/checkbox selection, alternative application, payload
composition, dependency carrying, partial-failure accounting, idempotent replay
accounting, server-side authority, and the three migrated features. Build clean.

## 10. Boundaries preserved

- No arbitrary code execution: no `eval`, no dynamic action handlers; the server
  dispatches on three fixed handler names.
- No unrestricted entity mutation: writes are confined to the five collection
  entities, through the documentation allowlist.
- No promotion of tobacco, alcohol or any physical product; actions carry
  documentation, storage, lifecycle and valuation only.
- Simplicity: technical detail (rationale, evidence, confidence, per-record
  reasons) is behind disclosure; the default card is a title, the change and one
  action.
