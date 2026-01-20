import { differenceInMonths } from "date-fns";

export const getAgingRecommendation = (blend) => {
  const dates = [
    blend.tin_cellared_date,
    blend.bulk_cellared_date,
    blend.pouch_cellared_date
  ].filter(Boolean);
  
  const oldestDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => new Date(d)))) : null;
  
  if (!oldestDate) return null;
  
  const now = new Date();
  const months = differenceInMonths(now, oldestDate);
  const potential = blend.aging_potential;
  
  if (!potential) return null;
  
  if (potential === "Excellent") {
    if (months < 6) return { message: "Early stage - best after 1-2 years", color: "blue" };
    if (months < 24) return { message: "Developing nicely - continue aging", color: "yellow" };
    return { message: "Peak aging achieved!", color: "green" };
  }
  
  if (potential === "Good") {
    if (months < 3) return { message: "Early stage - best after 6-12 months", color: "blue" };
    if (months < 12) return { message: "Coming along well", color: "yellow" };
    return { message: "Ready to enjoy!", color: "green" };
  }
  
  if (potential === "Fair") {
    if (months < 3) return { message: "Brief aging may help", color: "blue" };
    return { message: "Ready - minimal aging benefit", color: "green" };
  }
  
  return { message: "Best smoked fresh", color: "green" };
};