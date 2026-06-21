import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function StripeDiagnosticsCard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [runtimeKey, setRuntimeKey] = useState(null);
  const [forbiddenScan, setForbiddenScan] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deployStatus, setDeployStatus] = useState(null);

  const runRuntimeKeyCheck = async () => {
    try {
      const res = await base44.functions.invoke('stripeRuntimeKey');
      setRuntimeKey(res.data);
      if (res.data?.ok && res.data.prefix === "sk") {
        toast.success(t("admin.runtimeKeyPassed"));
      } else if (res.data?.looksExpired) {
        toast.error(t("admin.keyMayBeExpired"));
      } else {
        toast.error(t("admin.runtimeKeyIssue"));
      }
    } catch (err) {
      toast.error(t("admin.runtimeKeyFailed", { msg: err.message || "Unknown error" }));
      setRuntimeKey({ ok: false, error: err.message });
    }
  };

  const forceStripeRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await base44.functions.invoke('forceStripeRefresh');
      if (res.data?.ok) {
        toast.success(t("admin.stripeRefreshed"));
        // Re-check all diagnostics
        await Promise.all([
          runRuntimeKeyCheck(),
          checkDeploymentStatus()
        ]);
      } else {
        toast.error(t("admin.stripeRefreshFailed", { msg: res.data?.message || "Unknown" }));
      }
    } catch (err) {
      toast.error(t("admin.refreshFailed", { msg: err.message || "Unknown error" }));
    } finally {
      setRefreshing(false);
    }
  };

  const checkDeploymentStatus = async () => {
    try {
      const res = await base44.functions.invoke('stripeDiagnostics');
      const data = res.data;
      
      // Transform stripeDiagnostics response to match expected format
      const transformed = {
        ok: data.health === "HEALTHY",
        environment: data.environment,
        deployment: {
          healthy: data.health === "HEALTHY",
          recommendation: data.health === "UNHEALTHY" ? "Fix the failing checks below" : "All systems operational"
        },
        checks: {
          secretPresent: {
            passed: data.checks?.secret_present || false,
            keyMasked: data.details?.secret_key || "N/A"
          },
          stripeInit: {
            passed: data.checks?.stripe_init || false,
            error: data.details?.init_error || null
          },
          apiConnect: {
            passed: data.checks?.api_connect || false,
            error: data.details?.api_error || null
          }
        },
        instructions: data.health === "UNHEALTHY" ? {
          step1: "Verify STRIPE_SECRET_KEY is set in Dashboard → Settings → Secrets",
          step2: "Click 'Force Refresh' button",
          step3: "If issue persists, manually redeploy functions in Base44 Dashboard"
        } : null
      };
      
      setDeployStatus(transformed);
      if (transformed.ok) {
        toast.success(t("admin.deploymentHealthy"));
      } else {
        toast.warning(t("admin.deploymentIssues"));
      }
    } catch (err) {
      toast.error(t("admin.statusCheckFailed", { msg: err.message || "Unknown" }));
      setDeployStatus({ ok: false, error: err.message });
    }
  };

  const runForbiddenScan = async () => {
    try {
      const res = await base44.functions.invoke('stripeForbiddenScan');
      setForbiddenScan(res.data);
      if (res.data?.ok && res.data.violationCount === 0) {
        toast.success(t("admin.noForbiddenPatterns"));
      } else if (res.data?.violationCount > 0) {
        toast.error(t("admin.forbiddenPatternsFound", { n: res.data.violationCount }));
      }
    } catch (err) {
      toast.error(t("admin.forbiddenScanFailed", { msg: err.message || "Unknown error" }));
      setForbiddenScan({ ok: false, error: err.message });
    }
  };

  const runPing = async () => {
    try {
      const res = await base44.functions.invoke('admin/ping');
      if (res.data?.ok) {
        toast.success(t("admin.adminRoutingWorking"));
      } else {
        toast.error(t("admin.adminPingFailed"));
      }
    } catch (err) {
      toast.error(t("admin.adminPingFailedMsg", { msg: err.message || "Unknown error" }));
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke("stripeDiagnostics", {});
      setResult(response.data);
      
      if (response.data.hardFail) {
        toast.error(t("admin.criticalForbiddenConstructors"));
      } else if (!response.data.stripeSanityOk) {
        toast.error(t("admin.stripeAuthFailed"));
      } else {
        toast.success(t("admin.stripeDiagsPassed"));
      }
    } catch (err) {
      toast.error(err.message || t("admin.failedToRunDiagnostics"));
      setResult({ ok: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          <CardTitle className="text-purple-900">{t("admin.stripeDiagnosticsTitle")}</CardTitle>
        </div>
        <CardDescription className="text-purple-800">
          {t("admin.stripeDiagnosticsDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deployment Banner */}
        <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-lg">
          <div className="font-bold text-blue-900 mb-2">{t("auto.components_admin_StripeDiagnosticsCard.after_updating_stripe_secret_key_119mls")}</div>
          <div className="text-sm text-blue-800 space-y-1">
            <div>1. Click "Full Status Check" below to verify current state</div>
            <div>{t("admin.fixRefreshStep")}</div>
            <div>{t("admin.fixCheckStep")}</div>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={checkDeploymentStatus}
            className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
          >
            {t("admin.fullStatusCheck")}
          </Button>
          <Button
            onClick={forceStripeRefresh}
            disabled={refreshing}
            className="bg-green-600 hover:bg-green-700 text-white flex-1"
          >
            {refreshing ? t("admin.refreshing") : t("admin.forceRefresh")}
          </Button>
          <Button
            onClick={runRuntimeKeyCheck}
            variant="outline"
            className="flex-1"
          >
            {t("admin.runtimeKeyBtn")}
          </Button>
          <Button
            onClick={runForbiddenScan}
            variant="outline"
            className="flex-1"
          >
            {t("admin.scanCodeBtn")}
          </Button>
        </div>

        {/* Deployment Status */}
        {deployStatus && (
          <Alert className={deployStatus.ok ? "bg-green-50 border-green-400" : "bg-red-50 border-red-400"}>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div className="font-bold text-lg flex items-center gap-2">
                  {deployStatus.ok ? '✅' : '❌'} {t("admin.deploymentStatusHeading")}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">{t("admin.environmentLabel")}</span>{" "}
                    <code className={`font-mono font-semibold ${deployStatus.environment === "live" ? "text-green-700" : "text-yellow-700"}`}>
                      {deployStatus.environment || "unknown"}
                    </code>
                  </div>
                  <div>
                    <span className="text-gray-600">{t("admin.healthLabel")}</span>{" "}
                    <span className={`font-bold ${deployStatus.deployment?.healthy ? "text-green-700" : "text-red-700"}`}>
                      {deployStatus.deployment?.healthy ? "HEALTHY" : "UNHEALTHY"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{t("admin.checkResults")}</div>
                  <div className="ml-3 space-y-1">
                    <div>
                      {deployStatus.checks?.secretPresent?.passed ? '✅' : '❌'} {t("admin.secretPresentLabel")}
                      {deployStatus.checks?.secretPresent?.keyMasked && 
                        <code className="ml-2 text-xs bg-gray-100 px-1 rounded">{deployStatus.checks.secretPresent.keyMasked}</code>
                      }
                    </div>
                    <div>
                      {deployStatus.checks?.stripeInit?.passed ? '✅' : '❌'} {t("admin.stripeInitLabel")}
                      {!deployStatus.checks?.stripeInit?.passed && deployStatus.checks?.stripeInit?.error && 
                        <span className="ml-2 text-xs text-red-600">{deployStatus.checks.stripeInit.error}</span>
                      }
                    </div>
                    <div>
                      {deployStatus.checks?.apiConnect?.passed ? '✅' : '❌'} {t("admin.apiConnectLabel")}
                      {!deployStatus.checks?.apiConnect?.passed && deployStatus.checks?.apiConnect?.error && 
                        <span className="ml-2 text-xs text-red-600">{deployStatus.checks.apiConnect.error}</span>
                      }
                    </div>
                  </div>
                </div>

                {deployStatus.deployment?.recommendation && (
                  <div className="p-3 bg-white border border-gray-300 rounded text-sm">
                    <div className="font-bold mb-1">{t("auto.components_admin_StripeDiagnosticsCard.recommendation_wpsxma")}</div>
                    <div>{deployStatus.deployment.recommendation}</div>
                  </div>
                )}

                {deployStatus.instructions && (
                  <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-xs space-y-1">
                    <div className="font-bold">{t("auto.components_admin_StripeDiagnosticsCard.fix_steps_1jryw5")}</div>
                    {Object.entries(deployStatus.instructions).map(([key, value]) => (
                      <div key={key} className="ml-2">• {value}</div>
                    ))}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {runtimeKey && (
          <Alert className={runtimeKey.ok && runtimeKey.prefix === "sk" && runtimeKey.present ? "bg-green-100 border-green-400" : "bg-red-100 border-red-400"}>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-bold text-lg">{t("auto.components_admin_StripeDiagnosticsCard.runtime_stripe_key_live_1z0zv0")}</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">{t("admin.prefixLabel")}</span>{" "}
                    <code className={`font-mono font-bold text-lg ${runtimeKey.prefix === "sk" ? "text-green-700" : "text-red-700"}`}>
                      {runtimeKey.prefix || "N/A"}
                    </code>
                  </div>
                  <div>
                    <span className="text-gray-600">{t("admin.presentLabel")}</span>{" "}
                    <code className={`font-mono font-semibold ${runtimeKey.present ? "text-green-700" : "text-red-700"}`}>
                      {runtimeKey.present ? "YES" : "NO"}
                    </code>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">{t("admin.maskedKeyLabel")}</span>{" "}
                    <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{runtimeKey.masked || "N/A"}</code>
                  </div>
                  <div>
                    <span className="text-gray-600">{t("admin.lengthLabel")}</span>{" "}
                    <span className="font-mono">{runtimeKey.length || 0} chars</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t("admin.environmentLabel")}</span>{" "}
                    <code className={`font-mono font-semibold ${runtimeKey.environment === "live" ? "text-green-700" : "text-yellow-700"}`}>
                      {runtimeKey.environment || "unknown"}
                    </code>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">{t("admin.timestampLabel")}</span>{" "}
                    <span className="text-xs">{runtimeKey.timestamp ? new Date(runtimeKey.timestamp).toLocaleTimeString() : "N/A"}</span>
                  </div>
                </div>
                {runtimeKey.warning && (
                  <div className="text-xs bg-yellow-50 border border-yellow-300 text-yellow-900 p-2 rounded mt-2">
                    ⚠️ {runtimeKey.warning}
                  </div>
                )}
                {(!runtimeKey.ok || runtimeKey.prefix !== "sk" || !runtimeKey.present || runtimeKey.looksExpired) && (
                  <div className="text-sm font-bold text-red-900 mt-3 bg-red-50 border-2 border-red-400 p-3 rounded">
                    <div className="mb-2">{t("auto.components_admin_StripeDiagnosticsCard.blocking_issue_detected_ibqh33")}</div>
                    {!runtimeKey.present && <div>{t("auto.components_admin_StripeDiagnosticsCard.stripe_secret_key_is_missing_in_44snnc")} {runtimeKey.environment || "runtime"} environment</div>}
                    {runtimeKey.present && runtimeKey.prefix !== "sk" && (
                      <div>{t("auto.components_admin_StripeDiagnosticsCard.invalid_key_type_expected_bi8oit")} <code className="bg-red-200 px-1 font-mono">sk_</code>{t("auto.components_admin_StripeDiagnosticsCard.got_vcpcdx")} <code className="bg-red-200 px-1 font-mono">{runtimeKey.prefix}</code></div>
                    )}
                    {runtimeKey.looksExpired && (
                      <div>{t("auto.components_admin_StripeDiagnosticsCard.key_appears_expired_or_revoked_contains_7qcx0a")}</div>
                    )}
                    <div className="mt-3 text-xs bg-yellow-50 border border-yellow-300 p-2 rounded space-y-2">
                      <div className="font-bold">{t("auto.components_admin_StripeDiagnosticsCard.immediate_fix_1vky15")}{runtimeKey.environment === "live" ? "LIVE" : "PREVIEW"} {t("auto.components_admin_StripeDiagnosticsCard.runtime_1uyqnn")}</div>
                      <div className="space-y-1 ml-2">
                        <div>{t("auto.components_admin_StripeDiagnosticsCard.step_1_verify_dashboard_settings_secrets_1twgp5")} <code className="bg-gray-200 px-1">sk_live_…</code> key</div>
                        <div>{t("admin.fixRefreshStep")}</div>
                        <div>{t("admin.fixCheckStep")}</div>
                        <div className="text-red-700 font-bold mt-1">{t("auto.components_admin_StripeDiagnosticsCard.if_still_failing_after_force_refresh_1guak6")}</div>
                        <div className="ml-2">{t("auto.components_admin_StripeDiagnosticsCard.base44_backend_functions_need_manual_redeploy_11u68e")}</div>
                        <div className="ml-2">{t("auto.components_admin_StripeDiagnosticsCard.go_to_base44_dashboard_code_functions_fc7zn")}</div>
                        <div className="ml-2">{t("auto.components_admin_StripeDiagnosticsCard.trigger_redeploy_all_functions_or_publish_1rbbku")}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {runtimeKey.ok && runtimeKey.present && runtimeKey.prefix === "sk" && !runtimeKey.looksExpired && (
                  <div className="text-sm font-bold text-green-900 mt-3 bg-green-50 border-2 border-green-400 p-3 rounded">
                    {t("auto.components_admin_StripeDiagnosticsCard.runtime_key_validated_gkq3v6")} {runtimeKey.environment === "live" ? "LIVE" : "PREVIEW"} environment OK
                  </div>
                )}
                {runtimeKey.ok && runtimeKey.prefix === "sk" && runtimeKey.present && (
                  <div className="text-sm font-semibold text-green-900 mt-2 bg-green-50 border border-green-400 p-2 rounded">
                    {t("auto.components_admin_StripeDiagnosticsCard.runtime_key_is_valid_and_properly_1ak53y")}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {forbiddenScan && (
          <Alert className={forbiddenScan.ok && forbiddenScan.violationCount === 0 ? "bg-green-100 border-green-400" : "bg-red-100 border-red-400"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-bold">{t("admin.forbiddenScanTitle")}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">{t("admin.filesScanned")}</span>{" "}
                    <span className="font-semibold">{forbiddenScan.scannedCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t("admin.violations")}</span>{" "}
                    <span className={`font-bold ${forbiddenScan.violationCount > 0 ? "text-red-700" : "text-green-700"}`}>
                      {forbiddenScan.violationCount || 0}
                    </span>
                  </div>
                </div>
                {forbiddenScan.violationCount > 0 && (
                  <div className="mt-2 max-h-48 overflow-auto">
                    <div className="text-xs font-semibold text-red-900 mb-1">{t("admin.fixRequired")}</div>
                    {forbiddenScan.violations.slice(0, 10).map((v, i) => (
                      <div key={i} className="text-xs bg-red-50 p-2 rounded mb-1 border border-red-200">
                        <div className="font-mono text-red-900">{v.file}:{v.line}</div>
                        <div className="text-red-700">{t("admin.patternLabel")} {v.pattern}</div>
                        <div className="text-gray-600 truncate">→ {v.excerpt}</div>
                      </div>
                    ))}
                    {forbiddenScan.violationCount > 10 && (
                      <div className="text-xs text-red-700 mt-1">
                        {t("admin.andMoreViolations", { n: forbiddenScan.violationCount - 10 })}
                      </div>
                    )}
                  </div>
                )}
                {forbiddenScan.ok && forbiddenScan.violationCount === 0 && (
                  <div className="text-sm font-semibold text-green-900 mt-2 bg-green-50 border border-green-400 p-2 rounded">
                    {t("admin.allStripeUsageClean")}
                  </div>
                )}
                {forbiddenScan.scanError && (
                  <div className="text-xs text-yellow-800 bg-yellow-50 p-2 rounded border border-yellow-300 mt-2">
                    {t("admin.scanErrorMsg", { error: forbiddenScan.scanError })}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {result && result.hardFail && (
          <Alert variant="destructive" className="bg-red-100 border-red-400">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription>
              <div className="font-bold text-red-900 mb-2">{t("admin.criticalForbiddenTitle")}</div>
              <div className="text-red-800 text-sm mb-2">{result.hardFailHint}</div>
              <div className="text-red-900 text-xs font-mono bg-red-50 p-2 rounded mt-2 max-h-32 overflow-auto">
                {result.forbiddenStripeConstructorsScan.forbidden.map((file, i) => (
                  <div key={i}>• {file}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {result && !result.stripeSanityOk && !result.hardFail && (
          <Alert variant="destructive" className="bg-red-100 border-red-400">
            <XCircle className="h-5 w-5" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-bold text-red-900">{t("admin.stripeAuthFailedTitle")}</div>
                <div className="text-red-800 text-sm">
                  <span className="font-semibold">{t("admin.keyPrefixLabel")}</span>{" "}
                  <code className="bg-red-200 px-2 py-0.5 rounded font-mono text-red-900">
                    {result.keyPrefix || result.stripeKeyPrefix || "unknown"}
                  </code>
                </div>
                {result.stripeSanityError && (
                  <div className="text-red-800 text-xs font-mono bg-red-50 p-2 rounded break-words">
                    {result.stripeSanityError}
                  </div>
                )}
                {(result.keyPrefix === "mk" || result.keyPrefix === "pk" || result.keyPrefix === "missing" || result.keyPrefix === "other" || !result.stripeKeyValid) && (
                  <div className="text-sm font-semibold text-red-900 mt-2 bg-yellow-100 border border-yellow-400 p-2 rounded">
                    {t("admin.stripeKeyMustStartWith")}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {result && result.stripeSanityOk && !result.hardFail && (
          <div className="space-y-3 pt-4 border-t border-purple-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">{t("admin.allChecksPassed")}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/50 rounded p-2">
                <div className="text-purple-600 text-xs">{t("admin.keyPrefixShort")}</div>
                <div className="text-purple-900 font-mono font-semibold">{result.keyPrefix}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-purple-600 text-xs">{t("admin.apiConnectionLabel")}</div>
                <div className="text-purple-900 font-semibold">
                  {result.stripeSanityOk ? t("admin.apiOk") : t("admin.apiFailed")}
                </div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-purple-600 text-xs">{t("admin.forbiddenConstructorsLabel")}</div>
                <div className="text-purple-900 font-semibold">
                  {result.forbiddenStripeConstructorsScan?.ok 
                    ? result.forbiddenStripeConstructorsScan.forbidden.length 
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>
        )}

        {result && result.forbiddenStripeConstructorsScan && !result.forbiddenStripeConstructorsScan.ok && (
          <Alert className="bg-yellow-100 border-yellow-400">
            <AlertTriangle className="h-4 w-4 text-yellow-700" />
            <AlertDescription className="text-yellow-900 text-sm">
              {t("admin.couldNotScanForbidden", { error: result.forbiddenStripeConstructorsScan.error })}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}