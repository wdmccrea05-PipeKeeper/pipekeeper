import React, { useState } from "react";
import {
  Trash2,
  Share2,
  Edit2,
  CheckCircle2,
  ChevronDown,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useWantListActions } from "./useWantListActions";

export default function AcquisitionItemCard({
  item,
  onStatusChange,
  onArchive,
  onShare,
  onPurchase,
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || "");
  const [isLoading, setIsLoading] = useState(false);
  const { updateStatus, updatePriority, updateNotes, archiveItem } =
    useWantListActions();

  const handleStatusChange = async (newStatus) => {
    try {
      setIsLoading(true);
      await updateStatus(item.id, newStatus);
      onStatusChange?.(item.id, newStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      setIsLoading(true);
      await updatePriority(item.id, newPriority);
      onStatusChange?.(item.id);
    } catch (err) {
      console.error("Failed to update priority:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setIsLoading(true);
      await archiveItem(item.id);
      onArchive?.(item.id);
    } catch (err) {
      console.error("Failed to archive item:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotesUpdate = async () => {
    try {
      setIsLoading(true);
      await updateNotes(item.id, notes);
      setShowNotes(false);
      onStatusChange?.(item.id);
    } catch (err) {
      console.error("Failed to update notes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isMuted = item.status === "do_not_buy_again";

  const statusLabel = {
    wishlist: "Wish List",
    shopping_list: "Shopping List",
    restock: "Restock",
    tried_not_owned: "Tried (Not Owned)",
    do_not_buy_again: "Not for Me",
    archived: "Archived",
  }[item.status] || "Unknown";

  const priorityColor = {
    low: "text-blue-500",
    medium: "text-yellow-500",
    high: "text-red-500",
  }[item.priority || "medium"] || "text-yellow-500";

  return (
    <div
      className={`border rounded-lg p-4 ${
        isMuted
          ? "bg-[rgba(255,255,255,0.03)] border-[#b48c4b]/20 opacity-60"
          : "bg-[rgba(255,255,255,0.03)] border-[#b48c4b]/20"
      }`}
    >
      <div className="flex items-start justify-between gap-4">

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-[#E0D8C8]">{item.name}</h3>
          <p className="text-xs text-[#E0D8C8]/60 mt-1 capitalize">{item.item_type}</p>
          {item.estimated_price && (
            <p className="text-xs text-[#E0D8C8]/50 mt-1">
              Est: ${item.estimated_price.toFixed(2)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-medium text-[#D4A574]">
              {statusLabel}
            </span>
            <Flag className={`w-4 h-4 ${priorityColor}`} />
          </div>
        </div>
      </div>

      {showNotes && (
        <div className="mt-3 border-t border-[#b48c4b]/20 pt-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-sm p-2 border rounded bg-[rgba(255,255,255,0.05)] border-[#b48c4b]/30 text-[#E0D8C8] placeholder-[#E0D8C8]/40"
            rows={3}
            placeholder="Add notes..."
          />
          <div className="flex gap-2 mt-2">
           <Button size="sm" onClick={handleNotesUpdate} disabled={isLoading}>
             {isLoading ? "Saving..." : "Save"}
           </Button>
           <Button
             size="sm"
             variant="outline"
             onClick={() => setShowNotes(false)}
             disabled={isLoading}
           >
             Cancel
           </Button>
          </div>
        </div>
      )}

      {!showNotes && item.notes && (
        <p className="text-xs text-[#E0D8C8]/60 mt-2 italic">
          Notes: {item.notes}
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
               Status
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8"
              disabled={isLoading}
            >
              Priority
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[rgba(22,17,13,0.96)] border-[#b48c4b]/30">
            <DropdownMenuItem onClick={() => handlePriorityChange("low")}>
              Low
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange("medium")}>
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange("high")}>
              High
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          onClick={() => setShowNotes(!showNotes)}
          disabled={isLoading}
        >
          <Edit2 className="w-3 h-3 mr-1" />
          Notes
        </Button>

        {item.status !== "archived" && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={() => onPurchase?.(item)}
            disabled={isLoading}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Purchased
          </Button>
          )}

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
          className="text-xs h-8 text-red-400"
          onClick={handleArchive}
          disabled={isLoading}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}