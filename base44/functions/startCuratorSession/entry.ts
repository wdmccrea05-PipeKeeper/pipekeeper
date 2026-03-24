import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      agent_conversation_id,
      originating_recommendation,
      initial_prompt,
      pipes_count,
      blends_count,
    } = body;

    const sessionId = `curator_${user.email}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const session = await base44.entities.CuratorSession.create({
      created_by: user.email,
      user_email: user.email,
      session_id: sessionId,
      agent_conversation_id: agent_conversation_id || null,
      originating_recommendation: originating_recommendation || null,
      initial_prompt: initial_prompt || "",
      collection_snapshot: {
        pipes_count: pipes_count || 0,
        blends_count: blends_count || 0,
        timestamp: new Date().toISOString(),
      },
      started_at: new Date().toISOString(),
      status: 'active',
    });

    // Log curator_opened event (fire-and-forget to avoid CPU timeout)
    base44.functions.invoke('logCuratorEvent', {
      event_type: 'curator_opened',
      session_id: sessionId,
      recommendation_context: originating_recommendation,
      collection_context: {
        pipes_count,
        blends_count,
      },
    }).catch(() => {});

    return Response.json({ 
      success: true, 
      session_id: sessionId,
      session_record_id: session.id 
    });
  } catch (error) {
    console.error('startCuratorSession error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});