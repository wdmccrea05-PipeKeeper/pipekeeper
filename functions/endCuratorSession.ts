import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { session_id, resulted_in_action } = body;

    if (!session_id) {
      return Response.json({ error: 'session_id required' }, { status: 400 });
    }

    // Find session
    const sessions = await base44.entities.CuratorSession.filter({
      created_by: user.email,
      session_id,
    });

    if (!sessions[0]) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessions[0];
    const startTime = new Date(session.started_at).getTime();
    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    // Update session
    await base44.asServiceRole.entities.CuratorSession.update(session.id, {
      ended_at: new Date().toISOString(),
      status: 'completed',
      session_duration_seconds: durationSeconds,
      resulted_in_action: resulted_in_action || false,
    });

    // Log close event
    await base44.functions.invoke('logCuratorEvent', {
      event_type: 'curator_session_closed',
      session_id,
      metadata: {
        duration_seconds: durationSeconds,
        resulted_in_action: resulted_in_action || false,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('endCuratorSession error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});