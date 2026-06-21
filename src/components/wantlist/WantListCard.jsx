import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Share2, Edit2, ChevronDown, Archive } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function WantListCard({ item, onStatusChange, onArchive, onShare, onEdit }) {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const categoryLabel = {
    wishlist: t("wantList.categories.wish"),
    shopping_list: t("wantList.categories.shopping"),
    restock: t("wantList.categories.shopping"),
    tried_not_owned: t("wantList.categories.tried"),
    do_not_buy_again: t("wantList.categories.notForMe"),
  }[item.category] || "—";

  const isRestock = item.category === "restock";

  const typeLabel = {
    blend: t("wantList.itemTypes.tobaccoBlend"),
    pipe: t("wantList.itemTypes.pipe"),
    tobacco_bulk: t("wantList.itemTypes.bulkTobacco"),
    tobacco_tin: t("wantList.itemTypes.tinnedTobacco"),
    bottle: t("wantList.itemTypes.bottle"),
    accessory: t("wantList.itemTypes.accessory"),
  }[item.item_type] || item.item_type;

  const priorityColor = {
    low: "bg-blue-500/20 text-blue-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    high: "bg-red-500/20 text-red-400",
  }[item.priority || "medium"];

  const handleArchive = async () => {
    try {
      setIsLoading(true);
      await base44.entities.AcquisitionItem.update(item.id, { status: "archived" });
      toast.success(t("wantList.toasts.itemArchived"));
      onArchive?.(item.id);
    } catch {
      toast.error(t("wantList.toasts.failedToArchive"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = async (newCategory) => {
    try {
      setIsLoading(true);
      await base44.entities.AcquisitionItem.update(item.id, { category: newCategory });
      toast.success(t("wantList.toasts.updated"));
      onStatusChange?.(item.id, newCategory);
    } catch {
      toast.error(t("wantList.toasts.failedToUpdate"));
    } finally {
      setIsLoading(false);
    }
  };

  const isMuted = item.category === "do_not_buy_again";

  return (
    <div
      className={`border rounded-xl p-5 ${
        isMuted
          ? "bg-[rgba(255,255,255,0.03)] border-[#b48c4b]/15 opacity-60"
          : "bg-[rgba(255,255,255,0.05)] border-[#b48c4b]/25"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-[#F5F1E7] leading-snug break-words line-clamp-2">{item.name}</h3>
          {item.brand && <p className="text-sm text-[#D4A574]/80 mt-0.5">{item.brand}</p>}
          <p className="text-xs text-[#E0D8C8]/45 mt-1 uppercase tracking-wide">{typeLabel}</p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="text-xs font-medium text-[#D4A574]">{categoryLabel}</span>
          {isRestock && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(180,140,75,0.15)] text-[#D4A574]/80 border border-[rgba(180,140,75,0.2)]">
              {t("wantList.categories.restock")}
            </span>
          )}
          {item.priority && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priorityColor}`}>
              {item.priority}
            </span>
          )}
        </div>
      </div>

      {item.blend_name && (
        <p className="text-xs text-[#E0D8C8]/65 mb-1"><strong>{t("wantList.labels.blend")}:</strong> {item.blend_name}</p>
      )}
      {item.pipe_model && (
        <p className="text-xs text-[#E0D8C8]/65 mb-1"><strong>{t("wantList.labels.model")}:</strong> {item.pipe_model}</p>
      )}
      {item.notes && (
        <p className="text-xs text-[#E0D8C8]/55 italic mt-1">{item.notes}</p>
      )}

      <div className="flex gap-2 mt-4 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs h-8" disabled={isLoading}>
              {t("wantList.actions.move")}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[rgba(22,17,13,0.96)] border-[#b48c4b]/30">
            <DropdownMenuItem className="text-[#E0D8C8] hover:bg-white/10 focus:bg-white/10 focus:text-[#F5F1E7]" onClick={() => handleCategoryChange("wishlist")}>{t("wantList.categories.wish")}</DropdownMenuItem>
            <DropdownMenuItem className="text-[#E0D8C8] hover:bg-white/10 focus:bg-white/10 focus:text-[#F5F1E7]" onClick={() => handleCategoryChange("shopping_list")}>{t("wantList.categories.shopping")}</DropdownMenuItem>
            <DropdownMenuItem className="text-[#E0D8C8] hover:bg-white/10 focus:bg-white/10 focus:text-[#F5F1E7]" onClick={() => handleCategoryChange("tried_not_owned")}>{t("wantList.categories.tried")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[#E0D8C8] hover:bg-white/10 focus:bg-white/10 focus:text-[#F5F1E7]" onClick={() => handleCategoryChange("do_not_buy_again")}>{t("wantList.categories.notForMe")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {onEdit && (
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => onEdit(item)} disabled={isLoading}>
            <Edit2 className="w-3 h-3 mr-1" />
            {t("wantList.actions.edit")}
          </Button>
        )}

        <Button size="sm" variant="outline" className="text-xs h-8" onClick={handleArchive} disabled={isLoading}>
          <Archive className="w-3 h-3" />
        </Button>

        {onShare && (
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => onShare(item)} disabled={isLoading}>
            <Share2 className="w-3 h-3" />
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8 text-red-400"
          disabled={isLoading}
          onClick={async () => {
            try {
              setIsLoading(true);
              await base44.entities.AcquisitionItem.delete(item.id);
              toast.success(t("wantList.toasts.deleted"));
              onArchive?.(item.id);
            } catch {
              toast.error(t("wantList.toasts.failedToDelete"));
            } finally {
              setIsLoading(false);
            }
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}