import { base44 } from "@/api/base44Client";

export function useWantListActions() {
  const addToWantList = async (item) => {
    return await base44.entities.AcquisitionItem.create({
      name: item.name,
      item_type: item.item_type,
      status: "wishlist",
      priority: item.priority || "medium",
      notes: item.notes,
      estimated_price: item.estimated_price,
    });
  };

  const addToShoppingList = async (item) => {
    return await base44.entities.AcquisitionItem.create({
      name: item.name,
      item_type: item.item_type,
      status: "shopping_list",
      priority: item.priority || "medium",
      notes: item.notes,
      estimated_price: item.estimated_price,
    });
  };

  const addRestock = async (collectionItem) => {
    return await base44.entities.AcquisitionItem.create({
      name: collectionItem.name,
      item_type: collectionItem.item_type,
      status: "restock",
      priority: "medium",
      notes: `Restock: ${collectionItem.name}`,
    });
  };

  const markNotForMe = async (item, reason) => {
    return await base44.entities.AcquisitionItem.update(item.id, {
      status: "do_not_buy_again",
      notes: reason ? `Not for me: ${reason}` : item.notes,
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

  const markPurchased = async (itemId, date) => {
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
      notes: `Linked to collection record`,
    });
  };

  return {
    addToWantList,
    addToShoppingList,
    addRestock,
    markNotForMe,
    updateStatus,
    updatePriority,
    updateNotes,
    markPurchased,
    archiveItem,
    linkToCollection,
  };
}