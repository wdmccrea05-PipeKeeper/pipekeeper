import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

function normalizeItemType(itemType) {
  if (!itemType) return "blend";
  if (itemType === "tobacco_bulk" || itemType === "tobacco_tin") return "blend";
  return itemType;
}

function buildBasePayload(item, userEmail) {
  const normalizedType = normalizeItemType(item?.item_type);

  return {
    name: item?.name || "Item",
    item_type: normalizedType,
    brand:
      item?.brand ||
      item?.brand_or_maker ||
      item?.manufacturer ||
      item?.maker ||
      item?.distillery ||
      "",
    blend_name: normalizedType === "blend" ? item?.blend_name || item?.name || undefined : undefined,
    pipe_model: normalizedType === "pipe" ? item?.pipe_model || item?.model || undefined : undefined,
    notes: item?.notes || "",
    estimated_price: item?.estimated_price,
    priority: item?.priority || "medium",
    is_manual: item?.is_manual === true,
    created_by: userEmail || undefined,
  };
}

export function useWantListActions() {
  const { user } = useCurrentUser();
  const userEmail = user?.email || null;

  const addToWantList = async (item) => {
    return await base44.entities.AcquisitionItem.create({
      ...buildBasePayload(item, userEmail),
      category: "wishlist",
      status: "active",
    });
  };

  const addToShoppingList = async (item) => {
    return await base44.entities.AcquisitionItem.create({
      ...buildBasePayload(item, userEmail),
      category: "shopping_list",
      status: "active",
    });
  };

  const addTriedNotOwned = async (item) => {
    return await base44.entities.AcquisitionItem.create({
      ...buildBasePayload(item, userEmail),
      category: "tried_not_owned",
      status: "active",
    });
  };

  const addRestock = async (collectionItem) => {
    return await base44.entities.AcquisitionItem.create({
      ...buildBasePayload(collectionItem, userEmail),
      category: "restock",
      status: "active",
      notes: collectionItem?.notes || `Restock: ${collectionItem?.name || "Item"}`,
    });
  };

  const markNotForMe = async (item, reason) => {
    const noteText = reason
      ? `Not for me: ${reason}`
      : item?.notes || "Not for me";

    if (item?.id) {
      return await base44.entities.AcquisitionItem.update(item.id, {
        category: "do_not_buy_again",
        status: "active",
        notes: noteText,
      });
    }

    return await base44.entities.AcquisitionItem.create({
      ...buildBasePayload(item, userEmail),
      category: "do_not_buy_again",
      status: "active",
      notes: noteText,
    });
  };

  const updateStatus = async (itemId, newStatus) => {
    return await base44.entities.AcquisitionItem.update(itemId, {
      status: newStatus,
    });
  };

  const updatePriority = async (itemId, priority) => {
    return await base44.entities.AcquisitionItem.update(itemId, {
      priority,
    });
  };

  const updateNotes = async (itemId, notes) => {
    return await base44.entities.AcquisitionItem.update(itemId, {
      notes,
    });
  };

  const markPurchased = async (itemId) => {
    return await base44.entities.AcquisitionItem.update(itemId, {
      status: "archived",
    });
  };

  const archiveItem = async (itemId) => {
    return await base44.entities.AcquisitionItem.update(itemId, {
      status: "archived",
    });
  };

  const linkToCollection = async (itemId, collectionRecordId) => {
    return await base44.entities.AcquisitionItem.update(itemId, {
      status: "archived",
      notes: `Linked to collection: ${collectionRecordId}`,
    });
  };

  const createFromIdentification = async (identificationData) => {
    return await base44.entities.AcquisitionItem.create({
      ...buildBasePayload(
        {
          ...identificationData,
          item_type: identificationData?.item_type || "blend",
          is_manual: false,
        },
        userEmail
      ),
      category: "wishlist",
      status: "active",
    });
  };

  return {
    addToWantList,
    addToShoppingList,
    addTriedNotOwned,
    addRestock,
    markNotForMe,
    updateStatus,
    updatePriority,
    updateNotes,
    markPurchased,
    archiveItem,
    linkToCollection,
    createFromIdentification,
  };
}