import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExpertTobacconistChat from '@/components/agent/ExpertTobacconistChat';
import ReportingCenter from '@/pages/ReportingCenter';
import { buildReportCsv } from '@/lib/reports/reportExport';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  downloadCsv: vi.fn(),
  downloadPdf: vi.fn(),
  reportData: {},
  entities: {
    Pipe: { filter: vi.fn() },
    TobaccoBlend: { filter: vi.fn() },
    Bottle: { filter: vi.fn() },
    Cigar: { filter: vi.fn() },
    Wine: { filter: vi.fn() },
    SmokingLog: { filter: vi.fn() },
    CellarLog: { filter: vi.fn() },
    PipeMaintenanceLog: { filter: vi.fn() },
    TastingLog: { filter: vi.fn() },
    BottleFillRecord: { filter: vi.fn() },
    CigarSession: { filter: vi.fn() },
    CigarRating: { filter: vi.fn() },
    HumidorLocation: { filter: vi.fn() },
    HumidorReading: { filter: vi.fn() },
    HumidorMaintenanceLog: { filter: vi.fn() },
    WineTasting: { filter: vi.fn() },
    WineInspection: { filter: vi.fn() },
    StorageLocation: { filter: vi.fn() },
    ValuationRecord: { filter: vi.fn() },
    CollectionActivity: { filter: vi.fn() },
    SavedReportConfig: { filter: vi.fn() },
  },
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: mocks.entities,
    functions: { invoke: mocks.invoke },
  },
}));
vi.mock('@/components/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'collector-1', email: 'collector@example.com' }, hasPaid: true }),
}));
vi.mock('@/components/hooks/useEnabledKeeperModules', () => ({
  useEnabledModules: () => ({
    enabled: { pipekeeper: true, whiskeykeeper: false, cigarkeeper: false, winekeeper: false },
    isLoading: false,
  }),
}));
vi.mock('@/components/hooks/useEntitlements', () => ({
  useEntitlements: () => ({ canUse: () => true }),
}));
vi.mock('@/hooks/useFindingStates', () => ({
  default: () => ({ states: {}, setState: vi.fn(), error: null }),
}));
vi.mock('@/hooks/useScrollRestoration', () => ({ default: vi.fn() }));
vi.mock('@/components/reports/useReportCenterData', () => ({
  default: () => mocks.reportData,
}));
vi.mock('@/components/reports/ReportChart', () => ({ default: () => null }));
vi.mock('@/lib/actions/collectionFindings', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, buildFindings: () => [] };
});
vi.mock('@/lib/reports/reportExport', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    downloadReportCsv: mocks.downloadCsv,
    downloadReportPdf: mocks.downloadPdf,
  };
});

function LocationOutput() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname}{search}</output>;
}

function renderJourney() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  window.history.replaceState({}, '', '/Curator');
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/Curator"
            element={(
              <ExpertTobacconistChat
                collectionContext={{ pipes: [{ id: 'pipe-0', name: 'Pipe 0', maker: 'Peterson' }] }}
                activeModules={{ pipekeeper: true }}
                userEmail="collector@example.com"
              />
            )}
          />
          <Route path="/ReportingCenter" element={<ReportingCenter />} />
          <Route path="/PipeDetail" element={<LocationOutput />} />
        </Routes>
        <LocationOutput />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('Curator report controls', () => {
  beforeEach(() => {
    mocks.invoke.mockReset().mockResolvedValue({ data: { canExport: true, messages: [] } });
    mocks.downloadCsv.mockReset();
    mocks.downloadPdf.mockReset();
    const pipes = Array.from({ length: 2 }, (_, index) => ({
      id: `pipe-${index}`,
      created_by: 'collector@example.com',
      name: index === 1 ? 'Pipe needing specialization' : `Pipe ${index}`,
      maker: 'Peterson',
      shape: 'Billiard',
      focus: index === 1 ? [] : ['Virginia'],
      condition: 'Good',
      storage_location_id: 'cabinet-1',
      purchase_date: '2026-01-01',
    }));
    mocks.reportData = {
      pipes,
      blends: [],
      bottles: [],
      cigars: [],
      wines: [],
      smokingLogs: [],
      cellarLogs: [],
      pipeMaintenance: [],
      tastingLogs: [],
      bottleFills: [],
      cigarSessions: [],
      cigarRatings: [],
      humidors: [],
      humidorReadings: [],
      humidorMaintenance: [],
      wineTastings: [],
      wineInspections: [],
      locations: [],
      valuations: [],
      collectionActivity: [],
      isLoading: false,
      isError: false,
    };
    mocks.entities.SavedReportConfig.filter.mockResolvedValue([]);
    Object.entries(mocks.entities).forEach(([name, entity]) => {
      if (name !== 'Pipe') entity.filter.mockResolvedValue([]);
    });
  });

  it('opens the filtered report, exact supporting pipe, and CSV export from Curator controls', async () => {
    renderJourney();

    fireEvent.change(screen.getByPlaceholderText('Ask about your collection…'), {
      target: { value: 'Show my pipe report for pipes that need a specialization' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    fireEvent.click(await screen.findByRole('link', { name: 'Open Pipe Specialization Analysis' }));
    await screen.findByText('Pipes without a specialization');
    await screen.findByRole('link', { name: 'Pipe needing specialization' });
    expect(await screen.findByText('Records in scope:')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Pipe needing specialization' }).getAttribute('href'))
      .toBe('/PipeDetail?id=pipe-1');

    fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    await waitFor(() => expect(mocks.downloadCsv).toHaveBeenCalledTimes(1));
    const exportedResult = mocks.downloadCsv.mock.calls[0][0];
    expect(exportedResult.recordCount).toBe(2);
    expect(exportedResult.tables.find((table) => table.id === 'unspecialized').rows)
      .toHaveLength(1);
    const csv = buildReportCsv(exportedResult);
    expect(csv).toContain('2');
    expect(csv).toContain('Pipe needing specialization');
    expect(csv).not.toContain('Pipe 0');

    fireEvent.click(screen.getByRole('link', { name: 'Pipe needing specialization' }));
    expect(screen.getAllByTestId('location').some((node) => (
      node.textContent === '/PipeDetail?id=pipe-1'
    ))).toBe(true);
  });
});
