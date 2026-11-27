import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Loader2, MessageSquare } from 'lucide-react';

/**
 * Groups persisted Curator messages into conversations, newest first.
 * The opening question becomes the conversation's title.
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

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function CuratorHistorySheet({ open, onClose, currentSessionId, onSelect }) {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const page = await base44.entities.CuratorMessage.filter(
          {},
          { sort: '-timestamp', limit: 200 }
        );
        const rows = Array.isArray(page) ? page : page?.items || [];
        if (!cancelled) setConversations(groupConversations(rows));
      } catch {
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Conversation history">
      <button
        type="button"
        aria-label="Close conversation history"
        onClick={onClose}
        className="flex-1 min-w-0"
        style={{ background: 'rgba(0,0,0,0.6)', border: 'none' }}
      />

      <div
        className="w-full max-w-[380px] h-full flex flex-col"
        style={{ background: '#121214', borderLeft: '1px solid rgba(180,140,75,0.22)' }}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <p className="text-[14px] font-semibold" style={{ color: '#F5F5F7' }}>
            Conversations
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center rounded-lg"
            style={{ width: 40, height: 40, color: '#9C968C' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center gap-2 px-2 py-4 text-[13px]" style={{ color: '#8A8578' }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading conversations…
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-4 text-[13px] leading-6" style={{ color: '#8A8578' }}>
              No earlier conversations yet. Everything you ask here is kept here.
            </p>
          ) : (
            <div className="space-y-1.5">
              {conversations.map((session) => {
                const isCurrent = session.id === currentSessionId;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => onSelect?.(session.id)}
                    className="w-full text-left rounded-xl px-3 py-2.5 min-w-0"
                    style={{
                      border: isCurrent ? '1px solid rgba(198,161,91,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      background: isCurrent ? 'rgba(198,161,91,0.10)' : 'rgba(255,255,255,0.02)',
                      minHeight: 52,
                    }}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 mt-1 shrink-0" style={{ color: '#C6A15B' }} />
                      <div className="min-w-0">
                        <p className="text-[13px] leading-5 break-words" style={{ color: '#E8E4DC' }}>
                          {session.title}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#6B6860' }}>
                          {formatWhen(session.lastAt)}
                          {isCurrent ? ' · current' : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}