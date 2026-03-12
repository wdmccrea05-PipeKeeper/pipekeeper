import { base44 } from "@/api/base44Client";

export function generateShareToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function createOrGetShareRecord(moduleType, recordId, ownerEmail, shareConfig = {}) {
  const existing = await base44.entities.SharedRecord.filter({
    module_type: moduleType,
    record_id: recordId,
    owner_email: ownerEmail,
    is_active: true,
  });

  if (Array.isArray(existing) && existing.length > 0) {
    const first = existing[0];
    const desired = {
      include_photos: shareConfig.include_photos !== false,
      include_notes: shareConfig.include_notes === true,
      include_value: shareConfig.include_value === true,
      include_inventory: shareConfig.include_inventory === true,
      share_config: shareConfig,
    };
    const needsUpdate = ["include_photos", "include_notes", "include_value", "include_inventory"].some((k) => first[k] !== desired[k]);
    if (needsUpdate) {
      return await base44.entities.SharedRecord.update(first.id, desired);
    }
    return first;
  }

  return await base44.entities.SharedRecord.create({
    module_type: moduleType,
    record_id: recordId,
    owner_email: ownerEmail,
    share_token: generateShareToken(),
    is_active: true,
    include_photos: shareConfig.include_photos !== false,
    include_notes: shareConfig.include_notes === true,
    include_value: shareConfig.include_value === true,
    include_inventory: shareConfig.include_inventory === true,
    share_config: shareConfig,
  });
}

export async function updateShareConfig(shareRecordId, config) {
  return await base44.entities.SharedRecord.update(shareRecordId, {
    include_photos: config.include_photos,
    include_notes: config.include_notes,
    include_value: config.include_value,
    include_inventory: config.include_inventory,
    share_config: config,
  });
}

export async function getShareByToken(token) {
  const shares = await base44.entities.SharedRecord.filter({ share_token: token, is_active: true });
  return Array.isArray(shares) && shares.length > 0 ? shares[0] : null;
}

export function generatePublicShareUrl(moduleType, shareToken) {
  return `${window.location.origin}/share/${moduleType}/${shareToken}`;
}

export async function copyShareUrlToClipboard(moduleType, shareToken) {
  try {
    const url = generatePublicShareUrl(moduleType, shareToken);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error("Failed to copy URL:", error);
    return false;
  }
}

export async function exportShareCardAsImage(cardElement, fileName = "share-card.png") {
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(cardElement, {
      scale: 2,
      backgroundColor: "#0f0b08",
      logging: false,
      useCORS: true,
    });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = fileName;
    link.click();
    return true;
  } catch (error) {
    console.error("Failed to export share card:", error);
    return false;
  }
}
