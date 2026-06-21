import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Wines from '@/pages/Wines';
import { I18nProvider, translate } from '@/components/i18n/safeTranslation';

const { sampleWines } = vi.hoisted(() => ({
  sampleWines: [
    {
      id: 'wine-1',
      name: 'Test Wine',
      producer: 'Test Producer',
      vintage: 2018,
      region: 'Napa',
      appellation: 'Oak Knoll',
      varietal: 'Cabernet Sauvignon',
      style: 'red',
      quantity: 2,
      rating: 4,
      estimated_value: 12500,
      created_by: 'test@example.com',
    },
  ],
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: sampleWines, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      Wine: {
        filter: vi.fn().mockResolvedValue(sampleWines),
        delete: vi.fn().mockResolvedValue({}),
      },
    },
  },
}));

vi.mock('@/components/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { email: 'test@example.com' } }),
}));

vi.mock('@/lib/currency/useCurrency', () => ({
  useCurrency: () => ({
    formatFromBase: (value) => `$${Number(value || 0).toFixed(0)}`,
  }),
}));

vi.mock('@/components/modules/WineKeeperModuleNav', () => ({
  default: () => <div>nav</div>,
}));

vi.mock('@/components/wine/WineForm', () => ({
  default: () => null,
}));

vi.mock('@/components/wine/LogWineTastingModal', () => ({
  default: () => null,
}));

vi.mock('@/components/addflow/AddFlowModal', () => ({
  default: () => null,
}));

vi.mock('@/components/shared/EnrichButton', () => ({
  default: () => <button type="button">Enrich</button>,
}));

vi.mock('@/components/wantlist/AddToWantListModal', () => ({
  default: () => null,
}));

describe('Wines i18n coverage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders wine collection controls in german', () => {
    render(
      <I18nProvider languageOverride="de">
        <Wines />
      </I18nProvider>
    );

    expect(screen.getByRole('button', { name: translate('common.listView', {}, 'de') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: translate('wine.addBottle', {}, 'de') })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(translate('wine.searchPlaceholder', {}, 'de'))).toBeInTheDocument();
  });

  it('renders wine list actions in japanese without english fallbacks', () => {
    localStorage.setItem('wineViewMode', 'list');

    render(
      <I18nProvider languageOverride="ja">
        <Wines />
      </I18nProvider>
    );

    expect(screen.getByRole('button', { name: translate('common.delete', {}, 'ja') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: translate('common.edit', {}, 'ja') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: translate('wine.listLog', {}, 'ja') })).toBeInTheDocument();
  });
});
