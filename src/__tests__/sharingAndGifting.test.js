/* eslint-disable */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { shareStatus, expiryDateFromDays, shareUrl, generateShareToken } from "@/lib/share/shareClient";

const read = (relative) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

describe("share link lifecycle", () => {
  it("treats an unrevoked, unexpired share as live", () => {
    expect(shareStatus({ is_active: true }).key).toBe("live");
  });

  it("treats a revoked share as revoked", () => {
    expect(shareStatus({ is_active: true, revoked_at: new Date().toISOString() }).key).toBe("revoked");
  });

  it("treats an inactive share as revoked", () => {
    expect(shareStatus({ is_active: false }).key).toBe("revoked");
  });

  it("treats a past expiry as expired", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(shareStatus({ is_active: true, expires_at: past }).key).toBe("expired");
  });

  it("keeps a future expiry live", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(shareStatus({ is_active: true, expires_at: future }).key).toBe("live");
  });

  it("builds an expiry date from a number of days", () => {
    const iso = expiryDateFromDays("7");
    const days = (new Date(iso).getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  it("returns no expiry when none is chosen", () => {
    expect(expiryDateFromDays("")).toBeNull();
  });

  it("puts the token in the share path", () => {
    expect(shareUrl("pipe", "abc123")).toContain("/share/pipe/abc123");
  });

  it("generates long, distinct tokens", () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(a).not.toBe(b);
  });
});

describe("SharedRecord access is owner-scoped, never public", () => {
  const entity = read("base44/entities/SharedRecord.jsonc");

  it("scopes reads to the owner or an administrator", () => {
    expect(entity).toContain('"read"');
    expect(entity).toContain('data.owner_email');
    expect(entity).toContain('"role": "admin"');
  });

  it("never opens reads to everyone", () => {
    expect(entity).not.toMatch(/"read"\s*:\s*true/);
  });

  it("carries expiry and revocation", () => {
    expect(entity).toContain("expires_at");
    expect(entity).toContain("revoked_at");
  });

  it("stores the owner's field selection", () => {
    expect(entity).toContain("visible_fields");
  });
});

describe("server-side projection hides private data", () => {
  const projection = read("base44/shared/shareProjection.ts");

  const privateFields = [
    "purchase_price",
    "purchase_date",
    "purchase_source",
    "original_owner",
    "provenance_notes",
    "documents",
    "notes",
    "serial_number",
    "batch_number",
    "estimated_value",
    "collector_value",
    "owner_email",
  ];

  it.each(privateFields)("blocks %s from any share", (field) => {
    expect(projection).toContain(`"${field}"`);
    const neverBlock = projection.split("export const NEVER_SHARED")[1]?.split("]);")[0] || "";
    expect(neverBlock).toContain(`"${field}"`);
  });

  it("covers every collection module", () => {
    ["pipe", "tobacco", "whiskey", "wine", "cigar"].forEach((moduleKey) => {
      expect(projection).toContain(`${moduleKey}: [`);
    });
  });

  it("applies the never-shared block even when a field is selected", () => {
    expect(projection).toContain("NEVER_SHARED.has(field.key)");
    expect(projection).toContain("visible_fields.filter((k: string) => !NEVER_SHARED.has(k))");
  });

  it("only shares records the owner created", () => {
    expect(projection).not.toContain("include_value: true");
    expect(read("base44/functions/publicShare/entry.ts")).toContain("record.created_by === share.owner_email");
  });
});

describe("public share reads go through the server", () => {
  const page = read("src/pages/PublicSharedRecord.jsx");
  const fn = read("base44/functions/publicShare/entry.ts");

  it("the public page never reads a collection entity directly", () => {
    expect(page).not.toContain("base44.entities");
    expect(page).toContain("fetchSharePayload");
  });

  it("the server rejects revoked, expired and unknown links", () => {
    expect(fn).toContain("shareState");
    expect(fn).toContain("410");
    expect(fn).toContain("404");
  });

  it("previewing your own link requires ownership", () => {
    expect(fn).toContain("user.email !== share.owner_email");
    expect(fn).toContain('403');
  });

  it("does not count a preview as a view", () => {
    expect(fn).toContain("if (!preview)");
  });
});

describe("membership gifting is software-only and single-use", () => {
  const fn = read("base44/functions/giftCodes/entry.ts");
  const entity = read("base44/entities/GiftCode.jsonc");

  it("is administrator-only for issuing, listing and revoking", () => {
    expect(fn).toContain('if (!isAdmin) return json(403, { error: "forbidden" });');
    expect(entity).toMatch(/"read"\s*:\s*\{\s*"user_condition"/);
    expect(entity).toContain('"admin"');
  });

  it("refuses a code that was already redeemed", () => {
    expect(fn).toContain('"already_redeemed"');
  });

  it("refuses an expired code and marks it expired", () => {
    expect(fn).toContain('error: "expired"');
    expect(fn).toContain('status: "expired"');
  });

  it("refuses a revoked code", () => {
    expect(fn).toContain('error: "revoked"');
  });

  it("grants non-revenue access through the existing earned-access table", () => {
    expect(fn).toContain("ReferralEarnedAccess");
    expect(fn).toContain('access_source: "gift"');
    expect(fn).toContain("is_revenue: false");
    expect(fn).toContain("reconcileEntitlementForUser");
  });

  it("never creates a charge or a Stripe object", () => {
    expect(fn.toLowerCase()).not.toContain("stripe");
    expect(fn).not.toContain("checkout");
  });

  it("accepts the code in either displayed or typed form", () => {
    expect(fn).toContain("codeVariants");
  });

  it("bounds the gifted duration", () => {
    expect(fn).toContain("months < 1 || months > 24");
  });
});