import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ExpertTobacconistChat from '@/components/agent/ExpertTobacconistChat';
import { appGuidance, restoreAppGuidance } from '@/lib/curator/curatorAppGuidance';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/api/base44Client', () => ({
  base44: {
    functions: { invoke },
    entities: { StorageLocation: { filter: vi.fn().mockResolvedValue([]) } },
  },
}));
vi.mock('@/components/curator/useCuratorRecordProposals', () => ({
  default: () => ({ applyActions: vi.fn(), undoMessage: vi.fn(), runUndo: vi.fn() }),
}));

function Location() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname}{search}</output>;
}

beforeEach(() => {
  invoke.mockReset().mockResolvedValue({ data: { messages: [] } });
  window.localStorage.clear();
});

describe('Curator app guidance', () => {
  it.each([
    ['How do I merge duplicate blends?', 'Review duplicate blends', '/CollectionTools?tab=duplicates&module=TobaccoBlend'],
    ['How do I import cigars from Excel?', 'Start cigars import', '/Import?type=cigarkeeper_cigars'],
  ])('opens the requested workflow directly from the answer: %s', async (question, action, destination) => {
    render(
      <MemoryRouter initialEntries={['/Curator']}>
        <ExpertTobacconistChat collectionContext={{}} activeModules={{ pipekeeper: true, cigarkeeper: true }} userEmail="a@example.com" />
        <Location />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('Ask about your collection…'), { target: { value: question } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    const link = await screen.findByRole('link', { name: action });
    if (question.includes('Excel')) expect(screen.getByText(/Excel files must first be saved as CSV/)).toBeTruthy();
    fireEvent.click(link);
    expect(screen.getByTestId('location').textContent).toBe(destination);
    expect(invoke.mock.calls.some(([name]) => name === 'invokeCuratorLLM')).toBe(false);
  });

  it('does not route ambiguous modules and offers settings when the requested module is disabled', () => {
    expect(appGuidance('How do I import pipes and cigars?', {})).toBeNull();
    expect(appGuidance('How do I import cigars and export a report?', {})).toBeNull();
    expect(appGuidance('How do I import cigars?', { cigarkeeper: false }).recordLinks[0].to).toBe('/Profile');
    expect(appGuidance('Merge duplicate blends', { pipekeeper: true })).toBeNull();
  });

  it('resumes the exact saved import batch from Curator', async () => {
    const batch = { batchId: 'batch-12345678', importType: 'pipekeeper_pipes' };
    const guidance = appGuidance('Review this import batch', {}, { importBatchContext: batch });
    expect(guidance.recordLinks[0]).toMatchObject({
      to: '/Import?batch=batch-12345678&type=pipekeeper_pipes',
      label: 'Open import preview',
    });

    render(
      <MemoryRouter initialEntries={['/Curator']}>
        <ExpertTobacconistChat
          collectionContext={{}}
          activeModules={{ pipekeeper: true }}
          initialImportBatchContext={batch}
          userEmail="a@example.com"
        />
        <Location />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('Ask about your collection…'), { target: { value: 'Review this import batch' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Open import preview' }));
    expect(screen.getByTestId('location').textContent).toBe('/Import?batch=batch-12345678&type=pipekeeper_pipes');
    expect(invoke.mock.calls.some(([name]) => name === 'invokeCuratorLLM')).toBe(false);
  });

  it('opens the requested shared report from the Curator response', async () => {
    render(
      <MemoryRouter initialEntries={['/Curator']}>
        <ExpertTobacconistChat collectionContext={{}} activeModules={{ pipekeeper: true }} userEmail="a@example.com" />
        <Location />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('Ask about your collection…'), { target: { value: 'I need a collection report' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Open Collection Overview' }));
    expect(screen.getByTestId('location').textContent).toBe('/ReportingCenter?report=overview');
    expect(invoke.mock.calls.some(([name]) => name === 'invokeCuratorLLM')).toBe(false);
  });

  it('restores links only for matching guidance answers under current module access', () => {
    const question = 'How do I import cigars?';
    const guidance = appGuidance(question, { cigarkeeper: true });
    const history = [{ role: 'user', content: question }, { role: 'assistant', content: guidance.content }];
    expect(restoreAppGuidance(history, { cigarkeeper: true })[1].recordLinks).toEqual(guidance.recordLinks);
    expect(restoreAppGuidance(history, { cigarkeeper: false })[1].recordLinks).toBeUndefined();
    expect(restoreAppGuidance([history[0], { role: 'assistant', content: 'Different answer' }], {})[1].recordLinks).toBeUndefined();
  });
});
