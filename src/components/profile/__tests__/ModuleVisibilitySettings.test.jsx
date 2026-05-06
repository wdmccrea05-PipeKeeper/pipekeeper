import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ModuleVisibilitySettings from "@/components/profile/ModuleVisibilitySettings";

const useModuleVisibilityMock = vi.fn();
const useCurrentUserMock = vi.fn();
const navigateMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const updateMeMock = vi.fn();

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

// CigarKeeper is launched in production — only WineKeeper is internal.
const isModuleLaunchedMock = vi.fn((moduleKey) =>
  moduleKey === "pipekeeper" || moduleKey === "whiskeykeeper" || moduleKey === "cigarkeeper"
);
const isModuleInternalMock = vi.fn((moduleKey) => moduleKey === "winekeeper");

vi.mock("@/components/utils/moduleReleaseState", async () => {
  const actual = await vi.importActual("@/components/utils/moduleReleaseState");
  return {
    ...actual,
    isModuleLaunched: (...args) => isModuleLaunchedMock(...args),
    isModuleInternal: (...args) => isModuleInternalMock(...args),
    isModuleBlocked: () => false,
    canAccessInternalModuleForTesting: (moduleKey, user) => {
      if (!user) return false;
      const role = String(user.role || "").toLowerCase();
      if (role === "admin" || role === "owner" || user.is_admin === true) return true;
      if (user.internal_tester === true || user.is_internal_tester === true) return true;
      return false;
    },
    isInternalModuleTester: (user) => {
      if (!user) return false;
      const role = String(user.role || "").toLowerCase();
      return role === "admin" || role === "owner" || user.is_admin === true || user.internal_tester === true;
    },
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: (...args) => toastSuccessMock(...args),
    error: (...args) => toastErrorMock(...args),
  },
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    auth: { updateMe: (...args) => updateMeMock(...args) },
  },
}));

function renderWithQueryClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function makeModuleStates({ cigarAccessible = true, cigarEnabled = false } = {}) {
  return {
    pipekeeper: { enabled: true, accessible: true, canToggle: true },
    whiskeykeeper: { enabled: true, accessible: true, canToggle: true },
    cigarkeeper: { enabled: cigarEnabled, accessible: cigarAccessible, canToggle: cigarAccessible },
    winekeeper: { enabled: false, accessible: false, canToggle: false },
  };
}

const regularUser = { role: "user" };
const regularUserWithCigarPaid = { role: "user", cigarkeeper_paid: true, paid_modules_csv: "cigarkeeper" };

