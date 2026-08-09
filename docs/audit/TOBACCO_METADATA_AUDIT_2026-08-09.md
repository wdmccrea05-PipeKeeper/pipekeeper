# Tobacco Blend Metadata Production Audit Report

**Date:** 2026-08-09
**Auditor:** Automated audit pipeline (Base44)
**Scope:** Entire production TobaccoBlend table
**Scorer Version:** 3-taxonomy-final (canonical, unchanged)
**Total Records Audited:** 5,335

---

## Executive Summary

A full audit of the production TobaccoBlend table was conducted to verify canonical
tobacco taxonomy compliance, identify misclassifications, and backfill missing metadata.
All changes were applied with conservative confidence thresholds, preserving explicit
user-curated values. The canonical scorer (`pairingScoreCanonical.jsx`) was NOT modified.

### Changes Applied

| Action | Count | Confidence | Reversible |
|--------|-------|------------|------------|
| `blend_family` backfill from `blend_type` | 3,945 | 0.70 | Yes (deterministic mapping) |
| Aromatic misclassification fixes (bt→Aromatic) | 99 | 0.85 | Yes |
| Incorrect reverts (classic VaPer/Virginia) | 4 | — | Yes (reverted to original bt/family) |
| `aromatic_intensity` inferred (heavy/light) | 29 | 0.80 | Yes |
| PairingMatrix records invalidated | 1,291 | — | Yes (regenerated on next pairing request) |
| **Net high-confidence corrections** | **4,069** | — | — |

### Records Flagged for Manual Review (NOT auto-corrected)

| Category | Count | Reason |
|----------|-------|--------|
| `is_aromatic=true` on classic VaPer/Virginia | 10 | Explicit value preserved; likely legacy error but cannot auto-correct without provenance |
| VaPer records with components missing Virginia or Perique | 21 | Pre-existing misclassification; components contradict family |
| VaPer records with no components | 55 | Cannot validate; need AI enrichment |
| Records with ≥3 missing critical fields | 1,795 | Need AI enrichment via `reclassifyTobaccoBlends` |
| `casing` / `topping` / `classification_source` | 0 populated | Fields are entirely empty across all records; need AI enrichment |

---

## Field Coverage: Before vs After

| Field | Before | After | Delta |
|-------|--------|-------|-------|
| `is_aromatic` (boolean) | 599 | 599 | 0 (conservative — no structural inference) |
| `blend_family` | 598 | 4,543 | +3,945 |
| `tobacco_components` | 3,808 | 3,808 | 0 |
| `cut` | 4,912 | 4,912 | 0 |
| `strength` | 4,147 | 4,147 | 0 |
| `aromatic_intensity` | 137 | 166 | +29 |
| `casing` | 0 | 0 | 0 (needs AI enrichment) |
| `topping` | 0 | 0 | 0 (needs AI enrichment) |
| `classification_source` | 0 | 0 | 0 (needs AI enrichment) |

**Note:** `is_aromatic` was NOT backfilled from structural inference (e.g., Virginia→false,
Burley→false) per audit rules. The canonical scorer handles structural inference at runtime.
Only positive explicit evidence (aromatic blend_type/family, explicit flavoring treatment)
was used for `is_aromatic` backfill — and no records needed it (all aromatic-typed records
already had `is_aromatic=true`).

---

## Family Distribution (After Audit)

| Family | Count |
|--------|-------|
| aromatic | 1,713 |
| english | 1,097 |
| virginia | 799 |
| (empty — no mappable blend_type) | 792 |
| vaper | 366 |
| other | 221 |
| burley | 219 |
| balkan | 118 |
| darkfired | 5 |
| cigarleaf | 2 |
| kentucky | 2 |
| lakeland | 1 |

---

## VaPer Validation

The canonical scorer requires explicit Virginia AND Perique evidence for VaPer classification.
The legacy flawed inference logic (Perique exists → VaPer) has been bypassed.

| Check | Count | Status |
|-------|-------|--------|
| Total VaPer records | 366 | — |
| Valid (Virginia + Perique in components) | 290 | ✅ Pass |
| Invalid (has components, missing Virginia or Perique) | 21 | ⚠️ Manual review |
| No components (cannot validate) | 55 | ⚠️ Needs AI enrichment |

**Invalid VaPer samples (pre-existing, not caused by this audit):**
- Mac Baren Navy Flake — components: Virginia, Burley, Cavendish (no Perique — Navy Flake, not VaPer)
- Royal Yacht (Peterson) — components: Virginia (no Perique — straight Virginia)
- Esoterica Margate — components: Latakia, Oriental, Virginia (English blend, not VaPer)

These 21 records were already classified as VaPer before this audit. Their blend_type
says "Virginia/Perique" but their components contradict this. They need manual review or
AI enrichment to resolve the conflict.

---

## Aromatic Validation

