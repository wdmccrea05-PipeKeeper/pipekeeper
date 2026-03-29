import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search as SearchIcon } from "lucide-react";
import WantListCard from "@/components/wantlist/WantListCard";
import WantListSearch from "@/components/wantlist/WantListSearch";
import ManualAddModal from "@/components/wantlist/ManualAddModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CATEGORY_TABS = {
  all: null,
  wishlist: "wishlist",
  shopping_list: "shopping_list",
  restock: "restock",
  tried: "tried_not_owned",
  notforme: "do_not_buy_again",
};

const SORT_OPTIONS = {
  recent: "Recently Added",
  priority: "Priority",
  name: "Name",
  type: "Type",
  price: "Target Price",
};

export default function WantList() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [searchText, setSearchText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["acquisitionItems"],
    queryFn: async () => {
      const all = await base44.entities.AcquisitionItem.list("-created_date", 500);
      return all.filter((i) => i.status !== "archived");
    },
  });

  const filteredItems = useMemo(() => {
    let result = items;

    // Category filter
    const categoryFilter = CATEGORY_TABS[activeCategory];
    if (categoryFilter) {
      result = result.filter((item) => item.category === categoryFilter);
    }

    // Search filter
    if (searchText) {
      const search_lower = searchText.toLowerCase();
      result = result.filter(
        (item) =>
          (item.name || "").toLowerCase().includes(search_lower) ||
          (item.brand || "").toLowerCase().includes(search_lower) ||
          (item.blend_name || "").toLowerCase().includes(search_lower) ||
          (item.notes || "").toLowerCase().includes(search_lower)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "priority": {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const aPriority = priorityOrder[a.priority || "medium"] || 1;
          const bPriority = priorityOrder[b.priority || "medium"] || 1;
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
          return new Date(b.created_date) - new Date(a.created_date);
      }
    });

    return result;
  }, [items, activeCategory, searchText, sortBy]);

  const handleAddSuccess = () => {
    setAddOpen(false);
    queryClient.invalidateQueries({ queryKey: ["acquisitionItems"] });
  };

  const handleStatusChange = () => {
    queryClient.invalidateQueries({ queryKey: ["acquisitionItems"] });
  };

  const handleArchive = (itemId) => {
    queryClient.setQueryData(
      ["acquisitionItems"],
      items.filter((item) => item.id !== itemId)
    );
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleShare = (item) => {
    const text = `${item.name}${item.brand ? ` by ${item.brand}` : ""} - ${item.item_type}`;
    if (navigator.share) {
      navigator.share({ title: "Want List", text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
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
      toast.error("Select items to share");
      return;
    }
    const selectedList = items.filter((item) => selectedItems.has(item.id));
    const text = selectedList.map((item) => `${item.name}${item.brand ? ` by ${item.brand}` : ""}`).join("\n");
    if (navigator.share) {
      navigator.share({ title: "Want List Items", text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#F5F1E7]">Want List</h1>
            <p className="text-[#E0D8C8]/60 mt-1">
              Track items you want to try, buy, or restock
            </p>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[rgba(22,17,13,0.96)] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add to Want List</DialogTitle>
              </DialogHeader>
              <WantListSearch
                onSelect={(data) => {
                  base44.entities.AcquisitionItem.create(data)
                    .then(() => {
                      toast.success("Item added");
                      handleAddSuccess();
                    })
                    .catch((err) => {
                      toast.error("Failed to add");
                      console.error(err);
                    });
                }}
                onManualAdd={(query) => {
                  setManualQuery(query);
                  setAddOpen(false);
                  setManualOpen(true);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-[#D4A574]/50" />
              <Input
                placeholder="Search items..."
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
                Sort: {SORT_OPTIONS[sortBy]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(SORT_OPTIONS).map(([key, label]) => (
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
              Share ({selectedItems.size})
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="wishlist" className="text-xs sm:text-sm">Wish</TabsTrigger>
            <TabsTrigger value="shopping_list" className="text-xs sm:text-sm">Shopping</TabsTrigger>
            <TabsTrigger value="restock" className="text-xs sm:text-sm">Restock</TabsTrigger>
            <TabsTrigger value="tried" className="text-xs sm:text-sm">Tried</TabsTrigger>
            <TabsTrigger value="notforme" className="text-xs sm:text-sm">Not For Me</TabsTrigger>
          </TabsList>

          <TabsContent value={activeCategory} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-[#E0D8C8]/50">Loading...</div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#E0D8C8]/50">No items in this category</p>
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
                      <WantListCard
                        item={item}
                        onStatusChange={handleStatusChange}
                        onArchive={handleArchive}
                        onShare={handleShare}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Manual Add Modal */}
      <ManualAddModal
        isOpen={manualOpen}
        onClose={() => {
          setManualOpen(false);
          setManualQuery("");
        }}
        onSuccess={() => {
          setManualOpen(false);
          setManualQuery("");
          handleAddSuccess();
        }}
        initialQuery={manualQuery}
      />
    </div>
  );
}