import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FindingsReviewPanel from '@/components/actions/FindingsReviewPanel';
import { buildFindings } from '@/lib/actions/collectionFindings';
import { buildExecutionPayload } from '@/lib/actions/actionModel';
import { SUPPORTED_LANGS, translate } from '@/components/i18n/safeTranslation';

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('@/hooks/useActionExecution', () => ({
  default: () => ({ status: 'idle', result: null, error: '', execute: mocks.execute, undo: vi.fn(), reset: vi.fn() }),
}));

describe('bulk storage review', () => {
  it('provides the new controls and interpolated batch title in every supported language', () => {
    for (const { code } of SUPPORTED_LANGS) {
      for (const key of ['selectFindings', 'clearFindings', 'locationForSelected', 'chooseLocation', 'storageBatchTitle', 'storageLabel', 'reviewTargetList']) {
        const value = translate(`collectionIntelligence.${key}`, { count: 12 }, code);
        expect(value).not.toBe(`collectionIntelligence.${key}`);
        if (key === 'storageBatchTitle') expect(value).toContain('12');
      }
    }
    expect(translate('collectionIntelligence.chooseLocation', {}, 'es')).toBe('Seleccionar una ubicación');
  });

  it('excludes records, requires a location, previews and splits more than 200 targets before execution', async () => {
    const records = Array.from({ length: 202 }, (_, index) => ({ id: `p${index}`, name: `Pipe ${index}` }));
    const findings = buildFindings({
      collections: [{ moduleKey: 'pipekeeper', records }],
      locations: [{ id: 'one', name: 'Cabinet', module: 'pipes' }, { id: 'two', name: 'Shelf', module: 'pipes' }],
    }).filter((finding) => finding.type === 'storage');
    mocks.execute.mockResolvedValue({ ok: true });
    render(<MemoryRouter><FindingsReviewPanel findings={findings} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Select all eligible records' }));
    fireEvent.click(screen.getByLabelText('Assign storage for Pipe 0'));
    expect(screen.getByText('Apply selected (201)').disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Location for selected records'), { target: { value: 'storage_two' } });
    fireEvent.click(screen.getByText('Apply selected (201)'));

    let dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Assign storage (200)')).toBeTruthy();
    expect(within(dialog).getByText('Assign storage (1)')).toBeTruthy();
    expect(within(dialog).getAllByText('Shelf')).toHaveLength(2);
    expect(within(dialog).getByText(/1 record: Pipe 201/)).toBeTruthy();
    expect(within(dialog).queryByText('Pipe 0')).toBeNull();
    expect(mocks.execute).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(mocks.execute).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Apply selected (201)'));
    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledOnce());

    const [actions, options] = mocks.execute.mock.calls[0];
    expect(actions.map((action) => action.targets.length)).toEqual([200, 1]);
    const payload = buildExecutionPayload(actions, options);
    const targets = payload.actions.flatMap((action) => action.targets);
    expect(targets).toHaveLength(201);
    expect(targets.some((target) => target.recordId === 'p0')).toBe(false);
    expect(targets.every((target) => target.patch.storage_location_id === 'two')).toBe(true);
    expect(targets.every((target) => target.expected.storage_location_id === '')).toBe(true);
    expect(payload.actions.every((action) => action.module === 'pipekeeper')).toBe(true);
  }, 30000);
});
