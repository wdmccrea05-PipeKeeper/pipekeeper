import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CuratorPlanSession from '@/components/curator/CuratorPlanSession';

vi.mock('@/lib/curator/sessionPlanner.js', () => ({
  buildSessionPlan: () => [],
}));

describe('CuratorPlanSession', () => {
  it('shows Cigar as a planning filter when CigarKeeper is active', () => {
    render(
      <CuratorPlanSession
        collectionContext={{}}
        activeModules={{ pipekeeper: true, whiskeykeeper: true, cigarkeeper: true }}
      />
    );

    expect(screen.getByRole('button', { name: 'Any' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Whiskey' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pipe' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tobacco' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cigar' })).toBeTruthy();
  });
});
