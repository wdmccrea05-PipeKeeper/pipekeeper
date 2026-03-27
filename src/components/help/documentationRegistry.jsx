/**
 * Help Knowledge Base — canonical source used by Search, AI Help, and Tutorials.
 * Every article has: id, title, module, category, summary, body, keywords, questions, synonyms, relatedArticles
 */

export const HELP_ARTICLES = [
  // ─── HUB ────────────────────────────────────────────────────────────────────
  {
    id: 'hub-overview',
    title: 'Hub Overview',
    module: 'hub',
    category: 'getting-started',
    summary: 'The Hub is your central dashboard where all collection modules connect.',
    body: 'The Hub shows your collection overview, active modules, recent activity, and cross-module insights. Each active module (PipeKeeper, WhiskeyKeeper) displays a card with quick stats and quick-launch buttons. Use Quick Access (the lightning bolt in the header) to quickly add a new pipe, blend, or bottle without navigating away. The Curator AI provides proactive insights and can be accessed from the top navigation. Cross-Module Insights show how your pipes, tobacco, and whiskey relate to each other. Modules (PipeKeeper, WhiskeyKeeper) can be enabled or disabled from your Profile settings.',
    keywords: ['hub', 'dashboard', 'home', 'overview', 'modules', 'collection', 'start', 'main screen', 'quick access', 'quick launch'],
    questions: [
      'what is the hub',
      'how do i get started',
      'what does the home screen show',
      'where do i begin',
      'what is the main page',
      'how do i add items quickly',
      'how do i enable a module',
    ],
    synonyms: ['home', 'main page', 'dashboard', 'landing page'],
    relatedArticles: ['curator-overview', 'tonights-session', 'collection-insights'],
  },
  {
    id: 'collection-insights',
    title: 'Collection Insights',
    module: 'hub',
    category: 'features',
    summary: 'Collection Insights shows analytics and highlights across your entire collection.',
    body: 'Collection Insights aggregates data from all your active modules to give you a unified view of your collecting habits. See total item counts, collection value, recent activity, favourite items, and trends. The intelligence panel highlights milestones such as newest acquisition, most-used pipe, and top-rated whiskey. Insights update automatically as you add or edit items.',
    keywords: ['insights', 'analytics', 'statistics', 'value', 'totals', 'trends', 'highlights', 'intelligence'],
    questions: [
      'how do i see collection insights',
      'where are my analytics',
      'how do i see my collection value',
      'what are collection highlights',
      'how do i view stats',
    ],
    synonyms: ['analytics', 'stats', 'collection summary', 'collection highlights'],
    relatedArticles: ['hub-overview', 'curator-overview'],
  },

  // ─── CURATOR ────────────────────────────────────────────────────────────────
  {
    id: 'curator-overview',
    title: 'Using the Curator',
    module: 'curator',
    category: 'getting-started',
    summary: 'The Curator is an AI advisor that gives you personalised advice about your collection.',
    body: 'The Curator is your AI collection advisor. Navigate to the Curator page from the top navigation. Type a question or request in the chat input and press Send. The Curator knows your collection — your pipes, tobacco blends, bottles, session history, and preferences — and answers questions specific to your data. You can ask for pairing suggestions, collection gap analysis, value estimates, and acquisition recommendations. Each session is saved so you can refer back to previous conversations. The Curator also surfaces proactive insights on the Hub without you asking. Use Expert Actions (the panel below the chat) to run specialized analytical workflows like Plan Session, Optimize Collection, or Discover Similar items. Expert Actions run silently and return structured, actionable recommendation cards.',
    keywords: ['curator', 'ai', 'advisor', 'chat', 'intelligence', 'recommendations', 'proactive', 'ask', 'insights', 'expert actions', 'plan session'],
    questions: [
      'how do i use the curator',
      'what is the curator',
      'how do i chat with the ai',
      'how do i get ai recommendations',
      'how do i ask the curator a question',
      'what can the curator do',
      'how do i use ai help',
      'curator not working',
      'how do i get collection advice',
      'what are expert actions',
      'how do i run a curator action',
      'how do i plan a session',
    ],
    synonyms: ['ai advisor', 'collection curator', 'curator ai', 'ai chat', 'ai assistant', 'intelligent advisor'],
    relatedArticles: ['curator-expert-actions', 'session-builder', 'tonights-session', 'pipekeeper-ai-pairings'],
  },
  {
    id: 'curator-expert-actions',
    title: 'Curator Expert Actions',
    module: 'curator',
    category: 'features',
    summary: 'Run specialized AI-powered analytical workflows on your collection.',
    body: 'Expert Actions are specialized Curator workflows that analyze your collection and provide structured, actionable recommendation cards. From the Curator page, click any action button in the Expert Actions panel. Available actions include: Plan Session (create curated pipe + tobacco, and optionally whiskey sessions when WhiskeyKeeper is active), Optimize Collection (find gaps and redundancies), Recommend Specializations (assign pipes to blend focus areas), Update Pipe Measurements (suggest missing dimension data), Reclassify Tobacco Blends (improve categorization), and module-specific optimizations for WhiskeyKeeper. Click an action to run it — the AI analyzes your data and returns recommendation cards with confidence scores. Each card shows what will change and lets you Apply or Skip with one click.',
    keywords: ['expert actions', 'curator actions', 'optimization', 'recommendations', 'analytical', 'workflow', 'batch actions', 'plan session', 'confidence'],
    questions: [
      'what are expert actions',
      'how do i run a curator action',
      'how do i optimize my collection',
      'how do i get specialization recommendations',
      'how do i use curator workflows',
      'what does confidence mean on a recommendation',
      'how do i apply a recommendation',
    ],
    synonyms: ['curator workflows', 'analytical actions', 'recommendation engine', 'batch processing'],
    relatedArticles: ['curator-overview', 'session-builder', 'pipekeeper-ai-pairings'],
  },
  {
    id: 'session-builder',
    title: 'Session Builder (Plan Session)',
    module: 'curator',
    category: 'features',
    summary: 'Create curated session experiences combining pipes and tobacco, with whiskey when WhiskeyKeeper is active.',
    body: 'Plan Session is a Curator Expert Action that generates exactly 3 distinct curated session recommendations from your real collection. Each session pairs a specific pipe with a tobacco blend. If WhiskeyKeeper is active and you have bottles in your collection, a whiskey bottle is also included in the pairing. The 3 sessions cover distinct intents: Mood / Relaxed Evening, Rotation / Underused Item Recovery, and Discovery / Something Different. Each recommendation card shows the pipe name, blend name, whiskey bottle (if applicable), an explanation of why the combination works, and a confidence score (70–95%). Click "Try This" to accept a session recommendation or "Skip" to dismiss it. You can also click "Ask Curator" to chat about a specific recommendation.',
    keywords: ['session', 'session builder', 'plan session', 'pairing', 'experience', 'pipe tobacco whiskey', 'mood', 'routine', 'confidence', 'try this'],
    questions: [
      'how do i use session builder',
      'how do i plan a session',
      'how do i create a session',
      'what is plan session',
      'how do i save a session',
      'what is a session recommendation',
      'why does plan session show whiskey',
      'why is whiskey not showing in plan session',
      'what does confidence mean in session',
    ],
    synonyms: ['session planner', 'experience builder', 'curated session', 'plan session'],
    relatedArticles: ['tonights-session', 'curator-expert-actions', 'curator-overview'],
  },
  {
    id: 'curator-pairing-recommendations',
    title: 'AI Pairing Recommendations',
    module: 'curator',
    category: 'features',
    summary: 'Generate AI-powered pairing recommendations across all your collections.',
    body: 'The Curator provides pairing recommendations that suggest the best combinations of pipes with tobacco blends, and whiskey bottles with sessions. Use the Pairing Recommendation expert action to generate fresh pairings based on your current collection. Recommendations consider blend type, pipe shape, bowl size, tobacco strength, whiskey region and type, and your personal history. Apply recommended pairings directly or use them for inspiration.',
    keywords: ['pairing', 'recommendation', 'ai pairing', 'match', 'combination', 'curator'],
    questions: [
      'how do i get pairing recommendations',
      'how do i use curator pairings',
      'how do pipes pair with tobacco',
      'how do whiskeys pair with sessions',
    ],
    synonyms: ['pairing engine', 'ai recommendations', 'combination suggestions'],
    relatedArticles: ['curator-expert-actions', 'session-builder', 'pipekeeper-ai-pairings'],
  },

  // ─── TONIGHT'S SESSION ──────────────────────────────────────────────────────
  {
    id: 'tonights-session',
    title: "Tonight's Session",
    module: 'hub',
    category: 'features',
    summary: "Tonight's Session gives you AI-powered pairing recommendations for your next smoking session.",
    body: "Tonight's Session is found on the Hub. It analyses your pipes, tobacco blends, and whiskey bottles to suggest the ideal combination for your next session. The AI considers your smoking history, current inventory, and preferences. You can accept a suggested session, ask for alternatives, or customise the pairing yourself. Completing a session automatically logs it in your smoking history. Sessions are powered by the Curator's Session Builder expert action.",
    keywords: ['tonight', 'session', 'pairing', 'recommendation', 'evening', 'smoke', 'combination', 'pipe tobacco whiskey'],
    questions: [
      'how do i use tonights session',
      'what is tonights session',
      'how do i get session recommendations',
      'how do i plan a smoking session',
      'how do i pair pipe and tobacco',
      'how do i get pairing suggestions',
    ],
    synonyms: ["tonight's session", 'session planner', 'evening pairing', 'session engine'],
    relatedArticles: ['session-builder', 'curator-expert-actions', 'pipekeeper-ai-pairings', 'log-smoking-session'],
  },

  // ─── PIPEKEEPER ─────────────────────────────────────────────────────────────
  {
    id: 'pipekeeper-overview',
    title: 'PipeKeeper Overview',
    module: 'pipekeeper',
    category: 'getting-started',
    summary: 'PipeKeeper helps you manage your pipe collection, tobacco cellar, and smoking history.',
    body: 'PipeKeeper has three main sections: Pipes, Tobacco, and Insights. In Pipes, you track each pipe you own with maker, shape, material, condition, measurements, photos, and value. In Tobacco, you manage your cellar of blends with type, strength, inventory, and cellar/aging data. The Insights page shows your smoking trends, favourite combinations, collection value, and AI pairings.',
    keywords: ['pipekeeper', 'pipes', 'tobacco', 'cellar', 'collection', 'overview', 'getting started'],
    questions: [
      'what is pipekeeper',
      'how do i use pipekeeper',
      'how do i start pipekeeper',
      'what can i track in pipekeeper',
    ],
    synonyms: ['pipe module', 'pipe tracker', 'pipe collection manager'],
    relatedArticles: ['add-pipe', 'log-smoking-session', 'pipekeeper-ai-pairings'],
  },
  {
    id: 'add-pipe',
    title: 'Adding a Pipe',
    module: 'pipekeeper',
    category: 'how-to',
    summary: 'Add a new pipe to your collection using the unified Add flow.',
    body: 'There are several ways to start adding a pipe: click "Add Pipe" from the PipeKeeper page, use the Quick Access menu (lightning bolt icon in the header), or tap the + button on any pipe list. All paths open the unified Add Flow wizard. Step 1 — Choose type (Pipe). Step 2 — Search for your pipe by maker/model to auto-fill details, or select "Add Manually". Step 3 — Fill in basic details: name, maker, shape, and material. Step 4 — Add optional details: measurements, condition, purchase info. Step 5 — Set inventory. Step 6 — Add photos. Click Save. You can always edit the pipe later by opening its detail page and selecting Edit. For estate pipes, use the AI Identifier to help identify maker and shape from a photo.',
    keywords: ['add pipe', 'new pipe', 'create pipe', 'pipe entry', 'how to add', 'record pipe', 'add flow', 'quick access'],
    questions: [
      'how do i add a pipe',
      'how do i record a new pipe',
      'how do i enter a pipe',
      'how do i create a pipe record',
      'where do i add pipes',
      'how do i use the add pipe wizard',
    ],
    synonyms: ['new pipe', 'create pipe', 'log pipe'],
    relatedArticles: ['pipekeeper-overview', 'log-smoking-session', 'break-in-schedule'],
  },
  {
    id: 'log-smoking-session',
    title: 'Logging a Smoking Session',
    module: 'pipekeeper',
    category: 'how-to',
    summary: 'Record each smoking session to build your history and improve AI recommendations.',
    body: 'From PipeKeeper, go to the Tobacco or Pipes tab and click "Log Session", or use Quick Launch from the Hub. Select the pipe you used, the tobacco blend you smoked, the date, and optionally add notes about the session. The number of bowls is recorded. Your session history powers the Insights page and improves Tonight\'s Session recommendations. You can view all sessions in the Insights tab under Smoking Log.',
    keywords: ['log session', 'smoking session', 'record session', 'session log', 'bowl', 'smoke', 'history', 'log smoke'],
    questions: [
      'how do i log a smoking session',
      'how do i record a session',
      'how do i add to my smoking history',
      'how do i track my smoking',
      'where is the session log',
      'how do i log a bowl',
    ],
    synonyms: ['smoking log', 'session record', 'pipe session', 'bowl log'],
    relatedArticles: ['pipekeeper-overview', 'tonights-session', 'add-pipe'],
  },
  {
    id: 'pipekeeper-ai-pairings',
    title: 'AI Pipe & Tobacco Pairings',
    module: 'pipekeeper',
    category: 'features',
    summary: 'AI-generated pairing recommendations between your pipes and tobacco blends.',
    body: 'PipeKeeper generates AI-powered pipe-tobacco pairings based on your collection, ratings, and smoking history. Navigate to Insights > Pairings to see current pairings. If pairings show "out of date", click Regenerate Pairings. The AI considers bowl size, pipe shape, tobacco strength, blend type, and your personal history. You can also assign a Specialization to a pipe — designating it for specific blend types — which improves pairing accuracy.',
    keywords: ['pairings', 'ai pairings', 'pairing recommendations', 'match', 'tobacco pipe match', 'specialization'],
    questions: [
      'how do ai pairings work',
      'how do i generate pairings',
      'how do i match pipes to tobacco',
      'pairings are outdated',
      'how do i regenerate pairings',
    ],
    synonyms: ['pipe tobacco pairing', 'ai recommendations', 'pairing matrix'],
    relatedArticles: ['tonights-session', 'curator-overview', 'log-smoking-session'],
  },
  {
    id: 'break-in-schedule',
    title: 'Break-In Schedule',
    module: 'pipekeeper',
    category: 'features',
    summary: 'Track and manage the break-in process for new pipes.',
    body: 'New briar pipes benefit from a break-in period where you smoke partial bowls to gradually build a cake. In PipeKeeper, open a pipe\'s detail page and click "Break-In Schedule". The AI generates a recommended schedule based on the pipe\'s material and bowl size. Each session you complete can be marked off. The schedule tracks your progress and can be regenerated if you update your pipe\'s details.',
    keywords: ['break in', 'break-in', 'new pipe', 'cake', 'schedule', 'briar', 'season'],
    questions: [
      'how do i break in a new pipe',
      'what is a break-in schedule',
      'how do i season a pipe',
      'how do i build a cake',
    ],
    synonyms: ['seasoning', 'cake building', 'pipe break-in'],
    relatedArticles: ['add-pipe', 'pipekeeper-overview'],
  },

  // ─── WHISKEYKEEPER ──────────────────────────────────────────────────────────
  {
    id: 'whiskeykeeper-overview',
    title: 'WhiskeyKeeper Overview',
    module: 'whiskeykeeper',
    category: 'getting-started',
    summary: 'WhiskeyKeeper helps you build, manage, and track your whiskey bottle collection.',
    body: 'WhiskeyKeeper has three views: List, Gallery, and Collector. Add bottles, track inventory (sealed, open, reserve), record purchase prices, retail prices, aftermarket prices, and collector values. Log tasting notes for each bottle. The Insights tab shows analytics including bottle type distribution, country of origin, collection value, and tasting trends.',
    keywords: ['whiskeykeeper', 'whiskey', 'bottles', 'collection', 'overview', 'getting started'],
    questions: [
      'what is whiskeykeeper',
      'how do i use whiskeykeeper',
      'how do i start whiskeykeeper',
      'what can i do in whiskeykeeper',
    ],
    synonyms: ['whiskey module', 'bottle tracker', 'whiskey collection manager'],
    relatedArticles: ['add-bottle', 'log-tasting', 'whiskey-inventory'],
  },
  {
    id: 'add-bottle',
    title: 'Adding a Whiskey Bottle',
    module: 'whiskeykeeper',
    category: 'how-to',
    summary: 'Add a new whiskey bottle to your collection using the unified Add flow.',
    body: 'To add a bottle, click "Add Bottle" from WhiskeyKeeper, use Quick Access (lightning bolt in the header), or tap the + button. All paths open the unified Add Flow wizard. Step 1 — Choose type (Bottle). Step 2 — Use the search to find the bottle in the library (type distillery or whiskey name) to auto-fill details. If not found, select "Add Manually". Step 3 — Fill in name, type (Scotch, Bourbon, etc.), region, ABV, age statement, and pricing. Step 4 — Add optional details. Step 5 — Set the initial inventory: how many units you own, which are sealed vs open. Step 6 — Add photos. Click Save. You can edit any field later from the bottle detail page.',
    keywords: ['add bottle', 'new bottle', 'create bottle', 'quick search', 'bottle entry', 'record bottle', 'whiskey entry', 'add flow'],
    questions: [
      'how do i add a bottle',
      'how do i add a whiskey',
      'how do i record a new bottle',
      'how do i enter a bottle',
      'how do i use quick search for bottles',
      'bottle not found in library',
      'how do i use the add bottle wizard',
    ],
    synonyms: ['new bottle', 'log bottle', 'add whiskey'],
    relatedArticles: ['whiskeykeeper-overview', 'log-tasting', 'whiskey-pricing'],
  },
  {
    id: 'log-tasting',
    title: 'Logging a Tasting',
    module: 'whiskeykeeper',
    category: 'how-to',
    summary: 'Record tasting notes and ratings for your whiskey bottles.',
    body: 'Open a bottle\'s detail page and click "Log Tasting". Select the date of the tasting, the serving method (neat, rocks, water, cocktail), and write your tasting notes. Give the bottle a rating from 1 to 5. You can add descriptive flavour tags (e.g. vanilla, peat, sherry). Tastings are saved in the bottle\'s history and contribute to your Insights analytics. To view all tastings, go to the Tastings page in WhiskeyKeeper.',
    keywords: ['log tasting', 'tasting notes', 'rating', 'review', 'note', 'taste', 'score', 'flavour'],
    questions: [
      'how do i log a tasting',
      'how do i record tasting notes',
      'how do i rate a whiskey',
      'how do i add tasting notes',
      'where do i write notes about a whiskey',
      'how do i review a bottle',
    ],
    synonyms: ['tasting log', 'whiskey notes', 'tasting record', 'bottle review'],
    relatedArticles: ['whiskeykeeper-overview', 'add-bottle', 'whiskey-inventory'],
  },
  {
    id: 'whiskey-inventory',
    title: 'Managing Whiskey Inventory',
    module: 'whiskeykeeper',
    category: 'how-to',
    summary: 'Track multiple units per bottle including sealed, open, and reserve statuses.',
    body: 'For each bottle you can track multiple inventory units. Each unit has a status: Sealed (unopened), Drinking (open for consumption), or Reserve. Open bottles also track fill level (Full, High, Medium, Low, Almost Empty). To manage inventory, open a bottle\'s detail page and click "Manage Inventory". Add units as you acquire more of the same bottle. Update fill levels as you consume a bottle. The collection value is calculated from your inventory units.',
    keywords: ['inventory', 'units', 'sealed', 'open', 'reserve', 'fill level', 'quantities', 'stock'],
    questions: [
      'how do i track multiple bottles',
      'how do i manage inventory',
      'what is sealed vs open',
      'how do i update fill level',
      'how do i track how many bottles i have',
    ],
    synonyms: ['bottle inventory', 'stock tracking', 'bottle units'],
    relatedArticles: ['add-bottle', 'whiskey-pricing', 'whiskeykeeper-overview'],
  },
  {
    id: 'whiskey-pricing',
    title: 'Whiskey Pricing & Valuation',
    module: 'whiskeykeeper',
    category: 'features',
    summary: 'Track retail, aftermarket, and collector values for your whiskey bottles.',
    body: 'WhiskeyKeeper tracks three price types per bottle. Retail Price: the standard MSRP or shop price. Aftermarket Price: what the bottle sells for at auction or on the secondary market. Collector Value: the estimated value for sealed collector bottles. Your total collection value is calculated from these prices multiplied by your inventory units. You can use AI Value Lookup to get an AI estimate of current market prices. Use the Optimize Whiskey Collection expert action for valuation recommendations.',
    keywords: ['price', 'value', 'valuation', 'retail', 'aftermarket', 'collector', 'worth', 'market price'],
    questions: [
      'how do i track bottle value',
      'what is the difference between retail and aftermarket price',
      'how do i value my whiskey collection',
      'how do i get an ai price estimate',
    ],
    synonyms: ['bottle value', 'collection value', 'pricing', 'market value'],
    relatedArticles: ['add-bottle', 'whiskey-inventory', 'whiskeykeeper-overview', 'whiskey-optimization'],
  },
  {
    id: 'whiskey-optimization',
    title: 'Optimize Whiskey Collection',
    module: 'whiskeykeeper',
    category: 'features',
    summary: 'Use Curator Expert Actions to analyze and improve your whiskey collection.',
    body: 'The Optimize Whiskey Collection expert action analyzes your bottles for gaps, redundancies, untasted items, and diversification opportunities. Run this action to get recommendations for balancing your collection by type and origin, identifying bottles to taste, and suggesting acquisition targets. Apply recommended metadata updates with one click to enrich bottle records.',
    keywords: ['optimization', 'whiskey', 'collection', 'expert action', 'recommendations', 'balance', 'gaps'],
    questions: [
      'how do i optimize my whiskey collection',
      'how do i find gaps in my collection',
      'how do i improve my whiskey collection',
    ],
    synonyms: ['collection optimization', 'whiskey analysis'],
    relatedArticles: ['whiskeykeeper-overview', 'curator-expert-actions', 'whiskey-pricing'],
  },

  // ─── SHARING ────────────────────────────────────────────────────────────────
  {
    id: 'sharing-stories',
    title: 'Sharing Collection Stories & Cards',
    module: 'hub',
    category: 'features',
    summary: 'Share your collection highlights and stories with friends or on social media.',
    body: 'CollectionKeeper lets you create shareable cards and stories from your collection data. From any item detail page, click the Share button to generate a visual card showing the item\'s details, rating, and photos. From the Hub, the Collection Story feature generates a narrative highlight reel of your collection. Share links work for anyone — recipients do not need an account to view shared cards. Public profiles let your friends follow your collection if you enable them in Settings.',
    keywords: ['share', 'story', 'card', 'social', 'public', 'link', 'sharing', 'post', 'community'],
    questions: [
      'how do i share my collection',
      'how do i share a bottle',
      'how do i share a pipe',
      'how do i create a share card',
      'how do i make my collection public',
      'how do i share a story',
    ],
    synonyms: ['share card', 'collection story', 'social sharing', 'public link'],
    relatedArticles: ['hub-overview', 'collection-insights'],
  },

  // ─── SEARCH ─────────────────────────────────────────────────────────────────
  {
    id: 'global-search',
    title: 'Search & Quick Access',
    module: 'hub',
    category: 'features',
    summary: 'Find pipes, bottles, and blends instantly, or add new items from anywhere using Quick Access.',
    body: 'Use the search icon in the top navigation bar to open Global Search. Type the name of any pipe, tobacco blend, or whiskey bottle to find it instantly. Quick Access (the lightning bolt / Zap icon in the header) opens a quick-launch menu where you can add a new pipe, blend, or bottle directly from any page — no need to navigate to the module first. When adding a new item through any flow, a Smart Search step lets you search an online library to pre-fill details automatically. In PipeKeeper, the AI Pipe Identifier uses a photo to suggest maker and shape.',
    keywords: ['search', 'quick search', 'find', 'lookup', 'global search', 'filter', 'locate', 'quick access', 'quick launch', 'add from anywhere'],
    questions: [
      'how do i search for a bottle',
      'how do i find a pipe',
      'how do i use quick search',
      'how do i search my collection',
      'where is the search bar',
      'how do i add something quickly',
      'what is quick access',
      'what is the lightning bolt button',
    ],
    synonyms: ['quick search', 'find item', 'lookup', 'bottle search', 'quick access', 'quick launch'],
    relatedArticles: ['add-bottle', 'add-pipe'],
  },
];

