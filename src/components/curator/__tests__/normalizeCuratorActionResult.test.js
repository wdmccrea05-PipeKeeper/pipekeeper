/**
 * Canonical test file for normalizeCuratorActionResult.
 *
 * NOTE:
 * - This file is the canonical implementation.
 * - The duplicate .jsx version should be removed.
 * - Keep this header so future cleanup passes do not recreate duplicate test files.
 */

import { describe, expect, it } from "vitest";
import normalizeCuratorActionResult from "../curatorActionResultNormalizer";

describe("normalizeCuratorActionResult", () => {
  it("returns empty canonical shape for null input", () => {
    const result = normalizeCuratorActionResult(null);

    expect(result).toEqual({
      summary: "",
      groups: [],
      items: [],
      metadata: {},
    });
  });

  it("preserves grouped output when groups are provided", () => {
    const result = normalizeCuratorActionResult({
      summary: "Try these",
      groups: [
        {
          title: "Evening Pairing",
          description: "A fuller pairing",
          items: [
            {
              type: "pairing_recommendation",
              title: "Evening Pairing",
              pipeName: "Boswell Jumbo",
              blendName: "Cowboy Coffee",
              bottleName: "Smoke Wagon Bourbon",
            },
          ],
        },
      ],
    });

    expect(result.summary).toBe("Try these");
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].title).toBe("Evening Pairing");
    expect(result.groups[0].items).toHaveLength(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].pipeName).toBe("Boswell Jumbo");
    expect(result.items[0].blendName).toBe("Cowboy Coffee");
    expect(result.items[0].bottleName).toBe("Smoke Wagon Bourbon");
  });

  it("normalizes flat items into canonical output", () => {
    const result = normalizeCuratorActionResult({
      summary: "One suggestion",
      items: [
        {
          type: "session_builder",
          title: "Morning Session",
          pipeName: "Peterson 302",
        },
      ],
    });

    expect(result.summary).toBe("One suggestion");
    expect(result.items).toHaveLength(1);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].items).toHaveLength(1);
  });

  it("derives flat items from groups when needed", () => {
    const result = normalizeCuratorActionResult({
      groups: [
        {
          title: "Group A",
          items: [{ title: "Item A" }, { title: "Item B" }],
        },
      ],
    });

    expect(result.groups).toHaveLength(1);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe("Item A");
    expect(result.items[1].title).toBe("Item B");
  });

  it("returns safe metadata object", () => {
    const result = normalizeCuratorActionResult({
      metadata: { source: "test" },
      items: [{ title: "Item" }],
    });

    expect(result.metadata).toEqual({ source: "test" });
  });
});
