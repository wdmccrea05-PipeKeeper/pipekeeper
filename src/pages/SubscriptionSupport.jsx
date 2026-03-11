import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { base44 } from "@/api/base44Client";
import { AlertCircle, CheckCircle, RefreshCw, Settings, Users, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function SubscriptionSupport() {
  const { t } = useTranslation();
  const { user, isAdmin } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [driftData, setDriftData] = useState([]);
  const [timeWindow, setTimeWindow] = useState("24h");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userTier, setUserTier] = useState("premium");
  const [userLoading, setUserLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showUserConfirm, setShowUserConfirm] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t("subscriptionSupport.adminAccessRequired","Admin access required")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const loadHealth = async () => {
    try {
      setLoading(true);
      const { data } = await base44.functions.invoke("getIntegrationHealth", { timeWindow });
      setHealthData(data);
    } catch (error) {
      console.error("Failed to load health:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFunnel = async () => {
    try {
      setLoading(true);
      const { data } = await base44.functions.invoke("getFunnelMetrics", {});
      setFunnelData(data);
    } catch (error) {
      console.error("Failed to load funnel:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDrift = async () => {
    try {
      setLoading(true);
      const drifts = await base44.entities.EntitlementDriftCache.filter({ resolved: false });
      setDriftData(drifts);
    } catch (error) {
      console.error("Failed to load drift:", error);
    } finally {
      setLoading(false);
    }
  };

  const bulkUpdateEntitlements = async () => {
    try {
      setBulkLoading(true);
      setShowBulkConfirm(false);
      const { data } = await base44.functions.invoke("bulkUpdateActiveEntitlements", {});
      setBulkResult(data);
      
      if (data.summary.errors > 0) {
        toast.warning(t("subscriptionSupport.updatedWithErrors","Updated {{updated}} users with {{errors}} errors",{updated: data.summary.updated, errors: data.summary.errors}));
      } else {
        toast.success(t("subscriptionSupport.successfullyUpdated","Successfully updated {{updated}} users",{updated: data.summary.updated}));
      }
    } catch (error) {
      console.error("Bulk update failed:", error);
      const errorMsg = error?.response?.data?.error || error.message || t("subscriptionSupport.unknownError","Unknown error");
      toast.error(t("subscriptionSupport.bulkUpdateFailed","Bulk update failed: {{error}}",{error: errorMsg}));
      setBulkResult({ 
        ok: false, 
        error: errorMsg,
        summary: { updated: 0, errors: 1, skipped: 0, totalActiveSubs: 0 }
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const updateUserEntitlement = async () => {
    if (!userEmail.trim()) {
      toast.error(t("subscriptionSupport.pleaseEnterEmail","Please enter a user email"));
      return;
    }

    try {
      setUserLoading(true);
      setShowUserConfirm(false);
      const { data } = await base44.functions.invoke("updateUserEntitlement", {
        email: userEmail,
        tier: userTier,
        forceOverride
      });
      
      if (data.ok) {
        toast.success(t("subscriptionSupport.userUpdatedSuccess","{{email}} updated from {{before}} to {{after}}",{email: data.email, before: data.before, after: data.after}));
        setUserEmail("");
        setForceOverride(false);
      } else {
        toast.error(data.error || t("subscriptionSupport.updateFailed","Update failed"));
      }
    } catch (error) {
      console.error("User update failed:", error);
      const errorMsg = error?.response?.data?.error || error.message || t("subscriptionSupport.unknownError","Unknown error");
      
      if (forceOverride) {
        toast.error(t("subscriptionSupport.forceUpdateFailed","Force update failed: {{error}}",{error: errorMsg}));
      } else {
        toast.error(t("subscriptionSupport.updateFailedTryForce","Update failed: {{error}}. Try enabling \"Force Override\" if needed.",{error: errorMsg}));
      }
    } finally {
      setUserLoading(false);
    }
  };

  React.useEffect(() => {
    loadHealth();
    loadFunnel();
    loadDrift();
  }, [timeWindow]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#E0D8C8]">{t("subscriptionSupport.title","Subscription Support")}</h1>
        <Button onClick={() => { loadHealth(); loadFunnel(); loadDrift(); }} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </Button>
      </div>

      {/* Integration Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("subscriptionSupport.integrationHealth","Integration Health")}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={timeWindow === "24h" ? "default" : "outline"}
                onClick={() => setTimeWindow("24h")}
              >
                {t("subscriptionSupport.24h","24h")}
              </Button>
              <Button
                size="sm"
                variant={timeWindow === "7d" ? "default" : "outline"}
                onClick={() => setTimeWindow("7d")}
              >
                {t("subscriptionSupport.7d","7d")}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.stripeWebhooks","Stripe Webhooks")}</p>
                <p className="text-2xl font-bold text-[#E0D8C8]">{healthData.stripeWebhooks}</p>
              </div>
              <div>
                <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.cloudflareCheckouts","Cloudflare Checkouts")}</p>
                <p className="text-2xl font-bold text-[#E0D8C8]">{healthData.cloudflareCheckouts}</p>
              </div>
              <div>
                <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.successful","Successful")}</p>
                <p className="text-2xl font-bold text-green-500">{healthData.successfulUpdates}</p>
              </div>
              <div>
                <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.failed","Failed")}</p>
                <p className="text-2xl font-bold text-red-500">{healthData.failedUpdates}</p>
              </div>
            </div>
          ) : (
            <p className="text-[#E0D8C8]/70">{t("common.loading")}</p>
          )}
        </CardContent>
      </Card>

      {/* Drift Detection */}
      <Card>
        <CardHeader>
          <CardTitle>{t("subscriptionSupport.entitlementDriftDetection","Entitlement Drift Detection")}</CardTitle>
        </CardHeader>
        <CardContent>
          {driftData.length === 0 ? (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              <span>{t("subscriptionSupport.noDriftDetected","No drift detected")}</span>
            </div>
          ) : (
            <div className="space-y-2">
              {driftData.map((drift) => (
                <div key={drift.id} className="flex items-center justify-between p-3 bg-[#1a2c42] rounded-lg">
                  <div>
                    <p className="font-medium text-[#E0D8C8]">{drift.user_email}</p>
                    <p className="text-sm text-[#E0D8C8]/70">{drift.details}</p>
                  </div>
                  <Badge variant={drift.severity === "high" || drift.severity === "critical" ? "destructive" : "secondary"}>
                    {drift.drift_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Funnel Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>{t("subscriptionSupport.subscriptionFunnel","Subscription Funnel (Last 7 Days)")}</CardTitle>
        </CardHeader>
        <CardContent>
          {funnelData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.cloudflareCheckouts","Cloudflare Checkouts")}</p>
                  <p className="text-2xl font-bold text-[#E0D8C8]">{funnelData.cloudflareCheckouts}</p>
                </div>
                <div>
                  <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.stripeCustomers","Stripe Customers")}</p>
                  <p className="text-2xl font-bold text-[#E0D8C8]">{funnelData.stripeCustomers}</p>
                </div>
                <div>
                  <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.activeSubscriptions","Active Subscriptions")}</p>
                  <p className="text-2xl font-bold text-[#E0D8C8]">{funnelData.activeSubscriptions}</p>
                </div>
                <div>
                  <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.entitlementsApplied","Entitlements Applied")}</p>
                  <p className="text-2xl font-bold text-green-500">{funnelData.entitlementsApplied}</p>
                </div>
              </div>
              {funnelData.dropoffs?.length > 0 && (
                <div>
                  <p className="text-sm text-[#E0D8C8]/70 mb-2">{t("subscriptionSupport.dropoffReasons","Drop-off Reasons")}:</p>
                  <div className="space-y-1">
                    {funnelData.dropoffs.map((reason, idx) => (
                      <p key={idx} className="text-sm text-red-400">{reason}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[#E0D8C8]/70">{t("common.loading")}</p>
          )}
        </CardContent>
      </Card>

      {/* Bulk Update Tool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("subscriptionSupport.bulkUpdateEntitlements","Bulk Update Active Entitlements")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t("subscriptionSupport.bulkUpdateDescription","Updates all users with active subscriptions to match their subscription tier. Fixes nested data and missing entitlement fields.")}
            </AlertDescription>
          </Alert>
          <Button onClick={() => setShowBulkConfirm(true)} disabled={bulkLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${bulkLoading ? "animate-spin" : ""}`} />
            {bulkLoading ? t("subscriptionSupport.updating","Updating...") : t("subscriptionSupport.runBulkUpdate","Run Bulk Update")}
          </Button>
          {bulkResult && (
            <div className="p-4 bg-[#1a2c42] rounded-lg space-y-2">
              <p className="text-[#E0D8C8] font-medium">{t("subscriptionSupport.results","Results")}:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[#E0D8C8]/70">{t("subscriptionSupport.totalActive","Total Active")}: </span>
                  <span className="text-[#E0D8C8]">{bulkResult.summary.totalActiveSubs}</span>
                </div>
                <div>
                  <span className="text-[#E0D8C8]/70">{t("subscriptionSupport.updated","Updated")}: </span>
                  <span className="text-green-500">{bulkResult.summary.updated}</span>
                </div>
                <div>
                  <span className="text-[#E0D8C8]/70">{t("subscriptionSupport.errors","Errors")}: </span>
                  <span className="text-red-500">{bulkResult.summary.errors}</span>
                </div>
                <div>
                  <span className="text-[#E0D8C8]/70">{t("subscriptionSupport.skipped","Skipped")}: </span>
                  <span className="text-[#E0D8C8]/70">{bulkResult.summary.skipped}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual User Update Tool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t("subscriptionSupport.updateIndividualUser","Update Individual User Entitlement")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userEmail">{t("subscriptionSupport.userEmail","User Email")}</Label>
            <Input
              id="userEmail"
              type="email"
              placeholder={t("subscriptionSupport.userEmailPlaceholder","user@example.com")}
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userTier">{t("subscriptionSupport.subscriptionTier","Subscription Tier")}</Label>
            <Select value={userTier} onValueChange={setUserTier}>
              <SelectTrigger id="userTier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">{t("subscriptionSupport.free","Free")}</SelectItem>
                <SelectItem value="premium">{t("subscriptionSupport.premium","Premium")}</SelectItem>
                <SelectItem value="pro">{t("subscriptionSupport.pro","Pro")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="forceOverride"
              checked={forceOverride}
              onChange={(e) => setForceOverride(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="forceOverride" className="text-sm text-[#E0D8C8]/70">
              {t("subscriptionSupport.forceOverride","Force Override (ignore validation errors)")}
            </Label>
          </div>
          <Button onClick={() => setShowUserConfirm(true)} disabled={userLoading}>
            {userLoading ? t("subscriptionSupport.updating","Updating...") : t("subscriptionSupport.updateUser","Update User")}
          </Button>
        </CardContent>
      </Card>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          {t("subscriptionSupport.logoutNote","Users must log out and back in after entitlement updates to see changes.")}
        </AlertDescription>
      </Alert>

      {/* Bulk Update Confirmation Dialog */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("subscriptionSupport.confirmBulkUpdate","Confirm Bulk Update")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("subscriptionSupport.bulkUpdateConfirmDesc","This will update all users with active subscriptions to match their subscription tier. This operation may take a few moments. Are you sure you want to continue?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={bulkUpdateEntitlements}>
              {t("subscriptionSupport.confirmUpdate","Confirm Update")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Individual User Update Confirmation Dialog */}
      <AlertDialog open={showUserConfirm} onOpenChange={setShowUserConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("subscriptionSupport.confirmUserUpdate","Confirm User Update")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("subscriptionSupport.updateEntitlementFor","Update entitlement for")} <strong>{userEmail}</strong> {t("common.to")} <strong>{userTier}</strong>?
              {forceOverride && (
                <div className="mt-2 text-yellow-500">
                  {t("subscriptionSupport.forceOverrideWarning","⚠️ Force Override is enabled - validation errors will be ignored")}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={updateUserEntitlement}>
              {t("subscriptionSupport.confirmUpdate","Confirm Update")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}