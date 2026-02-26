import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle2 } from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function ProUpgradeModal({ isOpen, onClose, featureName = undefined }) {
  const { t } = useTranslation();

  const proBenefits = [
    t("proUpgrade.benefit.aiEstimatedValue"),
    t("proUpgrade.benefit.valueRangeConfidence"),
    t("proUpgrade.benefit.predictiveProjections"),
    t("proUpgrade.benefit.advancedAnalytics"),
    t("proUpgrade.benefit.bulkEditingTools"),
    t("proUpgrade.benefit.exportReports"),
  ];

  const effectiveFeatureName = featureName || t("proUpgrade.thisFeature");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-[#243548] to-[#1a2c42] border-[#D1A75D]/30">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-[#e8d5b7] text-xl">{t("proUpgrade.title")}</DialogTitle>
          </div>
          <DialogDescription className="text-[#e8d5b7]/70">
            {t("proUpgrade.description", { featureName: effectiveFeatureName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm font-semibold text-[#e8d5b7]">{t("proUpgrade.proIncludes")}</p>
          <div className="space-y-2">
            {proBenefits.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-sm text-[#e8d5b7]/90">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="border-[#e8d5b7]/30 text-[#e8d5b7]">
            {t("proUpgrade.notNow")}
          </Button>
          <a href={createPageUrl("Subscription")} className="flex-1">
            <Button className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800">
              {t("proUpgrade.upgradeToPro")}
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}