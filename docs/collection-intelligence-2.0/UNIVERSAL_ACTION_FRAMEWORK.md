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
- Reviewing an action **is** accepting it: the review dialog forces the reviewed
  actions into the request, so a high-impact card that starts unselected still
  runs the action the collector just confirmed (this was a silent no-op before
  the 2026-11-27 audit).
- A value the collector types themselves (`action.customValue`) is applied **last**
  in `effectiveTargets()`, so it always wins over the option displayed beside it.
  Choosing an option after typing can no longer overwrite the typed value.

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
| A replay is never a new success | the executor answers a repeated key with the stored run (`duplicate_prevented`); the client counts it as a duplicate and reports `skipped`, never `completed` |
| A second press cannot submit twice | `useActionExecution` returns the in-flight request instead of starting another |
| A dropped connection | one retry with the **same** idempotency key; if the result still cannot be confirmed the outcome is reported as unknown and the data is reloaded — never as success |
| A refusal explains itself | the server's own sentence reaches the collector (entitlement, permission, already reversed), not an HTTP status |
| Dashboards and reports recalculate | every outcome invalidates the cached queries and re-reads the records from the server |
| Dependencies blocked are visible | a dependent action is reported `blocked` with `prerequisite_failed`, and the run is not counted as “nothing changed” |

## 8. Integration status

Every surface that proposes a change to a record now goes through the framework:

| Surface | Action origin | Entry point |
|---|---|---|
| Curator conversation | `curator` | `CuratorActionSet` → `useCuratorRecordProposals` |
| Collection health (findings list) | `collection_health` | `FindingsReviewPanel` → `useActionExecution` |
| Dashboard (hub) → health drill-down | `collection_health` | `CollectionHealthRow` → `/CollectionHealth` |
| Reporting Center | `collection_health` | `FindingsReviewPanel` below the report results |
| Collection tools — bulk documentation | `collection_tools` | reviewed `record_update` / `storage_assign` across the selection |
| Collection tools — duplicates | `duplicates` | `DuplicateReviewPanel` reviewed `record_merge` |

Each of these shares one hook, one dialog, one result summary and one executor.
No surface keeps its own busy flag, its own result shape or its own writer.

**Deliberately outside the framework:** a collector typing into a record's own
editor (Pipe form, blend form, bottle form, wine form, cigar form) saves that
form directly. That is the collector editing their own documentation, not the
application proposing an action, and it keeps the direct-edit path as fast as it
was. The framework governs actions the app suggests, accepts and reports.

## 9. Verified evidence

### 9.1 Live run, production data (re-run 2026-11-27 after the audit fixes)

A temporary pipe was created, driven through the framework, then removed. The
probe ran against the deployed `actionExecute`, as a signed-in collector, and
re-read the record after every step:

| Step | Result |
|---|---|
| Accept `condition: Fair → Good` | `status: completed`, `changed_fields: [condition]` |
| Re-read the record | `condition: Good` — persisted, not merely reported |
| Replay the same action with the same idempotency key | `duplicate_prevented: true`, **1 stored result row returned** |
| Proposal with a stale `expected` (`Mint`) | `status: failed`, `reason: record_changed_since_proposal`, record still `Good` |
| Undo the first run | `status: undone`, 1 record reversed |
| Re-read the record | `condition: Fair` — the original value was restored |
| Undo the same run again | `409` — refused, "already reversed" |
| Cleanup | 2 audit rows removed, `Pipe.count: 0`, `CollectionActivity.count: 0` |

The replay step is what proved a defect: the executor returns the **stored**
results of the earlier run, and the old client counted those rows as fresh
completions. `summarizeExecution()` now drops duplicate-prevented rows, so a
repeat submission reports “Already applied earlier — not repeated” instead of a
second success. That fix is covered by scenario 19 below.

Automated: **218 test files, 3,758 tests passing**; the framework accounts for
61 of them — `universalActionFramework.test.js` (25: registry parity,
preselection, radio/checkbox, alternatives, payload composition, dependencies,
partial failure, idempotent replay, server authority, migrated features) and
`actionAcceptanceScenarios.test.js` (36: the twenty-five release scenarios below,
conversational references, and the one-write-path and mobile/desktop checks).
Build clean.

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

