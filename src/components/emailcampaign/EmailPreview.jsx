import React, { useState } from "react";
import { EMAIL_LANGUAGE_CODES, EMAIL_LANGUAGE_LABELS } from "./emailLanguages";

const ORANGE = "#ff773c";

/**
 * Renders the campaign email from the same copy the sender uses, so what an
 * administrator reviews is what collectors receive.
 */
export default function EmailPreview({ preview, language, onLanguageChange, loading }) {
  const [showPlain, setShowPlain] = useState(false);
  const copy = preview?.copy;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-1.5">
          {EMAIL_LANGUAGE_CODES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onLanguageChange(code)}
              className="px-2.5 py-1 rounded-full text-[11px]"
              style={{
                background: language === code ? "rgba(212,165,116,0.18)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${language === code ? "#D4A574" : "rgba(180,140,75,0.2)"}`,
                color: language === code ? "#D4A574" : "rgba(224,216,200,0.75)",
              }}
            >
              {EMAIL_LANGUAGE_LABELS[code]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowPlain((v) => !v)}
          className="text-[11px] px-2.5 py-1 rounded-full"
          style={{ border: "1px solid rgba(180,140,75,0.3)", color: "#D4A574" }}
        >
          {showPlain ? "Show designed email" : "Show plain-text version"}
        </button>
      </div>

      {loading || !copy ? (
        <p className="text-xs" style={{ color: "rgba(224,216,200,0.5)" }}>Building preview…</p>
      ) : (
        <>
          <div className="rounded-lg p-3 text-[11px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(180,140,75,0.18)" }}>
            <p style={{ color: "rgba(224,216,200,0.55)" }}>Subject</p>
            <p className="mb-2" style={{ color: "#F5F1E7" }}>{preview.subject}</p>
            <p style={{ color: "rgba(224,216,200,0.55)" }}>Preview text</p>
            <p style={{ color: "rgba(224,216,200,0.85)" }}>{preview.preview_text}</p>
          </div>

          {showPlain ? (
            <pre
              className="text-[11px] whitespace-pre-wrap rounded-lg p-4 max-h-[520px] overflow-auto"
              style={{ background: "#ffffff", color: "#0f0e0e", border: "1px solid rgba(180,140,75,0.25)" }}
            >
              {preview.plain_text}
            </pre>
          ) : (
            <div className="rounded-lg overflow-hidden max-h-[560px] overflow-y-auto" style={{ border: "1px solid rgba(180,140,75,0.25)" }}>
              <div style={{ background: ORANGE, padding: "16px 24px" }}>
                <img
                  src={preview.variables?.logo_url}
                  alt="CollectionKeeper"
                  style={{ height: 34, width: "auto" }}
                />
              </div>
              <div style={{ background: "#f8f6f4", padding: "24px 24px 8px" }}>
                <h2 style={{ fontFamily: "'Georgia', serif", color: "#0f0e0e", fontSize: 22, lineHeight: 1.25, margin: 0 }}>
                  {copy.headline}
                </h2>
                <p style={{ color: "#5d5d5d", fontSize: 13, marginTop: 10 }}>{copy.intro}</p>
              </div>
              <div style={{ background: "#ffffff", padding: "18px 24px" }}>
                <p style={{ color: "#0f0e0e", fontSize: 13 }}>{copy.gift}</p>
                <ul style={{ margin: "6px 0 12px 18px", color: "#0f0e0e", fontSize: 13 }}>
                  <li>PipeKeeper</li>
                  <li>WhiskeyKeeper</li>
                  <li>CigarKeeper</li>
                  <li>WineKeeper</li>
                </ul>
                <p style={{ color: "#0f0e0e", fontSize: 13, fontWeight: 700 }}>{copy.featuresIntro}</p>
                <ul style={{ margin: "6px 0 0 18px", color: "#0f0e0e", fontSize: 13 }}>
                  {copy.features.map((feature) => (
                    <li key={feature} style={{ marginBottom: 4 }}>{feature}</li>
                  ))}
                </ul>
              </div>
              <div style={{ background: "#f8f6f4", padding: "18px 24px" }}>
                <p style={{ color: "#0f0e0e", fontSize: 13, fontWeight: 700 }}>{copy.deadline}</p>
                <p style={{ color: "#5d5d5d", fontSize: 12, marginTop: 6 }}>{copy.timing}</p>
                <div style={{ textAlign: "center", margin: "14px 0" }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: ORANGE,
                      color: "#000000",
                      fontWeight: 700,
                      fontSize: 14,
                      padding: "12px 26px",
                      borderRadius: 6,
                    }}
                  >
                    {copy.cta}
                  </span>
                </div>
                <p style={{ color: "#5d5d5d", fontSize: 12, textAlign: "center" }}>{copy.promise}</p>
              </div>
              <div style={{ background: "#ffffff", padding: "18px 24px" }}>
                <p style={{ color: "#0f0e0e", fontSize: 13 }}>{copy.thanks}</p>
                <p style={{ color: "#0f0e0e", fontSize: 13 }}>{copy.signoff}</p>
                <p style={{ fontFamily: "'Georgia', serif", color: "#0f0e0e", fontSize: 16, marginTop: 10 }}>{copy.tagline}</p>
                <p style={{ color: "#5d5d5d", fontSize: 12 }}>{copy.builtBy}</p>
                <p style={{ color: ORANGE, fontSize: 12, marginTop: 6 }}>{copy.follow}</p>
              </div>
              <div style={{ background: "#f8f6f4", padding: "16px 24px 22px", borderTop: "1px solid #e5e5e5" }}>
                <p style={{ color: "#5d5d5d", fontSize: 10 }}>{copy.footerWhy}</p>
                <p style={{ color: "#5d5d5d", fontSize: 10 }}>
                  CollectionKeeper · {preview.variables?.mailing_address || "mailing address not set"}
                </p>
                <p style={{ color: "#5d5d5d", fontSize: 10, textDecoration: "underline" }}>{copy.unsubscribe}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}