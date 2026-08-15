/* eslint-disable */
/**
 * CollectionQueryError component tests
 *
 * Tests the error banner component that surfaces data-load failures
 * without overwriting last-known-good state.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import CollectionQueryError from '@/components/ui/CollectionQueryError';

describe('CollectionQueryError — error banner behavior', () => {
  it('renders nothing when isError is false', () => {
    const { container } = render(
      React.createElement(CollectionQueryError, { isError: false })
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders error banner with retry button when isError is true', () => {
    const onRetry = vi.fn();
    const { getByText } = render(
      React.createElement(CollectionQueryError, {
        isError: true,
        onRetry,
        label: 'Could not load pipes.',
      })
    );
    expect(getByText('Could not load pipes.')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('shows default message when no label provided', () => {
    const { getByText } = render(
      React.createElement(CollectionQueryError, { isError: true })
    );
    expect(
      getByText('Some data could not be loaded. Your existing collection is still visible.')
    ).toBeTruthy();
  });

  it('does not render retry button when onRetry is not provided', () => {
    const { queryByText } = render(
      React.createElement(CollectionQueryError, { isError: true, label: 'Error.' })
    );
    expect(queryByText('Retry')).toBeNull();
  });
});