## 11. Release scenario matrix (prompts 17–19)

`A` = asserted as behaviour in `src/__tests__/actionAcceptanceScenarios.test.js`.
`S` = asserted against the source that governs it (executor check, hook rule,
surface wiring) because it needs a signed-in session or a rendered tree.
`L` = confirmed live against the deployed function (section 9.1).

| # | Scenario | Enforced by | Verified |
|---|---|---|---|
| 1 | One valid recommendation | `buildActionsFromProposals` → one action, preselected | A |
| 2 | Mutually exclusive alternatives | `alternatives[]`, radio, one preselected | A |
| 3 | Independent actions | separate actions, checkboxes, one request | A |
| 4 | Accept the recommended option | `effectiveTargets` with the default option | A |
| 5 | Choose a different option | chosen `alternativeId` reaches the payload | A |
| 6 | Supply a custom alternative | `customValue` applied last, wins over the option | A |
| 7 | Accept selected actions | payload contains only accepted actions | A |
| 8 | Reject or defer | deferred/dismissed actions never leave the client | A |
| 9 | Ask for an explanation | `resolveActionReference` → explain, states nothing changed | A |
| 10 | Apply from the Curator conversation | `CuratorActionSet` → `useCuratorRecordProposals` → executor | S |
| 11 | Resolve a finding from a report | `FindingsReviewPanel` forces every reviewed action | A + S |
| 12 | Resolve a finding from a drill-down | hub row → `/CollectionHealth` → same panel | S |
| 13 | Bulk inventory changes | one reviewed action across the selection | A + S |
| 14 | Review and merge duplicates | `record_merge` preview + explicit acknowledgement + `selections` forced | A + S |
| 15 | Reverse an eligible action | `planUndo`, owner-scoped run, `undo_eligible` | A + L |
| 16 | Proposal goes stale | `expected` compared per target → `record_changed_since_proposal` | A + L |
| 17 | Another session edits the target | same comparison; nothing written | A + L |
| 18 | Unauthorized collector | `isAuthorizedForRecord` on every write path (5 call sites) | A |
| 19 | Submitted twice | idempotency key + `duplicate_prevented` not counted as success | A + L |
| 20 | Bulk operation partially fails | per-target results, run reported `partial` | A |
| 21 | A dependency fails | `depends_on` → `blocked` + `prerequisite_failed` | A |
| 22 | Required field missing | `no_supported_fields`, `invalid_amount` explained | A |
| 23 | Network interruption | one retry with the same key, then an honest "unknown" + reload | S |
| 24 | Entitlement restriction | `resolveCuratorAccess` before any write | A |
| 25 | Dashboards and reports refresh | `invalidateQueries()` on every outcome | A + S |

Material actions are always previewed: every surface that can write imports
`ActionReviewDialog` (asserted for all five). Read-only actions — opening a
record, showing an explanation, listing affected records, deferring, dismissing —
never open a dialog and never contact the executor.

### Defects found and fixed by this audit

| Defect | Impact | Fix |
|---|---|---|
| Accepting a high-impact action from its own review sent an empty request | merge and lifecycle changes silently did nothing | `ActionList` forces reviewed actions into the selection |
| `DuplicateReviewPanel` executed the merge without selecting it | merge never ran, and the dialog closed as if it had | explicit `selections`, and the shared hook instead of a private copy |
| A typed custom value was overwritten by the option beside it | the collector’s own value was silently discarded | `customValue` on the action, applied last in `effectiveTargets` |
| A replay’s stored rows were counted as fresh completions | a repeat submission reported a success that did not happen | duplicate-prevented rows are skipped in `summarizeExecution` |
| No retry after a dropped connection; failures never refreshed | an applied change could be shown as failed and stay invisible | retry once with the same key, then report unknown and reload |
| Bulk edit wrote on one press, with no preview | material change without the shared acceptance step | reviewed action, shared dialog, per-record result, undo |
| Refusals surfaced as "Request failed with status code 403" | the collector could not tell why | the server’s own sentence is surfaced |
