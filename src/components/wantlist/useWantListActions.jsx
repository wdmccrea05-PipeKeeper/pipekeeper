import { base44 } from "@/api/base44Client";

export function useWantListActions() {
  const addToWantList = async (item) => {
    return await base44.entities.AcquisitionItem.create({
      item_type: item.item_type,
      name: item.name,
      brand_or_maker: item.brand_or_maker,
      status: "wishlist",
      priority: "medium",
      source_type: item.source_type || "manual",
      source_record_id: item.source_record_id,
      image: item.image,
      notes: item.notes,
      blend_type: item.blend_type,
      cut: item.cut,
      strength: item.strength,
      components: item.components,
      distillery: item.distillery,
      proof: item.proof,
      age: item.age,
      bottle_category: item.bottle_category,
      pipe_maker: item.pipe_maker,
      pipe_model: item.pipe_model,
      pipe_shape: item.pipe_shape,
      pipe_finish: item.pipe_finish,
      pipe_material: item.pipe_material,
    });
  };

  const addToShoppingList = async (item) => {
    return await base44.entities.AcquisitionItem.create({
      ...item,
      status: "shopping_list",
      priority: item.priority || "medium",
      source_type: item.source_type || "manual",
    });
  };

  const addRestock = async (collectionItem) => {
    return await base44.entities.AcquisitionItem.create({
      item_type: collectionItem.item_type,
      name: collectionItem.name,
      brand_or_maker: collectionItem.brand_or_maker,
      status: "restock",
      priority: "medium",
      source_type: "restock",
      source_record_id: collectionItem.id,
      image: collectionItem.image,
      blend_type: collectionItem.blend_type,
      distillery: collectionItem.distillery,
      proof: collectionItem.proof,
      age: collectionItem.age,
      bottle_category: collectionItem.bottle_category,
      pipe_maker: collectionItem.pipe_maker,
      pipe_shape: collectionItem.pipe_shape,
    });
  };

  const markNotForMe = async (item, reason) => {
    return await base44.entities.AcquisitionItem.create({
      ...item,
      status: "do_not_buy_again",
      reason,
      source_type: item.source_type || "manual",
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
      status: "purchased",
      purchased_date: date,
    });
  };

  const archiveItem = async (itemId) => {
    return await base44.entities.AcquisitionItem.update(itemId, {
      status: "archived",
    });
  };

  const linkToCollection = async (itemId, collectionRecordId) => {
    return await base44.entities.AcquisitionItem.update(itemId, {
      matched_collection_record_id: collectionRecordId,
      status: "purchased",
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