describe("ModuleVisibilitySettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMeMock.mockResolvedValue({});
    // Reset to default state: winekeeper is internal (not launched)
    isModuleLaunchedMock.mockImplementation(
      (moduleKey) =>
        moduleKey === "pipekeeper" || moduleKey === "whiskeykeeper" || moduleKey === "cigarkeeper"
    );
    isModuleInternalMock.mockImplementation((moduleKey) => moduleKey === "winekeeper");
  });

  // ── Existing coverage ────────────────────────────────────────────────────

  it("shows a normal CigarKeeper toggle for users with entitlement and keeps WineKeeper hidden", () => {
    useCurrentUserMock.mockReturnValue({ hasPaid: true });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: makeModuleStates({ cigarAccessible: true, cigarEnabled: true }),
      setModuleEnabled: vi.fn(),
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(
      <ModuleVisibilitySettings
        profile={{ module_preferences_set: true }}
        user={regularUserWithCigarPaid}
      />
    );

    const cigarCard = screen.getByText("CigarKeeper").closest(".rounded-xl");
    expect(cigarCard).toBeTruthy();
    expect(within(cigarCard).queryByRole("checkbox", { hidden: true })).toBeTruthy();
    expect(screen.queryByText("WineKeeper")).toBeNull();
    expect(screen.getAllByRole("checkbox", { hidden: true })).toHaveLength(3);
  });

  it("keeps CigarKeeper locked for users where accessible=false with no toggle", () => {
    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: makeModuleStates({ cigarAccessible: false, cigarEnabled: false }),
      setModuleEnabled: vi.fn(),
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(
      <ModuleVisibilitySettings
        profile={{ module_preferences_set: true }}
        user={{ role: "user", paid_modules_csv: "pipekeeper" }}
      />
    );

    const cigarCard = screen.getByText("CigarKeeper").closest(".rounded-xl");
    expect(cigarCard).toBeTruthy();
    expect(within(cigarCard).queryByRole("checkbox", { hidden: true })).toBeNull();
    expect(screen.getAllByRole("checkbox", { hidden: true })).toHaveLength(2);
  });

  // ── New: CigarKeeper free-tier access ────────────────────────────────────

  it("renders CigarKeeper row with switch for a regular user (free launched module)", () => {
    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: makeModuleStates({ cigarAccessible: true, cigarEnabled: false }),
      setModuleEnabled: vi.fn(),
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(<ModuleVisibilitySettings user={regularUser} />);

    const cigarCard = screen.getByText("CigarKeeper").closest(".rounded-xl");
    expect(cigarCard).toBeTruthy();
    // Switch must be present
    expect(within(cigarCard).queryByRole("checkbox", { hidden: true })).toBeTruthy();
    // WineKeeper must be hidden for non-admin public users
    expect(screen.queryByText("WineKeeper")).toBeNull();
  });

  it("clicking the CigarKeeper row enables the module", async () => {
    const setModuleEnabled = vi.fn().mockResolvedValue(undefined);
    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: makeModuleStates({ cigarAccessible: true, cigarEnabled: false }),
      setModuleEnabled,
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(<ModuleVisibilitySettings user={regularUser} />);

    const cigarCard = screen.getByText("CigarKeeper").closest(".rounded-xl");
    fireEvent.click(cigarCard);

    await waitFor(() => {
      expect(setModuleEnabled).toHaveBeenCalledWith("cigarkeeper", true);
    });
  });

  it("clicking the CigarKeeper switch enables the module", async () => {
    const setModuleEnabled = vi.fn().mockResolvedValue(undefined);
    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: makeModuleStates({ cigarAccessible: true, cigarEnabled: false }),
      setModuleEnabled,
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(<ModuleVisibilitySettings user={regularUser} />);

    const cigarCard = screen.getByText("CigarKeeper").closest(".rounded-xl");
    const toggle = within(cigarCard).getByRole("checkbox", { hidden: true });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(setModuleEnabled).toHaveBeenCalledWith("cigarkeeper", true);
    });
  });

  it("clicking Free enables the module and does not start Pro checkout", async () => {
    const setModuleEnabled = vi.fn().mockResolvedValue(undefined);
    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: makeModuleStates({ cigarAccessible: true, cigarEnabled: false }),
      setModuleEnabled,
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(<ModuleVisibilitySettings user={regularUser} />);

    // Scope to the CigarKeeper card so we don't click PipeKeeper's Free button
    const cigarCard = screen.getByText("CigarKeeper").closest(".rounded-xl");
    const freeButtons = within(cigarCard).getAllByRole("button", { name: /free/i });
    // Expect exactly 2: one desktop-hidden (sm:flex), one mobile-hidden (sm:hidden)
    expect(freeButtons.length).toBe(2);
    fireEvent.click(freeButtons[0]);

    await waitFor(() => {
      expect(setModuleEnabled).toHaveBeenCalledWith("cigarkeeper", true);
    });
    // Must NOT have navigated to Subscription
    expect(navigateMock).not.toHaveBeenCalledWith("/Subscription");
  });

  it("setModuleEnabled is called with cigarkeeper and true when enabling via row", async () => {
    const setModuleEnabled = vi.fn().mockResolvedValue(undefined);
    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: makeModuleStates({ cigarAccessible: true, cigarEnabled: false }),
      setModuleEnabled,
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(<ModuleVisibilitySettings user={regularUser} />);
    fireEvent.click(screen.getByText("CigarKeeper").closest(".rounded-xl"));

    await waitFor(() => {
      expect(setModuleEnabled).toHaveBeenCalledWith("cigarkeeper", true);
    });
  });

  it("Pro button navigates to Subscription for users without Pro entitlement", async () => {
    const setModuleEnabled = vi.fn().mockResolvedValue(undefined);
    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: makeModuleStates({ cigarAccessible: true, cigarEnabled: false }),
      setModuleEnabled,
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(<ModuleVisibilitySettings user={regularUser} />);

    const proButtons = screen.getAllByRole("button", { name: /^pro$/i });
    fireEvent.click(proButtons[0]);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/Subscription");
    });
    // Free enable must NOT have been called
    expect(setModuleEnabled).not.toHaveBeenCalled();
  });

  it("WineKeeper is hidden for public (non-admin) users", () => {
    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: makeModuleStates(),
      setModuleEnabled: vi.fn(),
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(<ModuleVisibilitySettings user={regularUser} />);

    expect(screen.queryByText("WineKeeper")).toBeNull();
  });

  it("mobile layout renders Pro/Free buttons separately from the main row controls", () => {
    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: makeModuleStates({ cigarAccessible: true, cigarEnabled: false }),
      setModuleEnabled: vi.fn(),
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(<ModuleVisibilitySettings user={regularUser} />);

    // Mobile Pro/Free buttons exist as a sibling row to the main row inside the card.
    // Each toggleable module should have two Free buttons in DOM (desktop hidden + mobile).
    const freeButtons = screen.getAllByRole("button", { name: /free/i });
    const proButtons = screen.getAllByRole("button", { name: /^pro$/i });
    // 3 toggleable modules (pipekeeper, whiskeykeeper, cigarkeeper) × 2 buttons each
    expect(freeButtons.length).toBe(6);
    expect(proButtons.length).toBe(6);
  });
});

