# Pairing Engine Certification Report

**Generated:** 2026-08-09T16:13:50.599Z

## Executive Summary

**Overall Result:** PASS

```
CERTIFIED FOR PRODUCTION
```

## Environment

| Item | Value |
|------|-------|
| Scorer Version | 1.0.0-canonical |
| Taxonomy Version | 1.0.0 |
| Normalization Version | 1.0.0 |
| Component Weights | dedication=0.3, geometry=0.2, cut=0.15, composition=0.15, aromatic=0.1, material=0.05, smoking=0.05 |

## Baseline

| Entity | Count |
|--------|-------|
| Representative Blends | 15 |
| Certification Pipes | 8 |
| Bowl Variants | 2 |

## Coverage Matrix

| Archetype | Best Pipe Matches | Pipe Detail | Tobacco Detail | Normalization | Scoring | Result |
|-----------|-------------------|-------------|----------------|---------------|---------|--------|
| Heavy Aromatic | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Light Aromatic | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Straight Virginia | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Virginia Flake | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| True VaPer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| English | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Balkan | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Burley | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lakeland | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dark Fired | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Navy Flake | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| English Aromatic | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Non-aromatic Cavendish | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Unknown Family | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Unknown Components | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Known Truth Validation

| Blend | Expected Dominant | Actual Top Pipe Type | Result |
|-------|-------------------|----------------------|--------|
| Autumn Evening | Aromatic | Aromatic Dedicated | ✅ |
| Escudo | Virginia/VaPer | Virginia Dedicated | ✅ |
| Early Morning Pipe | English | Large English | ✅ |
| Nightcap | Large English | English Dedicated | ✅ |
| Orlik Golden Sliced | Virginia | Virginia Dedicated | ✅ |
| Haunted Bookshop | General Purpose | Virginia Dedicated | ✅ |

## Cross-Surface Consistency

| Blend | Surface A | Surface B | Scores Match | Ranking Match | Result |
|-------|-----------|-----------|--------------|---------------|--------|
| Heavy Aromatic | scorePipeBlend | scorePipeBlendDiagnostic | ✅ | ✅ | ✅ |
| Light Aromatic | scorePipeBlend | scorePipeBlendDiagnostic | ✅ | ✅ | ✅ |
| Straight Virginia | scorePipeBlend | scorePipeBlendDiagnostic | ✅ | ✅ | ✅ |
| Virginia Flake | scorePipeBlend | scorePipeBlendDiagnostic | ✅ | ✅ | ✅ |
| True VaPer | scorePipeBlend | scorePipeBlendDiagnostic | ✅ | ✅ | ✅ |

## Explainability Validation

- ✅ **Heavy Aromatic × Aromatic Dedicated**: Scores predict explanation
- ✅ **Heavy Aromatic × English Dedicated**: Scores predict explanation
- ✅ **Heavy Aromatic × Virginia Dedicated**: Scores predict explanation
- ✅ **Light Aromatic × Aromatic Dedicated**: Scores predict explanation
- ✅ **Light Aromatic × English Dedicated**: Scores predict explanation
- ✅ **Light Aromatic × Virginia Dedicated**: Scores predict explanation
- ✅ **Straight Virginia × Aromatic Dedicated**: Scores predict explanation
- ✅ **Straight Virginia × English Dedicated**: Scores predict explanation
- ✅ **Straight Virginia × Virginia Dedicated**: Scores predict explanation
- ✅ **Virginia Flake × Aromatic Dedicated**: Scores predict explanation
- ✅ **Virginia Flake × English Dedicated**: Scores predict explanation
- ✅ **Virginia Flake × Virginia Dedicated**: Scores predict explanation
- ✅ **True VaPer × Aromatic Dedicated**: Scores predict explanation
- ✅ **True VaPer × English Dedicated**: Scores predict explanation
- ✅ **True VaPer × Virginia Dedicated**: Scores predict explanation

## Stability (5-Run Determinism)

- ✅ Heavy Aromatic × Aromatic Dedicated: Deterministic across 5 runs
- ✅ Heavy Aromatic × English Dedicated: Deterministic across 5 runs
- ✅ Heavy Aromatic × Virginia Dedicated: Deterministic across 5 runs
- ✅ Light Aromatic × Aromatic Dedicated: Deterministic across 5 runs
- ✅ Light Aromatic × English Dedicated: Deterministic across 5 runs
- ✅ Light Aromatic × Virginia Dedicated: Deterministic across 5 runs
- ✅ Straight Virginia × Aromatic Dedicated: Deterministic across 5 runs
- ✅ Straight Virginia × English Dedicated: Deterministic across 5 runs
- ✅ Straight Virginia × Virginia Dedicated: Deterministic across 5 runs
- ✅ Virginia Flake × Aromatic Dedicated: Deterministic across 5 runs
- ✅ Virginia Flake × English Dedicated: Deterministic across 5 runs
- ✅ Virginia Flake × Virginia Dedicated: Deterministic across 5 runs

## Performance Metrics

| Operation | Avg Time (ms) | Max Time (ms) | Status |
|-----------|--------------|--------------|--------|
| scorePipeBlend (single) | 0.18 | 2.54 | ✅ Fast |
| buildPairingsForPipes | 0.20 | 24.47 | ✅ Fast |

## Regression Summary

**Previous Baseline:** 2026-08-09T16:12:22.569Z

_No regressions detected from previous certified build._

## Confidence Calibration

- ✅ **Heavy Aromatic × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Heavy Aromatic × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Heavy Aromatic × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Light Aromatic × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Light Aromatic × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Light Aromatic × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Straight Virginia × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Straight Virginia × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Straight Virginia × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Virginia Flake × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Virginia Flake × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Virginia Flake × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **True VaPer × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **True VaPer × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **True VaPer × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **English × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **English × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **English × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Balkan × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Balkan × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Balkan × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Burley × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Burley × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Burley × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Lakeland × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Lakeland × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Lakeland × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Dark Fired × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Dark Fired × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Dark Fired × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Navy Flake × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Navy Flake × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Navy Flake × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **English Aromatic × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **English Aromatic × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **English Aromatic × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Non-aromatic Cavendish × Aromatic Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Non-aromatic Cavendish × English Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Non-aromatic Cavendish × Virginia Dedicated** (confidence=0.9): High confidence — well-evidenced pair
- ✅ **Unknown Family × Aromatic Dedicated** (confidence=0.6): Confidence in valid range
- ✅ **Unknown Family × English Dedicated** (confidence=0.6): Confidence in valid range
- ✅ **Unknown Family × Virginia Dedicated** (confidence=0.6): Confidence in valid range
- ✅ **Unknown Components × Aromatic Dedicated** (confidence=0.4): Low confidence — missing metadata
- ✅ **Unknown Components × English Dedicated** (confidence=0.4): Low confidence — missing metadata
- ✅ **Unknown Components × Virginia Dedicated** (confidence=0.4): Low confidence — missing metadata

## Defect Inventory

_No defects identified._

## Production Readiness

```
CERTIFIED FOR PRODUCTION
```

### Evidence

- Phase results: baseline=PASS, crossSurface=PASS, knownTruth=PASS, explainability=PASS, edgeCases=PASS, performance=PASS, stability=PASS, confidence=PASS, coverage=PASS
- Critical defects: 0
- High defects: 0
- Medium defects: 0
- Low defects: 0
- All archetypes covered: Yes
- Known-truth validation: PASS
