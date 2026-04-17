import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ModuleVisibilitySettings from "@/components/profile/ModuleVisibilitySettings";

const useModuleVisibilityMock = vi.fn();
const useCurrentUserMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("@/components/hooks/useModuleVisibility", () => ({
  useModuleVisibility: (...args) => useModuleVisibilityMock(...args),
}));

vi.mock("@/components/hooks/useCurrentUser", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

vi.mock("@/components/i18n/safeTranslation", () => ({
  useTranslation: () => ({
    t: (_key, fallback) => fallback,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/components/utils/moduleReleaseState", () => ({
  isModuleLaunched: (moduleKey) => moduleKey === "pipekeeper" || moduleKey === "whiskeykeeper",
  isModuleInternal: (moduleKey) => moduleKey === "cigarkeeper",
  isInternalModuleTester: (user) => ["admin", "owner", "superadmin"].includes(String(user?.role || "").toLowerCase()) || user?.internal_tester === true,
  isModuleBlocked: (moduleKey) => moduleKey === "winekeeper",
  canAccessInternalModuleForTesting: (moduleKey, user) =>
    moduleKey === "cigarkeeper" &&
    (
      ["admin", "owner", "superadmin"].includes(String(user?.role || "").toLowerCase()) ||
      user?.internal_tester === true ||
      user?.cigarkeeper_paid === true ||
      String(user?.paid_modules_csv || "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .includes("cigarkeeper")
    ),
}));

function renderWithQueryClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function moduleStates({ cigarAccessible, cigarEnabled }) {
  return {
    pipekeeper: { enabled: true, accessible: true, canToggle: true },
    whiskeykeeper: { enabled: true, accessible: true, canToggle: true },
    cigarkeeper: { enabled: cigarEnabled, accessible: cigarAccessible, canToggle: cigarAccessible },
    winekeeper: { enabled: false, accessible: false, canToggle: false },
  };
}

describe("ModuleVisibilitySettings", () => {
  it("shows a normal CigarKeeper toggle for authorized testers and keeps WineKeeper non-toggleable", () => {
    useCurrentUserMock.mockReturnValue({ hasPaid: true });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: moduleStates({ cigarAccessible: true, cigarEnabled: true }),
      setModuleEnabled: vi.fn(),
      isLoading: false,
      user: null,
    });

    const user = { role: "user", cigarkeeper_paid: true, paid_modules_csv: "cigarkeeper" };
    renderWithQueryClient(<ModuleVisibilitySettings profile={{ module_preferences_set: true }} user={user} />);

    const cigarCard = screen.getByText("CigarKeeper").closest(".rounded-xl");

    expect(cigarCard).toBeTruthy();
    expect(within(cigarCard).queryByRole("checkbox", { hidden: true })).toBeTruthy();
    expect(screen.queryByText("WineKeeper")).toBeNull();
    expect(screen.getAllByRole("checkbox", { hidden: true })).toHaveLength(3);
  });

  it("keeps CigarKeeper locked for unauthorized users with no toggle", () => {
    useCurrentUserMock.mockReturnValue({ hasPaid: true });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: moduleStates({ cigarAccessible: false, cigarEnabled: false }),
      setModuleEnabled: vi.fn(),
      isLoading: false,
      user: null,
    });

    const user = { role: "user", paid_modules_csv: "pipekeeper" };
    renderWithQueryClient(<ModuleVisibilitySettings profile={{ module_preferences_set: true }} user={user} />);

    const cigarCard = screen.getByText("CigarKeeper").closest(".rounded-xl");
    expect(cigarCard).toBeTruthy();
    expect(within(cigarCard).queryByRole("checkbox", { hidden: true })).toBeNull();
    expect(screen.getAllByRole("checkbox", { hidden: true })).toHaveLength(2);
  });
});
