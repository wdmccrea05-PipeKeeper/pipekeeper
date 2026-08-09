import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import TutorialSystemPreview from "@/components/onboarding/TutorialSystem";
import { ChevronDown, Wrench, BookOpen, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function FAQFull() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState({});
  const [showTutorial, setShowTutorial] = useState(false);

  const toggleItem = (id) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const Section = ({ title, children }) => (
    <div className="mb-10">
      <h2 className="mb-4 text-2xl font-bold text-[#F5F1E7]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const Q = ({ id, q, children }) => (
    <Card className="overflow-hidden">
      <button
        onClick={() => toggleItem(id)}
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-[rgba(255,255,255,0.03)] transition-colors"
      >
        <span className="font-semibold text-[#F5F1E7] pr-4">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#D8C7A6]/80 flex-shrink-0 transition-transform ${openItems[id] ? "rotate-180" : ""}`}
        />
      </button>
      {openItems[id] && (
        <CardContent className="px-5 pb-5 pt-0 text-[#D8C7A6]/90 leading-relaxed">
          {children}
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(78,48,24,0.18),transparent_24%),linear-gradient(180deg,#0d0806_0%,#160f0b_50%,#0b0705_100%)]">
      <div className="mx-auto max-w-[980px] px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-[#F5F1E7]">{t("helpCenter.howToTitle")}</h1>
          <p className="mb-4 text-[#D8C7A6]/80">{t("helpCenter.howToSubtitle")}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link to={createPageUrl("HowTo")}>
              <Button variant="outline" className="border-[rgba(140,105,65,0.35)] bg-[rgba(28,21,16,0.72)] text-[#F5F1E7] hover:bg-[rgba(163,92,92,0.12)]">
                <BookOpen className="mr-2 h-4 w-4" />
                {t("help.howTo", "How-To")}
              </Button>
            </Link>
            <Link to={createPageUrl("TroubleshootingFull")}>
              <Button variant="outline" className="border-[rgba(140,105,65,0.35)] bg-[rgba(28,21,16,0.72)] text-[#F5F1E7] hover:bg-[rgba(163,92,92,0.12)]">
                <Wrench className="mr-2 h-4 w-4" />
                {t("help.troubleshooting", "Troubleshooting")}
              </Button>
            </Link>
            <Button 
              onClick={() => setShowTutorial(true)}
              className="border-[rgba(180,140,75,0.35)] bg-[rgba(58,40,22,0.72)] text-[#F5F1E7] hover:bg-[rgba(180,140,75,0.2)]"
              variant="outline"
            >
              <Play className="mr-2 h-4 w-4" />
              {t("help.launchTutorial", "Launch Tutorial")}
            </Button>
          </div>
        </div>

        <Section title={t("helpCenter.topicGeneral")}>
          <Q id="verification-help" q={t("verificationHelp.pageTitle")}>
            <div className="space-y-3">
              <p>{t("verificationHelp.expiredDesc")}</p>
              <div className="rounded-xl border border-[rgba(140,105,65,0.25)] bg-[rgba(28,21,16,0.72)] p-3">
                <p className="mb-2 font-semibold text-[#F5F1E7]">{t("verificationHelp.option1Title")}</p>
                <p className="text-sm text-[#D8C7A6]/85">{t("verificationHelp.option1Desc")}</p>
              </div>
            </div>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicGettingStarted")}>
          <Q id="getting-started" q={t("help.gettingStarted")}>
            <p>{t("helpCenter.gettingStartedDesc")}</p>
          </Q>
          <Q id="what-is-pipekeeper" q={t("faqExtended.whatIsApp")}>
            <p>{t("faqExtended.whatIsAppAnswer")}</p>
          </Q>
          <Q id="what-can-do" q={t("faqExtended.whatCanDo")}>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("faqExtended.whatCanDoList1")}</li>
              <li>{t("faqExtended.whatCanDoList2")}</li>
              <li>{t("faqExtended.whatCanDoList3")}</li>
              <li>{t("faqExtended.whatCanDoList4")}</li>
              <li>{t("faqExtended.whatCanDoList5")}</li>
            </ul>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicFieldDefinitions")}>
          <Q id="field-definitions" q={t("help.fieldDefinitions")}>
            <p>{t("helpCenter.fieldDefinitionsDesc")}</p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicTobaccoValuation")}>
          <Q id="tobacco-valuation" q={t("help.tobaccoValuation")}>
            <p>{t("helpCenter.tobaccoValuationDesc")}</p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicFeaturesAndTools")}>
          <Q id="features-ai" q={t("help.aiFeatures")}>
            <p>{t("helpCenter.aiDesc")}</p>
          </Q>

          <Q id="subscription-tiers" q={t("faqFull.subscriptionTiersQuestion")}>
            <div className="space-y-4">
              <div className="rounded-xl border border-[rgba(140,105,65,0.25)] bg-[rgba(28,21,16,0.72)] p-4">
                <h4 className="mb-2 font-semibold text-[#F5F1E7]">{t("faqFull.freeTier")}</h4>
                <ul className="ml-4 list-disc space-y-1 text-[#D8C7A6]/90">
                  <li>{t("faqFull.freeTrial7Days")}</li>
                  <li>{t("faqFull.upTo5Pipes")}</li>
                  <li>{t("faqFull.upTo10Tobacco")}</li>
                  <li>{t("faqFull.basicCollection")}</li>
                  <li>{t("faqFull.photoUploads")}</li>
                </ul>
              </div>

              <div className="rounded-xl border border-[rgba(180,140,75,0.32)] bg-[rgba(58,40,22,0.72)] p-4">
                <h4 className="mb-2 font-semibold text-[#F5F1E7]">{t("faqFull.proTier")}</h4>
                <ul className="ml-4 list-disc space-y-1 text-[#D8C7A6]/90">
                  <li>{t("faqFull.unlimitedPipesTobacco")}</li>
                  <li>{t("faqFull.aiMatching")}</li>
                  <li>{t("faqFull.pairingMatrix")}</li>
                  <li>{t("faqFull.smokingLog")}</li>
                  <li>{t("faqFull.collectionInsights")}</li>
                  <li>{t("faqFull.exportReports")}</li>
                  <li>{t("faqFull.publicProfile")}</li>
                  <li>{t("faqFull.breakInSchedules")}</li>
                  <li>{t("faqFull.aiPipeIdentification")}</li>
                  <li>{t("faqFull.marketValueLookup")}</li>
                  <li>{t("faqFull.geometryAnalysis")}</li>
                  <li>{t("faqFull.tobaccoAgingProjections")}</li>
                  <li>{t("faqFull.advancedValuation")}</li>
                  <li>{t("faqFull.prioritySupport")}</li>
                </ul>
              </div>

              <p className="mt-4 text-sm text-[#D8C7A6]/75">
                {t("faqFull.fullFeatureDescription")}: {" "}
                <a href="https://www.pipekeeperapp.com/features" target="_blank" rel="noopener noreferrer" className="text-[#D8C7A6] underline decoration-[rgba(163,92,92,0.6)] underline-offset-2 hover:text-[#F5F1E7]">
                  pipekeeperapp.com/features
                </a>
              </p>
            </div>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicAccountsAndData")}>
          <Q id="account-security" q={t("help.accountSecurity")}>
            <p>{t("helpCenter.accountSecurityDesc")}</p>
          </Q>
          <Q id="data-privacy" q={t("help.dataPrivacy")}>
            <p>{t("helpCenter.dataPrivacyDesc")}</p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicPlansAndSubscriptions")}>
          <Q id="tiers" q={t("faqExtended.whatAreTiers")}>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>{t("subscription.free")}:</strong> {t("faqExtended.freeTierDesc")}</li>
              <li><strong>{t("subscription.pro")}:</strong> {t("faqExtended.proTierDesc", { date: "2026" })}</li>
            </ul>
            <p className="mt-3 text-sm text-[#D8C7A6]/75">
              {t("faqExtended.legacySubscriberNote", { date: "2026", defaultValue: "Founding subscribers have grandfathered access to all Pro features." })}
            </p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicAI")}>
          <Q id="ai-accuracy" q={t("help.aiAccuracy")}>
            <p>{t("helpCenter.aiAccuracyDesc")}</p>
          </Q>
          <Q id="ai-how-it-works" q={t("help.aiHowItWorks")}>
            <p>{t("helpCenter.aiHowItWorksDesc")}</p>
          </Q>
          <Q id="ai-regenerate" q={t("help.aiRegenerate")}>
            <p>{t("helpCenter.aiRegenerateDesc")}</p>
          </Q>
        </Section>

        <Section title="CigarKeeper">
          <Q id="cigarkeeper-what" q="What is CigarKeeper?">
            <p>CigarKeeper is a dedicated module for tracking your cigar collection, managing humidors, logging smoking sessions, and getting AI-powered insights and recommendations. It works alongside PipeKeeper and WhiskeyKeeper as part of the CollectionKeeper suite.</p>
          </Q>
          <Q id="cigarkeeper-free-vs-pro" q="What's included in the free vs. pro CigarKeeper plan?">
            <div className="space-y-3">
              <div className="rounded-xl border border-[rgba(140,105,65,0.25)] bg-[rgba(28,21,16,0.72)] p-4">
                <h4 className="mb-2 font-semibold text-[#F5F1E7]">Free Tier</h4>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Up to 10 cigars in your collection</li>
                  <li>1 humidor with maintenance alerts</li>
                  <li>Session logging (unlimited)</li>
                  <li>Basic collection view and search</li>
                </ul>
              </div>
              <div className="rounded-xl border border-[rgba(180,140,75,0.32)] bg-[rgba(58,40,22,0.72)] p-4">
                <h4 className="mb-2 font-semibold text-[#F5F1E7]">Pro Tier</h4>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Unlimited cigars and humidors</li>
                  <li>Curator AI recommendations</li>
                  <li>Collection insights and analytics</li>
                  <li>Aging readiness and value tracking</li>
                  <li>Advanced session analytics</li>
                  <li>Export reports</li>
                </ul>
              </div>
              <p className="text-sm text-[#D8C7A6]/75">You can start using CigarKeeper on the free tier immediately — no payment required.</p>
            </div>
          </Q>
          <Q id="cigarkeeper-humidor" q="How do humidor maintenance alerts work?">
            <p>When you set up a humidor you can specify how often humidity should be checked and when humidity aids should be replaced. CigarKeeper tracks these intervals and shows alerts on the CigarKeeper home page when a check or replacement is overdue or coming up within 3 days. Log a maintenance event to reset the timer.</p>
          </Q>
          <Q id="cigarkeeper-sessions" q="Can I log sessions for cigars not in my collection?">
            <p>Yes. When logging a session, toggle <strong>Smoked outside my collection</strong> to record a cigar you tried elsewhere. You can capture the brand, line, vitola, tasting notes, and ratings — and optionally add it to your wishlist afterward.</p>
          </Q>
          <Q id="cigarkeeper-onboarding" q="How do I get started with CigarKeeper?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Enable CigarKeeper from your Profile → Module Settings, or select it during initial onboarding.</li>
              <li>The CigarKeeper onboarding wizard will walk you through adding your first cigar and setting preferences.</li>
              <li>Add a humidor to organize your collection and enable maintenance tracking.</li>
              <li>Start logging smoking sessions to build your history.</li>
            </ol>
          </Q>
        </Section>

        <Section title="Curator Chat">
          <Q id="curator-chat-overview" q="What can I ask the Curator?">
            <p>The Curator is an AI advisor that understands your entire collection — pipes, blends, bottles, and session history. You can ask it:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>"Which pipe should I reassign?" — identifies pipes whose real usage diverges from their focus.</li>
              <li>"What is my most redundant pipe?" — finds crowded shape lanes with low usage.</li>
              <li>"What should I smoke tonight?" — generates a curated pipe + blend pairing.</li>
              <li>"What's the biggest gap in my collection?" — identifies missing blend families or styles.</li>
              <li>"Explain this pairing" — rationale for why a pipe and blend work together.</li>
            </ul>
          </Q>
          <Q id="curator-follow-ups" q="How do I follow up in Curator conversations?">
            <p className="mb-2">After the Curator gives a recommendation, you can ask natural follow-ups:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Next best option:</strong> Ask "what comes next?", "and then?", or "next candidate" to explore ranked alternatives without losing the original context.</li>
              <li><strong>Apply a constraint:</strong> Say "I want to keep it non-aromatic" or "I prefer English blends only". The Curator will re-evaluate whether the recommendation still holds given your constraint.</li>
              <li><strong>Correct something:</strong> If the Curator misunderstood your collection, say "actually, I use it for..." The Curator will flag the discrepancy and adjust future recommendations.</li>
            </ul>
          </Q>
          <Q id="curator-confidence" q="What do confidence levels mean in Curator recommendations?">
            <p className="mb-2">Confidence reflects the strength of the underlying evidence:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Strong:</strong> 6+ sessions with 70%+ consistent signal. The recommendation is well-supported by usage data.</li>
              <li><strong>Moderate:</strong> 3-5 sessions with a lean in one direction. The pattern is visible but still building.</li>
              <li><strong>Weak:</strong> Early signal with limited data. More usage history would sharpen the picture.</li>
            </ul>
            <p className="mt-2">Higher confidence recommendations are safer to act on. Lower confidence suggestions are exploratory.</p>
          </Q>
          <Q id="curator-constraints" q="What happens when I apply a constraint?">
            <p>When you mention a constraint like "I want to keep it non-aromatic", the Curator re-evaluates the previous recommendation. If the constraint contradicts the signal (e.g., the pipe is pulling toward Aromatic but you want non-aromatic), the Curator will exclude it and suggest the next best candidate instead. If the constraint aligns with the signal, the Curator confirms that the recommendation still holds. Constraints stay active throughout the conversation so you can explore alternatives while keeping your preferences in mind.</p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicWhiskeyAI")}>
          <Q id="whiskey-quick-add" q={t("help.whiskeyQuickAdd")}>
            <p>{t("helpCenter.whiskeyQuickAddDesc")}</p>
          </Q>
          <Q id="whiskey-bottle-lookup" q={t("help.whiskeyBottleLookup")}>
            <p>{t("helpCenter.whiskeyBottleLookupDesc")}</p>
          </Q>
          <Q id="whiskey-auto-fill" q={t("help.whiskeyAutoFill")}>
            <p>{t("helpCenter.whiskeyAutoFillDesc")}</p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicWhiskeyInsights")}>
          <Q id="whiskey-value" q={t("help.whiskeyValue")}>
            <p>{t("helpCenter.whiskeyValueDesc")}</p>
          </Q>
          <Q id="whiskey-tasting-analytics" q={t("help.whiskeyTastingAnalytics")}>
            <p>{t("helpCenter.whiskeyTastingAnalyticsDesc")}</p>
          </Q>
        </Section>

        <Section title="Value &amp; Strategy">
          <Q id="value-strategy-what" q="What is the Value &amp; Strategy section?">
            <p className="mb-2">Every item detail page (bottles, pipes, and tobacco blends) includes a <strong>Value &amp; Strategy</strong> section that shows computed valuation data and a strategic recommendation tailored to that item type.</p>
            <p>It displays: Current Value with a confidence badge (High / Medium / Low), a Value Trend indicator, a Rarity Score from 0–100, a Replacement Difficulty rating, and a Strategy Recommendation (e.g. Hold, Safe to Open, Cellar for Aging, Preserve &amp; Insure) with a bullet-point rationale explaining why.</p>
          </Q>
          <Q id="value-strategy-checkpoint" q="How do I save a value checkpoint?">
            <p>From any item’s detail page, open the Value &amp; Strategy section and click <strong>Save Checkpoint</strong>. This records the item’s current computed value as a timestamped history entry. Value History shows all past checkpoints so you can track how your item’s value changes over time.</p>
          </Q>
          <Q id="value-strategy-observation" q="How do I add a market price observation?">
            <p>Click <strong>Add Observation</strong> in the Value &amp; Strategy section. You can record a real-world price you found (e.g. an auction result, a retailer listing, a secondary market price), along with the source name, URL, and price type (retail, auction, secondary market, etc.). Observations provide evidence for valuation and are stored separately from computed checkpoints.</p>
          </Q>
          <Q id="value-strategy-rarity" q="How is the Rarity Score calculated?">
            <p>The Rarity Score (0–100) is computed automatically from the item’s data. For whiskey bottles it considers age statement, production status (Discontinued, Allocated, Limited Edition), producer status (closed/silent distillery), ABV, export exclusivity, and whether the bottle is a unicorn or single cask release. For pipes it considers production type (one-off, limited artisan batch, standard artisan, or factory), maker status (deceased/retired/inactive), material, provenance, and age. For tobacco blends it considers discontinuation, manufacturer status, limited batches, regional exclusivity, and cellar age.</p>
            <p className="mt-2">A score of 0–25 is Common, 25–50 is Moderate, and above 50 is Rare. Scores above 70 are highlighted in red as high-rarity items.</p>
          </Q>
          <Q id="value-strategy-badges" q="What do the status badges mean?">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Discontinued</strong> — production has ended; supply is finite.</li>
              <li><strong>Allocated</strong> — supply is restricted or rationed by the producer.</li>
              <li><strong>Seasonal</strong> — only available at certain times of year.</li>
              <li><strong>One of a Kind</strong> — unique pipe; irreplaceable.</li>
              <li><strong>Maker Deceased</strong> — the artisan is no longer alive; no new supply possible.</li>
              <li><strong>Maker Retired</strong> — the maker no longer produces; existing pieces are the final supply.</li>
              <li><strong>Exclusive</strong> — market or retailer exclusive release.</li>
            </ul>
            <p className="mt-2">Badges appear automatically when the corresponding field is set on the item record.</p>
          </Q>
        </Section>

        <Section title="Pipe Club">
          <Q id="pipe-club-what" q="What is Pipe Club?">
            <p>Pipe Club is a session-based feature designed for pipe club meetings or gatherings where someone brings a tobacco you may not own. You select the pipes you physically brought with you, identify the club blend (from your collection, your wishlist, or a new/unowned blend), and the canonical pairing engine instantly recommends the best pipe from what you actually have on hand — not your entire collection.</p>
          </Q>
          <Q id="pipe-club-start" q="How do I start a Pipe Club session?">
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to <strong>Pipe Club</strong> from the main navigation.</li>
              <li>Tap <strong>Start Session</strong>.</li>
              <li>Enter the session date, club name, and location (optional).</li>
              <li>Select the pipes you brought with you.</li>
              <li>Identify the club blend — choose from your collection, wishlist, or enter a new blend.</li>
              <li>Review the recommendation, then log which pipe you actually used and rate the experience.</li>
            </ol>
          </Q>
          <Q id="pipe-club-recommendation" q="How does the Pipe Club recommendation work?">
            <p>The canonical pairing engine scores only the pipes you selected as "present" — not your entire collection. It uses the same multi-dimensional scoring as the full Pairing Matrix (pipe specialization, chamber geometry, tobacco cut, blend composition, aromatic compatibility, bowl material, and smoking character), but narrowed to the pipes you have with you. The recommendation shows the best-matched pipe and a runner-up alternative, each with a confidence tier and explanation of why the pairing works.</p>
          </Q>
          <Q id="pipe-club-blend-sources" q="Where can I select the club blend from?">
            <p>You can identify the club blend from three sources:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li><strong>My Collection</strong> — search and select a blend you already own.</li>
              <li><strong>Wishlist</strong> — select a blend from your Want List that you don't own yet.</li>
              <li><strong>New / Not Owned</strong> — enter a new blend manually, use Quick Lookup to search all known blends in the system, or tap <strong>Identify Blend (AI)</strong> to auto-fill metadata.</li>
            </ul>
          </Q>
          <Q id="pipe-club-quick-lookup" q="What is Quick Lookup and how do I use it?">
            <p>Quick Lookup searches the entire global tobacco blend database — not just your collection — to instantly find and pre-fill blend metadata. When entering a new/unowned blend, type the name or manufacturer in the Quick Lookup field. Selecting a result auto-fills blend type, family, aromatic status, cut, strength, and components so the pairing engine has accurate data to score against your pipes. You can still adjust any field after selection.</p>
          </Q>
          <Q id="pipe-club-identify-ai" q="What does the Identify Blend (AI) button do?">
            <p>If Quick Lookup doesn't find the blend, enter the name and manufacturer, then tap <strong>Identify Blend (AI)</strong>. The AI attempts to determine the blend type, family, aromatic status, intensity, tobacco components, cut, strength, casing, and topping. It returns null for any field it can't confidently determine — you can fill in the rest manually. This ensures the pairing engine has enough metadata to produce an accurate recommendation even for blends not in the system database.</p>
          </Q>
          <Q id="pipe-club-bowl-variants" q="Can I select a specific interchangeable bowl for a system pipe?">
            <p>Yes. When selecting pipes you brought, pipes with interchangeable bowls (like Falcon or Gabotherm) show a bowl selector. Choose the specific bowl you have with you — the pairing engine will score that bowl's geometry and material rather than the parent pipe's defaults. If no bowl is selected, the engine uses the pipe's base configuration.</p>
          </Q>
          <Q id="pipe-club-log" q="What should I record after the session?">
            <p>After the session, the Log step lets you record:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li><strong>Pipe actually smoked</strong> — which pipe you ended up using (may differ from the recommendation).</li>
              <li><strong>Overall tobacco rating</strong> — 1–5 stars for the blend itself.</li>
              <li><strong>Pairing rating</strong> — 1–5 stars for how well the pipe and blend worked together.</li>
              <li><strong>Would smoke again?</strong> — Yes, No, or Not sure.</li>
              <li><strong>Post-session notes</strong> — how it smoked, any observations.</li>
              <li><strong>Disposition</strong> (unowned blends only) — add the blend to your Wishlist or mark it Not For Me to influence future recommendations.</li>
            </ul>
          </Q>
          <Q id="pipe-club-history" q="Where can I see my past Pipe Club sessions?">
            <p>Pipe Club sessions are listed on the Pipe Club home page under <strong>Session History</strong>. Tap any session to see the blend, date, recommended pipe, and your logged ratings. Pipe Club sessions also appear in the main Session History calendar alongside your regular smoking logs.</p>
          </Q>
        </Section>

        <Section title="Pipe Reassignment & Collection Analysis">
          <Q id="pipe-reassignment-what" q="What is pipe reassignment?">
            <p className="mb-2">Pipe reassignment is when the Curator detects that a pipe's real-world usage pattern diverges from its recorded specialization. For example:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>A pipe labeled "English-Only" but 70% of its sessions are Virginia blends.</li>
              <li>A pipe with no focus but consistently pulls toward a single blend family.</li>
            </ul>
            <p className="mt-2">The Curator ranks reassignment candidates by confidence (strong = 6+ sessions with consistent lean; moderate = 3-5 sessions; weak = early signal). You can ask "Which pipe should I reassign?" to see the top candidate.</p>
          </Q>
          <Q id="pipe-reassignment-action" q="What should I do with a reassignment recommendation?">
            <p className="mb-2">You have three options:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Accept it:</strong> Update the pipe's focus field to the recommended blend family. This improves future pairing accuracy.</li>
              <li><strong>Apply a constraint:</strong> If you want to keep the pipe in its current family, say "I want to leave it non-aromatic" (or whatever the constraint is). The Curator will re-evaluate — if the constraint contradicts the usage signal, it will exclude this pipe and show the next candidate instead.</li>
              <li><strong>Skip it:</strong> Ignore the recommendation. Ask for the next candidate or explore a different topic.</li>
            </ul>
          </Q>
          <Q id="collection-redundancy" q="How do I know if a pipe is redundant?">
            <p className="mb-2">A pipe is redundant when it occupies a crowded shape lane with low usage. For example:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>You have 3 Billard pipes but one has only 2 logged sessions.</li>
              <li>The low-usage pipe doesn't have a distinct specialization to justify its place.</li>
            </ul>
            <p className="mt-2">Ask the Curator "What's my most redundant pipe?" to identify candidates. You can keep it if it earns a specialization, or consider consolidating the shape lane.</p>
          </Q>
        </Section>

        <Section title={t("helpCenter.topicSupport")}>
          <Q id="contact-support" q={t("help.contactSupport")}>
            <div className="space-y-3">
              <p>{t("helpCenter.contactDesc")}</p>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link to={createPageUrl("Support")} className="text-[#D8C7A6] underline decoration-[rgba(163,92,92,0.6)] underline-offset-2 hover:text-[#F5F1E7]">{t("nav.support")}</Link>
                </li>
                <li>
                  <Link to={createPageUrl("TermsOfService")} className="text-[#D8C7A6] underline decoration-[rgba(163,92,92,0.6)] underline-offset-2 hover:text-[#F5F1E7]">{t("nav.terms")}</Link>
                </li>
                <li>
                  <Link to={createPageUrl("PrivacyPolicy")} className="text-[#D8C7A6] underline decoration-[rgba(163,92,92,0.6)] underline-offset-2 hover:text-[#F5F1E7]">{t("nav.privacy")}</Link>
                </li>
              </ul>
            </div>
          </Q>
        </Section>

        {showTutorial && (
          <TutorialSystemPreview onClose={() => setShowTutorial(false)} />
        )}
      </div>
    </div>
    );
  }