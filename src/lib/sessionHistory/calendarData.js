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

  // Sort each day's sessions oldest→newest
  Object.keys(byDate).forEach((dateKey) => {
    byDate[dateKey].sort((a, b) => {
      const da = a?.date || a?.created_date || '';
      const db = b?.date || b?.created_date || '';
      return da < db ? -1 : da > db ? 1 : 0;
    });
  });

  const highlightedDates = Object.keys(byDate)
    .map((dateKey) => new Date(`${dateKey}T12:00:00`))
    .filter((date) => !Number.isNaN(date.getTime()));

  return { byDate, highlightedDates, filtered };
}

