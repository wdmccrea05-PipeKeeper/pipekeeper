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
        {t("termsOfService.title", "Terms of Service")}
      </h1>
      <p className="mt-2 text-sm text-[#cdbfae]">{t("termsOfService.lastUpdated", "Last updated: January 2026")}</p>

      <p className="mt-6 leading-relaxed">
        {t("termsOfService.intro", "These Terms of Service (\"Terms\") govern your access to and use of PipeKeeper (the \"Service\"). By using the Service, you agree to these Terms.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section1Title", "1. The Service")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section1Text", "PipeKeeper is an adult-focused collection-management and informational application designed to help users catalog, organize, and document pipes, cellar inventories, accessories, and related collection data. PipeKeeper does not sell tobacco products, does not facilitate tobacco purchases, and does not process tobacco orders.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section2Title", "2. Eligibility")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section2Text", "You must be legally able to form a binding contract in your jurisdiction to use the Service. You are solely responsible for complying with all applicable local, state, and national laws related to the ownership and possession of items documented within the Service.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section3Title", "3. Accounts")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section3Text", "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to provide accurate, current information and to keep your account information updated.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">
        {t("termsOfService.section4Title", "4. Subscriptions, Premium Features, and Trials")}
      </h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section4Text1", "PipeKeeper may offer optional Premium features through paid subscriptions. Limited trial access may be offered and will be clearly displayed within the Service when applicable.")}
      </p>
      <p className="mt-3 leading-relaxed">{t("termsOfService.section4Text2", "Subscription processing depends on the platform you use:")}</p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong className="text-white">{t("termsOfService.section4IosLabel", "iOS:")}</strong> {t("termsOfService.section4IosText", "Subscriptions are processed through Apple's App Store In-App Purchase system and managed via your Apple ID.")}
        </li>
        <li>
          <strong className="text-white">{t("termsOfService.section4WebLabel", "Web and Android:")}</strong> {t("termsOfService.section4WebText", "Subscriptions are processed by PipeKeeper through secure third-party payment providers and managed through your account profile.")}
        </li>
      </ul>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section4Text3", "Subscription features, pricing, and availability may vary by platform.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section5Title", "5. Billing and Refunds")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section5Text", "Billing and refund handling depend on the platform used to purchase a subscription. iOS purchases are subject to Apple's billing and refund policies. Web and Android purchases are subject to the terms disclosed at checkout.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section6Title", "6. Acceptable Use")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section6Intro", "You agree not to misuse the Service, including but not limited to:")}
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>{t("termsOfService.section6Item1", "Accessing accounts you do not own")}</li>
        <li>{t("termsOfService.section6Item2", "Attempting to bypass security features")}</li>
        <li>{t("termsOfService.section6Item3", "Reverse engineering or disrupting the Service")}</li>
        <li>{t("termsOfService.section6Item4", "Automated scraping or bulk data extraction")}</li>
        <li>{t("termsOfService.section6Item5", "Using the Service for unlawful purposes")}</li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold text-white">
        {t("termsOfService.section7Title", "7. User-Generated Content and Community Standards")}
      </h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section7Text1", "PipeKeeper allows users to submit and manage content such as notes, comments, images, collection details, and other related data (\"User-Generated Content\").")}
      </p>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section7Text2", "PipeKeeper has zero tolerance for objectionable content or abusive behavior, including but not limited to:")}
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>{t("termsOfService.section7Item1", "Harassment, threats, or hate speech")}</li>
        <li>{t("termsOfService.section7Item2", "Obscene, pornographic, or sexually explicit content")}</li>
        <li>{t("termsOfService.section7Item3", "Content promoting violence, illegal activity, or self-harm")}</li>
        <li>{t("termsOfService.section7Item4", "Impersonation, spam, or misleading content")}</li>
      </ul>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section7Text3", "We reserve the right to moderate, remove, restrict, or permanently delete content or accounts that violate these standards, with or without notice. Users may report objectionable content or abusive behavior through in-app reporting tools or by contacting support.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section8Title", "8. Ownership and Data Rights")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section8Text", "You retain ownership of your User-Generated Content and personal collection data. You grant PipeKeeper a limited, non-exclusive license to store, process, and display your content solely for the purpose of operating and improving the Service.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section9Title", "9. Disclaimers")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section9Text", "The Service is provided \"as is\" and \"as available.\" PipeKeeper may include optional AI-assisted features that provide best-effort organizational suggestions and insights. These features may be imperfect and should not be relied upon as professional, financial, or legal advice.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section10Title", "10. Limitation of Liability")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section10Text", "To the fullest extent permitted by law, PipeKeeper and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of data, profits, or revenue arising from use of the Service.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section11Title", "11. Changes to These Terms")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section11Text", "We may update these Terms periodically. Material changes will be communicated within the Service or via posted updates. Continued use of the Service constitutes acceptance of the updated Terms.")}
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">{t("termsOfService.section12Title", "12. Contact")}</h2>
      <p className="mt-3 leading-relaxed">
        {t("termsOfService.section12Text", "For questions, concerns, or to report violations, please contact PipeKeeper support.")}
      </p>

      <p className="mt-10 text-sm text-[#cdbfae]">
        {t("termsOfService.relatedPolicies", "Related policies:")}{" "}
        <a className="underline text-[#f3e7d3] hover:text-white" href={createPageUrl("PrivacyPolicy")}>
          {t("termsOfService.privacyPolicy", "Privacy Policy")}
        </a>{" "}
        ·{" "}
        <a className="underline text-[#f3e7d3] hover:text-white" href={createPageUrl("FAQFull")}>
          {t("termsOfService.faq", "FAQ")}
        </a>
      </p>
    </div>
  );
}