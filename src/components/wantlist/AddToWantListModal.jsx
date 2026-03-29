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

export default function AddToWantListModal({
  open,
  onOpenChange,
  item,
  itemType,
}) {
  const [status, setStatus] = useState("wishlist");
  const [priority, setPriority] = useState("medium");
  const { addToWantList, addToShoppingList, markNotForMe } =
    useWantListActions();

  const handleAdd = async () => {
    const payload = {
      item_type: itemType,
      name: item.name,
      brand_or_maker: item.maker || item.brand || item.manufacturer,
      source_type: "manual",
      status,
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
    }

    if (status === "shopping_list") {
      await addToShoppingList(payload);
    } else if (status === "do_not_buy_again") {
      await markNotForMe(payload, "");
    } else {
      await addToWantList(payload);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Want List</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wishlist">Want List</SelectItem>
                <SelectItem value="shopping_list">Shopping List</SelectItem>
                <SelectItem value="tried_not_owned">Tried (Not Owned)</SelectItem>
                <SelectItem value="do_not_buy_again">Not for Me</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAdd}
              className="flex-1"
            >
              Add
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}