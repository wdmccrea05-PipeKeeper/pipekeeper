/**
 * giftCodes — CollectionKeeper software membership gifts.
 *
 * Software only. A gift never represents tobacco, alcohol or any physical
 * product, and redemption never creates a charge: it writes a non-revenue
 * earned-access grant (the same table the referral system uses) and asks the
 * canonical entitlement reconciler to recompute the account.
 *
 * Actions: issue | list | revoke (administrator) | redeem (collector)
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const MODULES = ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"];
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function randomBlock(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function generateCode() {
  return `CK-${randomBlock(4)}-${randomBlock(4)}`;
}

function normalizeCode(value: unknown) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Codes are stored and shown as CK-XXXX-XXXX; redemption accepts either form. */
function codeVariants(value: unknown) {
  const normalized = normalizeCode(value);
  const body = normalized.startsWith("CK") ? normalized.slice(2) : normalized;
  const display = body.length === 8 ? `CK-${body.slice(0, 4)}-${body.slice(4)}` : normalized;
  return [...new Set([normalized, display])];
}

function addMonths(from: Date, months: number) {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
}

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return json(401, { error: "unauthorized" });

    const srv = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "redeem");
    const isAdmin = user.role === "admin";

    if (action === "issue") {
      if (!isAdmin) return json(403, { error: "forbidden" });
      const months = Math.round(Number(body.months || 0));
      if (!Number.isFinite(months) || months < 1 || months > 24) {
        return json(400, { error: "invalid_months" });
      }
      const modules = (Array.isArray(body.modules) ? body.modules : [])
        .map((m: unknown) => String(m || "").toLowerCase())
        .filter((m: string) => MODULES.includes(m));
      const now = new Date();
      const expiresAt = body.expires_at ? new Date(body.expires_at) : addMonths(now, 12);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
        return json(400, { error: "invalid_expiry" });
      }

      let code = generateCode();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const clash = await srv.entities.GiftCode.filter({ code }).catch(() => []);
        if (!Array.isArray(clash) || clash.length === 0) break;
        code = generateCode();
      }

      const created = await srv.entities.GiftCode.create({
        code,
        months,
        modules,
        status: "issued",
        issued_by: user.email,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        recipient_hint: body.recipient_hint ? String(body.recipient_hint).slice(0, 120) : "",
        note: body.note ? String(body.note).slice(0, 400) : "",
      });

      return json(200, { ok: true, code, id: created?.id, expires_at: expiresAt.toISOString() });
    }

    if (action === "list") {
      if (!isAdmin) return json(403, { error: "forbidden" });
      const codes = await srv.entities.GiftCode.list("-issued_at", 100).catch(() => []);
      return json(200, { codes: Array.isArray(codes) ? codes : codes?.items || [] });
    }

    if (action === "revoke") {
      if (!isAdmin) return json(403, { error: "forbidden" });
      const code = normalizeCode(body.code);
      const rows = await srv.entities.GiftCode.filter({ code: { $in: codeVariants(code) } }).catch(() => []);
      const gift = Array.isArray(rows) ? rows[0] : null;
      if (!gift) return json(404, { error: "not_found" });
      if (gift.status === "redeemed") return json(409, { error: "already_redeemed" });
      await srv.entities.GiftCode.update(gift.id, {
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: user.email,
        revoke_reason: body.reason ? String(body.reason).slice(0, 300) : "",
      });
      return json(200, { ok: true, status: "revoked" });
    }

    if (action !== "redeem") return json(400, { error: "unknown_action" });

    // ── redeem ────────────────────────────────────────────────────────────────
    const code = normalizeCode(body.code);
    if (!code) return json(400, { error: "code_required" });

    const rows = await srv.entities.GiftCode.filter({ code: { $in: codeVariants(code) } }).catch(() => []);
    const gift = Array.isArray(rows) ? rows[0] : null;
    if (!gift) return json(404, { error: "invalid_code" });
    if (gift.status === "revoked") return json(409, { error: "revoked" });
    if (gift.status === "redeemed") return json(409, { error: "already_redeemed" });
    if (gift.status === "expired") return json(409, { error: "expired" });

    const now = new Date();
    if (gift.expires_at && new Date(gift.expires_at).getTime() <= now.getTime()) {
      await srv.entities.GiftCode.update(gift.id, { status: "expired" }).catch(() => {});
      return json(409, { error: "expired" });
    }

    const allowedModules = (Array.isArray(gift.modules) && gift.modules.length > 0
      ? gift.modules
      : MODULES
    ).filter((m: string) => MODULES.includes(m));
    const requested = body.module ? String(body.module).toLowerCase() : allowedModules[0];
    if (!allowedModules.includes(requested)) {
      return json(400, { error: "invalid_module", allowed: allowedModules });
    }

    const months = Math.max(1, Math.min(24, Number(gift.months) || 1));
    const endAt = addMonths(now, months);

    const grant = await srv.entities.ReferralEarnedAccess.create({
      user_id: user.id,
      user_email: String(user.email || "").toLowerCase(),
      source_reward_id: gift.id,
      reward_type: months >= 12 ? "free_year" : "free_month",
      months_granted: months,
      module: requested,
      access_source: "gift",
      is_revenue: false,
      status: "active",
      start_at: now.toISOString(),
      end_at: endAt.toISOString(),
      granted_at: now.toISOString(),
      activated_at: now.toISOString(),
    });

    await srv.entities.GiftCode.update(gift.id, {
      status: "redeemed",
      redeemed_by_email: String(user.email || "").toLowerCase(),
      redeemed_by_user_id: user.id,
      redeemed_at: now.toISOString(),
      redeemed_module: requested,
      grant_id: grant?.id || "",
      grant_end_at: endAt.toISOString(),
    });

    // Confirm this caller won the race; a second redemption must not stand.
    const after = await srv.entities.GiftCode.filter({ code: { $in: codeVariants(code) } }).catch(() => []);
    const current = Array.isArray(after) ? after[0] : null;
    if (!current || current.redeemed_by_email !== String(user.email || "").toLowerCase()) {
      return json(409, { error: "already_redeemed" });
    }

    const reconcile = await srv.functions
      .invoke("reconcileEntitlementForUser", { email: current.redeemed_by_email })
      .catch(() => null);

    return json(200, {
      ok: true,
      module: requested,
      months,
      start_at: now.toISOString(),
      end_at: endAt.toISOString(),
      grant_id: grant?.id || "",
      entitlement_reconciled: Boolean(reconcile),
    });
  } catch (error: any) {
    return json(500, { error: "gift_failed", message: String(error?.message || error) });
  }
});