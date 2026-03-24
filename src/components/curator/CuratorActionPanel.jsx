import React from "react";
import CuratorActionResultCard from "./CuratorActionResultCard";
import EmptyActionResultCard from "./EmptyActionResultCard";
import CuratorActionErrorCard from "./CuratorActionErrorCard";

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
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: "rgba(212, 165, 116, 0.2)",
          background: "rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          className="text-sm"
          style={{ color: "rgba(245, 241, 231, 0.8)" }}
        >
          Curator is reviewing your collection...
        </div>
      </div>
    );
  }

  if (actionRun.status === "timeout" || actionRun.status === "error") {
    return (
      <CuratorActionErrorCard
        error={actionRun.error}
        onRetry={onRetry}
        onAskCurator={onAskCurator}
      />
    );
  }

  if (actionRun.status === "empty") {
    return (
      <EmptyActionResultCard
        summary={actionRun.summary}
        onAskCurator={onAskCurator}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="text-sm"
        style={{ color: "rgba(245, 241, 231, 0.75)" }}
      >
        {actionRun.summary}
      </div>

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