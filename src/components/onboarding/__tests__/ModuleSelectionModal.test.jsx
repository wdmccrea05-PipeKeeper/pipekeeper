import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const useModuleVisibilityMock = vi.fn();
const isModuleLaunchedMock = vi.fn();
const canAccessInternalModuleForTestingMock = vi.fn();

vi.mock("@/components/hooks/useModuleVisibility", () => ({
  useModuleVisibility: (...args) => useModuleVisibilityMock(...args),
}));

vi.mock("@/components/utils/moduleReleaseState", () => ({
  isModuleLaunched: (...args) => isModuleLaunchedMock(...args),
  canAccessInternalModuleForTesting: (...args) =>
    canAccessInternalModuleForTestingMock(...args),
}));

vi.mock("@/components/i18n/safeTranslation", async () => {
  const actual = await vi.importActual("@/components/i18n/index.jsx");
  return {
    useTranslation: () => ({
      t: (key, opts) => actual.translate(key, opts, "en"),
    }),
  };
});

vi.mock("@/components/branding/moduleAssets", () => ({
  MODULE_ICONS: {
    pipekeeper: "pipe.png",
    whiskeykeeper: "whiskey.png",
    cigarkeeper: "cigar.png",
    winekeeper: "wine.png",
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import ModuleSelectionModal from "@/components/onboarding/ModuleSelectionModal";

function makeDefaultModuleVisibility() {
  return {
    saveModulePreferences: vi.fn().mockResolvedValue(undefined),
    user: { role: "user" },
  };
}

describe("ModuleSelectionModal — WineKeeper visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useModuleVisibilityMock.mockReturnValue(makeDefaultModuleVisibility());
  });

  it("does not show WineKeeper when module is internal and user cannot access it", () => {
    isModuleLaunchedMock.mockReturnValue(false);
    canAccessInternalModuleForTestingMock.mockReturnValue(false);

    render(<ModuleSelectionModal onComplete={vi.fn()} isOpen />);

    expect(screen.queryByText("WineKeeper")).toBeNull();
  });

  it("shows WineKeeper when module is launched", () => {
    isModuleLaunchedMock.mockImplementation((moduleKey) => moduleKey === "winekeeper");
    canAccessInternalModuleForTestingMock.mockReturnValue(false);

    render(<ModuleSelectionModal onComplete={vi.fn()} isOpen />);

    expect(screen.queryByText("WineKeeper")).not.toBeNull();
  });

  it("shows WineKeeper for internal testers even when not launched", () => {
    isModuleLaunchedMock.mockReturnValue(false);
    canAccessInternalModuleForTestingMock.mockImplementation(
      (moduleKey) => moduleKey === "winekeeper"
    );

    render(<ModuleSelectionModal onComplete={vi.fn()} isOpen />);

    expect(screen.queryByText("WineKeeper")).not.toBeNull();
  });

  it("always shows PipeKeeper and WhiskeyKeeper regardless of WineKeeper state", () => {
    isModuleLaunchedMock.mockReturnValue(false);
    canAccessInternalModuleForTestingMock.mockReturnValue(false);

    render(<ModuleSelectionModal onComplete={vi.fn()} isOpen />);

    expect(screen.queryByText("PipeKeeper")).not.toBeNull();
    expect(screen.queryByText("WhiskeyKeeper")).not.toBeNull();
  });
});
