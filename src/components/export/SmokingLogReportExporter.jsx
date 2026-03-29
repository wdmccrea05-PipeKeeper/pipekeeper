import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { toast } from "sonner";

export default function SmokingLogReportExporter({ user }) {
  const entitlements = useEntitlements();
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  if (!entitlements.canUse("EXPORT_REPORTS")) {
    return (
      <UpgradePrompt 
        featureName={t("usageLogReport.featureName")}
        description={t("usageLogReport.featureDescription")}
      />
    );
  }

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateSmokingLogPDF', {
        startDate,
        endDate
      });
      
      if (response.status === 400 && response.data?.error) {
        toast.error(response.data.error);
        return;
      }
      
      if (!response.data) {
        toast.error(t("usageLogReport.noDataGenerated"));
        return;
      }
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usage-log-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success(t("usageLogReport.pdfDownloaded"));
    } catch (error) {
      console.error('[SmokingLogExport] PDF generation error:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Unknown error';
      toast.error(t("usageLogReport.failedPdfDetail", { error: errorMsg }));
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateSmokingLogExcel', {
        startDate,
        endDate
      });
      
      if (response.status === 400 && response.data?.error) {
        toast.error(response.data.error);
        return;
      }
      
      if (!response.data) {
        toast.error(t("usageLogReport.noDataGenerated"));
        return;
      }
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usage-log-${startDate}-to-${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success(t("usageLogReport.excelDownloaded"));
    } catch (error) {
      console.error('[SmokingLogExport] Excel generation error:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Unknown error';
      toast.error(t("usageLogReport.failedExcelDetail", { error: errorMsg }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#3a2a20] to-[#2a1a10] border border-[#8b6239]/30 rounded-lg p-4 space-y-4 mb-4">
      <div>
        <h3 className="font-semibold text-[#E0D8C8] mb-3">{t("usageLogReport.title")}</h3>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs text-[#E0D8C8]/70 block mb-1">{t("usageLogReport.startDate")}</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
              className="text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-[#E0D8C8]/70 block mb-1">{t("usageLogReport.endDate")}</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
              className="text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportPDF}
            disabled={loading}
            variant="secondary"
            size="sm"
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {t("usageLogReport.downloadPdf")}
          </Button>
          <Button
            onClick={handleExportExcel}
            disabled={loading}
            variant="secondary"
            size="sm"
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-2" />
            )}
            {t("usageLogReport.downloadExcel")}
          </Button>
        </div>
      </div>
    </div>
  );
}