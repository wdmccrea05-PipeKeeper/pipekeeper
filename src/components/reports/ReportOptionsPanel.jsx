import React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { CARD_BORDER_GOLD, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_CAPTION, MODULE_GOLD } from "@/lib/theme/tokens";

const MODULE_LABELS = {
  pipe: "Pipes & Blends",
  whiskey: "Whiskey",
  cigar: "Cigars",
  wine: "Wines",
};

const BLEND_COUNTS = [3, 5, 10];

export default function ReportOptionsPanel({
  availableModules = [],
  pipes = [],
  disabled = false,
  options,
  onChange,
  onExportPdf,
  onExportCsv,
  exporting,
  canExport,
}) {
  const { t } = useTranslation();

  const toggleModule = (key) => {
    onChange({ ...options, modules: { ...options.modules, [key]: !options.modules[key] } });
  };

  const setOption = (key, value) => onChange({ ...options, [key]: value });

  return (
    <div
      className="rounded-2xl p-5 space-y-5"
      style={{ background: "linear-gradient(135deg, rgba(42,31,24,0.55), rgba(31,21,16,0.55))", border: `1px solid ${CARD_BORDER_GOLD}` }}
    >
      <div>
        <h2 className="text-base font-semibold mb-1" style={{ color: TEXT_PRIMARY, fontFamily: "'Georgia', serif" }}>
          {t("collectionReports.optionsTitle", "Report settings")}
        </h2>
        <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
          {t("collectionReports.optionsSubtitle", "Choose which modules to include and how much detail to print.")}
        </p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: TEXT_CAPTION }}>
          {t("collectionReports.modules", "Modules")}
        </p>
        <div className="flex flex-wrap gap-2">
          {availableModules.map((module) => {
            const active = Boolean(options.modules?.[module.key]);
            return (
              <button
                key={module.key}
                type="button"
                onClick={() => toggleModule(module.key)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  minHeight: 44,
                  color: active ? MODULE_GOLD : TEXT_SECONDARY,
                  background: active ? "rgba(180,140,75,0.16)" : "transparent",
                  border: `1px solid ${active ? "rgba(180,140,75,0.45)" : "rgba(180,140,75,0.18)"}`,
                }}
                aria-pressed={active}
              >
                {t(`collectionReports.module.${module.key}`, MODULE_LABELS[module.key])}
              </button>
            );
          })}
          {availableModules.length === 0 && (
            <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
              {t("collectionReports.noModules", "No collection modules are enabled on your account yet.")}
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: TEXT_CAPTION }}>
          {t("collectionReports.blendsPerPipe", "Blend matches per pipe")}
        </p>
        <div className="flex gap-2">
          {BLEND_COUNTS.map((count) => {
            const active = Number(options.blendsPerPipe) === count;
            return (
              <button
                key={count}
                type="button"
                onClick={() => setOption("blendsPerPipe", count)}
                className="px-4 rounded-xl text-sm font-semibold transition-all"
                style={{
                  minHeight: 44,
                  color: active ? "#140f0c" : TEXT_SECONDARY,
                  background: active ? MODULE_GOLD : "transparent",
                  border: `1px solid ${active ? MODULE_GOLD : "rgba(180,140,75,0.22)"}`,
                }}
                aria-pressed={active}
              >
                {count}
              </button>
            );
          })}
        </div>
      </div>

      {options.modules.pipe && <div className="space-y-3">
        <label className="block text-sm" style={{ color: TEXT_PRIMARY }}>Pipe
          <select aria-label="Pipe filter" className="block w-full mt-1 p-2 rounded bg-[#211810]" value={options.pipeId || ''} onChange={(e) => setOption('pipeId', e.target.value)}>
            <option value="">All pipes</option>
            {[...pipes].sort((a,b) => (a.name || '').localeCompare(b.name || '')).map((pipe) => <option key={pipe.id} value={pipe.id}>{pipe.name}</option>)}
          </select>
        </label>
        <label className="block text-sm" style={{ color: TEXT_PRIMARY }}>Specialization
          <select aria-label="Specialization filter" className="block w-full mt-1 p-2 rounded bg-[#211810]" value={options.specialization || ''} onChange={(e) => setOption('specialization', e.target.value)}>
            <option value="">All specializations</option>
            {[...new Set(pipes.flatMap((pipe) => Array.isArray(pipe.focus) ? pipe.focus : []))].sort().map((focus) => <option key={focus} value={focus}>{focus}</option>)}
          </select>
        </label>
      </div>}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>
              {t("collectionReports.includePhotos", "Include photos")}
            </p>
            <p className="text-xs" style={{ color: TEXT_CAPTION }}>
              {t("collectionReports.includePhotosHint", "Adds item images to the printed report.")}
            </p>
          </div>
          <Switch checked={Boolean(options.includePhotos)} onCheckedChange={(value) => setOption("includePhotos", value)} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>
              {t("collectionReports.includeExplanations", "Include explanations")}
            </p>
            <p className="text-xs" style={{ color: TEXT_CAPTION }}>
              {t("collectionReports.includeExplanationsHint", "Prints the reasoning behind each match.")}
            </p>
          </div>
          <Switch
            checked={Boolean(options.includeExplanations)}
            onCheckedChange={(value) => setOption("includeExplanations", value)}
          />
        </div>
      </div>

      {canExport ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={onExportPdf} disabled={disabled || Boolean(exporting)} className="flex-1" style={{ minHeight: 44 }}>
            {exporting === "pdf" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {t("collectionReports.exportPdf", "Export PDF")}
          </Button>
          <Button
            onClick={onExportCsv}
            disabled={disabled || Boolean(exporting)}
            variant="outline"
            className="flex-1"
            style={{ minHeight: 44 }}
          >
            {exporting === "csv" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            {t("collectionReports.exportCsv", "Export Excel / CSV")}
          </Button>
        </div>
      ) : (
        <UpgradePrompt
          featureName={t("collectionReports.featureName", "Printable collection reports")}
          description={t(
            "collectionReports.featureDescription",
            "Export your pairing chart, top matches and complementary suggestions as a printable PDF or spreadsheet.",
          )}
        />
      )}
    </div>
  );
}