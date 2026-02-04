/**
 * Complete Help Center Content for All 10 Locales
 * EN, ES, FR, DE, IT, PT-BR, NL, PL, JA, ZH-HANS
 */

export const helpContentFull = {
  en: {
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
              id: "what-is",
              q: "What is PipeKeeper?",
              a: "PipeKeeper is a collection-management and informational app designed for pipe-smoking enthusiasts. It helps you track pipes, tobacco blends, cellared tins, and related notes, and provides optional AI-assisted insights and valuation estimates.",
              disclaimer: "PipeKeeper does not sell tobacco products and does not facilitate tobacco purchases."
            },
            {
              id: "tobacco-sales",
              q: "Is PipeKeeper selling or promoting tobacco?",
              a: "No. PipeKeeper is a hobby and collection-tracking app only. It does not sell, advertise, or facilitate the purchase of tobacco products."
            },
            {
              id: "data-privacy",
              q: "Is my data private?",
              a: "Yes. Your collection data belongs to you. PipeKeeper uses your data only to operate the app and provide features. We do not sell personal data."
            },
            {
              id: "first-launch",
              q: "Why do I see Terms of Service when I first open the app?",
              a: "On your first use, PipeKeeper requires you to accept the Terms of Service and Privacy Policy before accessing the app. This is a one-time requirement. Once accepted, you'll proceed directly to your Home page on future visits. You can review these documents anytime from the Help menu or footer links."
            }
          ]
        },
        gettingStarted: {
          title: "Getting Started",
          items: [
            {
              id: "tutorial",
              q: "Is there a tutorial or walkthrough?",
              a: "Yes! When you first create your account, PipeKeeper offers a guided onboarding flow that walks you through setting up your profile, adding your first pipe and tobacco, and accessing AI features. You can restart the tutorial anytime from the Home page.",
              cta: "Restart Tutorial"
            },
            {
              id: "what-cellaring",
              q: "What is cellaring?",
              a: "Cellaring refers to storing sealed tins or bulk tobacco for aging. PipeKeeper includes a detailed cellaring log system that tracks when tobacco is added to or removed from your cellar, quantities in ounces, container types, and notes. This feature is available to Premium subscribers."
            },
            {
              id: "smoking-log",
              q: "What is the smoking log?",
              a: "The smoking log tracks which pipes you've smoked with which tobaccos. It helps you remember what works well together and contributes to AI pairing recommendations. Premium subscribers benefit from automatic inventory reduction based on logged sessions."
            }
          ]
        },
        fieldDefinitions: {
          title: "Field Definitions",
          items: [
            {
              id: "pipe-shape",
              q: "What is pipe shape?",
              a: "The shape classification describes the overall form of the pipe (Billiard, Dublin, Bent, etc.). PipeKeeper includes 30+ common shapes. Shape affects smoking characteristics like clenching comfort and smoke coolness."
            },
            {
              id: "chamber-volume",
              q: "What is chamber volume?",
              a: "Chamber volume (Small/Medium/Large/Extra Large) indicates bowl capacity and smoke duration. Small chambers are good for 15-30 minute smokes, while Extra Large can provide 90+ minutes."
            },
            {
              id: "stem-material",
              q: "What are the stem material options?",
              a: "Common stem materials include Vulcanite (traditional, soft bite), Acrylic/Lucite (durable, harder), Cumberland (marbled appearance), and specialty materials like Amber or Horn."
            },
            {
              id: "bowl-material",
              q: "What are bowl materials?",
              a: "Most pipes are Briar (heat-resistant wood), but other materials include Meerschaum (mineral, colors with use), Corn Cob (affordable, disposable), Morta (bog oak), and various other woods."
            },
            {
              id: "finish-types",
              q: "What are finish types?",
              a: "Finish refers to the bowl surface treatment: Smooth (polished, shows grain), Sandblasted (textured, hides fills), Rusticated (carved texture), or Natural (unfinished). Finish is largely aesthetic but can affect grip."
            },
            {
              id: "blend-type",
              q: "What are tobacco blend types?",
              a: "Blend types categorize tobacco by primary leaf composition: Virginia (sweet, grassy), English (with Latakia, smoky), Aromatic (added flavoring), Burley (nutty), VaPer (Virginia/Perique), etc. Each has distinct flavor profiles and smoking characteristics."
            },
            {
              id: "tobacco-cut",
              q: "What are tobacco cut types?",
              a: "Cut describes how tobacco is prepared: Ribbon (thin strips, easy to pack), Flake (pressed sheets, needs rubbing), Plug (solid block), Coin (sliced plug), Shag (very fine), etc. Cut affects packing method and burn rate."
            },
            {
              id: "tobacco-strength",
              q: "What is tobacco strength?",
              a: "Strength refers to nicotine content ranging from Mild to Full. Beginners typically start with Mild-Medium blends. Full-strength blends can cause nicotine sickness if you're not accustomed to them."
            }
          ]
        },
        tobaccoValuation: {
          title: "Tobacco Valuation",
          items: [
            {
              id: "valuation-calc",
              q: "How is tobacco value calculated?",
              a: "Tobacco value can be tracked in two ways: (1) Manual Market Value - you enter the current market price (Premium), or (2) AI Assisted Valuation - AI analyzes public listings to estimate value, range, and confidence (Pro). AI estimates are not guarantees."
            },
            {
              id: "manual-vs-ai",
              q: "What's the difference between manual and AI valuation?",
              a: "Manual valuation lets you track your own research (Premium). AI valuation uses machine learning to scan marketplace data and provide estimates, ranges, confidence levels, and projections (Pro)."
            },
            {
              id: "estimated-label",
              q: "Why is value labeled as 'estimated'?",
              a: "AI-generated values are predictions based on available marketplace data. Actual prices vary by condition, age, seller, and market demand. Estimates are educational tools, not investment advice."
            },
            {
              id: "confidence-meaning",
              q: "What does confidence mean?",
              a: "Confidence indicates how much marketplace data supports the estimate. High = strong data. Medium = moderate data. Low = limited data. Low confidence means the estimate is less reliable."
            },
            {
              id: "locked-valuation",
              q: "Why are some valuation features locked?",
              a: "AI-assisted valuation and predictive projections require Pro. Premium users can track manual market values and cost basis. Free users can track inventory and aging only."
            }
          ]
        },
        featuresAndTools: {
          title: "Features & Tools",
          items: [
            {
              id: "interchangeable-bowls",
              q: "What are interchangeable bowls?",
              intro: "Some pipe systems (Falcon, Gabotherm, Yello-Bole, Viking, etc.) allow you to swap different bowls on the same stem/shank assembly. PipeKeeper treats each bowl as a distinct \"pipe variant\" with its own:",
              points: [
                "Focus tags (dedicate one bowl to Virginias, another to Aromatics, etc.)",
                "Chamber dimensions and characteristics",
                "Tobacco pairing recommendations",
                "Break-in schedules and smoking logs"
              ],
              conclusion: "This allows optimal specialization—use the same stem with multiple bowls for different tobacco types without ghosting."
            },
            {
              id: "pipe-focus",
              q: "What are pipe focus tags?",
              intro: "Focus tags let you specialize pipes for specific tobacco types. Common tags include:",
              points: [
                "Aromatic: Dedicates pipe to aromatic blends only (Heavy/Medium/Light intensity supported)",
                "Non-Aromatic: Excludes aromatic blends",
                "Virginia, VaPer, English, Balkan, Latakia: Automatically treated as non-aromatic families",
                "Utility/Versatile: Allows mixed use without restrictions"
              ],
              conclusion: "The pairing system respects these tags—aromatic-only pipes won't recommend non-aromatic blends and vice versa. Focus tags work at the pipe level or per-bowl for interchangeable systems."
            },
            {
              id: "pairing-matrix",
              q: "What is the Pairing Matrix?",
              a: "The Pairing Matrix generates compatibility scores (0-10) between each pipe and tobacco blend in your collection. It considers pipe characteristics (shape, chamber volume, bowl material), blend profiles (type, strength, aromatic intensity), pipe focus tags (Virginia, English, Aromatic, etc.), and your personal preferences. The system generates recommendations once and stores them for instant access across the app. For pipes with interchangeable bowls, each bowl variant is treated separately with its own recommendations."
            },
            {
              id: "pipe-identification",
              q: "How does pipe identification work?",
              a: "Upload photos of your pipe and the AI will analyze markings, shape, and other visual characteristics to identify the maker, model, and approximate value. You can also manually search a database of known pipe makers."
            },
            {
              id: "geometry-analysis",
              q: "What is pipe geometry analysis?",
              a: "This AI tool analyzes your pipe photos and stored dimensions to classify geometry attributes: shape (Billiard, Dublin, etc.), bowl style (cylindrical, conical, etc.), shank shape (round, diamond, etc.), bend (straight, 1/4 bent, etc.), and size class (small, standard, large, etc.). It uses visual cues like bowl silhouette, shank profile, stem alignment, and dimensional ratios. Results always appear with confidence levels (High/Medium/Low) and detailed reasoning. Even without photos, the tool provides suggestions with warnings about limited data. This is the primary recommended method for classifying pipe geometry."
            },
            {
              id: "verified-measurements",
              q: "Can I find verified manufacturer specifications?",
              a: "Yes, as a secondary option. Go to AI Updates → 'Find Verified Manufacturer Specs'. This searches manufacturer catalogs and databases but only works for some production pipes. Many artisan and estate pipes won't have verified specs available. If none are found, use 'Analyze Geometry from Photos' (the primary tool) instead. Both tools only update missing or 'Unknown' fields - never overwrite your data."
            },
            {
              id: "value-lookup",
              q: "Can PipeKeeper estimate pipe values?",
              a: "Yes. The AI can provide estimated market values based on maker, condition, and current market trends. These are estimates only and should not be relied upon for insurance or sales purposes."
            },
            {
              id: "export-tools",
              q: "Can I export my collection data?",
              a: "Yes. Export tools allow you to download your pipes and tobacco inventory as CSV files for backup or use in other applications. Look for export buttons on the Pipes and Tobacco pages."
            }
          ]
        },
        accountsAndData: {
          title: "Accounts & Data",
          items: [
            {
              id: "need-account",
              q: "Do I need an account?",
              a: "Yes. Creating an account allows your collection and settings to be saved and synced across devices."
            },
            {
              id: "export-data",
              q: "Can I export my data?",
              a: "Yes. Export tools allow you to generate CSV/PDF reports of your pipes, tobacco inventory, and smoking logs. Look for export buttons on the Pipes and Tobacco pages."
            },
            {
              id: "bulk-import",
              q: "Can I import data in bulk?",
              a: "Yes. Go to the Import page from the Home screen. You can paste CSV data or upload a file to quickly add multiple pipes or tobacco blends at once."
            }
          ]
        },
        ai: {
          title: "AI Features & Accuracy",
          items: [
            {
              id: "ai-accuracy",
              q: "Are AI recommendations guaranteed to be correct?",
              a: "No. AI features provide best-effort suggestions and may be incomplete or inaccurate. You should use your own judgment and verify important information from reliable sources."
            },
            {
              id: "medical-advice",
              q: "Does PipeKeeper provide medical or professional advice?",
              a: "No. PipeKeeper provides informational tools for hobby and collection management only."
            }
          ]
        },
        support: {
          title: "Support",
          contactQ: "How do I contact support?",
          contactIntro: "Use the support link inside the app or visit",
          contactLinks: "You can also review our policies here:"
        }
      }
    },
    howTo: {
      pageTitle: "How-To Guides",
      pageSubtitle: "Quick answers with clear navigation paths",
      navFAQ: "FAQ",
      navTroubleshooting: "Troubleshooting",
      footerTitle: "Still need help?",
      footerDesc: "Visit our full FAQ or contact support for additional assistance.",
      footerFAQ: "View Full FAQ",
      footerSupport: "Contact Support",
      sections: {
        gettingStarted: {
          title: "Getting Started",
          items: [
            {
              id: "add-pipe",
              q: "How do I add a pipe?",
              path: "Home → Pipes → Add Pipe",
              a: "Add your pipes manually or use AI identification from photos. Include details like maker, shape, dimensions, and condition to unlock insights and recommendations."
            },
            {
              id: "add-tobacco",
              q: "How do I add a tobacco blend?",
              path: "Home → Tobacco → Add Tobacco",
              a: "Track your tobacco blends with details like manufacturer, blend type, quantity, and storage dates. Use the cellar log to record aging progress."
            },
            {
              id: "add-note",
              q: "How do I add notes to an item?",
              path: "Pipes/Tobacco → Select item → Edit → Add notes",
              a: "Click any pipe or tobacco to open its detail page. Tap \"Edit\" and add notes in the designated field. Notes help you remember personal preferences and observations."
            },
            {
              id: "view-insights",
              q: "How do I view insights?",
              path: "Home → Collection Insights",
              a: "Insights appear on your Home page after adding items. View stats, pairing grids, aging dashboards, and reports. Click tabs to explore different insights."
            }
          ]
        },
        managingCollection: {
          title: "Managing Your Collection",
          items: [
            {
              id: "organize",
              q: "How do I organize my collection?",
              path: "Pipes/Tobacco → Filters and Sort",
              a: "Use filters to narrow down by shape, blend type, or focus. Sort by date added, value, or rating. Save favorite filters for quick access."
            },
            {
              id: "export",
              q: "How do I export my data?",
              path: "Home → Insights → Reports tab",
              badge: "Premium",
              a: "Premium and Pro users can export collection data as CSV or PDF. Find export buttons in the Reports tab under Collection Insights."
            },
            {
              id: "cellar-log",
              q: "How do I track my cellar?",
              path: "Tobacco → Select blend → Cellar Log",
              badge: "Premium",
              a: "Record when tobacco is added or removed from your cellar. Track quantities, dates, and container types. View aging progress on the Aging Dashboard."
            },
            {
              id: "smoking-log",
              q: "How do I log a smoking session?",
              path: "Home → Insights → Log tab",
              badge: "Premium",
              a: "Track which pipe you smoked with which tobacco. Record date, number of bowls, and notes. This data powers pairing recommendations."
            }
          ]
        },
        aiTools: {
          title: "AI Tools",
          items: [
            {
              id: "identify-pipe",
              q: "How do I identify a pipe from a photo?",
              path: "Home → Expert Tobacconist → Identify",
              badge: "Pro",
              a: "Upload photos of your pipe and the AI analyzes markings, shape, and characteristics to identify maker, model, and approximate value."
            },
            {
              id: "pairing-suggestions",
              q: "How do I get pairing suggestions?",
              path: "Home → Insights → Pairing Grid",
              badge: "Pro",
              a: "The Pairing Matrix generates compatibility scores for every pipe-tobacco combination. View recommendations on pipe detail pages or in the Pairing Grid."
            },
            {
              id: "optimize-collection",
              q: "How do I optimize my collection?",
              path: "Home → Expert Tobacconist → Optimize",
              badge: "Pro",
              a: "The Collection Optimizer analyzes your pipes and tobaccos to recommend specializations, identify gaps, and suggest your next purchase."
            }
          ]
        },
        subscriptions: {
          title: "Subscriptions",
          items: [
            {
              id: "subscribe",
              q: "How do subscriptions work?",
              path: "Profile → Subscription",
              a: "PipeKeeper offers Free, Premium, and Pro tiers. Subscribe to unlock unlimited items, advanced tools, and AI features. View pricing and manage subscriptions in your Profile."
            },
            {
              id: "manage-subscription",
              q: "How do I manage my subscription?",
              path: "Profile → Manage Subscription",
              iosPart: "iOS: Manage through iOS Settings → [Your Name] → Subscriptions → PipeKeeper",
              webPart: "Web/Android: Go to Profile → Manage Subscription to update payment, view invoices, or cancel"
            },
            {
              id: "cancel",
              q: "How do I cancel my subscription?",
              path: "Profile → Manage Subscription",
              iosPart: "iOS: Open iOS Settings → [Your Name] → Subscriptions → PipeKeeper → Cancel Subscription",
              webPart: "Web/Android: Go to Profile → Manage Subscription → Cancel Subscription",
              note: "You'll keep access until the end of your billing period."
            }
          ]
        },
        troubleshooting: {
          title: "Troubleshooting",
          items: [
            {
              id: "cant-login",
              q: "I can't log in or my code expired",
              path: "Login screen → Request new code",
              a: "Try logging in again—the system sends a new verification code automatically. Check your spam folder, or visit the Verification Help page for detailed instructions."
            },
            {
              id: "missing-features",
              q: "Why can't I see certain features?",
              path: "Profile → Subscription",
              a: "Some features require Premium or Pro access. Check your subscription status in Profile. Free users have access to core collection management for up to 5 pipes and 10 tobacco blends."
            },
            {
              id: "sync-issues",
              q: "My data isn't syncing",
              path: "Profile → Refresh / Log out and back in",
              a: "Try refreshing your browser or logging out and back in. Your collection is automatically synced to the cloud when you make changes."
            }
          ]
        }
      }
    },
    troubleshooting: {
      pageTitle: "Troubleshooting",
      pageSubtitle: "Common issues and solutions",
      navFAQ: "FAQ",
      navHowTo: "How-To Guides",
      sections: {
        tobaccoValuation: {
          title: "Tobacco Valuation",
          items: [
            {
              id: "missing-value",
              q: "Why is my tobacco value missing?",
              intro: "Value requires either manual entry (Premium) or AI estimation (Pro).",
              points: [
                "Free users see inventory only",
                "Ensure you have the correct subscription tier",
                "Run valuation after upgrading"
              ]
            },
            {
              id: "low-confidence",
              q: "Why does my estimate show low confidence?",
              intro: "Low confidence means limited marketplace data was found for this blend.",
              points: [
                "It may be rare, discontinued, or regionally exclusive",
                "Estimates with low confidence should be treated as rough approximations",
                "Consider using manual valuation for rare blends"
              ]
            },
            {
              id: "locked-ai",
              q: "Why is AI valuation locked?",
              intro: "AI-assisted valuation requires Pro.",
              points: [
                "If you're a Premium subscriber who joined before Feb 1, 2026, you have legacy access",
                "Otherwise, upgrade to Pro to unlock AI features"
              ]
            },
            {
              id: "no-auto-update",
              q: "Why doesn't value update automatically?",
              intro: "AI valuations are generated on-demand to preserve credits and performance.",
              points: [
                "Click 'Run AI Valuation' to refresh estimates",
                "Scheduled auto-refresh may be added in future Pro updates"
              ]
            }
          ]
        }
      }
    }
  },
  es: {
    faqFull: {
      pageTitle: "Preguntas frecuentes de PipeKeeper",
      pageSubtitle: "Definiciones, información general y exenciones de responsabilidad",
      navHowTo: "Guías prácticas",
      navTroubleshooting: "Solución de problemas",
      verificationHelp: {
        q: "🔒 No puedo iniciar sesión / Mi código de verificación expiró - ¿Qué hago?",
        intro: "Si tiene problemas con la verificación de correo electrónico o el inicio de sesión:",
        steps: [
          "Intente iniciar sesión de nuevo: el sistema enviará un nuevo código de verificación automáticamente",
          "Revise su carpeta de spam/correo no deseado para encontrar el correo de verificación",
          "Visite nuestra página de Ayuda de Verificación para obtener instrucciones detalladas",
          "Póngase en contacto con el soporte directamente en admin@pipekeeperapp.com"
        ],
        note: "Incluya su dirección de correo electrónico al ponerse en contacto con el soporte para que podamos ayudarle rápidamente."
      },
      sections: {
        general: {
          title: "General",
          items: [
            { id: "what-is", q: "¿Qué es PipeKeeper?", a: "PipeKeeper es una aplicación de gestión de colecciones e información diseñada para entusiastas del tabaco en pipa. Te ayuda a rastrear pipas, mezclas de tabaco, latas envejecidas y notas relacionadas, y proporciona información asistida por IA opcional y estimaciones de valor." },
            { id: "tobacco-sales", q: "¿PipeKeeper está vendiendo o promoviendo tabaco?", a: "No. PipeKeeper es una aplicación de seguimiento de pasatiempos y colecciones solamente. No vende, promociona ni facilita la compra de productos de tabaco." },
            { id: "data-privacy", q: "¿Son privados mis datos?", a: "Sí. Sus datos de colección le pertenecen a usted. PipeKeeper utiliza sus datos solo para operar la aplicación y proporcionar funciones. No vendemos datos personales." },
            { id: "first-launch", q: "¿Por qué veo los Términos de Servicio cuando abro la aplicación por primera vez?", a: "En su primer uso, PipeKeeper le requiere aceptar los Términos de Servicio y la Política de Privacidad antes de acceder a la aplicación. Este es un requisito único. Una vez aceptados, irá directamente a su página de Inicio en futuras visitas. Puede revisar estos documentos en cualquier momento desde el menú de Ayuda o enlaces de pie de página." }
          ]
        },
        gettingStarted: {
          title: "Empezando",
          items: [
            { id: "tutorial", q: "¿Hay un tutorial o guía?", a: "¡Sí! Cuando crea su cuenta por primera vez, PipeKeeper ofrece un flujo de incorporación guiado que lo guía a través de la configuración de su perfil, agregar su primera pipa y tabaco, y acceder a funciones de IA. Puede reiniciar el tutorial en cualquier momento desde la página de Inicio.", cta: "Reiniciar Tutorial" },
            { id: "what-cellaring", q: "¿Qué es el envejecimiento en bodega?", a: "El envejecimiento en bodega se refiere al almacenamiento de latas selladas o tabaco a granel para envejecer. PipeKeeper incluye un sistema detallado de registro de bodega que rastrea cuándo se agrega o se retira tabaco de su bodega, cantidades en onzas, tipos de contenedor y notas. Esta función está disponible para suscriptores Premium." },
            { id: "smoking-log", q: "¿Qué es el registro de fumar?", a: "El registro de fumar rastrea qué pipas ha fumado con qué tabaco. Le ayuda a recordar qué funciona bien junto y contribuye a recomendaciones de emparejamiento de IA. Los suscriptores Premium se benefician de la reducción automática de inventario según las sesiones registradas." }
          ]
        },
        fieldDefinitions: {
          title: "Definiciones de campos",
          items: [
            { id: "pipe-shape", q: "¿Qué es la forma de la pipa?", a: "La clasificación de forma describe la forma general de la pipa (Billiard, Dublin, Doblada, etc.). PipeKeeper incluye más de 30 formas comunes. La forma afecta características de fumar como la comodidad de apretar y el enfriamiento del humo." },
            { id: "chamber-volume", q: "¿Qué es el volumen de la cámara?", a: "El volumen de la cámara (Pequeño/Medio/Grande/Extra Grande) indica la capacidad del cuenco y la duración del humo. Las cámaras pequeñas son buenas para fumar de 15-30 minutos, mientras que Extra Grande puede proporcionar 90+ minutos." },
            { id: "stem-material", q: "¿Cuáles son las opciones de material del vástago?", a: "Los materiales de vástago comunes incluyen Vulcanita (tradicional, mordida suave), Acrílico/Lucita (duradero, más duro), Cumberland (aspecto marmolado) y materiales especiales como Ámbar o Cuerno." },
            { id: "bowl-material", q: "¿Cuáles son los materiales del cuenco?", a: "La mayoría de las pipas están hechas de Brezo (madera resistente al calor), pero otros materiales incluyen Espuma de Mar (mineral, colorea con el uso), Mazorca de Maíz (económica, desechable), Morta (roble de turbera) y varias otras maderas." },
            { id: "finish-types", q: "¿Cuáles son los tipos de acabado?", a: "El acabado se refiere al tratamiento de la superficie del cuenco: Liso (pulido, muestra grano), Arenado (texturado, oculta rellenos), Rusticado (textura tallada) o Natural (sin terminar). El acabado es en gran medida estético pero puede afectar el agarre." },
            { id: "blend-type", q: "¿Cuáles son los tipos de mezcla de tabaco?", a: "Los tipos de mezcla categorizan el tabaco por composición de hoja principal: Virginia (dulce, herbáceo), English (con Latakia, ahumado), Aromático (sabor añadido), Burley (a nueces), VaPer (Virginia/Perique), etc." },
            { id: "tobacco-cut", q: "¿Cuáles son los tipos de corte de tabaco?", a: "El corte describe cómo se prepara el tabaco: Cinta (tiras finas, fácil de empacar), Hojuela (láminas prensadas, necesita frotar), Plug (bloque sólido), Moneda (plug en rodajas), Shag (muy fino), etc." },
            { id: "tobacco-strength", q: "¿Qué es la fuerza del tabaco?", a: "La fuerza se refiere al contenido de nicotina que va de Suave a Fuerte. Los principiantes generalmente comienzan con mezclas Suave-Medio. Las mezclas de fuerza completa pueden causar enfermedad por nicotina si no está acostumbrado." }
          ]
        },
        tobaccoValuation: {
          title: "Valoración de tabaco",
          items: [
            { id: "valuation-calc", q: "¿Cómo se calcula el valor del tabaco?", a: "El valor del tabaco se puede rastrear de dos formas: (1) Valor de Mercado Manual - ingresa el precio de mercado actual (Premium), o (2) Valoración Asistida por IA - IA analiza listados públicos para estimar valor, rango y confianza (Pro)." },
            { id: "manual-vs-ai", q: "¿Cuál es la diferencia entre valoración manual e IA?", a: "La valoración manual le permite rastrear su propia investigación (Premium). La valoración de IA utiliza aprendizaje automático para analizar datos de mercado y proporcionar estimaciones, rangos, niveles de confianza y proyecciones (Pro)." },
            { id: "estimated-label", q: "¿Por qué el valor se etiqueta como 'estimado'?", a: "Los valores generados por IA son predicciones basadas en datos de mercado disponibles. Los precios reales varían según la condición, edad, vendedor y demanda de mercado. Las estimaciones son herramientas educativas, no asesoramiento de inversión." },
            { id: "confidence-meaning", q: "¿Qué significa confianza?", a: "La confianza indica cuántos datos de mercado respaldan la estimación. Alto = datos sólidos. Medio = datos moderados. Bajo = datos limitados. La confianza baja significa que la estimación es menos confiable." },
            { id: "locked-valuation", q: "¿Por qué algunas características de valoración están bloqueadas?", a: "La valoración asistida por IA y las proyecciones predictivas requieren Pro. Los usuarios Premium pueden rastrear valores de mercado manuales y base de costos. Los usuarios gratuitos pueden rastrear solo inventario y envejecimiento." }
          ]
        },
        featuresAndTools: {
          title: "Características y herramientas",
          items: [
            { id: "interchangeable-bowls", q: "¿Qué son los cuencos intercambiables?", intro: "Algunos sistemas de pipa (Falcon, Gabotherm, Yello-Bole, Viking, etc.) le permiten intercambiar diferentes cuencos en el mismo conjunto de vástago/caña. PipeKeeper trata cada cuenco como una 'variante de pipa' distinta con su propia:", points: ["Etiquetas de enfoque (dedicar un cuenco a Virginia, otro a Aromáticos, etc.)", "Dimensiones de cámara y características", "Recomendaciones de emparejamiento de tabaco", "Cronogramas de rodaje y registros de fumar"], conclusion: "Esto permite la especialización óptima: use el mismo vástago con múltiples cuencos para diferentes tipos de tabaco sin fantasma." },
            { id: "pipe-focus", q: "¿Qué son las etiquetas de enfoque de pipa?", intro: "Las etiquetas de enfoque le permiten especializar pipas para tipos de tabaco específicos. Las etiquetas comunes incluyen:", points: ["Aromático: Dedica la pipa a mezclas aromáticas solo (intensidad fuerte/media/ligera soportada)", "No aromático: Excluye mezclas aromáticas", "Virginia, VaPer, English, Balkan, Latakia: Se tratan automáticamente como familias no aromáticas", "Utilidad/Versátil: Permite uso mixto sin restricciones"], conclusion: "El sistema de emparejamiento respeta estas etiquetas: las pipas solo de aromático no recomendarán mezclas no aromáticas y viceversa." },
            { id: "pairing-matrix", q: "¿Qué es la matriz de emparejamiento?", a: "La Matriz de Emparejamiento genera puntuaciones de compatibilidad (0-10) entre cada pipa y mezcla de tabaco en su colección. Considera características de pipa (forma, volumen de cámara, material de cuenco), perfiles de mezcla (tipo, fuerza, intensidad aromática), etiquetas de enfoque de pipa (Virginia, English, Aromático, etc.) y sus preferencias personales." },
            { id: "pipe-identification", q: "¿Cómo funciona la identificación de pipas?", a: "Cargue fotos de su pipa y la IA analizará marcas, forma y otras características visuales para identificar el fabricante, modelo y valor aproximado. También puede buscar manualmente en una base de datos de fabricantes de pipas conocidos." },
            { id: "geometry-analysis", q: "¿Qué es el análisis de geometría de pipa?", a: "Esta herramienta de IA analiza sus fotos de pipa y dimensiones almacenadas para clasificar atributos de geometría: forma (Billiard, Dublin, etc.), estilo de cuenco (cilíndrico, cónico, etc.), forma de caña (redonda, diamante, etc.), curvatura (recta, 1/4 curvada, etc.) y clase de tamaño (pequeño, estándar, grande, etc.)." },
            { id: "verified-measurements", q: "¿Puedo encontrar especificaciones de fabricante verificadas?", a: "Sí, como opción secundaria. Vaya a Actualizaciones de IA → 'Encontrar especificaciones de fabricante verificadas'. Esto busca en catálogos de fabricantes y bases de datos pero solo funciona para algunas pipas de producción. Muchas pipas artesanales y de patrimonio no tendrán especificaciones verificadas disponibles." },
            { id: "value-lookup", q: "¿Puede PipeKeeper estimar valores de pipa?", a: "Sí. La IA puede proporcionar valores de mercado estimados basados en fabricante, condición y tendencias del mercado actual. Estas son estimaciones solamente y no deben confiarse para propósitos de seguros o ventas." },
            { id: "export-tools", q: "¿Puedo exportar mis datos de colección?", a: "Sí. Las herramientas de exportación le permiten descargar su inventario de pipas y tabaco como archivos CSV para respaldo o uso en otras aplicaciones. Busque botones de exportación en las páginas de Pipas y Tabaco." }
          ]
        },
        accountsAndData: {
          title: "Cuentas y datos",
          items: [
            { id: "need-account", q: "¿Necesito una cuenta?", a: "Sí. Crear una cuenta le permite guardar y sincronizar su colección y configuración en todos los dispositivos." },
            { id: "export-data", q: "¿Puedo exportar mis datos?", a: "Sí. Las herramientas de exportación le permiten generar informes CSV/PDF de sus pipas, inventario de tabaco y registros de fumar. Busque botones de exportación en las páginas de Pipas y Tabaco." },
            { id: "bulk-import", q: "¿Puedo importar datos en masa?", a: "Sí. Vaya a la página de Importación desde la pantalla de Inicio. Puede pegar datos CSV o cargar un archivo para agregar rápidamente múltiples pipas o mezclas de tabaco a la vez." }
          ]
        },
        ai: {
          title: "Características de IA y precisión",
          items: [
            { id: "ai-accuracy", q: "¿Se garantiza que las recomendaciones de IA sean correctas?", a: "No. Las características de IA proporcionan sugerencias de mejor esfuerzo y pueden ser incompletas o inexactas. Debe usar su propio juicio y verificar la información importante de fuentes confiables." },
            { id: "medical-advice", q: "¿Proporciona PipeKeeper asesoramiento médico o profesional?", a: "No. PipeKeeper proporciona herramientas informativas solo para gestión y pasatiempo de colecciones." }
          ]
        },
        support: {
          title: "Soporte",
          contactQ: "¿Cómo contacto con soporte?",
          contactIntro: "Use el enlace de soporte dentro de la aplicación o visite",
          contactLinks: "También puede revisar nuestras políticas aquí:"
        }
      }
    },
    howTo: {
      pageTitle: "Guías prácticas",
      pageSubtitle: "Respuestas rápidas con rutas de navegación claras",
      navFAQ: "Preguntas frecuentes",
      navTroubleshooting: "Solución de problemas",
      footerTitle: "¿Todavía necesita ayuda?",
      footerDesc: "Visite nuestras preguntas frecuentes completas o póngase en contacto con soporte para obtener asistencia adicional.",
      footerFAQ: "Ver preguntas frecuentes completas",
      footerSupport: "Contactar soporte",
      sections: {
        gettingStarted: { title: "Empezando", items: [{ id: "add-pipe", q: "¿Cómo agrego una pipa?", path: "Inicio → Pipas → Agregar pipa", a: "Agregue sus pipas manualmente o use identificación de IA a partir de fotos. Incluya detalles como fabricante, forma, dimensiones y condición para desbloquear información y recomendaciones." }, { id: "add-tobacco", q: "¿Cómo agrego una mezcla de tabaco?", path: "Inicio → Tabaco → Agregar tabaco", a: "Rastreé sus mezclas de tabaco con detalles como fabricante, tipo de mezcla, cantidad y fechas de almacenamiento. Use el registro de bodega para registrar el progreso del envejecimiento." }, { id: "add-note", q: "¿Cómo agrego notas a un elemento?", path: "Pipas/Tabaco → Seleccionar elemento → Editar → Agregar notas", a: "Haga clic en cualquier pipa o tabaco para abrir su página de detalle. Toque 'Editar' y agregue notas en el campo designado. Las notas lo ayudan a recordar preferencias y observaciones personales." }, { id: "view-insights", q: "¿Cómo veo información?", path: "Inicio → Información de colección", a: "La información aparece en su página de Inicio después de agregar elementos. Vea estadísticas, cuadrículas de emparejamiento, paneles de envejecimiento e informes. Haga clic en pestañas para explorar diferentes perspectivas." }] },
        managingCollection: { title: "Gestionar su colección", items: [{ id: "organize", q: "¿Cómo organizo mi colección?", path: "Pipas/Tabaco → Filtros y Ordenar", a: "Use filtros para reducir por forma, tipo de mezcla o enfoque. Ordene por fecha agregada, valor o calificación. Guarde filtros favoritos para acceso rápido." }, { id: "export", q: "¿Cómo exporto mis datos?", path: "Inicio → Información → Pestaña Informes", badge: "Premium", a: "Los usuarios Premium y Pro pueden exportar datos de colección como CSV o PDF. Busque botones de exportación en la pestaña Informes bajo Información de Colección." }, { id: "cellar-log", q: "¿Cómo rastreo mi bodega?", path: "Tabaco → Seleccionar mezcla → Registro de bodega", badge: "Premium", a: "Registre cuándo se agrega o se retira tabaco de su bodega. Rastree cantidades, fechas y tipos de contenedor. Vea el progreso del envejecimiento en el Panel de Envejecimiento." }, { id: "smoking-log", q: "¿Cómo registro una sesión de fumar?", path: "Inicio → Información → Pestaña Registro", badge: "Premium", a: "Rastree qué pipa fumó con qué tabaco. Registre fecha, número de cuencos y notas. Estos datos potencian las recomendaciones de emparejamiento." }] },
        aiTools: { title: "Herramientas de IA", items: [{ id: "identify-pipe", q: "¿Cómo identifico una pipa a partir de una foto?", path: "Inicio → Experto Tabaquista → Identificar", badge: "Pro", a: "Cargue fotos de su pipa y la IA analiza marcas, forma y características para identificar fabricante, modelo y valor aproximado." }, { id: "pairing-suggestions", q: "¿Cómo obtengo sugerencias de emparejamiento?", path: "Inicio → Información → Cuadrícula de emparejamiento", badge: "Pro", a: "La Matriz de Emparejamiento genera puntuaciones de compatibilidad para cada combinación pipa-tabaco. Vea recomendaciones en páginas de detalle de pipa o en la Cuadrícula de Emparejamiento." }, { id: "optimize-collection", q: "¿Cómo optimizo mi colección?", path: "Inicio → Experto Tabaquista → Optimizar", badge: "Pro", a: "El Optimizador de Colecciones analiza sus pipas y tabacos para recomendar especializaciones, identificar brechas y sugerir su próxima compra." }] },
        subscriptions: { title: "Suscripciones", items: [{ id: "subscribe", q: "¿Cómo funcionan las suscripciones?", path: "Perfil → Suscripción", a: "PipeKeeper ofrece niveles Gratuito, Premium y Pro. Suscríbase para desbloquear elementos ilimitados, herramientas avanzadas y características de IA. Vea precios y gestione suscripciones en su Perfil." }, { id: "manage-subscription", q: "¿Cómo gestiono mi suscripción?", path: "Perfil → Gestionar suscripción", iosPart: "iOS: Gestione a través de Configuración de iOS → [Su nombre] → Suscripciones → PipeKeeper", webPart: "Web/Android: Vaya a Perfil → Gestionar suscripción para actualizar pago, ver facturas o cancelar" }, { id: "cancel", q: "¿Cómo cancelo mi suscripción?", path: "Perfil → Gestionar suscripción", iosPart: "iOS: Abra Configuración de iOS → [Su nombre] → Suscripciones → PipeKeeper → Cancelar suscripción", webPart: "Web/Android: Vaya a Perfil → Gestionar suscripción → Cancelar suscripción", note: "Mantendrá acceso hasta el final de su período de facturación." }] },
        troubleshooting: { title: "Solución de problemas", items: [{ id: "cant-login", q: "No puedo iniciar sesión o mi código expiró", path: "Pantalla de inicio de sesión → Solicitar nuevo código", a: "Intente iniciar sesión de nuevo: el sistema envía un nuevo código de verificación automáticamente. Verifique su carpeta de spam o visite la página de Ayuda de Verificación para obtener instrucciones detalladas." }, { id: "missing-features", q: "¿Por qué no puedo ver ciertas características?", path: "Perfil → Suscripción", a: "Algunas características requieren acceso Premium o Pro. Verifique su estado de suscripción en Perfil. Los usuarios gratuitos tienen acceso a gestión de colecciones principales para hasta 5 pipas y 10 mezclas de tabaco." }, { id: "sync-issues", q: "Mis datos no se están sincronizando", path: "Perfil → Actualizar / Cerrar sesión e iniciar sesión", a: "Intente actualizar su navegador o cerrar sesión e iniciar sesión. Su colección se sincroniza automáticamente a la nube cuando realiza cambios." }] }
      }
    },
    troubleshooting: {
      pageTitle: "Solución de problemas",
      pageSubtitle: "Problemas comunes y soluciones",
      navFAQ: "Preguntas frecuentes",
      navHowTo: "Guías prácticas",
      sections: {
        tobaccoValuation: {
          title: "Valoración de tabaco",
          items: [
            { id: "missing-value", q: "¿Por qué falta el valor de mi tabaco?", intro: "El valor requiere entrada manual (Premium) o estimación de IA (Pro).", points: ["Los usuarios gratuitos ven solo el inventario", "Asegúrese de tener el nivel de suscripción correcto", "Ejecute la valoración después de actualizar"] },
            { id: "low-confidence", q: "¿Por qué mi estimación muestra confianza baja?", intro: "La confianza baja significa que se encontraron datos de mercado limitados para esta mezcla.", points: ["Puede ser rara, descontinuada o regionalmente exclusiva", "Las estimaciones con confianza baja deben tratarse como aproximaciones aproximadas", "Considere usar valoración manual para mezclas raras"] },
            { id: "locked-ai", q: "¿Por qué la valoración de IA está bloqueada?", intro: "La valoración asistida por IA requiere Pro.", points: ["Si es suscriptor Premium que se unió antes del 1 de febrero de 2026, tiene acceso heredado", "De lo contrario, actualice a Pro para desbloquear características de IA"] },
            { id: "no-auto-update", q: "¿Por qué el valor no se actualiza automáticamente?", intro: "Las valoraciones de IA se generan bajo demanda para preservar créditos y rendimiento.", points: ["Haga clic en 'Ejecutar valoración de IA' para actualizar estimaciones", "La actualización automática programada se puede agregar en futuras actualizaciones de Pro"] }
          ]
        }
      }
    }
  },
  fr: {
    faqFull: {
      pageTitle: "FAQ PipeKeeper",
      pageSubtitle: "Définitions, informations générales et avertissements",
      navHowTo: "Guides pratiques",
      navTroubleshooting: "Dépannage",
      verificationHelp: {
        q: "🔒 Je ne peux pas me connecter / Mon code de vérification a expiré - Que faire?",
        intro: "Si vous avez des problèmes de vérification par e-mail ou de connexion:",
        steps: [
          "Essayez de vous reconnecter - le système enverra un nouveau code de vérification automatiquement",
          "Vérifiez votre dossier spam/courrier indésirable pour l'e-mail de vérification",
          "Visitez notre page d'aide à la vérification pour obtenir des instructions détaillées",
          "Contactez directement le support à admin@pipekeeperapp.com"
        ],
        note: "Incluez votre adresse e-mail lorsque vous contactez le support pour que nous puissions vous aider rapidement."
      },
      sections: {
        general: {
          title: "Général",
          items: [
            { id: "what-is", q: "Qu'est-ce que PipeKeeper?", a: "PipeKeeper est une application de gestion de collection et d'information conçue pour les amateurs de pipes. Elle vous aide à suivre les pipes, les mélanges de tabac, les boîtes vieillies et les notes associées, et fournit des insights assistés par IA optionnels et des estimations de valeur." },
            { id: "tobacco-sales", q: "PipeKeeper vend-il ou promeut-il le tabac?", a: "Non. PipeKeeper est uniquement une application de loisir et de gestion de collection. Elle ne vend pas, ne promeut pas et ne facilite pas l'achat de produits du tabac." },
            { id: "data-privacy", q: "Mes données sont-elles privées?", a: "Oui. Vos données de collection vous appartiennent. PipeKeeper utilise vos données uniquement pour faire fonctionner l'application et fournir des fonctionnalités. Nous ne vendons pas de données personnelles." },
            { id: "first-launch", q: "Pourquoi vois-je les Conditions de service lors de la première ouverture de l'application?", a: "À votre première utilisation, PipeKeeper vous demande d'accepter les Conditions de service et la Politique de confidentialité avant d'accéder à l'application. C'est une exigence unique. Une fois acceptées, vous irez directement à votre page d'accueil lors des visites futures. Vous pouvez consulter ces documents à tout moment dans le menu d'aide ou les liens de pied de page." }
          ]
        },
        gettingStarted: {
          title: "Démarrage",
          items: [
            { id: "tutorial", q: "Y a-t-il un tutoriel ou une procédure pas à pas?", a: "Oui! Lorsque vous créez votre compte pour la première fois, PipeKeeper propose un flux d'intégration guidé qui vous guide à travers la configuration de votre profil, l'ajout de votre première pipe et de votre tabac, et l'accès aux fonctionnalités d'IA. Vous pouvez redémarrer le tutoriel à tout moment à partir de la page d'accueil.", cta: "Redémarrer le tutoriel" },
            { id: "what-cellaring", q: "Qu'est-ce que le vieillissement en cave?", a: "Le vieillissement en cave fait référence au stockage de boîtes scellées ou de tabac en vrac pour le vieillissement. PipeKeeper inclut un système détaillé de journal de cave qui suit quand le tabac est ajouté ou retiré de votre cave, les quantités en onces, les types de conteneur et les notes. Cette fonction est disponible pour les abonnés Premium." },
            { id: "smoking-log", q: "Qu'est-ce que le journal de fumage?", a: "Le journal de fumage suit quelles pipes vous avez fumées avec quel tabac. Cela vous aide à vous souvenir de ce qui fonctionne bien ensemble et contribue aux recommandations d'appariement par IA. Les abonnés Premium bénéficient d'une réduction automatique de l'inventaire en fonction des séances enregistrées." }
          ]
        },
        fieldDefinitions: {
          title: "Définitions de champs",
          items: [
            { id: "pipe-shape", q: "Qu'est-ce que la forme d'une pipe?", a: "La classification de forme décrit la forme générale de la pipe (Billiard, Dublin, Courbée, etc.). PipeKeeper comprend plus de 30 formes courantes. La forme affecte les caractéristiques de fumage comme le confort de serrage et le refroidissement de la fumée." },
            { id: "chamber-volume", q: "Qu'est-ce que le volume de la chambre?", a: "Le volume de chambre (Petit/Moyen/Grand/Extra grand) indique la capacité du foyer et la durée de la fumée. Les petites chambres sont bonnes pour fumer 15-30 minutes, tandis que Extra Grand peut offrir 90+ minutes." },
            { id: "stem-material", q: "Quelles sont les options de matériau de tuyau?", a: "Les matériaux de tuyau courants incluent Vulcanite (traditionnel, morsure douce), Acrylique/Lucite (durable, plus dur), Cumberland (apparence marbrée) et matériaux spécialisés comme Ambre ou Corne." },
            { id: "bowl-material", q: "Quels sont les matériaux du foyer?", a: "La plupart des pipes sont en Bruyère (bois résistant à la chaleur), mais d'autres matériaux incluent Écume de Mer (minéral, se colore avec l'usage), Épi de Maïs (économique, jetable), Morta (chêne tourbeux) et diverses autres bois." },
            { id: "finish-types", q: "Quels sont les types de finition?", a: "La finition fait référence au traitement de surface du foyer: Lisse (poli, montre le grain), Sablé (texturé, cache les remplissages), Rustiqué (texture sculptée) ou Naturel (non fini). La finition est largement esthétique mais peut affecter la prise." },
            { id: "blend-type", q: "Quels sont les types de mélanges de tabac?", a: "Les types de mélange catégorisent le tabac par composition des feuilles principales: Virginie (sucré, herbacé), English (avec Latakia, fumé), Aromatique (parfum ajouté), Burley (noisette), VaPer (Virginie/Périque), etc." },
            { id: "tobacco-cut", q: "Quels sont les types de coupe de tabac?", a: "La coupe décrit comment le tabac est préparé: Ruban (fines bandes, facile à tasser), Flocon (feuilles pressées, nécessite un frottement), Plug (bloc solide), Pièce de monnaie (plug tranché), Shag (très fin), etc." },
            { id: "tobacco-strength", q: "Qu'est-ce que la force du tabac?", a: "La force se rapporte à la teneur en nicotine allant de Doux à Fort. Les débutants commencent généralement avec des mélanges Doux-Moyen. Les mélanges de force complète peuvent causer des malaises à la nicotine si vous ne n'êtes pas habitué." }
          ]
        },
        tobaccoValuation: {
          title: "Évaluation du tabac",
          items: [
            { id: "valuation-calc", q: "Comment la valeur du tabac est-elle calculée?", a: "La valeur du tabac peut être suivie de deux façons: (1) Valeur de marché manuelle - vous entrez le prix du marché actuel (Premium), ou (2) Évaluation assistée par IA - l'IA analyse les annonces publiques pour estimer la valeur, la plage et la confiance (Pro)." },
            { id: "manual-vs-ai", q: "Quelle est la différence entre l'évaluation manuelle et l'IA?", a: "L'évaluation manuelle vous permet de suivre vos propres recherches (Premium). L'évaluation par IA utilise l'apprentissage automatique pour analyser les données du marché et fournir des estimations, des plages, des niveaux de confiance et des projections (Pro)." },
            { id: "estimated-label", q: "Pourquoi la valeur est-elle étiquetée comme 'estimée'?", a: "Les valeurs générées par IA sont des prédictions basées sur les données de marché disponibles. Les prix réels varient selon la condition, l'âge, le vendeur et la demande du marché. Les estimations sont des outils pédagogiques, pas des conseils en investissement." },
            { id: "confidence-meaning", q: "Que signifie la confiance?", a: "La confiance indique combien de données de marché soutiennent l'estimation. Élevée = données solides. Moyenne = données modérées. Basse = données limitées. Une confiance basse signifie que l'estimation est moins fiable." },
            { id: "locked-valuation", q: "Pourquoi certaines fonctionnalités d'évaluation sont-elles verrouillées?", a: "L'évaluation assistée par IA et les projections prédictives nécessitent Pro. Les utilisateurs Premium peuvent suivre les valeurs de marché manuelles et le coût de base. Les utilisateurs gratuits ne peuvent suivre que l'inventaire et le vieillissement." }
          ]
        },
        featuresAndTools: {
          title: "Fonctionnalités et outils",
          items: [
            { id: "interchangeable-bowls", q: "Qu'est-ce que les foyers interchangeables?", intro: "Certains systèmes de pipe (Falcon, Gabotherm, Yello-Bole, Viking, etc.) vous permettent d'échanger différents foyers sur le même ensemble tuyau/virole. PipeKeeper traite chaque foyer comme une 'variante de pipe' distincte avec sa propre:", points: ["Étiquettes de focus (dédier un foyer aux Virginies, un autre aux Aromatiques, etc.)", "Dimensions de chambre et caractéristiques", "Recommandations d'appariement de tabac", "Calendriers de rodage et journaux de fumage"], conclusion: "Cela permet une spécialisation optimale: utilisez la même virole avec plusieurs foyers pour différents types de tabac sans fantôme." },
            { id: "pipe-focus", q: "Qu'est-ce que les étiquettes de focus de pipe?", intro: "Les étiquettes de focus vous permettent de spécialiser les pipes pour des types de tabac spécifiques. Les étiquettes courantes incluent:", points: ["Aromatique: Dédie la pipe aux mélanges aromatiques uniquement (intensité Forte/Moyenne/Légère soutenue)", "Non-aromatique: Exclut les mélanges aromatiques", "Virginie, VaPer, English, Balkan, Latakia: Traités automatiquement comme des familles non-aromatiques", "Utilité/Polyvalent: Permet une utilisation mixte sans restrictions"], conclusion: "Le système d'appariement respecte ces étiquettes: les pipes aromatiques uniquement ne recommanderont pas les mélanges non-aromatiques et vice versa." },
            { id: "pairing-matrix", q: "Qu'est-ce que la matrice d'appariement?", a: "La Matrice d'Appariement génère des scores de compatibilité (0-10) entre chaque pipe et mélange de tabac dans votre collection. Elle considère les caractéristiques de la pipe (forme, volume de chambre, matériau du foyer), les profils de mélange (type, force, intensité aromatique), les étiquettes de focus de pipe (Virginie, English, Aromatique, etc.) et vos préférences personnelles." },
            { id: "pipe-identification", q: "Comment fonctionne l'identification de pipe?", a: "Téléchargez des photos de votre pipe et l'IA analysera les marquages, la forme et autres caractéristiques visuelles pour identifier le fabricant, le modèle et la valeur approximative. Vous pouvez également chercher manuellement dans une base de données des fabricants de pipes connus." },
            { id: "geometry-analysis", q: "Qu'est-ce que l'analyse de géométrie de pipe?", a: "Cet outil d'IA analyse vos photos de pipe et dimensions stockées pour classer les attributs de géométrie: forme (Billiard, Dublin, etc.), style de foyer (cylindrique, conique, etc.), forme de virole (rond, diamant, etc.), courbure (droit, 1/4 courbé, etc.) et classe de taille (petit, standard, grand, etc.)." },
            { id: "verified-measurements", q: "Puis-je trouver des spécifications de fabricant vérifiées?", a: "Oui, en option secondaire. Allez à Mises à jour de l'IA → 'Trouver les spécifications de fabricant vérifiées'. Ceci recherche dans les catalogues et bases de données des fabricants mais ne fonctionne que pour certaines pipes de production. De nombreuses pipes artisanales et patrimoniales n'auront pas de spécifications vérifiées disponibles." },
            { id: "value-lookup", q: "PipeKeeper peut-il estimer les valeurs de pipe?", a: "Oui. L'IA peut fournir des valeurs de marché estimées basées sur le fabricant, la condition et les tendances actuelles du marché. Ce sont des estimations uniquement et ne doivent pas être utilisées pour les assurances ou la vente." },
            { id: "export-tools", q: "Puis-je exporter mes données de collection?", a: "Oui. Les outils d'exportation vous permettent de télécharger votre inventaire de pipes et de tabac sous forme de fichiers CSV pour la sauvegarde ou l'utilisation dans d'autres applications. Recherchez les boutons d'exportation sur les pages Pipes et Tabac." }
          ]
        },
        accountsAndData: {
          title: "Comptes et données",
          items: [
            { id: "need-account", q: "Ai-je besoin d'un compte?", a: "Oui. La création d'un compte vous permet d'enregistrer et de synchroniser votre collection et vos paramètres sur tous les appareils." },
            { id: "export-data", q: "Puis-je exporter mes données?", a: "Oui. Les outils d'exportation vous permettent de générer des rapports CSV/PDF de vos pipes, inventaire de tabac et journaux de fumage. Recherchez les boutons d'exportation sur les pages Pipes et Tabac." },
            { id: "bulk-import", q: "Puis-je importer des données en masse?", a: "Oui. Allez à la page Importer à partir de l'écran d'accueil. Vous pouvez coller les données CSV ou télécharger un fichier pour ajouter rapidement plusieurs pipes ou mélanges de tabac à la fois." }
          ]
        },
        ai: {
          title: "Fonctionnalités d'IA et précision",
          items: [
            { id: "ai-accuracy", q: "Les recommandations de l'IA sont-elles garanties correctes?", a: "Non. Les fonctionnalités d'IA fournissent des suggestions au mieux et peuvent être incomplètes ou inexactes. Vous devez utiliser votre propre jugement et vérifier les informations importantes auprès de sources fiables." },
            { id: "medical-advice", q: "PipeKeeper fournit-il des conseils médicaux ou professionnels?", a: "Non. PipeKeeper fournit des outils informatifs uniquement pour la gestion des loisirs et des collections." }
          ]
        },
        support: {
          title: "Support",
          contactQ: "Comment contacter le support?",
          contactIntro: "Utilisez le lien d'assistance dans l'application ou visitez",
          contactLinks: "Vous pouvez également consulter nos politiques ici:"
        }
      }
    },
    howTo: {
      pageTitle: "Guides pratiques",
      pageSubtitle: "Réponses rapides avec des chemins de navigation clairs",
      navFAQ: "FAQ",
      navTroubleshooting: "Dépannage",
      footerTitle: "Vous avez toujours besoin d'aide?",
      footerDesc: "Visitez nos FAQ complètes ou contactez le support pour obtenir une assistance supplémentaire.",
      footerFAQ: "Voir la FAQ complète",
      footerSupport: "Contacter le support",
      sections: {
        gettingStarted: { title: "Démarrage", items: [{ id: "add-pipe", q: "Comment ajouter une pipe?", path: "Accueil → Pipes → Ajouter une pipe", a: "Ajoutez vos pipes manuellement ou utilisez l'identification par IA à partir de photos. Incluez des détails comme le fabricant, la forme, les dimensions et l'état pour débloquer les insights et les recommandations." }, { id: "add-tobacco", q: "Comment ajouter un mélange de tabac?", path: "Accueil → Tabac → Ajouter du tabac", a: "Suivez vos mélanges de tabac avec des détails comme le fabricant, le type de mélange, la quantité et les dates de stockage. Utilisez le journal de cave pour enregistrer la progression du vieillissement." }, { id: "add-note", q: "Comment ajouter des notes à un élément?", path: "Pipes/Tabac → Sélectionner l'élément → Modifier → Ajouter des notes", a: "Cliquez sur n'importe quelle pipe ou tabac pour ouvrir sa page de détail. Appuyez sur 'Modifier' et ajoutez des notes dans le champ désigné. Les notes vous aident à vous souvenir des préférences et des observations personnelles." }, { id: "view-insights", q: "Comment voir les insights?", path: "Accueil → Informations de collection", a: "Les insights apparaissent sur votre page d'accueil après l'ajout d'éléments. Affichez les statistiques, les grilles d'appariement, les tableaux de bord de vieillissement et les rapports. Cliquez sur les onglets pour explorer différents insights." }] },
        managingCollection: { title: "Gérer votre collection", items: [{ id: "organize", q: "Comment organiser ma collection?", path: "Pipes/Tabac → Filtres et Tri", a: "Utilisez les filtres pour affiner par forme, type de mélange ou focus. Triez par date d'ajout, valeur ou notation. Enregistrez les filtres favoris pour un accès rapide." }, { id: "export", q: "Comment exporter mes données?", path: "Accueil → Insights → Onglet Rapports", badge: "Premium", a: "Les utilisateurs Premium et Pro peuvent exporter les données de collection en CSV ou PDF. Trouvez les boutons d'exportation dans l'onglet Rapports sous Informations de Collection." }, { id: "cellar-log", q: "Comment suivre ma cave?", path: "Tabac → Sélectionner le mélange → Journal de cave", badge: "Premium", a: "Enregistrez quand le tabac est ajouté ou retiré de votre cave. Suivez les quantités, les dates et les types de conteneur. Affichez la progression du vieillissement sur le Tableau de Bord de Vieillissement." }, { id: "smoking-log", q: "Comment enregistrer une session de fumage?", path: "Accueil → Insights → Onglet Journalisation", badge: "Premium", a: "Suivez quelle pipe vous avez fumée avec quel tabac. Enregistrez la date, le nombre de foyers et les notes. Ces données alimentent les recommandations d'appariement." }] },
        aiTools: { title: "Outils d'IA", items: [{ id: "identify-pipe", q: "Comment identifier une pipe à partir d'une photo?", path: "Accueil → Expert Tabacconiste → Identifier", badge: "Pro", a: "Téléchargez des photos de votre pipe et l'IA analyse les marquages, la forme et les caractéristiques pour identifier le fabricant, le modèle et la valeur approximative." }, { id: "pairing-suggestions", q: "Comment obtenir des suggestions d'appariement?", path: "Accueil → Insights → Grille d'appariement", badge: "Pro", a: "La Matrice d'Appariement génère des scores de compatibilité pour chaque combinaison pipe-tabac. Affichez les recommandations sur les pages de détail de pipe ou dans la Grille d'Appariement." }, { id: "optimize-collection", q: "Comment optimiser ma collection?", path: "Accueil → Expert Tabacconiste → Optimiser", badge: "Pro", a: "L'Optimiseur de Collection analyse vos pipes et tabacs pour recommander des spécialisations, identifier les lacunes et suggérer votre prochain achat." }] },
        subscriptions: { title: "Abonnements", items: [{ id: "subscribe", q: "Comment fonctionnent les abonnements?", path: "Profil → Abonnement", a: "PipeKeeper offre des niveaux Gratuit, Premium et Pro. S'abonner pour débloquer les éléments illimités, les outils avancés et les fonctionnalités d'IA. Affichez les tarifs et gérez les abonnements dans votre Profil." }, { id: "manage-subscription", q: "Comment gérer mon abonnement?", path: "Profil → Gérer l'abonnement", iosPart: "iOS: Gérez via Paramètres iOS → [Votre nom] → Abonnements → PipeKeeper", webPart: "Web/Android: Allez à Profil → Gérer l'abonnement pour mettre à jour le paiement, voir les factures ou annuler" }, { id: "cancel", q: "Comment annuler mon abonnement?", path: "Profil → Gérer l'abonnement", iosPart: "iOS: Ouvrez Paramètres iOS → [Votre nom] → Abonnements → PipeKeeper → Annuler l'abonnement", webPart: "Web/Android: Allez à Profil → Gérer l'abonnement → Annuler l'abonnement", note: "Vous conserverez l'accès jusqu'à la fin de votre période de facturation." }] },
        troubleshooting: { title: "Dépannage", items: [{ id: "cant-login", q: "Je ne peux pas me connecter ou mon code a expiré", path: "Écran de connexion → Demander un nouveau code", a: "Essayez de vous reconnecter: le système envoie un nouveau code de vérification automatiquement. Vérifiez votre dossier spam ou visitez la page d'aide à la vérification pour obtenir des instructions détaillées." }, { id: "missing-features", q: "Pourquoi ne puis-je pas voir certaines fonctionnalités?", path: "Profil → Abonnement", a: "Certaines fonctionnalités nécessitent un accès Premium ou Pro. Vérifiez votre statut d'abonnement dans Profil. Les utilisateurs gratuits ont accès à la gestion des collections principales pour jusqu'à 5 pipes et 10 mélanges de tabac." }, { id: "sync-issues", q: "Mes données ne se synchronisent pas", path: "Profil → Actualiser / Se déconnecter et se reconnecter", a: "Essayez d'actualiser votre navigateur ou de vous déconnecter et de vous reconnecter. Votre collection se synchronise automatiquement avec le cloud lorsque vous apportez des modifications." }] }
      }
    },
    troubleshooting: {
      pageTitle: "Dépannage",
      pageSubtitle: "Problèmes courants et solutions",
      navFAQ: "FAQ",
      navHowTo: "Guides pratiques",
      sections: {
        tobaccoValuation: {
          title: "Évaluation du tabac",
          items: [
            { id: "missing-value", q: "Pourquoi la valeur de mon tabac manque-t-elle?", intro: "La valeur nécessite soit une entrée manuelle (Premium) soit une estimation par IA (Pro).", points: ["Les utilisateurs gratuits ne voient que l'inventaire", "Assurez-vous d'avoir le bon niveau d'abonnement", "Exécutez l'évaluation après la mise à niveau"] },
            { id: "low-confidence", q: "Pourquoi mon estimation affiche-t-elle une confiance basse?", intro: "La confiance basse signifie que les données du marché limitées ont été trouvées pour ce mélange.", points: ["Il peut être rare, discontinué ou régionalement exclusif", "Les estimations avec confiance basse doivent être traitées comme des approximations approximatives", "Envisagez d'utiliser l'évaluation manuelle pour les mélanges rares"] },
            { id: "locked-ai", q: "Pourquoi l'évaluation par IA est-elle verrouillée?", intro: "L'évaluation assistée par IA nécessite Pro.", points: ["Si vous êtes un abonné Premium qui a adhéré avant le 1er février 2026, vous avez un accès hérité", "Sinon, mettez à niveau vers Pro pour débloquer les fonctionnalités d'IA"] },
            { id: "no-auto-update", q: "Pourquoi la valeur ne s'met-elle pas à jour automatiquement?", intro: "Les évaluations par IA sont générées à la demande pour préserver les crédits et les performances.", points: ["Cliquez sur 'Exécuter l'évaluation par IA' pour actualiser les estimations", "L'actualisation automatique planifiée peut être ajoutée dans les futures mises à jour Pro"] }
          ]
        }
      }
    }
  },
  de: {
    faqFull: {
      pageTitle: "PipeKeeper häufig gestellte Fragen",
      pageSubtitle: "Definitionen, allgemeine Informationen und Haftungsausschlüsse",
      navHowTo: "Anleitungen",
      navTroubleshooting: "Fehlerbehebung",
      verificationHelp: {
        q: "🔒 Ich kann mich nicht anmelden / Mein Bestätigungscode ist abgelaufen - Was soll ich tun?",
        intro: "Wenn Sie Probleme mit der E-Mail-Verifizierung oder Anmeldung haben:",
        steps: [
          "Versuchen Sie sich erneut anzumelden - das System sendet automatisch einen neuen Bestätigungscode",
          "Überprüfen Sie Ihren Spam-/Junk-Ordner auf die Bestätigungs-E-Mail",
          "Besuchen Sie unsere Seite zur Verifizierungshilfe für detaillierte Anweisungen",
          "Kontaktieren Sie den Support direkt unter admin@pipekeeperapp.com"
        ],
        note: "Geben Sie Ihre E-Mail-Adresse an, wenn Sie den Support kontaktieren, damit wir Ihnen schnell helfen können."
      },
      sections: {
        general: {
          title: "Allgemein",
          items: [
            { id: "what-is", q: "Was ist PipeKeeper?", a: "PipeKeeper ist eine Sammlungsverwaltungs- und Informationsanwendung für Pfeifenraucher. Sie hilft Ihnen, Pfeifen, Tabakkischungen, gelagerte Dosen und zugehörige Notizen zu verfolgen, und bietet optionale KI-unterstützte Einblicke und Schätzungen des Verkehrswerts." },
            { id: "tobacco-sales", q: "Verkauft oder bewirbt PipeKeeper Tabak?", a: "Nein. PipeKeeper ist ausschließlich eine Hobby- und Sammlungsverwaltungsanwendung. Es verkauft, bewirbt oder erleichtert den Kauf von Tabakprodukten nicht." },
            { id: "data-privacy", q: "Sind meine Daten privat?", a: "Ja. Ihre Sammlungsdaten gehören Ihnen. PipeKeeper nutzt Ihre Daten nur zum Betrieb der Anwendung und zur Bereitstellung von Funktionen. Wir verkaufen keine persönlichen Daten." },
            { id: "first-launch", q: "Warum sehe ich die Nutzungsbedingungen bei der ersten Öffnung der App?", a: "Bei der ersten Nutzung verlangt PipeKeeper von Ihnen, die Nutzungsbedingungen und Datenschutzrichtlinie zu akzeptieren, bevor Sie auf die App zugreifen. Dies ist eine einmalige Anforderung. Nach der Akzeptanz gehen Sie direkt zu Ihrer Startseite bei zukünftigen Besuchen. Sie können diese Dokumente jederzeit über das Hilfemenü oder Footerlinks überprüfen." }
          ]
        },
        gettingStarted: {
          title: "Erste Schritte",
          items: [
            { id: "tutorial", q: "Gibt es ein Tutorial oder eine Anleitung?", a: "Ja! Wenn Sie Ihr Konto zum ersten Mal erstellen, bietet PipeKeeper einen geführten Onboarding-Prozess, der Sie durch die Profileinrichtung, das Hinzufügen Ihrer ersten Pfeife und Ihres Tabaks sowie den Zugriff auf KI-Funktionen führt. Sie können das Tutorial jederzeit von der Startseite aus neu starten.", cta: "Tutorial neu starten" },
            { id: "what-cellaring", q: "Was ist Lagerung?", a: "Lagerung bezieht sich auf die Lagerung versiegelter Dosen oder Tabak in loser Schüttung zum Reifen. PipeKeeper verfügt über ein detailliertes Lagerverfolgungssystem, das verfolgt, wann Tabak zu Ihrem Lager hinzugefügt oder entnommen wird, Mengen in Unzen, Behältertypen und Notizen. Diese Funktion ist für Premium-Abonnenten verfügbar." },
            { id: "smoking-log", q: "Was ist das Raucherprotokoll?", a: "Das Raucherprotokoll verfolgt, welche Pfeifen Sie mit welchem Tabak geraucht haben. Es hilft Ihnen zu erinnern, was gut zusammenpasst, und trägt zu KI-Paarungsempfehlungen bei. Premium-Abonnenten profitieren von der automatischen Bestandsreduzierung basierend auf protokollierten Sitzungen." }
          ]
        },
        fieldDefinitions: {
          title: "Felddefinitionen",
          items: [
            { id: "pipe-shape", q: "Was ist Pfeifenform?", a: "Die Formklassifizierung beschreibt die Gesamtform der Pfeife (Billiard, Dublin, gebogen usw.). PipeKeeper umfasst über 30 gängige Formen. Die Form beeinflusst Raucheigenschaften wie Klammerkomfort und Raukkühlung." },
            { id: "chamber-volume", q: "Was ist Kammervolumen?", a: "Das Kammervolumen (Klein/Mittel/Groß/Extra Groß) zeigt die Schüsselkapazität und Rauchauer an. Kleine Kammern sind gut für 15-30 Minuten Rauchen, während Extra Groß 90+ Minuten bieten kann." },
            { id: "stem-material", q: "Welche Schaftmaterialoptionen gibt es?", a: "Gängige Schaftmaterialien sind Vulkanit (traditionell, weiches Mundstück), Acryl/Luxit (langlebig, härter), Cumberland (marmoriertes Aussehen) und Spezzialmaterialien wie Bernstein oder Horn." },
            { id: "bowl-material", q: "Welche Materialien der Schüssel gibt es?", a: "Die meisten Pfeifen sind aus Bruyere (hitzebeständiges Holz), aber andere Materialien sind Meerschaum (Mineral, färbt sich mit dem Gebrauch), Maiskolben (erschwinglich, Einweg), Morta (Torfholz) und verschiedene andere Hölzer." },
            { id: "finish-types", q: "Welche Ausführungstypen gibt es?", a: "Die Ausführung bezieht sich auf die Oberflächenbehandlung der Schüssel: Glatt (poliert, zeigt Körnung), sandgestrahlt (texturiert, verbirgt Filler), rustikal (geschnitzte Textur) oder natürlich (unpoliert). Die Ausführung ist meist ästhetisch, kann aber den Griff beeinflussen." },
            { id: "blend-type", q: "Welche Tabakblendtypen gibt es?", a: "Blendtypen kategorisieren Tabak nach Primärblattkomposition: Virgina (süß, krautig), English (mit Latakia, rauchig), Aromatisch (zusätzlicher Geschmack), Burley (nussig), VaPer (Virginia/Perique) usw." },
            { id: "tobacco-cut", q: "Welche Tabakschnitttypen gibt es?", a: "Der Schnitt beschreibt die Tabakzubereitung: Ribbon (dünne Streifen, leicht zu verpacken), Flake (gepresste Blätter, benötigt Reiben), Plug (fester Block), Münze (geschnittener Plug), Shag (sehr fein) usw." },
            { id: "tobacco-strength", q: "Was ist Tabakstärke?", a: "Die Stärke bezieht sich auf den Nikotingehalt von Mild bis Stark. Anfänger beginnen typischerweise mit Mild-Mittel-Mischungen. Vollstarke Mischungen können Nikotinkrankheit verursachen, wenn Sie nicht daran gewöhnt sind." }
          ]
        },
        tobaccoValuation: {
          title: "Tabakbewertung",
          items: [
            { id: "valuation-calc", q: "Wie wird der Tabakwert berechnet?", a: "Der Tabakwert kann auf zwei Arten verfolgt werden: (1) Manueller Marktwert - Sie geben den aktuellen Marktpreis ein (Premium), oder (2) KI-unterstützte Bewertung - KI analysiert öffentliche Angebote, um Wert, Bereich und Vertrauen zu schätzen (Pro)." },
            { id: "manual-vs-ai", q: "Was ist der Unterschied zwischen manueller und KI-Bewertung?", a: "Mit der manuellen Bewertung können Sie Ihre eigenen Recherchen verfolgen (Premium). Die KI-Bewertung nutzt maschinelles Lernen zur Analyse von Marktdaten und bietet Schätzungen, Bereiche, Vertrauensstufen und Projektionen (Pro)." },
            { id: "estimated-label", q: "Warum wird der Wert als 'geschätzt' gekennzeichnet?", a: "KI-generierte Werte sind Vorhersagen basierend auf verfügbaren Marktdaten. Die tatsächlichen Preise variieren je nach Zustand, Alter, Verkäufer und Marktnachfrage. Schätzungen sind Lernwerkzeuge, keine Investitionsberatung." },
            { id: "confidence-meaning", q: "Was bedeutet Vertrauen?", a: "Vertrauen zeigt, wie viele Marktdaten die Schätzung unterstützen. Hoch = starke Daten. Mittel = moderate Daten. Niedrig = begrenzte Daten. Niedriges Vertrauen bedeutet, dass die Schätzung weniger zuverlässig ist." },
            { id: "locked-valuation", q: "Warum sind einige Bewertungsfunktionen gesperrt?", a: "KI-unterstützte Bewertung und Zukunftsprognosen erfordern Pro. Premium-Benutzer können manuelle Marktwerte und Kostenbasis verfolgen. Kostenlose Benutzer können nur Inventar und Alterung verfolgen." }
          ]
        },
        featuresAndTools: {
          title: "Funktionen und Werkzeuge",
          items: [
            { id: "interchangeable-bowls", q: "Was sind austauschbare Schüsseln?", intro: "Einige Pfeifensysteme (Falcon, Gabotherm, Yello-Bole, Viking usw.) ermöglichen es Ihnen, verschiedene Schüsseln auf der gleichen Schaft-/Kammermontage auszutauschen. PipeKeeper behandelt jede Schüssel als eine distinct 'Pfeifenvariante' mit ihrem:", points: ["Fokusetiketten (eine Schüssel Virginia widmen, eine andere Aromatischen, usw.)", "Kammerdimensionen und Eigenschaften", "Tabakpaarungsempfehlungen", "Einfahrpläne und Raucherprotokolle"], conclusion: "Dies ermöglicht optimale Spezialisierung: Verwenden Sie denselben Schaft mit mehreren Schüsseln für verschiedene Tabaktypen ohne Geist." },
            { id: "pipe-focus", q: "Was sind Pfeifenfokusetiketten?", intro: "Mit Fokusetiketten können Sie Pfeifen für bestimmte Tabaktypen spezialisieren. Gängige Etiketten sind:", points: ["Aromatisch: Widmet die Pfeife ausschließlich aromatischen Mischungen (stark/mittel/leichte Intensität unterstützt)", "Nicht-Aromatisch: Schließt aromatische Mischungen aus", "Virginia, VaPer, English, Balkan, Latakia: Werden automatisch als nicht-aromatische Familien behandelt", "Utility/Vielseitig: Ermöglicht gemischte Nutzung ohne Einschränkungen"], conclusion: "Das Paarungssystem respektiert diese Etiketten: Pfeifen mit nur Aroma empfehlen keine nicht-aromatischen Mischungen und umgekehrt." },
            { id: "pairing-matrix", q: "Was ist die Paarungsmatrix?", a: "Die Paarungsmatrix generiert Kompatibilitätswerte (0-10) zwischen jeder Pfeife und Tabakblendung in Ihrer Sammlung. Sie berücksichtigt Pfeifeneigenschaften (Form, Kammervolumen, Schüsselmaterial), Blendprofile (Typ, Stärke, aromatische Intensität), Pfeifenfokusetiketten (Virginia, English, Aromatisch usw.) und Ihre persönlichen Vorlieben." },
            { id: "pipe-identification", q: "Wie funktioniert die Pfeifenerkennung?", a: "Laden Sie Fotos Ihrer Pfeife hoch und die KI analysiert Markierungen, Form und andere visuelle Merkmale, um Hersteller, Modell und ungefähren Wert zu identifizieren. Sie können auch manuell in einer Datenbank bekannter Pfeifenhersteller suchen." },
            { id: "geometry-analysis", q: "Was ist Pfeifengeometrieanalyse?", a: "Dieses KI-Werkzeug analysiert Ihre Pfeifenfotos und gespeicherte Dimensionen, um Geometrieattribute zu klassifizieren: Form (Billiard, Dublin usw.), Schüsselstil (zylindrisch, konisch usw.), Schaftform (rund, Diamant usw.), Biegung (gerade, 1/4 gebogen usw.) und Größenklasse (klein, standard, groß usw.)." },
            { id: "verified-measurements", q: "Kann ich überprüfte Herstellerspezifikationen finden?", a: "Ja, als sekundäre Option. Gehen Sie zu KI-Aktualisierungen → 'Überprüfte Herstellerspezifikationen finden'. Dies durchsucht Herstellerkatalog und Datenbanken, funktioniert aber nur für einige Produktionspfeifen. Viele handwerkliche und alte Pfeifen haben keine überprüften Spezifikationen verfügbar." },
            { id: "value-lookup", q: "Kann PipeKeeper Pfeifenwerte schätzen?", a: "Ja. Die KI kann geschätzte Marktwerte basierend auf Hersteller, Zustand und aktuellen Markttrends bieten. Dies sind nur Schätzungen und sollten nicht für Versicherungs- oder Verkaufszwecke verwendet werden." },
            { id: "export-tools", q: "Kann ich meine Sammlungsdaten exportieren?", a: "Ja. Exportwerkzeuge ermöglichen es Ihnen, Ihre Pfeifen- und Tabakbestände als CSV-Dateien für Sicherung oder Verwendung in anderen Anwendungen herunterzuladen. Suchen Sie nach Export-Schaltflächen auf den Seiten Pfeifen und Tabak." }
          ]
        },
        accountsAndData: {
          title: "Konten und Daten",
          items: [
            { id: "need-account", q: "Benötige ich ein Konto?", a: "Ja. Durch die Erstellung eines Kontos können Sie Ihre Sammlung und Einstellungen auf allen Geräten speichern und synchronisieren." },
            { id: "export-data", q: "Kann ich meine Daten exportieren?", a: "Ja. Exportwerkzeuge ermöglichen es Ihnen, CSV/PDF-Berichte Ihrer Pfeifen, des Tabakbestands und der Raucherprotokolle zu generieren. Suchen Sie nach Export-Schaltflächen auf den Seiten Pfeifen und Tabak." },
            { id: "bulk-import", q: "Kann ich Daten in Massen importieren?", a: "Ja. Gehen Sie von der Startseite aus auf die Seite Importieren. Sie können CSV-Daten einfügen oder eine Datei hochladen, um schnell mehrere Pfeifen oder Tabakblendungen auf einmal hinzuzufügen." }
          ]
        },
        ai: {
          title: "KI-Funktionen und Genauigkeit",
          items: [
            { id: "ai-accuracy", q: "Sind KI-Empfehlungen garantiert korrekt?", a: "Nein. KI-Funktionen bieten bestmögliche Vorschläge und können unvollständig oder ungenau sein. Sie sollten Ihr eigenes Urteil verwenden und wichtige Informationen aus zuverlässigen Quellen überprüfen." },
            { id: "medical-advice", q: "Bietet PipeKeeper medizinische oder professionelle Beratung?", a: "Nein. PipeKeeper bietet Informationswerkzeuge nur für Hobby- und Sammlungsverwaltung." }
          ]
        },
        support: {
          title: "Unterstützung",
          contactQ: "Wie kontaktiere ich den Support?",
          contactIntro: "Nutzen Sie den Supportlink in der App oder besuchen Sie",
          contactLinks: "Sie können auch unsere Richtlinien hier überprüfen:"
        }
      }
    },
    howTo: {
      pageTitle: "Anleitungen",
      pageSubtitle: "Schnelle Antworten mit klaren Navigationswegen",
      navFAQ: "Häufig gestellte Fragen",
      navTroubleshooting: "Fehlerbehebung",
      footerTitle: "Benötigen Sie noch Hilfe?",
      footerDesc: "Besuchen Sie unsere vollständigen FAQs oder kontaktieren Sie den Support für weitere Unterstützung.",
      footerFAQ: "Vollständige FAQs anzeigen",
      footerSupport: "Support kontaktieren",
      sections: {
        gettingStarted: { title: "Erste Schritte", items: [{ id: "add-pipe", q: "Wie füge ich eine Pfeife hinzu?", path: "Startseite → Pfeifen → Pfeife hinzufügen", a: "Fügen Sie Ihre Pfeifen manuell hinzu oder verwenden Sie KI-Erkennung aus Fotos. Fügen Sie Details wie Hersteller, Form, Dimensionen und Zustand hinzu, um Einblicke und Empfehlungen freizuschalten." }, { id: "add-tobacco", q: "Wie füge ich eine Tabakblendung hinzu?", path: "Startseite → Tabak → Tabak hinzufügen", a: "Verfolgen Sie Ihre Tabakblendungen mit Details wie Hersteller, Blendtyp, Menge und Lagerdaten. Verwenden Sie das Lagerprotokoll, um den Reifefortschritt zu registrieren." }, { id: "add-note", q: "Wie füge ich Notizen zu einem Element hinzu?", path: "Pfeifen/Tabak → Element auswählen → Bearbeiten → Notizen hinzufügen", a: "Klicken Sie auf eine Pfeife oder Tabak, um die Detailseite zu öffnen. Tippen Sie auf 'Bearbeiten' und fügen Sie Notizen im designierten Feld hinzu. Notizen helfen Ihnen, persönliche Vorlieben und Beobachtungen zu erinnern." }, { id: "view-insights", q: "Wie zeige ich Einblicke an?", path: "Startseite → Sammlungseinblicke", a: "Einblicke erscheinen auf Ihrer Startseite nach dem Hinzufügen von Elementen. Zeigen Sie Statistiken, Paarungsraster, Reifedashboards und Berichte an. Klicken Sie auf Reiter, um verschiedene Einblicke zu erkunden." }] },
        managingCollection: { title: "Verwalten Sie Ihre Sammlung", items: [{ id: "organize", q: "Wie organisiere ich meine Sammlung?", path: "Pfeifen/Tabak → Filter und Sortierung", a: "Verwenden Sie Filter, um nach Form, Blendtyp oder Fokus einzugrenzen. Sortieren Sie nach hinzugefügtem Datum, Wert oder Bewertung. Speichern Sie bevorzugte Filter für schnellen Zugriff." }, { id: "export", q: "Wie exportiere ich meine Daten?", path: "Startseite → Einblicke → Registerkarte Berichte", badge: "Premium", a: "Premium- und Pro-Benutzer können Sammlungsdaten als CSV oder PDF exportieren. Suchen Sie nach Export-Schaltflächen auf der Registerkarte Berichte unter Sammlungseinblicken." }, { id: "cellar-log", q: "Wie verfolge ich mein Lager?", path: "Tabak → Blendung auswählen → Lagerprotokoll", badge: "Premium", a: "Registrieren Sie, wann Tabak zu Ihrem Lager hinzugefügt oder daraus entfernt wird. Verfolgen Sie Mengen, Daten und Behältertypen. Zeigen Sie den Reiffortschritt im Reife-Dashboard an." }, { id: "smoking-log", q: "Wie registriere ich eine Rauchsitzung?", path: "Startseite → Einblicke → Protokollregisterkarte", badge: "Premium", a: "Verfolgen Sie, welche Pfeife Sie mit welchem Tabak geraucht haben. Registrieren Sie Datum, Anzahl der Schüsseln und Notizen. Diese Daten unterstützen Paarungsempfehlungen." }] },
        aiTools: { title: "KI-Werkzeuge", items: [{ id: "identify-pipe", q: "Wie erkenne ich eine Pfeife aus einem Foto?", path: "Startseite → Experte Tabakkonist → Erkennen", badge: "Pro", a: "Laden Sie Fotos Ihrer Pfeife hoch und die KI analysiert Markierungen, Form und Merkmale, um Hersteller, Modell und ungefähren Wert zu identifizieren." }, { id: "pairing-suggestions", q: "Wie erhalte ich Paarungsvorschläge?", path: "Startseite → Einblicke → Paarungsraster", badge: "Pro", a: "Die Paarungsmatrix generiert Kompatibilitätswerte für jede Pfeife-Tabak-Kombination. Zeigen Sie Empfehlungen auf Pfeifendetailseiten oder im Paarungsraster an." }, { id: "optimize-collection", q: "Wie optimiere ich meine Sammlung?", path: "Startseite → Experte Tabakkonist → Optimieren", badge: "Pro", a: "Der Sammlungsoptimierer analysiert Ihre Pfeifen und Tabake, um Spezialisierungen zu empfehlen, Lücken zu identifizieren und Ihren nächsten Kauf vorzuschlagen." }] },
        subscriptions: { title: "Abonnements", items: [{ id: "subscribe", q: "Wie funktionieren Abonnements?", path: "Profil → Abonnement", a: "PipeKeeper bietet kostenlose, Premium- und Pro-Stufen. Abonnieren Sie, um unbegrenzte Elemente, erweiterte Werkzeuge und KI-Funktionen freizuschalten. Preise anzeigen und Abonnements in Ihrem Profil verwalten." }, { id: "manage-subscription", q: "Wie verwalte ich mein Abonnement?", path: "Profil → Abonnement verwalten", iosPart: "iOS: Verwalten Sie über iOS-Einstellungen → [Ihr Name] → Abonnements → PipeKeeper", webPart: "Web/Android: Gehen Sie zu Profil → Abonnement verwalten, um Zahlung zu aktualisieren, Rechnungen anzuzeigen oder zu kündigen" }, { id: "cancel", q: "Wie kündige ich mein Abonnement?", path: "Profil → Abonnement verwalten", iosPart: "iOS: Öffnen Sie iOS-Einstellungen → [Ihr Name] → Abonnements → PipeKeeper → Abonnement kündigen", webPart: "Web/Android: Gehen Sie zu Profil → Abonnement verwalten → Abonnement kündigen", note: "Sie behalten den Zugriff bis zum Ende Ihres Abrechnungszeitraums." }] },
        troubleshooting: { title: "Fehlerbehebung", items: [{ id: "cant-login", q: "Ich kann mich nicht anmelden oder mein Code ist abgelaufen", path: "Anmeldebildschirm → Neuen Code anfordern", a: "Versuchen Sie sich erneut anzumelden: Das System sendet automatisch einen neuen Bestätigungscode. Überprüfen Sie Ihren Spam-Ordner oder besuchen Sie die Seite zur Verifizierungshilfe für detaillierte Anweisungen." }, { id: "missing-features", q: "Warum kann ich bestimmte Funktionen nicht sehen?", path: "Profil → Abonnement", a: "Einige Funktionen erfordern Premium- oder Pro-Zugriff. Überprüfen Sie Ihren Abonnementstatus im Profil. Kostenlose Benutzer haben Zugriff auf die Kernsammlung von bis zu 5 Pfeifen und 10 Tabakblendungen." }, { id: "sync-issues", q: "Meine Daten werden nicht synchronisiert", path: "Profil → Aktualisieren / Abmelden und Anmelden", a: "Versuchen Sie, Ihren Browser zu aktualisieren oder sich abzumelden und wieder anzumelden. Ihre Sammlung wird automatisch mit der Cloud synchronisiert, wenn Sie Änderungen vornehmen." }] }
      }
    },
    troubleshooting: {
      pageTitle: "Fehlerbehebung",
      pageSubtitle: "Häufige Probleme und Lösungen",
      navFAQ: "Häufig gestellte Fragen",
      navHowTo: "Anleitungen",
      sections: {
        tobaccoValuation: {
          title: "Tabakbewertung",
          items: [
            { id: "missing-value", q: "Warum fehlt der Wert meines Tabaks?", intro: "Der Wert erfordert entweder manuelle Eingabe (Premium) oder KI-Schätzung (Pro).", points: ["Kostenlose Benutzer sehen nur den Bestand", "Stellen Sie sicher, dass Sie die richtige Abonnementstufe haben", "Führen Sie die Bewertung nach dem Upgrade aus"] },
            { id: "low-confidence", q: "Warum zeigt meine Schätzung niedriges Vertrauen?", intro: "Niedriges Vertrauen bedeutet, dass begrenzte Marktdaten für diese Blendung gefunden wurden.", points: ["Es kann selten, eingestellt oder regional exklusiv sein", "Schätzungen mit niedrigem Vertrauen sollten als ungefähre Näherungen behandelt werden", "Erwägen Sie manuelle Bewertung für seltene Blendungen"] },
            { id: "locked-ai", q: "Warum ist die KI-Bewertung gesperrt?", intro: "Die KI-unterstützte Bewertung erfordert Pro.", points: ["Wenn Sie ein Premium-Abonnent sind, der sich vor dem 1. Februar 2026 registriert hat, haben Sie Zugriff auf Legacies", "Ansonsten aktualisieren Sie auf Pro, um KI-Funktionen freizuschalten"] },
            { id: "no-auto-update", q: "Warum aktualisiert sich der Wert nicht automatisch?", intro: "KI-Bewertungen werden on-demand generiert, um Credits und Leistung zu erhalten.", points: ["Klicken Sie auf 'KI-Bewertung ausführen', um Schätzungen zu aktualisieren", "Automatische geplante Aktualisierung kann in zukünftigen Pro-Updates hinzugefügt werden"] }
          ]
        }
      }
    }
  }
};

// Export for i18n system
export default helpContentFull;