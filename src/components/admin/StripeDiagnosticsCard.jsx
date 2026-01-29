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
  const [envEcho, setEnvEcho] = useState(null);

  const runEnvEcho = async () => {
    try {
      const res = await base44.functions.invoke('stripeEnvEcho');
      setEnvEcho(res.data);
      if (res.data?.ok) {
        toast.success('Stripe env echo completed');
      } else {
        toast.error('Stripe env echo failed');
      }
    } catch (err) {
      toast.error('Stripe env echo failed: ' + (err.message || 'Unknown error'));
      setEnvEcho({ ok: false, error: err.message });
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
            {loading ? "Running..." : "Run Stripe Diagnostics"}
          </Button>
          <Button
            onClick={runEnvEcho}
            variant="outline"
            className="flex-1"
          >
            Check Runtime Key
          </Button>
          <Button
            onClick={runPing}
            variant="outline"
            className="flex-1"
          >
            Ping Admin Routes
          </Button>
        </div>

        {envEcho && (
          <Alert className={envEcho.ok && envEcho.prefix === "sk" ? "bg-green-100 border-green-400" : "bg-yellow-100 border-yellow-400"}>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-bold">Runtime Stripe Key Status</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Prefix:</span>{" "}
                    <code className={`font-mono font-semibold ${envEcho.prefix === "sk" ? "text-green-700" : "text-red-700"}`}>
                      {envEcho.prefix || "N/A"}
                    </code>
                  </div>
                  <div>
                    <span className="text-gray-600">Masked:</span>{" "}
                    <code className="font-mono text-xs">{envEcho.masked || "N/A"}</code>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Timestamp:</span>{" "}
                    <span className="text-xs">{envEcho.ts || "N/A"}</span>
                  </div>
                </div>
                {envEcho.prefix !== "sk" && (
                  <div className="text-sm font-semibold text-red-900 mt-2 bg-red-50 border border-red-300 p-2 rounded">
                    ⚠️ Expected prefix: <code>sk</code>, got: <code>{envEcho.prefix}</code>
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