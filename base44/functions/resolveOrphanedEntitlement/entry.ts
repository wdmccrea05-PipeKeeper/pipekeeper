/**
 * resolveOrphanedEntitlement — Admin workflow to resolve a UserEntitlement that has
 * has_access=true but no supporting ActiveContract. Does NOT automatically remove access.
 * Requires an audit note and administrator identity. Reversible (stores prior state).
 *
 * Params: {
 *   entitlementId: string,
 *   resolution: 'link_to_contract' | 'manual' | 'referral' | 'promotional' | 'expired' | 'revoked' | 'follow_up',
 *   auditNote: string,            // required
 *   linkContractId?: string,     // for link_to_contract
 *   sourceRewardId?: string,      // for referral
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') return Response.json({ error: 'Forbidden: admin required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { entitlementId, resolution, auditNote, linkContractId, sourceRewardId } = body || {};
    if (!entitlementId) return Response.json({ error: 'entitlementId required' }, { status: 400 });
    if (!resolution) return Response.json({ error: 'resolution required' }, { status: 400 });
    if (!auditNote || String(auditNote).trim().length < 3) return Response.json({ error: 'auditNote required (min 3 chars)' }, { status: 400 });

    const ent = await base44.asServiceRole.entities.UserEntitlement.get(entitlementId);
    if (!ent) return Response.json({ error: 'entitlement not found' }, { status: 404 });

    const priorState = { has_access: ent.has_access, active_contract_ids: ent.active_contract_ids, primary_product: ent.primary_product };

    const updates = {};
    if (resolution === 'link_to_contract') {
      if (!linkContractId) return Response.json({ error: 'linkContractId required for link_to_contract' }, { status: 400 });
      const contract = await base44.asServiceRole.entities.ActiveContract.get(linkContractId);
      if (!contract) return Response.json({ error: 'contract not found' }, { status: 404 });
      updates.active_contract_ids = [...new Set([...(ent.active_contract_ids || []), linkContractId])];
      updates.has_access = true;
    } else if (resolution === 'manual') {
      updates.has_access = true;
    } else if (resolution === 'referral') {
      updates.has_access = true;
    } else if (resolution === 'promotional') {
      updates.has_access = true;
    } else if (resolution === 'expired' || resolution === 'revoked') {
      updates.has_access = false;
    } else if (resolution === 'follow_up') {
      // no state change, just audit
    } else {
      return Response.json({ error: 'invalid resolution' }, { status: 400 });
    }

    const auditTrail = {
      resolved_at: new Date().toISOString(),
      admin_id: admin.id,
      admin_email: admin.email,
      resolution,
      audit_note: auditNote,
      prior_state: priorState,
      link_contract_id: linkContractId || null,
      source_reward_id: sourceRewardId || null,
    };

    try {
      const notesField = ent.reconciliation_notes ? String(ent.reconciliation_notes) + ' | ' : '';
      await base44.asServiceRole.entities.UserEntitlement.update(entitlementId, {
        ...updates,
        computed_at: new Date().toISOString(),
        reconciliation_notes: notesField + JSON.stringify(auditTrail),
      });
    } catch (err) {
      // UserEntitlement may not have reconciliation_notes field; fall back to updating access only
      await base44.asServiceRole.entities.UserEntitlement.update(entitlementId, { ...updates, computed_at: new Date().toISOString() });
    }

    // Log to SubscriptionEvent ledger as a manual_adjustment event (auditable)
    try {
      await base44.asServiceRole.entities.SubscriptionEvent.create({
        provider: 'manual',
        event_type: 'orphaned_entitlement_resolution',
        normalized_event_type: 'manual_adjustment',
        user_id: ent.user_id,
        user_email: ent.user_email,
        normalized_email: ent.user_email,
        provider_subscription_id: null,
        provider_transaction_id: null,
        provider_event_id: `manual:orphan:${entitlementId}:${Date.now()}`,
        is_manual_adjustment: true,
        is_successful_payment: false,
        source_system: 'manual',
        source_confidence: 'unresolved',
        raw_event_reference: `UserEntitlement:${entitlementId}`,
        raw_payload: JSON.stringify(auditTrail).slice(0, 8000),
        ingested_at: new Date().toISOString(),
        processed: true,
        reconciliation_status: 'resolved',
        reconciliation_notes: `Orphaned entitlement resolved: ${resolution} — ${auditNote}`,
      });
    } catch (err) { console.warn('[resolveOrphanedEntitlement] ledger log failed:', err); }

    return Response.json({ status: 'ok', entitlementId, resolution, priorState, updates, auditTrail });
  } catch (error) {
    console.error('[resolveOrphanedEntitlement] fatal:', error);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});