import { base44 } from '@/api/base44Client';

function buildAuditMetadata(entry = {}) {
  return {
    auditEntry: {
      userId: entry.userId || null,
      module: entry.module || null,
      recordType: entry.recordType || null,
      recordId: entry.recordId || null,
      operationType: entry.operationType || null,
      fieldsChanged: Array.isArray(entry.fieldsChanged) ? entry.fieldsChanged : [],
      previousValues: entry.previousValues || {},
      newValues: entry.newValues || {},
      source: entry.source || 'curator',
      confidence: entry.confidence ?? null,
      appliedAutomatically: entry.appliedAutomatically === true,
      requiredUserApproval: entry.requiredUserApproval === true,
      timestamp: entry.timestamp || new Date().toISOString(),
    },
  };
}

export async function logCuratorAuditEntry(entry = {}) {
  try {
    const user = await base44.auth.me();
    if (!user?.email) return { success: false, error: 'No authenticated user' };

    await base44.functions.invoke('logCuratorEvent', {
      user_email: user.email,
      event_type: 'recommendation_accepted',
      timestamp: entry.timestamp || new Date().toISOString(),
      recommendation_id: entry.recommendationId || null,
      metadata: buildAuditMetadata({
        ...entry,
        userId: entry.userId || user.email,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error('logCuratorAuditEntry failed:', error);
    return { success: false, error };
  }
}
