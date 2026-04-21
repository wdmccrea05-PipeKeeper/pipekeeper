import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { toLocalDateYmd } from "@/components/utils/schemaCompatibility";
import { buildSessionCalendarData } from "@/lib/sessionHistory/calendarData";
import { sortByLabel } from "@/lib/sorting/alphabetical";

const MODULE_FILTERS = ["all", "pipe", "whiskey", "cigar"];

function normalizeSessions({ smokingLogs = [], tastingLogs = [], cigarSessions = [] }) {
  const pipeRows = (smokingLogs || []).map((log) => ({
    id: `pipe_${log.id}`,
    moduleType: "pipe",
    date: log.date,
    itemLabel: [log.pipe_name, log.blend_name].filter(Boolean).join(" • ") || log.pipe_name || "Pipe session",
    rating: null,
    notes: log.notes || "",
  }));

  const whiskeyRows = (tastingLogs || []).map((log) => ({
    id: `whiskey_${log.id}`,
    moduleType: "whiskey",
    date: log.tasting_date,
    itemLabel: log.bottle_name || "Whiskey tasting",
    rating: log.rating ?? null,
    notes: log.notes || "",
  }));

  const cigarRows = (cigarSessions || []).map((session) => ({
    id: `cigar_${session.id}`,
    moduleType: "cigar",
    date: session.date,
    itemLabel:
      session.cigar_name ||
      [session.external_cigar_brand, session.external_cigar_name].filter(Boolean).join(" ") ||
      "Cigar session",
    rating: session.overall_enjoyment ?? null,
    notes: session.notes || "",
  }));

  return [...pipeRows, ...whiskeyRows, ...cigarRows];
}

export default function SessionHistory() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const [moduleFilter, setModuleFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(toLocalDateYmd(new Date()));

  const { data, isLoading } = useQuery({
    queryKey: ["session-history-calendar", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const [smokingLogs, tastingLogs, cigarSessions] = await Promise.all([
        base44.entities.SmokingLog.filter({ created_by: user.email }, "-date", 1000).catch(() => []),
        base44.entities.TastingLog.filter({ created_by: user.email }, "-tasting_date", 1000).catch(() => []),
        base44.entities.CigarSession.filter({ created_by: user.email }, "-date", 1000).catch(() => []),
      ]);
      return { smokingLogs, tastingLogs, cigarSessions };
    },
  });

  const sessions = useMemo(() => normalizeSessions(data || {}), [data]);
  const { byDate, highlightedDates } = useMemo(
    () => buildSessionCalendarData(sessions, moduleFilter),
    [sessions, moduleFilter]
  );
  const selectedDayRows = useMemo(
    () => sortByLabel(byDate[selectedDate] || [], (row) => `${row?.moduleType || ""} ${row?.itemLabel || ""}`),
    [byDate, selectedDate]
  );

  return (
    <div className="space-y-5 p-6 md:p-8 text-[#F5F1E7]">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>
          {t("sessionHistory.title", "Session History")}
        </h1>
        <p className="text-sm text-[#D8C7A6]/75 mt-1">
          {t("sessionHistory.subtitle", "Browse past sessions by calendar day across modules.")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODULE_FILTERS.map((key) => (
          <Button
            key={key}
            size="sm"
            variant={moduleFilter === key ? "default" : "outline"}
            onClick={() => setModuleFilter(key)}
          >
            {t(`sessionHistory.filter.${key}`, key === "all" ? "All" : key[0].toUpperCase() + key.slice(1))}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-[rgba(180,140,75,0.2)] bg-[rgba(25,17,11,0.7)] p-3">
          <Calendar
            mode="single"
            selected={new Date(`${selectedDate}T12:00:00`)}
            onSelect={(date) => {
              if (date) setSelectedDate(toLocalDateYmd(date));
            }}
            modifiers={{ hasSessions: highlightedDates }}
            modifiersClassNames={{
              hasSessions: "ring-1 ring-[#B48C4B] ring-offset-0",
            }}
          />
        </div>

        <div className="rounded-2xl border border-[rgba(180,140,75,0.2)] bg-[rgba(25,17,11,0.7)] p-5">
          <h2 className="text-lg font-semibold mb-3">
            {selectedDate}
          </h2>
          {isLoading ? (
            <p className="text-[#D8C7A6]/75">{t("common.loading", "Loading...")}</p>
          ) : selectedDayRows.length === 0 ? (
            <p className="text-[#D8C7A6]/75">
              {t("sessionHistory.emptyDay", "No sessions logged for this day.")}
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDayRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl p-3 border border-[rgba(180,140,75,0.2)] bg-[rgba(255,255,255,0.03)]"
                >
                  <p className="text-sm font-semibold">{row.itemLabel}</p>
                  <p className="text-xs text-[#D8C7A6]/70 mt-1">
                    {t(`sessionHistory.module.${row.moduleType}`, row.moduleType)}
                    {row.rating != null ? ` • ${t("sessionHistory.rating", "Rating")}: ${row.rating}` : ""}
                  </p>
                  {row.notes ? (
                    <p className="text-sm text-[#E0D8C8] mt-2 whitespace-pre-wrap">{row.notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

