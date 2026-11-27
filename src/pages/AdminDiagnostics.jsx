import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";
import DiagnosticCard from "@/components/admin/diagnostics/DiagnosticCard";
import FeatureMatrixTable from "@/components/admin/diagnostics/FeatureMatrixTable";
import { summarizeCollectionMatrix } from "@/lib/entitlements/collectionFeatureMatrix";

function formatCounts(counts) {
  const entries = Object.entries(counts || {});
  if (entries.length === 0) return "None";
  return entries.map(([key, value]) => `${key}: ${value}`).join(" · ");
}

export default function AdminDiagnostics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await base44.functions.invoke("adminDiagnostics", {});
      setData(response?.data || null);
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 403
          ? "This page is available to administrators only."
          : "Diagnostics could not be loaded. Try again in a moment."
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const matrix = summarizeCollectionMatrix();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-[#F5F1E7]">
            <ShieldCheck className="h-6 w-6 text-[#D4A574]" />
            Subscription &amp; entitlement diagnostics
          </h1>
          <p className="mt-1 text-sm text-[#E0D8C8]/65 break-words">
            Aggregated health of billing, entitlements and Curator. No collector records or
            identities are shown.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-[#E0D8C8]/70">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[#D4A574]" />
          Loading diagnostics…
        </div>
      )}

      {!loading && error && (
        <Card className="border-[#B35F5F]/40" style={{ background: "rgba(42,31,24,0.96)" }}>
          <CardContent className="flex items-start gap-3 py-4 text-sm text-[#E8B4B4]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="break-words">{error}</span>
          </CardContent>
        </Card>
      )}

      {!loading && data && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <DiagnosticCard
              title="Subscriptions"
              coverage={data.subscriptions?.coverage}
              measures={[
                { label: "Records", value: data.subscriptions?.totalRecords ?? 0 },
                { label: "Granting access", value: data.subscriptions?.granting ?? 0 },
                { label: "Canceled, still paid", value: data.subscriptions?.canceledButPaidThrough ?? 0 },
                { label: "Duplicate active owners", value: data.subscriptions?.duplicateActiveOwners ?? 0 },
              ]}
            />
            <DiagnosticCard
              title="Entitlement drift"
              coverage={data.entitlementDrift?.coverage}
              tone={data.entitlementDrift?.openFindings > 0 ? "warning" : "default"}
              measures={[
                { label: "Open findings", value: data.entitlementDrift?.openFindings ?? 0 },
                { label: "Critical", value: data.entitlementDrift?.bySeverity?.critical ?? 0 },
                { label: "High", value: data.entitlementDrift?.bySeverity?.high ?? 0 },
              ]}
            />
            <DiagnosticCard
              title="Curator runs"
              coverage={data.curator?.coverage}
              tone={data.curator?.failedRuns > 0 ? "warning" : "default"}
              measures={[
                { label: "Runs", value: data.curator?.runs ?? 0 },
                { label: "Failed", value: data.curator?.failedRuns ?? 0 },
                {
                  label: "Median duration",
                  value: data.curator?.medianDurationMs != null ? `${data.curator.medianDurationMs} ms` : "—",
                },
              ]}
            />
            <DiagnosticCard
              title="Complimentary access"
              coverage={data.complimentaryAccess?.coverage}
              measures={[
                { label: "Active grants", value: data.complimentaryAccess?.activeGrants ?? 0 },
                { label: "Expired grants", value: data.complimentaryAccess?.expiredGrants ?? 0 },
                { label: "Welcome trial", value: `${data.complimentaryAccess?.welcomeTrialDays ?? 0} days` },
              ]}
            />
            <DiagnosticCard
              title="Gift memberships"
              coverage={data.giftMemberships?.coverage}
              measures={[
                { label: "Codes", value: data.giftMemberships?.total ?? 0 },
                { label: "Redeemed", value: data.giftMemberships?.redeemed ?? 0 },
                { label: "Revoked", value: data.giftMemberships?.revoked ?? 0 },
              ]}
            />
            <DiagnosticCard
              title="Policy configuration"
              coverage={data.configuration?.coverage}
              measures={[
                { label: "Grace period", value: `${data.configuration?.gracePeriodDays ?? 0} days` },
                {
                  label: "Apple provisional",
                  value: `${data.configuration?.provisionalAppleExpiryDays ?? 0} days`,
                },
                { label: "Modules", value: (data.configuration?.modules || []).length },
              ]}
            />
          </div>

          <Card className="border-white/10" style={{ background: "rgba(42,31,24,0.96)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#F5F1E7]">Subscription states</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-[#E0D8C8]/75">
              <p className="break-words">Status — {formatCounts(data.subscriptions?.statusCounts)}</p>
              <p className="break-words">Provider — {formatCounts(data.subscriptions?.providerCounts)}</p>
              <p className="break-words">Drift types — {formatCounts(data.entitlementDrift?.byType)}</p>
              <p className="break-words">Gift codes — {formatCounts(data.giftMemberships?.statusCounts)}</p>
            </CardContent>
          </Card>

          <Card className="border-white/10" style={{ background: "rgba(42,31,24,0.96)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#F5F1E7]">
                Feature entitlement matrix
              </CardTitle>
              <p className="text-xs text-[#E0D8C8]/60">
                {matrix.total} features · {matrix.live} enforced · {matrix.proposed} awaiting approval
              </p>
            </CardHeader>
            <CardContent>
              <FeatureMatrixTable />
            </CardContent>
          </Card>

          {Array.isArray(data.unavailable) && data.unavailable.length > 0 && (
            <Card className="border-[#E8B87A]/30" style={{ background: "rgba(42,31,24,0.96)" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[#F5F1E7]">Signals not yet instrumented</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.unavailable.map((item) => (
                  <div key={item.signal} className="text-xs leading-relaxed">
                    <p className="font-semibold text-[#E8B87A] break-words">{item.signal}</p>
                    <p className="text-[#E0D8C8]/70 break-words">{item.reason}</p>
                    <p className="text-[#E0D8C8]/50 break-words">{item.recommendedAction}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-[#E0D8C8]/45">
            Generated {new Date(data.generatedAt).toLocaleString()}. {data.privacy}
          </p>
        </>
      )}
    </div>
  );
}