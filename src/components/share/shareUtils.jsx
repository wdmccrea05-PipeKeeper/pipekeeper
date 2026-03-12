import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Generate a unique share token
 */
export function generateShareToken() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Create or get a share record for a given item
 */
export async function createOrGetShareRecord(
  moduleType,
  recordId,
  ownerEmail,
  shareConfig = {}
) {
  try {
    // Check if a share already exists for this record
    const existing = await base44.entities.SharedRecord.filter({
      module_type: moduleType,
      record_id: recordId,
      owner_email: ownerEmail,
      is_active: true
    });

    if (existing && existing.length > 0) {
      return existing[0];
    }

    // Create a new share record
    const shareToken = generateShareToken();
    const shareRecord = await base44.entities.SharedRecord.create({
      module_type: moduleType,
      record_id: recordId,
      owner_email: ownerEmail,
      share_token: shareToken,
      is_active: true,
      include_photos: shareConfig.include_photos !== false,
      include_notes: shareConfig.include_notes === true,
      include_value: shareConfig.include_value === true,
      include_inventory: shareConfig.include_inventory === true,
      share_config: shareConfig
    });

    return shareRecord;
  } catch (error) {
    console.error('Failed to create share record:', error);
    throw error;
  }
}

/**
 * Update share configuration for an existing share
 */
export async function updateShareConfig(shareRecordId, config) {
  try {
    return await base44.entities.SharedRecord.update(shareRecordId, {
      include_photos: config.include_photos,
      include_notes: config.include_notes,
      include_value: config.include_value,
      include_inventory: config.include_inventory,
      share_config: config
    });
  } catch (error) {
    console.error('Failed to update share config:', error);
    throw error;
  }
}

/**
 * Deactivate a share record
 */
export async function deactivateShare(shareRecordId) {
  try {
    return await base44.entities.SharedRecord.update(shareRecordId, {
      is_active: false
    });
  } catch (error) {
    console.error('Failed to deactivate share:', error);
    throw error;
  }
}

/**
 * Get a share record by token
 */
export async function getShareByToken(token) {
  try {
    const shares = await base44.entities.SharedRecord.filter({
      share_token: token,
      is_active: true
    });
    return shares && shares.length > 0 ? shares[0] : null;
  } catch (error) {
    console.error('Failed to get share by token:', error);
    return null;
  }
}

/**
 * Generate public share URL
 */
export function generatePublicShareUrl(moduleType, shareToken) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/share/${moduleType}/${shareToken}`;
}

/**
 * Copy share URL to clipboard
 */
export async function copyShareUrlToClipboard(moduleType, shareToken) {
  try {
    const url = generatePublicShareUrl(moduleType, shareToken);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy URL:', error);
    return false;
  }
}

/**
 * Export share card as image using html2canvas
 */
export async function exportShareCardAsImage(cardElement, fileName = 'share-card.png') {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(cardElement, {
      scale: 2,
      backgroundColor: '#0f0b08',
      logging: false,
      useCORS: true
    });
    
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = fileName;
    link.click();
    
    return true;
  } catch (error) {
    console.error('Failed to export share card:', error);
    return false;
  }
}

/**
 * Trigger native share if available
 */
export async function triggerNativeShare(title, text, blob = null) {
  if (!navigator.share) {
    return false;
  }

  try {
    if (blob) {
      const file = new File([blob], 'share-card.png', { type: 'image/png' });
      await navigator.share({
        title,
        text,
        files: [file]
      });
    } else {
      await navigator.share({
        title,
        text
      });
    }
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Native share failed:', error);
    }
    return false;
  }
}