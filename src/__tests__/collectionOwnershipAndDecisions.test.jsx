import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import CollectionTools from '@/pages/CollectionTools';
import FindingsReviewPanel from '@/components/actions/FindingsReviewPanel';
import { buildFindings } from '@/lib/actions/collectionFindings';
import { loadFindingStates, saveFindingState } from '@/lib/actions/findingState';
import { listOwnedCollectionRecords, findDuplicateGroups } from '../../base44/shared/collectionRecords.ts';

const mocks = vi.hoisted(() => ({
  user: { id: 'a', email: 'a@example.com' },
  filter: vi.fn(),
  stateFilter: vi.fn(),
  stateCreate: vi.fn(),
  stateUpdate: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      Pipe: { filter: mocks.filter },
      CollectionFindingState: { filter: mocks.stateFilter, create: mocks.stateCreate, update: mocks.stateUpdate },
    },
  },
}));
vi.mock('@/components/hooks/useCurrentUser', () => ({ useCurrentUser: () => ({ user: mocks.user, isLoading: false }) }));
vi.mock('@/hooks/useActionExecution', () => ({
  default: () => ({ status: 'idle', result: null, error: '', execute: mocks.execute, undo: vi.fn(), reset: vi.fn() }),
}));
vi.mock('@/components/collection/BulkEditPanel', () => ({ default: () => null }));
vi.mock('@/components/collection/DuplicateReviewPanel', () => ({ default: () => null }));
vi.mock('@/components/actions/ActionReviewDialog', () => ({
  default: ({ open, onConfirm, onCancel }) => open ? (
    <div role="dialog"><button onClick={onConfirm}>Confirm</button><button onClick={onCancel}>Cancel</button></div>
  ) : null,
}));

function wrapper(children) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'a', email: 'a@example.com' };
});

describe('owned collection tools', () => {
  it('paginates SDK arrays, filters foreign rows, and clears results on account switch', async () => {
    let resolveA;
    mocks.filter.mockImplementation((filter, _sort, _limit, skip) => {
      if (filter.created_by === 'a@example.com' && skip === 0) {
        return new Promise((resolve) => { resolveA = resolve; });
      }
      if (filter.created_by === 'b@example.com') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const view = render(wrapper(<CollectionTools />));
    await waitFor(() => expect(resolveA).toBeTypeOf('function'));
    mocks.user = { id: 'b', email: 'b@example.com' };
    view.rerender(wrapper(<CollectionTools />));
    resolveA([{ id: 'a1', name: 'Same name', created_by: 'a@example.com' }]);
    await screen.findByText('No records match these filters.');
    expect(screen.queryByText('Same name')).toBeNull();
    expect(mocks.filter).toHaveBeenCalledWith({ created_by: 'b@example.com' }, '-created_date', 500, 0);
  });

  it('shows all owned pages and rejects foreign records even with overlapping names', async () => {
    const page = Array.from({ length: 500 }, (_, i) => ({ id: `a${i}`, name: `Owned ${i}`, created_by: 'a@example.com' }));
    mocks.filter.mockImplementation((_filter, _sort, _limit, skip) => Promise.resolve(skip === 0
      ? page
      : [{ id: 'last', name: 'Last owned', created_by: 'a@example.com' }, { id: 'foreign', name: 'Foreign record', created_by: 'b@example.com' }]));
    render(wrapper(<CollectionTools />));
    expect(await screen.findByText('Last owned')).toBeTruthy();
    expect(screen.queryByText('Foreign record')).toBeNull();
    expect(screen.getByText('501 shown · 0 selected')).toBeTruthy();
  });
});

describe('finding decisions', () => {
  it('loads SDK arrays and updates an existing decision instead of creating duplicates', async () => {
    mocks.stateFilter.mockResolvedValue([{ id: 's1', user_email: 'a@example.com', finding_key: 'storage:Pipe:p1', status: 'deferred' }]);
    expect((await loadFindingStates('a@example.com'))['storage:Pipe:p1'].status).toBe('deferred');
    await saveFindingState({ email: 'a@example.com', finding: { key: 'storage:Pipe:p1' }, status: 'dismissed' });
    expect(mocks.stateUpdate).toHaveBeenCalledWith('s1', expect.objectContaining({ status: 'dismissed' }));
    expect(mocks.stateCreate).not.toHaveBeenCalled();
  });

  it('surfaces a failed page instead of treating partial decisions as complete', async () => {
    mocks.stateFilter.mockRejectedValue(new Error('offline'));
    await expect(loadFindingStates('a@example.com')).rejects.toThrow('offline');
  });
});

describe('duplicate scan ownership', () => {
  it('paginates both owner identifiers without mixing another account with the same item', async () => {
    const rows = [
      { id: '1', name: 'Shared', maker: 'Maker', created_by: 'a@example.com' },
      { id: '2', name: 'Shared', maker: 'Maker', created_by_id: 'a' },
      { id: '3', name: 'Shared', maker: 'Maker', created_by: 'b@example.com', created_by_id: 'b' },
    ];
    const entity = { filter: vi.fn(async (filter, _sort, limit, skip) =>
      rows.filter((row) => Object.entries(filter).every(([key, value]) => row[key] === value)).slice(skip, skip + limit)) };
    const owned = await listOwnedCollectionRecords(entity, { id: 'a', email: 'a@example.com', role: 'admin' }, 1);
    expect(owned.map((row) => row.id)).toEqual(['1', '2']);
    expect(findDuplicateGroups(owned, 'Pipe')).toHaveLength(1);
    expect(await listOwnedCollectionRecords(entity, { id: 'empty', email: 'empty@example.com' }, 1)).toEqual([]);
  });
});

describe('finding action review', () => {
  it('requires an explicit location choice and submits the chosen alternative only after confirmation', async () => {
    const finding = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records: [{ id: 'p1', name: 'Pipe one' }] }],
      locations: [{ id: 'one', name: 'Cabinet', module: 'pipes' }, { id: 'two', name: 'Shelf', module: 'pipes' }],
    }).find((entry) => entry.type === 'storage');
    mocks.execute.mockResolvedValue({ completed: 1, rows: [] });
    const changeState = vi.fn();
    render(wrapper(<FindingsReviewPanel findings={[finding]} onStateChange={changeState} />));
    fireEvent.click(screen.getByRole('checkbox', { name: finding.title }));
    expect(screen.getByRole('button', { name: /Apply selected/ }).disabled).toBe(true);
    fireEvent.change(screen.getByRole('combobox', { name: 'Location for Pipe one' }), { target: { value: 'storage_two' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply selected/ }));
    expect(mocks.execute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledWith(
      [finding.actions[0]], expect.objectContaining({ alternatives: { [finding.actions[0].id]: 'storage_two' } })
    ));
    expect(changeState).not.toHaveBeenCalled();
  });
});
