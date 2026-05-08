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
      TobaccoBlend: {
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

  it("includes changed flavor_profile array values for TobaccoBlend updates", async () => {
    getMock.mockResolvedValue({
      id: "blend-1",
      name: "Old Blend",
      created_by: "user@example.com",
      flavor_profile: ["Sweet"],
    });
    updateMock.mockResolvedValue({ id: "blend-1" });

    await safeUpdate(
      "TobaccoBlend",
      "blend-1",
      { flavor_profile: ["Sweet", "Molasses"] },
      "user@example.com"
    );

    expect(updateMock).toHaveBeenCalledWith("blend-1", {
      flavor_profile: ["Sweet", "Molasses"],
      created_by: "user@example.com",
    });
  });
});

// ---------------------------------------------------------------------------
// H.12 — Legacy pipe dirty edit omits unchanged invalid legacy fields
// ---------------------------------------------------------------------------
describe("safeUpdate — H.12: legacy pipe dirty edit field isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not re-send legacy_malformed_field when updating only name", async () => {
    getMock.mockResolvedValue({
      id: "legacy-1",
      name: "Octopus's Garden",
      created_by: "user@example.com",
      legacy_malformed_field: { unsupported: true },
      deprecated_nested_obj: [{ old: "schema" }],
    });
    updateMock.mockResolvedValue({ id: "legacy-1" });

    await safeUpdate("Pipe", "legacy-1", { name: "Irish Tea" }, "user@example.com");

    const [, payload] = updateMock.mock.calls[0];
    expect(payload).not.toHaveProperty("legacy_malformed_field");
    expect(payload).not.toHaveProperty("deprecated_nested_obj");
    expect(payload).toMatchObject({ name: "Irish Tea", created_by: "user@example.com" });
  });

  it("only sends explicitly provided update keys, nothing from the current record", async () => {
    getMock.mockResolvedValue({
      id: "legacy-2",
      name: "Original Name",
      created_by: "user@example.com",
      some_old_field: "old_value",
      another_old_field: 999,
    });
    updateMock.mockResolvedValue({ id: "legacy-2" });

    await safeUpdate("Pipe", "legacy-2", { bowl_material: "Briar" }, "user@example.com");

    const [, payload] = updateMock.mock.calls[0];
    expect(Object.keys(payload).sort()).toEqual(["bowl_material", "created_by"]);
  });
});

// ---------------------------------------------------------------------------
// H.13 — Pipe photos and stamping photos are preserved across edits
// ---------------------------------------------------------------------------
describe("safeUpdate — H.13: pipe photos and stamping_photos preserved", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not clear photos when updating an unrelated field", async () => {
    getMock.mockResolvedValue({
      id: "photo-pipe-1",
      name: "Briar Pipe",
      created_by: "user@example.com",
      photos: ["https://cdn.example.com/photo1.jpg", "https://cdn.example.com/photo2.jpg"],
      stamping_photos: ["https://cdn.example.com/stamp1.jpg"],
    });
    updateMock.mockResolvedValue({ id: "photo-pipe-1" });

    // Edit only the name — photos must not be touched.
    await safeUpdate("Pipe", "photo-pipe-1", { name: "Updated Briar" }, "user@example.com");

    const [, payload] = updateMock.mock.calls[0];
    expect(payload).not.toHaveProperty("photos");
    expect(payload).not.toHaveProperty("stamping_photos");
    expect(payload).toMatchObject({ name: "Updated Briar", created_by: "user@example.com" });
  });

  it("preserves existing photos when explicitly updating photos array", async () => {
    getMock.mockResolvedValue({
      id: "photo-pipe-2",
      name: "Meerschaum",
      created_by: "user@example.com",
      photos: ["https://cdn.example.com/old-photo.jpg"],
    });
    updateMock.mockResolvedValue({ id: "photo-pipe-2" });

    const newPhotos = [
      "https://cdn.example.com/old-photo.jpg",
      "https://cdn.example.com/new-photo.jpg",
    ];
    await safeUpdate("Pipe", "photo-pipe-2", { photos: newPhotos }, "user@example.com");

    const [, payload] = updateMock.mock.calls[0];
    expect(payload.photos).toEqual(newPhotos);
    expect(payload.photos).toHaveLength(2);
  });

  it("can add stamping_photos without affecting the main photos array", async () => {
    getMock.mockResolvedValue({
      id: "photo-pipe-3",
      name: "Vintage Pipe",
      created_by: "user@example.com",
      photos: ["https://cdn.example.com/main.jpg"],
      stamping_photos: [],
    });
    updateMock.mockResolvedValue({ id: "photo-pipe-3" });

    await safeUpdate(
      "Pipe",
      "photo-pipe-3",
      { stamping_photos: ["https://cdn.example.com/stamp-new.jpg"] },
      "user@example.com"
    );

    const [, payload] = updateMock.mock.calls[0];
    expect(payload.stamping_photos).toEqual(["https://cdn.example.com/stamp-new.jpg"]);
    expect(payload).not.toHaveProperty("photos");
  });
});
