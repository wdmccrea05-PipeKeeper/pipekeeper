import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useTranslation } from "@/components/i18n/safeTranslation";
import NormalizeSubscriptionsCard from "@/components/admin/NormalizeSubscriptionsCard";

export default function AdminSubscriptionTools() {
  const { user, isLoading } = useCurrentUser();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("active");
  const [provider, setProvider] = useState("stripe");
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [moduleFlags, setModuleFlags] = useState({
    pipekeeper: true,
    whiskeykeeper: false,
    cigarkeeper: false,
    winekeeper: false,
  });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [updatedUser, setUpdatedUser] = useState(null);
  const moduleLabelMap = {
    pipekeeper: "PipeKeeper (Public)",
    whiskeykeeper: "WhiskeyKeeper (Public)",
    cigarkeeper: "CigarKeeper (Public)",
    winekeeper: "WineKeeper (Blocked / Not Launched)",
  };

  // Check admin access
  if (!isLoading && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B1320] via-[#112133] to-[#0B1320] flex items-center justify-center">
        <Card className="max-w-md w-full bg-[#1A2B3A] border-[#A35C5C]/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-500 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{t("admin.accessRequired")}</span>
            </div>
            <p className="text-sm text-[#E0D8C8]/70">{t("admin.adminOnly")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGrant = async () => {
    if (!email.trim()) {
      setResult({ ok: false, message: t("admin.pleaseEnterEmail") });
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      setUpdatedUser(null);

      const response = await base44.functions.invoke("adminGrantSubscriptionAccess", {
        email: email.trim(),
        status,
        provider,
        billing_interval: billingInterval,
        modules: Object.keys(moduleFlags).filter((moduleId) => moduleFlags[moduleId]),
        notes: notes.trim(),
      });

      if (response?.data?.ok) {
        setResult({ ok: true, message: t("admin.accessGrantedSuccess") });
        setUpdatedUser(response.data.user);
        setEmail("");
        setStatus("active");
        setProvider("stripe");
        setBillingInterval("monthly");
        setModuleFlags({
          pipekeeper: true,
          whiskeykeeper: false,
          cigarkeeper: false,
          winekeeper: false,
        });
        setNotes("");
      } else {
        setResult({
          ok: false,
          message: response?.data?.message || t("admin.failedToGrantAccess"),
        });
      }
    } catch (err) {
      setResult({ ok: false, message: `Error: ${err?.message || err}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!email.trim()) {
      setResult({ ok: false, message: t("admin.pleaseEnterEmail") });
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      setUpdatedUser(null);

      const response = await base44.functions.invoke("adminRevokeSubscriptionAccess", {
        email: email.trim(),
        notes: notes.trim(),
      });

      if (response?.data?.ok) {
        setResult({ ok: true, message: t("admin.accessRevokedSuccess") });
        setUpdatedUser(response.data.user);
        setEmail("");
        setNotes("");
      } else {
        setResult({
          ok: false,
          message: response?.data?.message || t("admin.failedToRevokeAccess"),
        });
      }
    } catch (err) {
      setResult({ ok: false, message: `Error: ${err?.message || err}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1320] via-[#112133] to-[#0B1320] py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-[#E0D8C8] mb-8">{t("admin.subscriptionAdminTools")}</h1>

        <div className="mb-6">
          <NormalizeSubscriptionsCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#1A2B3A] border-[#A35C5C]/50">
            <CardHeader>
              <CardTitle className="text-[#E0D8C8]">{t("admin.manageUserSubscription")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">{t("admin.emailAddress")}</label>
                <Input
                  placeholder={t("admin.userEmailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8]"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">{t("admin.provider", "Provider")}</label>
                <Select value={provider} onValueChange={setProvider} disabled={loading}>
                  <SelectTrigger className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="apple">iOS</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">{t("admin.status")}</label>
                <Select value={status} onValueChange={setStatus} disabled={loading}>
                  <SelectTrigger className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("admin.active")}</SelectItem>
                    <SelectItem value="trialing">{t("admin.trialing", "Trialing")}</SelectItem>
                    <SelectItem value="past_due">{t("admin.pastDue", "Past Due")}</SelectItem>
                    <SelectItem value="incomplete">{t("admin.incomplete", "Incomplete")}</SelectItem>
                    <SelectItem value="inactive">{t("admin.inactive")}</SelectItem>
                    <SelectItem value="canceled">{t("admin.canceled", "Canceled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">{t("admin.billingInterval", "Billing Interval")}</label>
                <Select value={billingInterval} onValueChange={setBillingInterval} disabled={loading}>
                  <SelectTrigger className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t("admin.monthly", "Monthly")}</SelectItem>
                    <SelectItem value="annual">{t("admin.annual", "Annual")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">{t("admin.activeModules", "Active Modules")}</label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.keys(moduleFlags).map((moduleId) => (
                    <label key={moduleId} className="flex items-center gap-2 text-[#E0D8C8]">
                      <input
                        type="checkbox"
                        checked={moduleFlags[moduleId]}
                        onChange={(e) =>
                          setModuleFlags((prev) => ({ ...prev, [moduleId]: e.target.checked }))
                        }
                        disabled={loading}
                      />
                      <span>{moduleLabelMap[moduleId] || moduleId}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">{t("admin.notes")}</label>
                <Textarea
                  placeholder={t("admin.adminNotes")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8] min-h-20"
                  disabled={loading}
                />
              </div>

              {result && (
                <div
                  className={`p-3 rounded-lg flex items-start gap-2 ${
                    result.ok ? "bg-green-900/20 text-green-200" : "bg-red-900/20 text-red-200"
                  }`}
                >
                  {result.ok ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="text-sm">{result.message}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleGrant}
                  disabled={loading || !email.trim()}
                  className="flex-1 bg-green-700 hover:bg-green-800"
                >
                  {loading ? t("admin.processing") : t("admin.grantAccess")}
                </Button>
                <Button
                  onClick={handleRevoke}
                  disabled={loading || !email.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  {t("admin.revokeAccess")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {updatedUser && (
            <Card className="bg-[#1A2B3A] border-[#A35C5C]/50">
              <CardHeader>
                <CardTitle className="text-[#E0D8C8] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  {t("admin.updatedUser")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-[#E0D8C8]/50">{t("admin.emailLabel")}</p>
                  <p className="text-[#E0D8C8] font-medium">{updatedUser.email}</p>
                </div>
                <div>
                  <p className="text-[#E0D8C8]/50">{t("admin.nameLabel")}</p>
                  <p className="text-[#E0D8C8] font-medium">{updatedUser.full_name}</p>
                </div>
                 <div>
                    <p className="text-[#E0D8C8]/50">{t("admin.hasPaidAccess", "Has Paid Access")}</p>
                    <p className="text-[#E0D8C8] font-medium">{updatedUser.has_paid_access ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-[#E0D8C8]/50">{t("admin.entitlementTier", "Entitlement Tier")}</p>
                    <p className="text-[#E0D8C8] font-medium">{updatedUser.entitlement_tier || t("subscription.free")}</p>
                  </div>
                  <div>
                    <p className="text-[#E0D8C8]/50">{t("admin.subscriptionStatus")}</p>
                    <p className="text-[#E0D8C8] font-medium">{updatedUser.subscription_status || t("admin.inactive")}</p>
                  </div>
                  <div>
                    <p className="text-[#E0D8C8]/50">{t("admin.provider", "Provider")}</p>
                    <p className="text-[#E0D8C8] font-medium">{updatedUser.subscription_provider || t("admin.none")}</p>
                  </div>
                  <div>
                    <p className="text-[#E0D8C8]/50">{t("admin.activeModules", "Active Modules")}</p>
                    <p className="text-[#E0D8C8] font-medium">{updatedUser.paid_modules_csv || "—"}</p>
                  </div>
                <div>
                  <p className="text-[#E0D8C8]/50">{t("admin.updatedAt")}</p>
                  <p className="text-[#E0D8C8] font-medium">
                    {updatedUser.subscriptionUpdatedAt
                      ? new Date(updatedUser.subscriptionUpdatedAt).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}