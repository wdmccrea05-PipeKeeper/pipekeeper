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
  it('loads legacy string flavor notes into canonical flavor_profile and persists removal', () => {
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
        flavor_profile: ['Sweet'],
        flavor_notes: ['Sweet'],
      })
    );
  });

  it('adding custom flavor updates canonical formData flavor_profile in save payload', () => {
    const onSave = vi.fn();
    const { container } = render(<TobaccoForm blend={null} onSave={onSave} onCancel={vi.fn()} isLoading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /Flavor Profile/ }));
    fireEvent.change(screen.getByLabelText('Add custom flavor note…'), { target: { value: 'Molasses' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.submit(container.querySelector('form'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        flavor_profile: ['Molasses'],
      })
    );
  });

  it('toggling predefined chip updates canonical flavor_profile payload', () => {
    const onSave = vi.fn();
    const { container } = render(<TobaccoForm blend={null} onSave={onSave} onCancel={vi.fn()} isLoading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /Flavor Profile/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Sweet flavor note' }));
    fireEvent.submit(container.querySelector('form'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        flavor_profile: ['Sweet'],
      })
    );
  });

  it('invalid flavor_profile input normalizes safely to a string array', () => {
    const onSave = vi.fn();
    const blend = {
      id: 'blend-2',
      name: 'Safety Blend',
      manufacturer: 'Acme',
      flavor_profile: { bad: true },
    };

    fireEvent.submit(
      render(<TobaccoForm blend={blend} onSave={onSave} onCancel={vi.fn()} isLoading={false} />)
        .container.querySelector('form')
    );

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        flavor_profile: [],
        flavor_notes: [],
      })
    );
  });

  it('empty flavor_profile does not crash and saves clean arrays without undefined values', () => {
    const onSave = vi.fn();
    const blend = {
      id: 'blend-3',
      name: 'Empty Flavor Blend',
      manufacturer: 'Acme',
      flavor_profile: [],
      tobacco_components: ['Virginia', undefined, '  '],
    };

    fireEvent.submit(
      render(<TobaccoForm blend={blend} onSave={onSave} onCancel={vi.fn()} isLoading={false} />)
        .container.querySelector('form')
    );

    const payload = onSave.mock.calls[0][0];
    expect(payload.flavor_profile).toEqual([]);
    expect(payload.flavor_notes).toEqual([]);
    expect(payload.tobacco_components).toEqual(['Virginia']);
    expect(JSON.stringify(payload)).not.toContain('undefined');
  });

  it('omits immutable/system fields from edit payloads', () => {
    const onSave = vi.fn();
    const blend = {
      id: 'blend-immutable-1',
      name: 'Immutable Blend',
      manufacturer: 'Acme',
      created_date: '2026-01-01T00:00:00.000Z',
      updated_date: '2026-01-02T00:00:00.000Z',
      created_by: 'test@example.com',
      flavor_profile: ['Sweet'],
    };

    fireEvent.submit(
      render(<TobaccoForm blend={blend} onSave={onSave} onCancel={vi.fn()} isLoading={false} />)
        .container.querySelector('form')
    );

    const payload = onSave.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'Immutable Blend',
      manufacturer: 'Acme',
      flavor_profile: ['Sweet'],
      flavor_notes: ['Sweet'],
    });
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('created_date');
    expect(payload).not.toHaveProperty('updated_date');
    expect(payload).not.toHaveProperty('created_by');
  });
});
