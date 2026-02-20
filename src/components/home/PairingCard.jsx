import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function PairingCard({ pipe, blend, score, reasoning }) {
  const { t } = useTranslation();
  const shareText = `${pipe?.maker || ""} ${pipe?.name || ""} + ${blend?.manufacturer || ""} ${blend?.name || ""}\nScore: ${score}/10\nWhy: ${reasoning}`;

  function copyText() {
    navigator.clipboard?.writeText(shareText);
    toast.success(t("pairingCard.copied"));
  }

  async function downloadPDF() {
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(t("pairingCard.title"), 10, 15);
      
      doc.setFontSize(12);
      doc.text(`Pipe: ${(pipe?.maker || "")} ${(pipe?.name || "")}`.trim(), 10, 30);
      doc.text(`Blend: ${(blend?.manufacturer || "")} ${(blend?.name || "")}`.trim(), 10, 40);
      doc.text(`Score: ${score}/10`, 10, 50);
      
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(`${t("pairingCard.reason")}: ${reasoning || ""}`, 180);
      doc.text(lines, 10, 60);
      
      doc.save("pairing-card.pdf");
      toast.success(t("pairingCard.pdfDownloaded"));
    } catch (err) {
      toast.error(t("pairingCard.pdfFailed"));
    }
  }

  return (
    <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
      <CardContent className="p-4 space-y-3">
        <div className="text-xs text-[#e8d5b7]/60">{t("pairingCard.shareable")}</div>
        <div>
          <div className="text-lg font-semibold text-[#e8d5b7]">
            {(pipe?.maker || "")} {pipe?.name || ""}
          </div>
          <div className="text-sm text-[#e8d5b7]/80 mt-1">
            {(blend?.manufacturer || "")} {blend?.name || ""}
          </div>
        </div>
        <div className="text-sm text-[#e8d5b7]">
          <span className="font-semibold">{t("pairingCard.scoreLabel")}:</span> {score}/10
        </div>
        <div className="text-sm text-[#e8d5b7]/80 leading-relaxed">{reasoning}</div>

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={copyText}
            className="border-[#8b3a3a]/40 text-[#e8d5b7] hover:bg-[#8b3a3a]/20"
          >
            <Copy className="w-3 h-3 mr-1" />
            {t("pairingCard.copyButton")}
          </Button>
          <Button
            size="sm"
            onClick={downloadPDF}
            className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e] hover:from-[#6d2e2e] hover:to-[#5a2525]"
          >
            <Download className="w-3 h-3 mr-1" />
            {t("pairingCard.downloadButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}