import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only scheduled job
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Find recently completed sessions without extracted signals
    const recentSessions = await base44.asServiceRole.entities.CuratorSession.filter(
      { status: 'completed' },
      '-ended_at',
      50
    );

    let processedCount = 0;
    const errors = [];

    for (const session of recentSessions) {
      try {
        // Check if already processed
        const existingSignals = await base44.asServiceRole.entities.CuratorExtractedSignal.filter({
          session_id: session.session_id,
        });

        if (existingSignals.length > 0) continue;

        // HARDENING: Get messages for this session - verify they exist
        const messages = await base44.asServiceRole.entities.CuratorMessage.filter(
          { session_id: session.session_id },
          'message_index',
          100
        );

        if (messages.length === 0) {
          console.warn(`Session ${session.session_id} has no persisted messages - skipping extraction`);
          errors.push({ 
            session_id: session.session_id, 
            error: 'No persisted messages found',
            reason: 'missing_message_data'
          });
          continue;
        }

        // Extract conversation text
        const conversationText = messages
          .map((m, idx) => `[${idx}] ${m.role}: ${m.content}`)
          .join('\n\n');

        // Use AI to extract structured signals
        const extraction = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Extract structured learning signals from this Curator conversation.

CONVERSATION:
${conversationText}

Extract:
1. Stated preferences (tobacco types, pipe shapes, flavors)
2. Stated dislikes or constraints
3. Collection goals mentioned
4. Expertise level indicators
5. Action commitments

Return JSON array of signals.`,
          response_json_schema: {
            type: 'object',
            properties: {
              signals: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    signal_type: {
                      type: 'string',
                      enum: [
                        'preference_stated',
                        'dislike_stated',
                        'goal_identified',
                        'constraint_identified',
                        'expertise_level_assessed',
                        'collection_gap_acknowledged',
                        'action_committed',
                      ],
                    },
                    signal_value: { type: 'string' },
                    confidence: {
                      type: 'string',
                      enum: ['high', 'medium', 'low'],
                    },
                    source_message_index: { type: 'number' },
                  },
                  required: ['signal_type', 'signal_value', 'confidence'],
                },
              },
            },
            required: ['signals'],
          },
        });

        // Store extracted signals
        const signals = extraction?.signals || [];
        for (const signal of signals) {
          await base44.asServiceRole.entities.CuratorExtractedSignal.create({
            created_by: session.user_email,
            user_email: session.user_email,
            session_id: session.session_id,
            signal_type: signal.signal_type,
            signal_value: signal.signal_value,
            confidence: signal.confidence || 'medium',
            source_message_index: signal.source_message_index || 0,
            extracted_at: new Date().toISOString(),
          });
        }

        // Update intelligence profile
        if (signals.length > 0) {
          await base44.functions.invoke('updateCollectorIntelligenceProfile', {
            user_email: session.user_email,
            signals,
          });
        }

        processedCount++;
      } catch (err) {
        console.error(`Failed to process session ${session.session_id}:`, err);
        errors.push({ session_id: session.session_id, error: err.message });
      }
    }

    return Response.json({
      success: true,
      processed: processedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('extractCuratorSignals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});