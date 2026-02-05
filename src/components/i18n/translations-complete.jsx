/**
 * Complete translation map for all locales
 * Fills all missing keys identified in audit
 */

export const translationsComplete = {
  en: {
    common: {
      pageTitle: '',
      pageSubtitle: '',
      loading: 'Loading...',
      refresh: 'Refresh',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      close: 'Close',
      unknown: 'Unknown',
      of: 'of',
    },
    home: {
      pageTitle: 'My Collection',
      pageSubtitle: 'Catalog, track, and analyze your pipe and tobacco collection',
      pipeCollection: 'Pipe Collection',
      trackAndValue: 'Track and value your pipes',
      pipesInCollection: 'Pipes in collection',
      collectionValue: 'Collection value',
      viewCollection: 'View collection',
      tobaccoCellar: 'Tobacco Cellar',
      manageBlends: 'Manage blends and inventory',
      tobaccoBlends: 'Tobacco blends',
      cellared: 'Cellared',
      viewCellar: 'View cellar',
      favorites: 'Favorites',
      recentPipes: 'Recent Pipes',
      recentTobacco: 'Recent Tobacco',
      viewAll: 'View All',
      bulkImport: 'Bulk Import',
      importDesc: 'Import pipes or tobacco from CSV or Excel',
      welcomeToCollection: 'Welcome to PipeKeeper',
          pageSubtitle: 'Catalog, track, and enjoy your pipe and tobacco collection',
          emptyStateDesc: 'Start cataloging your pipes and tobacco blends to track your collection',
      addFirstPipe: 'Add First Pipe',
      addFirstBlend: 'Add First Blend',
      cellarBreakdown: 'Cellar Breakdown',
      noCellaredTobacco: 'No cellared tobacco yet',
      testingPeriodTitle: 'Testing Period',
      importantInfo: 'Important Information',
      testingPeriodBody: 'You are currently in a testing period. Your data may be reset during this time.',
      testingThankYou: 'Thank you for testing and helping us improve PipeKeeper!',
      gotItThanks: 'Got it, thanks!',
      errorTitle: 'Something went wrong',
      errorRefresh: 'An error occurred. Please try again.',
      insightsError: 'Error loading insights',
      expertTobacconistError: 'Error loading expert tobacconist',
      loadingCollection: 'Loading your collection...',
    },
    pipes: {
      usageLog: 'Usage Log',
      totalBowls: 'Total Bowls',
      log: 'Log',
      pairingGrid: 'Pairing Grid',
      rotation: 'Rotation',
      stats: 'Stats',
    },
    tobacco: {
      search: 'Search',
      filter: 'Filter',
      shape: 'Shape',
      material: 'Material',
      allShapes: 'All Shapes',
      allMaterials: 'All Materials',
    },
    pairingMatrix: {
      pairingMatrixTitle: 'Pairing Matrix',
      pairingMatrixSubtitle: 'AI-generated pipe and tobacco pairings',
      outOfDateRegenRec: 'Out of date - regeneration recommended',
      undo: 'Undo',
      regenerate: 'Regenerate',
    },
    collectionOptimization: {
      collectionOptimizationTitle: 'Collection Optimization',
      collectionOptimizationSubtitle: 'AI analysis of your collection',
      collectionOptimizationTooltip: 'Collection optimization recommendations',
      outOfDateRegenRec: 'Out of date - regeneration recommended',
      undo: 'Undo',
      regenerate: 'Regenerate',
    },
    whatIf: {
      whatIfTitle: 'What If Analysis',
      whatIfSubtitle: 'Ask hypothetical questions about your collection',
    },
    askTheExpert: {
      askTheExpertTitle: 'Ask The Expert',
      askTheExpertDesc: 'Get personalized advice from an expert tobacconist',
      chatWithTobacconist: 'Chat with Tobacconist',
    },
    identification: {
      identificationTitle: 'AI Pipe Identifier',
      identificationSubtitle: 'Upload photos for quick identification help',
      identify: 'Identify',
      classifyGeometryFromPhotos: 'Classify geometry from photos',
      analyzePipeGeometry: 'Analyze Pipe Geometry',
    },
    auth: {
      loginRequired: 'Login Required',
      loginPrompt: 'Please log in to continue',
      login: 'Log In',
    },
    nav: {
      home: 'Home',
      pipes: 'Pipes',
      cellar: 'Cellar',
      tobacco: 'Tobacco',
      community: 'Community',
      profile: 'Profile',
      help: 'Help',
      faq: 'FAQ',
      support: 'Support',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      reports: 'Reports',
      subscriptionQueue: 'Subscription Requests',
      quickAccess: 'Quick Access',
      syncing: 'Syncing...',
    },
    subscription: {
      trialEndedTitle: 'Your Trial Has Ended',
      trialEndedBody: 'Upgrade to Premium or Pro to continue enjoying all features.',
      continueFree: 'Continue Free',
      subscribe: 'Subscribe',
    },
    units: {
      tin: 'tin',
      tinPlural: 'tins',
    },
    identificationTooltip: 'Upload photos for quick identification',
    whatIfTooltip: 'Run hypothetical scenarios',
    updatesTooltip: 'Check automatic suggestions',
    outOfDateRegenRec: 'Out of date - regeneration recommended',
    tobacconist: {
      noRecommendation: 'No Recommendation',
      versatilePattern: 'Versatile Pattern',
      tobaccoBlendClassification: 'Tobacco Blend Classification',
      tobaccoBlendClassificationDesc: 'Review and refine your blend categories',
      reclassifyBlends: 'Reclassify Blends',
      pairingMatrix: 'Pairing Matrix',
      undo: 'Undo'
    },
    profile: {
      manageSubscription: 'Manage Subscription'
    },
    helpContent: {
      faqFull: {
        pageTitle: "PipeKeeper FAQ",
        pageSubtitle: "Definitions, general information, and disclaimers",
        navHowTo: "How-To Guides",
        navTroubleshooting: "Troubleshooting",
        verificationHelp: {
          q: "🔒 I can't log in / My verification code expired - What do I do?",
          intro: "If you're having trouble with email verification or login:",
          steps: [
            "Try logging in again - the system will send a new verification code automatically",
            "Check your spam/junk folder for the verification email",
            "Visit our Verification Help page for detailed instructions",
            "Contact support directly at admin@pipekeeperapp.com"
          ],
          note: "Include your email address when contacting support so we can help you quickly."
        },
        sections: {
          general: {
            title: "General",
            items: [
              {
                id: "what-is-pipekeeper",
                q: "What is PipeKeeper?",
                a: "PipeKeeper is a comprehensive pipe and tobacco collection management app designed for pipe smokers. It helps you catalog your pipes, track tobacco inventory, log smoking sessions, and get AI-powered insights to optimize your collection."
              },
              {
                id: "who-is-pipekeeper-for",
                q: "Who is PipeKeeper for?",
                a: "PipeKeeper is for pipe enthusiasts of all levels—from casual smokers to serious collectors. Whether you're just starting out or managing a large collection, PipeKeeper provides tools to organize, document, and understand your pipes and tobaccos."
              }
            ]
          },
          gettingStarted: {
            title: "Getting Started",
            items: [
              {
                id: "first-steps",
                q: "What are my first steps with PipeKeeper?",
                a: "Start by creating your first pipe or tobacco entry. Use the intuitive forms to add details like shape, material, and condition. You can also bulk import from CSV if you already have a collection list.",
                cta: "Restart tutorial"
              },
              {
                id: "add-pipes",
                q: "How do I add pipes to my collection?",
                a: "Navigate to the Pipes section and click 'Add Pipe'. Fill in details like name, maker, shape, material, and condition. Photos and measurements are optional but help you identify and value pipes accurately."
              },
              {
                id: "add-tobacco",
                q: "How do I add tobacco blends?",
                a: "Go to the Tobacco section and click 'Add Blend'. Enter the blend name, manufacturer, type, and quantity. Track whether tobacco is open or cellared for aging."
              }
            ]
          },
          fieldDefinitions: {
            title: "Field Definitions",
            items: [
              {
                id: "pipe-shape",
                q: "What pipe shapes are available?",
                a: "PipeKeeper supports 40+ standard pipe shapes including Billiard, Bent Apple, Dublin, Bulldog, Rhodesian, Churchwarden, and more. Select 'Unknown' if your pipe doesn't fit a standard category."
              },
              {
                id: "tobacco-types",
                q: "What tobacco blend types are supported?",
                a: "We support Virginia, Burley, Oriental, Perique, Cavendish, English, Balkan, Aromatic, and many other recognized blend categories. You can also use 'Other' for custom classifications."
              },
              {
                id: "condition-ratings",
                q: "How do I rate pipe condition?",
                a: "Condition options range from 'Mint' (never used) to 'Poor' (heavily damaged). 'Estate' ratings are for vintage/secondhand pipes in their original unrestored state. Choose the category that best reflects your pipe's actual appearance and function."
              },
              {
                id: "bowl-styles",
                q: "What are bowl styles?",
                a: "Bowl style describes the internal chamber shape: Cylindrical (straight walls), Conical (tapered), Rounded/Ball, Oval/Egg, Squat/Pot, Chimney (tall), or Freeform. This affects how tobacco burns and the smoking experience."
              }
            ]
          },
          tobaccoValuation: {
            title: "Tobacco Valuation",
            items: [
              {
                id: "tobacco-value",
                q: "How is tobacco value calculated?",
                a: "PipeKeeper can estimate tobacco value based on current market prices, blend rarity, condition, and age. Premium users get access to AI-powered valuation with confidence ranges. You can also manually enter known market values."
              },
              {
                id: "cellaring-value",
                q: "Do cellared blends increase in value?",
                a: "Some high-quality tobacco blends (Virginia-based, latakia blends) improve with age and can increase in value. PipeKeeper tracks when tobacco was cellared to help you monitor aging potential and optimal aging windows."
              },
              {
                id: "discontinued-blends",
                q: "How are discontinued blends valued?",
                a: "Discontinued blends often become more valuable as supply decreases. PipeKeeper helps you track production status and provides market comparisons for rare or out-of-production blends."
              }
            ]
          },
          featuresAndTools: {
            title: "Features & Tools",
            items: [
              {
                id: "pairing-matrix",
                q: "What is the Pairing Matrix?",
                intro: "The Pairing Matrix is an AI-generated recommendation engine that suggests optimal pipe-tobacco combinations from your collection.",
                points: [
                  "Analyzes pipe characteristics (size, chamber, heat profile)",
                  "Matches with tobacco types you own",
                  "Scores pairings for balance and enjoyment",
                  "Updates as you add new pipes and blends"
                ]
              },
              {
                id: "smoking-log",
                q: "How do I use the Smoking Log?",
                a: "Log each smoking session with date, pipe, blend, and duration. Track notes about flavor, performance, and break-in progress. Your logs fuel insights and help optimize your rotation and pairing recommendations."
              },
              {
                id: "break-in-schedule",
                q: "What is the Break-In Schedule?",
                a: "New pipes benefit from gradual break-in with varied tobacco types. PipeKeeper generates personalized break-in schedules recommending tobacco progressions to develop a carbon cake naturally and ensure optimal performance."
              },
              {
                id: "collection-optimization",
                q: "What does Collection Optimization do?",
                intro: "This AI feature analyzes your entire collection and provides strategic recommendations:",
                points: [
                  "Identifies specializations for each pipe",
                  "Highlights collection gaps and redundancies",
                  "Suggests next purchases to improve balance",
                  "Ranks pairings by optimal score"
                ]
              },
              {
                id: "expert-tobacconist",
                q: "Who is the Expert Tobacconist?",
                a: "An AI-powered advisor trained on pipe smoking knowledge. Ask questions about blends, pairings, aging, maintenance, or strategy. Get personalized recommendations based on your specific collection and preferences."
              }
            ]
          },
          accountsAndData: {
            title: "Accounts & Data",
            items: [
              {
                id: "privacy",
                q: "Is my data private and secure?",
                a: "Yes. Your collection data is stored securely and only visible to you unless you choose to make your profile public. PipeKeeper does not sell or share your data. See our Privacy Policy for full details."
              },
              {
                id: "export-data",
                q: "Can I export my collection?",
                a: "Yes. Premium users can export pipes and tobacco as CSV, generate PDF reports, and create aging/smoking logs. This helps with backup and sharing collection information."
              },
              {
                id: "delete-account",
                q: "How do I delete my account?",
                a: "Contact support at admin@pipekeeperapp.com. Your account and all associated data will be permanently deleted. This action cannot be undone."
              },
              {
                id: "multiple-accounts",
                q: "Can I have multiple accounts?",
                a: "You can sign up with different email addresses to manage separate collections. However, each account is independent and data cannot be transferred between them."
              }
            ]
          },
          ai: {
            title: "AI Features & Accuracy",
            items: [
              {
                id: "pipe-identification",
                q: "How accurate is AI pipe identification?",
                a: "AI identification provides helpful suggestions and analysis—it's a tool to assist, not a guarantee. For vintage or rare pipes, expert authentication may still be needed. Always verify with the pipe maker's catalogs or expert forums when possible."
              },
              {
                id: "valuation-confidence",
                q: "How confident are tobacco valuations?",
                a: "AI valuations include confidence ratings (High, Medium, Low) based on available market data. Discontinued blends and rare vintages have lower confidence. Use our estimates as guides, not fixed values."
              },
              {
                id: "ai-learning",
                q: "Does the AI learn from my collection?",
                a: "Yes. As you log data, add photos, and provide feedback, the system refines recommendations specifically for your collection style and preferences. The more you use PipeKeeper, the better the suggestions become."
              },
              {
                id: "ai-accuracy-disclaimer",
                q: "What are the limitations of AI recommendations?",
                a: "AI is powerful but not perfect. Pairing scores, valuations, and identification suggestions should be used as starting points for your own judgment. Personal preference, pipe condition, and tobacco freshness also impact real-world results."
              }
            ]
          },
          support: {
            title: "Support",
            contactQ: "How do I contact support?",
            contactIntro: "Have questions or issues? Reach out at admin@pipekeeperapp.com or visit",
            contactLinks: "You can also view our Terms of Service and Privacy Policy:"
          }
        }
      }
    }
  },
  es: {
    pipes: { search: 'Buscar', filter: 'Filtrar', shape: 'Forma', material: 'Material', allShapes: 'Todas las formas', allMaterials: 'Todos los materiales' },
    tobacco: { allTypes: 'Todos los tipos', allStrengths: 'Todas las fuerzas', search: 'Buscar' },
    common: { loading: 'Cargando...', refresh: 'Actualizar', cancel: 'Cancelar', save: 'Guardar', delete: 'Eliminar', close: 'Cerrar', unknown: 'Desconocido', of: 'de' },
    units: { tin: 'lata', tinPlural: 'latas' },
    helpContent: {
      faqFull: {
        pageTitle: "Preguntas Frecuentes de PipeKeeper",
        pageSubtitle: "Definiciones, información general y descargos de responsabilidad",
        navHowTo: "Guías de Cómo Hacer",
        navTroubleshooting: "Solución de Problemas",
        verificationHelp: {
          q: "🔒 No puedo iniciar sesión / Mi código de verificación expiró - ¿Qué hago?",
          intro: "Si tiene problemas con la verificación de correo electrónico o inicio de sesión:",
          steps: [
            "Intente iniciar sesión nuevamente - el sistema enviará un nuevo código de verificación automáticamente",
            "Verifique su carpeta de spam/correo no deseado para el correo de verificación",
            "Visite nuestra página de Ayuda de Verificación para obtener instrucciones detalladas",
            "Póngase en contacto con el soporte directamente en admin@pipekeeperapp.com"
          ],
          note: "Incluya su dirección de correo electrónico al ponerse en contacto con el soporte para que podamos ayudarle rápidamente."
        }
      },
      tooltips: {
        collectionPatterns: "This section summarizes patterns and totals across your collection based on the data you've entered.",
        reports: "Generate exportable summaries of your collection for reference or documentation.",
        agingDashboard: "Monitor cellared tobacco and get recommendations on optimal aging times based on blend characteristics."
      }
    },
    identificationTooltip: 'Sube fotos para identificación rápida',
    whatIfTooltip: 'Ejecuta escenarios hipotéticos',
    updatesTooltip: 'Revisa recomendaciones automáticas',
    outOfDateRegenRec: 'Desactualizado - se recomienda regeneración',
    tobacconist: {
      title: 'Tabaquista Experto',
      subtitle: 'Consulta de expertos y actualizaciones de IA',
      identify: 'Identificar',
      optimize: 'Optimizar',
      whatIf: '¿Y Si?',
      aiUpdates: 'Actualizaciones IA',
      identificationTitle: 'Identificador de Tuberías de IA',
      identificationSubtitle: 'Carga fotos para obtener ayuda de identificación rápida',
      identificationEmpty: 'Comienza añadiendo tus primeras pipas o mezclas de tabaco',
      addFirstPipe: 'Añadir Primera Pipa',
      addFirstBlend: 'Añadir Primera Mezcla',
      optimizationTitle: 'Optimizador de Colecciones',
      optimizationSubtitle: 'Análisis de IA de tu colección con recomendaciones',
      optimizationTooltip: 'Obtén análisis profundo de tu colección de IA',
      optimizationEmpty: 'Comienza añadiendo pipas a tu colección',
      whatIfTitle: 'Análisis de Escenarios',
      whatIfSubtitle: 'Haz preguntas sobre estrategia de colección',
      whatIfEmpty: 'Comienza añadiendo pipas y mezclas',
      updatesTitle: 'Actualizaciones de IA',
      updatesSubtitle: 'Recomendaciones automáticas basadas en tu colección',
      updateTooltip: 'Revisa actualizaciones de IA periódicas',
      optional: 'Opcional',
      tooltipText: 'Las herramientas de IA te ayudan a optimizar tu colección',
      askTheExpert: 'Pregunta al Experto',
      askTheExpertDesc: 'Obtén consejo personalizado de un tabacalero experto',
      sendMessage: 'Enviar',
      welcomeTitle: 'Bienvenido a tu Tabaquista Personal',
      welcomeMessage: 'Pregúntame sobre recomendaciones de pipas, maridajes de tabaco u optimización de colecciones.',
      generatePairings: 'Generar Maridajes',
      generatePairingsPrompt: 'Generar recomendaciones de maridaje para mi colección',
      runOptimization: 'Ejecutar Optimización',
      runOptimizationPrompt: 'Ejecutar análisis de optimización en mi colección',
      newConversation: 'Nueva Conversación',
      inputPlaceholder: 'Pregunta sobre maridajes, recomendaciones o tu colección...',
      chatTab: 'Chat',
      updatesTab: 'Actualizaciones de IA',
      startingConversation: 'Iniciando conversación...',
      pairingMatrix: 'Matriz de Maridaje',
      collectionOptimization: 'Optimización de Colección',
      outOfDate: 'Desactualizado - se recomienda regeneración',
      upToDate: 'Actualizado',
      undo: 'Deshacer',
      regenerate: 'Regenerar',
      breakInSchedules: 'Programas de Rodaje',
      breakInNote: 'La regeneración se maneja por pipa en la página de detalle de pipa (con deshacer/historial).',
      noRecommendation: 'Sin recomendaciones específicas',
      versatilePattern: 'Versátil - adecuado para muchos tipos de mezclas',
      tobaccoBlendClassification: 'Clasificación de Mezcla de Tabaco',
      tobaccoBlendClassificationDesc: 'Análisis de tipos de mezcla en tu colección',
      reclassifyBlends: 'Reclasificar Mezclas',
      hide: 'Ocultar',
      rotationPlanner: 'Planificador de Rotación',
      neverSmoked: 'Nunca Fumado',
      noUsageSessionsRecorded: 'Sin sesiones de fumar registradas'
      }
      },
  fr: {
    pipes: { search: 'Rechercher', filter: 'Filtrer', shape: 'Forme', material: 'Matériau', allShapes: 'Toutes les formes', allMaterials: 'Tous les matériaux' },
    tobacco: { allTypes: 'Tous les types', allStrengths: 'Toutes les puissances', search: 'Rechercher' },
    common: { loading: 'Chargement...', refresh: 'Rafraîchir', cancel: 'Annuler', save: 'Enregistrer', delete: 'Supprimer', close: 'Fermer', unknown: 'Inconnu', of: 'de' },
    units: { tin: 'boîte', tinPlural: 'boîtes' },
    helpContent: {
      faqFull: {
        pageTitle: "FAQ de PipeKeeper",
        pageSubtitle: "Définitions, informations générales et avis de non-responsabilité",
        navHowTo: "Guides Comment Faire",
        navTroubleshooting: "Dépannage",
        verificationHelp: {
          q: "🔒 Je ne peux pas me connecter / Mon code de vérification a expiré - Que faire?",
          intro: "Si vous avez des problèmes de vérification d'e-mail ou de connexion:",
          steps: [
            "Essayez de vous reconnecter - le système enverra un nouveau code de vérification automatiquement",
            "Consultez votre dossier spam/indésirables pour l'e-mail de vérification",
            "Visitez notre page d'aide à la vérification pour des instructions détaillées",
            "Contactez le support directement à admin@pipekeeperapp.com"
          ],
          note: "Incluez votre adresse e-mail lorsque vous contactez le support afin que nous puissions vous aider rapidement."
        }
      }
    },
    identificationTooltip: 'Téléchargez des photos pour identification rapide',
    whatIfTooltip: 'Exécutez des scénarios hypothétiques',
    updatesTooltip: 'Consultez les recommandations automatiques',
    outOfDateRegenRec: 'Obsolète - régénération recommandée',
    tobacconist: {
       title: 'Maître Tabaccologue',
       subtitle: 'Consultation d\'expert et mises à jour IA',
       identify: 'Identifier',
       optimize: 'Optimiser',
       whatIf: 'Et Si?',
       aiUpdates: 'Mises à Jour IA',
       identificationTitle: 'Identificateur de Pipes IA',
       identificationSubtitle: 'Téléchargez des photos pour obtenir une aide d\'identification rapide',
       identificationEmpty: 'Commencez par ajouter vos premiers pipes ou mélanges de tabac',
       addFirstPipe: 'Ajouter Premier Pipe',
       addFirstBlend: 'Ajouter Premier Mélange',
       optimizationTitle: 'Optimiseur de Collections',
       optimizationSubtitle: 'Analyse IA de votre collection avec recommandations',
       optimizationTooltip: 'Obtenez une analyse approfondie de votre collection par IA',
       optimizationEmpty: 'Commencez par ajouter des pipes à votre collection',
       whatIfTitle: 'Analyse de Scénarios',
       whatIfSubtitle: 'Posez des questions sur la stratégie de collection',
       whatIfEmpty: 'Commencez par ajouter des pipes et des mélanges',
       updatesTitle: 'Mises à Jour IA',
       updatesSubtitle: 'Recommandations automatiques basées sur votre collection',
       updateTooltip: 'Consultez les mises à jour IA périodiques',
       optional: 'Optionnel',
       tooltipText: 'Les outils IA vous aident à optimiser votre collection',
       askTheExpert: 'Demander à l\'Experte',
       askTheExpertDesc: 'Obtenez des conseils personnalisés d\'un tabaccologue expert',
       sendMessage: 'Envoyer',
      welcomeTitle: 'Bienvenue chez votre Tabaccologue Personnel',
      welcomeMessage: 'Posez-moi des questions sur les recommandations de pipes, les accords de tabac ou l\'optimisation de votre collection.',
      generatePairings: 'Générer des Accords',
      generatePairingsPrompt: 'Générer des recommandations d\'accords pour ma collection',
      runOptimization: 'Exécuter l\'Optimisation',
      runOptimizationPrompt: 'Exécuter une analyse d\'optimisation sur ma collection',
      newConversation: 'Nouvelle Conversation',
      inputPlaceholder: 'Posez des questions sur les accords, les recommandations ou votre collection...',
      chatTab: 'Chat',
      updatesTab: 'Mises à Jour IA',
      startingConversation: 'Lancement de la conversation...',
      pairingMatrix: 'Matrice d\'Accords',
      collectionOptimization: 'Optimisation de Collection',
      outOfDate: 'Obsolète - régénération recommandée',
      upToDate: 'À jour',
      undo: 'Annuler',
      regenerate: 'Régénérer',
      breakInSchedules: 'Calendriers de Rodage',
      breakInNote: 'La régénération est gérée par pipe sur la page de détail de pipe (avec annulation/historique).',
      noRecommendation: 'Pas de recommandations spécifiques',
      versatilePattern: 'Polyvalent - adapté à de nombreux types de mélanges',
      tobaccoBlendClassification: 'Classification des Mélanges de Tabac',
      tobaccoBlendClassificationDesc: 'Analyse des types de mélange dans votre collection',
      reclassifyBlends: 'Reclasser les Mélanges',
      hide: 'Masquer',
      rotationPlanner: 'Planificateur de Rotation',
      neverSmoked: 'Jamais Fumé',
      noUsageSessionsRecorded: 'Aucune session de fumage enregistrée'
      }
      },
  de: {
    pipes: { search: 'Suchen', filter: 'Filtern', shape: 'Form', material: 'Material', allShapes: 'Alle Formen', allMaterials: 'Alle Materialien' },
    tobacco: { allTypes: 'Alle Typen', allStrengths: 'Alle Stärken', search: 'Suchen' },
    common: { loading: 'Lädt...', refresh: 'Aktualisieren', cancel: 'Abbrechen', save: 'Speichern', delete: 'Löschen', close: 'Schließen', unknown: 'Unbekannt', of: 'von' },
    units: { tin: 'Dose', tinPlural: 'Dosen' },
    helpContent: {
      faqFull: {
        pageTitle: "PipeKeeper Häufig Gestellte Fragen",
        pageSubtitle: "Definitionen, allgemeine Informationen und Haftungsausschlüsse",
        navHowTo: "Anleitungen",
        navTroubleshooting: "Fehlerbehebung",
        verificationHelp: {
          q: "🔒 Ich kann mich nicht anmelden / Mein Verifizierungscode ist abgelaufen - Was soll ich tun?",
          intro: "Wenn Sie Probleme bei der E-Mail-Verifizierung oder Anmeldung haben:",
          steps: [
            "Versuchen Sie sich erneut anzumelden - das System sendet automatisch einen neuen Verifizierungscode",
            "Überprüfen Sie Ihren Spam-/Junk-Ordner auf die Verifizierungs-E-Mail",
            "Besuchen Sie unsere Verifizierungshilfseite für detaillierte Anweisungen",
            "Kontaktieren Sie den Support direkt unter admin@pipekeeperapp.com"
          ],
          note: "Geben Sie Ihre E-Mail-Adresse an, wenn Sie den Support kontaktieren, damit wir Ihnen schnell helfen können."
        }
      }
    },
    identificationTooltip: 'Laden Sie Fotos für schnelle Identifizierung hoch',
    whatIfTooltip: 'Führen Sie hypothetische Szenarien aus',
    updatesTooltip: 'Überprüfen Sie automatische Empfehlungen',
    outOfDateRegenRec: 'Veraltet - Neugenerierung empfohlen',
    tobacconist: {
       title: 'Meister Tabakkenner',
       subtitle: 'Expertenberatung und KI-Updates',
       identify: 'Identifizieren',
       optimize: 'Optimieren',
       whatIf: 'Was Wenn?',
       aiUpdates: 'KI-Updates',
       identificationTitle: 'KI-Pfeifenidentifizierer',
       identificationSubtitle: 'Laden Sie Fotos hoch, um schnelle Identifizierungshilfe zu erhalten',
       identificationEmpty: 'Beginnen Sie damit, Ihre ersten Pfeifen oder Tabakblends hinzuzufügen',
       addFirstPipe: 'Erste Pfeife Hinzufügen',
       addFirstBlend: 'Erste Mischung Hinzufügen',
       optimizationTitle: 'Sammlungsoptimierer',
       optimizationSubtitle: 'KI-Analyse Ihrer Sammlung mit Empfehlungen',
       optimizationTooltip: 'Erhalten Sie tiefe KI-Analyse Ihrer Sammlung',
       optimizationEmpty: 'Beginnen Sie, Pfeifen zu Ihrer Sammlung hinzuzufügen',
       whatIfTitle: 'Szenarioanalyse',
       whatIfSubtitle: 'Stellen Sie Fragen zur Sammlungsstrategie',
       whatIfEmpty: 'Beginnen Sie, Pfeifen und Blends hinzuzufügen',
       updatesTitle: 'KI-Updates',
       updatesSubtitle: 'Automatische Empfehlungen basierend auf Ihrer Sammlung',
       updateTooltip: 'Überprüfen Sie regelmäßige KI-Updates',
       optional: 'Optional',
       tooltipText: 'KI-Tools helfen Ihnen, Ihre Sammlung zu optimieren',
       askTheExpert: 'Fragen Sie den Experten',
       askTheExpertDesc: 'Erhalten Sie persönliche Beratung von einem Tabakkenner-Experten',
       sendMessage: 'Senden',
      welcomeTitle: 'Willkommen bei Ihrem persönlichen Tabakkenner',
      welcomeMessage: 'Fragen Sie mich nach Pfeifenempfehlungen, Tabakpaarungen oder Sammlungsoptimierung.',
      generatePairings: 'Paarungen Generieren',
      generatePairingsPrompt: 'Generieren Sie Paarungsempfehlungen für meine Sammlung',
      runOptimization: 'Optimierung Ausführen',
      runOptimizationPrompt: 'Führen Sie eine Optimierungsanalyse meiner Sammlung durch',
      newConversation: 'Neues Gespräch',
      inputPlaceholder: 'Fragen Sie nach Paarungen, Empfehlungen oder Ihrer Sammlung...',
      chatTab: 'Chat',
      updatesTab: 'KI-Updates',
      startingConversation: 'Starten des Gesprächs...',
      pairingMatrix: 'Paarungsmatrix',
      collectionOptimization: 'Sammlungsoptimierung',
      outOfDate: 'Veraltet - Neugenerierung empfohlen',
      upToDate: 'Aktuell',
      undo: 'Rückgängig',
      regenerate: 'Neu Generieren',
      breakInSchedules: 'Einrauchpläne',
      breakInNote: 'Die Neugenerierung wird pro Pfeife auf der Pfeifendetailseite verwaltet (mit Rückgängig/Verlauf).',
      noRecommendation: 'Keine spezifischen Empfehlungen',
      versatilePattern: 'Vielseitig - für viele Blendtypen geeignet',
      tobaccoBlendClassification: 'Tabakblend-Klassifizierung',
      tobaccoBlendClassificationDesc: 'Analyse der Blendtypen in Ihrer Sammlung',
      reclassifyBlends: 'Blends Neu Klassifizieren',
      hide: 'Ausblenden',
      rotationPlanner: 'Rotationsplaner',
      neverSmoked: 'Nie Geraucht',
      noUsageSessionsRecorded: 'Keine Rauchsitzungen aufgezeichnet'
      }
      },
  it: {
    pipes: { search: 'Cerca', filter: 'Filtro', shape: 'Forma', material: 'Materiale', allShapes: 'Tutte le forme', allMaterials: 'Tutti i materiali' },
    tobacco: { allTypes: 'Tutti i tipi', allStrengths: 'Tutte le intensità', search: 'Cerca' },
    common: { loading: 'Caricamento...', refresh: 'Aggiorna', cancel: 'Annulla', save: 'Salva', delete: 'Elimina', close: 'Chiudi', unknown: 'Sconosciuto', of: 'di' },
    units: { tin: 'scatola', tinPlural: 'scatole' },
    helpContent: {
      faqFull: {
        pageTitle: "Domande Frequenti su PipeKeeper",
        pageSubtitle: "Definizioni, informazioni generali e clausole di esonero",
        navHowTo: "Guide Pratiche",
        navTroubleshooting: "Risoluzione dei Problemi",
        verificationHelp: {
          q: "🔒 Non riesco ad accedere / Il mio codice di verifica è scaduto - Cosa faccio?",
          intro: "Se hai problemi con la verifica e-mail o l'accesso:",
          steps: [
            "Prova ad accedere di nuovo - il sistema invierà automaticamente un nuovo codice di verifica",
            "Controlla la cartella spam/posta indesiderata per l'e-mail di verifica",
            "Visita la nostra pagina di aiuto per la verifica per le istruzioni dettagliate",
            "Contatta il supporto direttamente a admin@pipekeeperapp.com"
          ],
          note: "Includi il tuo indirizzo e-mail quando contatti il supporto in modo da potervi aiutare rapidamente."
        }
      }
    },
    identificationTooltip: 'Carica foto per identificazione rapida',
    whatIfTooltip: 'Esegui scenari ipotetici',
    updatesTooltip: 'Controlla i suggerimenti automatici',
    outOfDateRegenRec: 'Non aggiornato - rigenerazione consigliata',
    tobacconist: {
       title: 'Maestro Tabaccaio',
       subtitle: 'Consulenza di esperti e aggiornamenti IA',
       identify: 'Identifica',
       optimize: 'Ottimizza',
       whatIf: 'E Se?',
       aiUpdates: 'Aggiornamenti IA',
       identificationTitle: 'Identificatore di Pipe IA',
       identificationSubtitle: 'Carica foto per ottenere aiuto di identificazione rapida',
       identificationEmpty: 'Inizia aggiungendo i tuoi primi pipe o blend di tabacco',
       addFirstPipe: 'Aggiungi Prima Pipa',
       addFirstBlend: 'Aggiungi Prima Miscela',
       optimizationTitle: 'Ottimizzatore di Collezioni',
       optimizationSubtitle: 'Analisi IA della tua collezione con raccomandazioni',
       optimizationTooltip: 'Ottieni analisi profonda IA della tua collezione',
       optimizationEmpty: 'Inizia aggiungendo pipe alla tua collezione',
       whatIfTitle: 'Analisi di Scenari',
       whatIfSubtitle: 'Poni domande sulla strategia di collezione',
       whatIfEmpty: 'Inizia aggiungendo pipe e blend',
       updatesTitle: 'Aggiornamenti IA',
       updatesSubtitle: 'Raccomandazioni automatiche basate sulla tua collezione',
       updateTooltip: 'Controlla gli aggiornamenti IA periodici',
       optional: 'Opzionale',
       tooltipText: 'Gli strumenti IA ti aiutano a ottimizzare la tua collezione',
       askTheExpert: 'Chiedi all\'Esperto',
       askTheExpertDesc: 'Ottieni consigli personalizzati da un esperto tabaccaio',
       sendMessage: 'Invia',
      welcomeTitle: 'Benvenuto nel Tuo Tabaccaio Personale',
      welcomeMessage: 'Chiedimi consigli sulle pipe, abbinamenti di tabacco o ottimizzazione della collezione.',
      generatePairings: 'Genera Abbinamenti',
      generatePairingsPrompt: 'Genera raccomandazioni di abbinamenti per la mia collezione',
      runOptimization: 'Esegui Ottimizzazione',
      runOptimizationPrompt: 'Esegui analisi di ottimizzazione sulla mia collezione',
      newConversation: 'Nuova Conversazione',
      inputPlaceholder: 'Fai domande su abbinamenti, consigli o la tua collezione...',
      chatTab: 'Chat',
      updatesTab: 'Aggiornamenti IA',
      startingConversation: 'Avvio della conversazione...',
      pairingMatrix: 'Matrice di Abbinamenti',
      collectionOptimization: 'Ottimizzazione Collezione',
      outOfDate: 'Non aggiornato - rigenerazione consigliata',
      upToDate: 'Aggiornato',
      undo: 'Annulla',
      regenerate: 'Rigenera',
      breakInSchedules: 'Programmi di Rodaggio',
      breakInNote: 'La rigenerazione è gestita per pipe nella pagina dei dettagli della pipe (con annulla/cronologia).',
      noRecommendation: 'Nessuna raccomandazione specifica',
      versatilePattern: 'Versatile - adatto a molti tipi di blend',
      tobaccoBlendClassification: 'Classificazione Blend Tabacco',
      tobaccoBlendClassificationDesc: 'Analisi dei tipi di blend nella tua collezione',
      reclassifyBlends: 'Riclassifica Blend',
      hide: 'Nascondi',
      rotationPlanner: 'Pianificatore di Rotazione',
      neverSmoked: 'Mai Fumato',
      noUsageSessionsRecorded: 'Nessuna sessione di fumo registrata'
      }
      },
  'pt-BR': {
    pipes: { search: 'Pesquisar', filter: 'Filtrar', shape: 'Forma', material: 'Material', allShapes: 'Todas as formas', allMaterials: 'Todos os materiais' },
    tobacco: { allTypes: 'Todos os tipos', allStrengths: 'Todas as potências', search: 'Pesquisar' },
    common: { loading: 'Carregando...', refresh: 'Atualizar', cancel: 'Cancelar', save: 'Salvar', delete: 'Excluir', close: 'Fechar', unknown: 'Desconhecido', of: 'de' },
    units: { tin: 'lata', tinPlural: 'latas' },
    helpContent: {
      faqFull: {
        pageTitle: "Perguntas Frequentes do PipeKeeper",
        pageSubtitle: "Definições, informações gerais e isenções de responsabilidade",
        navHowTo: "Guias Práticos",
        navTroubleshooting: "Solução de Problemas",
        verificationHelp: {
          q: "🔒 Não consigo fazer login / Meu código de verificação expirou - O que faço?",
          intro: "Se você está tendo problemas com verificação de e-mail ou login:",
          steps: [
            "Tente fazer login novamente - o sistema enviará um novo código de verificação automaticamente",
            "Verifique sua pasta de spam/lixo para o e-mail de verificação",
            "Visite nossa página de Ajuda de Verificação para instruções detalhadas",
            "Entre em contato com o suporte diretamente em admin@pipekeeperapp.com"
          ],
          note: "Inclua seu endereço de e-mail ao entrar em contato com o suporte para que possamos ajudá-lo rapidamente."
        }
      }
    },
    identificationTooltip: 'Carregue fotos para identificação rápida',
    whatIfTooltip: 'Execute cenários hipotéticos',
    updatesTooltip: 'Confira recomendações automáticas',
    outOfDateRegenRec: 'Desatualizado - regeneração recomendada',
    tobacconist: {
       title: 'Mestre Tabacário',
       subtitle: 'Consultoria de especialistas e atualizações de IA',
       identify: 'Identificar',
       optimize: 'Otimizar',
       whatIf: 'E Se?',
       aiUpdates: 'Atualizações IA',
       identificationTitle: 'Identificador de Cachimbos IA',
       identificationSubtitle: 'Carregue fotos para obter ajuda de identificação rápida',
       identificationEmpty: 'Comece adicionando seus primeiros cachimbos ou blends de tabaco',
       addFirstPipe: 'Adicionar Primeiro Cachimbo',
       addFirstBlend: 'Adicionar Primeira Mistura',
       optimizationTitle: 'Otimizador de Coleções',
       optimizationSubtitle: 'Análise de IA de sua coleção com recomendações',
       optimizationTooltip: 'Obtenha análise profunda de IA de sua coleção',
       optimizationEmpty: 'Comece adicionando cachimbos à sua coleção',
       whatIfTitle: 'Análise de Cenários',
       whatIfSubtitle: 'Faça perguntas sobre estratégia de coleção',
       whatIfEmpty: 'Comece adicionando cachimbos e blends',
       updatesTitle: 'Atualizações IA',
       updatesSubtitle: 'Recomendações automáticas baseadas em sua coleção',
       updateTooltip: 'Confira atualizações periódicas de IA',
       optional: 'Opcional',
       tooltipText: 'Ferramentas de IA ajudam você a otimizar sua coleção',
       askTheExpert: 'Pergunte ao Especialista',
       askTheExpertDesc: 'Obtenha conselho personalizado de um especialista tabaceiro',
       sendMessage: 'Enviar',
      welcomeTitle: 'Bem-vindo ao Seu Tabacário Pessoal',
      welcomeMessage: 'Pergunte-me sobre recomendações de cachimbos, combinações de tabaco ou otimização de coleção.',
      generatePairings: 'Gerar Combinações',
      generatePairingsPrompt: 'Gerar recomendações de combinações para minha coleção',
      runOptimization: 'Executar Otimização',
      runOptimizationPrompt: 'Execute análise de otimização na minha coleção',
      newConversation: 'Nova Conversa',
      inputPlaceholder: 'Faça perguntas sobre combinações, recomendações ou sua coleção...',
      chatTab: 'Chat',
      updatesTab: 'Atualizações de IA',
      startingConversation: 'Iniciando conversa...',
      pairingMatrix: 'Matriz de Combinações',
      collectionOptimization: 'Otimização de Coleção',
      outOfDate: 'Desatualizado - regeneração recomendada',
      upToDate: 'Atualizado',
      undo: 'Desfazer',
      regenerate: 'Regenerar',
      breakInSchedules: 'Cronogramas de Amaciamento',
      breakInNote: 'A regeneração é feita por cachimbo na página de detalhes do cachimbo (com desfazer/histórico).',
      noRecommendation: 'Nenhuma recomendação específica',
      versatilePattern: 'Versátil - adequado para muitos tipos de blends',
      tobaccoBlendClassification: 'Classificação de Blend de Tabaco',
      tobaccoBlendClassificationDesc: 'Análise de tipos de blend em sua coleção',
      reclassifyBlends: 'Reclassificar Blends',
      hide: 'Ocultar',
      rotationPlanner: 'Planejador de Rotação',
      neverSmoked: 'Nunca Fumado',
      noUsageSessionsRecorded: 'Nenhuma sessão de fumo registrada'
      }
      },
  nl: {
    pipes: { search: 'Zoeken', filter: 'Filteren', shape: 'Vorm', material: 'Materiaal', allShapes: 'Alle vormen', allMaterials: 'Alle materialen' },
    tobacco: { allTypes: 'Alle typen', allStrengths: 'Alle sterktes', search: 'Zoeken' },
    common: { loading: 'Bezig met laden...', refresh: 'Vernieuwen', cancel: 'Annuleren', save: 'Opslaan', delete: 'Verwijderen', close: 'Sluiten', unknown: 'Onbekend', of: 'van' },
    units: { tin: 'blik', tinPlural: 'blikken' },
    helpContent: {
      faqFull: {
        pageTitle: "PipeKeeper Veelgestelde Vragen",
        pageSubtitle: "Definities, algemene informatie en disclaimers",
        navHowTo: "Handleidingen",
        navTroubleshooting: "Probleemoplossing",
        verificationHelp: {
          q: "🔒 Ik kan niet inloggen / Mijn verificatiecode is verlopen - Wat moet ik doen?",
          intro: "Als u problemen ondervindt met e-mailverificatie of inloggen:",
          steps: [
            "Probeer opnieuw in te loggen - het systeem verzendt automatisch een nieuwe verificatiecode",
            "Controleer uw map voor ongewenste e-mail op de verificatie-e-mail",
            "Bezoek onze verificatiehulpagina voor gedetailleerde instructies",
            "Neem rechtstreeks contact op met ondersteuning op admin@pipekeeperapp.com"
          ],
          note: "Voeg uw e-mailadres toe wanneer u contact opneemt met ondersteuning, zodat we u snel kunnen helpen."
        }
      }
    },
    identificationTooltip: 'Upload foto\'s voor snelle identificatie',
    whatIfTooltip: 'Voer hypothetische scenario\'s uit',
    updatesTooltip: 'Controleer automatische suggesties',
    outOfDateRegenRec: 'Verouderd - regeneratie aanbevolen',
    tobacconist: {
       title: 'Meesterbesteller',
       subtitle: 'Deskundig advies en AI-updates',
       identify: 'Identificeer',
       optimize: 'Optimaliseer',
       whatIf: 'Wat Als?',
       aiUpdates: 'AI-Updates',
       identificationTitle: 'AI-Pijpenidentificeerder',
       identificationSubtitle: 'Upload foto\'s voor snelle identificatiehulp',
       identificationEmpty: 'Begin met het toevoegen van uw eerste pijpen of tabaksmengsels',
       addFirstPipe: 'Eerste Pijp Toevoegen',
       addFirstBlend: 'Eerste Mengsel Toevoegen',
       optimizationTitle: 'Verzamelingsoptimizer',
       optimizationSubtitle: 'AI-analyse van uw verzameling met aanbevelingen',
       optimizationTooltip: 'Krijg diepgaande AI-analyse van uw verzameling',
       optimizationEmpty: 'Begin met het toevoegen van pijpen aan uw verzameling',
       whatIfTitle: 'Scenarioanalyse',
       whatIfSubtitle: 'Stel vragen over verzamelingsstrategie',
       whatIfEmpty: 'Begin met het toevoegen van pijpen en mengsels',
       updatesTitle: 'AI-Updates',
       updatesSubtitle: 'Automatische aanbevelingen op basis van uw verzameling',
       updateTooltip: 'Controleer periodieke AI-updates',
       optional: 'Optioneel',
       tooltipText: 'AI-tools helpen u uw verzameling te optimaliseren',
       askTheExpert: 'Vraag de Expert',
       askTheExpertDesc: 'Krijg persoonlijk advies van een expert tabakspecialist',
       sendMessage: 'Verzenden',
      welcomeTitle: 'Welkom bij uw Persoonlijke Besteller',
      welcomeMessage: 'Vraag mij om pipenaanbevelingen, tabaksparingen of optimalisatie van verzamelingen.',
      generatePairings: 'Paarverificaties Genereren',
      generatePairingsPrompt: 'Genereer paaringsaanbevelingen voor mijn collectie',
      runOptimization: 'Optimalisatie Uitvoeren',
      runOptimizationPrompt: 'Voer optimalisatieanalyse uit op mijn verzameling',
      newConversation: 'Nieuw Gesprek',
      inputPlaceholder: 'Stel vragen over paarverificaties, aanbevelingen of uw verzameling...',
      chatTab: 'Chat',
      updatesTab: 'AI-updates',
      startingConversation: 'Gesprek starten...',
      pairingMatrix: 'Paaringsmatrix',
      collectionOptimization: 'Verzamelingsoptimalisatie',
      outOfDate: 'Verouderd - regeneratie aanbevolen',
      upToDate: 'Actueel',
      undo: 'Ongedaan Maken',
      regenerate: 'Opnieuw Genereren',
      breakInSchedules: 'Inrij-schema\'s',
      breakInNote: 'Regeneratie wordt per pijp op de pijpdetailpagina afgehandeld (met ongedaan maken/geschiedenis).',
      noRecommendation: 'Geen specifieke aanbevelingen',
      versatilePattern: 'Veelzijdig - geschikt voor veel blendtypen',
      tobaccoBlendClassification: 'Tabaksblend-classificatie',
      tobaccoBlendClassificationDesc: 'Analyse van blendtypen in uw collectie',
      reclassifyBlends: 'Blends Opnieuw Classificeren',
      hide: 'Verbergen',
      rotationPlanner: 'Rotatieplannen',
      neverSmoked: 'Nooit Gerookt',
      noUsageSessionsRecorded: 'Geen rooksessies opgenomen'
      }
      },
  pl: {
    pipes: { search: 'Szukaj', filter: 'Filtruj', shape: 'Kształt', material: 'Materiał', allShapes: 'Wszystkie kształty', allMaterials: 'Wszystkie materiały' },
    tobacco: { allTypes: 'Wszystkie typy', allStrengths: 'Wszystkie moce', search: 'Szukaj' },
    common: { loading: 'Ładowanie...', refresh: 'Odśwież', cancel: 'Anuluj', save: 'Zapisz', delete: 'Usuń', close: 'Zamknij', unknown: 'Nieznany', of: 'z' },
    units: { tin: 'puszka', tinPlural: 'puszki', bowl: 'misa' },
    pipesPage: {
      exportCSV: "Eksportuj CSV"
    },
    tobaccoPage: {
      exportCSV: "Eksportuj CSV",
      exportPDF: "Eksportuj PDF",
      quickEdit: "Szybka Edycja",
      quickSearchAdd: "Szybkie Wyszukiwanie i Dodaj"
    },
    helpContent: {
      faqFull: {
        pageTitle: "Pytania Często Zadawane PipeKeeper",
        pageSubtitle: "Definicje, informacje ogólne i zastrzeżenia",
        navHowTo: "Przewodniki",
        navTroubleshooting: "Rozwiązywanie Problemów",
        verificationHelp: {
          q: "🔒 Nie mogę się zalogować / Mój kod weryfikacyjny wygasł - Co robić?",
          intro: "Jeśli masz problemy z weryfikacją e-mail lub logowaniem:",
          steps: [
            "Spróbuj zalogować się ponownie - system automatycznie wyśle nowy kod weryfikacyjny",
            "Sprawdź folder spam/niechcianych wiadomości w poszukiwaniu e-maila weryfikacyjnego",
            "Odwiedź naszą stronę pomocy weryfikacji, aby uzyskać szczegółowe instrukcje",
            "Skontaktuj się z obsługą bezpośrednio na admin@pipekeeperapp.com"
          ],
          note: "Podaj swój adres e-mail podczas kontaktowania się z obsługą, abyśmy mogli Ci szybko pomóc."
        }
      }
    },
    identificationTooltip: 'Prześlij zdjęcia do szybkiej identyfikacji',
    whatIfTooltip: 'Uruchom scenariusze hipoteczne',
    updatesTooltip: 'Sprawdź automatyczne sugestje',
    outOfDateRegenRec: 'Nieaktualne - zalecana regeneracja',
    tobacconist: {
       title: 'Mistrz Tytoniowy',
       subtitle: 'Porada ekspertów i aktualizacje AI',
       identify: 'Identyfikuj',
       optimize: 'Optymalizuj',
       whatIf: 'Co Jeśli?',
       aiUpdates: 'Aktualizacje AI',
       identificationTitle: 'Identyfikator Pipa AI',
       identificationSubtitle: 'Prześlij zdjęcia, aby uzyskać szybką pomoc w identyfikacji',
       identificationEmpty: 'Zacznij od dodania swoich pierwszych pip lub mieszanek tytoniu',
       addFirstPipe: 'Dodaj Pierwszą Pipę',
       addFirstBlend: 'Dodaj Pierwszą Mieszankę',
       optimizationTitle: 'Optymalizator Kolekcji',
       optimizationSubtitle: 'Analiza AI twojej kolekcji z rekomendacjami',
       optimizationTooltip: 'Uzyskaj głęboką analizę AI twojej kolekcji',
       optimizationEmpty: 'Zacznij od dodania pip do twojej kolekcji',
       whatIfTitle: 'Analiza Scenariuszy',
       whatIfSubtitle: 'Zadaj pytania dotyczące strategii kolekcji',
       whatIfEmpty: 'Zacznij od dodania pip i mieszanek',
       updatesTitle: 'Aktualizacje AI',
       updatesSubtitle: 'Automatyczne rekomendacje oparte na twojej kolekcji',
       updateTooltip: 'Sprawdź okresowe aktualizacje AI',
       optional: 'Opcjonalnie',
       tooltipText: 'Narzędzia AI pomagają zoptymalizować twoją kolekcję',
       askTheExpert: 'Zapytaj Eksperta',
       askTheExpertDesc: 'Uzyskaj spersonalizowane porady od eksperta tytoniowego',
       sendMessage: 'Wyślij',
      welcomeTitle: 'Witaj w Twojej Osobistej Kancelarii Tytoniowej',
      welcomeMessage: 'Zapytaj mnie o rekomendacje pipa, połączenia tytoniu lub optymalizację kolekcji.',
      generatePairings: 'Generuj Połączenia',
      generatePairingsPrompt: 'Generuj rekomendacje połączeń dla mojej kolekcji',
      runOptimization: 'Uruchom Optymalizację',
      runOptimizationPrompt: 'Uruchom analizę optymalizacji mojej kolekcji',
      newConversation: 'Nowa Rozmowa',
      inputPlaceholder: 'Zadaj pytania dotyczące połączeń, rekomendacji lub Twojej kolekcji...',
      chatTab: 'Chat',
      updatesTab: 'Aktualizacje AI',
      startingConversation: 'Rozpoczynanie rozmowy...',
      pairingMatrix: 'Macierz Połączeń',
      collectionOptimization: 'Optymalizacja Kolekcji',
      outOfDate: 'Nieaktualne - zalecana regeneracja',
      upToDate: 'Aktualne',
      undo: 'Cofnij',
      regenerate: 'Regeneruj',
      breakInSchedules: 'Harmonogramy Przećwiczenia',
      breakInNote: 'Regeneracja jest obsługiwana dla każdego pipa na stronie szczegółów pipa (z cofnięciem/historią).',
      noRecommendation: 'Brak konkretnych rekomendacji',
      versatilePattern: 'Wszechstronny - odpowiedni dla wielu typów mieszanek',
      strategicSpecializations: 'Strategiczne specjalizacje dla maksymalnych wyników połączeń',
      usagePattern: 'Wzór Użycia',
      currentFocus: 'Obecny Fokus',
      recommendedFor: 'Rekomendowane dla',
      tobaccoBlendClassification: 'Klasyfikacja Blendu Tytoniu',
      tobaccoBlendClassificationDesc: 'Analiza typów blendu w twojej kolekcji',
      reclassifyBlends: 'Przeklasyfikuj Blendy',
      hide: 'Ukryj',
      rotationPlanner: 'Planner Rotacji',
      neverSmoked: 'Nigdy Palony',
      noUsageSessionsRecorded: 'Brak zarejestrowanych sesji palenia'
      }
      },
  ja: {
    pipes: { search: '検索', filter: 'フィルター', shape: '形状', material: '素材', allShapes: 'すべての形状', allMaterials: 'すべての素材' },
    tobacco: { allTypes: 'すべてのタイプ', allStrengths: 'すべての強度', search: '検索' },
    common: { loading: '読み込み中...', refresh: '更新', cancel: 'キャンセル', save: '保存', delete: '削除', close: '閉じる', unknown: '不明', of: 'の' },
    units: { tin: '缶', tinPlural: '缶' },
    helpContent: {
      faqFull: {
        pageTitle: "PipeKeeper よくある質問",
        pageSubtitle: "定義、一般情報、および免責事項",
        navHowTo: "ハウツーガイド",
        navTroubleshooting: "トラブルシューティング",
        verificationHelp: {
          q: "🔒 ログインできません / 確認コードの有効期限が切れました - どうすればいいですか?",
          intro: "メール確認またはログインに問題がある場合:",
          steps: [
            "もう一度ログインしてください - システムが自動的に新しい確認コードを送信します",
            "確認メールのスパム/迷惑メールフォルダをチェックしてください",
            "詳細な手順については、確認ヘルプページにアクセスしてください",
            "admin@pipekeeperapp.com でサポートに直接お問い合わせください"
          ],
          note: "サポートにお問い合わせの際は、メールアドレスを含めてください。迅速にお手伝いできます。"
        }
      }
    },
    identificationTooltip: '写真をアップロードして迅速に識別',
    whatIfTooltip: '仮説的シナリオを実行',
    updatesTooltip: '自動提案を確認',
    outOfDateRegenRec: '期限切れ - 再生成推奨',
    tobacconist: {
       title: 'マスター・タバコニスト',
       subtitle: 'エキスパート・コンサルテーション & AI アップデート',
       identify: '識別',
       optimize: '最適化',
       whatIf: 'もし...',
       aiUpdates: 'AI アップデート',
       identificationTitle: 'AI パイプ識別器',
       identificationSubtitle: '写真をアップロードして、迅速な識別支援を取得',
       identificationEmpty: '最初のパイプまたはタバコ ブレンドの追加を開始',
       addFirstPipe: '最初のパイプを追加',
       addFirstBlend: '最初のブレンドを追加',
       optimizationTitle: 'コレクション オプティマイザー',
       optimizationSubtitle: 'AIによるコレクション分析と推奨',
       optimizationTooltip: 'コレクションの深い AI 分析を取得',
       optimizationEmpty: 'コレクションへのパイプの追加を開始',
       whatIfTitle: 'シナリオ分析',
       whatIfSubtitle: 'コレクション戦略についての質問を投げかけます',
       whatIfEmpty: 'パイプとブレンドの追加を開始',
       updatesTitle: 'AI アップデート',
       updatesSubtitle: 'コレクションに基づいた自動推奨',
       updateTooltip: '定期的な AI アップデートを確認',
       optional: 'オプション',
       tooltipText: 'AI ツールはコレクションの最適化に役立ちます',
       askTheExpert: 'エキスパートに質問',
       askTheExpertDesc: 'タバコの専門家からのパーソナライズされたアドバイスを取得',
       sendMessage: '送信',
      welcomeTitle: 'あなたの個人的なタバコニストへようこそ',
      welcomeMessage: 'パイプの推奨、タバコのペアリング、またはコレクション最適化についてお聞きください。',
      generatePairings: 'ペアリングを生成',
      generatePairingsPrompt: 'コレクションのペアリング推奨を生成',
      runOptimization: '最適化を実行',
      runOptimizationPrompt: 'コレクションの最適化分析を実行',
      newConversation: '新しい会話',
      inputPlaceholder: 'ペアリング、推奨、またはコレクションについて質問してください...',
      chatTab: 'チャット',
      updatesTab: 'AI アップデート',
      startingConversation: '会話を開始中...',
      pairingMatrix: 'ペアリングマトリックス',
      collectionOptimization: 'コレクション最適化',
      outOfDate: '期限切れ - 再生成推奨',
      upToDate: '最新',
      undo: '元に戻す',
      regenerate: '再生成',
      breakInSchedules: 'ブレイク・イン スケジュール',
      breakInNote: '再生成はパイプ詳細ページでパイプごとに処理されます (取り消し/履歴付き)。',
      noRecommendation: '具体的な推奨なし',
      versatilePattern: '汎用性 - 複数のブレンドタイプに適しています',
      strategicSpecializations: '最大ペアリングスコアのための戦略的専門化',
      usagePattern: '使用パターン',
      currentFocus: '現在のフォーカス',
      recommendedFor: '推奨対象',
      tobaccoBlendClassification: 'タバコブレンド分類',
      tobaccoBlendClassificationDesc: 'コレクション内のブレンドタイプの分析',
      reclassifyBlends: 'ブレンドを再分類',
      hide: '隠す',
      rotationPlanner: 'ローテーション計画',
      neverSmoked: '未喫煙',
      noUsageSessionsRecorded: '喫煙セッションが記録されていません'
      },
    pipesPage: {
      exportCSV: "CSVエクスポート"
    },
    tobaccoPage: {
      exportCSV: "CSVエクスポート",
      exportPDF: "PDFエクスポート",
      quickEdit: "クイック編集",
      quickSearchAdd: "クイック検索 & 追加"
    },
    units: { tin: '缶', tinPlural: '缶', bowl: 'ボウル' }
  },
  'zh-Hans': {
    pipes: { search: '搜索', filter: '筛选', shape: '形状', material: '材料', allShapes: '所有形状', allMaterials: '所有材料' },
    tobacco: { allTypes: '所有类型', allStrengths: '所有强度', search: '搜索' },
    common: { loading: '加载中...', refresh: '刷新', cancel: '取消', save: '保存', delete: '删除', close: '关闭', unknown: '未知', of: '的' },
    units: { tin: '罐', tinPlural: '罐' },
    helpContent: {
      faqFull: {
        pageTitle: "PipeKeeper 常见问题",
        pageSubtitle: "定义、一般信息和免责声明",
        navHowTo: "操作指南",
        navTroubleshooting: "故障排除",
        verificationHelp: {
          q: "🔒 我无法登录 / 我的验证代码已过期 - 我该怎么办?",
          intro: "如果您在电子邮件验证或登录时遇到问题:",
          steps: [
            "尝试重新登录 - 系统将自动发送新的验证码",
            "检查您的垃圾邮件/垃圾邮件文件夹中是否有验证电子邮件",
            "访问我们的验证帮助页面获取详细说明",
            "直接通过 admin@pipekeeperapp.com 联系支持"
          ],
          note: "联系支持时请附上您的电子邮件地址，以便我们为您提供快速帮助。"
        }
      }
    },
    identificationTooltip: '上传照片以快速识别',
    whatIfTooltip: '运行假设情景',
    updatesTooltip: '查看自动建议',
    outOfDateRegenRec: '过期-建议重新生成',
    tobacconist: {
       title: '烟草大师',
       subtitle: '专家咨询和AI更新',
       identify: '识别',
       optimize: '优化',
       whatIf: '假设',
       aiUpdates: 'AI更新',
       identificationTitle: 'AI烟斗识别器',
       identificationSubtitle: '上传照片以获得快速识别帮助',
       identificationEmpty: '开始添加您的第一批烟斗或烟草混合物',
       addFirstPipe: '添加第一个烟斗',
       addFirstBlend: '添加第一个混合',
       optimizationTitle: '收集优化器',
       optimizationSubtitle: '对您的收集进行 AI 分析并提供建议',
       optimizationTooltip: '获取您的收集的深入 AI 分析',
       optimizationEmpty: '开始向您的收集中添加烟斗',
       whatIfTitle: '情景分析',
       whatIfSubtitle: '提出关于收集策略的问题',
       whatIfEmpty: '开始添加烟斗和混合',
       updatesTitle: 'AI更新',
       updatesSubtitle: '基于您的收集的自动建议',
       updateTooltip: '查看定期 AI 更新',
       optional: '可选',
       tooltipText: 'AI 工具可帮助您优化收集',
       askTheExpert: '询问专家',
       askTheExpertDesc: '获得来自烟草专家的个性化建议',
       sendMessage: '发送',
      welcomeTitle: '欢迎来到您的个人烟草商',
      welcomeMessage: '询问我关于烟斗推荐、烟草配对或收集优化的问题。',
      generatePairings: '生成配对',
      generatePairingsPrompt: '为我的收集生成配对建议',
      runOptimization: '运行优化',
      runOptimizationPrompt: '对我的收集运行优化分析',
      newConversation: '新对话',
      inputPlaceholder: '询问关于配对、建议或您的收集的问题...',
      chatTab: '聊天',
      updatesTab: 'AI更新',
      startingConversation: '启动对话中...',
      pairingMatrix: '配对矩阵',
      collectionOptimization: '收集优化',
      outOfDate: '过期-建议重新生成',
      upToDate: '最新的',
      undo: '撤销',
      regenerate: '重新生成',
      breakInSchedules: '磨合时间表',
      breakInNote: '重新生成由烟斗详细信息页面上的每根烟斗处理(带撤销/历史记录)。',
      noRecommendation: '无具体建议',
      versatilePattern: '多功能 - 适合多种混合类型',
      tobaccoBlendClassification: '烟草混合分类',
      tobaccoBlendClassificationDesc: '您的收藏中混合类型的分析',
      reclassifyBlends: '重新分类混合',
      hide: '隐藏',
      rotationPlanner: '轮换计划',
      neverSmoked: '从未吸过',
      noUsageSessionsRecorded: '没有记录吸烟会话'
      }
      }
      };