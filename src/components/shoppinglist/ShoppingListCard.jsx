import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Share2, Archive, Tag, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SHOPPING_TYPE_LABEL = {
  restock: "Restock",
  buy_new_item: "Buy New Item",
};

const SHOPPING_TYPE_COLOR = {
  restock: "text-blue-400",
  buy_new_item: "text-green-400",
};

export default function ShoppingListCard({ item, onStatusChange, onArchive }) {
  const [isLoading, setIsLoading] = useState(false);

  const typeLabel = {
    blend: "Tobacco Blend",
    pipe: "Pipe",
    tobacco_bulk: "Bulk Tobacco",
    tobacco_tin: "Tinned Tobacco",
    bottle: "Whiskey Bottle",
    accessory: "Accessory",
  }[item.item_type] || item.item_type;

  const priorityColor = {
    low: "text-blue-500",
    medium: "text-yellow-500",
    high: "text-red-500",
  }[item.priority || "medium"] || "text-yellow-500";

  const handleArchive = async () => {
    try {
      setIsLoading(true);
      await base44.entities.ShoppingListItem.update(item.id, {
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

  const handleAcquired = async () => {
    try {
      setIsLoading(true);
      await base44.entities.ShoppingListItem.update(item.id, {
        status: "acquired",
        acquired_date: new Date().toISOString().split("T")[0],
      });
      toast.success("Marked as acquired");
      onStatusChange?.();
    } catch (err) {
      toast.error("Failed to update");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const text = `${item.name}${item.brand ? ` by ${item.brand}` : ""} - ${typeLabel}`;
    if (navigator.share) {
      navigator.share({ title: "Shopping List Item", text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-[rgba(255,255,255,0.05)] border-[#b48c4b]/25">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-[#E0D8C8]">{item.name}</h3>
            <span className={`text-xs font-medium ${SHOPPING_TYPE_COLOR[item.shopping_type]}`}>
              {SHOPPING_TYPE_LABEL[item.shopping_type]}
            </span>
          </div>
          {item.brand && (
            <p className="text-xs text-[#E0D8C8]/60">{item.brand}</p>
          )}
          <p className="text-xs text-[#E0D8C8]/50 mt-1">{typeLabel}</p>
        </div>

        <div className="flex flex-col items-end gap-1">
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

      {item.model_name && (
        <p className="text-xs text-[#E0D8C8]/70 mb-2">
          <strong>Model:</strong> {item.model_name}
        </p>
      )}

      {item.desired_quantity && (
        <p className="text-xs text-[#E0D8C8]/70 mb-2">
          <strong>Qty:</strong> {item.desired_quantity} {item.quantity_unit || "units"}
        </p>
      )}

      {(item.target_price) && (
        <p className="text-xs text-[#E0D8C8]/70 mb-2">
          <strong>Target Price:</strong> ${item.target_price}
        </p>
      )}

      {item.notes && (
        <p className="text-xs text-[#E0D8C8]/60 italic mt-2 mb-2">
          {item.notes}
        </p>
      )}

      {item.source_url && (
        <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#D4A574] hover:underline mb-2">
          View Product
        </a>
      )}

      <div className="flex gap-2 mt-4 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          onClick={handleAcquired}
          disabled={isLoading}
        >
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Acquired
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          onClick={handleShare}
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
              await base44.entities.ShoppingListItem.delete(item.id);
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