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
          {t("howTo.backToFAQ")}
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">{t("howTo.pageTitle")}</h1>
          <p className="text-[#E0D8C8]/80">{t("howTo.pageSubtitle")}</p>
        </div>

        <Section title={t("howTo.addingManagingPipes")}>
          <Q id="add-pipe-basic" q={t("howTo.addPipeBasicQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.addPipeBasicSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="add-pipe-photos" q={t("howTo.addPipePhotosQ")}>
            <p>{t("howTo.addPipePhotosIntro")}</p>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.addPipePhotosSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="measure-pipe" q={t("howTo.measurePipeQ")}>
            <p>{t("howTo.measurePipeIntro")}</p>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.measurePipeSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="update-pipe" q={t("howTo.updatePipeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.updatePipeSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="mark-favorite" q={t("howTo.markFavoriteQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.markFavoriteSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.managingTobacco")}>
          <Q id="add-tobacco" q={t("howTo.addTobaccoQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.addTobaccoSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="track-inventory" q={t("howTo.trackInventoryQ")}>
            <p>{t("howTo.trackInventoryIntro")}</p>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.trackInventorySteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="cellar-tobacco" q={t("howTo.cellarTobaccoQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.cellarTobaccoSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="remove-cellar" q={t("howTo.removeCellarQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.removeCellarSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.loggingSessions")}>
          <Q id="log-smoking" q={t("howTo.logSmokingQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.logSmokingSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="break-in-tracking" q={t("howTo.breakInTrackingQ")}>
            <p>{t("howTo.breakInTrackingIntro")}</p>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.breakInTrackingSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.collectionsImport")}>
          <Q id="bulk-import" q={t("howTo.bulkImportQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.bulkImportSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="export-collection" q={t("howTo.exportCollectionQ")}>
            <p>{t("howTo.exportCollectionIntro")}</p>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.exportCollectionSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.usingAIFeatures")}>
          <Q id="get-pairing-suggestions" q={t("howTo.getPairingSuggestionsQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.getPairingSuggestionsSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="ask-tobacconist" q={t("howTo.askTobacconistQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.askTobacconistSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="identify-pipe" q={t("howTo.identifyPipeQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.identifyPipeSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("howTo.profileSettings")}>
          <Q id="update-profile" q={t("howTo.updateProfileQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.updateProfileSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="public-profile" q={t("howTo.publicProfileQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.publicProfileSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="change-language" q={t("howTo.changeLanguageQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("howTo.changeLanguageSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>
      </div>
    </div>
  );
}