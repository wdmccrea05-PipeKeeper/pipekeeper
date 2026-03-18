import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * CRITICAL HARDENING: Persist every Curator message to CuratorMessage entity.
 * 
 * This function ensures conversation data integrity for analytics and signal extraction.
 * Called by CuratorWorkspace after each user/assistant exchange.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      session_id,
      role,
      content,
      message_index,
      metadata,
    } = body;

    if (!session_id || !role || !content) {
      return Response.json({ 
        error: 'Missing required fields: session_id, role, content' 
      }, { status: 400 });
    }

    // Idempotency check: avoid duplicate writes for same message_index
    if (typeof message_index === 'number') {
      const existing = await base44.entities.CuratorMessage.filter({
        session_id,
        message_index,
        role,
      });

      if (existing.length > 0) {
        return Response.json({ 
          success: true, 
          message_id: existing[0].id,
          duplicate_prevented: true 
        });
      }
    }

    // Store message
    const message = await base44.entities.CuratorMessage.create({
      created_by: user.email,
      session_id,
      user_email: user.email,
      role,
      content,
      message_index: typeof message_index === 'number' ? message_index : null,
      timestamp: new Date().toISOString(),
      token_count: content.length / 4, // rough estimate
      metadata: metadata || null,
    });

    // Update session message count
    const sessions = await base44.entities.CuratorSession.filter({
      session_id,
      created_by: user.email,
    });

    if (sessions[0]) {
      await base44.asServiceRole.entities.CuratorSession.update(sessions[0].id, {
        message_count: (sessions[0].message_count || 0) + 1,
      });
    }

    return Response.json({ 
      success: true, 
      message_id: message.id 
    });
  } catch (error) {
    console.error('persistCuratorMessage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});