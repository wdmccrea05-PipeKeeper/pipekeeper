import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWantListActions } from "./useWantListActions";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function AddToWantListModal({
  open,
  onOpenChange,
  item,
  itemType,
}) {
  const [category, setCategory] = useState("wishlist");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();
  const { addToWantList, addToShoppingList, addTriedNotOwned, markNotForMe } =
    useWantListActions();

  const handleAdd = async () => {
    const payload = {
      item_type: itemType,
      name: item.name,
      brand_or_maker: item.maker || item.brand || item.manufacturer,
      is_manual: true,
      priority,
      image: item.image || item.photos?.[0],
    };

    if (itemType === "blend") {
      payload.blend_type = item.blend_type;
      payload.cut = item.cut;
      payload.strength = item.strength;
      payload.components = item.components;
    } else if (itemType === "bottle") {
      payload.distillery = item.distillery;
      payload.proof = item.proof;
      payload.age = item.age;
      payload.bottle_category = item.category;
    } else if (itemType === "pipe") {
      payload.pipe_maker = item.maker;
      payload.pipe_model = item.model;
      payload.pipe_shape = item.shape;
      payload.pipe_finish = item.finish;
      payload.pipe_material = item.bowl_material;
    } else if (itemType === "wine") {
      payload.producer = item.maker || item.producer;
      payload.vintage = item.vintage;
      payload.region = item.region;
      payload.varietal = item.varietal;
    }

    setSaving(true);
    try {
      if (category === "shopping_list") {
        await addToShoppingList(payload);
      } else if (category === "do_not_buy_again") {
        await markNotForMe(payload, "");
      } else if (category === "tried_not_owned") {
        await addTriedNotOwned(payload);
      } else {
        await addToWantList(payload);
      }
      toast.success(t("wantList.toasts.addedToWantList"));
      onOpenChange(false);
    } catch {
      toast.error(t("wantList.toasts.failedToAddItem"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("wantList.modal.addToWantList")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("wantList.modal.category")}</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wishlist">{t("wantList.categories.wishList")}</SelectItem>
                <SelectItem value="shopping_list">{t("wantList.categories.shoppingList")}</SelectItem>
                <SelectItem value="tried_not_owned">{t("wantList.categories.triedNotOwned")}</SelectItem>
                <SelectItem value="do_not_buy_again">{t("wantList.categories.notForMe")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">{t("wantList.actions.priority")}</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("wantList.priority.low")}</SelectItem>
                <SelectItem value="medium">{t("wantList.priority.medium")}</SelectItem>
                <SelectItem value="high">{t("wantList.priority.high")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1"
            >
              {saving ? t("wantList.actions.adding") : t("wantList.actions.add")}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              disabled={saving}
              variant="outline"
              className="flex-1"
            >
              {t("wantList.actions.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}