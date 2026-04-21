import { describe, expect, it } from "vitest";
import { preparePipeData } from "@/components/utils/schemaCompatibility";

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
});

