/**
 * Documentation Registry
 * Centralized, modular documentation system
 * Scales with new modules (CigarKeeper, WineKeeper, etc.)
 */

const DOCUMENTATION = {
  // Hub Documentation
  hub: {
    tutorials: [
      {
        id: 'hub-overview',
        title: 'Hub Overview',
        description: 'Learn about the collection hub and how modules connect',
        sections: [
          {
            heading: 'What is the Hub?',
            content: 'The Hub is your central dashboard where all collection modules connect. It shows your collection overview, active modules, recent activity, and cross-module insights.'
          },
          {
            heading: 'Collection Overview',
            content: 'See at-a-glance statistics: total items, collection value, recent activity, and collection health across all modules.'
          },
          {
            heading: 'Module Cards',
            content: 'Each active module (PipeKeeper, WhiskeyKeeper, etc.) displays a card with quick stats and quick-launch buttons to jump into that module.'
          },
          {
            heading: 'Quick Launch',
            content: 'Use Quick Launch buttons to quickly add a new pipe, blend, bottle, or start a session without navigating module screens.'
          },
          {
            heading: 'Collection Curator',
            content: 'The Curator AI provides proactive insights about your collection, recommendations for new items, and collection optimization ideas.'
          },
          {
            heading: "Tonight's Session",
            content: 'Get AI-powered pairing recommendations for your next smoking session, including pipe, tobacco, and whiskey pairings.'
          },
          {
            heading: 'Collection Story',
            content: 'View automatically generated highlights about your collection, such as acquisition trends, favorite items, and collection milestones.'
          },
          {
            heading: 'Cross-Module Insights',
            content: 'See how your pipes, tobacco, and whiskey collections relate to each other through advanced pairing and compatibility analysis.'
          }
        ]
      }
    ],
    troubleshooting: [
      {
        id: 'hub-loading-slow',
        title: 'Hub is loading slowly',
        solution: 'The Hub collects data from multiple modules. This is normal on first load. Refresh the page if it takes more than 10 seconds.'
      },
      {
        id: 'hub-cards-missing',
        title: 'Module cards are missing',
        solution: 'Cards only appear for modules you have access to. Upgrade your subscription to unlock additional modules.'
      }
    ],
    features: [
      {
        id: 'collection-overview',
        title: 'Collection Overview',
        description: 'Unified statistics across all modules',
        keywords: ['stats', 'totals', 'value', 'collection']
      }
    ]
  },

  // PipeKeeper Documentation
  pipekeeper: {
    tutorials: [
      {
        id: 'pipekeeper-getting-started',
        title: 'PipeKeeper Getting Started',
        description: 'Master the basics of managing your pipe collection',
        sections: [
          {
            heading: 'Adding Your First Pipe',
            content: 'Go to PipeKeeper and click "Add Pipe". Fill in basic info like maker, shape, and material. You can add detailed specs and photos later.'
          },
          {
            heading: 'Recording Pipe Details',
            content: 'After creating a pipe, click to open its detail page. Add measurements, condition notes, purchase history, maintenance logs, and photos.'
          },
          {
            heading: 'Managing Tobacco Blends',
            content: 'Add your tobacco collection separately. Each blend records manufacturer, type, strength, and inventory (tins, bulk, pouches).'
          },
          {
            heading: 'Logging Smoking Sessions',
            content: 'Record each session you smoke. Log the pipe used, blend smoked, date, and any notes. This history powers your insights and pairing recommendations.'
          },
          {
            heading: 'AI Pairings & Optimization',
            content: 'PipeKeeper generates AI-powered pipe-tobacco pairings based on your collection, ratings, and smoking history. Regenerate pairings anytime your collection changes.'
          },
          {
            heading: 'Insights & Analytics',
            content: 'View your smoking trends, favorite pipes and blends, collection value, and detailed analytics about your collecting habits.'
          },
          {
            heading: 'Collection Valuation',
            content: 'Estimate the value of your pipe collection. Manual estimates, AI market analysis, and collector value tracking all available.'
          }
        ]
      }
    ],
    troubleshooting: [
      {
        id: 'pk-pipe-not-saving',
        title: 'Pipe information is not saving',
        solution: 'Check your internet connection. Ensure you clicked the Save button and wait for confirmation. Try refreshing the page.'
      },
      {
        id: 'pk-pairings-outdated',
        title: 'Pairings show "out of date" status',
        solution: 'This means your AI pairings were generated before your latest collection changes. Go to Pairings and click "Regenerate Pairings" to update them.'
      },
      {
        id: 'pk-images-not-loading',
        title: 'Pipe photos are not displaying',
        solution: 'Check file size (max 5MB per image). Try uploading again or using a different image format (JPG/PNG).'
      }
    ],
    features: [
      {
        id: 'pipe-specialization',
        title: 'Pipe Specialization',
        description: 'Designate pipes for specific blends',
        keywords: ['specialization', 'focus', 'blends', 'pairing']
      },
      {
        id: 'break-in-schedule',
        title: 'Break-In Schedule',
        description: 'Track pipe break-in progress',
        keywords: ['break-in', 'new pipe', 'schedule']
      },
      {
        id: 'ai-pairings',
        title: 'AI Pairings',
        description: 'AI-generated pipe & tobacco pairings',
        keywords: ['pairing', 'ai', 'recommendation', 'match']
      }
    ]
  },

  // WhiskeyKeeper Documentation
  whiskeykeeper: {
    tutorials: [
      {
        id: 'whiskeykeeper-getting-started',
        title: 'WhiskeyKeeper Getting Started',
        description: 'Build and manage your whiskey collection',
        sections: [
          {
            heading: 'Adding Your First Bottle',
            content: 'Go to WhiskeyKeeper and click "Add Bottle". Use Quick Search to find bottles in the library, or manually add details like type, region, ABV, and price.'
          },
          {
            heading: 'Bottle Types',
            content: 'Record each bottle as Sealed (collector only), Drinking (unopened for consumption), Open (currently being consumed), or Reserve (special collection items).'
          },
          {
            heading: 'Bottle Pricing',
            content: 'Track multiple prices: retail price (standard MSRP), aftermarket price (auction/secondary market), and collector value (sealed bottles for collectors).'
          },
          {
            heading: 'Inventory Management',
            content: 'For bottles with multiple units, track quantities for each status type. Open bottles track fill levels (Full, High, Medium, Low, Almost Empty).'
          },
          {
            heading: 'Logging Tastings',
            content: 'Record your tasting sessions with notes, ratings, and tasting dates. Build a complete history of your whiskey experiences.'
          },
          {
            heading: 'Whiskey Insights',
            content: 'View analytics including bottle type distribution, country distribution, collection value breakdown, tasting trends, and collection growth over time.'
          },
          {
            heading: 'Collection Views',
            content: 'Switch between List view (detailed info), Gallery view (visual thumbnails), and Collector view (premium visual layout).'
          }
        ]
      }
    ],
    troubleshooting: [
      {
        id: 'wk-bottle-not-found',
        title: 'Bottle not found in Quick Search',
        solution: 'The library may not have this bottle. Try searching by producer/distillery name. You can add it manually with details you know.'
      },
      {
        id: 'wk-pricing-confusion',
        title: 'I\'m confused about the three price fields',
        solution: 'Retail = MSRP, Aftermarket = auction/resale price, Collector = sealed bottle value for collectors. Use whichever applies to your bottle.'
      },
      {
        id: 'wk-inventory-error',
        title: 'Inventory quantities don\'t match',
        solution: 'Check that sealed + open + reserve bottles = total. Use the inventory manager to adjust quantities if needed.'
      }
    ],
    features: [
      {
        id: 'quick-search',
        title: 'Quick Search',
        description: 'AI-powered bottle library search',
        keywords: ['search', 'library', 'ai', 'bottle lookup']
      },
      {
        id: 'collection-valuation',
        title: 'Collection Valuation',
        description: 'Track collection value across pricing types',
        keywords: ['value', 'price', 'worth', 'collector']
      },
      {
        id: 'tasting-log',
        title: 'Tasting Log',
        description: 'Track whiskey tastings and ratings',
        keywords: ['tasting', 'log', 'notes', 'rating']
      }
    ]
  },

  // Bundle Documentation
  bundle: {
    tutorials: [
      {
        id: 'bundle-overview',
        title: 'Bundle Overview',
        description: 'Master cross-module collecting with the Bundle subscription',
        sections: [
          {
            heading: 'What is the Bundle?',
            content: 'The Bundle combines PipeKeeper, WhiskeyKeeper, and advanced AI features into one subscription. Manage your complete collector lifestyle.'
          },
          {
            heading: 'Unified Collection Dashboard',
            content: 'The Hub displays stats and insights from all modules simultaneously. See your pipes, tobacco, and whiskey in one place.'
          },
          {
            heading: 'Cross-Module Pairings',
            content: 'Get recommendations that combine pipes, tobacco, and whiskey together. Tonight\'s Session pairs all three for the perfect smoking experience.'
          },
          {
            heading: 'Collection Story',
            content: 'Get AI-generated narratives about your collection that tell stories across modules—favorite pipe-tobacco-whiskey combinations, collecting patterns, and milestones.'
          },
          {
            heading: 'Advanced Curator AI',
            content: 'The Curator provides expert recommendations across your entire collection, identifying gaps, suggesting new acquisitions, and optimizing your collection holistically.'
          },
          {
            heading: 'Advanced Analytics',
            content: 'Compare value, usage, and trends across modules. See correlations between pipe preferences and whiskey types.'
          },
          {
            heading: 'Premium Features',
            content: 'Access all Pro features for each module including advanced valuation, AI identification, and extended analytics history.'
          }
        ]
      }
    ],
    troubleshooting: [
      {
        id: 'bundle-why-expensive',
        title: 'Why is the Bundle more expensive than separate modules?',
        solution: 'The Bundle includes all modules plus advanced AI features and is priced with a 20% discount vs buying modules separately.'
      },
      {
        id: 'bundle-downgrade',
        title: 'Can I downgrade from Bundle to a single module?',
        solution: 'Yes, you can manage your subscription in Settings. Data from unused modules stays safe in case you resubscribe.'
      }
    ]
  }
};

