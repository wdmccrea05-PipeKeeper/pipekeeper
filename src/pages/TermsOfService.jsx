import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function TermsOfService() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // If Terms is being used as the default landing page at "/",
  // immediately redirect to Home. Still allow "/TermsOfService" to show Terms.
  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "") {
      navigate(createPageUrl("Home"), { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 text-[#f3e7d3]">
      <h1 className="text-4xl font-semibold tracking-tight text-white">
        {t("terms.title")}
      </h1>
      <p className="mt-2 text-sm text-[#cdbfae]">{t("terms.lastUpdated")}</p>

      <p className="mt-6 leading-relaxed">
        {t("terms.intro")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("terms.section1Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("terms.section1Body")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("terms.section2Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("terms.section2Body")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("terms.section3Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("terms.section3Body")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">
        {t("terms.section4Title")}
      </h2>
      <p className="mt-3 leading-relaxed">
        {t("terms.section4Intro")}
      </p>
      <p className="mt-3 leading-relaxed">{t("terms.section4SubIntro")}</p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong className="text-white">{t("terms.ios")}:</strong> {t("terms.iosDesc")}
        </li>
        <li>
          <strong className="text-white">{t("terms.webAndAndroid")}:</strong> {t("terms.webAndAndroidDesc")}
        </li>
      </ul>
      <p className="mt-3 leading-relaxed">
        {t("terms.section4Closing")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("terms.section5Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("terms.section5Body")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">6. Acceptable Use</h2>
      <p className="mt-3 leading-relaxed">
        You agree not to misuse the Service, including but not limited to:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>Accessing accounts you do not own</li>
        <li>Attempting to bypass security features</li>
        <li>Reverse engineering or disrupting the Service</li>
        <li>Automated scraping or bulk data extraction</li>
        <li>Using the Service for unlawful purposes</li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold text-white">
        {t("terms.section7Title")}
      </h2>
      <p className="mt-3 leading-relaxed">
        {t("terms.section7Intro")}
      </p>
      <p className="mt-3 leading-relaxed">
        {t("terms.section7ZeroTolerance")}
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>{t("terms.section7Item1")}</li>
        <li>{t("terms.section7Item2")}</li>
        <li>{t("terms.section7Item3")}</li>
        <li>{t("terms.section7Item4")}</li>
      </ul>
      <p className="mt-3 leading-relaxed">
        {t("terms.section7Enforcement")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("terms.section8Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("terms.section8Body")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("terms.section9Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("terms.section9Body")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("terms.section10Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("terms.section10Body")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("terms.section11Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("terms.section11Body")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("terms.section12Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("terms.section12Body")}
      </p>

      <p className="mt-10 text-sm text-[#cdbfae]">
        {t("terms.relatedPolicies")}{" "}
        <a className="underline text-[#f3e7d3] hover:text-white" href={createPageUrl("PrivacyPolicy")}>
          {t("terms.privacyPolicy")}
        </a>{" "}
        ·{" "}
        <a className="underline text-[#f3e7d3] hover:text-white" href={createPageUrl("FAQ")}>
          {t("terms.faq")}
        </a>
      </p>
    </div>
  );
}