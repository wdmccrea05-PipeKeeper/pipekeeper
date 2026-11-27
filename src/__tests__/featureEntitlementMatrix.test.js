import { describe, it, expect } from 'vitest';
import {
  FEATURE_MATRIX,
  MEMBERSHIP_LEVELS,
  resolveFeatureAccess,
  featuresForTier,
  featuresByGroup,
  summarizeMatrix,
  freeFeatureIds,
  proposedFeatureIds,
  normalizeTier,
  tierRank,
} from '../lib/entitlements/featureMatrix.js';

describe('feature entitlement matrix', () => {
  it('is well formed', () => {
    expect(FEATURE_MATRIX.length).toBeGreaterThan(10);
    const ids = new Set();
    FEATURE_MATRIX.forEach((feature) => {
      expect(feature.id).toBeTypeOf('string');
      expect(feature.label).toBeTypeOf('string');
      expect(feature.group).toBeTypeOf('string');
      expect(MEMBERSHIP_LEVELS).toContain(feature.requiredTier);
      expect(['live', 'proposed']).toContain(feature.enforcement);
      expect(ids.has(feature.id)).toBe(false);
      ids.add(feature.id);
    });
  });

  it('preserves the free capabilities the request names', () => {
    const free = freeFeatureIds();
    ['cigars.inventory', 'cigars.acquisition', 'cigars.storage', 'cigars.records'].forEach((id) => {
      expect(free).toContain(id);
    });
  });

  it('keeps every preserved feature free of charge', () => {
    FEATURE_MATRIX.filter((f) => freeFeatureIds().includes(f.id)).forEach((feature) => {
      expect(resolveFeatureAccess(feature.id, 'free').allowed).toBe(true);
      expect(resolveFeatureAccess(feature.id, 'free').enforced).toBe(true);
    });
  });

  it('enforces live Pro rows for a free collector', () => {
    const decision = resolveFeatureAccess('cigars.valuation', 'free');
    expect(decision.allowed).toBe(false);
    expect(decision.enforced).toBe(true);
    expect(decision.requiredTier).toBe('pro');
    expect(resolveFeatureAccess('cigars.valuation', 'pro').allowed).toBe(true);
  });

  it('never blocks on a proposed row', () => {
    const proposed = proposedFeatureIds();
    expect(proposed.length).toBeGreaterThan(0);
    proposed.forEach((id) => {
      const decision = resolveFeatureAccess(id, 'free');
      expect(decision.allowed).toBe(true);
      expect(decision.enforced).toBe(false);
      expect(decision.enforcement).toBe('proposed');
    });
  });

  it('treats an unknown feature as unrestricted rather than silently locking it', () => {
    const decision = resolveFeatureAccess('cigars.not_a_real_feature', 'free');
    expect(decision.known).toBe(false);
    expect(decision.allowed).toBe(true);
    expect(decision.enforced).toBe(false);
  });

  it('orders tiers free < pro < premium', () => {
    expect(tierRank('free')).toBeLessThan(tierRank('pro'));
    expect(tierRank('pro')).toBeLessThan(tierRank('premium'));
    expect(normalizeTier('PAID')).toBe('free');
    expect(normalizeTier('premium')).toBe('premium');
    expect(normalizeTier(undefined)).toBe('free');
  });

  it('reports what each tier includes', () => {
    const free = featuresForTier('free');
    const premium = featuresForTier('premium');
    expect(premium.length).toBeGreaterThan(free.length);
    free.forEach((feature) => expect(feature.requiredTier).toBe('free'));
  });

  it('summarises the matrix for administration', () => {
    const summary = summarizeMatrix();
    expect(summary.total).toBe(FEATURE_MATRIX.length);
    expect(summary.live + summary.proposed).toBe(summary.total);
    expect(summary.byTier.free + summary.byTier.pro + summary.byTier.premium).toBe(summary.total);
  });

  it('groups every feature under a known group', () => {
    const grouped = featuresByGroup();
    const total = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);
    expect(total).toBe(FEATURE_MATRIX.length);
  });
});