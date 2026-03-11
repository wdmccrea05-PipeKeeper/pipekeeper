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
        {t("termsOfService.title")}
      </h1>
      <p className="mt-2 text-sm text-[#cdbfae]">{t("termsOfService.lastUpdated")}</p>

      <p className="mt-6 leading-relaxed">
        {t("termsOfService.intro")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section1Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section1Text")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section2Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section2Text")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section3Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section3Text")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">
        {t("termsOfService.section4Title")}
      </h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section4Text1")}
      </p>
      <p className="mt-3 leading-relaxed">{t("termsOfService.section4Text2")}</p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong className="text-white">{t("termsOfService.section4IosLabel")}</strong> {t("termsOfService.section4IosText")}
        </li>
        <li>
          <strong className="text-white">{t("termsOfService.section4WebLabel")}</strong> {t("termsOfService.section4WebText")}
        </li>
      </ul>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section4Text3")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section5Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section5Text")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section6Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section6Intro")}
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>{t("termsOfService.section6Item1")}</li>
        <li>{t("termsOfService.section6Item2")}</li>
        <li>{t("termsOfService.section6Item3")}</li>
        <li>{t("termsOfService.section6Item4")}</li>
        <li>{t("termsOfService.section6Item5")}</li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold text-white">
        {t("termsOfService.section7Title")}
      </h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section7Text1")}
      </p>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section7Text2")}
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>{t("termsOfService.section7Item1")}</li>
        <li>{t("termsOfService.section7Item2")}</li>
        <li>{t("termsOfService.section7Item3")}</li>
        <li>{t("termsOfService.section7Item4")}</li>
      </ul>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section7Text3")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section8Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section8Text")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section9Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section9Text")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section10Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section10Text")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section11Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section11Text")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section12Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section12Text")}
      </p>

      <p className="mt-10 text-sm text-[#cdbfae]">
        {t("termsOfService.relatedPolicies")}{" "}
        <a className="underline text-[#f3e7d3] hover:text-white" href={createPageUrl("PrivacyPolicy")}>
          {t("termsOfService.privacyPolicy")}
        </a>{" "}
        ·{" "}
        <a className="underline text-[#f3e7d3] hover:text-white" href={createPageUrl("FAQFull")}>
          {t("termsOfService.faq")}
        </a>
      </p>
    </div>
  );
}