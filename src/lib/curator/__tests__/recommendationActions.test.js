import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyPipeSpecialization,
  applyReviewedImageCandidate,
  executeRecommendationAction,
  sanitizeCuratorRecordChanges,
} from '../recommendationActions.js';
import { logCuratorAuditEntry } from '@/lib/curator/curatorAuditLog';

vi.mock('@/lib/curator/curatorAuditLog', () => ({
  logCuratorAuditEntry: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      TobaccoBlend: {
        update: vi.fn(async (id, payload) => ({ id, ...payload })),
        get: vi.fn(async (id) => ({ id, blend_type: null, notes: null })),
      },
      Bottle: {
        update: vi.fn(async (id, payload) => ({ id, ...payload })),
        get: vi.fn(async (id) => ({ id, notes: null, image_url: 'old.jpg', distillery: 'Distillery A', expression: 'Expression A' })),
      },
      Pipe: {
        update: vi.fn(async (id, payload) => ({ id, ...payload })),
        get: vi.fn(async (id) => ({ id, specialization: null, focus: [] })),
      },
      Cigar: {
        update: vi.fn(async (id, payload) => ({ id, ...payload })),
        get: vi.fn(async (id) => ({ id, preferred_use: null })),
      },
      Wine: {
        update: vi.fn(async (id, payload) => ({ id, ...payload })),
        get: vi.fn(async (id) => ({ id, region: null })),
      },
    },
  },
}));

describe('recommendationActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never allows direct image fields through curator updates', () => {
    expect(
      sanitizeCuratorRecordChanges({
        image_url: 'https://example.com/image.jpg',
        notes: 'keep this',
      })
    ).toEqual({ notes: 'keep this' });
  });

  it('never falls back to unsupported fields when safe allowlist is provided', async () => {
    const result = await executeRecommendationAction(
      {
        id: 'rec_unsafe',
        goal: 'blend_unsafe_payload',
        items: [
          {
            id: 'blend_unsafe_1',
            recordId: 'blend_unsafe_1',
            recordType: 'blend',
            proposedChange: {
              confidence: 0.9,
              payload: {
                unsupported_field: 'do-not-write',
              },
            },
          },
        ],
      },
      'apply_fix',
      { userEmail: 'user@example.com' }
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('No record updates were applied.');
  });

  it('returns empty object when no safe fields match allowlist', () => {
    const allowed = new Set(['notes']);
    expect(sanitizeCuratorRecordChanges({ unsupported_field: 'x' }, { allowedSet: allowed })).toEqual({});
  });

  it('applies approved non-image changes directly', async () => {
    const result = await executeRecommendationAction(
      {
        id: 'rec_1',
        goal: 'bottle_missing_core_metadata',
        items: [
          {
            id: 'bottle_1',
            recordId: 'bottle_1',
            recordType: 'bottle',
            proposedChange: {
              confidence: 0.9,
              rationale: 'Catalog match',
              payload: {
                notes: 'Updated by Curator',
                image_url: 'https://example.com/blocked.jpg',
              },
            },
          },
        ],
      },
      'apply_fix',
      { userEmail: 'user@example.com' }
    );

    expect(result.ok).toBe(true);
    expect(result.appliedCount).toBe(1);
    expect(result.updatedRecords[0]).toMatchObject({
      id: 'bottle_1',
      notes: 'Updated by Curator',
    });
    expect(result.updatedRecords[0].image_url).toBeUndefined();
  });

  it('rejects image-only curator payloads until they are reviewed through image resolution', async () => {
    const result = await executeRecommendationAction(
      {
        id: 'rec_2',
        goal: 'record_image_refresh',
        items: [
          {
            id: 'bottle_2',
            recordId: 'bottle_2',
            recordType: 'bottle',
            proposedChange: {
              confidence: 0.99,
              payload: {
                image_url: 'https://example.com/blocked.jpg',
              },
            },
          },
        ],
      },
      'apply_fix',
      { userEmail: 'user@example.com' }
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('No record updates were applied.');
  });

  it('applies an approved reviewed image candidate through the image-specific flow', async () => {
    const result = await applyReviewedImageCandidate(
      'bottle',
      'bottle_2',
      {
        resolvedBy: 'resolveCuratorImageCandidates',
        imageUrl: 'https://example.com/new.jpg',
        source: 'app_library',
        confidence: 0.95,
        distillery: 'Distillery A',
        expression: 'Expression A',
      },
      {
        approved: true,
        mode: 'replace',
        userEmail: 'user@example.com',
      }
    );

    expect(result.ok).toBe(true);
    expect(result.updated.image_url).toBe('https://example.com/new.jpg');
  });

  it('blocks reviewed image candidate application without explicit approval', async () => {
    await expect(() =>
      applyReviewedImageCandidate(
        'bottle',
        'bottle_2',
        {
          resolvedBy: 'resolveCuratorImageCandidates',
          imageUrl: 'https://example.com/new.jpg',
          source: 'app_library',
          confidence: 0.95,
          distillery: 'Distillery A',
          expression: 'Expression A',
        },
        {
          approved: false,
        }
      )
    ).rejects.toThrow('Reviewed image candidates require explicit approval.');
  });

  it('applies reviewed cigar changes through the canonical entity updater', async () => {
    const result = await executeRecommendationAction(
      {
        id: 'rec_cigar',
        goal: 'cigar_missing_metadata',
        items: [
          {
            id: 'cigar_1',
            recordId: 'cigar_1',
            recordType: 'cigar',
            proposedChange: {
              confidence: 0.9,
              payload: {
                wrapper: 'Maduro',
                notes: 'Updated cigar metadata',
              },
            },
          },
        ],
      },
      'approve_changes',
      { userEmail: 'user@example.com' }
    );

    expect(result.ok).toBe(true);
    expect(result.updatedRecords[0]).toMatchObject({
      id: 'cigar_1',
      wrapper: 'Maduro',
    });
  });

  it('applies reviewed wine changes through the canonical entity updater', async () => {
    const result = await executeRecommendationAction(
      {
        id: 'rec_wine',
        goal: 'wine_missing_metadata',
        items: [
          {
            id: 'wine_1',
            recordId: 'wine_1',
            recordType: 'wine',
            proposedChange: {
              confidence: 0.9,
              payload: {
                region: 'Burgundy',
                vintage: 2019,
              },
            },
          },
        ],
      },
      'apply_fix',
      { userEmail: 'user@example.com' }
    );

    expect(result.ok).toBe(true);
    expect(result.updatedRecords[0]).toMatchObject({
      id: 'wine_1',
      region: 'Burgundy',
      vintage: 2019,
    });
  });

  it('writes normalized focus/specialization and audit log for pipe specialization updates', async () => {
    const result = await applyPipeSpecialization('pipe_1', 'Virginia');
    expect(result.focus).toEqual(['Virginia']);
    expect(result.specialization).toBe('Virginia');
    expect(logCuratorAuditEntry).toHaveBeenCalledTimes(1);
  });
});
