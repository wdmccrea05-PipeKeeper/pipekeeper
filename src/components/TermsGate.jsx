import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/components/utils/createPageUrl";

const LOCAL_BYPASS_KEY = "pk_tos_accepted_local_v1";

export default function TermsGate({ user }) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const tosUrl = useMemo(() => `${createPageUrl("TermsOfService")}?view=1`, []);
  const privacyUrl = useMemo(() => `${createPageUrl("PrivacyPolicy")}?view=1`, []);

  // If the component remounts (due to query invalidation / refresh), keep the checkbox checked.
  useEffect(() => {
    try {
      const v = localStorage.getItem("pk_tos_checkbox_v1");
      if (v === "1") setChecked(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("pk_tos_checkbox_v1", checked ? "1" : "0");
    } catch {}
  }, [checked]);

  // Treat ToS as accepted if either:
  // - backend profile has an accepted timestamp
  // - local bypass exists (emergency escape hatch)
  const alreadyAccepted = useMemo(() => {
    try {
      if (localStorage.getItem(LOCAL_BYPASS_KEY) === "1") return true;
    } catch {}

    const iso = user?.tos_accepted_at || user?.userProfile?.tos_accepted_at;
    if (!iso) return false;
    const t = Date.parse(iso);
    return Number.isFinite(t);
  }, [user]);

  if (!user) return null;
  if (alreadyAccepted) return null;

  async function acceptOnServer() {
    setSubmitting(true);
    setErr("");

    try {
      // Explicit POST + robust response handling
      const res = await base44.functions.invoke("acceptTermsForMe", {
        method: "POST",
        body: {},
      });

      const ok = Boolean(res?.data?.ok);
      if (!ok) {
        const msg = res?.data?.error || "Failed to accept terms";
        throw new Error(msg);
      }

      // Backend accepted: clear local bypass & reload to refresh profile
      try {
        localStorage.removeItem(LOCAL_BYPASS_KEY);
        localStorage.removeItem("pk_tos_checkbox_v1");
      } catch {}

      setTimeout(() => window.location.reload(), 150);
    } catch (e) {
      console.error("[TermsGate] accept failed:", e);
      setErr("Could not save acceptance right now. You may continue temporarily or try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function continueTemporarily() {
    // Emergency escape hatch:
    // Allows app use even if server acceptance fails due to duplicates / transient API issues.
    try {
      localStorage.setItem(LOCAL_BYPASS_KEY, "1");
    } catch {}
    setTimeout(() => window.location.reload(), 50);
  }

  const disabled = submitting; // DO NOT lock behind checkbox anymore (checkbox is still shown)

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true">
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.title}>Before you continue</div>
          <div style={styles.subtitle}>
            Please review and accept the Terms of Service and Privacy Policy.
          </div>
        </div>

        <div style={styles.linksRow}>
          <a href={tosUrl} target="_blank" rel="noreferrer" style={styles.link}>
            Terms of Service
          </a>
          <span style={styles.dot}>•</span>
          <a href={privacyUrl} target="_blank" rel="noreferrer" style={styles.link}>
            Privacy Policy
          </a>
        </div>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={styles.checkbox}
          />
          <span style={styles.checkboxText}>
            I have read and agree to the Terms of Service and Privacy Policy.
          </span>
        </label>

        {err ? <div style={styles.error}>{err}</div> : null}

        <button
          onClick={() => {
            // Still require the checkbox logically, but don’t “lock” forever if remounting happens.
            if (!checked) {
              setErr("Please check the box to confirm you agree.");
              return;
            }
            if (!submitting) acceptOnServer();
          }}
          disabled={disabled}
          style={{
            ...styles.button,
            opacity: disabled ? 0.7 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Saving..." : "Accept and Continue"}
        </button>

        <button
          onClick={continueTemporarily}
          disabled={submitting}
          style={{
            ...styles.secondaryButton,
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          Continue temporarily (if saving fails)
        </button>

        <p style={styles.small}>
          If acceptance fails repeatedly, it usually means your user profile record is duplicated or
          permissions are misconfigured. This temporary option lets you use the app while we repair it.
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 999999,
    background: "rgba(0,0,0,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "min(720px, 100%)",
    borderRadius: 16,
    background:
      "linear-gradient(180deg, rgba(20,34,52,0.98), rgba(14,24,38,0.98))",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    padding: 20,
    color: "#f3e7d3",
  },
  header: { marginBottom: 14 },
  title: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    color: "#ffffff",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "rgba(243,231,211,0.85)",
    lineHeight: 1.4,
  },
  linksRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  link: {
    color: "#f3e7d3",
    textDecoration: "underline",
    fontWeight: 700,
  },
  dot: { color: "rgba(243,231,211,0.55)" },
  checkboxRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    userSelect: "none",
    marginBottom: 12,
  },
  checkbox: { marginTop: 3 },
  checkboxText: {
    fontSize: 14,
    color: "rgba(243,231,211,0.95)",
    lineHeight: 1.35,
  },
  error: {
    marginTop: 10,
    marginBottom: 10,
    padding: "10px 12px",
    borderRadius: 10,
    background: "rgba(180, 60, 60, 0.18)",
    border: "1px solid rgba(180, 60, 60, 0.35)",
    color: "#ffd7d7",
    fontSize: 13,
    lineHeight: 1.35,
  },
  button: {
    width: "100%",
    marginTop: 8,
    border: "none",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#7b2d2d",
    color: "#fff",
    fontSize: 15,
    fontWeight: 800,
  },
  secondaryButton: {
    width: "100%",
    marginTop: 10,
    borderRadius: 12,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#f3e7d3",
    fontSize: 13,
    fontWeight: 700,
  },
  small: {
    marginTop: 10,
    marginBottom: 0,
    fontSize: 12,
    color: "rgba(243,231,211,0.65)",
    lineHeight: 1.35,
  },
};