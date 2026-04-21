import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Wrench, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function NormalizeSubscriptionsCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showSamples, setShowSamples] = useState(false);
  const queryClient = useQueryClient();

  const run = async (dryRun) => {
    setLoading(true);
    setResult(null);
    try {
      const response = await base44.functions.invoke("normalizeAllSubscriptions", { dryRun, limit: 500 });
      const data = response.data;
      setResult({ ...data, dryRun });
      if (data.ok) {
        if (!dryRun) {
          toast.success(`Repaired ${data.after?.repaired ?? 0} subscription records.`);
          await queryClient.invalidateQueries({ queryKey: ["user-report"] });
          await queryClient.invalidateQueries({ queryKey: ["subscription"] });
        } else {
          toast.info(`Dry run: ${data.after?.repaired ?? 0} records would be repaired.`);
        }
      } else {
        toast.error(data.error || "Normalization failed");
      }
    } catch (err) {
      toast.error(err.message || "Request failed");
      setResult({ ok: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-amber-600" />
          <CardTitle className="text-amber-900">Rebuild Subscription Source of Truth</CardTitle>
        </div>
        <CardDescription className="text-amber-800">
          Repairs all subscription records — fills missing <code>planKey</code>, <code>modules_csv</code>,{" "}
          <code>billing_interval</code>, <code>product_kind</code>, and <code>amount</code> from Stripe live data and known price catalog.
          Run a dry run first, then apply.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-amber-100 border-amber-300">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-900 text-sm">
            This repairs source records directly. Dry run is safe — it previews what would change without writing anything.
          </AlertDescription>
        </Alert>

        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => run(true)}
            disabled={loading}
            variant="outline"
            className="border-amber-400 text-amber-900 hover:bg-amber-100"
          >
            {loading ? "Running..." : "Dry Run (Preview)"}
          </Button>
          <Button
            onClick={() => run(false)}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading ? "Applying..." : "Apply Repair"}
          </Button>
        </div>

        {result && result.ok && (
          <div className="space-y-3 pt-4 border-t border-amber-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">{result.dryRun ? "Dry Run Complete" : "Repair Applied"}</span>
            </div>

            <p className="text-sm text-amber-900">{result.summary}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {[
                ["Total Records", result.before?.total],
                ["Missing Modules (before)", result.before?.missingModules],
                ["Missing Interval (before)", result.before?.missingInterval],
                ["Missing Amount (before)", result.before?.missingAmount],
                ["Would Repair / Repaired", result.after?.repaired],
                ["Skipped (already ok)", result.after?.skipped],
                ["Errors", result.after?.errors],
                ["Stripe Available", result.stripeAvailable ? "Yes" : "No"],
                ["Price Map Keys", result.priceMapKeys],
              ].map(([label, value]) => (
                <div key={label} className="bg-white/60 rounded p-2">
                  <div className="text-amber-600 text-xs">{label}</div>
                  <div className="text-amber-900 font-semibold">{String(value ?? "—")}</div>
                </div>
              ))}
            </div>

            {result.sampleRepairs?.length > 0 && (
              <div>
                <button
                  onClick={() => setShowSamples(s => !s)}
                  className="flex items-center gap-1 text-sm text-amber-700 font-medium"
                >
                  {showSamples ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Sample Repairs ({result.sampleRepairs.length})
                </button>
                {showSamples && (
                  <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
                    {result.sampleRepairs.map((r, i) => (
                      <div key={i} className="bg-white/70 rounded p-2 text-xs space-y-1 border border-amber-200">
                        <div className="font-semibold text-amber-900">{r.user_email}</div>
                        <div className="text-amber-600">Confidence: <span className="font-bold">{r.confidence}</span></div>
                        <div className="text-amber-600 break-all">Trace: {r.trace}</div>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          <div>
                            <div className="text-gray-500 font-semibold">Before</div>
                            <pre className="whitespace-pre-wrap break-all text-gray-700">{JSON.stringify(r.before, null, 1)}</pre>
                          </div>
                          <div>
                            <div className="text-green-600 font-semibold">After</div>
                            <pre className="whitespace-pre-wrap break-all text-green-700">{JSON.stringify(r.after, null, 1)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {result.sampleErrors?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="text-red-800 font-semibold text-sm mb-1">Sample Errors</div>
                {result.sampleErrors.map((e, i) => (
                  <div key={i} className="text-xs text-red-700">{e.id}: {e.error}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {result && !result.ok && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{result.error || "Unknown error"}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}