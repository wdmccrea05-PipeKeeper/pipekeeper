import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

export async function createAcquisitionItem(req, data) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    return { error: 'Unauthorized' };
  }

  return await base44.entities.AcquisitionItem.create({
    ...data,
    created_by: user.email,
  });
}

export async function getUserWantList(req, filters = {}) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const query = { created_by: user.email };
  
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }

  if (filters.item_type) {
    query.item_type = filters.item_type;
  }

  return await base44.entities.AcquisitionItem.filter(query, '-created_date', 500);
}

export async function linkAcquisitionToPurchase(req, acquisitionItemId, collectionRecordId) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    return { error: 'Unauthorized' };
  }

  return await base44.entities.AcquisitionItem.update(acquisitionItemId, {
    matched_collection_record_id: collectionRecordId,
    status: 'purchased',
    purchased_date: new Date().toISOString().split('T')[0],
  });
}

export async function createSharedBundle(req, data) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    return { error: 'Unauthorized' };
  }

  return await base44.entities.SharedItemBundle.create({
    ...data,
    sender_user_id: user.email,
  });
}