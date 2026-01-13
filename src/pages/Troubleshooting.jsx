import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RefreshCw, AlertCircle, Sparkles, Tags, Target, Info } from "lucide-react";

export default function TroubleshootingPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const troubleshootingTopics = [
    {
      id: "refresh",
      icon: RefreshCw,
      title: "Page Refresh & Caching Issues",
      color: "text-blue-400",
      questions: [
        {
          q: "Changes aren't appearing after I update something",
          a: "Try a hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac). This bypasses your browser cache and loads fresh data."
        },
        {
          q: "New features or cards are missing",
          a: "Open the app in an incognito/private window to completely bypass cache. If it appears there, clear your browser cache for this site."
        },
        {
          q: "Data seems outdated or stale",
          a: "Navigate away from the page and back, or use a hard refresh. The app caches data for performance but should auto-refresh when you make changes."
        },
        {
          q: "App is showing old version after an update",
          a: "Clear your browser cache completely, or use Ctrl+Shift+Delete to open cache clearing options. Make sure to clear cached images and files."
        }
      ]
    },
    {
      id: "ai",
      icon: Sparkles,
      title: "AI Features & Generation",
      color: "text-purple-400",
      questions: [
        {
          q: "Why do I need to regenerate pairings?",
          a: "Pairings become outdated when you add/remove pipes or blends, or update pipe focus. The AI Updates page shows when regeneration is recommended."
        },
        {
          q: "What does 'out of date' mean on AI Updates?",
          a: "Your collection has changed since the AI last analyzed it. Regenerating ensures recommendations reflect your current pipes and tobacco."
        },
        {
          q: "Can I undo AI regenerations?",
          a: "Yes! Each AI feature (pairings, optimization) has an Undo button that reverts to the previous version. You can only undo once - it goes back one step."
        },
        {
          q: "How does tobacco-pipe matching work?",
          a: "The AI considers pipe focus, bowl size, chamber volume, and your preferences to score each tobacco for compatibility (0-10 scale)."
        },
        {
          q: "What if AI recommendations don't match my preferences?",
          a: "Update your User Profile with preferred blend types and strength preferences. Also ensure your pipe focus tags accurately describe each pipe's purpose."
        }
      ]
    },
    {
      id: "blend-types",
      icon: Tags,
      title: "Tobacco Blend Classification",
      color: "text-amber-400",
      questions: [
        {
          q: "What's the difference between English and English Aromatic?",
          a: "English blends are Latakia-forward with no toppings. English Aromatic has Latakia but includes light casing/topping - a middle ground."
        },
        {
          q: "When should I use Virginia/Perique vs VaPer?",
          a: "Virginia/Perique is the standard term for blends with Virginia base and Perique condiment. VaPer is just shorthand for the same thing."
        },
        {
          q: "How do I classify a complex blend with many tobaccos?",
          a: "Choose the category based on the dominant characteristic. If it has Latakia, it's likely English or Balkan. If heavily topped, it's Aromatic."
        },
        {
          q: "What's a 'Codger Blend'?",
          a: "Traditional American OTC (over-the-counter) blends, usually Burley-based with light toppings. Examples: Carter Hall, Prince Albert."
        },
        {
          q: "Can I reclassify blends automatically?",
          a: "Yes! Go to AI Updates and click 'Reclassify Blends' to have AI analyze and update your blends to the most accurate categories."
        },
        {
          q: "What if a blend doesn't fit any category?",
          a: "Use 'Other' for experimental or unique blends. Add detailed notes in the description to remember what makes it special."
        }
      ]
    },
    {
      id: "specialization",
      icon: Target,
      title: "Pipe Focus & Specialization",
      color: "text-green-400",
      questions: [
        {
          q: "How should I tag my pipe's focus?",
          a: "Be specific! Use tags like 'Virginia', 'English', 'Aromatics', 'VaPer', or 'Latakia Blend'. You can add intensity like 'Heavy Aromatics' or 'Light Aromatics'."
        },
        {
          q: "Should I dedicate pipes to specific blends?",
          a: "Recommended for strongly flavored blends (Lakeland, heavy aromatics, Latakia). Virginias and VaPers can share pipes more easily."
        },
        {
          q: "What does 'Utility' or 'Versatile' mean?",
          a: "These tags tell the AI this pipe can handle multiple blend types. Good for rotation pipes that you use for various tobaccos."
        },
        {
          q: "Can a pipe have multiple focus tags?",
          a: "Yes! Add multiple tags separated by commas. Example: 'English, Balkan, Latakia Blend' for a dedicated Latakia pipe."
        },
        {
          q: "How does focus affect pairing scores?",
          a: "The AI gives higher scores to blends that match your focus tags. Aromatic-only pipes get 0 score for non-aromatics and vice versa."
        },
        {
          q: "What if I don't know what to focus my pipe on?",
          a: "Use Collection Optimization on the Home page - AI will suggest ideal specializations based on your collection balance."
        }
      ]
    },
    {
      id: "functions",
      icon: AlertCircle,
      title: "General App Functions",
      color: "text-red-400",
      questions: [
        {
          q: "How do I add photos to pipes or tobacco?",
          a: "Click the camera icon or 'Add Photo' button on detail pages. You can upload multiple photos per item."
        },
        {
          q: "Can I export my collection data?",
          a: "Yes! Look for export buttons on Pipes and Tobacco pages to download your collection as a spreadsheet."
        },
        {
          q: "How do I track smoking sessions?",
          a: "Use the Smoking Log on your Home page. Record which pipe and blend you smoked to track usage and build history."
        },
        {
          q: "What's the difference between cellared and open tobacco?",
          a: "Cellared = sealed/aging for future. Open = currently smoking. Track both to manage your inventory accurately."
        },
        {
          q: "How do I add interchangeable bowls?",
          a: "On the pipe detail page, find the 'Interchangeable Bowls' section. Great for Falcon, Gabotherm, and other systems."
        },
        {
          q: "Can I mark pipes or blends as favorites?",
          a: "Yes! Click the star/heart icon on any pipe or blend to mark it as a favorite for quick access."
        }
      ]
    }
  ];

  const filteredTopics = troubleshootingTopics.map(topic => ({
    ...topic,
    questions: topic.questions.filter(
      item =>
        item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.a.toLowerCase().includes(searchTerm.toLowerCase()) ||
        topic.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(topic => topic.questions.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#e8d5b7] mb-2">Troubleshooting Guide</h1>
          <p className="text-[#e8d5b7]/70">Common questions and solutions for PipeKeeper features</p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search troubleshooting topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[#243548] border border-[#8b3a3a]/40 text-[#e8d5b7] placeholder-[#e8d5b7]/50 focus:outline-none focus:border-[#8b3a3a]"
          />
        </div>

        {filteredTopics.length === 0 ? (
          <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
            <CardContent className="p-8 text-center">
              <Info className="w-12 h-12 mx-auto mb-4 text-[#e8d5b7]/50" />
              <p className="text-[#e8d5b7]/70">No results found. Try a different search term.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredTopics.map((topic) => {
              const IconComponent = topic.icon;
              return (
                <Card key={topic.id} className="border-[#8b3a3a]/40 bg-[#243548]/95">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#e8d5b7]">
                      <IconComponent className={`w-6 h-6 ${topic.color}`} />
                      {topic.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {topic.questions.map((item, idx) => (
                        <AccordionItem key={idx} value={`item-${idx}`} className="border-[#8b3a3a]/20">
                          <AccordionTrigger className="text-left text-[#e8d5b7] hover:text-[#d1a761]">
                            {item.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-[#e8d5b7]/80 leading-relaxed">
                            {item.a}
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

        <div className="mt-8 p-6 bg-[#243548]/60 border border-[#8b3a3a]/40 rounded-2xl text-center">
          <h2 className="text-xl font-semibold text-[#e8d5b7] mb-2">Still Need Help?</h2>
          <p className="text-[#e8d5b7]/70 mb-4">
            Check out our comprehensive <a href="/FAQ" className="text-[#d1a761] hover:underline">FAQ</a> or{" "}
            <a href="/Support" className="text-[#d1a761] hover:underline">contact support</a>.
          </p>
        </div>
      </div>
    </div>
  );
}