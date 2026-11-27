import React, { useState } from "react";
import { EMAIL_LANGUAGE_CODES, EMAIL_LANGUAGE_LABELS } from "./emailLanguages";

/**
 * Shows the exact HTML the sender builds, rendered in an isolated frame, plus
 * the plain-text alternative that goes out with it.
 */
export default function EmailPreview({ preview, language, onLanguageChange, loading }) {
  const [showPlain, setShowPlain] = useState(false);

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
          onClick={() => setShowPlain((value) => !value)}
          className="text-[11px] px-2.5 py-1 rounded-full"
          style={{ border: "1px solid rgba(180,140,75,0.3)", color: "#D4A574" }}
        >
          {showPlain ? "Show designed email" : "Show plain-text version"}
        </button>
      </div>

      {loading || !preview ? (
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
              className="text-[11px] whitespace-pre-wrap rounded-lg p-4 max-h-[620px] overflow-auto"
              style={{ background: "#ffffff", color: "#0f0e0e", border: "1px solid rgba(180,140,75,0.25)" }}
            >
              {preview.plain_text}
            </pre>
          ) : (
            <iframe
              title="Campaign email preview"
              srcDoc={preview.html}
              sandbox=""
              style={{
                width: "100%",
                height: 900,
                border: "1px solid rgba(180,140,75,0.25)",
                borderRadius: 8,
                background: "#f4f1ec",
              }}
            />
          )}
        </>
      )}
    </div>
  );
}