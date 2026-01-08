import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function TermsOfService() {
  const P = ({ children }) => <p className="text-[#e8d5b7]/90 leading-relaxed my-3">{children}</p>;
  const H2 = ({ children }) => <h2 className="text-2xl font-semibold text-[#e8d5b7] mt-6 mb-3">{children}</h2>;
  const LI = ({ children }) => <li className="text-[#e8d5b7]/90 mb-2">{children}</li>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-[#e8d5b7] mb-2">PipeKeeper Terms of Service</h1>
        <div className="text-[#e8d5b7]/70 mb-8">Last updated: January 2026</div>

        <P>
          These Terms of Service ("Terms") govern your access to and use of PipeKeeper (the "Service"). By using the
          Service, you agree to these Terms.
        </P>

        <H2>1. The Service</H2>
        <P>
          PipeKeeper is a collection-management and informational application for tracking pipes, tobacco blends, accessories, and related hobby data. PipeKeeper does not sell tobacco products, does not facilitate tobacco purchases, and does not process tobacco orders.
        </P>

        <H2>2. Eligibility</H2>
        <P>
          You must be legally able to form a binding contract in your jurisdiction to use the Service. You are solely responsible for complying with all applicable local, state, and national laws related to tobacco ownership, possession, and usage.
        </P>

        <H2>3. Accounts</H2>
        <P>
          You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to provide accurate, current information and to keep your account information updated.
        </P>

        <H2>4. Subscriptions, Premium Features, and Trials</H2>
        <P>
          PipeKeeper may offer Premium features through paid subscriptions. Limited trial access may also be offered and will be clearly displayed within the app.
        </P>
        <P>
          All subscriptions are purchased via PipeKeeper's web platform and are processed by a secure third-party payment processor. Subscription management—including upgrades, cancellations, invoices, and payment method updates—is handled through a secure customer portal accessible from the app's Profile section.
        </P>
        <P>
          PipeKeeper does not use Apple In-App Purchases or Google Play Billing for subscriptions.
        </P>

        <H2>5. Billing and Refunds</H2>
        <P>
          Billing for subscriptions is handled by our third-party payment processor. Refund eligibility and billing terms are disclosed during checkout and may vary. For billing questions, cancellations, or refund requests, please contact PipeKeeper support.
        </P>

        <H2>6. Acceptable Use</H2>
        <P>You agree not to misuse the Service, including but not limited to:</P>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <LI>Accessing accounts you do not own</LI>
          <LI>Attempting to bypass security features</LI>
          <LI>Reverse engineering or disrupting the Service</LI>
          <LI>Automated scraping or bulk data extraction</LI>
          <LI>Using the Service for unlawful purposes</LI>
        </ul>

        <H2>7. User-Generated Content and Community Standards</H2>
        <P>
          PipeKeeper allows users to submit and manage content such as notes, reviews, comments, images, collection details, and other hobby-related data ("User-Generated Content").
        </P>
        <P>
          PipeKeeper has zero tolerance for objectionable content or abusive behavior, including but not limited to:
        </P>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <LI>Harassment, threats, or hate speech</LI>
          <LI>Obscene, pornographic, or sexually explicit content</LI>
          <LI>Content promoting violence, illegal activity, or self-harm</LI>
          <LI>Impersonation, spam, or misleading content</LI>
        </ul>
        <P>
          We reserve the right to moderate, remove, restrict, or permanently delete content or accounts that violate these standards, with or without notice.
        </P>
        <P>
          Users may report objectionable content or abusive behavior through in-app reporting tools or by contacting support.
        </P>

        <H2>8. Ownership and Data Rights</H2>
        <P>
          You retain ownership of your User-Generated Content and personal collection data. You grant PipeKeeper a limited, non-exclusive license to store, process, and display your content solely for the purpose of operating and improving the Service.
        </P>

        <H2>9. Disclaimers</H2>
        <P>
          The Service is provided "as is" and "as available." PipeKeeper may include AI-assisted features that provide best-effort suggestions and insights. These features may be inaccurate and should not be relied upon as professional, financial, or legal advice.
        </P>

        <H2>10. Limitation of Liability</H2>
        <P>
          To the fullest extent permitted by law, PipeKeeper and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of data, profits, or revenue arising from use of the Service.
        </P>

        <H2>11. Changes to These Terms</H2>
        <P>
          We may update these Terms periodically. Material changes will be communicated within the Service or via posted updates. Continued use of the Service constitutes acceptance of the updated Terms.
        </P>

        <H2>12. Contact</H2>
        <P>
          For questions, concerns, or to report violations, please contact PipeKeeper support.
        </P>
        <P>
          Related Policies:
          <ul className="mt-2 space-y-1">
            <li>
              <Link to={createPageUrl('PrivacyPolicy')} className="text-[#8b3a3a] hover:text-[#a94747] underline">Privacy Policy</Link>
            </li>
            <li>
              <Link to={createPageUrl('FAQ')} className="text-[#8b3a3a] hover:text-[#a94747] underline">FAQ</Link>
            </li>
          </ul>
        </P>
      </div>
    </div>
  );
}