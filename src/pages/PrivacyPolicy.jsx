import React from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 text-[#f3e7d3]">
      <h1 className="text-4xl font-semibold tracking-tight text-white">
        {t("privacyPolicy.title", "Privacy Policy")}
      </h1>
      <p className="mt-2 text-sm text-[#cdbfae]">{t("privacyPolicy.lastUpdated", "Last updated: January 2026")}</p>

      <p className="mt-6 leading-relaxed">
        {t("privacyPolicy.intro", "This Privacy Policy explains how PipeKeeper (\"we,\" \"us\") collects, uses, and shares information when you use the PipeKeeper application and related services (the \"Service\").")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section1Title", "1. Information We Collect")}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong className="text-white">{t("privacyPolicy.accountInfoLabel", "Account information:")}</strong> {t("privacyPolicy.accountInfoText", "such as email address and basic profile details required to operate your account.")}
        </li>
        <li>
          <strong className="text-white">{t("privacyPolicy.collectionDataLabel", "Collection data you provide:")}</strong> {t("privacyPolicy.collectionDataText", "pipe and cellar inventory details, personal notes, photos you upload, and historical records associated with your collection.")}
        </li>
        <li>
          <strong className="text-white">{t("privacyPolicy.deviceUsageLabel", "Device and usage data:")}</strong> {t("privacyPolicy.deviceUsageText", "limited analytics or diagnostic information (such as crash logs) used to maintain and improve the Service.")}
        </li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section2Title", "2. User-Generated Content and Moderation")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.ugcText1", "PipeKeeper allows users to create, upload, and manage content such as notes, descriptions, images, and collection data (\"User-Generated Content\").")}
      </p>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.ugcText2Pre", "PipeKeeper does ")} <strong className="text-white">{t("privacyPolicy.ugcText2Bold", "not permit objectionable, abusive, or harmful content")}</strong>{t("privacyPolicy.ugcText2Post", ". We reserve the right to review, moderate, restrict, remove, or delete User-Generated Content or user accounts that violate our Terms of Service, applicable laws, or community standards.")}
      </p>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.ugcText3", "Users may report objectionable content or abusive behavior by contacting PipeKeeper support. Reports are reviewed and handled in accordance with our moderation policies.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section3Title", "3. Payments and Billing Information")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.paymentsText1", "PipeKeeper does not store or process payment card details.")}
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong className="text-white">{t("privacyPolicy.iosLabel", "iOS:")}</strong> {t("privacyPolicy.iosText", "Subscriptions are processed by Apple through the App Store's In-App Purchase system.")}
        </li>
        <li>
          <strong className="text-white">{t("privacyPolicy.webAndroidLabel", "Web and Android:")}</strong> {t("privacyPolicy.webAndroidText", "Subscriptions are processed securely by third-party payment providers.")}
        </li>
      </ul>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.paymentsText2", "PipeKeeper stores only limited identifiers required to manage subscription status and access.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section4Title", "4. How We Use Your Information")}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>{t("privacyPolicy.use1", "Operate and maintain the Service")}</li>
        <li>{t("privacyPolicy.use2", "Display your collection and journal data to you")}</li>
        <li>{t("privacyPolicy.use3", "Provide Premium features and subscription access")}</li>
        <li>{t("privacyPolicy.use4", "Improve functionality, performance, and reliability")}</li>
        <li>{t("privacyPolicy.use5", "Enforce our Terms of Service and community standards")}</li>
        <li>{t("privacyPolicy.use6", "Respond to support requests and abuse reports")}</li>
      </ul>
      <p className="mt-3 leading-relaxed">{t("privacyPolicy.noSellData", "PipeKeeper does not sell personal data.")}</p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section5Title", "5. How We Share Information")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.shareIntro", "We may share information only in limited circumstances, including:")}
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong className="text-white">{t("privacyPolicy.serviceProvidersLabel", "Service providers:")}</strong> {t("privacyPolicy.serviceProvidersText", "vendors that support hosting, analytics, or payment processing.")}
        </li>
        <li>
          <strong className="text-white">{t("privacyPolicy.legalSafetyLabel", "Legal and safety:")}</strong> {t("privacyPolicy.legalSafetyText", "when required to comply with law or protect rights, safety, or security.")}
        </li>
        <li>
          <strong className="text-white">{t("privacyPolicy.businessChangesLabel", "Business changes:")}</strong> {t("privacyPolicy.businessChangesText", "in the event of a merger, acquisition, or asset sale.")}
        </li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section6Title", "6. Data Retention and Account Termination")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.dataRetentionText", "You may delete your account at any time. Upon deletion, personal data and User-Generated Content will be removed or anonymized in accordance with applicable law, except where retention is required for legal or security purposes.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section7Title", "7. Security")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.securityText", "We use reasonable safeguards designed to protect information, but no system is completely secure. You are responsible for maintaining the security of your account credentials.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section8Title", "8. Your Choices")}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>{t("privacyPolicy.choice1", "Access and update your account information within the app")}</li>
        <li>
          {t("privacyPolicy.choice2", "Request deletion of your account and associated data via support, subject to applicable requirements")}
        </li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section9Title", "9. Children")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.childrenText", "The Service is intended for adult users only and is not directed to children. Do not use the Service if you are under the age required by law.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section10Title", "10. Changes to This Policy")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.changesText", "We may update this Privacy Policy from time to time. If changes are material, we will take reasonable steps to notify users, such as by posting within the Service.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("privacyPolicy.section11Title", "11. Contact and Reporting")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("privacyPolicy.contactText", "If you have questions about this Privacy Policy, wish to report objectionable content, or need assistance with your account, please contact PipeKeeper support.")}
      </p>

      <p className="mt-10 text-sm text-[#cdbfae]">
        {t("privacyPolicy.relatedDocuments", "Related documents:")}{" "}
        <a className="underline text-[#f3e7d3] hover:text-white" href="/terms">
          {t("privacyPolicy.termsOfService", "Terms of Service")}
        </a>{" "}
        ·{" "}
        <a className="underline text-[#f3e7d3] hover:text-white" href="/faq">
          {t("privacyPolicy.faq", "FAQ")}
        </a>
      </p>
    </div>
  );
}