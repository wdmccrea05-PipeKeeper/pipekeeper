import React from "react";

function humanizeKey(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\bmm\b/gi, "mm")
    .replace(/\bg\b/gi, "g")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeValue(value) {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeRecordType(recordType) {
  switch (recordType) {
    case "pipe": return "Pipe";
    case "blend": return "Blend";
    case "bottle": return "Bottle";
    default: return humanizeValue(recordType);
  }
}

export default function CuratorActionResultCard({ item, state, onAccept, onReject, onAskCurator }) {
  const isApplying = state?.status === "applying";
  const isAccepted = state?.status === "accepted";
  const isRejected = state?.status === "rejected";
  const isPairing = item.type === "pairing_recommendation";
  const isSession = item.type === "session_builder";
  const isNonMutating = isPairing || isSession;
  const proposedEntries = Object.entries(item.proposedChanges || {});

  return (
    <div className="rounded-xl border border-amber-500/20 bg-black/20 p-4">

      <div className="min-w-0">
        <div className="text-base font-medium text-amber-100">{item.title}</div>

        {isSession ? (
          <div className="mt-1 space-y-0.5">
            {item.recordName && (
              <div className="text-xs uppercase tracking-wide text-amber-500/70">Pipe: {item.recordName}</div>
            )}
            {item.blendName && (
              <div className="text-xs uppercase tracking-wide text-amber-500/70">Blend: {item.blendName}</div>
            )}
            {item.bottleName && (
              <div className="text-xs uppercase tracking-wide text-amber-500/70">Pour: {item.bottleName}</div>
            )}
          </div>
        ) : (
          item.recordName && (
            <div className="mt-1 text-xs uppercase tracking-wide text-amber-500/70">
              {humanizeRecordType(item.recordType)}: {item.recordName}
            </div>
          )
        )}

        <div className="mt-2 text-sm text-amber-50/85">{item.explanation}</div>

        {item.rationale && (
          <div className="mt-2 text-xs text-amber-50/60">{item.rationale}</div>
        )}

        {typeof item.confidence === "number" && (
          <div className="mt-2 text-xs text-amber-50/60">
            Confidence: {Math.round(item.confidence * 100)}%
          </div>
        )}
      </div>

      {proposedEntries.length > 0 && !isNonMutating && (
        <div className="mt-3 rounded-lg bg-amber-500/5 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-amber-500/70">Proposed Changes</div>
          <div className="space-y-2">
            {proposedEntries.map(([key, value]) => (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 border-b border-amber-500/10 pb-2 last:border-b-0 last:pb-0"
              >
                <div className="text-xs text-amber-50/60">{humanizeKey(key)}</div>
                <div className="text-sm text-amber-100 sm:text-right">{humanizeValue(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state?.error && (
        <div className="mt-3 text-sm text-red-400">{state.error}</div>
      )}

      {(isAccepted || isRejected) && (
        <div className="mt-3 text-sm text-amber-200/80">
          {isAccepted ? "Applied." : "Dismissed."}
        </div>
      )}

      {!isAccepted && !isRejected && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAccept}
            disabled={isApplying}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {isApplying ? "Applying..." : isNonMutating ? "Try This Session" : "Accept"}
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={isApplying}
            className="rounded-lg border border-amber-500/30 px-3 py-2 text-sm text-amber-100 disabled:opacity-50"
          >
            {isNonMutating ? "Skip" : "Reject"}
          </button>

          <button
            type="button"
            onClick={onAskCurator}
            disabled={isApplying}
            className="rounded-lg border border-amber-500/30 px-3 py-2 text-sm text-amber-100 disabled:opacity-50"
          >
            Ask Curator
          </button>
        </div>
      )}

    </div>
  );
}