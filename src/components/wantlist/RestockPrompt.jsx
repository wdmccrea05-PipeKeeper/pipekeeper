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

export default function RestockPrompt({
  open,
  onOpenChange,
  item,
  userPreferences,
}) {
  const { addRestock, addToShoppingList } = useWantListActions();

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
            {item.name} — Low Inventory
          </DialogTitle>
          <DialogDescription>
            Your inventory of {item.name} is running low. Would you like to add it to your Want List?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleRestock}
            className="w-full"
          >
            Add to Restock List
          </Button>
          <Button
            onClick={handleShoppingList}
            variant="outline"
            className="w-full"
          >
            Add to Shopping List
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