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
});
