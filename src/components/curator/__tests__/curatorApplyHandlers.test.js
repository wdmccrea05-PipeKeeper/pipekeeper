/**
 * Canonical test file for curator apply handlers.
 *
 * NOTE:
 * - This file is the canonical implementation.
 * - The duplicate .jsx version should be removed.
 * - Keep this header so future cleanup passes do not recreate duplicate test files.
 */

import { describe, expect, it, vi } from "vitest";
import {
  applyAcceptedCuratorAction,
  applyRejectedCuratorAction,
} from "../curatorApplyHandlers";

describe("curatorApplyHandlers", () => {
  it("marks an action as accepted", async () => {
    const onApply = vi.fn().mockResolvedValue({ ok: true });

    const result = await applyAcceptedCuratorAction({
      item: { id: "1", title: "Test Action" },
      onApply,
    });

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: "accepted",
    });
  });

  it("marks an action as rejected", async () => {
    const onReject = vi.fn().mockResolvedValue({ ok: true });

    const result = await applyRejectedCuratorAction({
      item: { id: "2", title: "Reject Me" },
      onReject,
    });

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: "rejected",
    });
  });

  it("surfaces apply errors safely", async () => {
    const onApply = vi.fn().mockRejectedValue(new Error("Failed"));

    const result = await applyAcceptedCuratorAction({
      item: { id: "3", title: "Broken Action" },
      onApply,
    });

    expect(result.status).toBe("error");
    expect(result.error).toBeTruthy();
  });

  it("surfaces reject errors safely", async () => {
    const onReject = vi.fn().mockRejectedValue(new Error("Failed"));

    const result = await applyRejectedCuratorAction({
      item: { id: "4", title: "Broken Reject" },
      onReject,
    });

    expect(result.status).toBe("error");
    expect(result.error).toBeTruthy();
  });
});
