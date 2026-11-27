# Sharing, Community Documentation and Membership Gifting

Status: implemented and verified against live functions on 2026-11-27.

## 1. Audit — what existed

| Area | Existing | Finding |
| --- | --- | --- |
| Share storage | `SharedRecord` entity | **No RLS at all.** Any visitor, including anonymous, could list every share with `owner_email`, `record_id` and `share_token`. |
| Public view | `PublicSharedRecord.jsx` | Read the share by token **in the browser**, then read the **entire record** (`base44.entities.Pipe.get(...)`) and hid fields client-side. Acquisition costs, provenance, notes and private document references were delivered to anyone with the link. |
| Field control | 4 booleans (`photos`, `notes`, `value`, `inventory`) | No per-field choice, no preview, no collection-level share. |
| Lifecycle | `is_active` | No expiry, no revocation timestamp, no view count. |
| Club | `PipeClubSession`, wizard, history, pairing | Club session flow only; no way to present a collection to the club. |
| Gifting | Referral earned access, admin grant, Stripe subscriptions | No gift codes, no redemption, no audit. |

## 2. What was built

**Server-side projection (the core fix).** `base44/shared/shareProjection.ts` holds the only catalogue of shareable fields — per module — and a `NEVER_SHARED` set. `base44/functions/publicShare` loads the record with service role, drops any record the share owner did not create, projects through the catalogue and returns the result. The browser never receives an unprojected record.

`SharedRecord` now has owner-or-admin RLS on all four operations, plus `share_kind`, `record_ids`, `visible_fields`, `expires_at`, `revoked_at`, `view_count`.

**Share centre** (`/ShareCenter`): create a link for one item, a selected set, or a showcase presentation; choose fields, photographs, notes, rating, value; set an expiry; preview exactly what a recipient sees; copy the link; revoke it. Shares are private by default — an account with no shares exposes nothing.

**Recipient view** (`/share/:module/:token`): renders through `CollectionShareView`, which prints cleanly, shows the generation date and the disclosure that costs, provenance, notes and documents are excluded.

**Pipe Club**: the club home now offers "Present your collection", which opens the same share builder. One share service serves every module, so CigarKeeper, WhiskeyKeeper and WineKeeper get showcases without new architecture.

**Gifting**: `GiftCode` entity + `giftCodes` function. Administrators issue a code (1–24 months, optional module restriction, expiry, recipient note), list codes, and revoke unredeemed ones. A collector redeems it once; redemption writes a **non-revenue** earned-access grant (`access_source: "gift"`, `is_revenue: false`) to the same table the referral system uses, then invokes the canonical entitlement reconciler.

## 3. Live verification

Scratch records were created, exercised and then deleted (0 remaining of each).

**Share privacy** — a pipe holding `purchase_price: 1234`, `purchase_source`, `original_owner`, `provenance_notes`, private `notes`, one `documents` entry and `estimated_value: 999`, shared with photos on and notes/value off:

```
POST publicShare { token } → 200, count: 1
fields returned: name, maker, shape, bend, sizeClass, condition
photos: 1        notes: absent      purchase_price: absent
documents: absent  provenance_notes: absent  estimated_value: absent
```

**Link lifecycle**

```
POST publicShare { expired token } → 410 { error: "expired" }
POST publicShare { revoked token } → 410 { error: "revoked" }
POST publicShare { unknown token } → 404 { error: "not_found" }
POST publicShare { token, preview: true } (owner) → 200, preview: true, view_count unchanged
```

**Ownership guard** — before the share owner matched the record creator the payload was `count: 0`; the record never leaked. After aligning the owner it returned exactly one item.

**Gifting**

```
POST giftCodes { issue, months: 1, modules: ["pipekeeper"] }
 → 200 { code: "CK-WD8X-2UD7", expires_at: 2027-11-27 }

POST giftCodes { redeem, code: "ck-wd8x-2ud7", module: "pipekeeper" }
 → 200 { module: "pipekeeper", months: 1, start: 2026-11-27, end: 2026-12-27,
         grant_id: 6b09e821…, entitlement_reconciled: true }

POST giftCodes { redeem, code: "CK-WD8X-2UD7" } (second time)
 → 409 { error: "already_redeemed" }

POST giftCodes { redeem, code: "CK-NOPE-NOPE" }
 → 404 { error: "invalid_code" }
```

Regression suite: `npx vitest run src/__tests__/sharingAndGifting.test.js` — 40 assertions covering link lifecycle, owner-scoped RLS, the never-shared list for every private field, server-only reads, ownership filtering, preview authorisation, single-use redemption, expiry, revocation, non-revenue granting, and the absence of any payment call in the gift path.

## 4. Security matrix

| Attack | Result |
| --- | --- |
| Open a revoked link | 410, no data |
| Open an expired link | 410, no data |
| Guess a token | 404; tokens are 36 hex characters from `crypto.getRandomValues` |
| List someone's shares anonymously | Denied by RLS |
| Read the full record from the share page | Impossible — the page holds no entity client |
| Share a record you did not create | Record filtered out server-side (`count: 0`) |
| Redeem a gift twice | 409 on the second attempt |
| Redeem an expired or revoked gift | 409, no grant |
| Issue or revoke a gift as a non-admin | 403 |
| See another account's gift codes | Admin-only RLS |

## 5. Payment and platform limitations (documented, not worked around)

- **Self-serve gift purchase is not enabled.** There is no gift price configured in the existing Stripe catalogue, and the app ships to iOS where in-app gifting of digital access is not permitted. Creating a parallel checkout would bypass the subscription system the app already reconciles, so gifting is issued by an administrator and redeemed into the existing entitlement pipeline.
- **A redeemed gift is non-revenue.** It is written to the earned-access table with `is_revenue: false`, so billing reports never count it as a subscription.
- **Gifts grant module access only.** No tobacco, alcohol, or physical product can be represented by a code.
- **Apple App Store requirements are untouched** — the gift path makes no store or payment call.

## 6. Deferred

- Email delivery of a gift code (the code is displayed to the administrator to pass on).
- Per-recipient share analytics beyond the view counter.
- Member-to-member showcase replies inside Pipe Club; the presentation itself is implemented.
