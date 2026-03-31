/**
 * @deprecated — storyEngine is retired.
 * The canonical story path is CollectionStoryCard (backend-driven via generateCollectionStory).
 * This file is kept only to avoid breaking any residual imports during the transition.
 * Do not add new logic here.
 */

import { differenceInDays } from 'date-fns';

export const storyEngine = {
  generateCollectorStory(data) {
    const { pipes = [], blends = [], logs = [], bottles = [], tastings = [] } = data;

    if (pipes.length === 0 && blends.length === 0 && bottles.length === 0) {
      return [];
    }

    const analysis = this.analyzeCollection({ pipes, blends, logs, bottles, tastings });
    const highlights = this.identifyHighlights(analysis);
    const cards = this.buildStoryCards(highlights, analysis);

    return cards;
  },

  analyzeCollection(data) {
    const { pipes = [], blends = [], logs = [], bottles = [], tastings = [] } = data;

    // Analyze pipe usage
    const pipeUsage = {};
    const logsByPipe = {};

    logs.forEach(log => {
      if (log?.pipe_id) {
        pipeUsage[log.pipe_id] = (pipeUsage[log.pipe_id] || 0) + (log.bowls_used || 1);
        if (!logsByPipe[log.pipe_id]) logsByPipe[log.pipe_id] = [];
        logsByPipe[log.pipe_id].push(log);
      }
    });

    let mostSmokedPipe = null;
    let maxBowls = 0;
    for (const [pipeId, bowls] of Object.entries(pipeUsage)) {
      if (bowls > maxBowls) {
        maxBowls = bowls;
        mostSmokedPipe = pipes.find(p => p.id === pipeId);
      }
    }

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

    // Analyze whiskey tastings
    const bottleTastingCount = {};
    const bottleRatings = {};
    tastings.forEach(t => {
      if (t?.bottle_id) {
        bottleTastingCount[t.bottle_id] = (bottleTastingCount[t.bottle_id] || 0) + 1;
        if (t.rating) {
          if (!bottleRatings[t.bottle_id]) bottleRatings[t.bottle_id] = [];
          bottleRatings[t.bottle_id].push(Number(t.rating));
        }
      }
    });

    let mostTastedBottle = null;
    let maxTastings = 0;
    for (const [bottleId, count] of Object.entries(bottleTastingCount)) {
      if (count > maxTastings) {
        maxTastings = count;
        mostTastedBottle = bottles.find(b => b.id === bottleId);
      }
    }

    let highestRatedBottle = null;
    let highestAvgRating = 0;
    for (const [bottleId, ratings] of Object.entries(bottleRatings)) {
      if (ratings.length === 0) continue;
      const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
      if (avg > highestAvgRating) {
        highestAvgRating = avg;
        highestRatedBottle = bottles.find(b => b.id === bottleId);
      }
    }

    // Calculate streak (pipe sessions)
    let longestStreak = 0;
    if (logs.length > 0) {
      const sortedLogs = [...logs].sort((a, b) => {
        try { return new Date(a.date) - new Date(b.date); } catch { return 0; }
      });
      let currentStreak = 1;
      for (let i = 1; i < sortedLogs.length; i++) {
        try {
          const daysDiff = differenceInDays(new Date(sortedLogs[i].date), new Date(sortedLogs[i - 1].date));
          if (daysDiff <= 1) { currentStreak++; } else { longestStreak = Math.max(longestStreak, currentStreak); currentStreak = 1; }
        } catch { /* skip */ }
      }
      longestStreak = Math.max(longestStreak, currentStreak);
    }

    const pipeValue = pipes.reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0);
    const blendValue = blends.reduce((sum, b) => {
      const valuePerOz = Number(b.manual_market_value) || Number(b.ai_estimated_value) || 0;
      if (valuePerOz <= 0) return sum;
      const totalOz = (Number(b.tin_total_quantity_oz) || 0) + (Number(b.bulk_total_quantity_oz) || 0) + (Number(b.pouch_total_quantity_oz) || 0);
      return sum + (valuePerOz * totalOz);
    }, 0);
    const whiskeyValue = bottles.reduce((sum, b) => {
      return sum + (Number(b.collector_value) || Number(b.aftermarket_price) || Number(b.retail_price) || Number(b.purchase_price) || 0);
    }, 0);

    const totalCellarOz = blends.reduce((sum, b) => {
      return sum + (Number(b.tin_total_quantity_oz) || 0) + (Number(b.bulk_total_quantity_oz) || 0) + (Number(b.pouch_total_quantity_oz) || 0);
    }, 0);

    return {
      pipes, blends, logs, bottles, tastings,
      pipeCount: pipes.length,
      blendCount: blends.length,
      bottleCount: bottles.length,
      tastingCount: tastings.length,
      totalSessions: logs.length,
      mostSmokedPipe, mostSmokedBowls: maxBowls,
      favoriteBlend, favoriteBowls: maxBlendBowls,
      mostTastedBottle, mostTastedCount: maxTastings,
      highestRatedBottle, highestAvgRating,
      longestStreak,
      totalBowls: logs.reduce((sum, l) => sum + (l.bowls_used || 1), 0),
      pipeValue, blendValue, whiskeyValue,
      totalValue: pipeValue + blendValue + whiskeyValue,
      totalCellarOz,
      pipeUsage, blendUsage, logsByPipe,
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
      highlights.push({ type: 'cellarSize', data: { count: analysis.blendCount, oz: analysis.totalCellarOz }, priority: 4 });
    }

    // Most Tasted Bottle (WhiskeyKeeper)
    if (analysis.mostTastedBottle && analysis.mostTastedCount > 0) {
      highlights.push({ type: 'mostTastedBottle', data: analysis.mostTastedBottle, tastings: analysis.mostTastedCount, priority: 8 });
    }

    // Highest Rated Bottle (WhiskeyKeeper)
    if (analysis.highestRatedBottle && analysis.highestAvgRating > 0) {
      highlights.push({ type: 'highestRatedBottle', data: analysis.highestRatedBottle, rating: analysis.highestAvgRating, priority: 7 });
    }

    // Bottle Count (WhiskeyKeeper)
    if (analysis.bottleCount > 0) {
      highlights.push({ type: 'bottleCount', data: { count: analysis.bottleCount }, priority: 4 });
    }

    // Collector Milestone
    const milestones = this.checkMilestones(analysis);
    if (milestones.length > 0) {
      highlights.push({ type: 'milestone', data: milestones[0], priority: 11 });
    }

    // Collector Journey (always include)
    highlights.push({
      type: 'journey',
      data: { sessions: analysis.totalSessions, pipes: analysis.pipeCount, blends: analysis.blendCount, bottles: analysis.bottleCount, tastings: analysis.tastingCount },
      priority: 3
    });

    return highlights.sort((a, b) => b.priority - a.priority).slice(0, 10);
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

    if (analysis.bottleCount === 10) {
      milestones.push({
        title: 'Whiskey Collector',
        message: 'Ten bottles in your whiskey collection. A solid cabinet.',
        emoji: '🥃'
      });
    } else if (analysis.bottleCount === 25) {
      milestones.push({
        title: 'Whiskey Connoisseur',
        message: 'Twenty-five bottles. You have a serious collection.',
        emoji: '🏆'
      });
    }

    if (analysis.tastingCount === 50) {
      milestones.push({
        title: '50 Tastings',
        message: 'Fifty tasting notes logged. Your palate is well-trained.',
        emoji: '📓'
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