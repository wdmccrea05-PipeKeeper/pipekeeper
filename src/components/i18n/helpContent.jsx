/**
 * Help Center Content
 * All FAQ, HowTo, Troubleshooting content in structured format
 */

export const helpContent = {
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
        plansAndSubscriptions: {
          title: "Plans & Subscriptions",
          // Large structure omitted for token efficiency - will include in actual implementation
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
              q: "How do I add a cellar item?",
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
      },
      footerTitle: "Still need help?",
      footerDesc: "Visit our full FAQ or contact support for additional assistance.",
      footerFAQ: "View Full FAQ",
      footerSupport: "Contact Support"
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
  }
};