import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HumidorMaintenanceLog from '@/components/cigars/HumidorMaintenanceLog';

const filterMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const useCurrentUserMock = vi.fn();

vi.mock('@/components/hooks/useCurrentUser', () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      HumidorMaintenanceLog: {
        filter: (...args) => filterMock(...args),
        create: (...args) => createMock(...args),
        delete: (...args) => deleteMock(...args),
      },
      HumidorLocation: {
        update: (...args) => updateMock(...args),
      },
    },
  },
}));

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('HumidorMaintenanceLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCurrentUserMock.mockReturnValue({ user: { email: 'tester@example.com' } });
    filterMock.mockResolvedValue([]);
    createMock.mockResolvedValue({ id: 'log_1' });
    updateMock.mockResolvedValue({});
    deleteMock.mockResolvedValue({});
  });

  it('shows practical maintenance presets and opens the logging dialog', async () => {
    renderWithClient(
      <HumidorMaintenanceLog humidorId="h1" humidorName="Desktop" />
    );

    expect(await screen.findByRole('button', { name: 'Replaced Boveda' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recharged Beads' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rotated Cigars' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Inspected Humidor' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cleaned Humidor' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Other Note' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Replaced Boveda' }));
    expect(await screen.findByText('Log Maintenance — Desktop')).toBeTruthy();
  });
});
