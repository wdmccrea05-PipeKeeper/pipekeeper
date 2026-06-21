import { useState, useMemo } from "react";
import { useTranslation } from '@/components/i18n/safeTranslation';

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
  const { t } = useTranslation();
  const [key, setKey] = useState(0);
  const sessions = useMemo(() => getSessions(), [key]);

  if (!sessions.length) {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-black/20 p-3">
        <p className="text-sm text-amber-100">{t("auto.components_curator_SavedSessionsPanel.no_saved_sessions_16v92i")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {sessions.map(item => {
        const pipeName = item.recordName || item.pipeName || null;
        const blendName = item.blendName || null;
        const bottleName = item.bottleName || item.pourName || null;
        return (
          <div key={item.id} className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3">
            <p className="text-sm font-medium text-amber-100 mb-1">{item.title || "Session"}</p>
            <div className="space-y-0.5">
              {pipeName && <p className="text-xs text-amber-500/70">{t("auto.components_curator_SavedSessionsPanel.pipe_3uodt9")} {pipeName}</p>}
              {blendName && <p className="text-xs text-amber-500/70">{t("auto.components_curator_SavedSessionsPanel.blend_1b2xbt")} {blendName}</p>}
              {bottleName && <p className="text-xs text-amber-500/70">{t("auto.components_curator_SavedSessionsPanel.pour_3ut4px")} {bottleName}</p>}
            </div>
            <button
              onClick={() => { removeSession(item.id); setKey(k => k + 1); }}
              className="mt-2 text-xs text-amber-100 border border-amber-500/30 rounded px-2 py-1"
            >
              {t("auto.components_curator_SavedSessionsPanel.remove_1layij")}
            </button>
          </div>
        );
      })}
    </div>
  );
}