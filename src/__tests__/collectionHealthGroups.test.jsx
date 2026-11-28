import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import CollectionHealth from '@/pages/CollectionHealth';
import { translate } from '@/components/i18n';

const fixtures = vi.hoisted(() => ({
  pipes: Array.from({ length: 80 }, (_, i) => ({ id: `p${i}`, name: `Pipe ${i}` })),
  cigars: Array.from({ length: 40 }, (_, i) => ({ id: `c${i}`, name: `Cigar ${i}` })),
}));

function CurrentLocation() {
  const location = useLocation();
  return <output aria-label="Current location">{`${location.pathname}${location.search}`}</output>;
}

vi.mock('@/components/hooks/useCurrentUser', () => ({ useCurrentUser: () => ({ user: { email: 'a@example.com' } }) }));
vi.mock('@/components/hooks/useEnabledKeeperModules', () => ({
  useEnabledModules: () => ({ enabled: { pipekeeper: true, cigarkeeper: true }, isLoading: false }),
}));
vi.mock('@/hooks/useScrollRestoration', () => ({ default: () => {} }));
vi.mock('@/hooks/useFindingStates', () => ({ default: () => ({ states: {}, setState: vi.fn() }) }));
vi.mock('@/components/reports/useReportCenterData', () => ({
  default: () => ({
    pipes: fixtures.pipes, blends: [], cigars: fixtures.cigars, bottles: [], wines: [],
    locations: [], humidors: [], valuations: [], isLoading: false, isError: false,
  }),
}));
vi.mock('@/hooks/useActionExecution', () => ({
  default: () => ({ status: 'idle', result: null, error: '', execute: vi.fn(), undo: vi.fn(), reset: vi.fn() }),
}));

describe('Collection Health groups', () => {
  it('localizes the Curator action and prompt for Spanish', () => {
    expect(translate('collectionIntelligence.askCurator', {}, 'es')).toBe('Preguntar a Curator');
    expect(translate('collectionIntelligence.reviewFindingsPrompt', { group: 'storage' }, 'es'))
      .toContain('hallazgos de storage');
  });

  it('summarizes 240 findings across modules before opening individual records', () => {
    window.history.replaceState({}, '', '/CollectionHealth');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter><CollectionHealth /></MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByRole('button', { name: /Storage not assigned: 120/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Documentation missing: 120/ })).toBeTruthy();
    expect(screen.queryByText('Assign storage for Pipe 0')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Storage not assigned: 120/ }));
    expect(screen.getByText('Assign storage for Pipe 0')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cigars' }));
    expect(screen.queryByText('Assign storage for Pipe 0')).toBeNull();
    expect(screen.getByText('Assign storage for Cigar 0')).toBeTruthy();
  });

  it('opens Curator with the selected finding group prefilled in the conversation input', () => {
    window.history.replaceState({}, '', '/CollectionHealth');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/CollectionHealth']}>
          <CollectionHealth />
          <CurrentLocation />
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getAllByRole('link', { name: 'Ask Curator' })[0]);

    const location = new URL(screen.getByLabelText('Current location').textContent, 'https://example.test');
    expect(location.pathname).toBe('/Curator');
    expect(location.searchParams.get('findingType')).toBe('storage');
    expect(location.searchParams.get('prompt')).toBe(
      'Help me review the Storage not assigned findings in Collection Health and choose a safe next step.'
    );
  });
});
