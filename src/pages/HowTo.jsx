import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  BookOpen, Plus, Edit, Camera, Package, Archive, Sparkles, 
  Users, FileDown, MessageSquare, Target, Calendar, Info, AlertCircle
} from "lucide-react";
import { isAppleBuild } from "@/components/utils/appVariant";

export default function HowTo() {
  const [searchTerm, setSearchTerm] = useState("");

  const howToSections = [
    {
      id: "getting-started",
      icon: BookOpen,
      title: "Getting Started",
      color: "text-blue-400",
      guides: [
        {
          q: "How to install PipeKeeper on my phone",
          steps: [
            "For Web: Visit pipekeeper.app in your mobile browser and tap 'Add to Home Screen' (iOS Safari) or 'Add to Home screen' (Android Chrome)",
            "For iOS: Download the PipeKeeper app from the Apple App Store",
            "For Android: Download the PipeKeeper app from Google Play",
            "First-time setup: Confirm you are 21+ years old",
            "Accept the Terms of Service and Privacy Policy (one-time requirement)",
            "Create an account or log in",
            "Complete the optional onboarding tutorial to learn the basics"
          ]
        },
        {
          q: "How to complete the onboarding tutorial",
          steps: [
            "After creating your account, the tutorial will start automatically",
            "Step 1: Set up your smoking profile with preferences (blend types, strength, pipe size)",
            "Step 2: Add your first pipe to the collection",
            "Step 3: Add your first tobacco blend",
            "Step 4: Log your first smoking session",
            "Step 5: Explore AI-powered features",
            "You can skip the tutorial at any time or restart it from Home → Tutorial button"
          ]
        }
      ]
    },
    {
      id: "managing-pipes",
      icon: Plus,
      title: "Managing Your Pipe Collection",
      color: "text-amber-400",
      guides: [
        {
          q: "How to add a pipe to your collection",
          steps: [
            "Navigate to the Pipes tab",
            "Tap the + (plus) button in the top right",
            "Enter the pipe name (required - only field that is mandatory)",
            "Optionally fill in details: maker, shape, dimensions, materials, condition, value",
            "Add photos by tapping the camera icon",
            "Use AI Identification to auto-fill details from photos (Premium)",
            "Tap Save to add the pipe to your collection"
          ]
        },
        {
          q: "How to edit a pipe",
          steps: [
            "Go to Pipes tab and find the pipe you want to edit",
            "Tap on the pipe to open its detail page",
            "Tap the Edit button (pencil icon) in the top right",
            "Update any fields you want to change",
            "Tap Save to confirm changes"
          ]
        },
        {
          q: "How to use AI pipe identification",
          steps: [
            "Open the pipe detail page or create a new pipe",
            "Tap 'AI Identify Pipe' or the sparkles icon",
            "Upload clear photos showing: bowl stampings, overall shape, stem details",
            "The AI will analyze the images and suggest: maker, model, shape, estimated value",
            "Review the suggestions and tap 'Apply' to auto-fill the form",
            "Make any manual adjustments as needed",
            "Save the pipe"
          ]
        },
        {
          q: "How to add interchangeable bowls (Falcon, Gabotherm, etc.)",
          steps: [
            "Open the pipe detail page for your system pipe",
            "Scroll to the 'Interchangeable Bowls' section",
            "Tap 'Add Bowl'",
            "Enter bowl details: name, chamber dimensions, focus tags",
            "Each bowl will get its own break-in schedule and pairing recommendations",
            "Tap Save to add the bowl variant"
          ]
        },
        {
          q: "How to set pipe focus tags",
          steps: [
            "Open the pipe detail page",
            "Find the 'Focus' or 'Specialization' field",
            "Enter tags like: Virginia, English, Aromatic, VaPer, Latakia Blend",
            "For aromatics, specify intensity: Light Aromatics, Heavy Aromatics",
            "Use 'Utility' or 'Versatile' for pipes that handle multiple blend types",
            "Separate multiple tags with commas",
            "Save changes - AI pairings will respect these focus tags"
          ]
        },
        {
          q: "How to track pipe values and generate valuation reports",
          steps: [
            "Open the pipe detail page",
            "Enter Purchase Price and/or Estimated Value fields",
            "Use AI Value Lookup to get current market estimates (Premium)",
            "Go to Pipes page → Export → PDF Report",
            "Select 'Include valuations' option",
            "Download your insurance-ready valuation report with photos and details"
          ]
        }
      ]
    },
    {
      id: "managing-tobacco",
      icon: Package,
      title: "Managing Your Tobacco Collection",
      color: "text-green-400",
      guides: [
        {
          q: "How to add tobacco to your collection",
          steps: [
            "Navigate to the Tobacco tab",
            "Tap the + (plus) button",
            "Enter the blend name (required)",
            "Add manufacturer, blend type, strength, cut",
            "Enter inventory: tin quantities, bulk amounts, pouch counts",
            "Use AI Search to auto-fill details from web (Premium)",
            "Add photos and flavor notes",
            "Tap Save"
          ]
        },
        {
          q: "How to track open vs cellared tobacco",
          steps: [
            "Open the tobacco blend detail page",
            "Go to the 'Inventory' tab",
            "For Tins: Enter 'Tins Open' and 'Tins Cellared' separately",
            "For Bulk: Enter 'Bulk Open (oz)' and 'Bulk Cellared (oz)'",
            "For Pouches: Enter 'Pouches Open' and 'Pouches Cellared'",
            "Open Tobacco tab shows what's ready to smoke",
            "Cellared Tobacco tab shows aging inventory",
            "Save changes to update your inventory"
          ]
        },
        {
          q: "How to use the Cellaring Log (Premium)",
          steps: [
            "Open a tobacco blend detail page",
            "Go to the 'Cellared Tobacco' tab",
            "Tap 'Add Transaction'",
            "Select transaction type: Added or Removed",
            "Enter amount in ounces",
            "Choose container type: tin, jar, bulk, pouch",
            "If removing, select destination: open collection, exchanged, or discarded",
            "Add date and optional notes",
            "Save - the log tracks your cellar history with running totals"
          ]
        },
        {
          q: "How to bulk update multiple tobacco blends",
          steps: [
            "Go to Tobacco page",
            "Tap the 'Bulk Edit' or 'Quick Edit' button",
            "Select the blends you want to update (checkboxes)",
            "Choose the field to update: blend type, strength, aging potential, etc.",
            "Enter the new value that will apply to all selected blends",
            "Tap 'Update All' to apply changes",
            "Perfect for cleaning up data or standardizing categories"
          ]
        }
      ]
    },
    {
      id: "cellar-aging",
      icon: Archive,
      title: "Cellar Management & Aging",
      color: "text-purple-400",
      guides: [
        {
          q: "How to view your aging dashboard",
          steps: [
            "Go to Home page",
            "Find the 'Cellar Aging' or 'Aging Dashboard' section",
            "View all cellared tobacco blends organized by age",
            "Color coding shows aging status: not ready, aging, ready to enjoy",
            "Tap on any blend to see full aging details",
            "Check which blends are recommended for smoking based on aging potential",
            "Track progress toward optimal aging"
          ]
        },
        {
          q: "How to use aging recommendations",
          steps: [
            "Open a tobacco blend detail page",
            "Check the 'Aging Potential' field (Excellent, Good, Fair, or Poor)",
            "View the Cellar Log to see when tobacco was cellared",
            "The aging dashboard automatically calculates how long it's been aging",
            "Look for status badge showing current aging status",
            "Follow recommendations for when to start smoking (ready, keep aging, etc.)",
            "Premium feature helps optimize your cellaring decisions"
          ]
        },
        {
          q: "How to forecast when tobacco will run out",
          steps: [
            "Go to Tobacco detail page",
            "Check Open Tobacco tab to see current quantities",
            "View recent smoking logs to see usage frequency",
            "The system calculates estimated depletion dates based on your smoking habits",
            "Plan future purchases when inventory is forecasted to run low",
            "Use projections to decide which cellared tins to rotate into open stock"
          ]
        }
      ]
    },
    {
      id: "inventory-tracking",
      icon: Archive,
      title: "Smoking Log & Inventory",
      color: "text-purple-400",
      guides: [
        {
          q: `How to log a ${isAppleBuild ? 'usage session' : 'smoking session'}`,
          steps: [
            "Go to the Home page",
            `Find the '${isAppleBuild ? 'Usage Log' : 'Smoking Log'}' section`,
            "Tap 'Log Session' or the + button",
            "Select which pipe you used",
            "Select which tobacco blend",
            "Enter number of bowls used",
            "Optionally add session notes",
            `Add notes about the experience${!isAppleBuild ? ', flavor impressions, etc.' : ', conditions, etc.'}`,
            "Save - inventory will automatically reduce for open tobacco quantities (Premium)"
          ]
        },
        {
          q: "How inventory reduction works with usage logs",
          steps: [
            "When you log a usage session, the system calculates tobacco consumed",
            "Formula: (Chamber volume in oz) × (Number of bowls used)",
            "The system deducts from 'Open' quantities first",
            "Priority order: Open tins → Open bulk → Open pouches",
            "Cellared tobacco is never automatically reduced",
            "View the Open Tobacco tab to see real-time quantities",
            "Manual adjustments can be made in the Inventory tab anytime"
          ]
        },
        {
          q: "How to export inventory reports",
          steps: [
            "Go to Tobacco page",
            "Tap the Export button (download icon)",
            "Choose format: CSV (spreadsheet) or PDF (formatted report)",
            "Select what to include: all blends or filtered selection",
            "For CSV: Opens in Excel/Google Sheets for further analysis",
            "For PDF: Generates formatted report with photos and summaries",
            "Use for insurance documentation or personal records"
          ]
        },
        {
          q: "How to import tobacco data in bulk",
          steps: [
            "Prepare a CSV file with columns: name, manufacturer, blend_type, tin_quantity_oz, etc.",
            "Go to Home page and find 'Import' option",
            "Select 'Tobacco Import'",
            "Upload your CSV file or paste data",
            "Review the preview to ensure fields mapped correctly",
            "Tap 'Import' to add all blends at once",
            "Check the Tobacco page to verify all entries were created"
          ]
        }
      ]
    },
    {
      id: "ai-features",
      icon: Sparkles,
      title: "Using AI Features (Premium)",
      color: "text-pink-400",
      guides: [
        {
          q: "How to generate pipe-tobacco pairing recommendations",
          steps: [
            "Ensure you have at least one pipe and one tobacco blend in your collection",
            "Go to Home page and find 'AI Features' section",
            "Tap 'Generate Pairings' or go to AI Updates page",
            "The system will analyze all your pipes and tobaccos",
            "Pairing scores (0-10) are calculated based on: chamber size, blend type, pipe focus, your preferences",
            "View results on pipe detail pages: 'Top Tobacco Matches'",
            "View results on tobacco detail pages: 'Top Pipe Matches'",
            "Regenerate anytime your collection changes significantly"
          ]
        },
        {
          q: "How to use Collection Optimization",
          steps: [
            "Go to Home page → 'Collection Optimization' section",
            "Tap 'Analyze Collection' or 'Optimize'",
            "The AI will suggest pipe specializations and focus tags",
            "Review suggestions for each pipe (e.g., 'Dedicate to Virginia blends')",
            "Tap 'Apply All' to accept all recommendations, or apply individually",
            "The optimizer identifies gaps: missing pipe styles or tobacco types",
            "Use 'Undo' button if you want to revert changes"
          ]
        },
        {
          q: "How to generate a break-in schedule for a new pipe",
          steps: [
            "Open the pipe detail page for your new pipe",
            "Find the 'Break-in Schedule' section",
            "Tap 'Generate Schedule'",
            "The AI selects tobaccos from your collection suitable for each stage",
            "Schedule starts with mild, forgiving blends and progresses to your pipe's focus",
            "Each stage specifies: tobacco to use, number of bowls, tips",
            "As you smoke, mark bowls complete or log sessions as 'break-in'",
            "Smoking log entries marked as break-in automatically update the schedule"
          ]
        },
        {
          q: "How to use the Expert Tobacconist AI Chat",
          steps: [
            "Go to Home page and find 'Ask the Expert' or AI Tobacconist section",
            "Tap to open the chat interface",
            "Ask questions like: 'What pipe should I smoke this blend in?' or 'Recommend a tobacco for beginners'",
            "The AI has full access to your collection data",
            "It provides personalized recommendations based on what you own",
            "Use it for: pairing advice, pipe care tips, cellaring guidance, blend explanations",
            "Chat history is saved for future reference"
          ]
        },
        {
          q: "How to check when AI data needs updating",
          steps: [
            "Go to the AI Updates page from Home",
            "Check status indicators for each AI feature:",
            "• Green = Up to date",
            "• Yellow/Amber = Recommended to regenerate",
            "• Red = Outdated, regeneration needed",
            "Reasons for outdated data: added/removed pipes or tobacco, changed pipe focus, updated preferences",
            "Tap 'Regenerate' for each feature that needs updating",
            "All AI features can be undone if you're not happy with results"
          ]
        },
        {
          q: "How to track pipe condition and maintenance",
          steps: [
            "Open the pipe detail page",
            "Find the 'Condition Tracking' or 'Maintenance' section",
            "Add maintenance records: cleaning, restoration, repair, reaming, polishing",
            "Record date, description, cost (if applicable), and who performed the work",
            "Upload before/after photos for documentation",
            "Maintenance history helps establish collection value and care documentation"
          ]
        },
        {
          q: "How to log pipe maintenance work",
          steps: [
            "Open pipe detail page → Maintenance Log section",
            "Tap 'Add Entry' to log maintenance",
            "Select maintenance type: cleaning, restoration, repair, reaming, polishing, stem work",
            "Enter the date of work",
            "Describe what was done in detail",
            "Record cost if applicable",
            "Add notes: did it yourself or professional work?",
            "Upload before/after photos for before/after documentation",
            "Save to keep complete pipe history"
          ]
        },
        {
          q: "How to use the pipe rotation planner",
          steps: [
            "Log smoking sessions regularly to track pipe usage",
            "Go to Home page → find 'Pipe Rotation' or similar section",
            "The planner shows which pipes are rested and ready to smoke",
            "The system enforces 24-hour mandatory rest between sessions",
            "Log a session as break-in to track new pipe conditioning",
            "Tap on a pipe to see its rest status and recommended smoking schedule",
            "Use this to prevent overuse and burning out favorite pipes"
          ]
        }
      ]
    },
    {
      id: "community",
      icon: Users,
      title: "Community Features (Premium)",
      color: "text-cyan-400",
      guides: [
        {
          q: "How to make your profile public",
          steps: [
            "Go to Profile page",
            "Find 'Privacy Settings' section",
            "Toggle 'Make profile public' to ON",
            "Optionally enable 'Show location' to appear in location-based searches",
            "Add a bio, avatar, and social media links in the profile editor",
            "Choose what to display: hide values, hide inventory counts, hide collection sizes",
            "Save changes - your profile is now searchable in the Community"
          ]
        },
        {
          q: "How to follow other collectors",
          steps: [
            "Go to Community tab",
            "Search for users by name, location, or interests",
            "Tap on a profile to view their public collection",
            "Tap 'Follow' to add them to your followed users",
            "Their updates will appear in your Community feed",
            "Tap 'Unfollow' anytime to stop following"
          ]
        },
        {
          q: "How to comment on pipes or tobacco",
          steps: [
            "Find a public profile and view their collection",
            "Tap on a pipe or tobacco blend to see details",
            "Scroll to the Comments section at the bottom",
            "Enter your comment (be respectful!)",
            "Tap 'Post Comment'",
            "The owner will be notified of your comment",
            "You can delete your own comments anytime"
          ]
        },
        {
          q: "How to use direct messaging (Premium)",
          steps: [
            "Enable messaging in Profile → 'Enable instant messaging'",
            "Go to Community and find the user you want to message",
            "Tap 'Send Message' on their profile",
            "Type your message and send",
            "Messages appear in real-time - it's like a chat",
            "You can edit or delete sent messages",
            "Mark important messages as 'saved' for quick access later"
          ]
        },
        {
          q: "How to report inappropriate content",
          steps: [
            "Find the comment, profile, or message that violates rules",
            "Tap the '...' menu or 'Report' button",
            "Select reason: harassment, spam, inappropriate content, etc.",
            "Add details to help moderators review",
            "Tap 'Submit Report'",
            "The report is reviewed promptly",
            "You can also block users to prevent future interactions"
          ]
        }
      ]
    },
    {
      id: "account-management",
      icon: FileDown,
      title: "Account & Data Management",
      color: "text-orange-400",
      guides: [
        {
          q: "How to manage your subscription",
          steps: [
            "iOS users: Open Settings → [Your Name] → Subscriptions → PipeKeeper",
            "Web/Android users: Go to Profile → 'Manage Subscription'",
            "View current plan and billing cycle",
            "Change plan (monthly ↔ yearly) or cancel subscription",
            "Update payment method",
            "View invoice history",
            "Changes take effect at the end of current billing period"
          ]
        },
        {
          q: "How to export all your data",
          steps: [
            "Go to Pipes page → tap Export → CSV to download pipe data",
            "Go to Tobacco page → tap Export → CSV to download tobacco data",
            "For complete backup, export both pipes and tobacco",
            "Data downloads as spreadsheet files you can open in Excel/Sheets",
            "Use for backup, sharing with insurance, or moving to another system",
            "Premium users can also generate PDF reports with photos"
          ]
        },
        {
          q: "How to update your preferences and profile",
          steps: [
            "Go to Profile page",
            "Update 'Smoking Preferences': blend types, strength, pipe size, chamber volume",
            "These preferences influence AI recommendations",
            "Add personal info: bio, location (optional), social links",
            "Upload a profile avatar photo",
            "Set privacy options: public profile, show location, hide values",
            "Save changes - AI features will adapt to your new preferences"
          ]
        }
      ]
    }
  ];

  const filteredSections = howToSections.map(section => ({
    ...section,
    guides: section.guides.filter(
      guide =>
        guide.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guide.steps.some(step => step.toLowerCase().includes(searchTerm.toLowerCase())) ||
        section.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.guides.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">How To Use PipeKeeper</h1>
          <p className="text-[#E0D8C8]/80 mb-4">Step-by-step guides for all features</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <a href="/FAQ">
              <button className="px-4 py-2 border border-gray-300 text-[#1a2c42] bg-white rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                <Info className="w-4 h-4" />
                FAQ
              </button>
            </a>
            <a href="/Troubleshooting">
              <button className="px-4 py-2 border border-gray-300 text-[#1a2c42] bg-white rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Troubleshooting
              </button>
            </a>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search how-to guides..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-[#1a2c42] placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {filteredSections.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-[#1a2c42]/80">No guides found. Try a different search term.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredSections.map((section) => {
              const IconComponent = section.icon;
              return (
                <Card key={section.id} className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#1a2c42]">
                      <IconComponent className={`w-6 h-6 ${section.color}`} />
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {section.guides.map((guide, idx) => (
                        <AccordionItem key={idx} value={`guide-${idx}`} className="border-[#8b3a3a]/20">
                          <AccordionTrigger className="text-left text-[#1a2c42] hover:text-blue-600">
                            {guide.q}
                          </AccordionTrigger>
                          <AccordionContent>
                            <ol className="list-decimal list-inside space-y-2 text-[#1a2c42]/80 leading-relaxed">
                              {guide.steps.map((step, stepIdx) => (
                                <li key={stepIdx} className="pl-2">{step}</li>
                              ))}
                            </ol>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 p-6 bg-white border border-gray-200 rounded-2xl text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Need More Help?</h2>
          <p className="text-gray-700 mb-4">
            Check the <a href="/FAQ" className="text-blue-600 hover:underline">FAQ</a> for general information or{" "}
            <a href="/Troubleshooting" className="text-blue-600 hover:underline">Troubleshooting</a> if something isn't working.
          </p>
        </div>
      </div>
    </div>
  );
}