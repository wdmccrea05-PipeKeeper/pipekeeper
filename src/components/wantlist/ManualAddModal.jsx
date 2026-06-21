import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function ManualAddModal({ isOpen, onClose, onSuccess, initialQuery }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: initialQuery || "",
    item_type: "blend",
    category: "wishlist",
    brand: "",
    blend_name: "",
    pipe_model: "",
    pipe_type: "unknown",
    desired_quantity: "",
    quantity_unit: "units",
    target_price: "",
    notes: "",
    source: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t("wantList.manualAddModal.itemNameRequired"));
      return;
    }

    setIsLoading(true);
    try {
      await base44.entities.AcquisitionItem.create({
        ...formData,
        is_manual: true,
        desired_quantity: formData.desired_quantity ? parseFloat(formData.desired_quantity) : null,
        target_price: formData.target_price ? parseFloat(formData.target_price) : null,
      });
      toast.success(t("wantList.manualAddModal.itemAdded"));
      onSuccess?.();
      setFormData({
        name: "",
        item_type: "blend",
        category: "wishlist",
        brand: "",
        blend_name: "",
        pipe_model: "",
        pipe_type: "unknown",
        desired_quantity: "",
        quantity_unit: "units",
        target_price: "",
        notes: "",
        source: "",
      });
    } catch (err) {
      toast.error(t("wantList.toasts.failedToAddItem"));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[rgba(22,17,13,0.96)] border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("wantList.manualAddModal.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-[#E0D8C8]">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium mb-2">{t("wantList.manualAddModal.itemName")}</label>
            <Input
              placeholder={t("wantList.manualAddModal.itemNamePlaceholder")}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("wantList.manualAddModal.type")}</label>
              <Select value={formData.item_type} onValueChange={(v) => setFormData({ ...formData, item_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blend">{t("wantList.itemTypes.tobaccoBlend")}</SelectItem>
                  <SelectItem value="tobacco_bulk">{t("wantList.itemTypes.bulkTobacco")}</SelectItem>
                  <SelectItem value="tobacco_tin">{t("wantList.itemTypes.tinnedTobacco")}</SelectItem>
                  <SelectItem value="pipe">{t("wantList.itemTypes.pipe")}</SelectItem>
                  <SelectItem value="accessory">{t("wantList.itemTypes.accessory")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("wantList.modal.category")}</label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wishlist">{t("wantList.categories.wishList")}</SelectItem>
                  <SelectItem value="shopping_list">{t("wantList.categories.shoppingList")}</SelectItem>
                  <SelectItem value="restock">{t("wantList.categories.restock")}</SelectItem>
                  <SelectItem value="tried_not_owned">{t("wantList.categories.triedNotOwned")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Brand/Blend/Model */}
          <div>
            <label className="block text-sm font-medium mb-2">{t("wantList.manualAddModal.brandManufacturer")}</label>
            <Input
              placeholder={t("wantList.manualAddModal.brandManufacturerPlaceholder")}
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
          </div>

          {(formData.item_type === "blend" || formData.item_type === "tobacco_bulk" || formData.item_type === "tobacco_tin") && (
            <div>
              <label className="block text-sm font-medium mb-2">{t("wantList.manualForm.fields.blendName")}</label>
              <Input
                placeholder={t("wantList.manualAddModal.blendNamePlaceholder")}
                value={formData.blend_name}
                onChange={(e) => setFormData({ ...formData, blend_name: e.target.value })}
              />
            </div>
          )}

          {formData.item_type === "pipe" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">{t("wantList.manualAddModal.pipeModelShape")}</label>
                <Input
                  placeholder={t("wantList.manualAddModal.pipeModelShapePlaceholder")}
                  value={formData.pipe_model}
                  onChange={(e) => setFormData({ ...formData, pipe_model: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t("wantList.manualAddModal.pipeType")}</label>
                <Select value={formData.pipe_type} onValueChange={(v) => setFormData({ ...formData, pipe_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_production">{t("wantList.manualAddModal.pipeTypeOptions.newProduction")}</SelectItem>
                    <SelectItem value="estate">{t("wantList.manualAddModal.pipeTypeOptions.estate")}</SelectItem>
                    <SelectItem value="artisan_custom">{t("wantList.manualAddModal.pipeTypeOptions.artisanCustom")}</SelectItem>
                    <SelectItem value="vintage">{t("wantList.manualAddModal.pipeTypeOptions.vintage")}</SelectItem>
                    <SelectItem value="unknown">{t("wantList.labels.unknown")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("wantList.manualAddModal.desiredQty")}</label>
              <Input
                type="number"
                placeholder={t("wantList.manualAddModal.desiredQtyPlaceholder")}
                value={formData.desired_quantity}
                onChange={(e) => setFormData({ ...formData, desired_quantity: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("wantList.manualAddModal.unit")}</label>
              <Select value={formData.quantity_unit} onValueChange={(v) => setFormData({ ...formData, quantity_unit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="units">{t("wantList.manualAddModal.units.units")}</SelectItem>
                  <SelectItem value="oz">{t("wantList.manualAddModal.units.ounces")}</SelectItem>
                  <SelectItem value="grams">{t("wantList.manualAddModal.units.grams")}</SelectItem>
                  <SelectItem value="tins">{t("wantList.manualAddModal.units.tins")}</SelectItem>
                  <SelectItem value="pouches">{t("wantList.manualAddModal.units.pouches")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("wantList.manualAddModal.targetPrice")}</label>
            <Input
              type="number"
              placeholder={t("wantList.manualAddModal.targetPricePlaceholder")}
              step="0.01"
              value={formData.target_price}
              onChange={(e) => setFormData({ ...formData, target_price: e.target.value })}
            />
          </div>

          {/* Additional Info */}
          <div>
            <label className="block text-sm font-medium mb-2">{t("wantList.manualAddModal.source")}</label>
            <Input
              placeholder={t("wantList.manualAddModal.sourcePlaceholder")}
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("wantList.labels.notes")}</label>
            <textarea
              placeholder={t("wantList.manualAddModal.notesPlaceholder")}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full p-2 border rounded bg-[rgba(255,255,255,0.05)] border-[#b48c4b]/30 text-[#E0D8C8] placeholder-[#E0D8C8]/40"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              {t("wantList.actions.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !formData.name.trim()}>
              {isLoading ? t("wantList.manualAddModal.adding") : t("wantList.manualAddModal.addItem")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}