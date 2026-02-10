import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function HowTo() {
  const { t } = useTranslation();
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (id) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 32 }}>
      <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const Q = ({ id, q, children }) => (
    <Card className="bg-white border-gray-200 overflow-hidden">
      <button
        onClick={() => toggleItem(id)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 pr-4">{q}</span>
        <ChevronDown 
          className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${openItems[id] ? 'rotate-180' : ''}`}
        />
      </button>
      {openItems[id] && (
        <CardContent className="px-4 pb-4 pt-0 text-gray-700 leading-relaxed space-y-3">
          {children}
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A]">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 16px" }}>
        <Link to={createPageUrl('FAQFull')} className="inline-flex items-center gap-2 text-[#8b3a3a] hover:text-[#a94747] mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to FAQ
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">How-To Guides</h1>
          <p className="text-[#E0D8C8]/80">Step-by-step instructions for common PipeKeeper tasks</p>
        </div>

        <Section title="Adding & Managing Pipes">
          <Q id="add-pipe-basic" q="How do I add a basic pipe entry?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Click "Pipes" in the navigation</li>
              <li>Click "Add Pipe" button</li>
              <li>Enter required field: pipe name</li>
              <li>Fill optional details: maker, shape, material, country of origin</li>
              <li>Click "Save" to create the pipe</li>
            </ol>
          </Q>

          <Q id="add-pipe-photos" q="How do I add photos to a pipe?">
            <p>When creating or editing a pipe:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Scroll to the "Photos" section</li>
              <li>Click "Upload Photo" or drag images</li>
              <li>Select photos from your device (JPG, PNG)</li>
              <li>Photos appear instantly in the gallery</li>
              <li>Reorder by dragging or remove with the X icon</li>
              <li>Click "Save" to persist changes</li>
            </ol>
          </Q>

          <Q id="measure-pipe" q="How do I measure pipe dimensions?">
            <p>Accurate measurements help with valuation and identification:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Use a digital caliper or ruler (metric preferred)</li>
              <li>Length: Overall pipe length in mm</li>
              <li>Bowl diameter: Inside chamber width in mm</li>
              <li>Bowl depth: Chamber depth in mm</li>
              <li>Weight: Dry pipe weight in grams</li>
              <li>Enter values in the "Measurements" section</li>
            </ol>
          </Q>

          <Q id="update-pipe" q="How do I update pipe information?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Click on any pipe in your collection</li>
              <li>Click the "Edit" button</li>
              <li>Modify any fields</li>
              <li>Click "Save Changes"</li>
              <li>Changes appear immediately</li>
            </ol>
          </Q>

          <Q id="mark-favorite" q="How do I mark a pipe as favorite?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open the pipe detail page</li>
              <li>Click the heart icon (♥)</li>
              <li>The icon fills with color when marked as favorite</li>
              <li>Favorites appear on your Home page</li>
            </ol>
          </Q>
        </Section>

        <Section title="Managing Tobacco">
          <Q id="add-tobacco" q="How do I add a tobacco blend?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Click "Tobacco" in the navigation</li>
              <li>Click "Add Blend" button</li>
              <li>Enter blend name (required)</li>
              <li>Add manufacturer, blend type, strength</li>
              <li>Set initial quantity and container type</li>
              <li>Click "Save" to create</li>
            </ol>
          </Q>

          <Q id="track-inventory" q="How do I track tobacco inventory?">
            <p>Keep your inventory current:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Open a tobacco blend</li>
              <li>Scroll to "Inventory" section</li>
              <li>Update open quantity when you smoke from a tin/jar</li>
              <li>Mark tins as "cellared" to track aging</li>
              <li>Log cellar transactions with dates and amounts</li>
              <li>Changes update collection statistics immediately</li>
            </ol>
          </Q>

          <Q id="cellar-tobacco" q="How do I cellar tobacco for aging?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open the tobacco blend detail page</li>
              <li>Find the "Cellar" section</li>
              <li>Click "Add to Cellar"</li>
              <li>Select container type (tin, jar, pouch, bulk)</li>
              <li>Enter amount in ounces</li>
              <li>Set cellaring date</li>
              <li>Click "Cellar" - it's now tracked separately from open inventory</li>
            </ol>
          </Q>

          <Q id="remove-cellar" q="How do I remove tobacco from the cellar?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open the tobacco detail page</li>
              <li>Find "Cellar Log" section</li>
              <li>Click "Remove from Cellar"</li>
              <li>Select where it went: open collection, exchanged, or discarded</li>
              <li>Enter amount removed</li>
              <li>Confirm - open inventory updates automatically</li>
            </ol>
          </Q>
        </Section>

        <Section title="Logging Sessions">
          <Q id="log-smoking" q="How do I log a smoking session?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Click "Home" or open a pipe detail page</li>
              <li>Find "Smoking Log" section</li>
              <li>Click "Log Session"</li>
              <li>Select date, pipe, and tobacco blend</li>
              <li>Enter number of bowls smoked</li>
              <li>Add optional notes about flavor and performance</li>
              <li>Click "Save" - it updates statistics</li>
            </ol>
          </Q>

          <Q id="break-in-tracking" q="How do I track pipe break-in progress?">
            <p>PipeKeeper generates personalized break-in schedules:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Open a new pipe detail page</li>
              <li>Scroll to "Break-In Schedule"</li>
              <li>Review recommended tobacco progression</li>
              <li>Log each break-in session in the smoking log</li>
              <li>Mark sessions as "break-in" when logging</li>
              <li>Progress updates automatically as you log sessions</li>
            </ol>
          </Q>
        </Section>

        <Section title="Collections & Import">
          <Q id="bulk-import" q="How do I import a collection from CSV?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to Home page, scroll to "Bulk Import" card</li>
              <li>Click "Import from CSV/Excel"</li>
              <li>Prepare file with columns: name, maker, shape, material, condition</li>
              <li>Upload CSV or Excel file</li>
              <li>Review imported entries</li>
              <li>Click "Confirm Import" to add to collection</li>
              <li>Edit any entries to complete details</li>
            </ol>
          </Q>

          <Q id="export-collection" q="How do I export my collection?">
            <p>Premium feature - backup and share your data:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Navigate to Pipes or Tobacco page</li>
              <li>Look for "Export" button</li>
              <li>Choose format: CSV or PDF report</li>
              <li>File downloads to your device</li>
              <li>CSV can be re-imported or edited in Excel</li>
              <li>PDF includes photos, values, and statistics</li>
            </ol>
          </Q>
        </Section>

        <Section title="Using AI Features">
          <Q id="get-pairing-suggestions" q="How do I get pipe-tobacco pairing suggestions?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Add at least one pipe and one tobacco to your collection</li>
              <li>Go to Home > "Expert Tobacconist" section (Premium feature)</li>
              <li>Click "Pairing Matrix" tab</li>
              <li>View AI-generated pipe-tobacco combinations scored by compatibility</li>
              <li>Try recommended pairings and log your experience</li>
              <li>Matrix updates as you add new items</li>
            </ol>
          </Q>

          <Q id="ask-tobacconist" q="How do I ask the Expert Tobacconist a question?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to Home > "Expert Tobacconist" (Premium)</li>
              <li>Click the chat tab</li>
              <li>Type your question about blends, pipes, pairings, or strategy</li>
              <li>The AI reads your collection and provides personalized advice</li>
              <li>Ask follow-ups to refine recommendations</li>
              <li>Save helpful responses for later</li>
            </ol>
          </Q>

          <Q id="identify-pipe" q="How do I use AI pipe identification?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to Home > "AI Pipe Identifier" (Premium)</li>
              <li>Upload clear photos of your pipe (bowl, stem, any markings)</li>
              <li>AI analyzes shape, size, material, and stampings</li>
              <li>Get suggestions for maker, model, and era</li>
              <li>Compare against your collection for matches</li>
              <li>AI is a helpful guide—verify with forums or experts</li>
            </ol>
          </Q>
        </Section>

        <Section title="Profile & Settings">
          <Q id="update-profile" q="How do I update my profile?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Click "Profile" in the navigation</li>
              <li>Click "Edit Profile"</li>
              <li>Update display name, bio, location (optional)</li>
              <li>Add smoking preferences (strength, size, etc.)</li>
              <li>Click "Save Changes"</li>
            </ol>
          </Q>

          <Q id="public-profile" q="How do I make my collection public?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to Profile > Settings</li>
              <li>Toggle "Make profile public"</li>
              <li>Choose which details to show (values, counts, specific items)</li>
              <li>Share your profile link with other collectors</li>
              <li>You control privacy for each field</li>
            </ol>
          </Q>

          <Q id="change-language" q="How do I change the app language?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Look for language selector in the top navigation</li>
              <li>Click to see available languages (EN, ES, FR, DE, etc.)</li>
              <li>Select your preferred language</li>
              <li>UI switches immediately and preference is saved</li>
            </ol>
          </Q>
        </Section>
      </div>
    </div>
  );
}