import React, { useMemo, useState } from "react";
import { getSavedSessions, removeSavedSessionItem } from "./sessionBuilderStorage.js";

export default function SavedSessionsPanel() {
  const [refreshKey, setRefreshKey] = useState(0);
  const sessions = useMemo(() => getSavedSessions(), [refreshKey]);

  if (!sessions.length) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-black/20 p-4">
        <div className="font-medium text-amber-100">Saved Sessions</div>
        <div className="mt-1 text-sm text-amber-50/70">No saved sessions yet.</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-black/20 p-4 space-y-3">
      <div className="font-medium text-amber-100">Saved Sessions</div>
      {sessions.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3"
        >
          <div className="text-sm font-medium text-amber-100">{item.title}</div>
          <div className="mt-1 text-sm text-amber-50/80">{item.explanation}</div>
          {item.rationale && (
            <div className="mt-2 text-xs text-amber-50/60">{item.rationale}</div>
          )}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                removeSavedSessionItem(item.id);
                setRefreshKey((x) => x + 1);
              }}
              className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs text-amber-100"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}