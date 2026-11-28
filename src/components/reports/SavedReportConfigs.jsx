import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { TEXT_CAPTION, TEXT_PRIMARY } from "@/lib/theme/tokens";

/**
 * Saved report configurations. A configuration stores the report and its
 * filters, so a collector can return to the same view later.
 */
export default function SavedReportConfigs({ user, reportId, filters, onLoad }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const email = user?.email;

  const saved = useQuery({
    queryKey: ["saved-report-configs", email],
    queryFn: () => base44.entities.SavedReportConfig.filter({ created_by: email }, "-created_date", 50),
    enabled: Boolean(email),
    staleTime: 60_000,
  });

  const create = useMutation({
    mutationFn: (payload) => base44.entities.SavedReportConfig.create(payload),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["saved-report-configs", email] });
      toast.success(t("reporting.saved", "Configuration saved."));
    },
    onError: () => toast.error(t("reporting.saveFailed", "Could not save that configuration.")),
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.SavedReportConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-report-configs", email] });
      toast.success(t("reporting.deleted", "Configuration removed."));
    },
    onError: () => toast.error(t("reporting.deleteFailed", "Could not remove that configuration.")),
  });

  const rows = Array.isArray(saved.data) ? saved.data : saved.data?.items || [];

  const handleSave = () => {
    const label = name.trim() || `${reportId}`;
    create.mutate({
      name: label,
      report_id: reportId,
      filters: { ...filters, curatorQuestion: filters.curatorQuestion || "" },
      created_by: email,
    });
  };

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ border: "1px solid rgba(180,140,75,0.18)" }}>
      <div className="flex items-center gap-2">
        <Bookmark className="w-4 h-4" style={{ color: TEXT_CAPTION }} />
        <h2 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
          {t("reporting.savedConfigs", "Saved configurations")}
        </h2>
      </div>

      {reportId && <div className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("reporting.configName", "Name this view")}
          aria-label={t("reporting.configName", "Name this view")}
          disabled={!email || create.isPending}
        />
        <Button onClick={handleSave} disabled={!email || create.isPending} style={{ minHeight: 44 }}>
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("reporting.save", "Save")}
        </Button>
      </div>}

      {saved.isLoading ? (
        <p className="text-xs" style={{ color: TEXT_CAPTION }}>{t("reporting.loadingConfigs", "Loading…")}</p>
      ) : rows.length === 0 ? (
        <p className="text-xs" style={{ color: TEXT_CAPTION }}>
          {t("reporting.noConfigs", "No saved views yet. Filters and the chosen report are stored together.")}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((config) => (
            <li key={config.id} className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onLoad(config)}
                className="text-left text-sm flex-1 underline decoration-dotted underline-offset-2"
                style={{ color: "#D4A574", minHeight: 32 }}
              >
                {config.name}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove.mutate(config.id)}
                aria-label={`${t("reporting.remove", "Remove")} ${config.name}`}
                style={{ minHeight: 36 }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}