import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Search, RefreshCw, Filter } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

export default function SubscriptionEventsLog() {
  const { user, isAdmin } = useCurrentUser();
  const [searchEmail, setSearchEmail] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [successFilter, setSuccessFilter] = useState("all");
  const [limit, setLimit] = useState(100);

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["subscription-events", searchEmail, sourceFilter, successFilter, limit],
    queryFn: async () => {
      let allEvents = await base44.entities.SubscriptionIntegrationEvent.list("-created_date", limit);
      
      // Apply filters
      if (searchEmail) {
        allEvents = allEvents.filter(e => e.email?.toLowerCase().includes(searchEmail.toLowerCase()));
      }
      if (sourceFilter !== "all") {
        allEvents = allEvents.filter(e => e.event_source === sourceFilter);
      }
      if (successFilter !== "all") {
        const successBool = successFilter === "success";
        allEvents = allEvents.filter(e => e.success === successBool);
      }
      
      return allEvents;
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
          <h1 className="text-3xl font-bold text-[#E0D8C8] mb-2">Subscription Events Log</h1>
          <p className="text-[#E0D8C8]/70">Audit trail of all subscription integration events</p>
        </div>

        {/* Filters */}
        <Card className="bg-[#223447] border-[#E0D8C8]/15 mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#E0D8C8]" />
              <CardTitle className="text-[#E0D8C8]">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#E0D8C8]/50" />
                <Input
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Event Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="cloudflare">Cloudflare</SelectItem>
                  <SelectItem value="app">App</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={successFilter} onValueChange={setSuccessFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 events</SelectItem>
                    <SelectItem value="100">100 events</SelectItem>
                    <SelectItem value="500">500 events</SelectItem>
                    <SelectItem value="1000">1000 events</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card className="bg-[#223447] border-[#E0D8C8]/15">
          <CardContent className="p-6">
            {isLoading ? (
              <p className="text-center text-[#E0D8C8]/50 py-8">Loading events...</p>
            ) : !events || events.length === 0 ? (
              <p className="text-center text-[#E0D8C8]/50 py-8">No events found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E0D8C8]/10">
                      <th className="text-left py-3 px-4 text-[#E0D8C8]/80 font-semibold">Timestamp</th>
                      <th className="text-left py-3 px-4 text-[#E0D8C8]/80 font-semibold">Source</th>
                      <th className="text-left py-3 px-4 text-[#E0D8C8]/80 font-semibold">Event Type</th>
                      <th className="text-left py-3 px-4 text-[#E0D8C8]/80 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-[#E0D8C8]/80 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 text-[#E0D8C8]/80 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-b border-[#E0D8C8]/5 hover:bg-[#1A2B3A]/50">
                        <td className="py-3 px-4 text-[#E0D8C8]/70 text-xs">
                          {new Date(event.created_date).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">
                            {event.event_source}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-[#E0D8C8]/70 text-xs font-mono">
                          {event.event_type}
                        </td>
                        <td className="py-3 px-4 text-[#E0D8C8]/70 text-xs">
                          {event.email || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={event.success ? "success" : "destructive"} className="text-xs">
                            {event.success ? "Success" : "Error"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-[#E0D8C8]/60 text-xs">
                          {event.error || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}