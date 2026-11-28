import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '@/components/i18n/safeTranslation';
import FeatureQuickAccess from '@/components/navigation/FeatureQuickAccess';

vi.mock('@/components/hooks/useModuleVisibility', () => ({
  useModuleVisibility: () => ({ isModuleEnabled: (module) => module === 'pipekeeper' }),
}));
vi.mock('@/components/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { role: 'user' } }),
}));

describe.each([
  ['en', 'Pipes', 'Profile'],
  ['es', 'Pipas', 'Perfil'],
])('Quick Access in %s', (lang, pipes, profile) => {
  it('renders translated labels and opens the pipe collection', () => {
    const onClose = vi.fn();
    render(
      <I18nProvider languageOverride={lang}>
        <MemoryRouter initialEntries={['/']}>
          <FeatureQuickAccess isOpen onClose={onClose} />
          <Routes><Route path="/Pipes" element={<p>Destination reached</p>} /></Routes>
        </MemoryRouter>
      </I18nProvider>
    );
    expect(screen.getByText(profile)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(pipes) }));
    expect(screen.getByText('Destination reached')).toBeTruthy();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
