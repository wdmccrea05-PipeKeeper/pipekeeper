import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImportPage from '@/pages/Import';
import { loadImportBatch } from '@/lib/imports/importBatchStore';

const mocks = vi.hoisted(() => ({
  entities: {
    Pipe: { filter: vi.fn(), create: vi.fn() },
    TobaccoBlend: { filter: vi.fn(), create: vi.fn() },
    Bottle: { filter: vi.fn(), create: vi.fn() },
    Cigar: { filter: vi.fn(), create: vi.fn() },
    Wine: { filter: vi.fn(), create: vi.fn() },
    HumidorLocation: { filter: vi.fn() },
  },
  scoped: {
    Pipe: { create: vi.fn() },
    TobaccoBlend: { create: vi.fn() },
  },
  accessibleModules: { pipekeeper: true, whiskeykeeper: true, cigarkeeper: true, winekeeper: true },
}));

vi.mock('@/api/base44Client', () => ({ base44: { entities: mocks.entities } }));
vi.mock('@/components/api/scopedEntities', () => ({ scopedEntities: mocks.scoped }));
vi.mock('@/components/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { email: 'collector@example.com' }, hasPaid: true }),
}));
vi.mock('@/components/hooks/useEnabledModules', () => ({
  useEnabledModules: () => ({
    accessible: mocks.accessibleModules,
    isLoading: false,
  }),
}));
vi.mock('@/components/i18n/safeTranslation', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      const translations = {
        'import.bulkImport': 'Bulk Import',
        'import.curatorReviewBatch': 'Ask Curator to review this batch',
        'import.batchSaved': 'This batch is saved across browser sessions in this browser, scoped to your account.',
        'import.duplicatePolicy': 'Add new items only.',
        'import.confirmImportRows': 'Confirm and import {count} row(s)',
      };
      const template = translations[key] || (typeof fallbackOrOptions === 'string' ? fallbackOrOptions : key);
      if (fallbackOrOptions && typeof fallbackOrOptions === 'object') {
        return Object.entries(fallbackOrOptions).reduce(
          (text, [name, value]) => text.replaceAll(`{${name}}`, value),
          template
        );
      }
      return template;
    },
  }),
}));

function LocationOutput() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname}{search}</output>;
}

function renderImport(path) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/Import" element={<ImportPage />} />
          <Route path="/Curator" element={<LocationOutput />} />
        </Routes>
        <LocationOutput />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Curator import batch handoff', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    Object.values(mocks.entities).forEach((entity) => entity.filter?.mockReset().mockResolvedValue([]));
    mocks.scoped.Pipe.create.mockReset();
    mocks.scoped.TobaccoBlend.create.mockReset();
  });

  it('saves an uploaded CSV, opens Curator with the batch, and restores it on return', async () => {
    const batchId = 'import-batch-123456';
    const path = `/Import?batch=${batchId}&type=pipekeeper_pipes`;
    const page = renderImport(path);
    await screen.findByText(`Batch ${batchId}`);

    const csvText = 'maker,shape\nPeterson,Billiard\n,Shape\n';
    const file = new File([csvText], 'pipes.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { value: async () => csvText });
    const fileInput = page.container.querySelector('input[type="file"]');
    await waitFor(() => expect(fileInput.disabled).toBe(false));
    fireEvent.change(fileInput, { target: { files: [file] } });

    await screen.findByText('Import Preview');
    const handoff = await screen.findByRole('link', { name: 'Ask Curator to review this batch' });
    await waitFor(() => {
      expect(loadImportBatch(window.localStorage, 'collector@example.com', batchId)).toMatchObject({
        fileName: 'pipes.csv',
        mappings: [
          { source: 'maker', target: 'maker' },
          { source: 'shape', target: 'shape' },
        ],
        unresolvedRows: [3],
      });
    });

    fireEvent.click(handoff);
    expect(screen.getAllByTestId('location').some((node) => (
      node.textContent === `/Curator?batch=${batchId}&type=pipekeeper_pipes&prompt=Review%20this%20import%20batch`
    ))).toBe(true);

    page.unmount();
    renderImport(path);
    expect(await screen.findByText(/Batch import-batch-123456 · pipes\.csv/)).toBeTruthy();
    expect(await screen.findByText('Import Preview')).toBeTruthy();
    expect(await screen.findByText('Peterson Billiard')).toBeTruthy();
  });
});
