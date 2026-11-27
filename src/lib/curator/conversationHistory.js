/**
 * Pure helpers for the Curator conversation history list.
 * Kept free of SDK imports so they can be unit tested directly.
 */

export function groupConversations(rows = []) {
  const bySession = new Map();

  [...rows].forEach((row) => {
    const id = row?.session_id;
    if (!id) return;

    const timestamp = row?.timestamp || row?.created_date || null;
    const entry = bySession.get(id) || {
      id,
      title: '',
      titleIndex: Number.POSITIVE_INFINITY,
      lastAt: null,
      count: 0,
    };

    entry.count += 1;
    if (timestamp && (!entry.lastAt || String(timestamp) > String(entry.lastAt))) {
      entry.lastAt = timestamp;
    }

    if (row?.role === 'user') {
      const index = typeof row?.message_index === 'number' ? row.message_index : Number.POSITIVE_INFINITY;
      if (index <= entry.titleIndex) {
        entry.titleIndex = index;
        entry.title = String(row.content || '').replace(/\s+/g, ' ').trim().slice(0, 90);
      }
    }

    bySession.set(id, entry);
  });

  return [...bySession.values()]
    .filter((session) => session.title)
    .sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
}

export function formatConversationWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}