import { describe, expect, it } from "vitest";
import {
  buildVerifiedOwnedSets,
  sanitizeOwnershipClaims,
} from "@/components/utils/curatorOwnershipGuard";

describe("Ownership guard", () => {
  it("allows verified pipe names", () => {
    const pipes = [{ name: "Peterson Sherlock Holmes" }, { name: "Savinelli Autograph" }];
    const verifiedSets = buildVerifiedOwnedSets(pipes, []);

    const response = "Your Peterson Sherlock Holmes is a great choice for Latakia blends.";
    const sanitized = sanitizeOwnershipClaims(response, verifiedSets);

    expect(sanitized.includes("Your Peterson Sherlock Holmes")).toBe(true);
  });

  it("reframes unverified pipe names", () => {
    const pipes = [{ name: "Peterson Sherlock Holmes" }];
    const verifiedSets = buildVerifiedOwnedSets(pipes, []);

    const response = "Your Dunhill Shell Briar would pair well with this blend.";
    const sanitized = sanitizeOwnershipClaims(response, verifiedSets);

    expect(sanitized.includes("Your Dunhill")).toBe(false);
    expect(sanitized.includes("A Dunhill") || sanitized.includes("a Dunhill")).toBe(true);
  });

  it("allows verified tobacco names", () => {
    const blends = [{ name: "Penzance" }, { name: "Nightcap" }];
    const verifiedSets = buildVerifiedOwnedSets([], blends);

    const response = "Your Penzance would benefit from more aging.";
    const sanitized = sanitizeOwnershipClaims(response, verifiedSets);

    expect(sanitized.includes("Your Penzance")).toBe(true);
  });

  it("reframes unverified tobacco names", () => {
    const blends = [{ name: "Penzance" }];
    const verifiedSets = buildVerifiedOwnedSets([], blends);

    const response = "You have a McClelland 5100 that pairs well with bulldogs.";
    const sanitized = sanitizeOwnershipClaims(response, verifiedSets);

    expect(sanitized.includes("You have a McClelland")).toBe(false);
  });

  it("handles mixed verified and unverified ownership references", () => {
    const pipes = [{ name: "Peterson System" }];
    const blends = [{ name: "Nightcap" }];
    const verifiedSets = buildVerifiedOwnedSets(pipes, blends);

    const response =
      "Your Peterson System with your Nightcap is great, but your Dunhill would also work.";
    const sanitized = sanitizeOwnershipClaims(response, verifiedSets);

    expect(sanitized.includes("Your Peterson System")).toBe(true);
    expect(sanitized.includes("your Nightcap")).toBe(true);
    expect(sanitized.includes("your Dunhill")).toBe(false);
  });
});
