import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function PurchaseFlowModal({
  open,
  onOpenChange,
  acquisitionItem,
  onStartAddFlow,
}) {
  const { t } = useTranslation();

  const handleLaunchAddFlow = () => {
    // Trigger the standard Add Item flow with prefilled data
    const prefilled = {
      item_type: acquisitionItem.item_type,
      name: acquisitionItem.name,
      brand_or_maker: acquisitionItem.brand_or_maker,
      image: acquisitionItem.image,
      // Type-specific
      blend_type: acquisitionItem.blend_type,
      cut: acquisitionItem.cut,
      strength: acquisitionItem.strength,
      distillery: acquisitionItem.distillery,
      proof: acquisitionItem.proof,
      age: acquisitionItem.age,
      pipe_maker: acquisitionItem.pipe_maker,
      pipe_shape: acquisitionItem.pipe_shape,
      pipe_finish: acquisitionItem.pipe_finish,
    };

    onStartAddFlow?.(acquisitionItem.item_type, prefilled);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("wantList.purchaseFlow.title", { name: acquisitionItem.name })}
          </DialogTitle>
          <DialogDescription>
            {t("wantList.purchaseFlow.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-gray-50 rounded">
            <p className="font-medium text-sm">{acquisitionItem.name}</p>
            <p className="text-xs text-gray-600">
              {acquisitionItem.brand_or_maker}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {acquisitionItem.item_type}
            </p>
          </div>

          <p className="text-sm text-gray-600">
            {t("wantList.purchaseFlow.afterDetails")}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleLaunchAddFlow}
            className="flex-1"
          >
            {t("wantList.purchaseFlow.continueToAddItem")}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="flex-1"
          >
            {t("wantList.actions.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}