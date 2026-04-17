import { describe, expect, it } from 'vitest';
import { buildSessionPlan } from '@/lib/curator/sessionPlanner';

describe('buildSessionPlan', () => {
  it('includes cigar candidates and cigar module filter support when active', () => {
    const context = {
      cigars: [
        {
          id: 'c1',
          name: 'Padron 1964',
          brand: 'Padron',
          rating: 4.6,
          is_favorite: true,
          singles_equivalent: 4,
          ready_to_smoke_date: '2020-01-01',
        },
      ],
      cigarSessions: [],
    };

    const plans = buildSessionPlan(context, { cigarkeeper: true }, 'cigar');
    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0].moduleKey).toBe('cigar');
    expect(plans[0].itemType).toBe('cigar');
  });

  it('excludes cigar candidates marked not_for_me, ai_excluded, or zero inventory', () => {
    const context = {
      cigars: [
        { id: 'c1', name: 'Skip Me', not_for_me: true, singles_equivalent: 5 },
        { id: 'c2', name: 'AI Excluded', ai_excluded: true, singles_equivalent: 5 },
        { id: 'c3', name: 'Out of Stock', singles_equivalent: 0 },
      ],
      cigarSessions: [],
    };

    const plans = buildSessionPlan(context, { cigarkeeper: true }, 'cigar');
    expect(plans).toEqual([]);
  });

  it('does not return cigar plans when cigar module is disabled', () => {
    const context = {
      cigars: [{ id: 'c1', name: 'Visible Cigar', singles_equivalent: 3 }],
      cigarSessions: [],
    };

    const plans = buildSessionPlan(context, { cigarkeeper: false }, 'any');
    expect(plans.some((p) => p.moduleKey === 'cigar')).toBe(false);
  });
});
