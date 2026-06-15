import { describe, expect, it } from 'vitest';
import { resolveCuratorImageCandidates } from '../curatorImageCandidates.js';

describe('resolveCuratorImageCandidates', () => {
  it('prioritizes existing user images ahead of online suggestions', () => {
    const candidates = resolveCuratorImageCandidates({
      record: {
        recordType: 'bottle',
        name: 'Bottle A',
        photo: 'user-photo.jpg',
        distillery: 'Distillery A',
        expression: 'Expression A',
      },
      appImageLibrary: [{ imageUrl: 'library.jpg', confidence: 0.94 }],
      onlineCandidates: [{ imageUrl: 'online.jpg', confidence: 0.99 }],
    });

    expect(candidates[0].source).toBe('user_attached');
    expect(candidates[0].imageUrl).toBe('user-photo.jpg');
    expect(candidates.at(-1).source).toBe('online');
    expect(candidates.at(-1).requiresReview).toBe(true);
  });

  it('keeps similar-record images ahead of internal and online fallbacks', () => {
    const candidates = resolveCuratorImageCandidates({
      record: { recordType: 'blend', name: 'Blend A', manufacturer: 'Maker A' },
      similarRecords: [{ id: 'blend_2', photo_url: 'similar.jpg' }],
      verifiedImageAssets: [{ imageUrl: 'verified.jpg', confidence: 0.88 }],
      onlineCandidates: [{ imageUrl: 'online.jpg', confidence: 0.95 }],
    });

    expect(candidates[0].source).toBe('user_similar');
    expect(candidates[1].source).toBe('verified_asset');
  });
});

