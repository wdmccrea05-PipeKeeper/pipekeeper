import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import TobaccoPage from '@/pages/Tobacco';

const safeUpdateMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const setQueryDataMock = vi.fn();
const cancelQueriesMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('@/components/utils/navigation', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/components/api/scopedEntities', () => ({
  scopedEntities: {
    TobaccoBlend: {
      listForUser: vi.fn().mockResolvedValue([
        {
          id: 'blend-1',
          name: 'Old Blend',
          manufacturer: 'Maker',
          created_by: 'test@example.com',
          flavor_profile: ['Sweet'],
        },
      ]),
      create: vi.fn(),
    },
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      {
        id: 'blend-1',
        name: 'Old Blend',
        manufacturer: 'Maker',
        created_by: 'test@example.com',
        flavor_profile: ['Sweet'],
      },
    ],
    isLoading: false,
  }),
  useMutation: (config) => ({
    isPending: false,
    mutate: async (variables) => {
      try {
        const result = await config.mutationFn(variables);
        config.onSuccess?.(result, variables);
      } catch (error) {
        config.onError?.(error, variables);
      }
    },
  }),
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
    setQueryData: setQueryDataMock,
    cancelQueries: cancelQueriesMock,
    getQueryData: vi.fn(() => []),
  }),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/components/utils/safeUpdate', () => ({
  safeUpdate: (...args) => safeUpdateMock(...args),
  safeBatchUpdate: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/components/utils/cacheInvalidation', () => ({
  invalidateBlendQueries: (...args) => invalidateQueriesMock(...args),
}));

vi.mock('@/components/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { email: 'test@example.com' }, isTrial: false }),
}));

vi.mock('@/components/utils/moduleEntitlements', () => ({
  hasModuleProAccess: () => true,
}));

vi.mock('@/components/i18n/safeTranslation', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

vi.mock('@/components/modules/PipeKeeperModuleNav', () => ({ default: () => <div /> }));
vi.mock('@/components/tobacco/TobaccoListItem', () => ({ default: () => <div /> }));
vi.mock('@/components/export/TobaccoExporter', () => ({ default: () => <div /> }));
vi.mock('@/components/ui/CollectorDisplayCard', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('@/components/tobacco/QuickEditPanel', () => ({ default: () => <div /> }));
vi.mock('@/components/tobacco/CellarDriftAlert', () => ({ default: () => <div /> }));
vi.mock('@/components/addflow/AddFlowModal', () => ({ default: () => null }));
vi.mock('@/components/EmptyState', () => ({ default: () => <div /> }));
vi.mock('@/components/utils/limitChecks', () => ({
  canCreateTobacco: vi.fn().mockResolvedValue({ canCreate: true }),
}));

vi.mock('@/components/tobacco/TobaccoCard', () => ({
  default: ({ blend, onEdit }) => (
    <button type="button" onClick={() => onEdit(blend)}>
      edit-{blend.id}
    </button>
  ),
}));

vi.mock('@/components/tobacco/TobaccoForm', () => ({
  default: ({ onSave }) => (
    <div>
      <span>mock-tobacco-form</span>
      <button
        type="button"
        onClick={() =>
          onSave({
            name: 'Updated Name',
            flavor_profile: ['Sweet'],
            notes: 'Updated',
          })
        }
      >
        submit-update
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ open, children }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }) => <div>{children}</div>,
  SheetHeader: ({ children }) => <div>{children}</div>,
  SheetTitle: ({ children }) => <div>{children}</div>,
}));

describe('TobaccoPage save flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('failed update shows user-facing error', async () => {
    const { toast } = await import('sonner');
    safeUpdateMock.mockRejectedValueOnce(new Error('Unable to update blend'));

    render(<TobaccoPage />);
    fireEvent.click(screen.getByRole('button', { name: 'edit-blend-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'submit-update' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Unable to update blend');
    });
  });

  it('successful update closes edit modal', async () => {
    safeUpdateMock.mockResolvedValueOnce({ id: 'blend-1' });

    render(<TobaccoPage />);
    fireEvent.click(screen.getByRole('button', { name: 'edit-blend-1' }));
    expect(screen.getByText('mock-tobacco-form')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'submit-update' }));

    await waitFor(() => {
      expect(screen.queryByText('mock-tobacco-form')).not.toBeInTheDocument();
    });
  });
});
