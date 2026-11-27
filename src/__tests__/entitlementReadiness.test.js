import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  COLLECTION_FEATURE_MATRIX,
  MODULES,
  resolveCollectionFeature,
  summarizeCollectionMatrix,
  freeCollectionFeatureIds,
  proposedCollectionFeatureIds,
  featuresForCollectionTier,
  collectionFeaturesByGroup,
} from '../lib/entitlements/collectionFeatureMatrix.js';

/**
 * Subscription and entitlement readiness for Collection Intelligence 2.0.
 *
 * Two halves:
 *   1. The collection-wide feature matrix: free rights preserved, live Pro rows
 *      enforced, proposed rows never blocking.
 *   2. Server-side authorization: the AI-consuming Curator endpoints re-check
 *      entitlement from the request rather than trusting the browser.
 */

const ROOT = globalThis.process?.cwd?.() || '';
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const CURATOR_GATED_FUNCTIONS = [
  'base44/functions/invokeCuratorLLM/entry.ts',
  'base44/functions/curatorRecordChange/entry.ts',
  'base44/functions/generateSessionRecommendation/entry.ts',
];

describe('collection feature entitlement matrix', () => {
  it('is well formed', () => {
    expect(COLLECTION_FEATURE_MATRIX.length).toBeGreaterThan(15);
    const ids = new Set();
    COLLECTION_FEATURE_MATRIX.forEach((feature) => {
      expect(feature.id).toBeTypeOf('string');
      expect(feature.label).toBeTypeOf('string');
      expect(['free', 'pro']).toContain(feature.requiredTier);
      expect(['live', 'proposed']).toContain(feature.enforcement);
      expect(feature.modules.length).toBeGreaterThan(0);
      feature.modules.forEach((moduleKey) => expect(Object.keys(MODULES)).toContain(moduleKey));
      expect(ids.has(feature.id)).toBe(false);
      ids.add(feature.id);
    });
  });

  it('preserves basic inventory, acquisition, storage and existing free features', () => {
    const free = freeCollectionFeatureIds();
    ['collection.inventory', 'collection.acquisition', 'collection.storage', 'collection.records'].forEach((id) => {
      expect(free).toContain(id);
    });
  });

  it('never charges for a preserved free feature', () => {
    freeCollectionFeatureIds().forEach((id) => {
      const decision = resolveCollectionFeature(id, 'free');
      expect(decision.allowed).toBe(true);
      expect(decision.enforced).toBe(true);
    });
  });

  it('keeps report viewing free and report export Pro', () => {
    expect(resolveCollectionFeature('reports.center_view', 'free').allowed).toBe(true);
    expect(resolveCollectionFeature('reports.export', 'free').allowed).toBe(false);
    expect(resolveCollectionFeature('reports.export', 'pro').allowed).toBe(true);
  });

  it('enforces the live Curator rows for a free collector', () => {
    ['curator.analysis', 'curator.record_actions', 'curator.session_recommendations'].forEach((id) => {
      const decision = resolveCollectionFeature(id, 'free');
      expect(decision.enforced).toBe(true);
      expect(decision.allowed).toBe(false);
      expect(resolveCollectionFeature(id, 'pro').allowed).toBe(true);
    });
  });

  it('never blocks on a proposed row', () => {
    const proposed = proposedCollectionFeatureIds();
    expect(proposed.length).toBeGreaterThan(0);
    proposed.forEach((id) => {
      const decision = resolveCollectionFeature(id, 'free');
      expect(decision.allowed).toBe(true);
      expect(decision.enforced).toBe(false);
    });
  });

  it('treats an unknown feature as unrestricted rather than silently locking it', () => {
    const decision = resolveCollectionFeature('collection.not_a_real_feature', 'free');
    expect(decision.known).toBe(false);
    expect(decision.allowed).toBe(true);
  });

  it('summarises consistently for the admin view', () => {
    const summary = summarizeCollectionMatrix();
    expect(summary.total).toBe(COLLECTION_FEATURE_MATRIX.length);
    expect(summary.live + summary.proposed).toBe(summary.total);
    expect(summary.byTier.free + summary.byTier.pro).toBe(summary.total);
    expect(summary.proposed).toBe(proposedFeatureCount());
  });

  it('lists more features for Pro than for Free', () => {
    expect(featuresForCollectionTier('pro').length).toBeGreaterThan(featuresForCollectionTier('free').length);
  });

  it('groups every feature', () => {
    const grouped = collectionFeaturesByGroup();
    const total = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);
    expect(total).toBe(COLLECTION_FEATURE_MATRIX.length);
  });
});

