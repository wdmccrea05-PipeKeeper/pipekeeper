const STORAGE_KEY = "pk_sessions";

export function getSavedSessions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveSessionItem(item) {
  const existing = getSavedSessions();
  const next = [{ ...item, savedAt: new Date().toISOString() }, ...existing.filter(x => x.id !== item.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeSavedSessionItem(itemId) {
  const next = getSavedSessions().filter(x => x.id !== itemId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}