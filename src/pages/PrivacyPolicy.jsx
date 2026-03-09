import React from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 text-[#f3e7d3]">
      <h1 className="text-4xl font-semibold tracking-tight text-white">
        {t("privacyPolicy.title")}
      </h1>
      <p className="mt-2 text-sm text-[#cdbfae]">{t("privacyPolicy.lastUpdated")}</p>

      <p className="mt-6 leading-relaxed">
        {t("privacyPolicy.intro")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section1Title")}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong className="text-white">{t("privacyPolicy.accountInfoLabel")}</strong> {t("privacyPolicy.accountInfoText")}
        </li>
        <li>
          <strong className="text-white">{t("privacyPolicy.collectionDataLabel")}</strong> {t("privacyPolicy.collectionDataText")}
        </li>
        <li>
          <strong className="text-white">{t("privacyPolicy.deviceUsageLabel")}</strong> {t("privacyPolicy.deviceUsageText")}
        </li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section2Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.ugcText1")}
      </p>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.ugcText2Pre")} <strong className="text-white">{t("privacyPolicy.ugcText2Bold")}</strong>{t("privacyPolicy.ugcText2Post")}
      </p>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.ugcText3")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section3Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.paymentsText1")}
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong className="text-white">{t("privacyPolicy.iosLabel")}</strong> {t("privacyPolicy.iosText")}
        </li>
        <li>
          <strong className="text-white">{t("privacyPolicy.webAndroidLabel")}</strong> {t("privacyPolicy.webAndroidText")}
        </li>
      </ul>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.paymentsText2")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section4Title")}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>{t("privacyPolicy.use1")}</li>
        <li>{t("privacyPolicy.use2")}</li>
        <li>{t("privacyPolicy.use3")}</li>
        <li>{t("privacyPolicy.use4")}</li>
        <li>{t("privacyPolicy.use5")}</li>
        <li>{t("privacyPolicy.use6")}</li>
      </ul>
      <p className="mt-3 leading-relaxed">{t("privacyPolicy.noSellData")}</p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section5Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.shareIntro")}
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong className="text-white">{t("privacyPolicy.serviceProvidersLabel")}</strong> {t("privacyPolicy.serviceProvidersText")}
        </li>
        <li>
          <strong className="text-white">{t("privacyPolicy.legalSafetyLabel")}</strong> {t("privacyPolicy.legalSafetyText")}
        </li>
        <li>
          <strong className="text-white">{t("privacyPolicy.businessChangesLabel")}</strong> {t("privacyPolicy.businessChangesText")}
        </li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section6Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.dataRetentionText")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section7Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.securityText")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section8Title")}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>{t("privacyPolicy.choice1")}</li>
        <li>
          {t("privacyPolicy.choice2")}
        </li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section9Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.childrenText")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section10Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.changesText")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section11Title")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.contactText")}
      </p>

      <p className="mt-10 text-sm text-[#cdbfae]">
        {t("privacyPolicy.relatedDocuments")}{" "}
        <a className="underline text-[#f3e7d3] hover:text-white" href="/terms">
          {t("privacyPolicy.termsOfService")}
        </a>{" "}
        ·{" "}
        <a className="underline text-[#f3e7d3] hover:text-white" href="/faq">
          {t("privacyPolicy.faq")}
        </a>
      </p>
    </div>
  );
}