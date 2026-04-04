/**
 * Unit tests for CRUD creation limit checks (limitChecks.jsx)
 *
 * Covers:
 *   - canCreatePipe: paid user (unlimited), free user under/at limit, trial with restrictions
 *   - canCreateTobacco: paid user (unlimited), free user under/at limit, trial with restrictions
 *
 * Backend (base44 entities) is fully mocked — no network calls.
 */

import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// Mock base44 client before importing the module under test
vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      Pipe: {
        filter: vi.fn(),
      },
      TobaccoBlend: {
        filter: vi.fn(),
      },
    },
  },
}));

import { base44 } from '@/api/base44Client';
import {
  canCreatePipe,
  canCreateTobacco,
  FREE_TIER_LIMITS,
} from '../limitChecks';

const PIPE_LIMIT = FREE_TIER_LIMITS.PIPES;           // 5
const TOBACCO_LIMIT = FREE_TIER_LIMITS.TOBACCO_BLENDS; // 10

// ─── canCreatePipe ────────────────────────────────────────────────────────────

describe('canCreatePipe — paid user', () => {
  test('paid user can always create (no backend call needed)', async () => {
    const result = await canCreatePipe('test@example.com', true, false);
    expect(result.canCreate).toBe(true);
    expect(result.limit).toBeNull();
    expect(base44.entities.Pipe.filter).not.toHaveBeenCalled();
  });
});

describe('canCreatePipe — free user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('free user under limit can create', async () => {
    // 3 existing pipes → under limit of 5
    base44.entities.Pipe.filter.mockResolvedValue(new Array(3));
    const result = await canCreatePipe('test@example.com', false, false);
    expect(result.canCreate).toBe(true);
    expect(result.currentCount).toBe(3);
    expect(result.limit).toBe(PIPE_LIMIT);
    expect(result.reason).toBeNull();
  });

  test('free user at limit cannot create', async () => {
    // 5 existing pipes → at limit
    base44.entities.Pipe.filter.mockResolvedValue(new Array(5));
    const result = await canCreatePipe('test@example.com', false, false);
    expect(result.canCreate).toBe(false);
    expect(result.reason).toBe('limits.freePipesExceeded');
  });
});

describe('canCreatePipe — trial user (after trial restriction date)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pin time well past the trial restriction date (Feb 1, 2026) so
    // shouldApplyTrialRestrictions() reliably returns true in this describe block.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('trial user under limit can create', async () => {
    base44.entities.Pipe.filter.mockResolvedValue(new Array(2));
    const result = await canCreatePipe('trial@example.com', false, true);
    expect(result.canCreate).toBe(true);
  });

  test('trial user at limit cannot create and gets trial-specific reason', async () => {
    base44.entities.Pipe.filter.mockResolvedValue(new Array(5));
    const result = await canCreatePipe('trial@example.com', false, true);
    expect(result.canCreate).toBe(false);
    expect(result.reason).toBe('limits.trialPipesExceeded');
  });
});

describe('canCreatePipe — backend error', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns canCreate:false and unableToVerify reason on backend error', async () => {
    base44.entities.Pipe.filter.mockRejectedValue(new Error('Network error'));
    const result = await canCreatePipe('test@example.com', false, false);
    expect(result.canCreate).toBe(false);
    expect(result.reason).toBe('limits.unableToVerify');
  });
});

// ─── canCreateTobacco ─────────────────────────────────────────────────────────

describe('canCreateTobacco — paid user', () => {
  test('paid user can always create (no backend call needed)', async () => {
    vi.clearAllMocks();
    const result = await canCreateTobacco('test@example.com', true, false);
    expect(result.canCreate).toBe(true);
    expect(result.limit).toBeNull();
    expect(base44.entities.TobaccoBlend.filter).not.toHaveBeenCalled();
  });
});

describe('canCreateTobacco — free user', () => {
  beforeEach(() => vi.clearAllMocks());

  test('free user under limit can create', async () => {
    // 7 existing tobaccos → under limit of 10
    base44.entities.TobaccoBlend.filter.mockResolvedValue(new Array(7));
    const result = await canCreateTobacco('test@example.com', false, false);
    expect(result.canCreate).toBe(true);
    expect(result.currentCount).toBe(7);
    expect(result.limit).toBe(TOBACCO_LIMIT);
  });

  test('free user at limit cannot create', async () => {
    base44.entities.TobaccoBlend.filter.mockResolvedValue(new Array(10));
    const result = await canCreateTobacco('test@example.com', false, false);
    expect(result.canCreate).toBe(false);
    expect(result.reason).toBe('limits.freeBlendExceeded');
  });
});

describe('canCreateTobacco — backend error', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns canCreate:false and unableToVerify reason on backend error', async () => {
    base44.entities.TobaccoBlend.filter.mockRejectedValue(new Error('Network error'));
    const result = await canCreateTobacco('test@example.com', false, false);
    expect(result.canCreate).toBe(false);
    expect(result.reason).toBe('limits.unableToVerify');
  });
});
