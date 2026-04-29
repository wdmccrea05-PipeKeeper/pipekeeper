import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import HeroHighlightCard from '../HeroHighlightCard';

describe('HeroHighlightCard', () => {
  it('renders title and value', () => {
    const { getByText } = render(
      <HeroHighlightCard title="Most Valuable" value="Château Margaux" />
    );
    expect(getByText('Most Valuable')).toBeTruthy();
    expect(getByText('Château Margaux')).toBeTruthy();
  });

  it('bottle mode renders as cover (full-card image, no foreground thumbnail)', () => {
    const { container } = render(
      <HeroHighlightCard
        title="Top Wine"
        value="Test Wine"
        photo="https://example.com/bottle.jpg"
        objectMode="bottle"
      />
    );

    // No foreground img element — bottle mode now uses cover treatment
    const img = container.querySelector('img');
    expect(img).toBeNull();

    // Background div should use the photo url with cover sizing
    const allDivs = container.querySelectorAll('div[style]');
    const bgDiv = Array.from(allDivs).find((div) =>
      (div.getAttribute('style') || '').includes('bottle.jpg')
    );
    expect(bgDiv).toBeTruthy();
  });

  it('bottle mode renders cover background (unblurred) when photo is provided', () => {
    const { container } = render(
      <HeroHighlightCard
        title="Top Wine"
        value="Test Wine"
        photo="https://example.com/bottle.jpg"
        objectMode="bottle"
      />
    );

    // Find divs with backgroundImage set to the photo URL
    const allDivs = container.querySelectorAll('div[style]');
    const coverDivs = Array.from(allDivs).filter((div) => {
      const style = div.getAttribute('style') || '';
      return (
        style.includes('bottle.jpg') &&
        !style.includes('blur')
      );
    });
    expect(coverDivs.length).toBeGreaterThan(0);
  });

  it('bottle mode renders no foreground image (cover treatment, no thumbnail constraints)', () => {
    const { container } = render(
      <HeroHighlightCard
        title="Top Wine"
        value="Test Wine"
        photo="https://example.com/bottle.jpg"
        objectMode="bottle"
      />
    );

    // No foreground img should exist — bottle mode is now cover-only
    const img = container.querySelector('img');
    expect(img).toBeNull();
  });

  it('bottle mode renders fallback gradient when no photo', () => {
    const { container } = render(
      <HeroHighlightCard
        title="Top Wine"
        value="Test Wine"
        objectMode="bottle"
      />
    );

    // No foreground img should exist without a photo
    const img = container.querySelector('img');
    expect(img).toBeNull();
  });

  it('cover mode uses full background image without blur', () => {
    const { container } = render(
      <HeroHighlightCard
        title="Top Pipe"
        value="Billiard"
        photo="https://example.com/pipe.jpg"
        objectMode="cover"
      />
    );

    // No foreground img in cover mode
    const img = container.querySelector('img');
    expect(img).toBeNull();

    // Background div should use the photo url
    const allDivs = container.querySelectorAll('div[style]');
    const bgDiv = Array.from(allDivs).find((div) =>
      (div.getAttribute('style') || '').includes('pipe.jpg')
    );
    expect(bgDiv).toBeTruthy();
  });

  it('shows subtitle when provided', () => {
    const { getByText } = render(
      <HeroHighlightCard title="Category" value="Wine Name" subtitle="Producer · 2019" />
    );
    expect(getByText('Producer · 2019')).toBeTruthy();
  });
});
