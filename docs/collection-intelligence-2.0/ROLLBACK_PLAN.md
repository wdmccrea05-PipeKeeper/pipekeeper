# CollectionKeeper — Rollback Plan (Collection Intelligence 2.0)

Rollback is code-and-schema only. **No rollback step deletes collection records.**

## 1. Identify the release

Every publish is a distinct version of the app's code and entity schemas. Before publishing, note the version currently live; that is the restore point.

## 2. Roll back the application code

- Restore the previous published version from the app's version history (or re-publish the previous commit).
- This reverts pages, components, backend functions and workflows together, so a partial UI rollback cannot leave the frontend calling a function that no longer exists.

## 3. Roll back an entity schema change

Schemas added during CI 2.0 are additive and optional. If a schema change must be reverted:

1. Restore the previous schema for that one entity.
2. Do **not** delete the entity — deleting a schema makes its records unreachable.
3. Fields that no longer exist in the schema remain on the records and are ignored; re-adding the field restores them.

## 4. Roll back a row-level security change (highest-risk step)

An over-tight rule can hide a collector's own records. To recover:

1. Restore the previous schema for that entity (which removes or relaxes the rule).
2. Confirm the owner can see their collection again before restoring any other entity.
3. Apply RLS one entity at a time, and after each one verify both an owner account and a second account before continuing.

Never "fix" an RLS problem by deleting records.

## 5. Roll back the share/gifting endpoints

`publicShare` and `giftCodes` are read-only with respect to collection records: a share only exposes a projection, and a gift only creates an access grant. To withdraw all sharing immediately, deactivate existing shares (set `is_active` false or revoke), which takes effect without a deploy. No collection data is affected.

## 6. Roll back the valuation ledger

`ValuationRecord` is append-only. A wrong entry is superseded by a correction entry, never edited or deleted, so the history of what was believed and when is preserved. Reverting the Valuation Center UI leaves the ledger intact and readable.

## 7. Data safety rules for any rollback

- Never run a bulk delete against a collection entity to "reset" a release.
- Never overwrite `created_by` or `created_by_id`; ownership drives access.
- Before any schema restore, export the affected entity to CSV from Collection Tools so the pre-change state is preserved.
- Log the rollback: entity, rule, time, who performed it, and the verification performed afterwards.

## 8. Verification after rollback

1. Sign in as the collector and open each enabled module's collection list.
2. Open one record detail in each module and confirm photographs, documents and history render.
3. Run one report and one export.
4. Open one share link and confirm it shows only the shared fields.
5. Run the full test suite and a production build before re-publishing.
