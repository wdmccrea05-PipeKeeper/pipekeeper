import React, { useState } from "react";
import {
  Trash2,
  Share2,
  Edit2,
  CheckCircle2,
  ChevronDown,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/lib/currency/useCurrency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useWantListActions } from "./useWantListActions";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function AcquisitionItemCard({
  item,
  onStatusChange,
  onArchive,
  onShare,
  onPurchase: _onPurchase,
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || "");
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const { updateStatus, updatePriority, updateNotes, archiveItem } =
    useWantListActions();

  const handleStatusChange = async (newStatus) => {
    try {
      setIsLoading(true);
      await updateStatus(item.id, newStatus);
      toast.success(t('wantList.toasts.statusUpdated'));
      onStatusChange?.(item.id, newStatus);
    } catch (err) {
      toast.error(t('wantList.toasts.failedToUpdateStatus'));
      console.error("Failed to update status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      setIsLoading(true);
      await updatePriority(item.id, newPriority);
      toast.success(t('wantList.toasts.priorityUpdated'));
      onStatusChange?.(item.id);
    } catch (err) {
      toast.error(t('wantList.toasts.failedToUpdatePriority'));
      console.error("Failed to update priority:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setIsLoading(true);
      await archiveItem(item.id);
      toast.success(t('wantList.toasts.itemArchived'));
      onArchive?.(item.id);
    } catch (err) {
      toast.error(t('wantList.toasts.failedToArchiveItem'));
      console.error("Failed to archive item:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotesUpdate = async () => {
    try {
      setIsLoading(true);
      await updateNotes(item.id, notes);
      toast.success(t('wantList.toasts.notesSaved'));
      setShowNotes(false);
      onStatusChange?.(item.id);
    } catch (err) {
      toast.error(t('wantList.toasts.failedToSaveNotes'));
      console.error("Failed to update notes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isMuted = item.status === "do_not_buy_again";

  const statusLabel = {
    wishlist: t('wantList.categories.wishList'),
    shopping_list: t('wantList.categories.shoppingList'),
    restock: t('wantList.categories.restock'),
    tried_not_owned: t('wantList.categories.triedNotOwned'),
    do_not_buy_again: t('wantList.categories.notForMe'),
    archived: t('wantList.status.archived'),
  }[item.status] || t('wantList.labels.unknown');

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
              {t('wantList.labels.estimatedPrice')}: {formatFromBase(item.estimated_price)}
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
           placeholder={t('wantList.notes.addNotes')}
          />
          <div className="flex gap-2 mt-2">
           <Button size="sm" onClick={handleNotesUpdate} disabled={isLoading}>
             {isLoading ? t('wantList.actions.saving') : t('wantList.actions.save')}
           </Button>
           <Button
             size="sm"
             variant="outline"
             onClick={() => setShowNotes(false)}
             disabled={isLoading}
           >
             {t('wantList.actions.cancel')}
           </Button>
          </div>
        </div>
      )}

      {!showNotes && item.notes && (
        <p className="text-xs text-[#E0D8C8]/60 mt-2 italic">
          {t('wantList.labels.notes')}: {item.notes}
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
               {t('wantList.actions.status')}
               <ChevronDown className="w-3 h-3 ml-1" />
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent className="bg-[rgba(22,17,13,0.96)] border-[#b48c4b]/30">
            <DropdownMenuItem onClick={() => handleStatusChange("wishlist")}>
              {t('wantList.categories.wishList')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("shopping_list")}>
              {t('wantList.categories.shoppingList')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("tried_not_owned")}>
              {t('wantList.categories.triedNotOwned')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("restock")}>
              {t('wantList.categories.restock')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleStatusChange("do_not_buy_again")}>
              {t('wantList.categories.notForMe')}
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
              {t('wantList.actions.priority')}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[rgba(22,17,13,0.96)] border-[#b48c4b]/30">
            <DropdownMenuItem onClick={() => handlePriorityChange("low")}>
              {t('wantList.priority.low')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange("medium")}>
              {t('wantList.priority.medium')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange("high")}>
              {t('wantList.priority.high')}
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
          {t('wantList.labels.notes')}
        </Button>

        {item.status !== "archived" && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={async () => {
              try {
                setIsLoading(true);
                await archiveItem(item.id);
                toast.success(t('wantList.toasts.markedAsPurchased'));
                onArchive?.(item.id);
              } catch (err) {
                toast.error(t('wantList.toasts.failedToMarkAsPurchased'));
                console.error(err);
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('wantList.actions.purchased')}
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