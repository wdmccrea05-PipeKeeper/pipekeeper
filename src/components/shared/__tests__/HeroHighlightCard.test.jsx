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

  it('bottle mode renders blurred background and foreground image when photo is provided', () => {
    const { container } = render(
      <HeroHighlightCard
        title="Top Wine"
        value="Test Wine"
        photo="https://example.com/bottle.jpg"
        objectMode="bottle"
      />
    );

    // Should have a blurred background div
    const blurredBg = container.querySelector('[style*="blur"]');
    expect(blurredBg).toBeTruthy();

    // Should have foreground img element
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('bottle.jpg');
  });

  it('bottle mode does NOT render the unblurred cover background when photo is provided', () => {
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
    const unblurredCoverDivs = Array.from(allDivs).filter((div) => {
      const style = div.getAttribute('style') || '';
      return (
        style.includes('bottle.jpg') &&
        style.includes('backgroundSize') &&
        !style.includes('blur')
      );
    });
    expect(unblurredCoverDivs.length).toBe(0);
  });

  it('bottle mode foreground image has constrained maxHeight and maxWidth', () => {
    const { container } = render(
      <HeroHighlightCard
        title="Top Wine"
        value="Test Wine"
        photo="https://example.com/bottle.jpg"
        objectMode="bottle"
      />
    );

    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    // maxHeight should be 88%, maxWidth should be within 42-48% range
    expect(img.style.maxHeight).toBe('88%');
    const maxWidth = parseFloat(img.style.maxWidth);
    expect(maxWidth).toBeGreaterThanOrEqual(42);
    expect(maxWidth).toBeLessThanOrEqual(48);
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