/**
 * Get documentation by module
 */
export function getModuleDocumentation(moduleName) {
  return DOCUMENTATION[moduleName] || null;
}

/**
 * Get all modules with documentation
 */
export function getAllDocumentedModules() {
  return Object.keys(DOCUMENTATION);
}

/**
 * Search documentation across all modules
 */
export function searchDocumentation(query) {
  const q = query.toLowerCase();
  const results = [];

  Object.entries(DOCUMENTATION).forEach(([moduleName, docs]) => {
    // Search tutorials
    if (docs.tutorials) {
      docs.tutorials.forEach((tutorial) => {
        if (tutorial.title.toLowerCase().includes(q) || tutorial.description.toLowerCase().includes(q)) {
          results.push({
            type: 'tutorial',
            module: moduleName,
            id: tutorial.id,
            title: tutorial.title,
            preview: tutorial.description,
            relevance: 'high'
          });
        }
        // Search sections within tutorials
        tutorial.sections.forEach((section) => {
          if (section.heading.toLowerCase().includes(q) || section.content.toLowerCase().includes(q)) {
            results.push({
              type: 'tutorial-section',
              module: moduleName,
              tutorialId: tutorial.id,
              title: section.heading,
              preview: section.content.substring(0, 100) + '...',
              relevance: 'medium'
            });
          }
        });
      });
    }

    // Search troubleshooting
    if (docs.troubleshooting) {
      docs.troubleshooting.forEach((item) => {
        if (item.title.toLowerCase().includes(q) || item.solution.toLowerCase().includes(q)) {
          results.push({
            type: 'troubleshooting',
            module: moduleName,
            id: item.id,
            title: item.title,
            preview: item.solution.substring(0, 100) + '...',
            relevance: 'high'
          });
        }
      });
    }

    // Search features
    if (docs.features) {
      docs.features.forEach((feature) => {
        const keywordMatch = feature.keywords.some(kw => kw.includes(q));
        if (feature.title.toLowerCase().includes(q) || feature.description.toLowerCase().includes(q) || keywordMatch) {
          results.push({
            type: 'feature',
            module: moduleName,
            id: feature.id,
            title: feature.title,
            preview: feature.description,
            relevance: keywordMatch ? 'medium' : 'high'
          });
        }
      });
    }
  });

  // Sort by relevance
  return results.sort((a, b) => {
    const relevanceScore = { high: 3, medium: 2, low: 1 };
    return (relevanceScore[b.relevance] || 0) - (relevanceScore[a.relevance] || 0);
  });
}

/**
 * Get contextual help for a screen
 */
export function getContextualHelp(screenName) {
  const contextMap = {
    'pairings': {
      module: 'pipekeeper',
      tutorials: ['ai-pairings'],
      troubleshooting: ['pk-pairings-outdated']
    },
    'bottle-editor': {
      module: 'whiskeykeeper',
      tutorials: ['wk-bottle-not-found']
    },
    'hub': {
      module: 'hub',
      tutorials: ['hub-overview']
    },
    'sessions': {
      module: 'pipekeeper',
      tutorials: ['pipekeeper-getting-started']
    }
  };

  return contextMap[screenName] || null;
}

export default DOCUMENTATION;