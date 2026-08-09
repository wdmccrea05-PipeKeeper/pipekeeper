import React from "react";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";
import PipeIcon from "@/components/icons/PipeIcon";
import { isBestAvailable, getConfidenceTier } from "./pipeClubPairing";

const ACCENT = "#D4A574";
const MUTED = "rgba(224,216,200,0.7)";

function ConfidenceBadge({ tier }) {
  const config = {
    high:   { label: "High Confidence",   bg: "rgba(46,125,92,0.2)",  border: "rgba(46,125,92,0.4)",  color: "#6fcf97" },
    medium: { label: "Medium Confidence", bg: "rgba(180,140,75,0.2)", border: "rgba(180,140,75,0.35)", color: "#D4A574" },
    low:    { label: "Low Confidence",    bg: "rgba(163,92,92,0.2)",  border: "rgba(163,92,92,0.35)", color: "#e07070" },
  }[tier] ?? { label: "Unknown", bg: "rgba(80,80,80,0.2)", border: "rgba(80,80,80,0.3)", color: "#aaa" };

  return (
    <span
      className="text-xs px-2.5 py-0.5 rounded-full font-medium"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function PipeResultCard({ result, label, isPrimary }) {
  if (!result) return null;
  const bestAvail = isPrimary && isBestAvailable(result);
  const tier = getConfidenceTier(result);

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: isPrimary ? "rgba(60,40,20,0.55)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isPrimary ? "rgba(180,140,75,0.4)" : "rgba(180,140,75,0.18)"}`,
      }}
    >
      {/* Header label */}
      <div className="flex items-center gap-2 flex-wrap">
        {isPrimary ? (
          bestAvail ? (
            <AlertTriangle className="w-4 h-4 text-[#D4A574] flex-shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-[#6fcf97] flex-shrink-0" />
          )
        ) : (
          <Info className="w-4 h-4 text-[#B48C4B] flex-shrink-0" />
        )}
        <span
          className="text-xs uppercase tracking-widest font-semibold"
          style={{ color: isPrimary ? (bestAvail ? "#D4A574" : "#6fcf97") : "#B48C4B" }}
        >
          {bestAvail ? "Best Available" : label}
        </span>
        {isPrimary && <ConfidenceBadge tier={tier} />}
      </div>

      {/* Pipe name */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(180,140,75,0.15)", border: "1px solid rgba(180,140,75,0.25)" }}
        >
          <PipeIcon className="w-5 h-5" color={ACCENT} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[#F5F1E7] text-base leading-tight">{result.pipe_name}</p>
          {result.normalizedPipe?.maker && (
            <p className="text-xs text-[#B48C4B] mt-0.5">{result.normalizedPipe.maker}</p>
          )}
          {result.bowl_name && (
            <p className="text-xs text-[#D8C7A6]/80 mt-0.5">Bowl: {result.bowl_name}</p>
          )}
        </div>
      </div>

      {/* Why bullets */}
      {result.why && (
        <div
          className="rounded-xl p-3 text-sm"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.12)" }}
        >
          {result.why.split(/\n|•/).map((s) => s.trim()).filter(Boolean).map((line, i) => (
            <p key={i} className="text-[rgba(224,216,200,0.8)] leading-relaxed flex gap-1.5">
              <span className="opacity-50 flex-shrink-0">•</span>
              <span>{line}</span>
            </p>
          ))}
        </div>
      )}

      {/* Warning when best-available */}
      {bestAvail && (
        <p
          className="text-xs italic rounded-lg p-2.5"
          style={{ color: MUTED, background: "rgba(180,140,75,0.06)", border: "1px solid rgba(180,140,75,0.12)" }}
        >
          This is the best option among the pipes you brought, but it may not be the ideal pairing.
          A more suitable pipe would be preferable for this tobacco.
        </p>
      )}
    </div>
  );
}

/**
 * PipeClubResults — displays canonical Best Choice / Best Available + one Alternative.
 *
 * Props:
 *   best         {object}    - top result from rankPresentPipes()
 *   alternative  {object}    - second result from rankPresentPipes()
 *   blendName    {string}
 */
export default function PipeClubResults({ best, alternative, blendName }) {
  if (!best) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ border: "1px solid rgba(180,140,75,0.18)" }}>
        <p className="text-[#D8C7A6]/60 text-sm">No pipes were evaluated. Select at least one pipe present at the meeting.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {blendName && (
        <p className="text-sm text-[#D8C7A6]/70">
          Best pipe{alternative ? "s" : ""} for <span className="text-[#D4A574] font-medium">{blendName}</span>:
        </p>
      )}

      <PipeResultCard result={best} label="Best Choice" isPrimary />

      {alternative && (
        <PipeResultCard result={alternative} label="Alternative" isPrimary={false} />
      )}

      {!alternative && (
        <p className="text-xs text-center text-[#D8C7A6]/40 italic">Only one pipe was evaluated.</p>
      )}
    </div>
  );
}
