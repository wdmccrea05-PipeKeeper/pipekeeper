import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeRecommendationAction, sanitizeCuratorRecordChanges } from '../recommendationActions.js';

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
        get: vi.fn(async (id) => ({ id, notes: null, image_url: 'old.jpg' })),
      },
      Pipe: {
        update: vi.fn(async (id, payload) => ({ id, ...payload })),
        get: vi.fn(async (id) => ({ id, specialization: null })),
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
});
