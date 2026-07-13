import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const RESOLUTION_OPTIONS = [
  { value: 'manual', label: 'Valid manual grant', note: 'Access was manually granted by an administrator for a legitimate reason.' },
  { value: 'promotional', label: 'Promotional grant', note: 'Access granted as a promotion, giveaway, or marketing event.' },
  { value: 'referral', label: 'Referral grant', note: 'Access earned through the referral program (non-revenue).' },
  { value: 'legacy_migration', label: 'Legacy migration', note: 'Entitlement predates the canonical ledger and is accepted as a historical grant.' },
  { value: 'linked_subscription', label: 'Linked subscription', note: 'Entitlement should be linked to an existing ActiveContract (provide contract ID).' },
  { value: 'revoke', label: 'Stale and revoked', note: 'Entitlement is stale and should be revoked (no valid basis).' },
  { value: 'unresolved', label: 'Unresolved', note: 'Keep as pending review — do not reclassify yet.' },
];

export default function OrphanedEntitlementCard({ entitlement, onResolved }) {
  const [resolution, setResolution] = useState('');
  const [auditNote, setAuditNote] = useState('');
  const [linkedContractId, setLinkedContractId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const requiresContractId = resolution === 'linked_subscription';

  const handleResolve = async () => {
    if (!resolution || !auditNote.trim()) return;
    if (requiresContractId && !linkedContractId.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const payload = {
        entitlement_id: entitlement.id || entitlement.entitlement_id,
        resolution,
        audit_note: auditNote.trim(),
      };
      if (requiresContractId) payload.linked_contract_id = linkedContractId.trim();
      const r = await base44.functions.invoke('resolveOrphanedEntitlement', payload);
      setResult({ ok: true, data: r?.data ?? r });
      if (onResolved) onResolved();
    } catch (e) {
      setResult({ ok: false, error: e?.message || 'Reconciliation failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-yellow-700/40 bg-yellow-900/10 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm text-[#F5F1E7] break-all">{entitlement.id || entitlement.entitlement_id}</p>
          <p className="text-xs text-[#E0D8C8]/60 mt-1">
            {entitlement.user_email || '—'} · has_access={String(entitlement.has_access)} · contracts={entitlement.contract_count ?? 0}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-yellow-900/30 text-yellow-300">orphaned entitlement</span>
      </div>

      <p className="text-xs text-[#E0D8C8]/50">
        This entitlement has no supporting ActiveContract. An administrator must classify it. All actions are audited
        with administrator identity, timestamp, prior state, revised state, and an audit note.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-[#E0D8C8]/60 block mb-1">Resolution (required)</label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full rounded border border-[#8b6239]/30 bg-[#140f0c] px-2 py-1.5 text-sm text-[#E0D8C8]"
          >
            <option value="">Select resolution…</option>
            {RESOLUTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#E0D8C8]/60 block mb-1">Audit note (required)</label>
          <input
            type="text"
            value={auditNote}
            onChange={(e) => setAuditNote(e.target.value)}
            placeholder="reason for classification"
            className="w-full rounded border border-[#8b6239]/30 bg-[#140f0c] px-2 py-1.5 text-sm text-[#E0D8C8]"
          />
        </div>
      </div>

      {resolution && (
        <p className="text-xs text-[#D4A574]">
          {RESOLUTION_OPTIONS.find((o) => o.value === resolution)?.note}
        </p>
      )}

      {requiresContractId && (
        <div>
          <label className="text-xs text-[#E0D8C8]/60 block mb-1">ActiveContract ID to link (required)</label>
          <input
            type="text"
            value={linkedContractId}
            onChange={(e) => setLinkedContractId(e.target.value)}
            placeholder="contract id"
            className="w-full rounded border border-[#8b6239]/30 bg-[#140f0c] px-2 py-1.5 text-sm text-[#E0D8C8]"
          />
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-[#8b6239]/15">
        <button
          onClick={handleResolve}
          disabled={!resolution || !auditNote.trim() || (requiresContractId && !linkedContractId.trim()) || busy}
          className="px-4 py-2 rounded bg-[#D4A574] text-[#140f0c] font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#c89a5f]"
        >
          {busy ? 'Resolving…' : 'Classify Entitlement'}
        </button>
        <span className="text-xs text-[#E0D8C8]/40">Backend enforces admin authorization.</span>
      </div>

      {result?.ok && (
        <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/10 p-3 text-xs text-emerald-300 space-y-1">
          <p className="font-semibold">✓ Entitlement classified</p>
          <p className="text-[#E0D8C8]/60">Audit event: {result.data?.audit_event_id || 'recorded'} · Prior state: {result.data?.prior_state || 'recorded'} → Revised state: {result.data?.revised_state || 'recorded'}</p>
        </div>
      )}
      {result && !result.ok && (
        <div className="rounded-lg border border-red-800/40 bg-red-900/10 p-3 text-xs text-red-300">✗ {result.error}</div>
      )}
    </div>
  );
}