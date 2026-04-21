import { toLocalDateYmd } from "@/components/utils/schemaCompatibility";

export function buildSessionCalendarData(rows = [], module = "all") {
  const filtered = (rows || []).filter((row) => {
    if (module === "all") return true;
    return row?.moduleType === module;
  });

  const byDate = filtered.reduce((acc, row) => {
    const dateKey = toLocalDateYmd(row?.date || row?.created_date || new Date());
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(row);
    return acc;
  }, {});

  const highlightedDates = Object.keys(byDate)
    .map((dateKey) => new Date(`${dateKey}T12:00:00`))
    .filter((date) => !Number.isNaN(date.getTime()));

  return { byDate, highlightedDates, filtered };
}

