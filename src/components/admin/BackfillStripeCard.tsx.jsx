import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Database, AlertCircle, CheckCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function BackfillStripeCard() {
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [cursor, setCursor] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  
  const queryClient = useQueryClient();

  const runBackfill = async (starting_after?: string | null) => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke("backfillStripeCustomers", {
        limit,
        starting_after: starting_after || undefined,
      });

      if (response.status !== 200) {
        // Handle non-200 response: read JSON error
        const errorData = response.data;
        setResult(errorData);
        toast.error(`Backfill failed at stage: ${errorData.where || "unknown"}`);
      } else {
        setResult(response.data);
        setCursor(response.data.nextStartingAfter);
        
        if (response.data.ok) {
          toast.success(
            `Fetched ${response.data.fetchedCustomers} customers, processed ${response.data.processedCustomers}`
          );
          
          // Invalidate queries after successful backfill
          await queryClient.invalidateQueries({ queryKey: ["user-report"] });
          await queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
          await queryClient.invalidateQueries({ queryKey: ["subscription"] });
        } else {
          toast.error(response.data.error || "Backfill failed");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to run backfill");
      setResult({ ok: false, error: "REQUEST_FAILED", message: err.message, where: "client" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-blue-900">Backfill Stripe Customers</CardTitle>
        </div>
        <CardDescription className="text-blue-800">
          Sync Stripe customer data to local database with batched pagination
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-100 border-blue-300">
          <AlertCircle className="h-4 w-4 text-blue-700" />
          <AlertDescription className="text-blue-900 text-sm">
            Fetches customers from Stripe, creates/updates User and Subscription entities. Safe to run multiple times.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="limit" className="text-blue-900">Batch Size (customers per request)</Label>
          <Input
            id="limit"
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
            min={1}
            max={100}
            className="w-32"
            disabled={loading}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => runBackfill(null)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Running..." : "Start Backfill"}
          </Button>
          
          {result?.hasMore && result?.nextStartingAfter && (
            <Button
              onClick={() => runBackfill(result.nextStartingAfter)}
              disabled={loading}
              variant="outline"
              className="border-blue-400 text-blue-900 hover:bg-blue-100"
            >
              <ChevronRight className="w-4 h-4 mr-1" />
              Run Next Batch
            </Button>
          )}
        </div>

        {result && result.ok && (
          <div className="space-y-3 pt-4 border-t border-blue-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Backfill Successful</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Fetched Customers</div>
                <div className="text-blue-900 font-semibold">{result.fetchedCustomers}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Processed</div>
                <div className="text-blue-900 font-semibold">{result.processedCustomers}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Created Subscriptions</div>
                <div className="text-blue-900 font-semibold">{result.createdSubs}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Updated Subscriptions</div>
                <div className="text-blue-900 font-semibold">{result.updatedSubs}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Created Users</div>
                <div className="text-blue-900 font-semibold">{result.createdUsers}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Updated Users</div>
                <div className="text-blue-900 font-semibold">{result.updatedUsers}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Errors</div>
                <div className="text-blue-900 font-semibold">{result.errorsCount || 0}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Pagination</div>
                <div className="text-blue-900 font-semibold">
                  {result.hasMore ? "More available" : "Complete"}
                </div>
              </div>
            </div>

            {result.nextStartingAfter && (
              <div className="bg-blue-100 rounded p-2 text-xs">
                <div className="text-blue-600 font-semibold">Next Cursor:</div>
                <div className="text-blue-900 font-mono break-all">{result.nextStartingAfter}</div>
              </div>
            )}

            {result.sampleErrors && result.sampleErrors.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="text-yellow-800 font-semibold text-sm mb-2">Sample Errors:</div>
                <div className="space-y-2">
                  {result.sampleErrors.map((err: any, idx: number) => (
                    <div key={idx} className="text-xs bg-white/70 rounded p-2 space-y-1">
                      <div><span className="text-yellow-600 font-semibold">Stage:</span> {err.where}</div>
                      {err.email && <div><span className="text-yellow-600 font-semibold">Email:</span> {err.email}</div>}
                      <div><span className="text-yellow-600 font-semibold">Message:</span> {err.message}</div>
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
                <div className="font-semibold">Backfill Failed</div>
                <div className="text-sm">
                  <span className="font-semibold">Error:</span> {result.error || "UNKNOWN"}
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Stage:</span>{" "}
                  <code className="bg-black/10 px-1.5 py-0.5 rounded font-mono">
                    {result.where || "unknown"}
                  </code>
                </div>
                {result.message && (
                  <div className="text-sm break-words">
                    <span className="font-semibold">Message:</span> {result.message}
                  </div>
                )}
                {result.keyPrefix && (
                  <div className="text-sm">
                    <span className="font-semibold">Key Prefix:</span>{" "}
                    <code className="bg-black/10 px-1.5 py-0.5 rounded font-mono">
                      {result.keyPrefix}
                    </code>
                  </div>
                )}
                {result.details && (
                  <div className="text-xs mt-2 font-mono bg-black/10 p-2 rounded break-words">
                    {result.details}
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