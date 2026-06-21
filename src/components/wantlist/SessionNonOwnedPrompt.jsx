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

export default function SessionNonOwnedPrompt({
  open,
  onOpenChange,
  sessionItem,
  userPreferences,
}) {
  const { addToWantList, addToShoppingList, markNotForMe } =
    useWantListActions();
  const { t } = useTranslation();

  if (!userPreferences?.prompt_after_nonowned_session) {
    return null;
  }

  const handleAddToWantList = async () => {
    await addToWantList({
      ...sessionItem,
      source_type: "session",
      source_record_id: sessionItem.log_id,
    });
    onOpenChange(false);
  };

  const handleAddToShoppingList = async () => {
    await addToShoppingList({
      ...sessionItem,
      source_type: "session",
      source_record_id: sessionItem.log_id,
    });
    onOpenChange(false);
  };

  const handleMarkNotForMe = async () => {
    await markNotForMe(
      {
        ...sessionItem,
        source_type: "session",
        source_record_id: sessionItem.log_id,
      },
      t("wantList.prompts.triedInSession")
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("wantList.prompts.addToWantListTitle", { name: sessionItem.name })}
          </DialogTitle>
          <DialogDescription>
            {t("wantList.prompts.addToWantListDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleAddToWantList}
            className="w-full"
          >
            {t("wantList.prompts.addToWantList")}
          </Button>
          <Button
            onClick={handleAddToShoppingList}
            variant="outline"
            className="w-full"
          >
            {t("wantList.prompts.addToShoppingList")}
          </Button>
          <Button
            onClick={handleMarkNotForMe}
            variant="ghost"
            className="w-full"
          >
            {t("wantList.categories.notForMe")}
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