import { base44 } from "@/api/base44Client";

const FOUNDING_CUTOFF = new Date("2026-02-01T00:00:00.000Z");

/**
 * Backfill founding member status for users who subscribed before Feb 1, 2026
 * Called on app load to ensure early subscribers get their badge
 */
export async function ensureFoundingMemberStatus(user, subscription) {
  try {
    // Skip if already marked as founding member
    if (user?.isFoundingMember) return;
    
    // Skip if no subscription or not paid
    if (!subscription) return;
    
    const status = String(subscription.status || "").toLowerCase();
    const isPaid = status === "active" || status === "trialing";
    
    if (!isPaid) return;
    
    // Check subscription start date
    const startedAt = subscription.started_at || subscription.current_period_start;
    if (!startedAt) return;
    
    const subscriptionDate = new Date(startedAt);
    
    // If subscribed before cutoff, mark as founding member
    if (subscriptionDate < FOUNDING_CUTOFF) {
      await base44.auth.updateMe({
        isFoundingMember: true,
        foundingMemberSince: startedAt,
      });
      
      console.log('[FoundingMember] User flagged as founding member');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[FoundingMember] Backfill error:', error);
    return false;
  }
}