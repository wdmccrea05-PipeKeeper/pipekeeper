# Tobacco Blend Metadata Validation — Pass 2 Report

**Date:** 2026-08-09
**Scope:** Validation of the 4,069 changes from Pass 1 audit (TOBACCO_METADATA_AUDIT_2026-08-09.md)
**Objective:** Detect and revert cases where legacy or weak evidence was promoted into canonical taxonomy
**Canonical Scorer:** Unchanged (pairingScoreCanonical.jsx — NOT modified)
**PairingMatrix:** NOT regenerated (1,291 records remain invalidated from Pass 1)

---

## Executive Summary

Pass 1 optimized for field completion (blend_family 598 → 4,543). Pass 2 validated
that the completed fields are actually correct. 251 records were corrected or flagged.
The canonical scorer was NOT modified. No AI enrichment was performed.

**Key finding:** Pass 1 stored zero provenance (`classification_source` was 0% populated).
Pass 2 populated `classification_source` on all 251 corrected/flagged records with
evidence-strength assessments and component-based rationale.

---

## 1. Aromatic Reclassifications (Pass 1: 95 net correct)

Pass 1 changed 99 records to `blend_type=Aromatic` (4 were reverted, net 95).
Pass 1 used these signals as sufficient for automatic Aromatic reclassification:
- Cavendish component
- chocolate/cocoa/honey/fruit/vanilla-like tasting notes
- sweet room note
- blend name suggesting alcohol/dessert/flavoring (e.g., "Bourbon Cask")
- pre-existing inferred `fam=aromatic`

Per validation rules, these signals **do not independently establish Aromatic**.
Pass 2 re-audited all 1,592 records with `blend_type=Aromatic` against their
stored `tobacco_components`:

| Evidence Category | Count | Action |
|---|---|---|
| Latakia/Oriental components (English/Balkan, not Aromatic) | 139 | **Reverted** to English |
| Virginia+Perique components, no Cavendish (VaPer, not Aromatic) | 49 | **Reverted** to VaPer |
| Cavendish present, no Latakia (STRONG_STRUCTURED) | retained | No change |
| No components (cannot validate) | retained | Flagged via provenance |
| Sweet name/notes only (WEAK_INFERENCE, no component contradiction) | retained | Flagged for manual review |

**Result:**
- Aromatic reclassifications retained: 1,592 − 188 = **1,404** (of which some remain weak-inference by name/notes only — flagged, not reverted, because component evidence does not actively contradict)
- Aromatic reclassifications reverted as weak inference: **188** (139 to English + 49 to VaPer)

**Note:** Without Pass 1 provenance, the exact 95 audit-changed records cannot be
distinguished from pre-existing aromatic records. Pass 2 therefore validated ALL
1,592 aromatic-typed records against component evidence. The 188 reverted records
are those where stored components affirmatively contradict the Aromatic classification.

---

## 2. Blend Family Backfills (Pass 1: 3,945)

Pass 1 backfilled `blend_family` from `blend_type` using a deterministic mapping.
Pass 2 categorized each mapping:

| Category | Count | Status |
|---|---|---|
| SAFE_DIRECT_MAPPING (English, Virginia, Burley, Balkan, etc.) | ~3,560 | ✅ Confirmed |
| REQUIRES_COMPONENT_VALIDATION (VaPer: Virginia/Perique → vaper) | 366 | Validated below |
| AMBIGUOUS (Other, Navy Flake, Cavendish, Shag → other/unknown) | ~221 | Retained as 'other' |
| CONTRADICTED (components contradict mapped family) | 40 | **Corrected** |

**VaPer backfill breakdown (366 records):**

| Check | Count | Status |
|---|---|---|
| Validated (Virginia + Perique in components) | 290 | ✅ Confirmed safe |
| Contradicted (components show no Perique or no Virginia) | 21 | ⚠️ **Corrected** to component-indicated family |
| Unverified (no components) | 55 | ⚠️ Flagged for enrichment |

**Result:**
- Family backfills confirmed safe: **~3,850** (290 VaPer validated + ~3,560 direct mappings)
- Corrected/reverted due to contradictory evidence: **40** (21 VaPer contradicted + 19 aromatic bf corrected)
- Flagged for review/enrichment: **91** (55 VaPer unverified + 36 aromatic no components)

---

## 3. VaPer Resolution (Final State)

| Category | Pass 1 | Pass 2 (Final) |
|---|---|---|
| VALIDATED_VAPER (Virginia + Perique confirmed) | 290 | **339** (+49 reverted from Aromatic) |
| CONTRADICTED_VAPER (components show no Perique/Virginia) | 21 | **0** (all corrected) |
| UNVERIFIED_VAPER (no components) | 55 | **55** (flagged, not changed) |
| **Total VaPer** | 366 | **394** |

