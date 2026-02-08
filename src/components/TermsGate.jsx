import React, { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useQueryClient } from "@tanstack/react-query";

const LOCAL_ACCEPT_KEY = "pk_tos_local_accept_v1";
const SESSION_DISMISSED_KEY = "pk_tos_session_dismissed";

function is429(err) {
  const msg = String(err?.message || err || "");
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
}

function hasAccepted(user) {
  const iso = user?.tos_accepted_at;
  if (iso) return true;
  try {
    return localStorage.getItem(LOCAL_ACCEPT_KEY) === "1";
  } catch {
    return false;
  }
}

function isSessionDismissed() {
  try {
    return sessionStorage.getItem(SESSION_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function markSessionDismissed() {
  try {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
  } catch {}
}

export default function TermsGate({ user }) {
  const qc = useQueryClient();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const tosUrl = useMemo(() => `${createPageUrl("TermsOfService")}?view=1`, []);
  const privacyUrl = useMemo(() => `${createPageUrl("PrivacyPolicy")}?view=1`, []);

  useEffect(() => {
    if (isSessionDismissed()) {
      setDismissed(true);
    }
  }, []);

  if (!user) return null;
  if (hasAccepted(user)) return null;
  if (dismissed) return null;

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

  async function onAccept() {
    if (!checked || submitting) return;
    setSubmitting(true);
    setMsg("");

    try {
      const ISO = new Date().toISOString();
      await base44.auth.updateMe({ tos_accepted_at: ISO });
      await clearLocalAccepted();

      markSessionDismissed();
      setDismissed(true);
      
      await qc.invalidateQueries({ queryKey: ["current-user"] });
      setMsg("Saved. Continuing…");
    } catch (e) {
      console.error("[TermsGate] accept failed:", e);

      if (is429(e)) {
        await markLocalAccepted();
        markSessionDismissed();
        setDismissed(true);
        await qc.invalidateQueries({ queryKey: ["current-user"] });
        setMsg("Rate-limited. Continuing temporarily…");
      } else {
        setMsg("We couldn't save your acceptance. Please try again.");
        setSubmitting(false);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#101b2a] p-5 shadow-2xl text-[#E0D8C8]">
        <div className="text-xl font-bold text-white">Before you continue</div>
        <div className="mt-2 text-sm text-[#E0D8C8]/70">
          Please review and accept the Terms of Service and Privacy Policy.
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm">
          <a className="underline font-semibold" href={tosUrl} target="_blank" rel="noreferrer">
            Terms of Service
          </a>
          <span className="text-[#E0D8C8]/50">•</span>
          <a className="underline font-semibold" href={privacyUrl} target="_blank" rel="noreferrer">
            Privacy Policy
          </a>
        </div>

        <label className="mt-4 flex gap-2 items-start">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            I have read and agree to the Terms of Service and Privacy Policy.
          </span>
        </label>

        {msg ? <div className="mt-3 text-xs text-[#E0D8C8]/70">{msg}</div> : null}

        <button
          onClick={onAccept}
          disabled={!checked || submitting}
          className="mt-4 w-full rounded-xl bg-[#7b2d2d] px-4 py-3 font-bold text-white disabled:opacity-70"
        >
          {submitting ? "Saving…" : "Accept and Continue"}
        </button>

        <div className="mt-3 text-[11px] text-[#E0D8C8]/55 leading-snug">
          If requests are rate-limited, the app may temporarily allow access to avoid loops.
        </div>
      </div>
    </div>
  );
}