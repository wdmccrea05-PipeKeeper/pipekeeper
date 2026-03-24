import { useState, useMemo } from "react";

const SESSIONS_KEY = "pk_sessions";

function getSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

function removeSession(id) {
  const sessions = getSessions().filter(s => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export default function SavedSessionsPanel() {
  const [key, setKey] = useState(0);
  const sessions = useMemo(() => getSessions(), [key]);

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
            onClick={() => { removeSession(item.id); setKey(k => k + 1); }}
            className="mt-2 text-xs text-amber-100 border border-amber-500/30 rounded px-2 py-1"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}