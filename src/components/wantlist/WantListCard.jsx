import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Share2, Edit2, CheckCircle2, ChevronDown, Archive, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";

export default function WantListCard({
  item,
  onStatusChange,
  onArchive,
  onShare,
  onAddToCollection,
  onEdit,
}) {
  const [isLoading, setIsLoading] = useState(false);

  const categoryLabel = {
    wishlist: "Wish List",
    shopping_list: "Shopping List",
    restock: "Restock",
    tried_not_owned: "Tried (Not Owned)",
    do_not_buy_again: "Not for Me",
  }[item.category] || "Unknown";

  const priorityColor = {
    low: "text-blue-500",
    medium: "text-yellow-500",
    high: "text-red-500",
  }[item.priority || "medium"] || "text-yellow-500";

  const typeLabel = {
    blend: "Tobacco Blend",
    pipe: "Pipe",
    tobacco_bulk: "Bulk Tobacco",
    tobacco_tin: "Tinned Tobacco",
    bottle: "Whiskey Bottle",
    accessory: "Accessory",
  }[item.item_type] || item.item_type;

  const handleArchive = async () => {
    try {
      setIsLoading(true);
      await base44.entities.AcquisitionItem.update(item.id, {
        status: "archived",
      });
      toast.success("Item archived");
      onArchive?.(item.id);
    } catch (err) {
      toast.error("Failed to archive");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setIsLoading(true);
      await base44.entities.AcquisitionItem.update(item.id, {
        category: newStatus,
      });
      toast.success("Status updated");
      onStatusChange?.(item.id, newStatus);
    } catch (err) {
      toast.error("Failed to update status");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const isMuted = item.category === "do_not_buy_again";

  return (
    <div
      className={`border rounded-lg p-4 ${
        isMuted
          ? "bg-[rgba(255,255,255,0.03)] border-[#b48c4b]/20 opacity-60"
          : "bg-[rgba(255,255,255,0.05)] border-[#b48c4b]/25"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-[#E0D8C8]">{item.name}</h3>
          {item.brand && (
            <p className="text-xs text-[#E0D8C8]/60">{item.brand}</p>
          )}
          <p className="text-xs text-[#E0D8C8]/50 mt-1">{typeLabel}</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-medium text-[#D4A574]">
            {categoryLabel}
          </span>
          {item.priority && (
            <Tag className={`w-4 h-4 ${priorityColor}`} />
          )}
        </div>
      </div>

      {item.blend_name && (
        <p className="text-xs text-[#E0D8C8]/70 mb-2">
          <strong>Blend:</strong> {item.blend_name}
        </p>
      )}

      {item.pipe_model && (
        <p className="text-xs text-[#E0D8C8]/70 mb-2">
          <strong>Model:</strong> {item.pipe_model}
        </p>
      )}

      {item.desired_quantity && (
        <p className="text-xs text-[#E0D8C8]/70 mb-2">
          <strong>Qty:</strong> {item.desired_quantity} {item.quantity_unit || "units"}
        </p>
      )}

      {(item.target_price || item.estimated_price) && (
        <p className="text-xs text-[#E0D8C8]/70 mb-2">
          <strong>Price:</strong> ${item.target_price || item.estimated_price}
        </p>
      )}

      {item.notes && (
        <p className="text-xs text-[#E0D8C8]/60 italic mt-2 mb-2">
          {item.notes}
        </p>
      )}

      <div className="flex gap-2 mt-4 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8"
              disabled={isLoading}
            >
              Category
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[rgba(22,17,13,0.96)] border-[#b48c4b]/30">
            <DropdownMenuItem onClick={() => handleStatusChange("wishlist")}>
              Wish List
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("shopping_list")}>
              Shopping List
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("tried_not_owned")}>
              Tried (Not Owned)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("restock")}>
              Restock
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleStatusChange("do_not_buy_again")}>
              Not for Me
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          onClick={() => onEdit?.(item)}
          disabled={isLoading}
        >
          <Edit2 className="w-3 h-3 mr-1" />
          Edit
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          onClick={() => onAddToCollection?.(item)}
          disabled={isLoading}
        >
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Acquired
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          onClick={() => onShare?.(item)}
          disabled={isLoading}
        >
          <Share2 className="w-3 h-3" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          onClick={handleArchive}
          disabled={isLoading}
        >
          <Archive className="w-3 h-3" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8 text-red-400"
          onClick={async () => {
            try {
              setIsLoading(true);
              await base44.entities.AcquisitionItem.delete(item.id);
              toast.success("Item deleted");
              onArchive?.(item.id);
            } catch (err) {
              toast.error("Failed to delete");
              console.error(err);
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}