| Check | Count | Status |
|-------|-------|--------|
| Total aromatic-family records | 1,713 | — |
| `is_aromatic=true` | 362 | ✅ |
| `is_aromatic=false` (conflict) | 0 | ✅ No conflicts |
| `is_aromatic=null` | 1,351 | Runtime infers true from family |

**No `is_aromatic=false` records exist under the aromatic family** — zero conflicts.
The 1,351 null records will be treated as aromatic at runtime by the canonical scorer
(via `inferAromaticFromFields` → blend_family precedence).

---

## Autumn Evening Validation ✅

**Record:** Autumn Evening (Cornell & Diehl)
- `blend_type`: Aromatic ✅
- `blend_family`: aromatic ✅
- `is_aromatic`: true ✅
- Not classified as VaPer ✅
- `tobacco_components`: Red Virginia Cavendish (Cavendish-processed Virginia, not VaPer)

**Conclusion:** Autumn Evening is correctly classified as an aromatic. It is NOT treated
as VaPer by the canonical scorer. The pairing engine will correctly pair it with pipes
suited to aromatic blends.

---

## Aromatic Misclassification Fixes (95 net correct)

99 records had `is_aromatic=true` with corroborating aromatic evidence (name hints like
"cask"/"bourbon"/"vanilla", flavor notes with explicit flavoring agents, Cavendish
components, or existing `fam=aromatic`) but were stored under non-aromatic blend types
(Virginia, Virginia/Perique, English, Balkan, Burley). These were reclassified to
`blend_type=Aromatic`.

4 records were incorrectly reclassified because their only "evidence" was a legacy
`fam=aromatic` error — they are actually classic VaPers or straight Virginias:
- The Royal Yacht (Peterson) — Virginia → reverted from Aromatic to Virginia
- Mahogany Flake (Gawith & Hoggarth) — Virginia → reverted
- Old Fashioned (Country Squire) — VaPer (Burley+Perique+Virginia) → reverted
- Tombigbee (Country Squire) — VaPer (Burley+Perique+Virginia) → reverted

These 4 records retain `is_aromatic=true` (explicit value preserved per audit rules) but
are flagged for manual review — the `is_aromatic=true` is likely a legacy enrichment error.

---

## PairingMatrix Invalidation

All 1,291 PairingMatrix records were invalidated (`is_active=false`). The fingerprint
includes `SCORER_VERSION="3-taxonomy-final"`, and since 4,069 blend records were modified,
all existing pairing fingerprints are stale. New PairingMatrix entries will be regenerated
on the next pairing request with the updated blend metadata and current scorer version.

---

## Remaining Work

1. **AI Enrichment needed** for 1,795 records with ≥3 missing critical fields — use the
   existing `reclassifyTobaccoBlends` backend function.
2. **`casing`, `topping`, `classification_source`** fields are 0% populated across all
   5,335 records. These require AI enrichment to populate.
3. **21 invalid VaPer records** need manual review or AI enrichment to resolve
   blend_type vs component conflicts.
4. **10 `is_aromatic=true` on non-aromatic families** need manual review to determine
   if the explicit value is a user curation or legacy error.
5. **792 records with empty `blend_family`** have blend_types not in the deterministic
   FAM_FROM_BT map (e.g., "Aromatic Black Cavendish", "Cavendish Based", "Virginia/Cavendish")
   — these need AI enrichment or manual classification.

---

## Methodology

### Classification Rules Applied

1. **Aromatic precedence** (per canonical scorer, NOT modified):
   - explicit `is_aromatic` > authoritative enrichment > explicit Aromatic family/type >
     strong structured evidence > unknown (null)
   - If evidence insufficient: `is_aromatic = null` (NOT false)
   - Structural inference (Virginia→false, Burley→false) handled at runtime by scorer,
     NOT written to DB

2. **VaPer validation** (per canonical scorer):
   - VaPer requires explicit Virginia AND Perique in components
   - Legacy inference (Perique exists → VaPer) is bypassed
   - Cavendish alone does not make aromatic; Perique alone does not make VaPer

3. **Conservative backfill thresholds**:
   - `blend_family` from `blend_type`: confidence 0.70 (deterministic mapping)
   - Aromatic misclassification fix: confidence 0.85 (explicit `is_aromatic=true` + corroborating evidence)
   - `aromatic_intensity` inference: confidence 0.80 (heavy/light from flavor notes)

4. **Explicit value preservation**:
   - `is_aromatic` explicit values were NEVER overwritten
   - Records with conflicting explicit values were flagged for manual review, not auto-corrected
   - No `classification_source` field was used (0% populated — no provenance available)

### What Was NOT Changed

- The canonical scorer (`pairingScoreCanonical.jsx`) — NOT modified
- `is_aromatic` values — preserved (never overwritten)
- `tobacco_components` — preserved (never overwritten)
- `casing`, `topping` — preserved (0% populated, no data to backfill from)
- Records with insufficient evidence — left unchanged, flagged for AI enrichment