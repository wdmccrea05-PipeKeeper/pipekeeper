import { differenceInMonths } from "date-fns";

export const getAgingRecommendation = (blend) => {
  const dates = [
    blend.tin_cellared_date,
    blend.bulk_cellared_date,
    blend.pouch_cellared_date
  ].filter(Boolean);
  
  const timestamps = dates.map(d => new Date(d).getTime()).filter(ts => !isNaN(ts));
  const oldestDate = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
  
  if (!oldestDate) return null;
  
  const now = new Date();
  const months = differenceInMonths(now, oldestDate);
  const potential = blend.aging_potential;
  
  if (!potential) return null;
  
  if (potential === "Excellent") {
    if (months < 6) return { messageKey: "tobacconist.agingExcellentYoung", color: "blue" };
    if (months < 24) return { messageKey: "tobacconist.agingExcellentDeveloping", color: "yellow" };
    return { messageKey: "tobacconist.agingExcellentPeak", color: "green" };
  }
  
  if (potential === "Good") {
    if (months < 3) return { messageKey: "tobacconist.agingGoodYoung", color: "blue" };
    if (months < 12) return { messageKey: "tobacconist.agingGoodDeveloping", color: "yellow" };
    return { messageKey: "tobacconist.agingGoodPeak", color: "green" };
  }
  
  if (potential === "Fair") {
    if (months < 3) return { messageKey: "tobacconist.agingFairYoung", color: "blue" };
    return { messageKey: "tobacconist.agingFairReady", color: "green" };
  }
  
  if (potential === "Poor") {
    return { messageKey: "tobacconist.agingBestFresh", color: "green" };
  }

  return { messageKey: "tobacconist.agingBestFresh", color: "green" };
};