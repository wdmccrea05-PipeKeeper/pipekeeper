import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { base44 } from "@/api/base44Client";
import { AlertCircle, CheckCircle, RefreshCw, Settings, Users, User } from "lucide-react";
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
  const [userTier, setUserTier] = useState("pro");
  const [userLoading, setUserLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showUserConfirm, setShowUserConfirm] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);

  // HOOKS FIRST - All hooks must be declared at component top level
  useEffect(() => {
    loadHealth();
    loadFunnel();
    loadDrift();
  }, [timeWindow]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t("subscriptionSupport.adminAccessRequired")}</AlertDescription>
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
        toast.warning(t("subscriptionSupport.updatedWithErrors", {updated: data.summary.updated, errors: data.summary.errors}));
      } else {
        toast.success(t("subscriptionSupport.successfullyUpdated", {updated: data.summary.updated}));
      }
    } catch (error) {
      console.error("Bulk update failed:", error);
      const errorMsg = error?.response?.data?.error || error.message || t("subscriptionSupport.unknownError");
      toast.error(t("subscriptionSupport.bulkUpdateFailed", {error: errorMsg}));
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
      toast.error(t("subscriptionSupport.pleaseEnterEmail"));
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
        toast.success(t("subscriptionSupport.userUpdatedSuccess", {email: data.email, before: data.before, after: data.after}));
        setUserEmail("");
        setForceOverride(false);
      } else {
        toast.error(data.error || t("subscriptionSupport.updateFailed"));
      }
    } catch (error) {
      console.error("User update failed:", error);
      const errorMsg = error?.response?.data?.error || error.message || t("subscriptionSupport.unknownError");
      
      if (forceOverride) {
        toast.error(t("subscriptionSupport.forceUpdateFailed", {error: errorMsg}));
      } else {
        toast.error(t("subscriptionSupport.updateFailedTryForce", {error: errorMsg}));
      }
    } finally {
      setUserLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#E0D8C8]">{t("subscriptionSupport.title")}</h1>
        <Button onClick={() => { loadHealth(); loadFunnel(); loadDrift(); }} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </Button>
      </div>

      {/* Integration Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("subscriptionSupport.integrationHealth")}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={timeWindow === "24h" ? "default" : "outline"}
                onClick={() => setTimeWindow("24h")}
              >
                {t("subscriptionSupport.timeWindow24h")}
              </Button>
              <Button
                size="sm"
                variant={timeWindow === "7d" ? "default" : "outline"}
                onClick={() => setTimeWindow("7d")}
              >
                {t("subscriptionSupport.timeWindow7d")}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.stripeWebhooks")}</p>
                <p className="text-2xl font-bold text-[#E0D8C8]">{healthData.stripeWebhooks}</p>
              </div>
              <div>
                <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.cloudflareCheckouts")}</p>
                <p className="text-2xl font-bold text-[#E0D8C8]">{healthData.cloudflareCheckouts}</p>
              </div>
              <div>
                <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.successful")}</p>
                <p className="text-2xl font-bold text-green-500">{healthData.successfulUpdates}</p>
              </div>
              <div>
                <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.failed")}</p>
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
          <CardTitle>{t("subscriptionSupport.entitlementDriftDetection")}</CardTitle>
        </CardHeader>
        <CardContent>
          {driftData.length === 0 ? (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              <span>{t("subscriptionSupport.noDriftDetected")}</span>
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
          <CardTitle>{t("subscriptionSupport.subscriptionFunnel")}</CardTitle>
        </CardHeader>
        <CardContent>
          {funnelData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.cloudflareCheckouts")}</p>
                  <p className="text-2xl font-bold text-[#E0D8C8]">{funnelData.cloudflareCheckouts}</p>
                </div>
                <div>
                  <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.stripeCustomers")}</p>
                  <p className="text-2xl font-bold text-[#E0D8C8]">{funnelData.stripeCustomers}</p>
                </div>
                <div>
                  <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.activeSubscriptions")}</p>
                  <p className="text-2xl font-bold text-[#E0D8C8]">{funnelData.activeSubscriptions}</p>
                </div>
                <div>
                  <p className="text-sm text-[#E0D8C8]/70">{t("subscriptionSupport.entitlementsApplied")}</p>
                  <p className="text-2xl font-bold text-green-500">{funnelData.entitlementsApplied}</p>
                </div>
              </div>
              {funnelData.dropoffs?.length > 0 && (
                <div>
                  <p className="text-sm text-[#E0D8C8]/70 mb-2">{t("subscriptionSupport.dropoffReasons")}:</p>
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
            {t("subscriptionSupport.bulkUpdateEntitlements")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("subscriptionSupport.bulkUpdateDescription")}
            </AlertDescription>
          </Alert>
          <Button onClick={() => setShowBulkConfirm(true)} disabled={bulkLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${bulkLoading ? "animate-spin" : ""}`} />
            {bulkLoading ? t("subscriptionSupport.updating") : t("subscriptionSupport.runBulkUpdate")}
          </Button>
          {bulkResult && (
            <div className="p-4 bg-[#1a2c42] rounded-lg space-y-2">
              <p className="text-[#E0D8C8] font-medium">{t("subscriptionSupport.results")}:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[#E0D8C8]/70">{t("subscriptionSupport.totalActive")}: </span>
                  <span className="text-[#E0D8C8]">{bulkResult.summary.totalActiveSubs}</span>
                </div>
                <div>
                  <span className="text-[#E0D8C8]/70">{t("subscriptionSupport.updated")}: </span>
                  <span className="text-green-500">{bulkResult.summary.updated}</span>
                </div>
                <div>
                  <span className="text-[#E0D8C8]/70">{t("subscriptionSupport.errors")}: </span>
                  <span className="text-red-500">{bulkResult.summary.errors}</span>
                </div>
                <div>
                  <span className="text-[#E0D8C8]/70">{t("subscriptionSupport.skipped")}: </span>
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
            {t("subscriptionSupport.updateIndividualUser")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userEmail">{t("subscriptionSupport.userEmail")}</Label>
            <Input
              id="userEmail"
              type="email"
              placeholder={t("subscriptionSupport.userEmailPlaceholder")}
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userTier">{t("subscriptionSupport.subscriptionTier")}</Label>
            <Select value={userTier} onValueChange={setUserTier}>
              <SelectTrigger id="userTier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">{t("subscriptionSupport.free")}</SelectItem>
                <SelectItem value="pro">{t("subscriptionSupport.pro")}</SelectItem>
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
              {t("subscriptionSupport.forceOverride")}
            </Label>
          </div>
          <Button onClick={() => setShowUserConfirm(true)} disabled={userLoading}>
            {userLoading ? t("subscriptionSupport.updating") : t("subscriptionSupport.updateUser")}
          </Button>
        </CardContent>
      </Card>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          {t("subscriptionSupport.logoutNote")}
        </AlertDescription>
      </Alert>

      {/* Bulk Update Confirmation Dialog */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("subscriptionSupport.confirmBulkUpdate")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("subscriptionSupport.bulkUpdateConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={bulkUpdateEntitlements}>
              {t("subscriptionSupport.confirmUpdate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Individual User Update Confirmation Dialog */}
      <AlertDialog open={showUserConfirm} onOpenChange={setShowUserConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("subscriptionSupport.confirmUserUpdate")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("subscriptionSupport.updateEntitlementFor")} <strong>{userEmail}</strong> {t("common.to")} <strong>{userTier}</strong>?
              {forceOverride && (
                <div className="mt-2 text-yellow-500">
                  {t("subscriptionSupport.forceOverrideWarning")}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={updateUserEntitlement}>
              {t("subscriptionSupport.confirmUpdate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}