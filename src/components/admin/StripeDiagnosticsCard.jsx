import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function StripeDiagnosticsCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [runtimeKey, setRuntimeKey] = useState(null);
  const [forbiddenScan, setForbiddenScan] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const runRuntimeKeyCheck = async () => {
    try {
      const res = await base44.functions.invoke('admin/stripeRuntimeKey');
      setRuntimeKey(res.data);
      if (res.data?.ok && res.data.prefix === "sk") {
        toast.success('Runtime key check passed');
      } else if (res.data?.looksExpired) {
        toast.error('WARNING: Key may be expired');
      } else {
        toast.error('Runtime key issue detected');
      }
    } catch (err) {
      toast.error('Runtime key check failed: ' + (err.message || 'Unknown error'));
      setRuntimeKey({ ok: false, error: err.message });
    }
  };

  const forceStripeRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await base44.functions.invoke('admin/forceStripeRefresh');
      if (res.data?.ok) {
        toast.success('Stripe refreshed and validated');
        // Re-check runtime key to show updated status
        await runRuntimeKeyCheck();
      } else {
        toast.error('Stripe refresh failed: ' + (res.data?.message || 'Unknown'));
      }
    } catch (err) {
      toast.error('Refresh failed: ' + (err.message || 'Unknown error'));
    } finally {
      setRefreshing(false);
    }
  };

  const runForbiddenScan = async () => {
    try {
      const res = await base44.functions.invoke('admin/stripeForbiddenScan');
      setForbiddenScan(res.data);
      if (res.data?.ok && res.data.violationCount === 0) {
        toast.success('No forbidden Stripe patterns found');
      } else if (res.data?.violationCount > 0) {
        toast.error(`Found ${res.data.violationCount} forbidden Stripe pattern(s)`);
      }
    } catch (err) {
      toast.error('Forbidden scan failed: ' + (err.message || 'Unknown error'));
      setForbiddenScan({ ok: false, error: err.message });
    }
  };

  const runPing = async () => {
    try {
      const res = await base44.functions.invoke('adminPing');
      if (res.data?.ok) {
        toast.success('Admin routing is working');
      } else {
        toast.error('Admin ping failed');
      }
    } catch (err) {
      toast.error('Admin ping failed: ' + (err.message || 'Unknown error'));
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke("stripeDiagnostics", {});
      setResult(response.data);
      
      if (response.data.hardFail) {
        toast.error("Critical: Forbidden Stripe constructors detected!");
      } else if (!response.data.stripeSanityOk) {
        toast.error("Stripe authentication failed");
      } else {
        toast.success("Stripe diagnostics passed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to run diagnostics");
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
          <CardTitle className="text-purple-900">Stripe Diagnostics</CardTitle>
        </div>
        <CardDescription className="text-purple-800">
          Validate Stripe configuration and detect forbidden patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
          >
            {loading ? "Running..." : "Run Diagnostics"}
          </Button>
          <Button
            onClick={runRuntimeKeyCheck}
            variant="outline"
            className="flex-1"
          >
            Check Runtime Key
          </Button>
          <Button
            onClick={forceStripeRefresh}
            disabled={refreshing}
            variant="outline"
            className="flex-1"
          >
            {refreshing ? "Refreshing..." : "Force Refresh"}
          </Button>
          <Button
            onClick={runForbiddenScan}
            variant="outline"
            className="flex-1"
          >
            Scan Forbidden
          </Button>
        </div>

        {runtimeKey && (
          <Alert className={runtimeKey.ok && runtimeKey.prefix === "sk" && runtimeKey.present ? "bg-green-100 border-green-400" : "bg-red-100 border-red-400"}>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-bold text-lg">🔑 Runtime Stripe Key (LIVE)</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Prefix:</span>{" "}
                    <code className={`font-mono font-bold text-lg ${runtimeKey.prefix === "sk" ? "text-green-700" : "text-red-700"}`}>
                      {runtimeKey.prefix || "N/A"}
                    </code>
                  </div>
                  <div>
                    <span className="text-gray-600">Present:</span>{" "}
                    <code className={`font-mono font-semibold ${runtimeKey.present ? "text-green-700" : "text-red-700"}`}>
                      {runtimeKey.present ? "YES" : "NO"}
                    </code>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Masked Key:</span>{" "}
                    <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{runtimeKey.masked || "N/A"}</code>
                  </div>
                  <div>
                    <span className="text-gray-600">Length:</span>{" "}
                    <span className="font-mono">{runtimeKey.length || 0} chars</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Environment:</span>{" "}
                    <code className={`font-mono font-semibold ${runtimeKey.environment === "live" ? "text-green-700" : "text-yellow-700"}`}>
                      {runtimeKey.environment || "unknown"}
                    </code>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Timestamp:</span>{" "}
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
                    <div className="mb-2">❌ BLOCKING ISSUE:</div>
                    {!runtimeKey.present && <div>• STRIPE_SECRET_KEY is MISSING in runtime environment</div>}
                    {runtimeKey.present && runtimeKey.prefix !== "sk" && (
                      <div>• Expected prefix: <code className="bg-red-200 px-1 font-mono">sk_</code>, got: <code className="bg-red-200 px-1 font-mono">{runtimeKey.prefix}</code></div>
                    )}
                    {runtimeKey.looksExpired && (
                      <div>• Key appears EXPIRED or REVOKED</div>
                    )}
                    <div className="mt-3 text-xs bg-yellow-50 border border-yellow-300 p-2 rounded">
                      <div className="font-bold mb-1">🔧 FIX STEPS for Preview:</div>
                      <div>1. Update STRIPE_SECRET_KEY in Dashboard → Secrets</div>
                      <div>2. Click "Force Refresh" button above to reload</div>
                      <div>3. If still failing → Manually redeploy functions in Base44</div>
                    </div>
                  </div>
                )}
                {runtimeKey.ok && runtimeKey.prefix === "sk" && runtimeKey.present && (
                  <div className="text-sm font-semibold text-green-900 mt-2 bg-green-50 border border-green-400 p-2 rounded">
                    ✅ Runtime key is valid and properly loaded
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
                <div className="font-bold">Forbidden Stripe Pattern Scan</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Files Scanned:</span>{" "}
                    <span className="font-semibold">{forbiddenScan.scannedCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Violations:</span>{" "}
                    <span className={`font-bold ${forbiddenScan.violationCount > 0 ? "text-red-700" : "text-green-700"}`}>
                      {forbiddenScan.violationCount || 0}
                    </span>
                  </div>
                </div>
                {forbiddenScan.violationCount > 0 && (
                  <div className="mt-2 max-h-48 overflow-auto">
                    <div className="text-xs font-semibold text-red-900 mb-1">Fix Required:</div>
                    {forbiddenScan.violations.slice(0, 10).map((v, i) => (
                      <div key={i} className="text-xs bg-red-50 p-2 rounded mb-1 border border-red-200">
                        <div className="font-mono text-red-900">{v.file}:{v.line}</div>
                        <div className="text-red-700">Pattern: {v.pattern}</div>
                        <div className="text-gray-600 truncate">→ {v.excerpt}</div>
                      </div>
                    ))}
                    {forbiddenScan.violationCount > 10 && (
                      <div className="text-xs text-red-700 mt-1">
                        ... and {forbiddenScan.violationCount - 10} more violations
                      </div>
                    )}
                  </div>
                )}
                {forbiddenScan.ok && forbiddenScan.violationCount === 0 && (
                  <div className="text-sm font-semibold text-green-900 mt-2 bg-green-50 border border-green-400 p-2 rounded">
                    ✅ All Stripe usage goes through helper function
                  </div>
                )}
                {forbiddenScan.scanError && (
                  <div className="text-xs text-yellow-800 bg-yellow-50 p-2 rounded border border-yellow-300 mt-2">
                    ⚠️ Scan error: {forbiddenScan.scanError}
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
              <div className="font-bold text-red-900 mb-2">CRITICAL: Forbidden Stripe Constructors Detected</div>
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
                <div className="font-bold text-red-900">Stripe Authentication Failed</div>
                <div className="text-red-800 text-sm">
                  <span className="font-semibold">Key Prefix:</span>{" "}
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
                    ⚠️ STRIPE_SECRET_KEY must start with <code className="font-mono bg-yellow-200 px-1">sk_</code> (secret) or <code className="font-mono bg-yellow-200 px-1">rk_</code> (restricted)
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
              <span className="font-semibold">All Checks Passed</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/50 rounded p-2">
                <div className="text-purple-600 text-xs">Key Prefix</div>
                <div className="text-purple-900 font-mono font-semibold">{result.keyPrefix}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-purple-600 text-xs">API Connection</div>
                <div className="text-purple-900 font-semibold">
                  {result.stripeSanityOk ? "OK" : "Failed"}
                </div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-purple-600 text-xs">Forbidden Constructors</div>
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
              Could not scan for forbidden constructors: {result.forbiddenStripeConstructorsScan.error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}