// ─── TOPIC SHORTCUTS ──────────────────────────────────────────────────────────
// Maps common intent phrases to article IDs for instant resolution
export const TOPIC_SHORTCUTS = {
  'curator': 'curator-overview',
  'how do i use curator': 'curator-overview',
  'ai advisor': 'curator-overview',
  'expert actions': 'curator-expert-actions',
  'curator actions': 'curator-expert-actions',
  'session builder': 'session-builder',
  'curated session': 'session-builder',
  'optimize collection': 'curator-expert-actions',
  'whiskey optimization': 'whiskey-optimization',
  'log tasting': 'log-tasting',
  'tasting notes': 'log-tasting',
  'add pipe': 'add-pipe',
  'new pipe': 'add-pipe',
  'tonights session': 'tonights-session',
  "tonight's session": 'tonights-session',
  'session planner': 'session-builder',
  'collection insights': 'collection-insights',
  'analytics': 'collection-insights',
  'add bottle': 'add-bottle',
  'new bottle': 'add-bottle',
  'log session': 'log-smoking-session',
  'smoking session': 'log-smoking-session',
  'share': 'sharing-stories',
  'quick search': 'global-search',
  'pairings': 'curator-pairing-recommendations',
  'pairing recommendations': 'curator-pairing-recommendations',
};

