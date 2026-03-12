/**
 * Proactive Insights Generator
 * Generates actionable curator insights from collection data
 */

import { differenceInCalendarDays, differenceInMonths } from 'date-fns';

export function generateProactiveInsights({ pipes = [], blends = [], pairings = [], latestLogByPipe = {} }) {
  const insights = [];
  const now = new Date();

  // Filter AI-eligible items (respect ai_excluded)
  const eligiblePipes = pipes.filter(p => !p?.ai_excluded);
  const eligibleBlends = blends.filter(b => !b?.ai_excluded);

  // ROTATION: Unused pipes
  const overduePipes = eligiblePipes.filter(p => {
    const lastDate = latestLogByPipe[p.id];
    if (!lastDate) return true;
    try {
      return differenceInCalendarDays(now, new Date(lastDate)) > 60;
    } catch {
      return false;
    }
  });

  if (overduePipes.length > 0) {
    insights.push({
      id: `rotation_${overduePipes.length}`,
      category: 'rotation',
      severity: overduePipes.length > 5 ? 'high' : 'medium',
      scope: 'pipe',
      title: `${overduePipes.length} pipe${overduePipes.length > 1 ? 's' : ''} need${overduePipes.length === 1 ? 's' : ''} rotation`,
      summary: `You have ${overduePipes.length} pipe${overduePipes.length > 1 ? 's' : ''} that haven't been used in over 60 days.`,
      reason: 'Regular rotation helps maintain your pipes and prevents cake from over-hardening.',
      suggested_action: 'Review rotation schedule and smoke underused pipes this week.',
      whatif_prompt: `I have ${overduePipes.length} pipes that haven't been used in 60+ days. Help me plan a rotation schedule to bring them back into regular use.`,
      data: { pipes: overduePipes }
    });
  }

  // CELLAR: Aging opportunity
  const peakBlends = eligibleBlends.filter(b => {
    const dates = [b.tin_cellared_date, b.bulk_cellared_date, b.pouch_cellared_date].filter(Boolean);
    if (dates.length === 0) return false;
    const oldest = dates.reduce((a, d) => d < a ? d : a);
    try {
      const months = differenceInMonths(now, new Date(oldest));
      if (b.aging_potential === "Excellent" && months >= 18) return true;
      if (b.aging_potential === "Good" && months >= 9) return true;
      if (b.aging_potential === "Fair" && months >= 3) return true;
    } catch {
      return false;
    }
    return false;
  });

  if (peakBlends.length > 0) {
    insights.push({
      id: `aging_${peakBlends.length}`,
      category: 'aging',
      severity: 'medium',
      scope: 'tobacco',
      title: `${peakBlends.length} blend${peakBlends.length > 1 ? 's' : ''} ready to enjoy`,
      summary: `Your cellared ${peakBlends.length > 1 ? 'blends have' : 'blend has'} reached peak aging potential.`,
      reason: 'These blends have aged sufficiently and are at or past their optimal window.',
      suggested_action: 'Sample these blends to evaluate their development.',
      whatif_prompt: `I have ${peakBlends.length} cellared blend${peakBlends.length > 1 ? 's' : ''} that reached peak aging. When should I open them and how should I evaluate their development?`,
      data: { blends: peakBlends }
    });
  }

  // DIVERSITY: Blend variety
  const blendTypes = new Set(eligibleBlends.map(b => b.blend_type).filter(Boolean));
  if (eligibleBlends.length >= 5 && blendTypes.size < 3) {
    insights.push({
      id: 'diversity_low',
      category: 'diversity',
      severity: 'low',
      scope: 'tobacco',
      title: 'Limited blend variety',
      summary: `Your collection has only ${blendTypes.size} different blend type${blendTypes.size > 1 ? 's' : ''}.`,
      reason: 'Exploring different blend families can enhance your tasting experience and broaden your palate.',
      suggested_action: 'Try adding Virginia/Perique, English, or Balkan blends to your collection.',
      whatif_prompt: `My tobacco collection has limited variety (only ${blendTypes.size} blend types). What types should I add to get better diversity and balance?`,
      data: { current_types: Array.from(blendTypes) }
    });
  }

  // PAIRING: Unmatched pipes
  if (pairings.length > 0) {
    const pipesWithGoodPairings = new Set();
    pairings.forEach(p => {
      if (p.score >= 7) {
        const key = p.bowl_variant_id ? `${p.pipe_id}__${p.bowl_variant_id}` : p.pipe_id;
        pipesWithGoodPairings.add(key);
      }
    });

    const pipesWithoutGoodPairings = eligiblePipes.filter(pipe => {
      const key = pipe.id;
      return !pipesWithGoodPairings.has(key);
    });

    if (pipesWithoutGoodPairings.length > 2) {
      insights.push({
        id: 'pairing_gaps',
        category: 'pairing',
        severity: 'medium',
        scope: 'cross_module',
        title: `${pipesWithoutGoodPairings.length} pipes lack ideal pairings`,
        summary: 'Several pipes don\'t have high-compatibility blends in your cellar.',
        reason: 'Adding complementary blends or refining pipe specializations can improve your smoking experience.',
        suggested_action: 'Review optimization suggestions to balance your collection.',
        whatif_prompt: `I have ${pipesWithoutGoodPairings.length} pipes without good tobacco matches. How should I adjust my collection for better pairings?`,
        data: { pipes: pipesWithoutGoodPairings }
      });
    }
  }

  // INVENTORY: Collection health
  if (eligiblePipes.length > 10 && eligibleBlends.length < 5) {
    insights.push({
      id: 'inventory_imbalance',
      category: 'inventory',
      severity: 'low',
      scope: 'cross_module',
      title: 'Cellar could use more variety',
      summary: `You have ${eligiblePipes.length} pipes but only ${eligibleBlends.length} tobacco blends.`,
      reason: 'A broader tobacco selection gives you more pairing flexibility and keeps rotation interesting.',
      suggested_action: 'Consider adding 3-5 new blends in different styles.',
      whatif_prompt: `I have ${eligiblePipes.length} pipes but only ${eligibleBlends.length} blends. What tobacco should I add to balance my collection?`,
      data: { pipe_count: eligiblePipes.length, blend_count: eligibleBlends.length }
    });
  }

  return insights;
}