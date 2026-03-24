import { base44 } from "@/api/base44Client";

/**
 * Canonical Curator event logger
 * Reusable across all Curator touchpoints
 */

export async function logCuratorEvent({
  eventType,
  sessionId = null,
  recommendationId = null,
  recommendationContext = null,
  collectionContext = null,
  metadata = null,
}) {
  try {
    const user = await base44.auth.me();
    if (!user?.email) return { success: false, error: 'No authenticated user' };

    await base44.functions.invoke('logCuratorEvent', {
      user_email: user.email,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      recommendation_id: recommendationId,
      recommendation_context: recommendationContext,
      collection_context: collectionContext,
      metadata,
    });
    return { success: true };
  } catch (error) {
    console.error('logCuratorEvent failed:', error);
    return { success: false, error };
  }
}

/**
 * Start a new Curator session
 */
export async function startCuratorSession({
  agentConversationId,
  originatingRecommendation = null,
  initialPrompt = "",
  pipesCount = 0,
  blendsCount = 0,
}) {
  try {
    const result = await base44.functions.invoke('startCuratorSession', {
      agent_conversation_id: agentConversationId,
      originating_recommendation: originatingRecommendation,
      initial_prompt: initialPrompt,
      pipes_count: pipesCount,
      blends_count: blendsCount,
    });

    return result.data;
  } catch (error) {
    console.error('startCuratorSession failed:', error);
    return null;
  }
}

/**
 * End a Curator session
 */
export async function endCuratorSession({
  sessionId,
  resultedInAction = false,
}) {
  try {
    await base44.functions.invoke('endCuratorSession', {
      session_id: sessionId,
      resulted_in_action: resultedInAction,
    });
    return { success: true };
  } catch (error) {
    console.error('endCuratorSession failed:', error);
    return { success: false, error };
  }
}

/**
 * Quick event loggers for common actions
 */
export const CuratorEvents = {
  opened: (context) => logCuratorEvent({ eventType: 'curator_opened', ...context }),
  recommendationShown: (context) => logCuratorEvent({ eventType: 'recommendation_shown', ...context }),
  recommendationClicked: (context) => logCuratorEvent({ eventType: 'recommendation_clicked', ...context }),
  recommendationExplored: (context) => logCuratorEvent({ eventType: 'recommendation_explored', ...context }),
  recommendationAccepted: (context) => logCuratorEvent({ eventType: 'recommendation_accepted', ...context }),
  recommendationDismissed: (context) => logCuratorEvent({ eventType: 'recommendation_dismissed', ...context }),
  messageSent: (context) => logCuratorEvent({ eventType: 'curator_message_sent', ...context }),
  sessionClosed: (context) => logCuratorEvent({ eventType: 'curator_session_closed', ...context }),
  itemAdded: (context) => logCuratorEvent({ eventType: 'collection_item_added', ...context }),
  itemEdited: (context) => logCuratorEvent({ eventType: 'collection_item_edited', ...context }),
  collectibleToggled: (context) => logCuratorEvent({ eventType: 'collectible_only_toggled', ...context }),
  exportGenerated: (context) => logCuratorEvent({ eventType: 'export_generated', ...context }),
  valuationViewed: (context) => logCuratorEvent({ eventType: 'valuation_viewed', ...context }),
  insuranceGenerated: (context) => logCuratorEvent({ eventType: 'insurance_doc_generated', ...context }),
};