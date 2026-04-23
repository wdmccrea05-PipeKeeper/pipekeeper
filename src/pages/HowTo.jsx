import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, Info, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function HowTo() {
  const { t } = useTranslation();
  const tArray = (key) => {
    const result = t(key, { returnObjects: true });
    return Array.isArray(result) ? result : [];
  };
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
    <Card style={{
      background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
      border: "1px solid rgba(140,105,65,0.25)"
    }} className="overflow-hidden">
      <button
        onClick={() => toggleItem(id)}
        className="w-full text-left p-4 flex items-center justify-between transition-colors"
        style={{ color: "#E0D8C8" }}
      >
        <span className="font-semibold pr-4" style={{ color: "#E0D8C8" }}>{q}</span>
        <ChevronDown 
          className={`w-5 h-5 flex-shrink-0 transition-transform ${openItems[id] ? 'rotate-180' : ''}`}
          style={{ color: "rgba(180,140,75,0.7)" }}
        />
      </button>
      {openItems[id] && (
        <CardContent className="px-4 pb-4 pt-0 leading-relaxed space-y-3" style={{ color: "rgba(224,216,200,0.8)" }}>
          {children}
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, rgba(15,11,8,0.95), rgba(20,15,10,0.95))" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 16px" }}>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">{t("howTo.pageTitle")}</h1>
          <p className="text-[#E0D8C8]/80 mb-4">{t("howTo.pageSubtitle")}</p>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <Link to={createPageUrl('FAQ')}>
              <Button variant="outline" style={{
                background: "linear-gradient(135deg, rgba(60,45,30,0.5), rgba(50,35,25,0.6))",
                border: "1px solid rgba(140,105,65,0.4)",
                color: "#E0D8C8"
              }}>
                <Info className="w-4 h-4 mr-2" />
                {t("help.faq")}
              </Button>
            </Link>
            <Link to={createPageUrl('TroubleshootingFull')}>
              <Button variant="outline" style={{
                background: "linear-gradient(135deg, rgba(60,45,30,0.5), rgba(50,35,25,0.6))",
                border: "1px solid rgba(140,105,65,0.4)",
                color: "#E0D8C8"
              }}>
                <Wrench className="w-4 h-4 mr-2" />
                {t("help.troubleshooting")}
              </Button>
            </Link>
          </div>
        </div>

        <Section title={t("howTo.managingPipes")}>
           <Q id="add-pipe-basic" q={t("howTo.addPipeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.addPipeBasicSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>



          <Q id="update-pipe" q={t("howTo.updatePipeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.updatePipeSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="mark-favorite" q={t("howTo.markFavoriteQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.markFavoriteSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="delete-pipe" q={t("howTo.deletePipeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.deletePipeSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.managingTobacco")}>
          <Q id="add-tobacco" q={t("howTo.addTobaccoQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.addTobaccoSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="update-tobacco" q={t("howTo.updateTobaccoQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.updateTobaccoSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="manage-cellar" q={t("howTo.manageCellarQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.manageCellarSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="delete-tobacco" q={t("howTo.deleteTobaccoQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.deleteTobaccoSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.loggingSessions")}>
          <Q id="log-session" q={t("howTo.logSessionQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.logSessionSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="view-logs" q={t("howTo.viewLogsQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.viewLogsSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="streaks" q={t("howTo.streaksQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.streaksSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.measurements")}>
          <Q id="measure-pipe" q={t("howTo.measurePipeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.measurePipeSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.insights")}>
          <Q id="insights-general" q={t("howTo.insightsQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.insightsSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="curator" q={t("howTo.curator")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.curatorSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="story-cards" q={t("howTo.storyCard")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.storyCardSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.aiFeatures")}>
          <Q id="generate-pairings" q={t("howTo.generatePairingsQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.generatePairingsSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="identify-pipe" q={t("howTo.identifyPipeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.identifyPipeSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="optimize" q={t("howTo.optimizeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.optimizeSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="geometry" q={t("howTo.geometryQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.geometrySteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.sharing")}>
          <Q id="share" q={t("howTo.shareQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.shareSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="export" q={t("howTo.exportQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.exportSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="profile" q={t("howTo.profileQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.profileSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title="Managing Whiskey (WhiskeyKeeper)">
          <Q id="add-bottle" q="How do I add a whiskey bottle to my collection?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>WhiskeyKeeper</strong> from the nav or Collection Hub.</li>
              <li>Tap <strong>Add Bottle</strong> or use the <strong>+</strong> button.</li>
              <li>Search by name to auto-fill distillery, region, type, and age — or enter details manually.</li>
              <li>Set purchase price, fill level, and any tasting notes.</li>
              <li>Tap <strong>Save</strong> to add it to your collection.</li>
            </ol>
          </Q>
          <Q id="whiskey-inventory" q="How does inventory tracking work for whiskey?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Each bottle has an inventory unit — Full, High, Medium, Low, or Empty.</li>
              <li>Open a bottle's detail page and update the <strong>Fill Level</strong> as you work through it.</li>
              <li>You can also track multiple bottles of the same expression using the bottle count field.</li>
            </ol>
          </Q>
          <Q id="whiskey-tasting" q="How do I log a whiskey tasting?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open the bottle's detail page and tap <strong>Log Tasting</strong>.</li>
              <li>Record flavor notes, rating, and any pairing or occasion details.</li>
              <li>Tasting history appears in the bottle's detail view and in WhiskeyKeeper Insights.</li>
            </ol>
          </Q>
          <Q id="whiskey-value" q="How does bottle valuation work?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open any bottle's detail page and scroll to <strong>Value &amp; Strategy</strong>.</li>
              <li>The system computes a current value using retail, aftermarket, and collector price signals.</li>
              <li>Tap <strong>Save Checkpoint</strong> to record a timestamped value snapshot for tracking over time.</li>
              <li>Add manual <strong>Price Observations</strong> from auctions or retailers to improve accuracy.</li>
            </ol>
          </Q>
        </Section>

        <Section title="Managing Cigars (CigarKeeper)">
          <Q id="add-cigar" q="How do I add a cigar to my collection?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>CigarKeeper</strong> from the nav or Collection Hub.</li>
              <li>Tap <strong>Add Cigar</strong> or navigate to <strong>Cigars → +</strong>.</li>
              <li>Enter the brand, line, vitola, wrapper, and other details.</li>
              <li>Set your quantity and unit type (single, box, 5-pack, etc.).</li>
              <li>Tap <strong>Save</strong> to add it to your humidor.</li>
            </ol>
          </Q>
          <Q id="cigar-humidor" q="How do I set up and manage a humidor?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Cigars → Humidors tab</strong>.</li>
              <li>Tap <strong>Add Humidor</strong> and name it.</li>
              <li>Set capacity, target humidity %, and maintenance interval.</li>
              <li>Assign cigars to the humidor from each cigar's detail page.</li>
              <li>Log maintenance events to reset alert timers.</li>
            </ol>
          </Q>
          <Q id="cigar-session" q="How do I log a cigar smoking session?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Tap <strong>Log Session</strong> from CigarKeeper or the cigar's detail page.</li>
              <li>Select the cigar, or enter a cigar you smoked outside your collection.</li>
              <li>Fill in tasting notes, burn/draw quality, pairing, and enjoyment rating.</li>
              <li>Tap <strong>Save</strong> to record the session.</li>
            </ol>
          </Q>
          <Q id="cigar-free-vs-pro" q="What's included in the free vs. pro CigarKeeper plan?">
            <p><strong>Free tier</strong> — add up to 10 cigars, log sessions, manage 1 humidor, and track basic maintenance alerts.</p>
            <p><strong>Pro tier</strong> — unlimited cigars and humidors, Curator AI recommendations, collection insights, advanced analytics, and export features.</p>
            <p>You can start on the free tier immediately after signing up — no payment required.</p>
          </Q>
        </Section>

        <Section title={t("howTo.subscriptions")}>
          <Q id="upgrade" q={t("howTo.upgradeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.upgradeSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="cancel" q={t("howTo.cancelQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.cancelSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
          <Q id="tier-diff" q="What is the difference between Free and Pro?">
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>Free:</strong> PipeKeeper allows up to 5 pipes and 10 blends; WhiskeyKeeper allows up to 10 bottles; CigarKeeper allows up to 10 cigars. Basic features, no AI features.</li>
              <li><strong>Pro:</strong> Unlimited items per module, AI pairings, collection optimization, AI identification, break-in schedules, valuation tools, Value &amp; Strategy section, export reports, and priority support.</li>
              <li>Each module (PipeKeeper, WhiskeyKeeper, and CigarKeeper) can be subscribed to individually.</li>
              <li>The <strong>Founders Bundle</strong> includes PipeKeeper and WhiskeyKeeper together at a discounted rate. CigarKeeper is not included in the Founders Bundle.</li>
              <li>A <strong>3-Module Bundle</strong> covers PipeKeeper, WhiskeyKeeper, and CigarKeeper together at a further discount.</li>
              <li>Founding members have grandfathered lifetime Pro access to PipeKeeper and WhiskeyKeeper.</li>
            </ol>
          </Q>
        </Section>
      </div>
    </div>
  );
}