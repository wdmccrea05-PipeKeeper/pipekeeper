import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from '@/Layout';

vi.mock('@/components/hooks/useCurrentUser', () => ({ useCurrentUser: () => ({ user: { role: 'user' } }) }));
vi.mock('@/components/hooks/useEnabledKeeperModules', () => ({
  useEnabledModules: () => ({ enabled: { pipekeeper: true, whiskeykeeper: true, cigarkeeper: true, winekeeper: true } }),
}));
vi.mock('@/components/branding/BrandLogo', () => ({ default: () => <span>CollectionKeeper</span> }));
vi.mock('@/components/nav/CurrencySwitcher', () => ({ default: () => null }));
vi.mock('@/components/LanguageSwitcher', () => ({ default: () => null }));
vi.mock('@/components/navigation/BackButton', () => ({ default: () => null }));
vi.mock('@/components/navigation/FeatureQuickAccess', () => ({ default: () => null }));
vi.mock('@/components/referral/GlobalReferralBanner', () => ({ default: () => null }));
vi.mock('@/components/campaign/AppreciationNotificationCenter', () => ({ default: () => null }));

describe('shared navigation', () => {
  it('exposes and closes the mobile Curator link with an announced expanded state', () => {
    render(<MemoryRouter><Layout currentPageName="CollectionHub"><p>Workspace</p></Layout></MemoryRouter>);
    const menu = screen.getByRole('button', { name: 'Open menu' });
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(menu);
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    const drawer = document.getElementById('mobile-module-navigation');
    const curator = within(drawer).getByRole('link', { name: 'Curator' });
    expect(curator.getAttribute('href')).toBe('/Curator');
    fireEvent.click(curator);
    expect(screen.getByRole('button', { name: 'Open menu' }).getAttribute('aria-expanded')).toBe('false');
  });
});
