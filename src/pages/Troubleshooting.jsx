import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, ArrowLeft, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function Troubleshooting() {
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
          {t("troubleshooting.backToFAQ")}
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">{t("troubleshooting.pageTitle")}</h1>
          <p className="text-[#E0D8C8]/80">{t("troubleshooting.pageSubtitle")}</p>
        </div>

        <Section title={t("troubleshooting.loginAccess")}>
          <Q id="cant-login" q={t("troubleshooting.cantLoginQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.cantLoginSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="verification-expired" q={t("troubleshooting.verificationExpiredQ")}>
            <p>{t("troubleshooting.verificationExpiredIntro")}</p>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.verificationExpiredSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="email-not-received" q={t("troubleshooting.emailNotReceivedQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.emailNotReceivedSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="session-expired" q={t("troubleshooting.sessionExpiredQ")}>
            <p>{t("troubleshooting.sessionExpiredIntro")}</p>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.sessionExpiredSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("troubleshooting.dataSyncing")}>
          <Q id="data-not-saving" q={t("troubleshooting.dataNotSavingQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.dataNotSavingSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="data-not-loading" q={t("troubleshooting.dataNotLoadingQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.dataNotLoadingSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="duplicate-entries" q={t("troubleshooting.duplicateEntriesQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.duplicateEntriesSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="syncing-delay" q={t("troubleshooting.syncingDelayQ")}>
            <p>{t("troubleshooting.syncingDelayIntro")}</p>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.syncingDelaySteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("troubleshooting.photosImages")}>
          <Q id="photo-not-uploading" q={t("troubleshooting.photoNotUploadingQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.photoNotUploadingSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="photo-blurry" q={t("troubleshooting.photoBlurryQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.photoBlurrySteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="delete-photo" q={t("troubleshooting.deletePhotoQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.deletePhotoSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("troubleshooting.aiFeatures")}>
          <Q id="ai-slow" q={t("troubleshooting.aiSlowQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.aiSlowSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="ai-wrong-suggestion" q={t("troubleshooting.aiWrongSuggestionQ")}>
            <p>{t("troubleshooting.aiWrongSuggestionIntro")}</p>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.aiWrongSuggestionSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="ai-not-working" q={t("troubleshooting.aiNotWorkingQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.aiNotWorkingSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("troubleshooting.subscriptionBilling")}>
          <Q id="subscription-not-working" q={t("troubleshooting.subscriptionNotWorkingQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.subscriptionNotWorkingSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="billing-issue" q={t("troubleshooting.billingIssueQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.billingIssueSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="cancel-subscription" q={t("troubleshooting.cancelSubscriptionQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.cancelSubscriptionSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("troubleshooting.browserTechnical")}>
          <Q id="app-freezes" q={t("troubleshooting.appFreezesQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.appFreezesSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="works-on-phone-not-desktop" q={t("troubleshooting.worksOnPhoneNotDesktopQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.worksOnPhoneNotDesktopSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>

          <Q id="mobile-app-issues" q={t("troubleshooting.mobileAppIssuesQ")}>
            <ol className="list-decimal list-inside space-y-2">
              {t("troubleshooting.mobileAppIssuesSteps", { returnObjects: true }).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Q>
        </Section>

        <Section title={t("troubleshooting.needMoreHelp")}>
          <div className="bg-[#A35C5C]/10 border border-[#A35C5C]/40 rounded-lg p-6 text-[#E0D8C8]">
            <div className="flex gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-2">{t("troubleshooting.couldntFindAnswer")}</p>
                <p className="text-sm mb-3">{t("troubleshooting.contactSupportDesc")}</p>
                <a href="mailto:support@pipekeeperapp.com" className="text-[#8b3a3a] hover:text-[#a94747] underline">
                  support@pipekeeperapp.com
                </a>
                <p className="text-xs text-[#E0D8C8]/70 mt-3">{t("troubleshooting.includeDetails")}</p>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}