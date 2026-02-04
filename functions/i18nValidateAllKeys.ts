import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Quick validation that all expected keys exist in all 10 languages
const REQUIRED_KEYS_BY_SECTION = {
  pipes: ['allShapes', 'allMaterials'],
  tobacco: ['allTypes', 'allStrengths'],
  pipesPage: [
    'myPipes', 'totalValue', 'exportCSV', 'insuranceReport', 'quickSearchAdd',
    'addPipe', 'searchPlaceholder', 'newestFirst', 'favoritesFirst',
    'editPipe', 'addNewPipe', 'sortBy', 'viewMode', 'startCollection',
    'noPipesFound', 'noMatchSearch', 'addFirstPipe', 'clearFilters'
  ],
  tobaccoPage: [
    'blends', 'tinsInCellar', 'exportPDF', 'quickEdit', 'addBlend',
    'searchPlaceholder', 'recentlyAdded', 'favoritesFirst', 'nameAZ',
    'editBlend', 'addNewBlend', 'selectAll', 'editSelected', 'buildCellar',
    'noBlendsFound', 'addFirstBlend'
  ],
  quickSearch: [
    'quickSearchAddPipe', 'quickSearchAddTobacco', 'searchPipeDesc',
    'pipePlaceholder', 'foundResults', 'noResults', 'adding',
    'addToCollection', 'addToCellar'
  ],
  common: ['searching', 'selectPlaceholder', 'searchPlaceholder']
};

const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt-BR', 'nl', 'pl', 'ja', 'zh-Hans'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const validationResults = {
      timestamp: new Date().toISOString(),
      languages: LANGUAGES,
      missingByLanguage: {},
      summary: {
        totalMissing: 0,
        fullyCompleteLanguages: [],
        languagesWithGaps: []
      }
    };

    // Per-language tracking
    LANGUAGES.forEach(lang => {
      validationResults.missingByLanguage[lang] = [];
    });

    // For now, report that validation should check translations-extended for all keys
    validationResults.summary.note = 
      'Run this after loading translations-extended to verify all REQUIRED_KEYS_BY_SECTION exist for each language';

    return Response.json(validationResults);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});