// ── WineKeeper launch-aware visibility tests ─────────────────────────────────

describe("ModuleVisibilitySettings — WineKeeper launch-aware visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMeMock.mockResolvedValue({});
    // Default: winekeeper is internal (not launched)
    isModuleLaunchedMock.mockImplementation(
      (moduleKey) =>
        moduleKey === "pipekeeper" || moduleKey === "whiskeykeeper" || moduleKey === "cigarkeeper"
    );
    isModuleInternalMock.mockImplementation((moduleKey) => moduleKey === "winekeeper");
  });

  it("WineKeeper is hidden for public users when module is internal and flag is false", () => {
    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: makeModuleStates(),
      setModuleEnabled: vi.fn(),
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(<ModuleVisibilitySettings user={regularUser} />);

    expect(screen.queryByText("WineKeeper")).toBeNull();
  });

  it("WineKeeper is visible for internal testers even when not launched", () => {
    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    const internalTester = { role: "user", internal_tester: true };
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: {
        ...makeModuleStates(),
        winekeeper: { enabled: false, accessible: true, canToggle: true },
      },
      setModuleEnabled: vi.fn(),
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(<ModuleVisibilitySettings user={internalTester} />);

    expect(screen.queryByText("WineKeeper")).not.toBeNull();
  });

  it("WineKeeper is visible when module is launched (WINEKEEPER_PUBLIC_ENABLED=true)", () => {
    // Simulate WineKeeper launched
    isModuleLaunchedMock.mockImplementation(() => true);
    isModuleInternalMock.mockImplementation(() => false);

    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: {
        ...makeModuleStates(),
        winekeeper: { enabled: false, accessible: true, canToggle: true },
      },
      setModuleEnabled: vi.fn(),
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(<ModuleVisibilitySettings user={regularUser} />);

    expect(screen.queryByText("WineKeeper")).not.toBeNull();
  });

  it("WineKeeper is toggleable when module is launched", () => {
    // Simulate WineKeeper launched
    isModuleLaunchedMock.mockImplementation(() => true);
    isModuleInternalMock.mockImplementation(() => false);

    useCurrentUserMock.mockReturnValue({ hasPaid: false });
    useModuleVisibilityMock.mockReturnValue({
      moduleStates: {
        ...makeModuleStates(),
        winekeeper: { enabled: false, accessible: true, canToggle: true },
      },
      setModuleEnabled: vi.fn(),
      isLoading: false,
      user: null,
    });

    renderWithQueryClient(<ModuleVisibilitySettings user={regularUser} />);

    const wineCard = screen.getByText("WineKeeper").closest(".rounded-xl");
    expect(wineCard).toBeTruthy();
    // Switch should be present when launched
    expect(within(wineCard).queryByRole("checkbox", { hidden: true })).toBeTruthy();
  });
});
