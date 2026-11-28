import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import InsightHighlightCard from '@/components/insights/InsightHighlightCard';
import { getHighlightPhotos } from '@/lib/images/getItemPhoto';

it('tries saved label photos before legacy logos and skips unusable entries', () => {
  expect(getHighlightPhotos({ photos: [null, { url: '/label.jpg' }], logo: '/old.jpg', photo: '/label.jpg' }, true))
    .toEqual(['/label.jpg', '/old.jpg']);
});

it('tries the next photo on error and retains the clickable card without images', () => {
  const onClick = vi.fn();
  const { container } = render(<InsightHighlightCard title="Highlights" value="Saved record" photos={['/old.jpg', '/label.jpg']} onClick={onClick} />);
  const photo = () => container.querySelector('img');
  expect(photo().getAttribute('src')).toBe('/old.jpg');
  fireEvent.error(photo());
  expect(photo().getAttribute('src')).toBe('/label.jpg');
  fireEvent.error(photo());
  expect(photo()).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Saved record/ }));
  expect(onClick).toHaveBeenCalledOnce();
});
