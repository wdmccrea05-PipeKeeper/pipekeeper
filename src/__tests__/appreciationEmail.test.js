/* eslint-disable */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Guard rails for the appreciation email campaign.
 *
 * The campaign rules live in base44/shared (server side), so they are asserted
 * here by reading the shipped sources: the boundary rule keeps frontend tests
 * from importing them directly.
 */

const read = (relative) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(process.cwd(), relative));

const shared = read("base44/shared/appreciationEmail.ts");
const banner = read("base44/shared/appreciationEmailBanner.ts");
const campaignRules = read("base44/shared/appreciationCampaign.ts");
const sendFn = read("base44/functions/adminEmailCampaigns/entry.ts");
const audienceFn = read("base44/functions/appreciationEmailAudience/entry.ts");
const clickFn = read("base44/functions/trackAppreciationEmailClick/entry.ts");
const unsubscribeFn = read("base44/functions/unsubscribeAppreciationEmail/entry.ts");
const reportFn = read("base44/functions/appreciationEmailReport/entry.ts");
const activateFn = read("base44/functions/activateAppreciationCampaign/entry.ts");
const workflow = read("base44/workflows/Appreciation Email Campaign Sender.jsonc");
const page = read("src/pages/EmailCampaigns.jsx");
const preview = read("src/components/emailcampaign/EmailPreview.jsx");

