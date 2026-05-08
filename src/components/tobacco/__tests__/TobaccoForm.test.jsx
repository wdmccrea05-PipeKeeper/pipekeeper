import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TobaccoForm from '@/components/tobacco/TobaccoForm';

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      TobaccoLogoLibrary: {
        list: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
      },
    },
    integrations: {
      Core: {
        InvokeLLM: vi.fn(),
        UploadFile: vi.fn(),
      },
    },
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [] }),
  useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@/components/hooks/useEntitlements', () => ({ useEntitlements: () => ({}) }));
vi.mock('@/components/hooks/useCurrentUser', () => ({ useCurrentUser: () => ({ user: { email: 'test@example.com' } }) }));
vi.mock('@/components/utils/limitChecks', () => ({ canCreateTobacco: vi.fn().mockResolvedValue({ canCreate: true }) }));
vi.mock('@/components/utils/moduleEntitlements', () => ({ hasModuleProAccess: () => true }));
vi.mock('@/components/hooks/useRecentValues', () => ({ useRecentValues: () => ({ data: [] }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/components/i18n/safeTranslation', () => ({
  useTranslation: () => ({
    t: (key, fallback) => {
      const labels = {
        'tobaccoExtended.flavorNotesDesc': 'Select or enter flavor notes you detect in this blend',
        'tobaccoExtended.updateBlend': 'Update Blend',
        'common.cancel': 'Cancel',
        'common.add': 'Add',
      };

      if (typeof fallback === 'string') {
        return fallback;
      }

      return labels[key] || key;
    },
  }),
}));

vi.mock('@/components/pipes/ImageCropper', () => ({ default: () => null }));
vi.mock('@/components/forms/FieldWithInfo', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('@/components/PhotoUploader', () => ({ default: () => <div /> }));
vi.mock('@/components/ui/combobox', () => ({ Combobox: () => <div /> }));

describe('TobaccoForm flavor profile', () => {
  it('saves normalized flavor notes and reloads existing custom notes on edit', () => {
    const onSave = vi.fn();
    const blend = {
      id: 'blend-1',
      name: 'Old Dublin',
      manufacturer: 'Peterson',
      flavor_notes: 'Sweet, Molasses',
    };

    render(<TobaccoForm blend={blend} onSave={onSave} onCancel={vi.fn()} isLoading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /Flavor Profile/ }));

    expect(screen.getByText('Molasses')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove flavor note Molasses' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update Blend' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        flavor_notes: ['Sweet'],
      })
    );
  });
});
