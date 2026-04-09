import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, Wrench, BookOpen, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { base44 } from "@/api/base44Client";

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

        <Section title={t("helpCenter.topicWhiskeyKeeper")}>
          <Q id="whiskey-getting-started" q={t("help.whiskeyGettingStarted")}>
            <p>{t("helpCenter.whiskeyGettingStartedDesc")}</p>
          </Q>
          <Q id="whiskey-adding-bottles" q={t("help.whiskeyAddingBottles")}>
            <p>{t("helpCenter.whiskeyAddingBottlesDesc")}</p>
          </Q>
          <Q id="whiskey-logging-tastings" q={t("help.whiskeyLoggingTastings")}>
            <p>{t("helpCenter.whiskeyLoggingTastingsDesc")}</p>
          </Q>
          <Q id="whiskey-viewing-insights" q={t("help.whiskeyViewingInsights")}>
            <p>{t("helpCenter.whiskeyViewingInsightsDesc")}</p>
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

        <Section title="Collector's Snapshot">
          <Q id="snapshot-what" q="What is the Collector's Snapshot?">
            <p>The Collector’s Snapshot is a fullscreen story slideshow accessible from the Hub. It generates a curated set of visual highlight cards from your collection data. It is <strong>module-aware</strong>: if you only use PipeKeeper it shows pipe and tobacco-specific cards; if you only use WhiskeyKeeper it shows whiskey-focused cards; if both are active it combines highlights from both modules with no placeholder gaps.</p>
          </Q>
          <Q id="snapshot-navigate" q="How do I navigate the Snapshot?">
            <p>Tap the right or left side of the current card, swipe left or right on mobile, or use the arrow keys on a keyboard. A progress bar along the bottom tracks your position. Tap the X button or press Escape to close. Navigation buttons at the bottom also let you step forward and back.</p>
          </Q>
          <Q id="snapshot-regenerate" q="How do I regenerate my Collection Story?">
            <p>On the Hub, find the Collection Story card and click <strong>Regenerate</strong>. The story is rebuilt from your current collection data, reflecting your newest acquisitions, most-used items, and updated values. It also regenerates automatically when significant changes are detected in your collection.</p>
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
        </div>

        {showTutorial && (
        <TutorialSystemPreview onClose={() => setShowTutorial(false)} />
        )}
        </div>
        );
        }

        function TutorialSystemPreview({ onClose }) {
          const { t } = useTranslation();
          const navigate = useNavigate();

          const handleStartTutorial = async () => {
            try {
              // Get current user to clear skip flag
              const user = await base44.auth.me();
              if (user?.email) {
                localStorage.removeItem(`pk_quickstart_skipped_${user.email}`);
                localStorage.removeItem(`pk_quickstart_completed_${user.email}`);
                // Signal Home to force show tutorial
                localStorage.setItem(`pk_force_tutorial_${user.email}`, 'true');
              }
            } catch (e) {
              console.error('Error clearing tutorial state:', e);
            }

            // Navigate to Home where tutorial system is active
            navigate(createPageUrl("Home"));
            onClose();
          };

          return (
            <div className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-gradient-to-br from-[#2a1f18] to-[#1f1510] rounded-2xl border border-[rgba(140,105,65,0.35)] p-8 text-center space-y-4">
                <h2 className="text-2xl font-bold text-[#F5F1E7]">{t("help.tutorialModalTitle", "Start Your Tutorial?")}</h2>
                <p className="text-[#D8C7A6]/80">
                  {t("help.tutorialModalDesc", "The Quick Start guide will walk you through adding your first pipes, blends, and more.")}
                </p>
                <div className="flex gap-3 justify-center pt-4">
                  <Button variant="outline" onClick={onClose} className="border-[rgba(140,105,65,0.35)] text-[#F5F1E7]">
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button 
                    onClick={handleStartTutorial}
                    className="bg-amber-700 hover:bg-amber-600 text-[#F5F1E7]"
                  >
                    {t("help.startTutorial", "Start Tutorial")}
                  </Button>
                </div>
              </div>
            </div>
          );
        }