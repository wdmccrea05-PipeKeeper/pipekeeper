import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExpertTobacconistChat from '../ExpertTobacconistChat.jsx';
import { base44 } from '@/api/base44Client';

vi.mock('@/api/base44Client', () => ({
  base44: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('ExpertTobacconistChat deterministic routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('answers simple factual chat queries before invoking the LLM', async () => {
    render(
      <ExpertTobacconistChat
        collectionContext={{
          bottles: [{ id: 'b1', name: 'Bottle A', is_open: false }],
          inventoryUnits: [],
        }}
        activeModules={{ whiskeykeeper: true }}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Ask about your collection…'), {
      target: { value: 'How many unopened bottles do I have?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(screen.getByText('You have 1 unopened bottle.')).toBeTruthy();
    });
    expect(base44.functions.invoke).not.toHaveBeenCalled();
  });

  it('keeps multi-module context available for deterministic collection facts', async () => {
    render(
      <ExpertTobacconistChat
        collectionContext={{
          wines: [{ id: 'w1', name: 'Wine A', quantity: 0 }],
          cigars: [{ id: 'c1', name: 'Cigar A', quantity: 2 }],
          pairingMatrixPairings: [{ pipe_name: 'Pipe A', recommendations: [{ tobacco_name: 'Blend A', score: 5 }] }],
          inventoryUnits: [{ id: 'u1', bottle_id: 'b1', status: 'opened' }],
        }}
        activeModules={{ winekeeper: true, cigarkeeper: true, pipekeeper: true, whiskeykeeper: true }}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Ask about your collection…'), {
      target: { value: 'Which wines have quantity 0?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(screen.getByText('Wines with quantity 0: Wine A.')).toBeTruthy();
    });
    expect(base44.functions.invoke).not.toHaveBeenCalled();
  });
});
