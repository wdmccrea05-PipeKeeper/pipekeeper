import { useState, useMemo } from "react";
import { getSavedSessions, removeSavedSessionItem } from "./sessionBuilderStorage.js";

export default function SavedSessionsPanel() {
  const [key, setKey] = useState(0);
  const sessions = useMemo(() => getSavedSessions(), [key]);

  if (!sessions.length) {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-black/20 p-3">
        <p className="text-sm text-amber-100">No saved sessions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {sessions.map(item => (
        <div key={item.id} className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-2">
          <p className="text-sm font-medium text-amber-100">{item.title || "Session"}</p>
          <button
            onClick={() => { removeSavedSessionItem(item.id); setKey(k => k + 1); }}
            className="mt-2 text-xs text-amber-100 border border-amber-500/30 rounded px-2 py-1"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}