// ─── NORMALISE QUERY ──────────────────────────────────────────────────────────
function normalise(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // remove common stop words that add noise
    .replace(/\b(how|do|i|the|a|an|to|in|use|can|my|for|is|what|where|are|does)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Naive plural/singular normalisation (remove trailing s)
function stem(word) {
  return word.replace(/(?:ing|tion|s)$/, '');
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
/**
 * Search the help KB.  Returns scored results, best first.
 */
export function searchHelpArticles(rawQuery) {
  if (!rawQuery || rawQuery.trim().length < 2) return [];

  const q = normalise(rawQuery);
  const qWords = q.split(' ').filter(Boolean).map(stem);

  // Check topic shortcut first
  const shortcutKey = Object.keys(TOPIC_SHORTCUTS).find(k => {
    const nk = normalise(k);
    return q.includes(nk) || nk.includes(q);
  });

  const results = HELP_ARTICLES.map(article => {
    let score = 0;

    const fields = [
      { text: article.title, weight: 10 },
      { text: article.summary, weight: 6 },
      { text: article.body, weight: 3 },
      { text: article.keywords.join(' '), weight: 5 },
      { text: article.questions.join(' '), weight: 8 },
      { text: article.synonyms.join(' '), weight: 7 },
      { text: article.module, weight: 4 },
      { text: article.category, weight: 2 },
    ];

    // Check shortcut boost
    if (shortcutKey && TOPIC_SHORTCUTS[shortcutKey] === article.id) {
      score += 100;
    }

    for (const { text, weight } of fields) {
      const normalText = normalise(text);
      // Full query match
      if (normalText.includes(q)) score += weight * 3;
      // Individual word matches
      for (const word of qWords) {
        if (word.length < 2) continue;
        if (normalText.includes(word)) score += weight;
        // Stem match
        const stemmedText = normalText.split(' ').map(stem).join(' ');
        if (stemmedText.includes(word)) score += Math.floor(weight / 2);
      }
    }

    return { article, score };
  });

  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.article);
}

/**
 * Get a specific article by id
 */
export function getArticleById(id) {
  return HELP_ARTICLES.find(a => a.id === id) || null;
}

/**
 * Get all articles for a module
 */
export function getArticlesByModule(module) {
  return HELP_ARTICLES.filter(a => a.module === module);
}

/**
 * Build a rich context string for AI Help from top matching articles
 */
export function buildAiContext(query, maxArticles = 4) {
  const articles = searchHelpArticles(query).slice(0, maxArticles);
  if (articles.length === 0) return { context: '', articles: [] };

  const context = articles.map(a =>
    `## ${a.title} (${a.module})\n${a.summary}\n${a.body}`
  ).join('\n\n---\n\n');

  return { context, articles };
}

// ─── LEGACY COMPAT ────────────────────────────────────────────────────────────
// Keep old API surface so existing imports don't break

const DOCUMENTATION = {
  hub: { tutorials: [], troubleshooting: [], features: [] },
  curator: { tutorials: [], troubleshooting: [], features: [] },
  pipekeeper: { tutorials: [], troubleshooting: [], features: [] },
  whiskeykeeper: { tutorials: [], troubleshooting: [], features: [] },
  bundle: { tutorials: [], troubleshooting: [] },
};

export function getModuleDocumentation(moduleName) {
  return DOCUMENTATION[moduleName] || null;
}

export function getAllDocumentedModules() {
  return Object.keys(DOCUMENTATION).filter(k => k !== 'bundle');
}

export function searchDocumentation(query) {
  return searchHelpArticles(query).map(a => ({
    type: 'article',
    module: a.module,
    id: a.id,
    tutorialId: a.id,
    title: a.title,
    preview: a.summary,
    relevance: 'high',
  }));
}

export function getContextualHelp(screenName) {
  const map = {
    'pairings': 'curator-pairing-recommendations',
    'hub': 'hub-overview',
    'sessions': 'session-builder',
    'curator': 'curator-overview',
    'expert-actions': 'curator-expert-actions',
    'whiskey': 'whiskeykeeper-overview',
  };
  const id = map[screenName];
  return id ? { article: getArticleById(id) } : null;
}

export default DOCUMENTATION;