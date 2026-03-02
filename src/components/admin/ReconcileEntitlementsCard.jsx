import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function ReconcileEntitlementsCard() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const { t } = useTranslation();
  
  const queryClient = useQueryClient();

  const runReconcile = async () => {
    if (!email.trim()) {
      toast.error(t("admin.pleaseEnterEmail", "Please enter an email address"));
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke("adminReconcileEntitlements", {
        email: email.trim(),
      });

      const data = response.data;
      setResult(data);
      
      if (data.ok) {
        toast.success(t("admin.entitlementsReconciledFor", "Entitlements reconciled for {email}", { email }));
        await queryClient.invalidateQueries({ queryKey: ["user-report"] });
        await queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      } else {
        toast.error(data.message || t("admin.reconciliationFailed", "Reconciliation failed"));
      }
    } catch (err) {
      toast.error(err.message || "Failed to reconcile entitlements");
      setResult({ 
        ok: false, 
        error: "REQUEST_FAILED", 
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-purple-600" />
          <CardTitle className="text-purple-900">{t("admin.reconcileUserEntitlementsTitle", "Reconcile User Entitlements")}</CardTitle>
        </div>
        <CardDescription className="text-purple-800">
          {t("admin.reconcileUserEntitlementsDesc", "Recover subscription data from Stripe/Apple for a specific user by email")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-purple-100 border-purple-300">
          <AlertCircle className="h-4 w-4 text-purple-700" />
          <AlertDescription className="text-purple-900 text-sm">
            {t("admin.reconcileAlertText", "This will check Stripe and Apple subscriptions for the user and update their tier/status accordingly. Safe to run multiple times.")}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-purple-900">User Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            disabled={loading}
          />
        </div>

        <Button
          onClick={runReconcile}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white w-full"
        >
          {loading ? t("admin.reconciling", "Reconciling...") : t("admin.reconcileEntitlements", "Reconcile Entitlements")}
        </Button>

        {result && result.ok && (
          <div className="space-y-3 pt-4 border-t border-purple-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">{t("admin.reconciliationComplete", "Reconciliation Complete")}</span>
            </div>
            
            <div className="bg-white/70 rounded p-3 space-y-2 text-sm">
              <div className="font-semibold text-purple-900">{t("admin.providerUsed", "Provider Used")}: {result.providerUsed}</div>
              
              <div className="space-y-1">
                <div className="text-purple-700 font-medium">{t("admin.before", "Before")}:</div>
                <div className="pl-3 space-y-0.5 text-purple-800">
                  <div>Tier: {result.before.subscription_tier || "none"}</div>
                  <div>Level: {result.before.subscription_level || "none"}</div>
                  <div>Status: {result.before.subscription_status || "none"}</div>
                  {result.before.stripe_customer_id && (
                    <div>Customer ID: {result.before.stripe_customer_id.slice(0, 15)}...</div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center py-2">
                <ArrowRight className="w-5 h-5 text-purple-600" />
              </div>

              <div className="space-y-1">
                <div className="text-purple-700 font-medium">{t("admin.after", "After")}:</div>
                <div className="pl-3 space-y-0.5 text-purple-800">
                  <div>Tier: {result.after.subscription_tier || "none"}</div>
                  <div>Level: {result.after.subscription_level || "none"}</div>
                  <div>Status: {result.after.subscription_status || "none"}</div>
                  {result.after.stripe_customer_id && (
                    <div>Customer ID: {result.after.stripe_customer_id.slice(0, 15)}...</div>
                  )}
                </div>
              </div>

              {result.changes && (
                <div className="pt-2 border-t border-purple-200">
                  <div className="text-purple-700 font-medium mb-1">{t("admin.changes", "Changes")}:</div>
                  <div className="pl-3 space-y-0.5 text-xs text-purple-800">
                    <div>{t("admin.tierChanged", "Tier changed")}: {result.changes.tierChanged ? "✓" : "−"}</div>
                    <div>{t("admin.levelChanged", "Level changed")}: {result.changes.levelChanged ? "✓" : "−"}</div>
                    <div>{t("admin.statusChanged", "Status changed")}: {result.changes.statusChanged ? "✓" : "−"}</div>
                    <div>{t("admin.customerIdAdded", "Customer ID added")}: {result.changes.customerIdAdded ? "✓" : "−"}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {result && !result.ok && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold">{t("admin.reconciliationFailed", "Reconciliation Failed")}</div>
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