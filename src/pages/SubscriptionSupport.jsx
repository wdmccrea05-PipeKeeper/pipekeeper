import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { base44 } from "@/api/base44Client";
import { AlertCircle, CheckCircle, RefreshCw, Settings, Download } from "lucide-react";

export default function SubscriptionSupport() {
  const { user, isAdmin } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [driftData, setDriftData] = useState([]);
  const [timeWindow, setTimeWindow] = useState("24h");

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

  const exportUsers = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('exportAllUsers', {});
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export users:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadHealth();
    loadFunnel();
    loadDrift();
  }, [timeWindow]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Admin access required</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#E0D8C8]">Subscription Support</h1>
        <div className="flex gap-2">
          <Button onClick={exportUsers} disabled={loading} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Users CSV
          </Button>
          <Button onClick={() => { loadHealth(); loadFunnel(); loadDrift(); }} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Integration Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Integration Health</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={timeWindow === "24h" ? "default" : "outline"}
                onClick={() => setTimeWindow("24h")}
              >
                24h
              </Button>
              <Button
                size="sm"
                variant={timeWindow === "7d" ? "default" : "outline"}
                onClick={() => setTimeWindow("7d")}
              >
                7d
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-[#E0D8C8]/70">Stripe Webhooks</p>
                <p className="text-2xl font-bold text-[#E0D8C8]">{healthData.stripeWebhooks}</p>
              </div>
              <div>
                <p className="text-sm text-[#E0D8C8]/70">Cloudflare Checkouts</p>
                <p className="text-2xl font-bold text-[#E0D8C8]">{healthData.cloudflareCheckouts}</p>
              </div>
              <div>
                <p className="text-sm text-[#E0D8C8]/70">Successful</p>
                <p className="text-2xl font-bold text-green-500">{healthData.successfulUpdates}</p>
              </div>
              <div>
                <p className="text-sm text-[#E0D8C8]/70">Failed</p>
                <p className="text-2xl font-bold text-red-500">{healthData.failedUpdates}</p>
              </div>
            </div>
          ) : (
            <p className="text-[#E0D8C8]/70">Loading...</p>
          )}
        </CardContent>
      </Card>

      {/* Drift Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Entitlement Drift Detection</CardTitle>
        </CardHeader>
        <CardContent>
          {driftData.length === 0 ? (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              <span>No drift detected</span>
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
          <CardTitle>Subscription Funnel (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {funnelData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-[#E0D8C8]/70">Cloudflare Checkouts</p>
                  <p className="text-2xl font-bold text-[#E0D8C8]">{funnelData.cloudflareCheckouts}</p>
                </div>
                <div>
                  <p className="text-sm text-[#E0D8C8]/70">Stripe Customers</p>
                  <p className="text-2xl font-bold text-[#E0D8C8]">{funnelData.stripeCustomers}</p>
                </div>
                <div>
                  <p className="text-sm text-[#E0D8C8]/70">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-[#E0D8C8]">{funnelData.activeSubscriptions}</p>
                </div>
                <div>
                  <p className="text-sm text-[#E0D8C8]/70">Entitlements Applied</p>
                  <p className="text-2xl font-bold text-green-500">{funnelData.entitlementsApplied}</p>
                </div>
              </div>
              {funnelData.dropoffs?.length > 0 && (
                <div>
                  <p className="text-sm text-[#E0D8C8]/70 mb-2">Drop-off Reasons:</p>
                  <div className="space-y-1">
                    {funnelData.dropoffs.map((reason, idx) => (
                      <p key={idx} className="text-sm text-red-400">{reason}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[#E0D8C8]/70">Loading...</p>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          Additional tools and diagnostics will be added here. For now, use the User Report page for detailed subscription management.
        </AlertDescription>
      </Alert>
    </div>
  );
}