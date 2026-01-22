import { base44 } from "@/api/base44Client";

export async function canCreatePipe(userEmail, freePipeLimit) {
  try {
    const pipes = await base44.entities.Pipe.filter({ created_by: userEmail });
    const count = pipes?.length || 0;
    return count < freePipeLimit;
  } catch (err) {
    console.warn("Failed to check pipe limit:", err);
    return false;
  }
}

export async function canCreateTobacco(userEmail, freeTobaccoLimit) {
  try {
    const tobaccos = await base44.entities.TobaccoBlend.filter({ created_by: userEmail });
    const count = tobaccos?.length || 0;
    return count < freeTobaccoLimit;
  } catch (err) {
    console.warn("Failed to check tobacco limit:", err);
    return false;
  }
}

export async function canAddPhoto(currentPhotoCount, freePhotoLimit) {
  return currentPhotoCount < freePhotoLimit;
}

export async function canCreateSmokingLog(userEmail, freeLogLimit) {
  try {
    const logs = await base44.entities.SmokingLog.filter({ created_by: userEmail });
    const count = logs?.length || 0;
    return count < freeLogLimit;
  } catch (err) {
    console.warn("Failed to check smoking log limit:", err);
    return false;
  }
}