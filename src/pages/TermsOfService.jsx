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
        7. User-Generated Content and Community Standards
      </h2>
      <p className="mt-3 leading-relaxed">
        PipeKeeper allows users to submit and manage content such as notes, comments, images,
        collection details, and other related data ("User-Generated Content").
      </p>
      <p className="mt-3 leading-relaxed">
        PipeKeeper has zero tolerance for objectionable content or abusive behavior,
        including but not limited to:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>Harassment, threats, or hate speech</li>
        <li>Obscene, pornographic, or sexually explicit content</li>
        <li>Content promoting violence, illegal activity, or self-harm</li>
        <li>Impersonation, spam, or misleading content</li>
      </ul>
      <p className="mt-3 leading-relaxed">
        We reserve the right to moderate, remove, restrict, or permanently delete content or
        accounts that violate these standards, with or without notice. Users may report
        objectionable content or abusive behavior through in-app reporting tools or by
        contacting support.
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">8. Ownership and Data Rights</h2>
      <p className="mt-3 leading-relaxed">
        You retain ownership of your User-Generated Content and personal collection data.
        You grant PipeKeeper a limited, non-exclusive license to store, process, and display
        your content solely for the purpose of operating and improving the Service.
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">9. Disclaimers</h2>
      <p className="mt-3 leading-relaxed">
        The Service is provided "as is" and "as available." PipeKeeper may include optional
        AI-assisted features that provide best-effort organizational suggestions and
        insights. These features may be imperfect and should not be relied upon as
        professional, financial, or legal advice.
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">10. Limitation of Liability</h2>
      <p className="mt-3 leading-relaxed">
        To the fullest extent permitted by law, PipeKeeper and its affiliates shall not be
        liable for any indirect, incidental, special, consequential, or punitive damages,
        or for loss of data, profits, or revenue arising from use of the Service.
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">11. Changes to These Terms</h2>
      <p className="mt-3 leading-relaxed">
        We may update these Terms periodically. Material changes will be communicated within
        the Service or via posted updates. Continued use of the Service constitutes
        acceptance of the updated Terms.
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">12. Contact</h2>
      <p className="mt-3 leading-relaxed">
        For questions, concerns, or to report violations, please contact PipeKeeper support.
      </p>

      <p className="mt-10 text-sm text-[#cdbfae]">
        Related policies:{" "}
        <a className="underline text-[#f3e7d3] hover:text-white" href="/privacy">
          Privacy Policy
        </a>{" "}
        ·{" "}
        <a className="underline text-[#f3e7d3] hover:text-white" href="/faq">
          FAQ
        </a>
      </p>
    </div>
  );
}