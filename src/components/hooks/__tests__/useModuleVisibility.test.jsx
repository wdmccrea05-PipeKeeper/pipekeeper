import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";

const useCurrentUserMock = vi.fn();
const useCanonicalProfileMock = vi.fn();
const useAccessSummaryMock = vi.fn();

vi.mock("@/components/hooks/useCurrentUser", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

vi.mock("@/utils/getCanonicalUserProfile", () => ({
  useCanonicalProfile: () => useCanonicalProfileMock(),
}));

vi.mock("@/components/hooks/useAccessSummary", () => ({
  useAccessSummary: () => useAccessSummaryMock(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useModuleVisibility", () => {
  beforeEach(() => {
    useCurrentUserMock.mockReturnValue({ user: null, isLoading: false });
    useCanonicalProfileMock.mockReturnValue({ data: { profile: null }, isLoading: false });
    useAccessSummaryMock.mockReturnValue({ activeModules: ["pipekeeper", "whiskeykeeper"] });
  });

  it("lets authorized CigarKeeper testers hide visibility without revoking access", () => {
    useAccessSummaryMock.mockReturnValue({
      activeModules: ["pipekeeper", "whiskeykeeper", "cigarkeeper"],
    });

    const user = { role: "user", cigarkeeper_paid: true, paid_modules_csv: "cigarkeeper" };
    const profile = {
      module_preferences_set: true,
      pipekeeper_enabled: true,
      whiskeykeeper_enabled: true,
      cigarkeeper_enabled: false,
      winekeeper_enabled: false,
    };

    const { result } = renderHook(() => useModuleVisibility(profile, user), {
      wrapper: createWrapper(),
    });

    expect(result.current.moduleStates.cigarkeeper.accessible).toBe(true);
    expect(result.current.moduleStates.cigarkeeper.canToggle).toBe(true);
    expect(result.current.moduleStates.cigarkeeper.enabled).toBe(false);
  });

  it("does not force internal/admin testers to keep CigarKeeper visible", () => {
    const user = { role: "admin" };
    const profile = {
      module_preferences_set: true,
      pipekeeper_enabled: true,
      whiskeykeeper_enabled: true,
      cigarkeeper_enabled: false,
      winekeeper_enabled: false,
    };

    const { result } = renderHook(() => useModuleVisibility(profile, user), {
      wrapper: createWrapper(),
    });

    expect(result.current.moduleStates.cigarkeeper.accessible).toBe(true);
    expect(result.current.moduleStates.cigarkeeper.canToggle).toBe(true);
    expect(result.current.moduleStates.cigarkeeper.enabled).toBe(false);
  });

  it("treats launched CigarKeeper as toggleable when module preferences are set", () => {
    const user = { role: "user", paid_modules_csv: "pipekeeper" };
    const profile = {
      module_preferences_set: true,
      pipekeeper_enabled: true,
      whiskeykeeper_enabled: false,
      cigarkeeper_enabled: true,
      winekeeper_enabled: false,
    };

    const { result } = renderHook(() => useModuleVisibility(profile, user), {
      wrapper: createWrapper(),
    });

    expect(result.current.moduleStates.cigarkeeper.accessible).toBe(true);
    expect(result.current.moduleStates.cigarkeeper.canToggle).toBe(true);
    expect(result.current.moduleStates.cigarkeeper.enabled).toBe(true);
  });

  it("makes WineKeeper accessible and toggleable for admins, blocked for regular users", () => {
    const user = { role: "admin" };
    const profile = {
      module_preferences_set: true,
      winekeeper_enabled: true,
    };

    const { result } = renderHook(() => useModuleVisibility(profile, user), {
      wrapper: createWrapper(),
    });

    expect(result.current.moduleStates.winekeeper.accessible).toBe(true);
    expect(result.current.moduleStates.winekeeper.canToggle).toBe(true);
    expect(result.current.moduleStates.winekeeper.enabled).toBe(true);
  });
});
