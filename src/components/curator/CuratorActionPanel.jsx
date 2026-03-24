import React from "react";
import CuratorActionResultCard from "./CuratorActionResultCard";

export default function CuratorActionPanel({
  actionRun,
  itemStates,
  onRetry,
  onAccept,
  onReject,
  onAskCurator,
}) {
  if (!actionRun) return null;

  if (actionRun.status === "running") {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-black/20 p-4">
        <div className="text-sm text-amber-50/80">
          Curator is reviewing your collection...
        </div>
      </div>
    );
  }

  if (actionRun.status === "timeout" || actionRun.status === "error") {
    return (
      <div className="rounded-xl border border-red-500/20 bg-black/20 p-4">
        <div className="font-medium text-red-300">
          Curator could not complete this action.
        </div>
        <div className="mt-1 text-sm text-amber-50/70">
          {actionRun.error || "Please try again."}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-black"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (actionRun.status === "empty") {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-black/20 p-4">
        <div className="font-medium text-amber-100">
          No actionable recommendations right now
        </div>
        <div className="mt-1 text-sm text-amber-50/70">
          {actionRun.summary}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-amber-50/75">{actionRun.summary}</div>

      {actionRun.items.map((item) => (
        <CuratorActionResultCard
          key={item.id}
          item={item}
          state={itemStates[item.id] || { status: "idle", error: null }}
          onAccept={() => onAccept(item)}
          onReject={() => onReject(item)}
          onAskCurator={() => onAskCurator(item)}
        />
      ))}
    </div>
  );
}
