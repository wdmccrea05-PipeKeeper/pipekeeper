import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Wrench, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function RepairProAccessCard() {
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(200);
  const [result, setResult] = useState(null);
  const [showUpdated, setShowUpdated] = useState(false);
  const [showUnknown, setShowUnknown] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  
  const queryClient = useQueryClient();

  const runRepair = async (dryRun) => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke("repairStripeTiers", {
        dryRun,
        limit,
      });

      setResult(response.data);
      
      if (response.data.ok) {
        toast.success(
          dryRun 
            ? "Dry run complete - no changes made" 
            : `Repair complete: ${response.data.updatedSubscriptions} subscriptions updated`
        );
        
        // Invalidate queries after successful repair
        if (!dryRun && response.data.updatedSubscriptions > 0) {
          await queryClient.invalidateQueries({ queryKey: ["user-report"] });
          await queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
          await queryClient.invalidateQueries({ queryKey: ["subscription"] });
        }
      } else {
        toast.error(response.data.error || "Repair failed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to run repair");
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
          <CardTitle className="text-amber-900">Repair Pro Access</CardTitle>
        </div>
        <CardDescription className="text-amber-800">
          Recomputes subscription tiers from Stripe and updates local records. Safe to run multiple times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-amber-100 border-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-900 text-sm">
            This fetches live data from Stripe, resolves pro vs premium tier, and updates Subscription.tier + User.subscription_tier.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="limit" className="text-amber-900">Subscription Limit</Label>
          <Input
            id="limit"
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 200)}
            min={1}
            max={1000}
            className="w-32"
            disabled={loading}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => runRepair(true)}
            disabled={loading}
            variant="outline"
            className="border-amber-400 text-amber-900 hover:bg-amber-100"
          >
            {loading ? "Running..." : "Dry Run"}
          </Button>
          <Button
            onClick={() => runRepair(false)}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading ? "Running..." : "Repair Now"}
          </Button>
        </div>

        {result && result.ok && (
          <div className="space-y-3 pt-4 border-t border-amber-200">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/50 rounded p-2">
                <div className="text-amber-600 text-xs">Scanned</div>
                <div className="text-amber-900 font-semibold">{result.scanned}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-amber-600 text-xs">Updated Subscriptions</div>
                <div className="text-amber-900 font-semibold">{result.updatedSubscriptions}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-amber-600 text-xs">Updated Users</div>
                <div className="text-amber-900 font-semibold">{result.updatedUsers}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-amber-600 text-xs">Unknown Tier</div>
                <div className="text-amber-900 font-semibold">{result.unknownTier}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-amber-600 text-xs">Missing Stripe Sub</div>
                <div className="text-amber-900 font-semibold">{result.missingStripeSubscription}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-amber-600 text-xs">Mode</div>
                <div className="text-amber-900 font-semibold">{result.dryRun ? "Dry Run" : "Live"}</div>
              </div>
            </div>

            {result.samples?.updated?.length > 0 && (
              <Collapsible open={showUpdated} onOpenChange={setShowUpdated}>
                <CollapsibleTrigger className="flex items-center justify-between w-full bg-white/70 rounded p-2 hover:bg-white/90 transition-colors">
                  <span className="text-sm font-medium text-amber-900">
                    Updated Samples ({result.samples.updated.length})
                  </span>
                  {showUpdated ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {result.samples.updated.map((sample, idx) => (
                    <div key={idx} className="bg-white/70 rounded p-2 text-xs space-y-1">
                      <div><span className="text-amber-600">Email:</span> {sample.user_email}</div>
                      <div><span className="text-amber-600">Stripe Sub:</span> {sample.stripe_sub_id}</div>
                      <div><span className="text-amber-600">Change:</span> {sample.old_tier || 'null'} → {sample.new_tier}</div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {result.samples?.unknown?.length > 0 && (
              <Collapsible open={showUnknown} onOpenChange={setShowUnknown}>
                <CollapsibleTrigger className="flex items-center justify-between w-full bg-white/70 rounded p-2 hover:bg-white/90 transition-colors">
                  <span className="text-sm font-medium text-amber-900">
                    Unknown Tier Samples ({result.samples.unknown.length})
                  </span>
                  {showUnknown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {result.samples.unknown.map((sample, idx) => (
                    <div key={idx} className="bg-white/70 rounded p-2 text-xs space-y-1">
                      <div><span className="text-amber-600">Email:</span> {sample.user_email}</div>
                      <div><span className="text-amber-600">Stripe Sub:</span> {sample.stripe_sub_id}</div>
                      <div><span className="text-amber-600">Reason:</span> {sample.reason}</div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {result.samples?.missing?.length > 0 && (
              <Collapsible open={showMissing} onOpenChange={setShowMissing}>
                <CollapsibleTrigger className="flex items-center justify-between w-full bg-white/70 rounded p-2 hover:bg-white/90 transition-colors">
                  <span className="text-sm font-medium text-amber-900">
                    Missing Samples ({result.samples.missing.length})
                  </span>
                  {showMissing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {result.samples.missing.map((sample, idx) => (
                    <div key={idx} className="bg-white/70 rounded p-2 text-xs space-y-1">
                      <div><span className="text-amber-600">Email:</span> {sample.user_email}</div>
                      <div><span className="text-amber-600">Reason:</span> {sample.reason}</div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {result && !result.ok && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold">Repair Failed</div>
                <div className="text-sm break-words">{result.error || result.message}</div>
                {result.keyPrefix && (
                  <div className="text-sm">
                    <span className="font-semibold">Key Prefix:</span>{" "}
                    <code className="bg-black/30 px-2 py-0.5 rounded font-mono">
                      {result.keyPrefix}
                    </code>
                  </div>
                )}
                {(result.error?.includes("STRIPE_AUTH_FAILED") || result.error?.includes("Invalid API Key") || result.error?.includes("mk_") || result.keyPrefix === "mk" || result.keyPrefix === "pk") && (
                  <div className="text-sm font-semibold text-yellow-200 mt-2">
                    ⚠️ STRIPE_SECRET_KEY must start with sk_ (secret) or rk_ (restricted)
                  </div>
                )}
                {result.details && (
                  <div className="text-xs mt-2 font-mono bg-black/20 p-2 rounded break-words">
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