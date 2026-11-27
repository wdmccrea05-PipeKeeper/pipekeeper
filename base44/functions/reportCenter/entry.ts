import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { requireEntitlement } from "../../shared/requireEntitlement.ts";

/**
 * reportCenter
 *
 * Server-side authorization for the Reporting Center.
 *
 * Viewing reports stays available to every signed-in collector, matching the
 * existing Collection Reports page. Exporting (PDF/CSV) is a Pro capability and
 * is re-checked here with the same helper the rest of the app uses, which also
 * resolves complimentary Pro trials, promotional grants and administrators.
 *
 * The client calls this before preparing an export, so the right is never
 * decided in the browser alone.
 */

const REPORT_IDS = [
  "overview",
  "composition",
  "characteristics",
  "specialization",
  "pairing",
  "preferences",
  "discovery",
  "overlooked",
  "documentation",
  "health",
  "aging",
  "storage",
  "makers",
  "ratings",
  "acquisition",
  "insurance",
  "annual",
  "cross-collection",
  "valuation-history",
  "custom-curator",
];

const DISCLOSURES = [
  "Reports are built from the signed-in collector's own records and nothing else.",
  "Value figures are recorded costs and owner estimates, never verified market prices.",
  "Reports describe the collection; they are not purchase recommendations.",
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id) {
      return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const action = String(payload?.action || "authorize");

    if (action === "authorize") {
      const isAdministrator = String(user?.role || "").toLowerCase() === "admin";
      let canExport = isAdministrator;
      let source = isAdministrator ? "administrator" : "free";

      if (!isAdministrator) {
        const gate = await requireEntitlement(req, "EXPORT_REPORTS");
        canExport = gate?.ok === true;
        source = gate?.source || (canExport ? "subscription" : "free");
      }

      return Response.json({
        authenticated: true,
        canViewReports: true,
        canExport,
        tier: canExport ? "pro" : "free",
        source,
        reportIds: REPORT_IDS,
        generatedAt: new Date().toISOString(),
        disclosures: DISCLOSURES,
      });
    }

    return Response.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (error) {
    console.error("[reportCenter] failed:", error);
    return Response.json({ error: "INTERNAL", message: String(error?.message || error) }, { status: 500 });
  }
});