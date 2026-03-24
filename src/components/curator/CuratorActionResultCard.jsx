import React from "react";

export default function CuratorActionResultCard({
  item,
  state,
  onAccept,
  onReject,
  onAskCurator,
}) {
  const isApplying = state?.status === "applying";
  const isAccepted = state?.status === "accepted";
  const isRejected = state?.status === "rejected";

  return (
    <div className="rounded-xl border border-amber-500/20 bg-black/20 p-4">
      <div className="min-w-0">
        <div className="text-base font-medium text-amber-100">{item.title}</div>

        {item.recordName ? (
          <div className="mt-1 text-xs uppercase tracking-wide text-amber-500/70">
            {item.recordType}: {item.recordName}
          </div>
        ) : null}

        <div className="mt-2 text-sm text-amber-50/85">{item.explanation}</div>

        {item.rationale ? (
          <div className="mt-2 text-xs text-amber-50/60">{item.rationale}</div>
        ) : null}

        {typeof item.confidence === "number" ? (
          <div className="mt-2 text-xs text-amber-50/60">
            Confidence: {Math.round(item.confidence * 100)}%
          </div>
        ) : null}
      </div>

      {item.proposedChanges && Object.keys(item.proposedChanges).length > 0 ? (
        <div className="mt-3 rounded-lg bg-amber-500/5 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-amber-500/70">
            Proposed Changes
          </div>
          <pre className="overflow-auto whitespace-pre-wrap break-words text-xs text-amber-50/75">
            {JSON.stringify(item.proposedChanges, null, 2)}
          </pre>
        </div>
      ) : null}

      {state?.error ? (
        <div className="mt-3 text-sm text-red-400">{state.error}</div>
      ) : null}

      {(isAccepted || isRejected) && (
        <div className="mt-3 text-sm text-amber-200/80">
          {isAccepted ? "Applied." : "Dismissed."}
        </div>
      )}

      {!isAccepted && !isRejected ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAccept}
            disabled={isApplying}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {isApplying ? "Applying..." : "Accept"}
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={isApplying}
            className="rounded-lg border border-amber-500/30 px-3 py-2 text-sm text-amber-100 disabled:opacity-50"
          >
            Reject
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
      ) : null}
    </div>
  );
}