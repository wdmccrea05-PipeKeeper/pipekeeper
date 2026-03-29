import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import AcquisitionItemCard from "@/components/wantlist/AcquisitionItemCard";
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
          return (
            priorityOrder[a.priority] - priorityOrder[b.priority]
          );
        case "name":
          return a.name.localeCompare(b.name);
        case "type":
          return a.item_type.localeCompare(b.item_type);
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

  const handlePurchase = (item) => {
    // Trigger add flow with prefilled data
    // This will be connected to the Add Item flow
    console.log("Purchase flow for:", item);
  };

  const handleShare = (item) => {
    console.log("Share item:", item);
  };

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Want List</h1>
            <p className="text-gray-600 mt-1">
              Track items you want to try, buy, or restock
            </p>
          </div>
          <Button onClick={() => console.log("Add new item")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
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
                  className={sortBy === key ? "bg-gray-100" : ""}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="wishlist">Wish List</TabsTrigger>
            <TabsTrigger value="shopping_list">Shopping</TabsTrigger>
            <TabsTrigger value="restock">Restock</TabsTrigger>
            <TabsTrigger value="tried">Tried</TabsTrigger>
            <TabsTrigger value="notforme">Not for Me</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No items in this category</p>
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