function proposedFeatureCount() {
  return proposedCollectionFeatureIds().length;
}

describe('server-side Curator authorization', () => {
  it('has a shared access module with the documented precedence helpers', () => {
    const source = read('base44/shared/curatorAccess.ts');
    expect(source).toContain('export async function resolveCuratorAccess');
    expect(source).toContain('export function subscriptionGrantsAccess');
    expect(source).toContain('export function isCanceledButPaidThrough');
    expect(source).toContain('isFoundingMember');
    expect(source).toContain('legacy_broad_module_access');
    expect(source).toContain('resolveProTrial');
    expect(source).toContain('resolveGrantState');
  });

  it('keeps the grace period identical to the entitlement guard', () => {
    const access = read('base44/shared/curatorAccess.ts');
    const guard = read('base44/shared/requireEntitlement.ts');
    expect(access).toMatch(/GRACE_PERIOD_DAYS\s*=\s*5/);
    expect(guard).toMatch(/GRACE_PERIOD_DAYS\s*=\s*5/);
  });

  it('treats a canceled subscription as active until its paid period ends', () => {
    const source = read('base44/shared/curatorAccess.ts');
    expect(source).toContain('"canceled"');
    expect(source).toContain('current_period_end');
    expect(source).toMatch(/endMs > Date\.now\(\)/);
  });

  it('re-checks entitlement in every AI-consuming Curator function', () => {
    CURATOR_GATED_FUNCTIONS.forEach((file) => {
      const source = read(file);
      expect(source, `${file} must import the shared access module`).toContain(
        "shared/curatorAccess.ts"
      );
      expect(source, `${file} must resolve access from the request`).toMatch(
        /resolveCuratorAccess\(req\)/
      );
      expect(source, `${file} must return 403 when access is denied`).toMatch(/access\.status \|\| 403/);
    });
  });

  it('does not accept a client-supplied entitlement claim', () => {
    CURATOR_GATED_FUNCTIONS.forEach((file) => {
      const source = read(file);
      expect(source).not.toMatch(/body\??\.(isPro|hasPro|entitlement|tier)\b/);
    });
  });
});

describe('administrative diagnostics', () => {
  const source = read('base44/functions/adminDiagnostics/entry.ts');

  it('is administrator-only', () => {
    expect(source).toContain('role || "").toLowerCase() !== "admin"');
    expect(source).toContain('FORBIDDEN');
  });

  it('covers every requested diagnostic area or declares it unavailable', () => {
    ['subscriptions', 'entitlementDrift', 'curator', 'complimentaryAccess', 'giftMemberships', 'configuration'].forEach(
      (key) => expect(source).toContain(key)
    );
    expect(source).toContain('unavailable');
  });

  it('returns aggregates only, never collector identity or record contents', () => {
    expect(source).toContain('privacy');
    const payload = source.slice(source.indexOf('return Response.json'));
    expect(payload).not.toMatch(/user_email:\s/);
    expect(payload).not.toMatch(/\.notes\b/);
    expect(payload).not.toMatch(/record_name/);
  });

  it('does not report an unmeasured signal as zero', () => {
    const unavailableBlock = source.slice(source.indexOf('const unavailable'));
    ['Failed report generation', 'Data persistence failures', 'Application performance'].forEach((signal) => {
      expect(unavailableBlock).toContain(signal);
    });
  });
});