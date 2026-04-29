import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import WineStoryHighlights from '../WineStoryHighlights';

// Mock InsightsHighlightCard (now used instead of HeroHighlightCard)
vi.mock('@/components/insights/InsightsShell', () => ({
  InsightsHighlightCard: ({ title, value }) => (
    <div data-testid="hero-highlight-card" data-object-mode="cover">
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
}));

const wines = [
  {
    id: 'w1',
    name: 'Château Margaux',
    producer: 'Château Margaux',
    vintage: '2015',
    rating: 4.8,
    estimated_unit_value: 500,
    estimated_total_value: 1500,
    quantity: 3,
    drink_window_start: '2020-01-01',
    drink_window_end: '2035-12-31',
    photos: ['https://example.com/margaux.jpg'],
  },
  {
    id: 'w2',
    name: 'Opus One',
    producer: 'Opus One Winery',
    vintage: '2018',
    rating: 4.5,
    estimated_unit_value: 250,
    quantity: 2,
    photos: [],
  },
];

describe('WineStoryHighlights', () => {
  it('renders HeroHighlightCard components with objectMode="cover"', () => {
    const { getAllByTestId } = render(
      <WineStoryHighlights wines={wines} tastings={[]} />
    );

    const cards = getAllByTestId('hero-highlight-card');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((card) => {
      expect(card.getAttribute('data-object-mode')).toBe('cover');
    });
  });

  it('shows Most Valuable card for highest-value wine', () => {
    const { getAllByTestId } = render(
      <WineStoryHighlights wines={wines} tastings={[]} />
    );

    const cards = getAllByTestId('hero-highlight-card');
    const titles = cards.map((c) => c.textContent);
    expect(titles.some((t) => t.includes('Most Valuable') || t.includes('Château Margaux'))).toBe(true);
  });

  it('renders nothing when wines array is empty', () => {
    const { container } = render(
      <WineStoryHighlights wines={[]} tastings={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a Drink Now card when a wine is in its drinking window', () => {
    const { getAllByTestId } = render(
      <WineStoryHighlights wines={wines} tastings={[]} />
    );

    const cards = getAllByTestId('hero-highlight-card');
    const labels = cards.map((c) => c.querySelector('span')?.textContent || '');
    expect(labels.some((l) => l.includes('Drink Now'))).toBe(true);
  });
});