describe("localized campaign copy", () => {
  it("covers all ten supported languages", () => {
    const langs = shared.match(/export const EMAIL_LANGS = \[([^\]]+)\]/);
    expect(langs).toBeTruthy();
    const codes = langs[1].split(",").map((code) => code.trim().replace(/"/g, "")).filter(Boolean);
    expect(codes).toEqual(["en", "es", "fr", "de", "it", "pt-BR", "nl", "pl", "ja", "zh-Hans"]);
  });

  it("fills every copy field in every language", () => {
    for (const field of ["subject:", "preview:", "headline:", "intro:", "gift:", "cta:", "deadline:", "timing:", "unsubscribe:"]) {
      const count = (shared.match(new RegExp(`\\n  ${field}`, "g")) || []).length;
      expect(count, `${field} occurrences`).toBe(10);
    }
    expect((shared.match(/features: \[/g) || []).length).toBe(10);
  });

  it("keeps the four modules and the promo promise intact", () => {
    expect(shared).toContain('const MODULES = ["PipeKeeper", "WhiskeyKeeper", "CigarKeeper", "WineKeeper"]');
    expect(shared).toContain("No credit card. No commitment. No automatic charges.");
    expect(shared).toContain("One App. Every Collection.");
    expect(shared).toContain("https://www.facebook.com/profile.php?id=61585481946188");
  });

  it("sends every recipient to the app's own domains", () => {
    expect(shared).toContain('APP_URL = "https://collection-keeper.app"');
    expect(shared).toContain("appreciation=1&channel=email");
    expect(shared).toContain('APP_ORIGIN = "https://collectionkeeper.base44.app"');
    expect(shared).toContain("/functions/trackAppreciationEmailClick");
    expect(shared).toContain("/functions/unsubscribeAppreciationEmail");
  });
});

describe("email rendering", () => {
  it("builds the email in code so content can never render blank", () => {
    expect(shared).toContain("export function buildHtml");
    expect(shared).toContain("<!DOCTYPE html>");
    expect(shared).toContain("<img src=\"${LOGO_URL}\"");
    expect(shared).toContain("buildAppreciationEmailBanner(HERO_URL, esc(copy.headline))");
    expect(shared).toContain("#ff773c");
    expect(shared).toContain("Georgia");
    expect(shared).not.toContain("{{");
  });

  it("carries the headline, the four modules, every feature and the CTA", () => {
    expect(shared).toContain("${esc(copy.headline)}");
    expect(shared).toContain("${esc(copy.gift)}");
    expect(shared).toContain("${chip(MODULES[0])}");
    expect(shared).toContain("featureRows");
    expect(shared).toContain('href="${ctaUrl}"');
    expect(shared).toContain("${esc(copy.deadline)}");
  });

  it("includes a working unsubscribe link and the mailing address", () => {
    expect(shared).toContain('href="${unsubscribeUrl}"');
    expect(shared).toContain("footerAddress");
    expect(shared).toContain("${esc(copy.footerWhy)}");
  });

  it("is responsive and image-safe for mail clients", () => {
    expect(shared).toContain('width="600"');
    expect(shared).toContain("max-width:600px");
    expect(shared).toContain('name="viewport"');
    expect(shared).toContain("x-apple-disable-message-reformatting");
  });

  it("frames out the white matte built into the square banner artwork", () => {
    expect(shared).not.toContain('<img src="${HERO_URL}"');
    expect(banner).toContain('background="${src}"');
    expect(banner).toContain("background-size:100% auto");
    expect(banner).toContain('role="img" aria-label="${escapedAlt}"');
    const sourceSize = Number(banner.match(/const SOURCE_SIZE = (\d+)/)[1]);
    const top = Number(banner.match(/const PHOTO_TOP = (\d+)/)[1]);
    const bottom = Number(banner.match(/const PHOTO_BOTTOM = (\d+)/)[1]);
    expect(sourceSize).toBe(1024);
    expect(top).toBeGreaterThan(224);
    expect(bottom).toBeLessThan(768);
    expect(bottom - top).toBe(540);
    expect(banner).toContain("padding:0 0 ${ratio * 100}%");
    expect(banner).toContain("background-position:center ${position}%");
  });

  it("keeps matching Outlook framing and a fluid mobile email width", () => {
    expect(banner).toContain("<!--[if mso]>");
    expect(banner).toContain("<v:image");
    expect(banner).toContain('croptop="${PHOTO_TOP / SOURCE_SIZE}"');
    expect(banner).toContain('cropbottom="${1 - PHOTO_BOTTOM / SOURCE_SIZE}"');
    expect(banner).toContain("<!--[if !mso]><!-->");
    expect(shared).toContain("width:100%;max-width:600px;background-color:#ffffff");
  });

  it("no longer depends on a separate template file", () => {
    expect(exists("base44/emails/CollectorAppreciation.html")).toBe(false);
    // template_name survives only as the campaign record's dedupe label, never as a send argument
    expect((sendFn.match(/template_name: EMAIL_TEMPLATE_NAME,/g) || []).length).toBe(1);
    expect(sendFn).toContain("html: buildHtml(");
    expect(sendFn).toContain("text: buildPlainText(");
  });

  it("previews the real HTML rather than an approximation", () => {
    expect(preview).toContain("srcDoc={preview.html}");
    expect(preview).toContain("preview.plain_text");
  });
});

describe("sending pipeline guards", () => {
  it("is administrator only", () => {
    expect(sendFn).toContain('if (String(me.role || "").toLowerCase() !== "admin")');
    expect(sendFn).toContain("{ status: 403 }");
    expect(audienceFn).toContain("{ status: 403 }");
    expect(reportFn).toContain("{ status: 403 }");
    expect(unsubscribeFn).not.toContain("auth.me()");
  });

  it("requires explicit approval and compliance details before delivery", () => {
    expect(sendFn).toContain('"approval_required"');
    expect(sendFn).toContain('"mailing_address_required"');
    expect(sendFn).toContain("approved_by");
    expect(sendFn).toContain('category: "marketing"');
    expect(sendFn).toContain('from_name: "CollectionKeeper"');
  });

  it("refuses to deliver once the redemption window closes", () => {
    expect(sendFn).toContain("canDeliverCampaign");
    expect(sendFn).toContain('"redemption_deadline_passed"');
    expect(campaignRules).toContain('CAMPAIGN_REDEMPTION_DEADLINE_ISO = "2026-12-01T04:59:00.000Z"');
  });

  it("batches delivery with rate limiting and per-recipient isolation", () => {
    expect(sendFn).toContain("const CONCURRENCY = 5");
    expect(sendFn).toContain("const MAX_BATCH = 60");
    expect(sendFn).toContain("Promise.allSettled");
    expect(sendFn).toContain("await sleep(120)");
  });

  it("prevents duplicate sends and records every outcome", () => {
    expect(sendFn).toContain("click_token: crypto.randomUUID()");
    expect(sendFn).toContain("const seen = new Set(existing.map((row) => normEmail(row.email)))");
    expect(sendFn).toContain('status: "sent"');
    expect(sendFn).toContain('event_type: "sent"');
    expect(shared).toContain("already_emailed");
  });

  it("persists unsubscribes, bounces and complaints as preferences", () => {
    expect(sendFn).toContain("addSuppression(base44, row.email, suppressionReason");
    expect(sendFn).toContain('reason === "spam" ? "complaint" : reason');
    expect(sendFn).toContain('action === "suppression_add"');
    expect(unsubscribeFn).toContain('reason: "unsubscribed"');
    expect(unsubscribeFn).toContain("EmailSuppression");
  });

  it("processes scheduled campaigns on a schedule", () => {
    expect(sendFn).toContain('action === "run_due"');
    expect(workflow).toContain('"function_name": "adminEmailCampaigns"');
    expect(workflow).toContain('"action": "run_due"');
    expect(workflow).toContain('"trigger_type": "scheduled"');
  });
});

describe("links cannot grant access", () => {
  it("the click tracker only records and redirects", () => {
    expect(clickFn).toContain("Response.redirect(redemptionUrl(");
    expect(clickFn).not.toContain("AppreciationGrant");
    expect(clickFn).not.toContain("EmailCampaignRecipient.bulkCreate");
  });

  it("the unsubscribe endpoint only suppresses one address", () => {
    expect(unsubscribeFn).toContain('token === "test"');
    expect(unsubscribeFn).not.toContain("AppreciationGrant");
    expect(unsubscribeFn).not.toContain("AppreciationCampaignEvent");
  });

  it("activation still enforces eligibility, the deadline and one grant per collector", () => {
    expect(activateFn).toContain("evaluateEligibility");
    expect(activateFn).toContain('code: "redemption_deadline_passed"');
    expect(activateFn).toContain("attributeEmailActivation");
    expect(activateFn).toContain("resolveActivationSurface");
  });

  it("attribution never creates a second grant", () => {
    const server = read("base44/shared/appreciationEmailServer.ts");
    expect(server).toContain("EmailCampaignRecipient.update");
    expect(server).not.toContain("AppreciationGrant.create");
  });
});

describe("administrator dashboard", () => {
  it("wires every campaign action the brief requires", () => {
    for (const action of ["create", "update", "test", "preview", "approve", "send", "schedule", "cancel", "suppressions"]) {
      expect(sendFn, `action ${action}`).toContain(`"${action}"`);
    }
    expect(page).toContain("EmailPreview");
    expect(page).toContain("AudiencePanel");
    expect(page).toContain("CampaignAnalytics");
    expect(page).toContain("SuppressionManager");
    expect(page).toContain("SendApprovalDialog");
    expect(page).toContain("appreciationEmailReport");
  });

  it("reports activations split by channel", () => {
    expect(reportFn).toContain("email_campaign");
    expect(reportFn).toContain("facebook_referral");
    expect(reportFn).toContain("campaign_activation");
    expect(reportFn).toContain("attributable_revenue");
  });
});