import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function TermsOfService() {
  const P = ({ children }) => <p className="text-[#e8d5b7]/90 leading-relaxed my-3">{children}</p>;
  const H2 = ({ children }) => <h2 className="text-2xl font-semibold text-[#e8d5b7] mt-6 mb-3">{children}</h2>;

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
        PipeKeeper is a collection-management and informational app for tracking pipes, tobacco blends, and related
        hobby/collection data. PipeKeeper does not sell tobacco products and does not process tobacco orders.
      </P>

      <H2>2. Eligibility</H2>
      <P>
        You must be legally able to form a binding contract in your jurisdiction to use the Service. You are responsible
        for complying with all applicable laws where you live.
      </P>

      <H2>3. Accounts</H2>
      <P>
        You are responsible for maintaining the confidentiality of your account and for all activity under your account.
        You agree to provide accurate information and to keep your account information updated.
      </P>

      <H2>4. Subscriptions, Premium Features, and Trials</H2>
      <P>
        PipeKeeper may offer Premium features via subscription. We may also offer limited trial access. The availability
        of Premium features and any trial timing will be displayed in the app.
      </P>
      <P>
        <b>Subscriptions are purchased on the web.</b> Subscriptions are processed by a third-party payment processor.
        Subscription management (upgrade, cancel, invoices, and payment method updates) is handled through a secure customer
        portal accessible from the app's Profile area.
      </P>

      <H2>5. Billing and Refunds</H2>
      <P>
        Web subscriptions are handled through our third-party payment processor and support team. Refund eligibility is outlined during checkout and may vary. For billing questions or refund requests, contact support.
      </P>

      <H2>6. Acceptable Use</H2>
      <P>
        You agree not to misuse the Service, including attempting to access accounts you do not own, reverse engineer or
        disrupt the Service, scrape the Service at scale, or use the Service for illegal activities.
      </P>

      <H2>7. Content and User Data</H2>
      <P>
        You retain ownership of your content and collection data you submit to the Service. You grant us the limited
        rights needed to operate the Service (e.g., hosting, processing, and displaying your data to you).
      </P>

      <H2>8. Disclaimers</H2>
      <P>
        The Service is provided "as is" and "as available." PipeKeeper may include AI-based features that provide
        best-effort suggestions and may be inaccurate. PipeKeeper is not responsible for decisions you make based on the
        Service.
      </P>

      <H2>9. Limitation of Liability</H2>
      <P>
        To the fullest extent permitted by law, PipeKeeper and its affiliates will not be liable for indirect,
        incidental, special, consequential, or punitive damages, or any loss of data, profits, or revenue.
      </P>

      <H2>10. Changes</H2>
      <P>
        We may update these Terms from time to time. If changes are material, we will take reasonable steps to notify you
        (for example, by posting within the Service). Continued use means you accept the updated Terms.
      </P>

      <H2>11. Contact</H2>
      <P>
        Policy links:
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