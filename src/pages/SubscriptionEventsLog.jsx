import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { base44 } from "@/api/base44Client";
import { AlertCircle, CheckCircle, XCircle, Search } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function SubscriptionEventsLog() {
  const { isAdmin } = useCurrentUser();
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterSuccess, setFilterSuccess] = useState("all");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const allEvents = await base44.entities.SubscriptionIntegrationEvent.list("-created_date", 100);
      setEvents(allEvents);
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t("admin.accessRequired")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredEvents = events.filter((event) => {
    const emailMatch = !searchEmail || event.email?.toLowerCase().includes(searchEmail.toLowerCase());
    const sourceMatch = filterSource === "all" || event.event_source === filterSource;
    const successMatch = filterSuccess === "all" || 
      (filterSuccess === "success" && event.success) ||
      (filterSuccess === "error" && !event.success);
    return emailMatch && sourceMatch && successMatch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#E0D8C8]">{t("admin.subscriptionEventsLog")}</h1>
        <Button onClick={loadEvents} disabled={loading}>
          {t("admin.refresh")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-[#E0D8C8]/70 mb-2 block">{t("admin.searchEmail")}</label>
              <Input
                placeholder={t("admin.userEmailPlaceholder", "user@example.com")}
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-[#E0D8C8]/70 mb-2 block">{t("admin.source")}</label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#1a2c42] border border-white/10 text-[#E0D8C8]"
              >
                <option value="all">{t("admin.allSources")}</option>
                <option value="stripe">Stripe</option>
                <option value="cloudflare">Cloudflare</option>
                <option value="app">App</option>
                <option value="admin">{t("layout.admin")}</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-[#E0D8C8]/70 mb-2 block">{t("admin.status")}</label>
              <select
                value={filterSuccess}
                onChange={(e) => setFilterSuccess(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#1a2c42] border border-white/10 text-[#E0D8C8]"
              >
                <option value="all">All</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Events ({filteredEvents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-[#E0D8C8]/70">Loading events...</p>
          ) : filteredEvents.length === 0 ? (
            <p className="text-[#E0D8C8]/70">No events found</p>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-4 bg-[#1a2c42] rounded-lg border border-white/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {event.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-medium text-[#E0D8C8]">{event.event_type}</span>
                    </div>
                    <Badge variant={event.success ? "success" : "destructive"}>
                      {event.event_source}
                    </Badge>
                  </div>
                  
                  <div className="text-sm space-y-1 text-[#E0D8C8]/70">
                    {event.email && <p>Email: {event.email}</p>}
                    {event.user_id && <p>User ID: {event.user_id}</p>}
                    {event.stripe_customer_id && (
                      <p>Stripe Customer: {event.stripe_customer_id}</p>
                    )}
                    {event.error && (
                      <p className="text-red-400">Error: {event.error}</p>
                    )}
                    <p className="text-xs text-[#E0D8C8]/50">
                      {new Date(event.created_date).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}