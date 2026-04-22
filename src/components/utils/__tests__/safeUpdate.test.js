import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock, updateMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      Pipe: {
        get: getMock,
        update: updateMock,
      },
    },
  },
}));

import { safeUpdate } from "@/components/utils/safeUpdate";

describe("safeUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a normal pipe record without re-sending entire legacy payload", async () => {
    getMock.mockResolvedValue({
      id: "pipe-1",
      name: "Normal Pipe",
      created_by: "user@example.com",
      legacy_malformed_field: { unsupported: true },
    });
    updateMock.mockResolvedValue({ id: "pipe-1" });

    await safeUpdate("Pipe", "pipe-1", { estimated_value: 150 }, "user@example.com");

    expect(updateMock).toHaveBeenCalledWith("pipe-1", {
      estimated_value: 150,
      created_by: "user@example.com",
    });
  });

  it("supports special-character names like Octopus's Garden and Irish Tea", async () => {
    getMock.mockResolvedValue({
      id: "pipe-2",
      name: "Octopus's Garden",
      created_by: "user@example.com",
    });
    updateMock.mockResolvedValue({ id: "pipe-2" });

    await safeUpdate("Pipe", "pipe-2", { name: "Irish Tea" }, "user@example.com");

    expect(updateMock).toHaveBeenCalledWith("pipe-2", {
      name: "Irish Tea",
      created_by: "user@example.com",
    });
  });

  it("keeps explicit null valuation fields in update payload", async () => {
    getMock.mockResolvedValue({
      id: "pipe-3",
      name: "Valuation Pipe",
      created_by: "user@example.com",
    });
    updateMock.mockResolvedValue({ id: "pipe-3" });

    await safeUpdate("Pipe", "pipe-3", { estimated_value: null }, "user@example.com");

    expect(updateMock).toHaveBeenCalledWith("pipe-3", {
      estimated_value: null,
      created_by: "user@example.com",
    });
  });

  it("surfaces backend validation reason when save fails", async () => {
    getMock.mockResolvedValue({
      id: "pipe-4",
      name: "Broken Pipe",
      created_by: "user@example.com",
    });
    updateMock.mockRejectedValue({
      response: { data: { message: "estimated_value must be a number" } },
    });

    await expect(
      safeUpdate("Pipe", "pipe-4", { estimated_value: "bad" }, "user@example.com")
    ).rejects.toThrow("estimated_value must be a number");
  });
});
