import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function PrivacyPolicy() {
  const P = ({ children }) => <p className="text-[#e8d5b7]/90 leading-relaxed my-3">{children}</p>;
  const H2 = ({ children }) => <h2 className="text-2xl font-semibold text-[#e8d5b7] mt-6 mb-3">{children}</h2>;
  const LI = ({ children }) => <li className="text-[#e8d5b7]/90 mb-2">{children}</li>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-[#e8d5b7] mb-2">PipeKeeper Privacy Policy</h1>
        <div className="text-[#e8d5b7]/70 mb-8">Last updated: January 2026</div>

      <P>
        This Privacy Policy explains how PipeKeeper ("we," "us") collects, uses, and shares information when you use the
        PipeKeeper app and related services (the "Service").
      </P>

      <H2>1. Information We Collect</H2>
      <ul style={{ marginTop: 8 }}>
        <LI>
          <b>Account information:</b> such as email address and basic profile details needed to operate your account.
        </LI>
        <LI>
          <b>Collection data you provide:</b> pipes, tobaccos, notes, photos you upload, and usage logs.
        </LI>
        <LI>
          <b>Device/usage data:</b> basic analytics or diagnostic information (e.g., crash logs) to maintain and improve
          the Service.
        </LI>
      </ul>

      <H2>2. User-Generated Content and Moderation</H2>
      <P>
        PipeKeeper allows users to create, upload, and manage content such as notes, descriptions, images, reviews, and collection data ("User-Generated Content").
      </P>
      <P>
        PipeKeeper does not permit objectionable, abusive, or harmful content. We reserve the right to review, moderate, restrict, remove, or delete User-Generated Content or user accounts that violate our Terms of Service, applicable laws, or community standards.
      </P>
      <P>
        Users may report objectionable content or abusive behavior by contacting PipeKeeper support. Reported content is reviewed and handled in accordance with our moderation policies.
      </P>

      <H2>3. Payments and Billing Information</H2>
      <P>
        PipeKeeper does not store or process payment card details. Subscription payments are handled securely by a third-party payment processor. PipeKeeper only stores limited identifiers required to manage subscription status and access.
      </P>

      <H2>4. How We Use Your Information</H2>
      <P>We use your information to:</P>
      <ul style={{ marginTop: 8 }}>
        <LI>Operate and maintain the Service</LI>
        <LI>Display your collection data to you</LI>
        <LI>Provide Premium features and subscription access</LI>
        <LI>Improve functionality, performance, and reliability</LI>
        <LI>Enforce our Terms of Service and community standards</LI>
        <LI>Respond to support inquiries and abuse reports</LI>
      </ul>
      <P>
        PipeKeeper does not sell personal data.
      </P>

      <H2>5. How We Share Information</H2>
      <P>We may share information in limited circumstances:</P>
      <ul style={{ marginTop: 8 }}>
        <LI>
          <b>Service providers:</b> vendors that help us run the Service (hosting, analytics, payment processing).
        </LI>
        <LI>
          <b>Legal and safety:</b> if required to comply with law or to protect rights, safety, and security.
        </LI>
        <LI>
          <b>Business changes:</b> if the Service is involved in a merger, acquisition, or asset sale.
        </LI>
      </ul>

      <H2>6. Data Retention and Account Termination</H2>
      <P>
        You may delete your account at any time. Upon account deletion, your personal data and User-Generated Content will be removed or anonymized in accordance with applicable law, except where retention is required for legal or security purposes.
      </P>

      <H2>7. Security</H2>
      <P>
        We use reasonable safeguards designed to protect information, but no system is 100% secure. You are responsible
        for maintaining the security of your account credentials.
      </P>

      <H2>8. Your Choices</H2>
      <ul style={{ marginTop: 8 }}>
        <LI>Access and update your account information within the app where available.</LI>
        <LI>Request deletion of your account and associated data via support, subject to applicable requirements.</LI>
      </ul>

      <H2>9. Children</H2>
      <P>The Service is not directed to children. Do not use the Service if you are under the age required by law.</P>

      <H2>10. Changes</H2>
      <P>
        We may update this Privacy Policy. If changes are material, we will take reasonable steps to notify you (for
        example, by posting within the Service).
      </P>

      <H2>11. Contact and Reporting</H2>
      <P>
        If you have questions about this Privacy Policy, wish to report objectionable content, or need assistance with your account, please contact PipeKeeper support.
      </P>
      <P>
        Related documents:
        <ul className="mt-2 space-y-1">
          <li>
            <Link to={createPageUrl('TermsOfService')} className="text-[#8b3a3a] hover:text-[#a94747] underline">Terms of Service</Link>
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