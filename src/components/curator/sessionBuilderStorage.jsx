const STORAGE_KEY = "collectionkeeper.saved_sessions";

export function getSavedSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessionItem(item) {
  const existing = getSavedSessions();

  const next = [
    {
      id: item.id,
      savedAt: new Date().toISOString(),
      title: item.title,
      explanation: item.explanation,
      rationale: item.rationale || "",
      confidence: item.confidence ?? null,
      recordType: item.recordType || null,
      recordId: item.recordId || null,
      recordName: item.recordName || "",
      type: item.type,
    },
    ...existing.filter((x) => x.id !== item.id),
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeSavedSessionItem(itemId) {
  const next = getSavedSessions().filter((x) => x.id !== itemId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}