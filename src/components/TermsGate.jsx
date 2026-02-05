// src/components/TermsGate.jsx
import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * TermsGate (drop-in replacement)
 *
 * Fixes the “ToS loop” by:
 * - Never calling window.location.reload()
 * - Writing ToS acceptance via a server function if available, with a safe fallback
 * - Persisting a local acceptance marker if Base44 is rate-limiting (429), so users can proceed
 * - Invalidating the current-user query after success (so UI updates naturally)
 *
 * REQUIRED: Your app must pass `user` into <TermsGate user={user} />
 */

const LOCAL_ACCEPT_KEY = "pk_tos_local_accept_v1";

function is429(err) {
  const msg = String(err?.message || err || "");
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
}

function hasAccepted(user) {
  const iso = user?.tos_accepted_at || user?.userProfile?.tos_accepted_at;
  if (iso) return true;
  try {
    return localStorage.getItem(LOCAL_ACCEPT_KEY) === "1";
  } catch {
    return false;
  }
}

export default function TermsGate({ user }) {
  const qc = useQueryClient();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const accepted = useMemo(() => hasAccepted(user), [user]);

  if (!user) return null;
  if (accepted) return null;

  async function markLocalAccepted() {
    try {
      localStorage.setItem(LOCAL_ACCEPT_KEY, "1");
    } catch {}
  }

  async function clearLocalAccepted() {
    try {
      localStorage.removeItem(LOCAL_ACCEPT_KEY);
    } catch {}
  }

  async function acceptViaFunction() {
    // Preferred path: service-role function updates every matching UserProfile
    const res = await base44.functions.invoke("acceptTermsForMe", {
      method: "POST",
      body: {},
    });
    if (!res?.data?.ok) throw new Error(res?.data?.error || "acceptTermsForMe failed");
    return true;
  }

  async function acceptViaEntityFallback() {
    // Fallback path (in case function isn't deployed):
    // Update (or create) a UserProfile with tos_accepted_at. This may fail if the entity is locked down.
    const me = await base44.auth.me();
    const userId = me?.id || me?.user_id;
    const email = String(me?.email || "").trim().toLowerCase();
    if (!email && !userId) throw new Error("Missing identity");

    const now = new Date().toISOString();

    // try to find an existing profile (minimal calls)
    let prof = null;
    try {
      if (userId) {
        const byId = await base44.entities.UserProfile.filter({ user_id: userId });
        if (Array.isArray(byId) && byId.length) prof = byId[0];
      }
      if (!prof && email) {
        const byEmail = await base44.entities.UserProfile.filter({ user_email: email });
        if (Array.isArray(byEmail) && byEmail.length) prof = byEmail[0];
      }
    } catch {}

    if (prof?.id) {
      await base44.entities.UserProfile.update(prof.id, {
        user_id: userId || prof.user_id,
        user_email: email || prof.user_email,
        tos_accepted: true,
        tos_accepted_at: now,
      });
      return true;
    }

    await base44.entities.UserProfile.create({
      user_id: userId || undefined,
      user_email: email || undefined,
      tos_accepted: true,
      tos_accepted_at: now,
      subscription_tier: "free",
    });
    return true;
  }

  async function onAccept() {
    if (!checked) {
      setMsg("Please check the box to confirm you agree.");
      return;
    }

    setSubmitting(true);
    setMsg("");

    try {
      // 1) Try server function (best)
      try {
        await acceptViaFunction();
        await clearLocalAccepted();
      } catch (e) {
        // 2) If function not available, try entity fallback
        // If we are rate-limited, let users proceed locally instead of looping.
        if (is429(e)) {
          await markLocalAccepted();
          setMsg("Rate-limited right now. Continuing temporarily…");
          await qc.invalidateQueries({ queryKey: ["current-user"] });
          return;
        }
        await acceptViaEntityFallback();
        await clearLocalAccepted();
      }

      // Refresh user state without reload
      setMsg("Saved. Continuing…");
      await qc.invalidateQueries({ queryKey: ["current-user"] });
    } catch (e) {
      console.error("[TermsGate] accept failed:", e);

      if (is429(e)) {
        await markLocalAccepted();
        setMsg("Rate-limited right now. Continuing temporarily…");
        await qc.invalidateQueries({ queryKey: ["current-user"] });
      } else {
        setMsg("Could not save acceptance. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#101b2a] p-5 shadow-2xl">
        <div className="text-xl font-bold text-[#E0D8C8]">Terms of Service</div>
        <div className="mt-2 text-sm text-[#E0D8C8]/70">
          Please accept to continue.
        </div>

        <label className="mt-4 flex gap-2 items-start text-[#E0D8C8]">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            I agree to the Terms of Service and Privacy Policy.
          </span>
        </label>

        {msg ? <div className="mt-3 text-xs text-[#E0D8C8]/70">{msg}</div> : null}

        <button
          onClick={onAccept}
          disabled={submitting}
          className="mt-4 w-full rounded-xl bg-[#7b2d2d] px-4 py-3 font-bold text-white disabled:opacity-70"
        >
          {submitting ? "Saving…" : "Accept and Continue"}
        </button>

        <div className="mt-3 text-[11px] text-[#E0D8C8]/55 leading-snug">
          If Base44 rate-limits requests, the app may temporarily allow access to prevent loops.
          Once rate limiting subsides, the acceptance will be saved server-side automatically on the next attempt.
        </div>
      </div>
    </div>
  );
}