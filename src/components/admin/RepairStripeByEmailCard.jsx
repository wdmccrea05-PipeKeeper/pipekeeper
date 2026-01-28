import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function RepairStripeByEmailCard() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const runRepair = async (dryRun) => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke("repairStripeByEmail", {
        email: email.trim(),
        dryRun,
      });

      setResult(response.data);
      
      if (response.data.ok) {
        toast.success(
          dryRun 
            ? "Dry run complete - no changes made" 
            : `Subscription ${response.data.action} successfully`
        );
        
        if (!dryRun) {
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
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-blue-900">Repair Stripe Subscription by Email</CardTitle>
        </div>
        <CardDescription className="text-blue-800">
          Recover and link Stripe subscription for a specific user
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-100 border-blue-300">
          <AlertTriangle className="h-4 w-4 text-blue-700" />
          <AlertDescription className="text-blue-900 text-sm">
            Finds Stripe customer by email, retrieves active subscription, and updates local records.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-blue-900">User Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => runRepair(true)}
            disabled={loading || !email.trim()}
            variant="outline"
            className="border-blue-400 text-blue-900 hover:bg-blue-100"
          >
            {loading ? "Running..." : "Dry Run"}
          </Button>
          <Button
            onClick={() => runRepair(false)}
            disabled={loading || !email.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Running..." : "Repair Now"}
          </Button>
        </div>

        {result && result.ok && (
          <div className="space-y-3 pt-4 border-t border-blue-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Success</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Email</div>
                <div className="text-blue-900 font-mono text-xs truncate">{result.email}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Tier</div>
                <div className="text-blue-900 font-semibold">{result.tier}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Status</div>
                <div className="text-blue-900 font-semibold">{result.status}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Action</div>
                <div className="text-blue-900 font-semibold">{result.action}</div>
              </div>
              <div className="bg-white/50 rounded p-2 col-span-2">
                <div className="text-blue-600 text-xs">Stripe Customer ID</div>
                <div className="text-blue-900 font-mono text-xs truncate">{result.stripe_customer_id}</div>
              </div>
              <div className="bg-white/50 rounded p-2 col-span-2">
                <div className="text-blue-600 text-xs">Stripe Subscription ID</div>
                <div className="text-blue-900 font-mono text-xs truncate">{result.stripe_subscription_id}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">Applied</div>
                <div className="text-blue-900 font-semibold">{result.applied ? "Yes" : "Dry Run"}</div>
              </div>
            </div>
          </div>
        )}

        {result && !result.ok && (
          <Alert variant="destructive">
            <AlertDescription>
              <strong>{result.error}</strong>
              {result.message && <div className="text-sm mt-1">{result.message}</div>}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}