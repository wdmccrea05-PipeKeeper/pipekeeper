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
    body: 'The Hub is your home screen and shows an overview of all your active modules (PipeKeeper, WhiskeyKeeper), recent activity, cross-module insights, and Tonight\'s Session recommendations. Each active module displays a card with quick stats and launch buttons. Use Quick Access (the ⚡ lightning bolt button in the top header) to quickly add a new pipe, blend, or bottle without navigating away. The Curator AI is accessible from the top navigation and provides proactive insights on the Hub. Modules (PipeKeeper, WhiskeyKeeper) can be enabled or disabled from your Profile settings. The Want List and Shopping List are accessible from the navigation for tracking items you want to acquire.',
    keywords: ['hub', 'dashboard', 'home', 'overview', 'modules', 'collection', 'start', 'main screen', 'quick access', 'quick launch', 'want list', 'shopping list'],
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
    relatedArticles: ['curator-overview', 'tonights-session', 'collection-insights', 'want-list'],
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
    body: 'To add a pipe, click "Add Pipe" from the PipeKeeper page, use Quick Access (⚡ lightning bolt in the header), or tap + on any pipe list. The add pipe form is divided into labelled sections. AI Search (new pipes only) — search by maker or model name to auto-fill details. Photo Identifier — upload a photo for AI-assisted identification. Pipe Photos — upload up to 5 photos. Stamping Photos — capture any markings on the pipe. Basic Info — name (required), maker, country of origin, year made, purchase date, stamping, condition. Pipe Geometry — shape, bowl style, shank shape, bend, size class. Physical Characteristics — bowl material, stem material, finish, chamber volume, filter type, and measurements (length, weight, bowl dimensions). Use the metric/imperial toggle to enter measurements in your preferred unit — they are always stored in metric. Value & Notes — purchase price, estimated value, usage characteristics, notes, favourite flag, and the Collectible Only toggle (excludes the pipe from AI matching while keeping it in your collection). Interchangeable Bowls — enable this section for system pipes like Falcon or Gabotherm. Click Save Pipe at the bottom.',
    keywords: ['add pipe', 'new pipe', 'create pipe', 'pipe entry', 'how to add', 'record pipe', 'quick access', 'photo identifier', 'measurements', 'collectible only', 'interchangeable bowls'],
    questions: [
      'how do i add a pipe',
      'how do i record a new pipe',
      'how do i enter a pipe',
      'how do i create a pipe record',
      'where do i add pipes',
      'how do i add pipe measurements',
      'how do i switch to imperial for pipe dimensions',
    ],
    synonyms: ['new pipe', 'create pipe', 'log pipe'],
    relatedArticles: ['pipekeeper-overview', 'log-smoking-session', 'break-in-schedule', 'pipe-detail-features'],
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
    body: 'New briar pipes benefit from a break-in period where you smoke partial bowls to gradually build a cake. Open a pipe\'s detail page in PipeKeeper, then open the "Pipe Functions & Details" section (click to expand it). Go to the Condition tab and find the Break-In Schedule section. The AI generates a recommended schedule based on the pipe\'s material and bowl size. Each bowl you smoke as part of the break-in can be logged and marked off. The schedule tracks your progress automatically and can be regenerated if you update the pipe\'s details.',
    keywords: ['break in', 'break-in', 'new pipe', 'cake', 'schedule', 'briar', 'season', 'condition tab'],
    questions: [
      'how do i break in a new pipe',
      'what is a break-in schedule',
      'how do i season a pipe',
      'how do i build a cake',
      'where is the break in schedule',
    ],
    synonyms: ['seasoning', 'cake building', 'pipe break-in'],
    relatedArticles: ['add-pipe', 'pipekeeper-overview', 'pipe-detail-features'],
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

  // ─── CIGARKEEPER ────────────────────────────────────────────────────────────
  {
    id: 'cigarkeeper-overview',
    title: 'CigarKeeper Overview',
    module: 'cigarkeeper',
    category: 'getting-started',
    summary: 'CigarKeeper helps you manage your cigar collection, humidors, and smoking sessions.',
    body: 'CigarKeeper has four main sections: Cigars, Sessions, Humidors, and Insights. In Cigars, you track every cigar you own with brand, line, vitola, wrapper, binder, filler, strength, body, quantity, and storage location. In Humidors, you manage your humidor inventory and receive maintenance alerts for humidity checks and humidity aid replacement. In Sessions, you log every cigar you smoke — including cigars outside your collection — with tasting notes, burn and draw quality, pairing details, and an enjoyment rating. The Insights tab shows analytics including your most-smoked brands, vitola breakdown, session frequency, and collection value.',
    keywords: ['cigarkeeper', 'cigar', 'humidor', 'collection', 'overview', 'getting started', 'module'],
    questions: [
      'what is cigarkeeper',
      'how do i use cigarkeeper',
      'how do i start cigarkeeper',
      'what can i track in cigarkeeper',
      'how do i enable cigarkeeper',
    ],
    synonyms: ['cigar module', 'cigar tracker', 'cigar collection manager'],
    relatedArticles: ['add-cigar', 'log-cigar-session', 'cigar-humidor', 'cigar-insights'],
  },
  {
    id: 'add-cigar',
    title: 'Adding a Cigar',
    module: 'cigarkeeper',
    category: 'how-to',
    summary: 'Add a new cigar to your collection with brand, vitola, wrapper, and inventory details.',
    body: 'To add a cigar, click "Add Cigar" from the CigarKeeper page or use Quick Access (⚡ lightning bolt in the header). You can search by brand or name to auto-fill details, or enter them manually. Key fields include: Brand, Line (e.g. Oliva Serie V), Vitola (size/shape like Robusto or Toro), Wrapper origin or descriptor, Binder, Filler, Body (mild through full), Strength, Country of Origin, and Flavor Notes. Set your Quantity and Unit Type (single, 5-pack, box, bundle, partial). Assign the cigar to a Humidor from the storage section. Optionally add purchase price, estimated value, photos, a personal rating, and notes. Toggle Favorite to mark a preferred cigar. Click Save.',
    keywords: ['add cigar', 'new cigar', 'create cigar', 'cigar entry', 'record cigar', 'vitola', 'wrapper', 'brand', 'quantity'],
    questions: [
      'how do i add a cigar',
      'how do i record a new cigar',
      'how do i enter a cigar',
      'how do i create a cigar record',
      'where do i add cigars',
    ],
    synonyms: ['new cigar', 'create cigar', 'log cigar', 'add to collection'],
    relatedArticles: ['cigarkeeper-overview', 'log-cigar-session', 'cigar-humidor'],
  },
  {
    id: 'log-cigar-session',
    title: 'Logging a Cigar Session',
    module: 'cigarkeeper',
    category: 'how-to',
    summary: 'Record a smoking session for any cigar — from your collection or smoked elsewhere.',
    body: 'Tap "Log Session" from CigarKeeper or from a cigar\'s detail page. You can log a session for a cigar in your collection — select the cigar from the picker — or toggle "Smoked outside my collection" to record a cigar you tried elsewhere. For in-collection cigars you can choose to decrement the quantity. Fill in: Date, Duration, Pairing (drink or food), First/Second/Final third notes, Flavor Progression, Burn Quality, Draw Quality, Ash Quality, Touch-ups and Relights counts, Strength Impression, Overall Enjoyment (1–5), and Would Buy Again. After the session you can add the cigar to your Wishlist or mark it as Not For Me to influence future recommendations. Tap Save.',
    keywords: ['log session', 'cigar session', 'record session', 'smoking log', 'tasting notes', 'burn quality', 'draw quality', 'enjoyment', 'out of collection'],
    questions: [
      'how do i log a cigar session',
      'how do i record a session',
      'how do i log a cigar i smoked outside my collection',
      'how do i add tasting notes for a cigar',
      'where is the cigar session log',
      'how do i rate a cigar',
    ],
    synonyms: ['cigar session log', 'session record', 'smoke log', 'cigar notes'],
    relatedArticles: ['cigarkeeper-overview', 'add-cigar', 'cigar-humidor'],
  },
  {
    id: 'cigar-humidor',
    title: 'Managing Humidors',
    module: 'cigarkeeper',
    category: 'how-to',
    summary: 'Set up humidors, track maintenance, and receive alerts when checks are due.',
    body: 'From CigarKeeper, go to the Humidors tab and tap "Add Humidor". Give it a name, set the capacity (maximum cigar count), target humidity %, target temperature, and maintenance alert intervals — one for humidity checks and one for humidity aid replacement. Once set up, CigarKeeper tracks the time since your last maintenance event and shows alerts when a check is due or overdue. To log a maintenance event (humidity check, temperature check, aid refill, aid replacement, cleaning, or seasonal adjustment), open the humidor and tap "Log Maintenance". Recording a maintenance event resets the alert timer. Cigars can be assigned to a humidor from the cigar\'s add or edit form. The humidor detail page shows all assigned cigars and their quantity.',
    keywords: ['humidor', 'maintenance', 'humidity', 'alert', 'check', 'aid', 'replacement', 'capacity', 'temperature', 'cigar storage'],
    questions: [
      'how do i set up a humidor',
      'how do i add a humidor',
      'how do i track humidor maintenance',
      'how do i log a humidity check',
      'what is a humidor alert',
      'how do i assign a cigar to a humidor',
      'how do i reset a maintenance alert',
    ],
    synonyms: ['humidor setup', 'humidity tracking', 'humidor management', 'cigar storage'],
    relatedArticles: ['cigarkeeper-overview', 'add-cigar', 'log-cigar-session'],
  },
  {
    id: 'cigar-insights',
    title: 'CigarKeeper Insights & Analytics',
    module: 'cigarkeeper',
    category: 'features',
    summary: 'View session analytics, brand breakdowns, collection value, and AI-powered recommendations.',
    body: 'The CigarKeeper Insights tab aggregates your collection and session data into actionable analytics. View your session frequency chart, most-smoked brands and vitolas, top-rated cigars, flavor profile breakdown, body and strength distribution, and collection value estimate. The AI can surface recommendations based on your session history — cigars you have enjoyed most, brands worth restocking, and gaps in your collection. Use the Curator to ask for personalised cigar recommendations based on your taste profile.',
    keywords: ['cigar insights', 'analytics', 'session analytics', 'brand breakdown', 'vitola', 'collection value', 'recommendations', 'statistics'],
    questions: [
      'how do i see cigar insights',
      'where are my cigar analytics',
      'how do i view cigar statistics',
      'how do i see my most smoked cigars',
      'how do i see cigar collection value',
    ],
    synonyms: ['cigar analytics', 'cigar stats', 'session stats', 'cigar dashboard'],
    relatedArticles: ['cigarkeeper-overview', 'log-cigar-session', 'add-cigar'],
  },

  // ─── PIPE DETAIL ─────────────────────────────────────────────────────────────
  {
    id: 'pipe-detail-features',
    title: 'Pipe Detail Page',
    module: 'pipekeeper',
    category: 'features',
    summary: 'The pipe detail page gives a full snapshot and access to condition tracking, rotation, specialization, and maintenance tools.',
    body: 'Open any pipe from the PipeKeeper list to reach its detail page. The top "Pipe Snapshot" panel shows a large photo (or shape icon), key stats (shape, material, finish, value, size, length, weight, condition, and bowl dimensions if recorded), and your notes. Buttons at the top let you Find Similar (AI-powered recommendations from your collection), Share (generate a shareable card or link), Edit, and Delete. Below the snapshot is the collapsible "Pipe Functions & Details" section with five tabs: Condition — track the pipe\'s condition over time and manage the break-in schedule. Rotation — plan which blends to smoke and when. Specialization — assign the pipe to specific blend focus areas; use the AI recommendation button to get suggestions. Maintenance — log cleaning, restoration, repair, reaming, polishing, or stem work events with date, description, cost, and photos. Details — full record view of all stored fields (geometry, materials, measurements, value, and notes). Photos can be added or reordered inline directly from the snapshot panel without opening the edit form.',
    keywords: ['pipe detail', 'pipe snapshot', 'condition', 'rotation', 'specialization', 'maintenance', 'find similar', 'share pipe', 'pipe tabs', 'inline photo'],
    questions: [
      'what is on the pipe detail page',
      'how do i see all pipe details',
      'how do i track pipe condition',
      'how do i log pipe maintenance',
      'how do i plan pipe rotation',
      'how do i set pipe specialization',
      'how do i find similar pipes',
      'how do i share a pipe',
    ],
    synonyms: ['pipe record', 'pipe view', 'pipe profile'],
    relatedArticles: ['add-pipe', 'break-in-schedule', 'pipekeeper-ai-pairings'],
  },
  {
    id: 'pipe-measurements',
    title: 'Pipe Measurements & Imperial/Metric Toggle',
    module: 'pipekeeper',
    category: 'how-to',
    summary: 'Enter and display pipe dimensions in either metric or imperial units.',
    body: 'PipeKeeper stores all pipe measurements in metric (millimetres and grams) internally, but you can enter and view them in imperial (inches and ounces) using the toggle in the Physical Characteristics section of the pipe form. Click the "Show Imperial" / "Show Metric" button to switch. Values are converted automatically on entry and display. Measurable fields include: Length (overall), Weight, Bowl Height, Bowl Width, Bowl Diameter (internal chamber), and Bowl Depth. Your measurement preference is saved in your profile and applied consistently across add and edit forms. Measurements are displayed on the pipe detail snapshot panel and in the Details tab.',
    keywords: ['measurements', 'imperial', 'metric', 'dimensions', 'length', 'weight', 'bowl', 'millimeters', 'inches', 'toggle'],
    questions: [
      'how do i enter measurements in inches',
      'how do i switch to imperial',
      'how do i enter pipe dimensions',
      'what measurements can i track',
      'how do i set metric or imperial',
    ],
    synonyms: ['pipe dimensions', 'imperial metric', 'unit toggle', 'measurement preference'],
    relatedArticles: ['add-pipe', 'pipe-detail-features'],
  },
  {
    id: 'interchangeable-bowls',
    title: 'Interchangeable Bowls',
    module: 'pipekeeper',
    category: 'features',
    summary: 'Track multiple interchangeable bowls for system pipes like Falcon or Gabotherm.',
    body: 'Some pipes (such as Falcon, Gabotherm, Yello-Bole, and Viking) use a shared stem with multiple interchangeable bowls. When adding or editing a pipe, enable the "Has Interchangeable Bowls" toggle in the Interchangeable Bowls section. You can then add each bowl variant with its own name, material, shape, and notes. When logging a smoking session with a system pipe, you can select which bowl variant was used. This lets you track bowl-level usage history separately.',
    keywords: ['interchangeable bowls', 'falcon', 'gabotherm', 'system pipe', 'bowl variants', 'multiple bowls'],
    questions: [
      'how do i track multiple bowls',
      'how do i add interchangeable bowls',
      'what is a system pipe',
      'how do i use falcon pipe bowls',
      'how do i log which bowl i used',
    ],
    synonyms: ['bowl system', 'falcon bowls', 'system pipe bowls'],
    relatedArticles: ['add-pipe', 'log-smoking-session'],
  },

  // ─── WANT LIST & SHOPPING LIST ───────────────────────────────────────────────
  {
    id: 'want-list',
    title: 'Want List',
    module: 'hub',
    category: 'features',
    summary: 'Track pipes, tobacco blends, and whiskey bottles you want to try, buy, or restock.',
    body: 'The Want List lets you track items across four categories: Wish List (items you want to own), Shopping (ready to buy or restock), Tried (items you\'ve tried but don\'t own), and Not for Me (items to avoid). Access it from the main navigation. The Want List only shows item types for your active modules — for example, whiskey bottles are hidden if WhiskeyKeeper is not enabled. To add an item, click "Add Item to Want List", choose a type (Blend, Pipe, or Bottle — only active module types appear), then search by name using AI-powered lookup or add manually. After selecting an item, choose which category to place it in. From the list view, you can move items between categories, archive completed items, or delete them. Use the search bar and sort options to find items quickly. Multi-select lets you share multiple items at once.',
    keywords: ['want list', 'wish list', 'wishlist', 'shopping', 'restock', 'tried', 'acquisition', 'track items', 'want to buy'],
    questions: [
      'what is the want list',
      'how do i use the want list',
      'how do i add something to my want list',
      'how do i track items i want to buy',
      'how do i move an item on my want list',
      'how do i remove something from my want list',
      'why is whiskey not showing on my want list',
    ],
    synonyms: ['wish list', 'wishlist', 'shopping list', 'acquisition list', 'want to buy'],
    relatedArticles: ['shopping-list', 'add-pipe', 'add-bottle'],
  },
  {
    id: 'shopping-list',
    title: 'Shopping List',
    module: 'hub',
    category: 'features',
    summary: 'A focused view of items you are actively planning to purchase.',
    body: 'The Shopping List is a dedicated view for items you are ready to buy. It shows only items in the "Shopping" and "Restock" categories from your Want List. Access it from the main navigation. Items can be added from the Want List by selecting the "Shopping" category when adding, or by moving existing Want List items to Shopping using the Move dropdown on each card. Once purchased, mark items as acquired — this removes them from the active Shopping List and records the acquisition date. Like the Want List, the Shopping List only displays items from your active modules.',
    keywords: ['shopping list', 'buy', 'purchase', 'restock', 'acquire', 'ready to buy'],
    questions: [
      'what is the shopping list',
      'how do i use the shopping list',
      'how do i mark an item as purchased',
      'how do i add to my shopping list',
      'what is the difference between want list and shopping list',
    ],
    synonyms: ['buy list', 'purchase list', 'restock list'],
    relatedArticles: ['want-list', 'add-pipe', 'add-bottle'],
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

  // ─── REFERRAL PROGRAM ───────────────────────────────────────────────────────
  {
   id: 'referral-overview',
   title: 'Referral Program Overview',
   module: 'referral',
   category: 'getting-started',
   summary: 'Earn free access to PipeKeeper, WhiskeyKeeper, CigarKeeper, and WineKeeper by inviting friends.',
   body: 'The Referral Program lets you earn free module access by inviting friends to CollectionKeeper. When a friend signs up using your referral link and completes a paid subscription, you earn a free month of access to any module. Earn multiple rewards by referring multiple friends. You can redeem rewards for any active module (PipeKeeper, WhiskeyKeeper, CigarKeeper, WineKeeper). For Stripe subscribers, rewards auto-apply as billing credits. For iOS subscribers or free users, rewards must be manually redeemed by selecting a module. Access your referral dashboard from the main navigation to view your unique referral code, share your link, and track progress.',
   keywords: ['referral', 'refer', 'earn', 'free access', 'invite', 'friend', 'reward', 'program', 'share'],
   questions: [
     'how do i use the referral program',
     'how do i invite a friend',
     'how do i earn free access',
     'how do i earn a free month',
     'what is the referral program',
     'how do i share my referral link',
     'how do i earn rewards',
     'can i earn multiple rewards',
   ],
   synonyms: ['refer a friend', 'earn free access', 'referral rewards', 'invitation program'],
   relatedArticles: ['referral-sharing', 'referral-redeeming', 'referral-tracking'],
  },
  {
   id: 'referral-sharing',
   title: 'Sharing Your Referral Link',
   module: 'referral',
   category: 'how-to',
   summary: 'Share your referral code and link with friends using email, link copy, or native share.',
   body: 'Your referral dashboard shows your unique referral code (e.g., PK-ABC123) and a complete referral link. Three ways to share: Email Invite — enter a friend\'s email, add a personal message, and send. Link Copy — click Copy Link and paste the URL anywhere (messages, social media, email). Native Share — click the Share button on mobile to open your device\'s native share sheet. Every friend who clicks your link and signs up will be tracked. You can share your link unlimited times and with as many people as you want. Your code is permanent and never expires.',
   keywords: ['share', 'referral link', 'invite', 'email', 'copy link', 'share button', 'social media', 'send'],
   questions: [
     'how do i share my referral link',
     'how do i email a referral invite',
     'how do i copy my referral link',
     'how do i use native share',
     'where do i find my referral code',
     'can i customize my referral link',
     'does my referral link expire',
   ],
   synonyms: ['share link', 'send invite', 'referral code', 'share referral'],
   relatedArticles: ['referral-overview', 'referral-tracking'],
  },
  {
   id: 'referral-tracking',
   title: 'Tracking Referral Progress',
   module: 'referral',
   category: 'how-to',
   summary: 'Monitor your referrals, clicks, and earned rewards on your referral dashboard.',
   body: 'The Referral Dashboard displays your progress with key metrics: Invites Sent (total email invites), Links Copied (times you copied your link), Recipient Clicks (unique clicks from friends), Qualified Referrals (friends who subscribed and passed fraud checks), and Earned Free Months/Years (total rewards accumulated). The Pending Rewards section shows each reward\'s status: pending (awaiting processing), ready to apply (ready to use), applied (Stripe credit applied), redeemed (iOS/free access activated), or failed (retry available). Rewards typically process within 24–48 hours. Use the referral stats to identify which sharing method works best (email vs link copy) and refine your outreach accordingly.',
   keywords: ['tracking', 'progress', 'metrics', 'clicks', 'referrals', 'rewards', 'status', 'dashboard', 'qualified'],
   questions: [
     'how do i track my referrals',
     'how do i see my progress',
     'where are my referral stats',
     'why does a reward show pending',
     'how long does a reward take',
     'what is a qualified referral',
     'how do i see pending rewards',
   ],
   synonyms: ['referral stats', 'progress tracking', 'reward status', 'referral metrics'],
   relatedArticles: ['referral-overview', 'referral-redeeming'],
  },
  {
   id: 'referral-redeeming',
   title: 'Redeeming Referral Rewards',
   module: 'referral',
   category: 'how-to',
   summary: 'Claim your earned free access by selecting a module and redeeming your rewards.',
   body: 'How you redeem depends on your billing provider. Stripe Subscribers: rewards auto-apply as billing credits within 24 hours — no action needed. Check your Stripe portal for details. iOS Subscribers: click Redeem on a reward card, select a module (PipeKeeper, WhiskeyKeeper, CigarKeeper, or WineKeeper), confirm, and access activates within seconds. Free Users: same as iOS — click Redeem, select a module, and free access begins immediately for 1 month (or 1 year if you earned a longer reward). Each reward can only be used for one module. If you earn multiple rewards, you can use them for different modules simultaneously. Free access expires after the earned period, but you can earn and redeem additional rewards anytime.',
   keywords: ['redeem', 'reward', 'claim', 'activate', 'module', 'free access', 'select', 'module selection'],
   questions: [
     'how do i redeem a reward',
     'how do i claim my free access',
     'how do i select a module',
     'how do i activate a reward',
     'what happens when free access expires',
     'can i redeem multiple rewards',
     'why is my redeem button grayed out',
   ],
   synonyms: ['claim reward', 'activate free access', 'use reward', 'redeem free month'],
   relatedArticles: ['referral-overview', 'referral-modules'],
  },
  {
   id: 'referral-modules',
   title: 'Choosing a Module for Free Access',
   module: 'referral',
   category: 'how-to',
   summary: 'Select which module to activate when you redeem a referral reward.',
   body: 'When redeeming a referral reward, you choose which module to activate: PipeKeeper (pipe and tobacco tracking), WhiskeyKeeper (whiskey bottle collection), CigarKeeper (cigar collection and humidors), or WineKeeper (wine collection). Once you select a module, that reward is tied to that module for the duration of your free access. If you earn multiple rewards, each can be redeemed for a different module — you can have simultaneous free access to multiple modules. After free access expires, the module locks unless you have a paid subscription or earn another reward. You can redeem future rewards for the same or different modules based on your interests.',
   keywords: ['module', 'select module', 'pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper', 'choose', 'activate'],
   questions: [
     'how do i choose a module',
     'which module should i select',
     'can i change which module my reward is for',
     'can i have free access to multiple modules',
     'what modules are available',
   ],
   synonyms: ['module selection', 'choose module', 'activate module'],
   relatedArticles: ['referral-redeeming', 'referral-overview'],
  },
  {
   id: 'referral-faq',
   title: 'Referral Program FAQ',
   module: 'referral',
   category: 'features',
   summary: 'Common questions about earning, redeeming, and sharing referral rewards.',
   body: 'How much do I earn? One qualified referral = one free month (or free year if configured). No cap — earn as many as you want. What counts as qualified? Your friend must sign up with your link AND complete a paid subscription. Do trials count? Only if they convert to paid. How long does processing take? Typically 24–48 hours with automated fraud checks. Can I earn unlimited rewards? Yes. Can rewards be transferred? No, they\'re tied to your account. What if my reward doesn\'t show up? Wait 48 hours, check spam folder if email invite sent. Do free trials count as subscriptions? Only if converted to paid. For detailed FAQ, visit the Referral Help Center.',
   keywords: ['faq', 'question', 'answer', 'earn', 'redemption', 'trial', 'processing', 'unlimited'],
   questions: [
     'referral faq',
     'how much do i earn per referral',
     'how long does it take',
     'what if my reward doesn\'t appear',
     'can i earn unlimited rewards',
     'do trials count',
     'is there a limit to referrals',
   ],
   synonyms: ['frequently asked questions', 'referral questions', 'common issues'],
   relatedArticles: ['referral-overview', 'referral-redeeming', 'referral-tracking'],
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
  'want list': 'want-list',
  'wishlist': 'want-list',
  'wish list': 'want-list',
  'shopping list': 'shopping-list',
  'pipe detail': 'pipe-detail-features',
  'pipe condition': 'pipe-detail-features',
  'pipe maintenance': 'pipe-detail-features',
  'pipe rotation': 'pipe-detail-features',
  'pipe specialization': 'pipe-detail-features',
  'break in': 'break-in-schedule',
  'break-in': 'break-in-schedule',
  'measurements': 'pipe-measurements',
  'imperial': 'pipe-measurements',
  'metric': 'pipe-measurements',
  'interchangeable bowls': 'interchangeable-bowls',
  'falcon pipe': 'interchangeable-bowls',
  'find similar': 'pipe-detail-features',
  'cigarkeeper': 'cigarkeeper-overview',
  'cigar overview': 'cigarkeeper-overview',
  'add cigar': 'add-cigar',
  'new cigar': 'add-cigar',
  'cigar session': 'log-cigar-session',
  'log cigar': 'log-cigar-session',
  'humidor': 'cigar-humidor',
  'humidor maintenance': 'cigar-humidor',
  'cigar insights': 'cigar-insights',
   'cigar analytics': 'cigar-insights',
   'referral program': 'referral-overview',
   'earn free access': 'referral-overview',
   'refer a friend': 'referral-sharing',
   'share referral': 'referral-sharing',
   'redeem reward': 'referral-redeeming',
   'referral reward': 'referral-tracking',
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
  cigarkeeper: { tutorials: [], troubleshooting: [], features: [] },
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
    'cigar': 'cigarkeeper-overview',
    'cigars': 'cigarkeeper-overview',
    'humidor': 'cigar-humidor',
  };
  const id = map[screenName];
  return id ? { article: getArticleById(id) } : null;
}

export default DOCUMENTATION;