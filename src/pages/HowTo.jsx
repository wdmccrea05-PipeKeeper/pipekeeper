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

        <Section title={t("howToAdditional.item1")}>
          <Q id="pipe-club-start" q="How do I start a Pipe Club session?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>{t("howToAdditional.item2")}</strong> {t("howToAdditional.item3")}</li>
              <li>{t("howToAdditional.item4")} <strong>{t("howToAdditional.item5")}</strong>.</li>
              <li>{t("howToAdditional.item6")}</li>
              <li>{t("howToAdditional.item7")} <strong>{t("howToAdditional.item8")}</strong> {t("howToAdditional.item9")}</li>
            </ol>
          </Q>
          <Q id="pipe-club-select-pipes" q="How do I select the pipes I brought?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("howToAdditional.item10")} <strong>{t("howToAdditional.item11")}</strong> {t("howToAdditional.item12")}</li>
              <li>{t("howToAdditional.item13")}</li>
              <li>{t("howToAdditional.item14")} <strong>{t("howToAdditional.item15")}</strong> or <strong>{t("howToAdditional.item16")}</strong> {t("howToAdditional.item17")}</li>
              <li>{t("howToAdditional.item18")}</li>
              <li>{t("howToAdditional.item19")} <strong>{t("howToAdditional.item20")}</strong> {t("howToAdditional.item21")}</li>
            </ol>
          </Q>
          <Q id="pipe-club-select-blend" q="How do I identify the club blend?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("howToAdditional.item22")} <strong>{t("howToAdditional.item23")}</strong> {t("howToAdditional.item24")} <strong>{t("howToAdditional.item25")}</strong>, <strong>{t("howToAdditional.item26")}</strong>, or <strong>{t("howToAdditional.item27")}</strong>.</li>
              <li><strong>{t("howToAdditional.item28")}</strong> {t("howToAdditional.item29")}</li>
              <li><strong>{t("howToAdditional.item30")}</strong> {t("howToAdditional.item31")}</li>
              <li><strong>{t("howToAdditional.item32")}</strong> {t("howToAdditional.item33")} <strong>{t("howToAdditional.item34")}</strong> {t("howToAdditional.item35")} <strong>{t("howToAdditional.item36")}</strong> {t("howToAdditional.item37")}</li>
              <li>{t("howToAdditional.item38")}</li>
              <li>{t("howToAdditional.item39")} <strong>{t("howToAdditional.item40")}</strong> {t("howToAdditional.item41")}</li>
            </ol>
          </Q>
          <Q id="pipe-club-recommendation" q="How do I read the recommendation?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("howToAdditional.item42")} <strong>{t("howToAdditional.item43")}</strong> {t("howToAdditional.item44")}</li>
              <li>{t("howToAdditional.item45")}</li>
              <li>{t("howToAdditional.item46")}</li>
              <li>{t("howToAdditional.item47")} <strong>{t("howToAdditional.item48")}</strong> {t("howToAdditional.item49")}</li>
            </ol>
          </Q>
          <Q id="pipe-club-log" q="How do I log the session results?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("howToAdditional.item50")} <strong>{t("howToAdditional.item51")}</strong> {t("howToAdditional.item52")}</li>
              <li>{t("howToAdditional.item53")}</li>
              <li>{t("howToAdditional.item54")}</li>
              <li>{t("howToAdditional.item55")}</li>
              <li>{t("howToAdditional.item56")} <strong>{t("howToAdditional.item57")}</strong> {t("howToAdditional.item58")} <strong>{t("howToAdditional.item59")}</strong> {t("howToAdditional.item60")}</li>
              <li>{t("howToAdditional.item61")} <strong>{t("howToAdditional.item62")}</strong> {t("howToAdditional.item63")}</li>
            </ol>
          </Q>
          <Q id="pipe-club-history" q="How do I view past Pipe Club sessions?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>{t("howToAdditional.item64")}</strong> {t("howToAdditional.item65")}</li>
              <li>{t("howToAdditional.item66")} <strong>{t("howToAdditional.item67")}</strong>.</li>
              <li>{t("howToAdditional.item68")} <strong>{t("howToAdditional.item69")}</strong> {t("howToAdditional.item70")}</li>
              <li>{t("howToAdditional.item71")}</li>
            </ol>
          </Q>
        </Section>

        <Section title={t("howToAdditional.item72")}>
          <Q id="add-bottle" q="How do I add a whiskey bottle to my collection?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>{t("howToAdditional.item73")}</strong> {t("howToAdditional.item74")}</li>
              <li>{t("howToAdditional.item75")} <strong>{t("howToAdditional.item76")}</strong> {t("howToAdditional.item77")} <strong>+</strong> {t("howToAdditional.item78")}</li>
              <li>{t("howToAdditional.item79")}</li>
              <li>{t("howToAdditional.item80")}</li>
              <li>{t("howToAdditional.item81")} <strong>{t("howToAdditional.item82")}</strong> {t("howToAdditional.item83")}</li>
            </ol>
          </Q>
          <Q id="whiskey-inventory" q="How does inventory tracking work for whiskey?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("howToAdditional.item84")}</li>
              <li>{t("howToAdditional.item85")} <strong>{t("howToAdditional.item86")}</strong> {t("howToAdditional.item87")}</li>
              <li>{t("howToAdditional.item88")}</li>
            </ol>
          </Q>
          <Q id="whiskey-tasting" q="How do I log a whiskey tasting?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("howToAdditional.item89")} <strong>{t("howToAdditional.item90")}</strong>.</li>
              <li>{t("howToAdditional.item91")}</li>
              <li>{t("howToAdditional.item92")}</li>
            </ol>
          </Q>
          <Q id="whiskey-value" q="How does bottle valuation work?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("howToAdditional.item93")} <strong>{t("howToAdditional.item94")}</strong>.</li>
              <li>{t("howToAdditional.item95")}</li>
              <li>{t("howToAdditional.item96")} <strong>{t("howToAdditional.item97")}</strong> {t("howToAdditional.item98")}</li>
              <li>{t("howToAdditional.item99")} <strong>{t("howToAdditional.item100")}</strong> {t("howToAdditional.item101")}</li>
            </ol>
          </Q>
        </Section>

        <Section title={t("howToAdditional.item102")}>
          <Q id="add-cigar" q="How do I add a cigar to my collection?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>{t("howToAdditional.item103")}</strong> {t("howToAdditional.item104")}</li>
              <li>{t("howToAdditional.item105")} <strong>{t("howToAdditional.item106")}</strong> {t("howToAdditional.item107")} <strong>{t("howToAdditional.item108")}</strong>.</li>
              <li>{t("howToAdditional.item109")}</li>
              <li>{t("howToAdditional.item110")}</li>
              <li>{t("howToAdditional.item111")} <strong>{t("howToAdditional.item112")}</strong> {t("howToAdditional.item113")}</li>
            </ol>
          </Q>
          <Q id="cigar-humidor" q="How do I set up and manage a humidor?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>{t("howToAdditional.item114")}</strong>.</li>
              <li>{t("howToAdditional.item115")} <strong>{t("howToAdditional.item116")}</strong> {t("howToAdditional.item117")}</li>
              <li>{t("howToAdditional.item118")}</li>
              <li>{t("howToAdditional.item119")}</li>
              <li>{t("howToAdditional.item120")}</li>
            </ol>
          </Q>
          <Q id="cigar-session" q="How do I log a cigar smoking session?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("howToAdditional.item121")} <strong>{t("howToAdditional.item122")}</strong> {t("howToAdditional.item123")}</li>
              <li>{t("howToAdditional.item124")}</li>
              <li>{t("howToAdditional.item125")}</li>
              <li>{t("howToAdditional.item126")} <strong>{t("howToAdditional.item127")}</strong> {t("howToAdditional.item128")}</li>
            </ol>
          </Q>
          <Q id="cigar-free-vs-pro" q="What's included in the free vs. pro CigarKeeper plan?">
            <p><strong>{t("howToAdditional.item129")}</strong> {t("howToAdditional.item130")}</p>
            <p><strong>{t("howToAdditional.item131")}</strong> {t("howToAdditional.item132")}</p>
            <p>{t("howToAdditional.item133")}</p>
          </Q>
        </Section>

        <Section title={t("howTo.subscriptions")}>
          <Q id="upgrade" q="How do I upgrade to Pro?">
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("howToAdditional.item134")} <strong>{t("howToAdditional.item135")}</strong> {t("howToAdditional.item136")}</li>
              <li>{t("howToAdditional.item137")} <strong>{t("howToAdditional.item138")}</strong>, <strong>{t("howToAdditional.item139")}</strong>, <strong>{t("howToAdditional.item140")}</strong>{t("howToAdditional.item141")} <strong>{t("howToAdditional.item142")}</strong> {t("howToAdditional.item143")} <strong>{t("howToAdditional.item144")}</strong> {t("howToAdditional.item145")}</li>
              <li>{t("howToAdditional.item146")}</li>
              <li>{t("howToAdditional.item147")}</li>
              <li>{t("howToAdditional.item148")}</li>
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
              <li><strong>{t("howToAdditional.item149")}</strong> {t("howToAdditional.item150")}</li>
              <li><strong>{t("howToAdditional.item151")}</strong> {t("howToAdditional.item152")}</li>
              <li>{t("howToAdditional.item153")}</li>
              <li>{t("howToAdditional.item154")} <strong>{t("howToAdditional.item155")}</strong> {t("howToAdditional.item156")}</li>
              <li>A <strong>{t("howToAdditional.item157")}</strong> {t("howToAdditional.item158")}</li>
              <li>{t("howToAdditional.item159")}</li>
            </ol>
          </Q>
        </Section>
      </div>
    </div>
  );
}