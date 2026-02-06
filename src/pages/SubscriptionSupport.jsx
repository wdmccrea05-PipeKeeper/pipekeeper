import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Activity, TrendingUp, AlertTriangle, RefreshCw, ChevronRight, Zap } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ReconcileEntitlementsCard from "@/components/admin/ReconcileEntitlementsCard";
import ReconcileEntitlementsBatchCard from "@/components/admin/ReconcileEntitlementsBatchCard";
import RepairStripeByEmailCard from "@/components/admin/RepairStripeByEmailCard";
import StripeDiagnosticsCard from "@/components/admin/StripeDiagnosticsCard";
import SubscriptionMigrationCard from "@/components/admin/SubscriptionMigrationCard";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function SubscriptionSupport() {
  const { user, isAdmin } = useCurrentUser();
  const [timeWindow, setTimeWindow] = useState("24h");

  const { data: integrationHealth, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ["integration-health", timeWindow],
    queryFn: async () => {
      const response = await base44.functions.invoke("getIntegrationHealth", { timeWindow });
      return response.data;
    },
    enabled: isAdmin,
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const { data: driftReport, isLoading: driftLoading, refetch: refetchDrift } = useQuery({
    queryKey: ["entitlement-drift"],
    queryFn: async () => {
      const drifts = await base44.entities.EntitlementDriftCache.list("-detected_at", 100);
      return drifts.filter(d => !d.resolved);
    },
    enabled: isAdmin,
  });

  const { data: funnelMetrics, isLoading: funnelLoading } = useQuery({
    queryKey: ["funnel-metrics"],
    queryFn: async () => {
      const response = await base44.functions.invoke("getFunnelMetrics", {});
      return response.data;
    },
    enabled: isAdmin,
  });

  const { data: recentEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ["recent-subscription-events"],
    queryFn: async () => {
      const events = await base44.entities.SubscriptionIntegrationEvent.list("-created_date", 20);
      return events;
    },
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A] p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-stone-500">Only administrators can access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#E0D8C8] mb-2">Subscription Support</h1>
          <p className="text-[#E0D8C8]/70">Diagnostics, reconciliation, and subscription management tools</p>
        </div>

        {/* Integration Health */}
        <Card className="bg-[#223447] border-[#E0D8C8]/15 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-[#E0D8C8]">Integration Health</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Tabs value={timeWindow} onValueChange={setTimeWindow} className="w-auto">
                  <TabsList className="bg-[#1A2B3A]">
                    <TabsTrigger value="24h">24h</TabsTrigger>
                    <TabsTrigger value="7d">7d</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button size="sm" variant="outline" onClick={() => refetchHealth()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <CardDescription className="text-[#E0D8C8]/60">
              Subscription integration event monitoring (Cloudflare placeholders - future implementation)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <p className="text-[#E0D8C8]/50">Loading...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-[#1A2B3A] rounded-lg border border-[#E0D8C8]/10">
                  <p className="text-xs text-[#E0D8C8]/60 mb-1">Stripe Webhooks</p>
                  <p className="text-2xl font-bold text-blue-400">{integrationHealth?.stripeWebhooks || 0}</p>
                </div>
                <div className="p-4 bg-[#1A2B3A] rounded-lg border border-[#E0D8C8]/10">
                  <p className="text-xs text-[#E0D8C8]/60 mb-1">Cloudflare Checkouts</p>
                  <p className="text-2xl font-bold text-purple-400">{integrationHealth?.cloudflareCheckouts || 0}</p>
                  <p className="text-xs text-amber-400 mt-1">Placeholder</p>
                </div>
                <div className="p-4 bg-[#1A2B3A] rounded-lg border border-green-500/20">
                  <p className="text-xs text-[#E0D8C8]/60 mb-1">Successful Updates</p>
                  <p className="text-2xl font-bold text-green-400">{integrationHealth?.successfulUpdates || 0}</p>
                </div>
                <div className="p-4 bg-[#1A2B3A] rounded-lg border border-red-500/20">
                  <p className="text-xs text-[#E0D8C8]/60 mb-1">Failed Updates</p>
                  <p className="text-2xl font-bold text-red-400">{integrationHealth?.failedUpdates || 0}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drift Detection */}
        <Card className="bg-[#223447] border-[#E0D8C8]/15 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <CardTitle className="text-[#E0D8C8]">Drift Detection</CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={() => refetchDrift()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription className="text-[#E0D8C8]/60">
              Users with entitlement mismatches or stale sync state (auto-computed daily)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {driftLoading ? (
              <p className="text-[#E0D8C8]/50">Loading...</p>
            ) : !driftReport || driftReport.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#E0D8C8]/50">No drift detected - all users in sync ✓</p>
              </div>
            ) : (
              <div className="space-y-3">
                {driftReport.slice(0, 10).map((drift) => (
                  <div key={drift.id} className="p-4 bg-[#1A2B3A] rounded-lg border border-[#E0D8C8]/10">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-[#E0D8C8]">{drift.user_email}</p>
                        <p className="text-xs text-[#E0D8C8]/50">ID: {drift.user_id}</p>
                      </div>
                      <Badge variant={drift.severity === "critical" ? "destructive" : "warning"}>
                        {drift.drift_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#E0D8C8]/70 mb-3">{drift.details}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={async () => {
                        await base44.functions.invoke("reconcileEntitlementsForUser", { email: drift.user_email });
                        refetchDrift();
                      }}>
                        Reconcile
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        window.open(createPageUrl(`SubscriptionEventsLog?email=${drift.user_email}`), "_blank");
                      }}>
                        View Events
                      </Button>
                    </div>
                  </div>
                ))}
                {driftReport.length > 10 && (
                  <p className="text-center text-[#E0D8C8]/50 text-sm">
                    ...and {driftReport.length - 10} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funnel Monitoring */}
        <Card className="bg-[#223447] border-[#E0D8C8]/15 mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <CardTitle className="text-[#E0D8C8]">Funnel Monitoring (Last 7 Days)</CardTitle>
            </div>
            <CardDescription className="text-[#E0D8C8]/60">
              Subscription flow from checkout to entitlement (Cloudflare placeholders)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {funnelLoading ? (
              <p className="text-[#E0D8C8]/50">Loading...</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 p-4 bg-purple-500/20 rounded-lg border border-purple-500/30">
                    <p className="text-xs text-purple-300 mb-1">Cloudflare Checkouts</p>
                    <p className="text-2xl font-bold text-purple-400">{funnelMetrics?.cloudflareCheckouts || 0}</p>
                    <p className="text-xs text-amber-400 mt-1">Placeholder</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-[#E0D8C8]/30" />
                  <div className="flex-1 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
                    <p className="text-xs text-blue-300 mb-1">Stripe Customers</p>
                    <p className="text-2xl font-bold text-blue-400">{funnelMetrics?.stripeCustomers || 0}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-[#E0D8C8]/30" />
                  <div className="flex-1 p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                    <p className="text-xs text-green-300 mb-1">Active Subscriptions</p>
                    <p className="text-2xl font-bold text-green-400">{funnelMetrics?.activeSubscriptions || 0}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-[#E0D8C8]/30" />
                  <div className="flex-1 p-4 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                    <p className="text-xs text-emerald-300 mb-1">Entitlements Applied</p>
                    <p className="text-2xl font-bold text-emerald-400">{funnelMetrics?.entitlementsApplied || 0}</p>
                  </div>
                </div>
                {funnelMetrics?.dropoffs && funnelMetrics.dropoffs.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <p className="text-sm font-semibold text-amber-400 mb-2">Drop-off Reasons:</p>
                    <div className="space-y-1">
                      {funnelMetrics.dropoffs.map((d, i) => (
                        <p key={i} className="text-xs text-[#E0D8C8]/70">• {d}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tools Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#E0D8C8] mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Subscription Tools
          </h2>
          
          <div className="space-y-4">
            <ReconcileEntitlementsCard />
            <RepairStripeByEmailCard />
            <ReconcileEntitlementsBatchCard />
            <StripeDiagnosticsCard />
          </div>
        </div>

        {/* Advanced/Deprecated Tools */}
        <Accordion type="single" collapsible className="mb-6">
          <AccordionItem value="advanced" className="border border-amber-500/30 rounded-lg px-4 bg-amber-500/5">
            <AccordionTrigger className="text-[#E0D8C8] hover:text-amber-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Advanced / Deprecated Tools (Use with Caution)
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <SubscriptionMigrationCard />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Recent Events Preview */}
        <Card className="bg-[#223447] border-[#E0D8C8]/15">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#E0D8C8]">Recent Events (Last 20)</CardTitle>
              <Button size="sm" variant="outline" onClick={() => window.open(createPageUrl("SubscriptionEventsLog"), "_blank")}>
                View Full Log
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <p className="text-[#E0D8C8]/50">Loading...</p>
            ) : !recentEvents || recentEvents.length === 0 ? (
              <p className="text-center text-[#E0D8C8]/50 py-4">No events recorded yet</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentEvents.map((event) => (
                  <div key={event.id} className="p-3 bg-[#1A2B3A] rounded border border-[#E0D8C8]/10 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={event.success ? "success" : "destructive"} className="text-xs">
                          {event.event_source}
                        </Badge>
                        <span className="text-[#E0D8C8]/70 text-xs">{event.event_type}</span>
                      </div>
                      <span className="text-[#E0D8C8]/50 text-xs">
                        {new Date(event.created_date).toLocaleString()}
                      </span>
                    </div>
                    {event.email && (
                      <p className="text-[#E0D8C8]/60 text-xs">Email: {event.email}</p>
                    )}
                    {!event.success && event.error && (
                      <p className="text-red-400 text-xs mt-1">Error: {event.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}