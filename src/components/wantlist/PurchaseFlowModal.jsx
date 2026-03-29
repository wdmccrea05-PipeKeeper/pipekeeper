import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWantListActions } from "./useWantListActions";

export default function PurchaseFlowModal({
  open,
  onOpenChange,
  acquisitionItem,
  onStartAddFlow,
}) {
  const { updateStatus } = useWantListActions();

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
            Add {acquisitionItem.name} to Collection
          </DialogTitle>
          <DialogDescription>
            You're about to add this item to your collection. Complete the
            details including quantity, container type, and storage location.
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
            After completing the details, this item will be moved to your
            collection and archived from your Want List.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleLaunchAddFlow}
            className="flex-1"
          >
            Continue to Add Item
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}