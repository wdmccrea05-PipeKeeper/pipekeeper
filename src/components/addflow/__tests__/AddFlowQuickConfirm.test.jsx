import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddFlowQuickConfirm from '@/components/addflow/AddFlowQuickConfirm';

const { createMock, meMock, successMock, errorMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  meMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn(),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: { me: meMock },
    entities: {
      Pipe: { create: createMock },
      TobaccoBlend: { create: vi.fn() },
      Bottle: { create: vi.fn() },
      Cigar: { create: vi.fn() },
      Wine: { create: vi.fn() },
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: successMock,
    error: errorMock,
  },
}));

describe('AddFlowQuickConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    meMock.mockResolvedValue({ email: 'user@example.com' });
    createMock.mockResolvedValue({ id: 'pipe-1', name: 'Test Pipe' });
  });

  it('initializes empty pipe photo arrays when creating from quick confirm', async () => {
    const onCreated = vi.fn();
    render(
      <AddFlowQuickConfirm
        itemType="pipe"
        typeLabel="Pipe"
        result={{ name: 'Test Pipe', maker: 'Maker' }}
        onBack={vi.fn()}
        onSearchAgain={vi.fn()}
        onManual={vi.fn()}
        onCreated={onCreated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /add to collection/i }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: [],
        stamping_photos: [],
      })
    );
  });
});
