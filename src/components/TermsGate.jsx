import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";

const TOS_URL = "https://pipekeeper.app/TermsOfService";
const PRIVACY_URL = "https://pipekeeper.app/PrivacyPolicy";

/**
 * TermsGate
 * - Blocks the app until the logged-in user accepts TOS/Privacy
 * - Persists acceptance via base44.auth.updateMe({ tos_accepted_at: ISO })
 *
 * Props:
 * - user: the current user object from auth.me() / your user query
 */
export default function TermsGate({ user }) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Consider accepted if user has a timestamp.
  const accepted = useMemo(() => {
    const v = user?.tos_accepted_at;
    return typeof v === "string" && v.length > 10;
  }, [user]);

  async function handleAccept() {
    try {
      setError(null);

      if (!checked) {
        setError("Please confirm you agree to the Terms of Service and Privacy Policy.");
        return;
      }

      setBusy(true);

      // Save on the current user (client-side safe)
      await base44.auth.updateMe({
        tos_accepted_at: new Date().toISOString(),
      });

      // Force reload to refresh user state everywhere (simple + reliable)
      window.location.reload();
    } catch (e) {
      setError(e?.message || "Unable to save acceptance. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // If not logged in or already accepted, don't show the gate.
  if (!user || accepted) return null;

  // Block the app with a modal overlay
  return (
    <div style={styles.backdrop}>
        <div style={styles.modal} role="dialog" aria-modal="true" aria-label="Terms acceptance">
          <h2 style={styles.title}>Before you continue</h2>

          <p style={styles.text}>
            Please review and accept the{" "}
            <a href={TOS_URL} target="_blank" rel="noreferrer" style={styles.link}>
              Terms of Service
            </a>{" "}
            and{" "}
            <a href={PRIVACY_URL} target="_blank" rel="noreferrer" style={styles.link}>
              Privacy Policy
            </a>
            .
          </p>

          <div style={styles.checkboxRow}>
            <input
              type="checkbox"
              id="tosAgree"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={busy}
            />
            <label htmlFor="tosAgree" style={styles.checkboxLabel}>
              I agree to the Terms of Service and Privacy Policy.
            </label>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            onClick={handleAccept}
            disabled={busy || !checked}
            style={{
              ...styles.button,
              opacity: busy || !checked ? 0.6 : 1,
              cursor: busy || !checked ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Saving..." : "Accept and Continue"}
          </button>

          <p style={styles.small}>
            If you do not accept, you cannot use PipeKeeper.
          </p>
        </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.72)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    background: "#121212",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 18,
    color: "#fff",
    boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
  },
  title: {
    margin: 0,
    marginBottom: 10,
    fontSize: 20,
    fontWeight: 700,
  },
  text: {
    margin: 0,
    marginBottom: 14,
    lineHeight: 1.45,
    color: "rgba(255,255,255,0.9)",
  },
  link: {
    color: "#8ab4ff",
    textDecoration: "underline",
  },
  checkboxRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 14,
  },
  checkboxLabel: {
    lineHeight: 1.35,
    color: "rgba(255,255,255,0.92)",
  },
  error: {
    marginBottom: 12,
    color: "#ff6b6b",
    fontSize: 13,
  },
  button: {
    width: "100%",
    border: "none",
    borderRadius: 10,
    padding: "12px 14px",
    background: "#2d6cdf",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
  },
  small: {
    marginTop: 10,
    marginBottom: 0,
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
  },
};