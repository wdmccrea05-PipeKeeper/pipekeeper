/**
 * Keeper Intelligence: Cigars Module
 *
 * Provides collection analysis and actionable insights for CigarKeeper.
 * Uses the shared agingReadiness engine so the same logic can be reused
 * by WineKeeper and other future modules.
 */

import {
  summarizeCigarReadiness,
  generateCollectionInsights,
  getHumidorHealth,
} from '../../platform/agingReadiness.js';

export const CigarsModule = {
  /**
   * Analyze a cigar collection and return summary metrics.
   *
   * @param {{ cigars: object[], sessions: object[], humidors: object[] }} data
   * @returns {object} Analysis result
   */
  analyzeCollection(data) {
    const { cigars = [], sessions = [], humidors = [] } = data;

    if (cigars.length === 0) {
      return {
        cigarCount: 0,
        humidorCount: 0,
        humidorHealth: 'unknown',
        wrapperTypes: 0,
        readiness: { readyNow: 0, aging: 0, pastPeak: 0, noData: 0 },
        sessionCount: sessions.length,
        insights: [],
      };
    }

    const readiness = summarizeCigarReadiness(cigars);
    const wrapperSet = new Set(cigars.map((c) => c.wrapper).filter(Boolean));

    // Overall humidor health across all humidors
    const humidorHealthStates = humidors.map((h) => getHumidorHealth(h).state);
    let overallHumidorHealth = 'unknown';
    if (humidors.length === 0) {
      overallHumidorHealth = 'unmonitored';
    } else if (humidorHealthStates.every((s) => s === 'stable')) {
      overallHumidorHealth = 'stable';
    } else if (humidorHealthStates.some((s) => s === 'dry_risk' || s === 'humid_risk')) {
      overallHumidorHealth = 'at_risk';
    } else {
      overallHumidorHealth = 'mixed';
    }

    return {
      cigarCount: cigars.length,
      humidorCount: humidors.length,
      humidorHealth: overallHumidorHealth,
      wrapperTypes: wrapperSet.size,
      readiness,
      sessionCount: sessions.length,
      insights: generateCollectionInsights(cigars, sessions, humidors),
    };
  },

  /**
   * Convert an analysis result into a prioritized list of user-facing insights.
   *
   * @param {object} analysis - Output of analyzeCollection.
   * @returns {Array<{ type: string, label: string, detail: string, priority: number }>}
   */
  generateInsights(analysis) {
    if (!analysis || analysis.cigarCount === 0) return [];

    const insights = [];

    // Surface the top pre-computed per-cigar insights
    if (Array.isArray(analysis.insights)) {
      insights.push(...analysis.insights.slice(0, 10));
    }

    // Collection-level readiness summary insight
    const { readiness } = analysis;
    if (readiness && readiness.readyNow > 0) {
      insights.unshift({
        type: 'collection_ready',
        label: `${readiness.readyNow} cigar${readiness.readyNow !== 1 ? 's' : ''} ready to smoke`,
        detail: readiness.aging > 0
          ? `${readiness.aging} still aging`
          : 'Your collection is in great shape',
        priority: -1,
      });
    }

    // Humidor alert
    if (analysis.humidorHealth === 'at_risk') {
      insights.unshift({
        type: 'humidor_alert',
        label: 'Humidor needs attention',
        detail: 'One or more humidors have conditions outside the ideal range.',
        priority: -2,
      });
    }

    return insights.sort((a, b) => a.priority - b.priority);
  },
};