import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CuratorPairingsTab from '@/components/curator/CuratorPairingsTab';

function renderTab(props = {}) {
  return render(
    <CuratorPairingsTab
      pairings={[]}
      activeModules={{
        pipekeeper: true,
        whiskeykeeper: true,
        winekeeper: false,
        cigarkeeper: true,
      }}
      collectionStats={{
        pipes: 1,
        blends: 1,
        bottles: 2,
        wines: 0,
        cigars: 3,
      }}
      {...props}
    />
  );
}

describe('CuratorPairingsTab mode visibility', () => {
  it('shows whiskey pairing modes when whiskey inventory exists', () => {
    renderTab();

    expect(screen.getByRole('button', { name: 'Whiskey + Cigar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Whiskey + Pipe Session' })).toBeTruthy();
  });

  it('hides cigar pairing mode when user has no cigar inventory', () => {
    renderTab({
      collectionStats: {
        pipes: 1,
        blends: 1,
        bottles: 2,
        wines: 0,
        cigars: 0,
      },
    });

    expect(screen.queryByRole('button', { name: 'Whiskey + Cigar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Whiskey + Pipe Session' })).toBeTruthy();
  });

  it('shows wine pairing modes only when wine module and wine inventory are enabled', () => {
    renderTab({
      activeModules: {
        pipekeeper: true,
        whiskeykeeper: true,
        winekeeper: true,
        cigarkeeper: true,
      },
      collectionStats: {
        pipes: 1,
        blends: 1,
        bottles: 2,
        wines: 2,
        cigars: 3,
      },
    });

    expect(screen.getByRole('button', { name: 'Wine + Cigar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Wine + Pipe Session' })).toBeTruthy();
  });

  it('shows empty-state message when no pairing families are available', () => {
    renderTab({
      activeModules: {
        pipekeeper: false,
        whiskeykeeper: false,
        winekeeper: false,
        cigarkeeper: false,
      },
      collectionStats: {
        pipes: 0,
        blends: 0,
        bottles: 0,
        wines: 0,
        cigars: 0,
      },
    });

    expect(screen.getByText('No pairing modes are currently available.')).toBeTruthy();
  });
});
