/**
 * proactiveInsights.jsx
 * 
 * Proactive Intelligence Generator for Collection Curator "For You" panel.
 * Analyzes user collection and generates actionable insights across modules.
 */

import { filterAiEligibleItems } from "./aiEligibility";

/**
 * Generate proactive insights from collection data
 * @param {Object} params
 * @param {Array} params.pipes - User's pipe collection
 * @param {Array} params.blends - User's tobacco blends
 * @param {Array} params.pairings - Pairing matrix data
 * @param {Object} params.latestLogByPipe - Map of pipe_id to latest log date
 * @returns {Array} - Array of insight objects
 */
export function generateProactiveInsights({ pipes = [], blends = [], pairings = [], latestLogByPipe = {} }) {
  const insights = [];
  
  // Filter AI-eligible items only
  const eligiblePipes = filterAiEligibleItems(pipes);
  const eligibleBlends = filterAiEligibleItems(blends);
  
  // Rotation insights
  const rotationInsight = generateRotationInsight(eligiblePipes, latestLogByPipe);
  if (rotationInsight) insights.push(rotationInsight);
  
  // Diversity insights
  const diversityInsight = generateDiversityInsight(eligibleBlends);
  if (diversityInsight) insights.push(diversityInsight);
  
  // Collection health
  const healthInsight = generateCollectionHealthInsight(eligiblePipes, eligibleBlends);
  if (healthInsight) insights.push(healthInsight);
  
  // Sort by severity (high → medium → low)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => {
    const aSev = severityOrder[a.severity] ?? 3;
    const bSev = severityOrder[b.severity] ?? 3;
    return aSev - bSev;
  });
  
  return insights.slice(0, 3); // Max 3 insights
}

function generateRotationInsight(pipes, latestLogByPipe) {
  if (!pipes?.length) return null;
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const stale = pipes.filter(p => {
    const lastLog = latestLogByPipe[p.id];
    if (!lastLog) return true; // Never used
    const logDate = new Date(lastLog);
    return logDate < thirtyDaysAgo;
  });
  
  if (stale.length === 0) return null;
  
  return {
    id: `rotation-${Date.now()}`,
    category: "rotation",
    severity: stale.length > 3 ? "high" : "medium",
    scope: "pipe",
    title: `${stale.length} pipe${stale.length > 1 ? 's' : ''} need rotation`,
    summary: `${stale.length} pipe${stale.length > 1 ? 's' : ''} haven't been used in the last 30 days.`,
    reason: "Regular rotation prevents pipes from sitting unused and helps you enjoy your full collection.",
    suggested_action: "Consider scheduling these pipes into your rotation over the next few weeks.",
    whatif_prompt: `I have ${stale.length} pipes that haven't been used in 30+ days. How should I work them back into my rotation?`,
  };
}

function generateDiversityInsight(blends) {
  if (!blends?.length) return null;
  
  const blendTypes = new Set(blends.map(b => b?.blend_type).filter(Boolean));
  
  if (blendTypes.size >= 4) return null; // Good diversity
  
  if (blends.length >= 5 && blendTypes.size < 3) {
    return {
      id: `diversity-${Date.now()}`,
      category: "diversity",
      severity: "medium",
      scope: "tobacco",
      title: "Limited cellar diversity",
      summary: "Your tobacco collection focuses heavily on a few blend types.",
      reason: "Expanding blend diversity improves pairing options and keeps your rotation interesting.",
      suggested_action: "Consider adding Virginia, Balkan, or English blends to broaden your cellar.",
      whatif_prompt: "What blend types should I add to improve my cellar diversity?",
    };
  }
  
  return null;
}

function generateCollectionHealthInsight(pipes, blends) {
  if (!pipes?.length && !blends?.length) {
    return {
      id: `health-empty-${Date.now()}`,
      category: "collection_health",
      severity: "low",
      scope: "cross_module",
      title: "Start your collection",
      summary: "Your collection is ready to grow.",
      reason: "Building a curated pipe and tobacco collection enhances your enjoyment of the hobby.",
      suggested_action: "Add your first pipe and a few tobacco blends to get started.",
      whatif_prompt: "How should I start building my pipe collection?",
    };
  }
  
  if (pipes?.length > 0 && blends?.length === 0) {
    return {
      id: `health-no-tobacco-${Date.now()}`,
      category: "collection_health",
      severity: "medium",
      scope: "tobacco",
      title: "Add tobacco to cellar",
      summary: "You have pipes but no tobacco blends tracked.",
      reason: "Tracking tobacco helps you pair blends with pipes and plan your cellar aging strategy.",
      suggested_action: "Add the tobacco blends you currently own or plan to purchase.",
      whatif_prompt: "What tobacco blends pair well with my current pipes?",
    };
  }
  
  return null;
}