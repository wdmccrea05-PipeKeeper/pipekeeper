import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { ownedCuratorMessages } from '../../shared/curatorMessageOwnership.ts';

/**
 * Restore the collector's recent Curator conversation.
 *
 * Curator persists every exchange (persistCuratorMessage); this returns the
 * tail of that thread so a reload, a new device or a returning collector
 * continues the same conversation instead of starting cold. Reads are scoped to
 * the signed-in caller's own email — another collector's messages can never be
 * returned, whatever id is supplied.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit) || 20, 1), 60);
    const sessionId = String(body?.session_id || '').trim();

    const query: Record<string, unknown> = { user_email: user.email };
    if (sessionId) query.session_id = sessionId;

    const rows = await base44.asServiceRole.entities.CuratorMessage.filter(query);
    const usable = ownedCuratorMessages(rows, user.email, sessionId).filter(
      (row) => row.content && (row.role === 'user' || row.role === 'assistant')
    );

    const ordered = usable
      .sort((a: any, b: any) => {
        const left = new Date(a.created_date || a.timestamp || 0).getTime();
        const right = new Date(b.created_date || b.timestamp || 0).getTime();
        return left - right;
      })
      .slice(-limit);

    const messages = ordered.map((row: any) => ({
      role: row.role,
      content: row.content,
      created_date: row.created_date || row.timestamp || null,
    }));

    return Response.json({
      messages,
      thread_id: ordered.length > 0 ? String(ordered[ordered.length - 1]?.session_id || '') : '',
    });
  } catch (error) {
    console.error('curatorConversationHistory error:', error);
    return Response.json({ error: (error as Error).message || 'Could not load history' }, { status: 500 });
  }
});