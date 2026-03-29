import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import AcquisitionItemCard from "@/components/wantlist/AcquisitionItemCard";
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

const STATUS_TABS = {
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
};

export default function WantList() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", item_type: "blend", status: "wishlist" });
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addError, setAddError] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["acquisitionItems"],
    queryFn: async () => {
      return await base44.entities.AcquisitionItem.list("-created_date", 500);
    },
  });

  const filteredItems = useMemo(() => {
    let result = items.filter((item) => item.status !== "archived");

    const statusFilter = STATUS_TABS[activeTab];
    if (statusFilter) {
      result = result.filter((item) => item.status === statusFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "priority":
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const aPriority = priorityOrder[a.priority || "medium"] || 1;
          const bPriority = priorityOrder[b.priority || "medium"] || 1;
          return aPriority - bPriority;
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "type":
          return (a.item_type || "").localeCompare(b.item_type || "");
        case "recent":
        default:
          return new Date(b.created_date) - new Date(a.created_date);
      }
    });

    return result;
  }, [items, activeTab, sortBy]);

  const handleStatusChange = () => {
    queryClient.invalidateQueries({ queryKey: ["acquisitionItems"] });
  };

  const handleArchive = (itemId) => {
    queryClient.setQueryData(
      ["acquisitionItems"],
      items.filter((item) => item.id !== itemId)
    );
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim()) return;
    setIsAddingItem(true);
    setAddError("");
    try {
      await base44.entities.AcquisitionItem.create({
        name: newItem.name,
        item_type: newItem.item_type,
        status: newItem.status,
      });
      toast.success('Item added to Want List!');
      queryClient.invalidateQueries({ queryKey: ["acquisitionItems"] });
      setNewItem({ name: "", item_type: "blend", status: "wishlist" });
      setAddItemOpen(false);
    } catch (err) {
      const errorMsg = err?.message || "Failed to add item. Please try again.";
      setAddError(errorMsg);
      toast.error(errorMsg);
      console.error("Failed to add item:", err);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handlePurchase = async (item) => {
    try {
      await base44.entities.AcquisitionItem.update(item.id, { status: "archived" });
      toast.success('Marked as purchased!');
      queryClient.invalidateQueries({ queryKey: ["acquisitionItems"] });
    } catch (err) {
      toast.error('Failed to mark as purchased');
      console.error("Failed to mark as purchased:", err);
    }
  };

  const handleShare = (item) => {
    const text = `${item.name} (${item.item_type})`;
    if (navigator.share) {
      navigator.share({ title: "Want List", text });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
           <h1 className="text-3xl font-bold text-[#F5F1E7]">Want List</h1>
           <p className="text-[#E0D8C8]/60 mt-1">
              Track items you want to try, buy, or restock
            </p>
          </div>
          <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[rgba(22,17,13,0.96)] border-white/10">
              <DialogHeader>
                <DialogTitle>Add to Want List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-[#E0D8C8]">
                <div>
                  <label className="block text-sm font-medium mb-2">Item Name</label>
                  <Input
                   placeholder="e.g., Latakia Blend, Irish Whiskey"
                   value={newItem.name}
                   onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                   className="bg-[rgba(255,255,255,0.05)] border-[#b48c4b]/30 text-[#E0D8C8] placeholder-[#E0D8C8]/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <Select value={newItem.item_type} onValueChange={(v) => setNewItem({ ...newItem, item_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blend">Tobacco Blend</SelectItem>
                      <SelectItem value="pipe">Pipe</SelectItem>
                      <SelectItem value="bottle">Whiskey Bottle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Select value={newItem.status} onValueChange={(v) => setNewItem({ ...newItem, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wishlist">Wish List</SelectItem>
                      <SelectItem value="shopping_list">Shopping List</SelectItem>
                      <SelectItem value="restock">Restock</SelectItem>
                      <SelectItem value="tried_not_owned">Tried (Not Owned)</SelectItem>
                      <SelectItem value="do_not_buy_again">Not for Me</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {addError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
                    {addError}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setAddItemOpen(false)} disabled={isAddingItem}>Cancel</Button>
                  <Button onClick={handleAddItem} disabled={!newItem.name.trim() || isAddingItem}>
                    {isAddingItem ? "Adding..." : "Add Item"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="wishlist" className="text-xs sm:text-sm">Wish List</TabsTrigger>
            <TabsTrigger value="shopping_list" className="text-xs sm:text-sm">Shopping</TabsTrigger>
            <TabsTrigger value="restock" className="text-xs sm:text-sm">Restock</TabsTrigger>
            <TabsTrigger value="tried" className="text-xs sm:text-sm">Tried</TabsTrigger>
            <TabsTrigger value="notforme" className="text-xs sm:text-sm">Not For Me</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
               <div className="text-[#E0D8C8]/50">Loading...</div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#E0D8C8]/50">No items in this category</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredItems.map((item) => (
                  <AcquisitionItemCard
                    key={item.id}
                    item={item}
                    onStatusChange={handleStatusChange}
                    onArchive={handleArchive}
                    onShare={handleShare}
                    onPurchase={handlePurchase}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}