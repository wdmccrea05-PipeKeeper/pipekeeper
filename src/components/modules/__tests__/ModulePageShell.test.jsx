import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ModulePageShell from '../ModulePageShell';

vi.mock('@/components/subscription/ComplimentaryProBanner', () => ({ default: () => null }));
vi.mock('@/components/campaign/AppreciationOfferCard', () => ({ default: () => null }));

describe('ModulePageShell', () => {
  it('keeps quick actions available in the empty collection state on the paper workspace', () => {
    const { container } = render(
      <ModulePageShell
        title="CigarKeeper"
        isEmpty
        actions={<button type="button">Open Curator</button>}
        emptyState={<p>No cigars yet</p>}
      />
    );

    expect(container.querySelector('.ck-paper-workspace')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open Curator' })).toBeTruthy();
    expect(screen.getByText('No cigars yet')).toBeTruthy();
  });
});
