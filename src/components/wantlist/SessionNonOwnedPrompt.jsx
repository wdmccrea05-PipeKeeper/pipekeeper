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

export default function SessionNonOwnedPrompt({
  open,
  onOpenChange,
  sessionItem,
  userPreferences,
}) {
  const { addToWantList, addToShoppingList, markNotForMe } =
    useWantListActions();

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
      "Tried in session"
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {sessionItem.name} — Add to Want List?
          </DialogTitle>
          <DialogDescription>
            You logged a session with an item you don't own. Would you like to
            save it to your Want List?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleAddToWantList}
            className="w-full"
          >
            Add to Want List
          </Button>
          <Button
            onClick={handleAddToShoppingList}
            variant="outline"
            className="w-full"
          >
            Add to Shopping List
          </Button>
          <Button
            onClick={handleMarkNotForMe}
            variant="ghost"
            className="w-full"
          >
            Not for Me
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full"
          >
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}