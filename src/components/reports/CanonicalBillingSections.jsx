import React, { useState } from 'react';

// ── Canonical Billing Sections for UserReport ──────────────────────────────
// All billing metrics in these sections come from getCanonicalBillingDataset.
// No card queries billing entities independently — all are projections of the
// canonical row-level dataset.

export default function CanonicalBillingSections({ billing }) {
  const [drilldown, setDrilldown] = useState(null);

  if (!billing) return <p className="text-xs text-[#E0D8C8]/50">No canonical billing data available.</p>;

  const cbs = billing.current_billing_summary || {};
  const byProvider = billing.by_provider || {};
  const byPlan = billing.by_plan || {};
  const byModule = billing.by_module || {};
  const dq = billing.data_quality || {};
  const anomalies = billing.anomalies || {};
  const productAudit = billing.product_id_audit || [];
  const priceAudit = billing.price_id_audit || [];
  const bundleProof = billing.bundle_subscriber_proof || {};
  const historicalByPlan = billing.historical_by_plan || {};
  const billingRows = billing.billing_rows || [];
  const userLedger = billing.user_ledger || [];
  const historicalBillingRows = billing.historical_billing_rows || [];
  const historicalSummary = billing.historical_billing_rows_summary || {};
  const multiItemAnalysis = billing.multi_item_subscription_analysis || {};

  return (
    <div className="space-y-8">
      {/* ── Current Billing Summary ─────────────────────────────────────────── */}
      <Section title="2. Current Billing Summary (Canonical)">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Derived from <code className="text-[#D4A574]">getCanonicalBillingDataset</code> — the single canonical billing source.
          Lifecycle classified via <code className="text-[#D4A574]">reconcileContractV2</code> (PROVIDER_ACTIVE/TRIALING/CANCELED_BUT_ENTITLED only).
          Product identity resolved via Stripe Product ID chain + StripeProductRegistry.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card title="Current Paying Users" value={cbs.current_paying_users ?? 0} highlight />
          <Card title="Current Contracts" value={cbs.current_contracts ?? 0} />
          <Card title="Current Entitled Users" value={cbs.current_entitled_users ?? 0} />
          <Card title="MRR" value={`$${formatMoney(cbs.mrr)}`} />
          <Card title="ARR (run-rate)" value={`$${formatMoney(cbs.arr)}`} />
        </div>
        {cbs.current_paying_users > cbs.current_entitled_users && (
          <div className="mt-3 rounded-lg border border-amber-700/30 bg-amber-900/10 p-3 text-xs text-amber-300/80">
            ⚠ {cbs.current_paying_users - cbs.current_entitled_users} paying user(s) have no UserEntitlement record (PAID_NO_ENTITLEMENT). See Data Quality section.
          </div>
        )}
      </Section>

      {/* ── Paying Users by Provider ─────────────────────────────────────────── */}
      <Section title="4. Paying Users by Provider (Canonical)">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Unique current paying users by provider. A user can have multiple current providers — totals do not sum to unique paying users.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card title="Stripe" value={byProvider.stripe ?? 0} highlight={(byProvider.stripe ?? 0) > 0} />
          <Card title="Apple Verified" value={byProvider.apple_verified ?? 0} />
          <Card title="Apple Provisional" value={byProvider.apple_provisional ?? 0} warn={(byProvider.apple_provisional ?? 0) > 0} />
          <Card title="Google Play" value={byProvider.google ?? 0} />
          <Card title="Manual" value={byProvider.manual ?? 0} />
          <Card title="Other" value={byProvider.other ?? 0} />
          <Card title="Multi-Provider Users" value={byProvider.multi_provider_users ?? 0} warn={(byProvider.multi_provider_users ?? 0) > 0} />
        </div>
      </Section>

      {/* ── Paying Users by Plan ─────────────────────────────────────────────── */}
      <Section title="5. Current Paying Users by Plan (Canonical)">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Unique current paying users by <strong>commercial plan</strong> (what they purchased).
          A bundle is a plan; PipeKeeper/WhiskeyKeeper are modules. A Founders Bundle subscriber appears here as Founders Bundle, not as PipeKeeper.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(byPlan).map(([plan, counts]) => {
            const isBundle = plan.includes('Bundle');
            const isUnknown = plan === 'Unknown/Unresolved';
            return (
              <Card
                key={plan}
                title={plan}
                value={counts.current_paying_users ?? 0}
                sub={`${counts.current_contracts ?? 0} contracts · $${formatMoney(counts.mrr)}/mo`}
                highlight={isBundle && (counts.current_paying_users ?? 0) > 0}
                warn={isUnknown && (counts.current_paying_users ?? 0) > 0}
              />
            );
          })}
        </div>
      </Section>

      {/* ── Entitled Users by Module ─────────────────────────────────────────── */}
      <Section title="6. Current Entitled Users by Module (Canonical)">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Unique users currently entitled to each <strong>module</strong>. A bundle subscriber appears in every module their bundle includes.
          Paid = has current paying contract. Non-paid = has UserEntitlement grant without current paying contract.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(byModule).map(([mod, counts]) => (
            <Card
              key={mod}
              title={moduleLabel(mod)}
              value={counts.total_entitled_users ?? 0}
              highlight
              sub={`paid: ${counts.paid_entitlement_users ?? 0} · non-paid: ${counts.non_paid_entitlement_users ?? 0}`}
            />
          ))}
        </div>
      </Section>

      {/* ── Historical / Ever Purchased ──────────────────────────────────────── */}
      <Section title="7. Historical / Ever-Purchased by Plan">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Users who have <em>ever</em> purchased each plan (current or historical). Includes expired, canceled, and lapsed subscriptions.
          Click any card to drill down into the underlying purchaser rows.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(historicalByPlan).map(([plan, counts]) => {
            const isUnknown = plan === 'Unknown/Unresolved';
            const isBundle = plan.includes('Bundle');
            const count = counts.ever_purchased_users ?? 0;
            const isActive = drilldown === `hist-${plan}`;
            return (
              <div
                key={plan}
                onClick={() => count > 0 && setDrilldown(isActive ? null : `hist-${plan}`)}
                className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                  isActive ? 'border-[#D4A574] bg-[#2a1f18]' :
                  isUnknown && count > 0 ? 'border-yellow-700/40 bg-yellow-900/10 hover:border-yellow-600/60' :
                  isBundle && count > 0 ? 'border-[#D4A574]/40 bg-[#1f1712]/70 hover:border-[#D4A574]/70' :
                  'border-[#8b6239]/25 bg-[#1f1712]/70 hover:border-[#8b6239]/50'
                }`}
              >
                <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/60">{plan}</p>
                <p className={`text-2xl font-semibold mt-1 ${
                  isUnknown && count > 0 ? 'text-yellow-300' :
                  isBundle && count > 0 ? 'text-[#D4A574]' : 'text-[#F5F1E7]'
                }`}>{count}</p>
                {count > 0 && (
                  <p className="text-xs text-[#D4A574]/70 mt-1">{isActive ? '▲ Hide rows' : '▼ Show rows'}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Historical resolution summary */}
        <div className="mt-3 rounded-lg border border-[#8b6239]/25 bg-[#1f1712]/70 p-3 text-xs space-y-1">
          <p className="font-semibold text-[#D4A574]">Historical Resolution Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            <span className="text-[#E0D8C8]/70">Total rows: <span className="text-[#F5F1E7]">{historicalSummary.total ?? 0}</span></span>
            <span className="text-[#E0D8C8]/70">From ActiveContract: <span className="text-[#F5F1E7]">{historicalSummary.from_active_contract ?? 0}</span></span>
            <span className="text-[#E0D8C8]/70">From Subscription: <span className="text-[#F5F1E7]">{historicalSummary.from_subscription ?? 0}</span></span>
            <span className="text-emerald-300/80">Internal explicit: {historicalSummary.internal_explicit ?? 0}</span>
            <span className="text-emerald-300/80">Registry resolved: {historicalSummary.registry_resolved ?? 0}</span>
            <span className="text-emerald-300/80">Env price resolved: {historicalSummary.env_price_resolved ?? 0}</span>
            <span className="text-yellow-300/80">Product name: {historicalSummary.product_name_resolved ?? 0}</span>
            <span className="text-yellow-300/80">Amount inferred: {historicalSummary.amount_inferred ?? 0}</span>
            <span className="text-yellow-300/80">Multi-item bundle: {historicalSummary.multi_item_bundle ?? 0}</span>
            <span className="text-red-300/80">Unresolved: {historicalSummary.unresolved ?? 0}</span>
          </div>
        </div>

        {/* Multi-item subscription analysis */}
        {(multiItemAnalysis.multi_item_count ?? 0) > 0 && (
          <div className="mt-2 rounded-lg border border-[#D4A574]/30 bg-[#1f1712]/70 p-3 text-xs">
            <p className="font-semibold text-[#D4A574]">Multi-Item Subscriptions (potential bundles)</p>
            <p className="text-[#E0D8C8]/60 mt-1">
              Single-item: {multiItemAnalysis.single_item_count ?? 0} · Multi-item: {multiItemAnalysis.multi_item_count ?? 0}
            </p>
            {multiItemAnalysis.multi_item_rows?.length > 0 && (
              <div className="mt-2 overflow-auto max-h-40">
                <table className="w-full text-xs">
                  <thead className="bg-[#2a1f18] sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1 text-[#E0D8C8]/70">Email</th>
                      <th className="text-left px-2 py-1 text-[#E0D8C8]/70">Items</th>
                      <th className="text-left px-2 py-1 text-[#E0D8C8]/70">Resolved Plan</th>
                      <th className="text-left px-2 py-1 text-[#E0D8C8]/70">Modules</th>
                      <th className="text-left px-2 py-1 text-[#E0D8C8]/70">Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {multiItemAnalysis.multi_item_rows.map((r, i) => (
                      <tr key={i} className="border-t border-[#8b6239]/15">
                        <td className="px-2 py-1 font-mono">{r.email || '-'}</td>
                        <td className="px-2 py-1 text-right">{r.item_count}</td>
                        <td className="px-2 py-1">{r.plan_family || <span className="text-yellow-300">unresolved</span>}</td>
                        <td className="px-2 py-1">{(r.modules || []).join(', ') || '-'}</td>
                        <td className="px-2 py-1 text-[#E0D8C8]/60">{r.classification}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Drill-down table for selected historical plan */}
        {drilldown && drilldown.startsWith('hist-') && (() => {
          const planName = drilldown.replace('hist-', '');
          const rows = historicalBillingRows.filter(r => (r.plan_family || 'Unknown/Unresolved') === planName);
          if (rows.length === 0) return null;
          return (
            <div className="mt-3 rounded-xl border border-[#D4A574]/30 overflow-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="bg-[#2a1f18] sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Email</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Provider</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Sub ID</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Product ID</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Price ID</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Product Name</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Modules</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Resolution</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Confidence</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Status</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Amount</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Source</th>
                    <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Reason Unresolved</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-[#8b6239]/15 align-top">
                      <td className="px-2 py-1.5 font-mono">{r.email || r.user_id || '-'}</td>
                      <td className="px-2 py-1.5">{r.provider || '-'}</td>
                      <td className="px-2 py-1.5 font-mono text-[#E0D8C8]/60 max-w-[140px] truncate" title={r.provider_subscription_id}>{r.provider_subscription_id || '-'}</td>
                      <td className="px-2 py-1.5 font-mono text-[#E0D8C8]/60 max-w-[120px] truncate" title={r.stripe_product_id}>{r.stripe_product_id || '-'}</td>
                      <td className="px-2 py-1.5 font-mono text-[#E0D8C8]/60 max-w-[120px] truncate" title={r.stripe_price_id}>{r.stripe_price_id || '-'}</td>
                      <td className="px-2 py-1.5">{r.stripe_product_name || '-'}</td>
                      <td className="px-2 py-1.5">{(r.modules || []).join(', ') || '-'}</td>
                      <td className="px-2 py-1.5">
                        <span className={
                          r.product_identity_classification === 'UNRESOLVED' ? 'text-red-300' :
                          r.product_identity_classification === 'AMOUNT_INFERRED' ? 'text-yellow-300' :
                          'text-emerald-300'
                        }>{r.product_resolution_source || '-'}</span>
                      </td>
                      <td className="px-2 py-1.5">{r.product_resolution_confidence || '-'}</td>
                      <td className="px-2 py-1.5">
                        <span className={r.is_current ? 'text-emerald-300' : 'text-[#E0D8C8]/60'}>
                          {r.is_current ? 'current' : 'historical'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right">{r.amount_cents ? `$${(r.amount_cents / 100).toFixed(2)}` : '-'}</td>
                      <td className="px-2 py-1.5 text-[#E0D8C8]/60">{r.source_entity || '-'}</td>
                      <td className="px-2 py-1.5 text-red-300/70 max-w-[200px]">{r.reason_unresolved || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Section>

      {/* ── Data Quality ─────────────────────────────────────────────────────── */}
      <Section title="8. Billing Data Quality (Canonical)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card title="Total Anomalous Records" value={dq.total_anomalies ?? 0} sub={`${dq.total_anomaly_categories ?? 0} categories`} warn={(dq.total_anomalies ?? 0) > 0} />
          <Card title="Stale Local Contracts" value={dq.stale_local_contracts ?? 0} warn={(dq.stale_local_contracts ?? 0) > 0} />
          <Card title="Unmapped Products" value={dq.unmapped_products ?? 0} warn={(dq.unmapped_products ?? 0) > 0} />
          <Card title="Paid No Entitlement" value={dq.paid_no_entitlement ?? 0} warn={(dq.paid_no_entitlement ?? 0) > 0} />
          <Card title="Entitlement Without Contract" value={dq.entitlement_without_contract ?? 0} warn={(dq.entitlement_without_contract ?? 0) > 0} />
          <Card title="Product Conflicts" value={dq.product_conflicts ?? 0} warn={(dq.product_conflicts ?? 0) > 0} />
          <Card title="Bundle Lost Module Identity" value={dq.bundle_lost_module_identity ?? 0} warn={(dq.bundle_lost_module_identity ?? 0) > 0} />
        </div>
        {anomalies.detail?.length > 0 && (
          <div className="mt-3 space-y-2">
            {anomalies.detail.map((a, i) => (
              <div key={i} className="rounded-lg border border-yellow-800/30 bg-yellow-900/10 p-3 text-xs">
                <p className="font-semibold text-yellow-300">{a.type} ({a.count})</p>
                <p className="text-[#E0D8C8]/60 mt-1">{a.description || a.type}</p>
                {a.detail && Array.isArray(a.detail) && a.detail.length > 0 && (
                  <button
                    onClick={() => setDrilldown(drilldown === `${a.type}-${i}` ? null : `${a.type}-${i}`)}
                    className="text-[#D4A574] hover:underline mt-1"
                  >
                    {drilldown === `${a.type}-${i}` ? 'Hide rows' : `Show ${Math.min(a.detail.length, 50)} rows`}
                  </button>
                )}
                {drilldown === `${a.type}-${i}` && a.detail && (
                  <div className="mt-2 overflow-auto max-h-60">
                    <table className="w-full text-xs">
                      <thead className="bg-[#2a1f18] sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1 text-[#E0D8C8]/70">Email</th>
                          <th className="text-left px-2 py-1 text-[#E0D8C8]/70">Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.detail.slice(0, 50).map((d, j) => (
                          <tr key={j} className="border-t border-[#8b6239]/15">
                            <td className="px-2 py-1 font-mono">{d.email || d.user_email || d.user_id || '-'}</td>
                            <td className="px-2 py-1 text-[#E0D8C8]/60">
                              {d.canonical_bundle ? `${d.canonical_bundle} (${d.modules?.join(', ')})` :
                               d.product_name || d.plan || d.classification ||
                               d.local_status ? `local: ${d.local_status}, provider: ${d.provider_status}` :
                               JSON.stringify(d).substring(0, 120)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Product ID Audit ─────────────────────────────────────────────────── */}
      <Section title="9. Stripe Product ID Audit">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Every distinct Stripe Product ID with canonical mapping. If a Product ID has been billed but has no mapping, it is flagged <code className="text-yellow-300">UNMAPPED_BILLED_PRODUCT</code>.
        </p>
        {productAudit.length === 0 ? (
          <p className="text-xs text-[#E0D8C8]/50">No Stripe Product IDs found in billing records.</p>
        ) : (
          <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#2a1f18]">
                <tr>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Product ID</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Product Name</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Price IDs</th>
                  <th className="text-right px-2 py-2 text-[#E0D8C8]/70">Current</th>
                  <th className="text-right px-2 py-2 text-[#E0D8C8]/70">Historical</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Canonical Plan</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Modules</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Flag</th>
                </tr>
              </thead>
              <tbody>
                {productAudit.map((p, i) => (
                  <tr key={i} className="border-t border-[#8b6239]/15">
                    <td className="px-2 py-1.5 font-mono text-[#D4A574]">{p.product_id}</td>
                    <td className="px-2 py-1.5">{p.product_name || '-'}</td>
                    <td className="px-2 py-1.5 font-mono text-[#E0D8C8]/60">{(p.price_ids || []).join(', ') || '-'}</td>
                    <td className="px-2 py-1.5 text-right text-emerald-300">{p.current_contracts}</td>
                    <td className="px-2 py-1.5 text-right text-[#E0D8C8]/60">{p.historical_contracts}</td>
                    <td className="px-2 py-1.5">{p.canonical_plan || <span className="text-yellow-300">unmapped</span>}</td>
                    <td className="px-2 py-1.5">{(p.canonical_modules || []).join(', ') || '-'}</td>
                    <td className="px-2 py-1.5">{p.flag ? <span className="text-yellow-300 font-semibold">{p.flag}</span> : '✓'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Price ID Audit ────────────────────────────────────────────────────── */}
      <Section title="10. Stripe Price ID Audit">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Every Stripe Price ID used by actual customer subscriptions. Reveals legacy prices no longer in environment variables.
        </p>
        {priceAudit.length === 0 ? (
          <p className="text-xs text-[#E0D8C8]/50">No Stripe Price IDs found in billing records.</p>
        ) : (
          <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#2a1f18]">
                <tr>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Price ID</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Product ID</th>
                  <th className="text-right px-2 py-2 text-[#E0D8C8]/70">Amount</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Interval</th>
                  <th className="text-right px-2 py-2 text-[#E0D8C8]/70">Current Users</th>
                  <th className="text-right px-2 py-2 text-[#E0D8C8]/70">Historical Users</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Canonical Plan</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Status</th>
                </tr>
              </thead>
              <tbody>
                {priceAudit.map((p, i) => (
                  <tr key={i} className="border-t border-[#8b6239]/15">
                    <td className="px-2 py-1.5 font-mono text-[#D4A574]">{p.price_id}</td>
                    <td className="px-2 py-1.5 font-mono text-[#E0D8C8]/60">{p.product_id || '-'}</td>
                    <td className="px-2 py-1.5 text-right">${(p.amount_cents / 100).toFixed(2)}</td>
                    <td className="px-2 py-1.5">{p.interval || '-'}</td>
                    <td className="px-2 py-1.5 text-right text-emerald-300">{p.current_users}</td>
                    <td className="px-2 py-1.5 text-right text-[#E0D8C8]/60">{p.historical_users}</td>
                    <td className="px-2 py-1.5">{p.canonical_plan || '-'}</td>
                    <td className="px-2 py-1.5">
                      <span className={p.active === 'active' ? 'text-emerald-300' : 'text-yellow-300'}>{p.active}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Bundle Subscriber Proof ──────────────────────────────────────────── */}
      <Section title="11. Bundle Subscriber Proof">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Every current and historical bundle purchaser, traced from provider records, StripeProductRegistry, Subscription plan keys, and checkout metadata.
          A bundle is identified by Product ID mapping or explicit plan_key — never by amount alone.
        </p>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Card title="Total Bundle Rows" value={bundleProof.total_bundle_rows ?? 0} />
          <Card title="Current Bundle Subscribers" value={bundleProof.current_bundle_subscribers ?? 0} highlight={(bundleProof.current_bundle_subscribers ?? 0) > 0} />
          <Card title="Historical Bundle Subscribers" value={bundleProof.historical_bundle_subscribers ?? 0} />
        </div>
        {bundleProof.detail?.length > 0 ? (
          <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#2a1f18]">
                <tr>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Email</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Bundle</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Modules</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Subscription ID</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Product ID</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Status</th>
                  <th className="text-right px-2 py-2 text-[#E0D8C8]/70">Amount</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Interval</th>
                  <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Source</th>
                </tr>
              </thead>
              <tbody>
                {bundleProof.detail.map((r, i) => (
                  <tr key={i} className="border-t border-[#8b6239]/15">
                    <td className="px-2 py-1.5 font-mono">{r.email || '-'}</td>
                    <td className="px-2 py-1.5 text-[#D4A574] font-semibold">{r.canonical_bundle || '-'}</td>
                    <td className="px-2 py-1.5">{(r.modules || []).join(', ')}</td>
                    <td className="px-2 py-1.5 font-mono text-[#E0D8C8]/60 max-w-[160px] truncate" title={r.provider_subscription_id}>{r.provider_subscription_id || '-'}</td>
                    <td className="px-2 py-1.5 font-mono text-[#E0D8C8]/60">{r.stripe_product_id || '-'}</td>
                    <td className="px-2 py-1.5">
                      <span className={r.current === 'current' ? 'text-emerald-300' : 'text-[#E0D8C8]/60'}>{r.current}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right">{r.amount_cents ? `$${(r.amount_cents / 100).toFixed(2)}` : '-'}</td>
                    <td className="px-2 py-1.5">{r.interval || '-'}</td>
                    <td className="px-2 py-1.5 text-[#E0D8C8]/60">{r.source_entity || r.product_resolution_source || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-[#E0D8C8]/50">No bundle subscribers found in any source (ActiveContract, Subscription, or StripeProductRegistry).</p>
        )}
      </Section>

      {/* ── Per-User Billing Ledger ──────────────────────────────────────────── */}
      <Section title="12. Per-User Billing Ledger (Canonical)">
        <p className="text-xs text-[#E0D8C8]/40 -mt-1 mb-2">
          Consolidated billing timeline per user. Multiple internal Subscription/ActiveContract rows are grouped into one lifecycle view.
        </p>
        <UserLedgerTable ledger={userLedger} />
      </Section>
    </div>
  );
}

function UserLedgerTable({ ledger }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...ledger].sort((a, b) => {
    if (a.current_plans.length > 0 && b.current_plans.length === 0) return -1;
    if (a.current_plans.length === 0 && b.current_plans.length > 0) return 1;
    return (b.contract_count || 0) - (a.contract_count || 0);
  });
  const rows = showAll ? sorted : sorted.slice(0, 20);
  if (rows.length === 0) return <p className="text-xs text-[#E0D8C8]/50">No billing records found.</p>;
  return (
    <div>
      <div className="rounded-xl border border-[#8b6239]/25 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#2a1f18]">
            <tr>
              <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Email</th>
              <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Current Plans</th>
              <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Historical Plans</th>
              <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Providers</th>
              <th className="text-right px-2 py-2 text-[#E0D8C8]/70">Contracts</th>
              <th className="text-left px-2 py-2 text-[#E0D8C8]/70">First Paid</th>
              <th className="text-left px-2 py-2 text-[#E0D8C8]/70">Latest Renewal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l, i) => (
              <tr key={i} className="border-t border-[#8b6239]/15">
                <td className="px-2 py-1.5 font-mono">{l.email || l.user_id || '-'}</td>
                <td className="px-2 py-1.5">
                  {(l.current_plans || []).length > 0
                    ? l.current_plans.map((p, j) => <span key={j} className="text-emerald-300 mr-1">{p}</span>)
                    : <span className="text-[#E0D8C8]/40">—</span>}
                </td>
                <td className="px-2 py-1.5 text-[#E0D8C8]/60">
                  {(l.historical_plans || []).length > 0 ? l.historical_plans.join(', ') : '—'}
                </td>
                <td className="px-2 py-1.5">{(l.current_providers || []).join(', ') || '—'}</td>
                <td className="px-2 py-1.5 text-right">{l.contract_count || 0}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{l.first_paid_date ? new Date(l.first_paid_date).toLocaleDateString() : '-'}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{l.latest_renewal ? new Date(l.latest_renewal).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 px-3 py-1.5 rounded border border-[#8b6239]/40 text-[#E0D8C8] hover:bg-[#8b6239]/20 text-xs"
        >
          {showAll ? 'Show top 20' : `Show all ${sorted.length}`}
        </button>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-[#D4A574] border-b border-[#8b6239]/25 pb-1">{title}</h2>
      {children}
    </div>
  );
}

function Card({ title, value, sub, warn = false, highlight = false }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? 'border-yellow-700/40 bg-yellow-900/10' : highlight ? 'border-[#D4A574]/40 bg-[#1f1712]/70' : 'border-[#8b6239]/25 bg-[#1f1712]/70'}`}>
      <p className="text-xs uppercase tracking-wider text-[#E0D8C8]/60">{title}</p>
      <p className={`text-2xl font-semibold mt-1 ${warn ? 'text-yellow-300' : highlight ? 'text-[#D4A574]' : 'text-[#F5F1E7]'}`}>{value}</p>
      {sub ? <p className="text-xs text-[#E0D8C8]/50 mt-1">{sub}</p> : null}
    </div>
  );
}

function moduleLabel(m) {
  const labels = { pipekeeper: 'PipeKeeper', whiskeykeeper: 'WhiskeyKeeper', cigarkeeper: 'CigarKeeper', winekeeper: 'WineKeeper' };
  return labels[m] || m;
}

function formatMoney(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}