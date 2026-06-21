import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search as SearchIcon } from "lucide-react";
import ShoppingListCard from "@/components/shoppinglist/ShoppingListCard";
import ShoppingListSearch from "@/components/shoppinglist/ShoppingListSearch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function ShoppingList() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const userEmail = user?.email || null;

  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [searchText, setSearchText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  const sortOptions = {
    recent: t("shoppingList.sort.recent"),
    priority: t("shoppingList.sort.priority"),
    name: t("shoppingList.sort.name"),
    type: t("shoppingList.sort.type"),
    price: t("shoppingList.sort.price"),
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["shoppingListItems", userEmail],
    enabled: !!userEmail,
    queryFn: async () => {
      const rows = await base44.entities.ShoppingListItem
        .filter({ created_by: userEmail }, "-created_date", 500)
        .catch(() => []);
      return (rows || []).filter((i) => i.status !== "archived");
    },
  });

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (activeTab === "restock") {
      result = result.filter((item) => item.shopping_type === "restock");
    } else if (activeTab === "buy_new") {
      result = result.filter((item) => item.shopping_type === "buy_new_item");
    }

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(
        (item) =>
          (item.name || "").toLowerCase().includes(searchLower) ||
          (item.brand || "").toLowerCase().includes(searchLower) ||
          (item.blend_name || "").toLowerCase().includes(searchLower) ||
          (item.notes || "").toLowerCase().includes(searchLower)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "priority": {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const aPriority = priorityOrder[a.priority || "medium"] ?? 1;
          const bPriority = priorityOrder[b.priority || "medium"] ?? 1;
          return aPriority - bPriority;
        }
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "type":
          return (a.item_type || "").localeCompare(b.item_type || "");
        case "price":
          return (a.target_price || 0) - (b.target_price || 0);
        case "recent":
        default:
          return new Date(b.created_date || 0) - new Date(a.created_date || 0);
      }
    });

    return result;
  }, [items, activeTab, searchText, sortBy]);

  const handleAddSuccess = () => {
    setAddOpen(false);
    queryClient.invalidateQueries({ queryKey: ["shoppingListItems", userEmail] });
  };

  const handleStatusChange = () => {
    queryClient.invalidateQueries({ queryKey: ["shoppingListItems", userEmail] });
  };

  const handleArchive = (itemId) => {
    queryClient.setQueryData(
      ["shoppingListItems", userEmail],
      items.filter((item) => item.id !== itemId)
    );
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleSelectItem = (itemId) => {
    const next = new Set(selectedItems);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelectedItems(next);
  };

  const handleMultiShare = () => {
    if (selectedItems.size === 0) {
      toast.error(t("shoppingList.toasts.selectItemsToShare"));
      return;
    }

    const selectedList = items.filter((item) => selectedItems.has(item.id));
    const text = selectedList
      .map((item) => `${item.name}${item.brand ? ` by ${item.brand}` : ""}`)
      .join("\n");

    if (navigator.share) {
      navigator.share({ title: t("shoppingList.page.title"), text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success(t("shoppingList.toasts.copiedToClipboard"));
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#F5F1E7]">{t("shoppingList.page.title")}</h1>
            <p className="text-[#E0D8C8]/60 mt-1">
              {t("shoppingList.page.subtitle")}
            </p>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t("shoppingList.page.addItem")}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[rgba(22,17,13,0.96)] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("shoppingList.page.addToShoppingList")}</DialogTitle>
              </DialogHeader>
              <ShoppingListSearch onAdded={handleAddSuccess} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-[#D4A574]/50" />
              <Input
                placeholder={t("shoppingList.page.searchPlaceholder")}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                {t("shoppingList.page.sortLabel", { option: sortOptions[sortBy] })}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(sortOptions).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={sortBy === key ? "bg-[#b48c4b]/20" : ""}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedItems.size > 0 && (
            <Button variant="outline" size="sm" onClick={handleMultiShare}>
              {t("shoppingList.page.shareCount", { count: selectedItems.size })}
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all">{t("shoppingList.tabs.all")}</TabsTrigger>
            <TabsTrigger value="restock">{t("shoppingList.tabs.restock")}</TabsTrigger>
            <TabsTrigger value="buy_new">{t("shoppingList.tabs.buyNewItem")}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {!userEmail ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-[#E0D8C8]/50">{t("shoppingList.page.loading")}</div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-[#E0D8C8]/50">{t("shoppingList.page.loading")}</div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#E0D8C8]/50">{t("shoppingList.page.emptyCategory")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`relative ${
                      selectedItems.has(item.id) ? "ring-2 ring-[#D4A574] rounded-lg" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="absolute top-4 left-4 w-4 h-4 cursor-pointer z-10"
                    />
                    <div className={selectedItems.has(item.id) ? "pl-10" : ""}>
                      <ShoppingListCard
                        item={item}
                        onStatusChange={handleStatusChange}
                        onArchive={handleArchive}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}