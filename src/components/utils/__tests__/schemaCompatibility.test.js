import { describe, expect, it } from "vitest";
import { normalizePipeFormData, preparePipeData } from "@/components/utils/schemaCompatibility";

describe("preparePipeData", () => {
  it("preserves explicit photo arrays while dropping undefined fields", () => {
    const prepared = preparePipeData({
      name: "My Pipe",
      photos: ["https://example.com/pipe.jpg"],
      stamping_photos: ["https://example.com/stamp.jpg"],
      maker: undefined,
    });

    expect(prepared.photos).toEqual(["https://example.com/pipe.jpg"]);
    expect(prepared.stamping_photos).toEqual(["https://example.com/stamp.jpg"]);
    expect("maker" in prepared).toBe(false);
  });

  it("strips unknown legacy fields that can poison full-record saves", () => {
    const prepared = preparePipeData({
      name: "Legacy Pipe",
      shape: "Billiard",
      weird_legacy_payload: { unsupported: true },
      legacy_relation_blob: [{ nope: 1 }],
      photos: ["https://example.com/pipe.jpg"],
    });

    expect(prepared.name).toBe("Legacy Pipe");
    expect(prepared.shape).toBe("Billiard");
    expect(prepared.photos).toEqual(["https://example.com/pipe.jpg"]);
    expect(prepared.weird_legacy_payload).toBeUndefined();
    expect(prepared.legacy_relation_blob).toBeUndefined();
  });

  it("preserves special characters and valuation values while normalizing arrays", () => {
    const prepared = preparePipeData({
      name: "Octopus's Garden – 9mm",
      estimated_value: 175.5,
      purchase_price: 120,
      photos: "https://example.com/pipe.jpg",
      stamping_photos: ["  ", "https://example.com/stamp.jpg"],
      interchangeable_bowls: null,
    });

    expect(prepared.name).toBe("Octopus's Garden – 9mm");
    expect(prepared.estimated_value).toBe(175.5);
    expect(prepared.purchase_price).toBe(120);
    expect(prepared.photos).toEqual(["https://example.com/pipe.jpg"]);
    expect(prepared.stamping_photos).toEqual(["https://example.com/stamp.jpg"]);
    expect(prepared.interchangeable_bowls).toEqual([]);
  });
});

describe("normalizePipeFormData", () => {
  it("normalizes malformed legacy form source values safely", () => {
    const normalized = normalizePipeFormData({
      name: null,
      usage_characteristics: "",
      smoking_characteristics: "Cool smoker",
      photos: "https://example.com/pipe.jpg",
      stamping_photos: null,
      is_favorite: 1,
      ai_excluded: "",
      purchase_price: "140.25",
      unexpected_field: "should-not-pass-through",
    });

    expect(normalized.name).toBe("");
    expect(normalized.usage_characteristics).toBe("Cool smoker");
    expect(normalized.smoking_characteristics).toBe("");
    expect(normalized.photos).toEqual(["https://example.com/pipe.jpg"]);
    expect(normalized.stamping_photos).toEqual([]);
    expect(normalized.is_favorite).toBe(true);
    expect(normalized.ai_excluded).toBe(false);
    expect(normalized.purchase_price).toBe(140.25);
    expect(normalized.unexpected_field).toBeUndefined();
  });
});