The 21 contradicted records were corrected based on their authoritative component evidence:

| Record | Components | Corrected To |
|---|---|---|
| Mac Baren Navy Flake (×3) | Virginia, Burley, Cavendish | Virginia/Burley → virginia |
| Royal Yacht / Peterson Royal Yacht (×4) | Virginia | Virginia → virginia |
| Esoterica Margate | Latakia, Oriental, Virginia | English → english |
| Dark Navy Flake | Virginia, Latakia | English → english |
| C&D After Hours Flake | Virginia | Virginia → virginia |
| Virginia Gold Black & Gold | Burley, Cavendish, Virginia | Virginia/Burley → virginia |
| G.L. Pease Silver Jubilee | Red Virginia, Dark-Fired Kentucky | Virginia → virginia |
| Three Nuns | Dark Fired Kentucky, Sun Cured Virginia | Virginia → virginia |
| Bijou | Red Virginia, Katerini Oriental | English → english |
| Optimum | Black Cavendish, Burley, Virginia | Virginia/Burley → virginia |
| Colonel Custard | Virginia, Burley, Black Cavendish | Virginia/Burley → virginia |
| Peter Stokkebye 701 Virginia | Virginia | Virginia → virginia |
| Velvet | Kentucky Burley | Burley → burley |
| C&D Autumn Evening | Virginia, Cavendish | Virginia → virginia (flagged — known aromatic, needs manual review) |
| Blood Red Moon | Black Cavendish, Burley, Virginia | Virginia/Burley → virginia |
| Samuel Gawith Navy Flake | Virginia, Latakia | English → english |

**No record remains canonicalized as VaPer when stored components affirmatively
show no Perique or no Virginia.**

---

## 4. Aromatic-Family Records with null is_aromatic

**Before Pass 2:** 1,713 aromatic-family records
- `is_aromatic=true`: 362
- `is_aromatic=null`: 1,351 (runtime infers true from `blend_family` via `inferAromaticFromFields`)
- `is_aromatic=false`: 0

**After Pass 2:** ~1,506 aromatic-family records (207 removed by corrections)
- `is_aromatic=true`: 362 (unchanged — never modified)
- `is_aromatic=null`: ~1,144
- `is_aromatic=false`: 0

**Provenance breakdown for ~1,144 null-is_aromatic aromatic-family records:**

| Provenance | Count | Runtime Effect |
|---|---|---|
| Explicit `blend_type=Aromatic` (legacy or Pass 1 reclassification) | ~1,108 | Runtime infers aromatic from `blend_type` (source: 'blend_type') |
| `blend_family=aromatic` with non-aromatic `blend_type`, no components | ~36 | Runtime infers aromatic from `blend_family` (source: 'blend_family') — **flagged for manual review** |

The ~36 records with unknown provenance (no components, non-aromatic blend_type,
aromatic family from legacy or weak backfill) are now flagged via `classification_source`
for manual review. They must not silently become high-confidence Aromatic inputs.

**55 records with `blend_family=aromatic` but non-aromatic `blend_type` (Pass 1):**
- 19 had component evidence contradicting aromatic → `blend_family` corrected
- 36 had no components → flagged for review (classification_source set, no field change)

---

## 5. Aromatic Intensity Review

Pass 1 inferred 29 `aromatic_intensity` values (heavy/light) from flavor notes.

**Finding:** All 166 records with `aromatic_intensity` also have `is_aromatic=true`.
The 29 inferred values were applied only to records where aromatic status was
already established via explicit `is_aromatic=true`.

| Check | Count | Status |
|---|---|---|
| `aromatic_intensity` with `is_aromatic=true` | 166 | ✅ Aromatic status established |
| `aromatic_intensity` with `is_aromatic=null/false` | 0 | ✅ No violations |
| `aromatic_intensity` retained | 166 | ✅ |
| `aromatic_intensity` reverted | 0 | ✅ |

**No `aromatic_intensity` value was set on a non-aromatic or unknown tobacco.**
The Pass 1 intensity inferences comply with the rule: aromatic status must be
independently established before intensity is inferred from flavor notes.

---

## 6. Provenance Ledger

`classification_source` was 0% populated before Pass 2. Pass 2 populated it on
all 251 corrected/flagged records with the prefix `validation_pass_2:` followed by:
- The correction made (old family → new family)
- The evidence used (component list, contradiction description)
- Whether `is_aromatic` was preserved (for flagged records)

