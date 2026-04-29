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

  it('shows Wine chip when WineKeeper is active', () => {
    render(
      <CuratorPlanSession
        collectionContext={{}}
        activeModules={{ pipekeeper: true, whiskeykeeper: true, winekeeper: true }}
      />
    );

    expect(screen.getByRole('button', { name: 'Wine' })).toBeTruthy();
  });

  it('does NOT show Wine chip when WineKeeper is disabled', () => {
    render(
      <CuratorPlanSession
        collectionContext={{}}
        activeModules={{ pipekeeper: true, whiskeykeeper: true, winekeeper: false }}
      />
    );

    expect(screen.queryByRole('button', { name: 'Wine' })).toBeNull();
  });
});
