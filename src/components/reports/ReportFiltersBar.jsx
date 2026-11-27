import React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { CARD_BORDER_GOLD, MODULE_GOLD, TEXT_CAPTION, TEXT_PRIMARY, TEXT_SECONDARY } from "@/lib/theme/tokens";
import { DEFAULT_FILTERS, RANGE_OPTIONS } from "@/lib/reports/reportModel";

const MODULE_LABELS = {
  pipe: "Pipes & tobacco",
  whiskey: "Whiskey",
  cigar: "Cigars",
  wine: "Wines",
};

const RATING_OPTIONS = ["", "3", "4", "4.5"];

function ChipGroup({ label, values, selected, onToggle }) {
  if (values.length === 0) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: TEXT_CAPTION }}>{label}</p>
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
        {values.map((value) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              aria-pressed={active}
              className="px-2.5 py-1 rounded-lg text-xs"
              style={{
                minHeight: 32,
                color: active ? "#140f0c" : TEXT_SECONDARY,
                background: active ? MODULE_GOLD : "transparent",
                border: `1px solid ${active ? MODULE_GOLD : "rgba(180,140,75,0.22)"}`,
              }}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Collection-wide filters shared by every report: modules, date range, storage,
 * maker, category and minimum rating.
 */
export default function ReportFiltersBar({
  filters,
  onChange,
  options,
  availableModules = [],
  showCuratorQuestion = false,
  disabled = false,
  onReset,
}) {
  const { t } = useTranslation();
  const set = (key, value) => onChange({ ...filters, [key]: value });

  const toggleModule = (key) => {
    const next = { ...filters.modules, [key]: !filters.modules?.[key] };
    if (!next.pipe && !next.whiskey && !next.cigar && !next.wine) return;
    set("modules", next);
  };

  const toggleInList = (key, value) => {
    const current = filters[key] || [];
    set(key, current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]);
  };

  return (
    <div className="rounded-2xl p-4 space-y-4" style={{ border: `1px solid ${CARD_BORDER_GOLD}`, background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
          {t("reporting.filters", "Filters")}
        </h2>
        <Button variant="ghost" size="sm" onClick={onReset} disabled={disabled} style={{ minHeight: 40 }}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          {t("reporting.reset", "Reset")}
        </Button>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: TEXT_CAPTION }}>
          {t("reporting.modules", "Modules")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {availableModules.map((module) => {
            const active = Boolean(filters.modules?.[module.key]);
            return (
              <button
                key={module.key}
                type="button"
                onClick={() => toggleModule(module.key)}
                aria-pressed={active}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  minHeight: 36,
                  color: active ? "#140f0c" : TEXT_SECONDARY,
                  background: active ? MODULE_GOLD : "transparent",
                  border: `1px solid ${active ? MODULE_GOLD : "rgba(180,140,75,0.22)"}`,
                }}
              >
                {t(`reporting.module.${module.key}`, MODULE_LABELS[module.key])}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs" style={{ color: TEXT_CAPTION }}>
          {t("reporting.dateRange", "Date range")}
          <select
            aria-label={t("reporting.dateRange", "Date range")}
            className="block w-full mt-1 p-2 rounded-lg bg-[#211810] text-sm"
            value={filters.range}
            onChange={(event) => set("range", event.target.value)}
            disabled={disabled}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>{t(`reporting.range.${option.key}`, option.label)}</option>
            ))}
          </select>
        </label>

        <label className="text-xs" style={{ color: TEXT_CAPTION }}>
          {t("reporting.minRating", "Minimum rating")}
          <select
            aria-label={t("reporting.minRating", "Minimum rating")}
            className="block w-full mt-1 p-2 rounded-lg bg-[#211810] text-sm"
            value={filters.minRating || ""}
            onChange={(event) => set("minRating", event.target.value)}
            disabled={disabled}
          >
            {RATING_OPTIONS.map((value) => (
              <option key={value || "any"} value={value}>{value ? `${value} ★ and above` : t("reporting.anyRating", "Any rating")}</option>
            ))}
          </select>
        </label>
      </div>

      {filters.range === "custom" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs" style={{ color: TEXT_CAPTION }}>
            {t("reporting.from", "From")}
            <Input type="date" className="mt-1" value={filters.startDate || ""} onChange={(event) => set("startDate", event.target.value)} disabled={disabled} />
          </label>
          <label className="text-xs" style={{ color: TEXT_CAPTION }}>
            {t("reporting.to", "To")}
            <Input type="date" className="mt-1" value={filters.endDate || ""} onChange={(event) => set("endDate", event.target.value)} disabled={disabled} />
          </label>
        </div>
      )}

      <ChipGroup
        label={t("reporting.storage", "Storage location")}
        values={(options?.storages || []).map((storage) => storage.name)}
        selected={(filters.storageIds || []).map((id) => options?.storages?.find((storage) => storage.id === id)?.name).filter(Boolean)}
        onToggle={(name) => {
          const storage = (options?.storages || []).find((entry) => entry.name === name);
          if (storage) toggleInList("storageIds", storage.id);
        }}
      />

      <ChipGroup
        label={t("reporting.maker", "Maker / producer")}
        values={options?.makers || []}
        selected={filters.makers || []}
        onToggle={(value) => toggleInList("makers", value)}
      />

      <ChipGroup
        label={t("reporting.category", "Category")}
        values={options?.categories || []}
        selected={filters.categories || []}
        onToggle={(value) => toggleInList("categories", value)}
      />

      {showCuratorQuestion && (
        <label className="block text-xs" style={{ color: TEXT_CAPTION }}>
          {t("reporting.curatorQuestion", "What should Curator summarise?")}
          <Textarea
            className="mt-1"
            rows={3}
            placeholder={t("reporting.curatorPlaceholder", "For example: how well documented is my cellar, and what has no storage location?")}
            value={filters.curatorQuestion || ""}
            onChange={(event) => set("curatorQuestion", event.target.value)}
            disabled={disabled}
          />
        </label>
      )}

      <p className="text-xs" style={{ color: TEXT_CAPTION }}>
        {t("reporting.filterNote", "Filters apply to every report and to every export. Counts are of records, not physical space.")}
      </p>
    </div>
  );
}

export { DEFAULT_FILTERS };