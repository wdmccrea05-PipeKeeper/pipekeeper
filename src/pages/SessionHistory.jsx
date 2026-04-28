import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { canUserAccessModule } from "@/components/utils/moduleReleaseState";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { toLocalDateYmd } from "@/components/utils/schemaCompatibility";
import { buildSessionCalendarData } from "@/lib/sessionHistory/calendarData";
import { sortByLabel } from "@/lib/sorting/alphabetical";
import { X, Star } from "lucide-react";

const BASE_MODULE_FILTERS = ["all", "pipe", "whiskey", "cigar"];

function normalizeSessions({ smokingLogs = [], tastingLogs = [], cigarSessions = [], wineTastings = [] }) {
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

  const wineRows = (wineTastings || []).map((tasting) => ({
    id: `wine_${tasting.id}`,
    moduleType: "wine",
    date: tasting.date,
    itemLabel: tasting.wine_name || "Wine tasting",
    rating: tasting.rating ?? null,
    notes: tasting.notes || "",
  }));

  return [...pipeRows, ...whiskeyRows, ...cigarRows, ...wineRows];
}

export default function SessionHistory() {
  const { t } = useTranslation();
  const { user, winekeeper_paid, isAdmin } = useCurrentUser();
  const wineEnabled = winekeeper_paid || isAdmin || canUserAccessModule('winekeeper', user, true);
  const MODULE_FILTERS = wineEnabled ? [...BASE_MODULE_FILTERS, "wine"] : BASE_MODULE_FILTERS;
  const [moduleFilter, setModuleFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(toLocalDateYmd(new Date()));
  const [selectedSession, setSelectedSession] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["session-history-calendar", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const [smokingLogs, tastingLogs, cigarSessions, wineTastings] = await Promise.all([
        base44.entities.SmokingLog.filter({ created_by: user.email }, "-date", 1000).catch(() => []),
        base44.entities.TastingLog.filter({ created_by: user.email }, "-tasting_date", 1000).catch(() => []),
        base44.entities.CigarSession.filter({ created_by: user.email }, "-date", 1000).catch(() => []),
        wineEnabled
          ? base44.entities.WineTasting.filter({ created_by: user.email }, "-date", 1000).catch(() => [])
          : Promise.resolve([]),
      ]);
      return { smokingLogs, tastingLogs, cigarSessions, wineTastings };
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
                <button
                  key={row.id}
                  onClick={() => setSelectedSession(row)}
                  className="w-full text-left rounded-xl p-3 border border-[rgba(180,140,75,0.2)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(180,140,75,0.08)] hover:border-[rgba(180,140,75,0.45)] transition-colors cursor-pointer"
                >
                  <p className="text-sm font-semibold">{row.itemLabel}</p>
                  <p className="text-xs text-[#D8C7A6]/70 mt-1">
                    {t(`sessionHistory.module.${row.moduleType}`, row.moduleType)}
                    {row.rating != null ? ` • ★ ${row.rating}` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-[rgba(180,140,75,0.35)] bg-[#1d1511] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedSession(null)}
              className="absolute top-4 right-4 text-[#D8C7A6]/60 hover:text-[#D8C7A6] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-1 text-xs uppercase tracking-widest text-[#B48C4B]">
              {t(`sessionHistory.module.${selectedSession.moduleType}`, selectedSession.moduleType)}
            </div>

            <h3 className="text-lg font-bold text-[#F5F1E7] pr-6">{selectedSession.itemLabel}</h3>

            <div className="mt-1 text-sm text-[#D8C7A6]/70">{selectedSession.date}</div>

            {selectedSession.rating != null && (
              <div className="flex items-center gap-1 mt-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4"
                    fill={i < selectedSession.rating ? "#B48C4B" : "transparent"}
                    stroke={i < selectedSession.rating ? "#B48C4B" : "#D8C7A6"}
                    strokeWidth={1.5}
                  />
                ))}
                <span className="ml-1 text-sm text-[#D8C7A6]/70">{selectedSession.rating} / 5</span>
              </div>
            )}

            {selectedSession.notes ? (
              <div className="mt-4 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(180,140,75,0.15)] p-3">
                <p className="text-xs uppercase tracking-widest text-[#B48C4B] mb-1">
                  {t("sessionHistory.notes", "Notes")}
                </p>
                <p className="text-sm text-[#E0D8C8] whitespace-pre-wrap">{selectedSession.notes}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#D8C7A6]/50 italic">
                {t("sessionHistory.noNotes", "No notes recorded.")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}