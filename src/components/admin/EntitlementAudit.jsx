import React, { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";
import {
  ShieldCheck,
  Users,
  RefreshCw,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Activity,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

function TierBadge({ tier }) {
  const colors = {
    pro: "bg-purple-100 text-purple-800 border-purple-300",
    premium: "bg-blue-100 text-blue-800 border-blue-300",
    free: "bg-gray-100 text-gray-700 border-gray-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${colors[tier] || colors.free}`}>
      {(tier || "free").charAt(0).toUpperCase() + (tier || "free").slice(1)}
    </span>
  );
}

export default function EntitlementAudit() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Batch repair state
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  // Single-user repair state
  const [repairEmail, setRepairEmail] = useState("");
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairResult, setRepairResult] = useState(null);

  const runBatchRepair = useCallback(async (dryRun) => {
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const response = await base44.functions.invoke("auditAndRepairModuleEntitlements", {
        dryRun,
        batchAll: true,
      });
      setBatchResult(response.data);
      if (response.data.ok) {
        toast.success(dryRun ? t("admin.dryRunComplete") : t("admin.repairedUsers", { n: response.data.changed }));
        if (!dryRun) {
          await queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
          await queryClient.invalidateQueries({ queryKey: ["subscription"] });
        }
      } else {
        toast.error(response.data.error || t("admin.batchRepairFailed"));
      }
    } catch (err) {
      toast.error(err.message || t("admin.failedToRunBatch"));
      setBatchResult({ ok: false, error: err.message });
    } finally {
      setBatchLoading(false);
    }
  }, [queryClient, t]);

  const runSingleRepair = useCallback(async (dryRun) => {
    if (!repairEmail.trim()) {
      toast.error(t("admin.emailRequired"));
      return;
    }
    setRepairLoading(true);
    setRepairResult(null);
    try {
      const response = await base44.functions.invoke("auditAndRepairModuleEntitlements", {
        email: repairEmail.trim(),
        dryRun,
      });
      setRepairResult(response.data);
      if (response.data.ok) {
        toast.success(
          dryRun
            ? t("admin.dryRunNoChanges")
            : response.data.changed
            ? t("admin.entitlementRepaired", { email: repairEmail })
            : t("admin.entitlementsAlreadyCorrect", { email: repairEmail })
        );
        if (!dryRun && response.data.changed) {
          await queryClient.invalidateQueries({ queryKey: ["current-user"] });
          await queryClient.invalidateQueries({ queryKey: ["subscription"] });
          await queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
        }
      } else {
        toast.error(response.data.error || t("admin.repairFailed"));
      }
    } catch (err) {
      toast.error(err.message || t("admin.failedToRunRepair"));
      setRepairResult({ ok: false, error: err.message });
    } finally {
      setRepairLoading(false);
    }
  }, [repairEmail, queryClient, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-indigo-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t("admin.entitlementAudit")}</h2>
          <p className="text-sm text-gray-500">
            {t("admin.entitlementAuditDesc")}
          </p>
        </div>
      </div>

      {/* Single User Repair */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-green-600" />
            <CardTitle className="text-green-900">{t("admin.repairUserEntitlementTitle")}</CardTitle>
          </div>
          <CardDescription className="text-green-800">
            {t("admin.repairUserEntitlementDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-100 border-green-300">
            <AlertTriangle className="h-4 w-4 text-green-700" />
            <AlertDescription className="text-green-900 text-sm">
              {t("admin.checksStripeApple")}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="repair-email" className="text-green-900">{t("admin.userEmail")}</Label>
            <Input
              id="repair-email"
              type="email"
              placeholder="user@example.com"
              value={repairEmail}
              onChange={(e) => setRepairEmail(e.target.value)}
              disabled={repairLoading}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => runSingleRepair(true)}
              disabled={repairLoading || !repairEmail.trim()}
              variant="outline"
              className="border-green-400 text-green-900 hover:bg-green-100"
            >
              {repairLoading ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" />{t("admin.running")}</> : t("admin.dryRunBtn")}
            </Button>
            <Button
              onClick={() => runSingleRepair(false)}
              disabled={repairLoading || !repairEmail.trim()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {repairLoading ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" />{t("admin.running")}</> : <><Wrench className="w-4 h-4 mr-1" />{t("admin.repairNowBtn")}</>}
            </Button>
          </div>

          {repairResult && repairResult.ok && (
            <div className="space-y-3 pt-4 border-t border-green-200">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">
                  {repairResult.changed ? (repairResult.applied ? t("admin.repaired") : t("admin.dryRunChangesFound")) : t("admin.alreadyCorrect")}
                </span>
              </div>
              {repairResult.changed && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/50 rounded p-2">
                    <div className="text-green-600 text-xs mb-1">{t("admin.before")}</div>
                    <TierBadge tier={repairResult.before?.subscription_tier} />
                    <div className="text-xs text-gray-500 mt-1">{repairResult.before?.subscription_level}</div>
                  </div>
                  <div className="bg-white/50 rounded p-2">
                    <div className="text-green-600 text-xs mb-1">{t("admin.after")}</div>
                    <TierBadge tier={repairResult.after?.subscription_tier} />
                    <div className="text-xs text-gray-500 mt-1">{repairResult.after?.subscription_level}</div>
                  </div>
                  <div className="bg-white/50 rounded p-2 col-span-2">
                    <div className="text-green-600 text-xs">{t("admin.providerUsed")}</div>
                    <div className="text-green-900 font-semibold">{repairResult.provider}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {repairResult && !repairResult.ok && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>{repairResult.error}</strong>
                {repairResult.message && <div className="text-sm mt-1">{repairResult.message}</div>}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Batch Repair */}
      <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-indigo-900">{t("admin.batchEntitlementRepair")}</CardTitle>
          </div>
          <CardDescription className="text-indigo-800">
            {t("admin.reconcileMultipleUsers")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-indigo-100 border-indigo-300">
            <Activity className="h-4 w-4 text-indigo-700" />
            <AlertDescription className="text-indigo-900 text-sm">
              {t("admin.processesInBatches")}
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={() => runBatchRepair(true)}
              disabled={batchLoading}
              variant="outline"
              className="border-indigo-400 text-indigo-900 hover:bg-indigo-100"
            >
              {batchLoading ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" />{t("admin.running")}</> : t("admin.dryRunBtn")}
            </Button>
            <Button
              onClick={() => runBatchRepair(false)}
              disabled={batchLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {batchLoading ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" />{t("admin.running")}</> : <><Wrench className="w-4 h-4 mr-1" />{t("admin.repairBatchBtn")}</>}
            </Button>
          </div>

          {batchResult && batchResult.ok && (
            <div className="space-y-3 pt-4 border-t border-indigo-200">
              <div className="flex items-center gap-2 text-indigo-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">
                  {batchResult.dryRun ? t("admin.dryRunComplete2") : t("admin.batchRepairComplete")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/50 rounded p-2">
                  <div className="text-indigo-600 text-xs">{t("admin.processed")}</div>
                  <div className="text-indigo-900 text-xl font-bold">{batchResult.processed}</div>
                </div>
                <div className="bg-white/50 rounded p-2">
                  <div className="text-indigo-600 text-xs">{t("admin.changed")}</div>
                  <div className={`text-xl font-bold ${batchResult.changed > 0 ? "text-amber-600" : "text-green-600"}`}>
                    {batchResult.changed}
                  </div>
                </div>
                <div className="bg-white/50 rounded p-2">
                  <div className="text-indigo-600 text-xs">{t("admin.alreadyCorrectLabel")}</div>
                  <div className="text-green-700 text-xl font-bold">{batchResult.alreadyCorrect}</div>
                </div>
                <div className="bg-white/50 rounded p-2">
                  <div className="text-indigo-600 text-xs">{t("admin.errorsLabel")}</div>
                  <div className={`text-xl font-bold ${batchResult.errors > 0 ? "text-red-600" : "text-green-600"}`}>
                    {batchResult.errors}
                  </div>
                </div>
              </div>

              {batchResult.sampleFixes && batchResult.sampleFixes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-indigo-700 text-sm font-semibold">{t("admin.sampleFixes")}</div>
                  {batchResult.sampleFixes.map((fix, i) => (
                    <div key={i} className="bg-white/50 rounded p-2 text-xs">
                      <div className="font-mono text-indigo-900 truncate">{fix.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <TierBadge tier={fix.before.tier} />
                        <span className="text-gray-400">→</span>
                        <TierBadge tier={fix.after.tier} />
                        <span className="text-gray-500 ml-1">via {fix.provider}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {batchResult.sampleErrors && batchResult.sampleErrors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-red-700 text-sm font-semibold">{t("admin.errorsHeading")}</div>
                  {batchResult.sampleErrors.map((err, i) => (
                    <div key={i} className="bg-red-50 rounded p-2 text-xs border border-red-200">
                      <div className="font-mono text-red-900 truncate">{err.email}</div>
                      <div className="text-red-700 mt-1">{err.error}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {batchResult && !batchResult.ok && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>{batchResult.error}</strong>
                {batchResult.message && <div className="text-sm mt-1">{batchResult.message}</div>}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
