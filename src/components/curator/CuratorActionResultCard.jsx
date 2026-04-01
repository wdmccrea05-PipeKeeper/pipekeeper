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
  if (Array.isArray(value)) return value.join(", ");
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeRecordType(recordType) {
  switch (recordType) {
    case "pipe":
      return "Pipe";
    case "blend":
    case "tobacco":
      return "Blend";
    case "bottle":
      return "Bottle";
    default:
      return humanizeValue(recordType);
  }
}

function SessionLine({ label, value }) {
  if (!value) return null;
  return (
    <div className="text-xs uppercase tracking-wide text-amber-500/78">
      {label}: {value}
    </div>
  );
}

function buildSessionItemLines(item) {
  const pipeName =
    item.pipeName ||
    item.recordName ||
    item.pipe?.name ||
    item.session?.pipeName ||
    null;

  const blendName =
    item.blendName ||
    item.blend?.name ||
    item.session?.blendName ||
    null;

  const bottleName =
    item.bottleName ||
    item.pourName ||
    item.whiskeyName ||
    item.bottle?.name ||
    item.session?.bottleName ||
    null;

  return { pipeName, blendName, bottleName };
}

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

  const isPairing = item.type === "pairing_recommendation";
  const isSession = item.type === "session_builder";
  const isSimilar = item.type === "similar_item";
  const isNonMutating = isPairing || isSession || isSimilar;

  const displayTitle =
    item.title ||
    item.itemName ||
    item.recordName ||
    item.anchorName ||
    "Recommendation";

  const displayExplanation =
    item.explanation ||
    item.recommendation ||
    item.issue ||
    item.whyFitsYou ||
    "Review this item.";

  const displayRationale =
    item.rationale ||
    item.whyFitsYou ||
    "";

  const proposedChangePayload =
    item.proposedChanges ||
    item.proposedChange?.payload ||
    {};

  const proposedEntries = Object.entries(proposedChangePayload || {});
  const characteristics = Array.isArray(item.characteristics)
    ? item.characteristics.filter(Boolean)
    : [];

  const { pipeName, blendName, bottleName } = buildSessionItemLines(item);

  return (
    <div className="rounded-xl border border-amber-500/20 bg-black/20 p-4">
      <div className="min-w-0">
        <div className="text-base font-medium text-amber-100">
          {displayTitle}
        </div>

        {isSession || isPairing ? (
          <div className="mt-2 space-y-1">
            <SessionLine label="Pipe" value={pipeName} />
            <SessionLine label="Blend" value={blendName} />
            <SessionLine label="Pour" value={bottleName} />
          </div>
        ) : (
          (item.recordName || item.recordType || item.category || item.anchorName) && (
            <div className="mt-1 text-xs uppercase tracking-wide text-amber-500/70">
              {item.recordName
                ? `${humanizeRecordType(item.recordType)}: ${item.recordName}`
                : item.category
                ? item.category
                : item.anchorName
                ? `Based on: ${item.anchorName}`
                : humanizeRecordType(item.recordType)}
            </div>
          )
        )}

        <div className="mt-3 text-sm text-amber-50/85">
          {displayExplanation}
        </div>

        {displayRationale && displayRationale !== displayExplanation && (
          <div className="mt-2 text-xs text-amber-50/65 whitespace-pre-line">
            {displayRationale}
          </div>
        )}

        {characteristics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {characteristics.map((trait, idx) => (
              <span
                key={`${trait}-${idx}`}
                className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-xs text-amber-100/80"
              >
                {trait}
              </span>
            ))}
          </div>
        )}

        {typeof item.confidence === "number" && (
          <div className="mt-2 text-xs text-amber-50/60">
            Confidence: {Math.round(item.confidence * 100)}%
          </div>
        )}

        {typeof item.confidence === "string" && item.confidence.trim() !== "" && (
          <div className="mt-2 text-xs text-amber-50/60">
            Confidence: {humanizeValue(item.confidence)}
          </div>
        )}
      </div>

      {proposedEntries.length > 0 && !isNonMutating && (
        <div className="mt-3 rounded-lg bg-amber-500/5 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-amber-500/70">
            Proposed Changes
          </div>
          <div className="space-y-2">
            {proposedEntries.map(([key, value]) => (
              <div
                key={key}
                className="flex flex-col gap-1 border-b border-amber-500/10 pb-2 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="text-xs text-amber-50/60">
                  {humanizeKey(key)}
                </div>
                <div className="text-sm text-amber-100 sm:text-right">
                  {humanizeValue(value)}
                </div>
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
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onAccept}
            disabled={isApplying}
            className="whitespace-nowrap rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-black disabled:opacity-50"
          >
            {isApplying ? "Applying..." : isNonMutating ? "Try This" : "Accept"}
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={isApplying}
            className="whitespace-nowrap rounded-lg border border-amber-500/30 px-3 py-1.5 text-sm text-amber-100 disabled:opacity-50"
          >
            {isNonMutating ? "Skip" : "Reject"}
          </button>

          <button
            type="button"
            onClick={onAskCurator}
            disabled={isApplying}
            className="whitespace-nowrap rounded-lg border border-amber-500/30 px-3 py-1.5 text-sm text-amber-100 disabled:opacity-50"
          >
            Ask Curator
          </button>
        </div>
      )}
    </div>
  );
}