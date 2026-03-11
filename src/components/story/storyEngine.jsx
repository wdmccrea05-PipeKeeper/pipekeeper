/**
 * Collector Story Engine
 * Generates narrative cards from collection data
 */

import { differenceInDays } from 'date-fns';

export const storyEngine = {
  generateCollectorStory(data) {
    const { pipes = [], blends = [], logs = [] } = data;

    if (pipes.length === 0 && blends.length === 0) {
      return []; // No data to generate story
    }

    const analysis = this.analyzeCollection({ pipes, blends, logs });
    const highlights = this.identifyHighlights(analysis);
    const cards = this.buildStoryCards(highlights, analysis);

    return cards;
  },

  analyzeCollection(data) {
    const { pipes = [], blends = [], logs = [] } = data;

    // Analyze pipe usage
    const pipeUsage = {};
    const pipeLastUsed = {};
    const logsByPipe = {};

    logs.forEach(log => {
      if (log?.pipe_id) {
        pipeUsage[log.pipe_id] = (pipeUsage[log.pipe_id] || 0) + (log.bowls_used || 1);
        if (!logsByPipe[log.pipe_id]) logsByPipe[log.pipe_id] = [];
        logsByPipe[log.pipe_id].push(log);
      }
    });

    // Find most smoked pipe
    let mostSmokedPipe = null;
    let maxBowls = 0;
    for (const [pipeId, bowls] of Object.entries(pipeUsage)) {
      if (bowls > maxBowls) {
        maxBowls = bowls;
        mostSmokedPipe = pipes.find(p => p.id === pipeId);
      }
    }

    // Analyze blend usage
    const blendUsage = {};
    logs.forEach(log => {
      if (log?.blend_id) {
        blendUsage[log.blend_id] = (blendUsage[log.blend_id] || 0) + (log.bowls_used || 1);
      }
    });

    let favoriteBlend = null;
    let maxBlendBowls = 0;
    for (const [blendId, bowls] of Object.entries(blendUsage)) {
      if (bowls > maxBlendBowls) {
        maxBlendBowls = bowls;
        favoriteBlend = blends.find(b => b.id === blendId);
      }
    }

    // Calculate streak
    let longestStreak = 0;
    if (logs.length > 0) {
      const sortedLogs = [...logs].sort((a, b) => {
        try {
          return new Date(a.date) - new Date(b.date);
        } catch {
          return 0;
        }
      });

      let currentStreak = 1;
      for (let i = 1; i < sortedLogs.length; i++) {
        try {
          const prevDate = new Date(sortedLogs[i - 1].date);
          const currDate = new Date(sortedLogs[i].date);
          const daysDiff = differenceInDays(currDate, prevDate);

          if (daysDiff <= 1) {
            currentStreak++;
          } else {
            longestStreak = Math.max(longestStreak, currentStreak);
            currentStreak = 1;
          }
        } catch {
          // skip
        }
      }
      longestStreak = Math.max(longestStreak, currentStreak);
    }

    // Calculate collection value
    const pipeValue = pipes.reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0);
    const blendValue = blends.reduce((sum, b) => {
      const manualValue = Number(b.manual_market_value) || 0;
      const aiValue = Number(b.ai_estimated_value) || 0;
      return sum + (manualValue || aiValue || 0);
    }, 0);

    // Analyze cellar
    const totalCellarOz = blends.reduce((sum, b) => {
      const tin = Number(b.tin_total_quantity_oz) || 0;
      const bulk = Number(b.bulk_total_quantity_oz) || 0;
      const pouch = Number(b.pouch_total_quantity_oz) || 0;
      return sum + tin + bulk + pouch;
    }, 0);

    return {
      pipes,
      blends,
      logs,
      pipeCount: pipes.length,
      blendCount: blends.length,
      totalSessions: logs.length,
      mostSmokedPipe,
      mostSmokedBowls: maxBowls,
      favoriteBlend,
      favoriteBowls: maxBlendBowls,
      longestStreak,
      totalBowls: logs.reduce((sum, l) => sum + (l.bowls_used || 1), 0),
      pipeValue,
      blendValue,
      totalValue: pipeValue + blendValue,
      totalCellarOz,
      pipeUsage,
      blendUsage,
      logsByPipe
    };
  },

  identifyHighlights(analysis) {
    const highlights = [];

    // Most Smoked Pipe
    if (analysis.mostSmokedPipe && analysis.mostSmokedBowls > 0) {
      highlights.push({
        type: 'mostSmokedPipe',
        data: analysis.mostSmokedPipe,
        bowls: analysis.mostSmokedBowls,
        priority: 10
      });
    }

    // Favorite Blend
    if (analysis.favoriteBlend && analysis.favoriteBowls > 0) {
      highlights.push({
        type: 'favoriteBlend',
        data: analysis.favoriteBlend,
        bowls: analysis.favoriteBowls,
        priority: 9
      });
    }

    // Longest Streak
    if (analysis.longestStreak > 2) {
      highlights.push({
        type: 'longestStreak',
        data: { days: analysis.longestStreak },
        priority: 8
      });
    }

    // Total Sessions
    if (analysis.totalSessions > 0) {
      highlights.push({
        type: 'totalSessions',
        data: { count: analysis.totalSessions },
        priority: 7
      });
    }

    // Collection Value
    if (analysis.totalValue > 0) {
      highlights.push({
        type: 'collectionValue',
        data: { value: analysis.totalValue },
        priority: 6
      });
    }

    // Pipe Count
    if (analysis.pipeCount > 0) {
      highlights.push({
        type: 'pipeCount',
        data: { count: analysis.pipeCount },
        priority: 5
      });
    }

    // Cellar Size
    if (analysis.blendCount > 0) {
      highlights.push({
        type: 'cellarSize',
        data: { count: analysis.blendCount, oz: analysis.totalCellarOz },
        priority: 4
      });
    }

    // Collector Milestone
    const milestones = this.checkMilestones(analysis);
    if (milestones.length > 0) {
      highlights.push({
        type: 'milestone',
        data: milestones[0],
        priority: 11 // High priority
      });
    }

    // Collector Journey (always include)
    highlights.push({
      type: 'journey',
      data: {
        sessions: analysis.totalSessions,
        pipes: analysis.pipeCount,
        blends: analysis.blendCount
      },
      priority: 3
    });

    // Sort by priority (descending) and limit to 10 cards
    return highlights
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);
  },

  checkMilestones(analysis) {
    const milestones = [];

    if (analysis.pipeCount === 10) {
      milestones.push({
        title: 'Collector Milestone',
        message: 'You\'ve reached 10 pipes! A respectable rotation.',
        emoji: '🎉'
      });
    } else if (analysis.pipeCount === 25) {
      milestones.push({
        title: 'Master Collector',
        message: 'A collection of 25 pipes. Truly impressive.',
        emoji: '👑'
      });
    } else if (analysis.pipeCount === 50) {
      milestones.push({
        title: 'Legendary Status',
        message: 'Fifty pipes. You\'ve achieved collector legend status.',
        emoji: '⭐'
      });
    }

    if (analysis.totalSessions === 100) {
      milestones.push({
        title: 'Century Smoker',
        message: 'You\'ve logged 100 sessions. A dedicated collector.',
        emoji: '💯'
      });
    }

    return milestones;
  },

  buildStoryCards(highlights, analysis) {
    return highlights.map((highlight, index) => ({
      id: `card-${index}`,
      index: index + 1,
      total: highlights.length,
      type: highlight.type,
      data: highlight.data,
      analysis // pass full analysis for context
    }));
  }
};