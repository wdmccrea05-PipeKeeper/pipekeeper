import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Canonical Subscriber Population Reconciliation Panel
 *
 * Displays the canonical subscriber counts from reconcileSubscriberPopulations.
 * This is the single source of truth — all other dashboard metrics should
 * eventually derive from this service.
 */
export default function CanonicalReconciliationPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await base44.functions.invoke('reconcileSubscriberPopulations', {});
      setData(response?.data || response);
    } catch (err) {
      setError(err?.message || 'Failed to load reconciliation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-sm text-[#E0D8C8]/60 p-4">Loading canonical reconciliation…</div>;
  if (error) return (
    <div className="rounded-lg border border-red-800/40 bg-red-900/10 p-3 text-red-300 text-sm">
      {error}
      <button onClick={load} className="ml-3 underline">Retry</button>
    </div>
  );
  if (!data) return null;

  const pop = data.canonical_populations || {};
  const byMod = data.by_module || {};
  const byProv = data.by_provider || {};
  const scope = data.scope_resolution || {};
  const entAnom = data.entitlement_anomalies || {};
  const anomalies = data.anomalies || {};
  const verification = data.provider_verification || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#E0D8C8]/50">
          Canonical source: <code className="text-[#D4A574]">reconcileSubscriberPopulations v2</code>
          {' · '}Generated {data.generated_at ? new Date(data.generated_at).toLocaleString() : '—'}
        </p>
        <button onClick={load} className="text-xs text-[#D4A574] hover:underline">Refresh</button>
      </div>

      {/* Core populations */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Current Recognized Paying" value={pop.current_recognized_paying ?? 0} highlight
          sub={`verified ${pop.provider_verified_paying ?? 0} + provisional ${pop.provisional_paying ?? 0}`} />
        <MetricCard label="Provider-Verified Paying" value={pop.provider_verified_paying ?? 0}
          sub="Stripe (webhook-verified)" />
        <MetricCard label="Provisional Paying" value={pop.provisional_paying ?? 0} warn={(pop.provisional_paying ?? 0) > 0}
          sub="Apple — pending verification" />
        <MetricCard label="Current Entitled Users" value={pop.current_entitled ?? 0} />
        <MetricCard label="Unique Paying People" value={pop.unique_current_paying_people ?? 0} highlight
          sub={`vs ${pop.active_contracts ?? 0} active contracts`} />
        <MetricCard label="Active Contracts" value={pop.active_contracts ?? 0}
          sub={`${scope.resolved ?? 0} resolved · ${scope.unresolved ?? 0} unresolved`} />
        <MetricCard label="Historical Subscribers" value={pop.historical_subscribers ?? 0}
          sub="ever-subscribed (NOT current)" />
        <MetricCard label="Entitled Without Contract" value={entAnom.total ?? 0} warn={(entAnom.total ?? 0) > 0} />
      </div>

      {/* Verified vs provisional warning */}
      {verification.apple?.verified === false && (byProv.apple_provisional ?? 0) > 0 && (
        <div className="rounded-lg border border-amber-700/30 bg-amber-900/10 p-3 text-xs text-amber-300/80">
          ⚠ {verification.apple?.note || 'Apple users are provisional — App Store Server API not configured.'}
        </div>
      )}

      {/* By module */}
      <div>
        <p className="text-sm font-semibold text-[#D4A574] mb-2">Paying by Module/Scope</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="PipeKeeper" value={byMod.pipekeeper ?? 0} />
          <MetricCard label="CigarKeeper" value={byMod.cigarkeeper ?? 0} />
          <MetricCard label="WhiskeyKeeper" value={byMod.whiskeykeeper ?? 0} />
          <MetricCard label="WineKeeper" value={byMod.winekeeper ?? 0} />
          <MetricCard label="Multi-Module Bundles" value={byMod.multi_module_bundles ?? 0} />
          <MetricCard label="Unresolved Scope" value={byMod.unresolved_scope ?? 0} warn={(byMod.unresolved_scope ?? 0) > 0}
            sub="anomaly — needs resolution" />
        </div>
      </div>

      {/* By provider */}
      <div>
        <p className="text-sm font-semibold text-[#D4A574] mb-2">Paying by Provider</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Stripe (Verified)" value={byProv.stripe_verified ?? 0} />
          <MetricCard label="Apple (Verified)" value={byProv.apple_verified ?? 0} />
          <MetricCard label="Apple (Provisional)" value={byProv.apple_provisional ?? 0} warn={(byProv.apple_provisional ?? 0) > 0} />
          <MetricCard label="Manual/Other" value={(byProv.manual_verified ?? 0) + (byProv.google ?? 0)} />
        </div>
      </div>

      {/* Entitlement anomalies */}
      {entAnom.total > 0 && (
        <div>
          <p className="text-sm font-semibold text-[#D4A574] mb-2">
            Entitlement Without Contract — {entAnom.total} users
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
            {Object.entries(entAnom.classifications || {}).map(([cls, count]) => (
              <MetricCard key={cls} label={cls.replace(/_/g, ' ')} value={count}
                warn={cls === 'true_orphan'} />
            ))}
          </div>
          <details className="rounded-lg border border-[#8b6239]/25 bg-[#1f1712]/70">
            <summary className="px-4 py-2 text-xs text-[#E0D8C8]/70 cursor-pointer">Detail ({entAnom.detail?.length} users)</summary>
            <div className="overflow-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-[#2a1f18] sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Email</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Classification</th>
                    <th className="text-right px-2 py-2 text-[#E0D8C8]/70">Sub Records</th>
                    <th className="text-right px-2 py-2 text-[#E0D8C8]/70">Contract Records</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {(entAnom.detail || []).map((e, i) => (
                    <tr key={i} className="border-t border-[#8b6239]/15">
                      <td className="px-2 py-1.5 font-mono">{e.email || '—'}</td>
                      <td className="px-2 py-1.5">{e.classification?.replace(/_/g, ' ')}</td>
                      <td className="px-2 py-1.5 text-right">{e.actual_sub_records ?? 0}</td>
                      <td className="px-2 py-1.5 text-right">{e.actual_contract_records ?? 0}</td>
                      <td className="px-2 py-1.5">{e.primary_provider || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {/* Anomaly detection */}
      {anomalies.total > 0 && (
        <div>
          <p className="text-sm font-semibold text-[#D4A574] mb-2">
            Anomaly Detection — {anomalies.total} issues
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['paid_no_entitlement', 'duplicate_contract_for_same_sub', 'unresolved_product_scope', 'true_orphan_entitlements'].map(type => {
              const items = (anomalies.detail || []).filter(a => a.type === type);
              if (items.length === 0) return null;
              return (
                <MetricCard key={type} label={type.replace(/_/g, ' ')} value={items.length} warn />
              );
            })}
          </div>
        </div>
      )}

      {/* Record totals */}
      <div>
        <p className="text-sm font-semibold text-[#D4A574] mb-2">Record Totals</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MetricCard label="Users" value={data.record_totals?.total_users ?? 0} />
          <MetricCard label="Subscriptions" value={data.record_totals?.total_subscription_records ?? 0} />
          <MetricCard label="Active Contracts" value={data.record_totals?.total_active_contract_records ?? 0} />
          <MetricCard label="Entitlements" value={data.record_totals?.total_user_entitlement_records ?? 0} />
          <MetricCard label="Sub Events" value={data.record_totals?.total_subscription_event_records ?? 0} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, warn = false, highlight = false }) {
  return (
    <div className={`rounded-xl border p-3 ${warn ? 'border-yellow-700/40 bg-yellow-900/10' : highlight ? 'border-[#D4A574]/40 bg-[#1f1712]/70' : 'border-[#8b6239]/25 bg-[#1f1712]/70'}`}>
      <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/60">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${warn ? 'text-yellow-300' : highlight ? 'text-[#D4A574]' : 'text-[#F5F1E7]'}`}>{value}</p>
      {sub ? <p className="text-xs text-[#E0D8C8]/50 mt-0.5">{sub}</p> : null}
    </div>
  );
}