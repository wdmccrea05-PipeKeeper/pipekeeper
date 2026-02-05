// src/components/TermsGate.jsx
import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";

const LOCAL_ACCEPT_KEY = "pk_tos_local_accept_v1";

function is429(err) {
  const msg = String(err?.message || err || "");
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
}

export default function TermsGate({ user }) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const accepted = useMemo(() => {
    try {
      if (localStorage.getItem(LOCAL_ACCEPT_KEY) === "1") return true;
    } catch {}
    const iso = user?.tos_accepted_at || user?.userProfile?.tos_accepted_at;
    return Boolean(iso);
  }, [user]);

  if (!user) return null;
  if (accepted) return null;

  async function onAccept() {
    if (!checked) {
      setMsg("Please check the box to confirm you agree.");
      return;
    }

    setSubmitting(true);
    setMsg("");

    try {
      const res = await base44.functions.invoke("acceptTermsForMe", { method: "POST", body: {} });
      if (!res?.data?.ok) throw new Error(res?.data?.error || "Failed to accept terms");

      // Don’t hard-reload; just soft refresh the app state
      // (rate limits + reload loops are killing you)
      setMsg("Saved.  Continuing…");
      setTimeout(() => {
        // Let React Query refetch naturally later; we just remove the gate now.
        try { localStorage.removeItem(LOCAL_ACCEPT_KEY); } catch {}
        window.location.href = "/"; // simple nav; no repeated reloads
      }, 300);
    } catch (e) {
      console.error("[TermsGate] accept failed:", e);

      // If rate-limited, allow temporary local acceptance so you can proceed without hammering APIs
      if (is429(e)) {
        try { localStorage.setItem(LOCAL_ACCEPT_KEY, "1"); } catch {}
        setMsg("Base44 is rate-limiting requests.  Continuing temporarily…");
        setTimeout(() => (window.location.href = "/"), 300);
      } else {
        setMsg("Could not save right now. Please try again.");
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
      </div>
    </div>
  );
}