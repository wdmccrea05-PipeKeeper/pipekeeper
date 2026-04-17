import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const useModuleVisibilityMock = vi.fn();

vi.mock('@/components/hooks/useModuleVisibility', () => ({
  useModuleVisibility: (...args) => useModuleVisibilityMock(...args),
}));

import { useEnabledModules } from '@/components/hooks/useEnabledModules';

describe('useEnabledModules', () => {
  it('maps single-module access correctly for nav/hub unlock state', () => {
    useModuleVisibilityMock.mockReturnValueOnce({
      moduleStates: {
        pipekeeper: { enabled: true, accessible: true },
        whiskeykeeper: { enabled: false, accessible: false },
        winekeeper: { enabled: false, accessible: false },
        cigarkeeper: { enabled: false, accessible: false },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useEnabledModules({}, {}));
    expect(result.current.enabled.pipekeeper).toBe(true);
    expect(result.current.accessible.pipekeeper).toBe(true);
    expect(result.current.enabledModuleKeys).toEqual(['pipekeeper']);
    expect(result.current.accessibleModuleKeys).toEqual(['pipekeeper']);
  });

  it('keeps multi-module union alignment for accessible and enabled keys', () => {
    useModuleVisibilityMock.mockReturnValueOnce({
      moduleStates: {
        pipekeeper: { enabled: true, accessible: true },
        whiskeykeeper: { enabled: true, accessible: true },
        winekeeper: { enabled: false, accessible: false },
        cigarkeeper: { enabled: false, accessible: false },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useEnabledModules({}, {}));
    expect(result.current.enabledModuleKeys.sort()).toEqual(['pipekeeper', 'whiskeykeeper'].sort());
    expect(result.current.accessibleModuleKeys.sort()).toEqual(['pipekeeper', 'whiskeykeeper'].sort());
  });

  it('represents bundle-level unlocks across all modules', () => {
    useModuleVisibilityMock.mockReturnValueOnce({
      moduleStates: {
        pipekeeper: { enabled: true, accessible: true },
        whiskeykeeper: { enabled: true, accessible: true },
        winekeeper: { enabled: true, accessible: true },
        cigarkeeper: { enabled: true, accessible: true },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useEnabledModules({}, {}));
    expect(result.current.accessibleModuleKeys.sort()).toEqual([
      'pipekeeper',
      'whiskeykeeper',
      'winekeeper',
      'cigarkeeper',
    ].sort());
  });
});
