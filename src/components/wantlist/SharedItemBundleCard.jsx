import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWantListActions } from "./useWantListActions";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function SharedItemBundleCard({
  bundle,
  onAccept,
  onDismiss,
}) {
  const [selectedItems, setSelectedItems] = useState(
    bundle.items.map((_, i) => i)
  );
  const { addToWantList, addToShoppingList } = useWantListActions();
  const { t } = useTranslation();

  const toggleItem = (index) => {
    setSelectedItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleAddAllToWantList = async () => {
    for (const item of bundle.items) {
      await addToWantList({
        ...item,
        source_type: "shared",
        shared_by_user_id: bundle.sender_user_id,
      });
    }
    onAccept?.();
  };

  const handleAddSelectedToWantList = async () => {
    for (const index of selectedItems) {
      const item = bundle.items[index];
      await addToWantList({
        ...item,
        source_type: "shared",
        shared_by_user_id: bundle.sender_user_id,
      });
    }
    onAccept?.();
  };

  const handleAddAllToShoppingList = async () => {
    for (const item of bundle.items) {
      await addToShoppingList({
        ...item,
        source_type: "shared",
        shared_by_user_id: bundle.sender_user_id,
        status: "shopping_list",
      });
    }
    onAccept?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t("wantList.sharedBundle.sharedItemsWithYou", { sender: bundle.sender_user_id })}
        </CardTitle>
        {bundle.message && (
          <p className="text-sm text-gray-600 mt-2">{bundle.message}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {bundle.items.map((item, index) => (
            <label key={index} className="flex items-center gap-3 p-2 border rounded">
              <input
                type="checkbox"
                checked={selectedItems.includes(index)}
                onChange={() => toggleItem(index)}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-gray-600">{item.brand_or_maker}</p>
              </div>
              <span className="text-xs text-gray-500">{item.item_type}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t">
          <Button onClick={handleAddAllToWantList} className="w-full">
            {t("wantList.sharedBundle.addAllToWantList")}
          </Button>
          {selectedItems.length > 0 && selectedItems.length < bundle.items.length && (
            <Button onClick={handleAddSelectedToWantList} variant="outline" className="w-full">
              {t("wantList.sharedBundle.addSelectedToWantList")}
            </Button>
          )}
          <Button onClick={handleAddAllToShoppingList} variant="outline" className="w-full">
            {t("wantList.sharedBundle.addAllToShoppingList")}
          </Button>
          <Button onClick={() => onDismiss?.()} variant="ghost" className="w-full">
            {t("wantList.prompts.dismiss")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}