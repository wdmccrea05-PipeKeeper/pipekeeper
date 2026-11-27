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

const shared = read("base44/shared/appreciationEmail.ts");
const campaignRules = read("base44/shared/appreciationCampaign.ts");
const template = read("base44/emails/CollectorAppreciation.html");
const sendFn = read("base44/functions/adminEmailCampaigns/entry.ts");
const audienceFn = read("base44/functions/appreciationEmailAudience/entry.ts");
const clickFn = read("base44/functions/trackAppreciationEmailClick/entry.ts");
const reportFn = read("base44/functions/appreciationEmailReport/entry.ts");
const activateFn = read("base44/functions/activateAppreciationCampaign/entry.ts");
const workflow = read("base44/workflows/Appreciation Email Campaign Sender.jsonc");
const page = read("src/pages/EmailCampaigns.jsx");

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
    const featureLists = (shared.match(/features: \[/g) || []).length;
    expect(featureLists).toBe(10);
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
  });
});

describe("email template", () => {
  it("is a branded MJML email with the official logo", () => {
    expect(template.trim().startsWith("<mjml>")).toBe(true);
    expect(template).toContain("{{logo_url}}");
    expect(template).toContain("#ff773c");
    expect(template).toContain("{{subject_line}}");
    expect(template).toContain("{{preview}}");
  });

  it("carries the CTA, the deadline and a working unsubscribe link", () => {
    expect(template).toContain('href="{{cta_url}}"');
    expect(template).toContain("{{deadline}}");
    expect(template).toContain("{{unsubscribe_url}}");
    expect(template).toContain("{{mailing_address}}");
    expect(template).toContain("{{follow_url}}");
  });

  it("stacks on mobile by using MJML sections rather than fixed widths", () => {
    expect(template).toContain("<mj-section");
    expect(template).not.toContain("width:600px");
  });
});

describe("sending pipeline guards", () => {
  it("is administrator only", () => {
    expect(sendFn).toContain('if (String(me.role || "").toLowerCase() !== "admin")');
    expect(sendFn).toContain("{ status: 403 }");
    expect(audienceFn).toContain("{ status: 403 }");
    expect(reportFn).toContain("{ status: 403 }");
  });

  it("requires explicit approval and compliance details before delivery", () => {
    expect(sendFn).toContain('"approval_required"');
    expect(sendFn).toContain('"mailing_address_required"');
    expect(sendFn).toContain("approved_by");
    expect(sendFn).toContain('category: "marketing"');
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