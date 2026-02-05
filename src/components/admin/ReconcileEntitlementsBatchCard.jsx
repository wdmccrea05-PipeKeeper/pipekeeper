import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, AlertCircle, CheckCircle, ChevronRight, Play } from "lucide-react";
import { toast } from "sonner";

export default function ReconcileEntitlementsBatchCard() {
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(100);
  const [dryRun, setDryRun] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [result, setResult] = useState(null);
  
  const queryClient = useQueryClient();

  const runBatch = async (nextCursor) => {
    setLoading(true);
    
    try {
      const response = await base44.functions.invoke("admin/reconcileEntitlementsBatch", {
        batchSize: limit,
        cursor: nextCursor || undefined,
        dryRun,
      });

      const data = response.data;
      setResult(data);
      
      if (data.ok) {
        setCursor(data.nextCursor);
        toast.success(
          `Batch complete: ${data.scanned} scanned, ${data.fixed} fixed, ${data.unchanged} unchanged, ${data.errorsCount} errors`
        );
        
        if (!dryRun) {
          await queryClient.invalidateQueries({ queryKey: ["user-report"] });
          await queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
        }
      } else {
        toast.error(data.message || "Batch reconciliation failed");
      }
    } catch (err) {
      console.error("[ReconcileEntitlementsBatchCard] Error:", err);
      const errMsg = err?.response?.data?.message || err?.message || "Failed to run batch reconciliation";
      toast.error(errMsg);
      setResult({ 
        ok: false, 
        error: "REQUEST_FAILED", 
        message: errMsg
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-teal-600" />
          <CardTitle className="text-teal-900">Backfill Entitlements (Batch)</CardTitle>
        </div>
        <CardDescription className="text-teal-800">
          Fix users affected before the entitlement reconciliation patch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-teal-100 border-teal-300">
          <AlertCircle className="h-4 w-4 text-teal-700" />
          <AlertDescription className="text-teal-900 text-sm">
            Scans users who may have been downgraded to free incorrectly. Recovers Stripe/Apple subscriptions and updates their tier. Always test with Dry Run first.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="limit" className="text-teal-900">Batch Size</Label>
            <Input
              id="limit"
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
              min={10}
              max={200}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-teal-900">Mode</Label>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="dryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4 rounded border-teal-300"
                disabled={loading}
              />
              <Label htmlFor="dryRun" className="text-sm text-teal-900 cursor-pointer">
                Dry Run (preview only)
              </Label>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => runBatch(null)}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white flex-1"
          >
            {loading ? "Running..." : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Batch
              </>
            )}
          </Button>
          
          {result?.hasMore && result?.nextCursor && (
            <Button
              onClick={() => runBatch(result.nextCursor)}
              disabled={loading}
              variant="outline"
              className="border-teal-400 text-teal-900 hover:bg-teal-100"
            >
              <ChevronRight className="w-4 h-4 mr-1" />
              Next Batch
            </Button>
          )}
        </div>

        {result && result.ok && (
          <div className="space-y-3 pt-4 border-t border-teal-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">
                Batch Complete {result.dryRun && "(Dry Run)"}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/50 rounded p-2">
                <div className="text-teal-600 text-xs">Scanned</div>
                <div className="text-teal-900 font-semibold">{result.scanned}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-teal-600 text-xs">Fixed</div>
                <div className="text-teal-900 font-semibold">{result.fixed}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-teal-600 text-xs">Unchanged</div>
                <div className="text-teal-900 font-semibold">{result.unchanged}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-teal-600 text-xs">Errors</div>
                <div className="text-teal-900 font-semibold">{result.errorsCount}</div>
              </div>
            </div>

            {result.sampleFixes && result.sampleFixes.length > 0 && (
              <div className="bg-white/70 border border-teal-200 rounded p-3">
                <div className="text-teal-800 font-semibold text-sm mb-2">Sample Fixes:</div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.sampleFixes.map((fix, idx) => (
                    <div key={idx} className="text-xs bg-teal-50 rounded p-2 space-y-1">
                      <div className="font-medium text-teal-900">{fix.email}</div>
                      <div className="flex items-center gap-2 text-teal-700">
                        <span>{fix.before.tier || "none"} → {fix.after.tier}</span>
                        <span className="text-teal-500">({fix.providerUsed})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.sampleErrors && result.sampleErrors.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="text-yellow-800 font-semibold text-sm mb-2">Sample Errors:</div>
                <div className="space-y-2">
                  {result.sampleErrors.map((err, idx) => (
                    <div key={idx} className="text-xs bg-white/70 rounded p-2">
                      <div className="font-medium">{err.email}</div>
                      <div className="text-yellow-700">{err.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {result && !result.ok && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold">Batch Failed</div>
                <div className="text-sm">
                  <span className="font-semibold">Error:</span> {result.error || "UNKNOWN"}
                </div>
                {result.message && (
                  <div className="text-sm break-words">
                    <span className="font-semibold">Message:</span> {result.message}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}