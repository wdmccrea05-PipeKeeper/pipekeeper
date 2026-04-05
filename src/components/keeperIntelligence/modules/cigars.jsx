/**
 * Keeper Intelligence: Cigars Module
 * Provides structured collection analysis for the intelligence layer.
 * Delegates to the platform cigarInsights service for real calculations.
 */

import { getCollectionInsights } from '@/platform/cigarInsights';
import { getCigarReadiness } from '@/platform/agingReadiness';

export const CigarsModule = {
  analyzeCollection({ cigars = [], humidors = [], sessions = [] }) {
    const insights = getCollectionInsights(cigars, humidors, sessions);

    const wrapperTypes = new Set(cigars.map((c) => c.wrapper).filter(Boolean)).size;
    const bodyDistribution = {};
    cigars.forEach((c) => {
      if (c.body) bodyDistribution[c.body] = (bodyDistribution[c.body] || 0) + 1;
    });

    return {
      cigarCount: cigars.length,
      readyNow: insights.readyNow,
      aging: insights.aging,
      pastPeak: insights.pastPeak,
      runningLowCount: insights.runningLow.length,
      neglectedCount: insights.neglected.length,
      atRiskCount: insights.atRiskCigars.length,
      humidorsNeedingAttention: insights.humidorsNeedingAttention.length,
      humidorHealthMap: insights.humidorHealthMap,
      wrapperTypes,
      bodyDistribution,
    };
  },

  generateInsights(analysis) {
    const insights = [];

    if (analysis.readyNow > 0) {
      insights.push({
        type: 'ready_to_smoke',
        label: `${analysis.readyNow} cigar${analysis.readyNow !== 1 ? 's' : ''} ready to smoke`,
        severity: 'positive',
      });
    }

    if (analysis.pastPeak > 0) {
      insights.push({
        type: 'past_peak',
        label: `${analysis.pastPeak} cigar${analysis.pastPeak !== 1 ? 's' : ''} past peak window — smoke soon`,
        severity: 'warning',
      });
    }

    if (analysis.humidorsNeedingAttention > 0) {
      insights.push({
        type: 'humidor_attention',
        label: `${analysis.humidorsNeedingAttention} humidor${analysis.humidorsNeedingAttention !== 1 ? 's' : ''} need${analysis.humidorsNeedingAttention === 1 ? 's' : ''} attention`,
        severity: 'warning',
      });
    }

    if (analysis.atRiskCount > 0) {
      insights.push({
        type: 'at_risk',
        label: `${analysis.atRiskCount} cigar${analysis.atRiskCount !== 1 ? 's' : ''} at storage risk`,
        severity: 'danger',
      });
    }

    if (analysis.runningLowCount > 0) {
      insights.push({
        type: 'running_low',
        label: `${analysis.runningLowCount} cigar${analysis.runningLowCount !== 1 ? 's' : ''} running low on inventory`,
        severity: 'info',
      });
    }

    if (analysis.neglectedCount > 0) {
      insights.push({
        type: 'neglected',
        label: `${analysis.neglectedCount} favorite${analysis.neglectedCount !== 1 ? 's' : ''} haven't been smoked recently`,
        severity: 'info',
      });
    }

    return insights;
  },
};