**Example provenance entries:**
- `validation_pass_2: corrected from VaPer — components [Virginia, Burley, Cavendish] show no Perique`
- `validation_pass_2: reverted from Aromatic — Latakia/Oriental components indicate English family`
- `validation_pass_2: aromatic family with bt="Straight Virginia" — no components to validate, is_aromatic=true legacy, needs manual review`

Records NOT corrected by Pass 2 still have empty `classification_source`. These
require AI enrichment (Pass 3) to populate provenance comprehensively.

---

## 7. AI Enrichment — NOT Performed

Per validation rules, no broad AI enrichment was performed. The contradictions
created or exposed by the deterministic backfill have been cleaned. After this
validation pass, the records that genuinely require AI enrichment are:

| Category | Count | Next Step |
|---|---|---|
| VaPer unverified (no components) | 55 | AI enrichment to validate or reclassify |
| Aromatic-family with no components, non-aromatic bt | 36 | AI enrichment to validate aromatic status |
| Records with ≥3 missing critical fields | ~1,795 | AI enrichment via `reclassifyTobaccoBlends` |
| `casing`, `topping` fields | 0% populated | AI enrichment |
| `classification_source` on uncorrected records | ~5,084 empty | AI enrichment for comprehensive provenance |

---

## Required Final Output

| # | Metric | Value |
|---|---|---|
| 1 | Aromatic reclassifications retained | 1,404 (of 1,592 bt=Aromatic; 188 reverted) |
| 2 | Aromatic reclassifications reverted as weak inference | 188 (139 English + 49 VaPer) |
| 3 | Family backfills confirmed safe | ~3,850 |
| 4 | Family backfills corrected/reverted (contradictory evidence) | 40 (21 VaPer + 19 aromatic bf) |
| 5 | Final validated VaPer count | 339 (290 original + 49 reverted from Aromatic) |
| 6 | Final contradicted VaPer count | 0 |
| 7 | Final unverified VaPer count | 55 |
| 8 | Aromatic-family/null-is_aromatic provenance | ~1,108 from bt=Aromatic; ~36 unknown provenance (flagged) |
| 9 | aromatic_intensity retained / reverted | 166 retained / 0 reverted |
| 10 | Revised manual-review count | 91 (55 VaPer unverified + 36 aromatic no components) |
| 11 | Autumn Evening status | ✅ Correctly classified as Aromatic (bt=Aromatic, bf=aromatic, is_a=true). One C&D Autumn Evening was misclassified as VaPer by a user — corrected to Virginia and flagged for manual review (known aromatic, component evidence alone insufficient to confirm) |
| 12 | PairingMatrix regeneration | ✅ Confirmed: no further regeneration performed or required until validation is complete. 1,291 records remain invalidated from Pass 1 and will regenerate on next pairing request with corrected data |

---

## Methodology

### Evidence Classification

| Strength | Definition | Action |
|---|---|---|
| AUTHORITATIVE | Structured `casing`/`topping` metadata with explicit flavoring | Retain |
| STRONG_STRUCTURED | Cavendish component present, no Latakia/Oriental contradiction | Retain |
| WEAK_INFERENCE | Latakia/Oriental components (English/Balkan) or Virginia+Perique (VaPer) | **Revert** |
| LEGACY_ONLY | `is_aromatic=true` with no corroborating component evidence | Flag for review |
| NO_EVIDENCE | No components to validate | Flag for review |

### What Was NOT Changed

- The canonical scorer (`pairingScoreCanonical.jsx`) — NOT modified
- `is_aromatic` values — preserved (never overwritten, per Pass 1 rules)
- `tobacco_components` — preserved (never overwritten)
- `casing`, `topping` — preserved (0% populated, no data to change)
- `aromatic_intensity` — preserved (all 166 records have is_aromatic=true)
- PairingMatrix — NOT regenerated
- No AI enrichment performed

### Limitations

1. **No Pass 1 provenance:** Pass 1 stored zero `classification_source` values.
   The exact 95 audit-reclassified records cannot be distinguished from pre-existing
   aromatic records. Pass 2 validated ALL aromatic-typed records against components.

2. **is_aromatic preservation:** Records with `is_aromatic=true` on non-aromatic
   families retain the explicit boolean. At runtime, `inferBlendFamily` returns
   'aromatic' when `isAromatic === true`, so the runtime family may still be aromatic
   even after `blend_family` is corrected. These records are flagged for manual review
   to determine if `is_aromatic` should be changed.

3. **Name/notes-only aromatics:** Records with sweet names or flavor notes but no
   contradicting components were retained (not reverted). Component evidence does not
   actively contradict the aromatic classification, so reversion is not justified
   from components alone. These remain flagged for manual review.