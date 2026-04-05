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
          <Q id="tier-diff" q={t("howTo.tierDiffQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {tArray("howTo.tierDiffSteps").map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>
      </div>
    </div>
  );
}