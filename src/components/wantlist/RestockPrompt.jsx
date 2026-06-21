import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWantListActions } from "./useWantListActions";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function RestockPrompt({
  open,
  onOpenChange,
  item,
  userPreferences,
}) {
  const { addRestock, addToShoppingList } = useWantListActions();
  const { t } = useTranslation();

  if (!userPreferences?.prompt_when_low_inventory) {
    return null;
  }

  const handleRestock = async () => {
    await addRestock(item);
    onOpenChange(false);
  };

  const handleShoppingList = async () => {
    await addToShoppingList({
      ...item,
      status: "shopping_list",
      source_type: "restock",
      source_record_id: item.id,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("wantList.restockPrompt.title", { name: item.name })}
          </DialogTitle>
          <DialogDescription>
            {t("wantList.restockPrompt.description", { name: item.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleRestock}
            className="w-full"
          >
            {t("wantList.restockPrompt.addToRestockList")}
          </Button>
          <Button
            onClick={handleShoppingList}
            variant="outline"
            className="w-full"
          >
            {t("wantList.prompts.addToShoppingList")}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full"
          >
            {t("wantList.prompts.dismiss")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}