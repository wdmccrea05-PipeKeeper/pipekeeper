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
      toast.error(t("admin.pleaseEnterEmail"));
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke("reconcileEntitlementsForUser", {
        email: email.trim(),
      });

      const data = response.data;
      setResult(data);
      
      if (data.ok) {
        toast.success(t("admin.entitlementsReconciledFor", { email }));
        await queryClient.invalidateQueries({ queryKey: ["user-report"] });
        await queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      } else {
        toast.error(data.message || t("admin.reconciliationFailed"));
      }
    } catch (err) {
      toast.error(err.message || t("admin.reconciliationFailed"));
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
          <CardTitle className="text-purple-900">{t("admin.reconcileUserEntitlementsTitle")}</CardTitle>
        </div>
        <CardDescription className="text-purple-800">
          {t("admin.reconcileUserEntitlementsDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-purple-100 border-purple-300">
          <AlertCircle className="h-4 w-4 text-purple-700" />
          <AlertDescription className="text-purple-900 text-sm">
            {t("admin.reconcileAlertText")}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-purple-900">{t("admin.userEmail")}</Label>
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
          {loading ? t("admin.reconciling") : t("admin.reconcileEntitlements")}
        </Button>

        {result && result.ok && (
          <div className="space-y-3 pt-4 border-t border-purple-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">{t("admin.reconciliationComplete")}</span>
            </div>
            
            <div className="bg-white/70 rounded p-3 space-y-2 text-sm">
              <div className="font-semibold text-purple-900">{t("admin.providerUsed")}: {result.providerUsed}</div>
              
              <div className="space-y-1">
                <div className="text-purple-700 font-medium">{t("admin.before")}:</div>
                <div className="pl-3 space-y-0.5 text-purple-800">
                  <div>{t("admin.tierColon")} {result.before.subscription_tier || "none"}</div>
                  <div>{t("admin.levelColon")} {result.before.subscription_level || "none"}</div>
                  <div>{t("admin.statusColon")} {result.before.subscription_status || "none"}</div>
                  {result.before.stripe_customer_id && (
                    <div>{t("admin.customerIdColon")} {result.before.stripe_customer_id.slice(0, 15)}...</div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center py-2">
                <ArrowRight className="w-5 h-5 text-purple-600" />
              </div>

              <div className="space-y-1">
                <div className="text-purple-700 font-medium">{t("admin.after")}:</div>
                <div className="pl-3 space-y-0.5 text-purple-800">
                  <div>{t("admin.tierColon")} {result.after.subscription_tier || "none"}</div>
                  <div>{t("admin.levelColon")} {result.after.subscription_level || "none"}</div>
                  <div>{t("admin.statusColon")} {result.after.subscription_status || "none"}</div>
                  {result.after.stripe_customer_id && (
                    <div>{t("admin.customerIdColon")} {result.after.stripe_customer_id.slice(0, 15)}...</div>
                  )}
                </div>
              </div>

              {result.changes && (
                <div className="pt-2 border-t border-purple-200">
                  <div className="text-purple-700 font-medium mb-1">{t("admin.changes")}:</div>
                  <div className="pl-3 space-y-0.5 text-xs text-purple-800">
                    <div>{t("admin.tierChanged")}: {result.changes.tierChanged ? "✓" : "−"}</div>
                    <div>{t("admin.levelChanged")}: {result.changes.levelChanged ? "✓" : "−"}</div>
                    <div>{t("admin.statusChanged")}: {result.changes.statusChanged ? "✓" : "−"}</div>
                    <div>{t("admin.customerIdAdded")}: {result.changes.customerIdAdded ? "✓" : "−"}</div>
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
                <div className="font-semibold">{t("admin.reconciliationFailed")}</div>
                <div className="text-sm">
                  <span className="font-semibold">{t("admin.errorLabel")}</span> {result.error || "UNKNOWN"}
                </div>
                {result.message && (
                  <div className="text-sm break-words">
                    <span className="font-semibold">{t("admin.messageLabel")}</span> {result.message}
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