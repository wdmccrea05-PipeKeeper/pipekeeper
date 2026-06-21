import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Wines from '@/pages/Wines';
import { QUERY_KEYS } from '@/lib/queryKeys';

const { navigateMock, invalidateQueriesMock, wineDeleteMock, sampleWines } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  wineDeleteMock: vi.fn().mockResolvedValue({}),
  sampleWines: [
    {
      id: 'wine-1',
      name: 'Test Wine',
      producer: 'Test Producer',
      vintage: 2018,
      region: 'Napa',
      appellation: 'Oak Knoll',
      varietal: 'Cabernet Sauvignon',
      style: 'red',
      quantity: 2,
      rating: 4,
      estimated_value: 12500,
      created_by: 'test@example.com',
      notes: 'Structured and balanced.',
    },
  ],
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: sampleWines, isLoading: false })),
  useMutation: vi.fn((config) => ({
    mutate: async (variables) => {
      const result = await config.mutationFn(variables);
      config.onSuccess?.(result, variables);
    },
    isPending: false,
  })),
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      Wine: {
        filter: vi.fn().mockResolvedValue(sampleWines),
        delete: (...args) => wineDeleteMock(...args),
      },
    },
  },
}));

vi.mock('@/components/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { email: 'test@example.com' } }),
}));

vi.mock('@/components/i18n/safeTranslation', async () => {
  const actual = await vi.importActual('@/components/i18n/safeTranslation');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key, fallback) => {
        if (typeof fallback === 'string') return fallback;
        if (typeof fallback === 'object' && typeof fallback?.defaultValue === 'string') return fallback.defaultValue;
        return actual.translate(key, {}, 'en');
      },
    }),
  };
});

vi.mock('@/lib/currency/useCurrency', () => ({
  useCurrency: () => ({
    formatFromBase: (value) => `$${Number(value || 0).toFixed(0)}`,
  }),
}));

vi.mock('@/components/modules/WineKeeperModuleNav', () => ({
  default: () => <div>nav</div>,
}));

vi.mock('@/components/wine/WineForm', () => ({
  default: ({ onSaved }) => (
    <button type="button" onClick={onSaved}>
      save-wine
    </button>
  ),
}));

vi.mock('@/components/wine/LogWineTastingModal', () => ({
  default: ({ onSaved }) => (
    <button type="button" onClick={onSaved}>
      save-tasting
    </button>
  ),
}));

vi.mock('@/components/addflow/AddFlowModal', () => ({
  default: ({ onCreated }) => (
    <button type="button" onClick={onCreated}>
      create-wine
    </button>
  ),
}));

vi.mock('@/components/shared/EnrichButton', () => ({
  default: ({ onEnriched }) => (
    <button type="button" onClick={onEnriched}>
      Enrich
    </button>
  ),
}));

vi.mock('@/components/wantlist/AddToWantListModal', () => ({
  default: () => null,
}));

describe('Wines collection parity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.confirm = vi.fn(() => true);
  });

  it('renders a grid/list toggle and persists list mode across refresh', async () => {
    const { unmount } = render(<Wines />);

    const listToggle = screen.getByRole('button', { name: 'List view' });
    fireEvent.click(listToggle);

    expect(localStorage.getItem('wineViewMode')).toBe('list');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    unmount();
    render(<Wines />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
    });
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('opens WineDetail from the reusable list item row', async () => {
    render(<Wines />);

    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    fireEvent.click(screen.getByText('Test Wine'));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/WineDetail?id=wine-1');
    });
  });

  it('uses canonical invalidation for add, edit, delete, and enrich flows', async () => {
    const expectedWineKey = { queryKey: QUERY_KEYS.wines('test@example.com') };

    const deleteView = render(<Wines />);
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(wineDeleteMock).toHaveBeenCalledWith('wine-1');
      expect(invalidateQueriesMock).toHaveBeenCalledWith(expectedWineKey);
    });
    deleteView.unmount();

    const editView = render(<Wines />);
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'save-wine' }));
    await waitFor(() => {
      expect(invalidateQueriesMock).toHaveBeenCalledWith(expectedWineKey);
    });
    editView.unmount();

    const enrichView = render(<Wines />);
    fireEvent.click(screen.getByRole('button', { name: 'Enrich' }));
    await waitFor(() => {
      expect(invalidateQueriesMock).toHaveBeenCalledWith(expectedWineKey);
    });
    enrichView.unmount();

    render(<Wines />);
    fireEvent.click(screen.getByRole('button', { name: 'create-wine' }));
    await waitFor(() => {
      expect(invalidateQueriesMock).toHaveBeenCalledWith(expectedWineKey);
    });

    const canonicalWineInvalidations = invalidateQueriesMock.mock.calls.filter(([arg]) => {
      return Array.isArray(arg?.queryKey)
        && arg.queryKey[0] === expectedWineKey.queryKey[0]
        && arg.queryKey[1] === expectedWineKey.queryKey[1];
    });

    expect(canonicalWineInvalidations).toHaveLength(4);
  });
});
