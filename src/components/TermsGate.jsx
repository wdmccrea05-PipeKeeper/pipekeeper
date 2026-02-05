import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function TermsGate({ user }) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const tosUrl = useMemo(() => `${createPageUrl("TermsOfService")}?view=1`, []);
  const privacyUrl = useMemo(
    () => `${createPageUrl("PrivacyPolicy")}?view=1`,
    []
  );

  const alreadyAccepted = useMemo(() => {
    const iso = user?.tos_accepted_at;
    if (!iso) return false;
    const t = Date.parse(iso);
    return Number.isFinite(t);
  }, [user]);

  if (!user) return null;
  if (alreadyAccepted) return null;

  async function onAccept() {
    if (!checked || submitting) return;
    setSubmitting(true);
    setErr("");

    try {
      const ISO = new Date().toISOString();
      // Retry logic for network issues
      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await base44.auth.updateMe({ tos_accepted_at: ISO });
          setTimeout(() => window.location.reload(), 100);
          return;
        } catch (e) {
          lastError = e;
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 500 + attempt * 500));
          }
        }
      }
      throw lastError;
    } catch (e) {
      setErr(
        e?.message ||
          "We couldn’t save your acceptance. Please try again (or contact support)."
      );
    } finally {
      setSubmitting(false);
    }
  }

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
          <a
            href={privacyUrl}
            target="_blank"
            rel="noreferrer"
            style={styles.link}
          >
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
          onClick={onAccept}
          disabled={!checked || submitting}
          style={{
            ...styles.button,
            opacity: !checked || submitting ? 0.6 : 1,
            cursor: !checked || submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Saving..." : "Accept and Continue"}
        </button>

        <p style={styles.small}>
          You can review these documents at any time from Help or your Profile
          menu.
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
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
  small: {
    marginTop: 10,
    marginBottom: 0,
    fontSize: 12,
    color: "rgba(243,231,211,0.65)",
    lineHeight: 1.35,
  },
};