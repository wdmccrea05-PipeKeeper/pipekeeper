import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function TermsOfService() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 text-[#f3e7d3]">
      <h1 className="text-4xl font-semibold tracking-tight text-white">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-[#cdbfae]">Last updated: January 2026</p>

      <p className="mt-6 leading-relaxed">
        These Terms of Service ("Terms") govern your access to and use of PipeKeeper (the
        "Service"). By using the Service, you agree to these Terms.
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">1. The Service</h2>
      <p className="mt-3 leading-relaxed">
        PipeKeeper is an adult-focused collection-management and informational application
        designed to help users catalog, organize, and document pipes, cellar inventories,
        accessories, and related collection data. PipeKeeper does not sell tobacco products,
        does not facilitate tobacco purchases, and does not process tobacco orders.
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">2. Eligibility</h2>
      <p className="mt-3 leading-relaxed">
        You must be legally able to form a binding contract in your jurisdiction to use the
        Service. You are solely responsible for complying with all applicable local, state,
        and national laws related to the ownership and possession of items documented within
        the Service.
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">3. Accounts</h2>
      <p className="mt-3 leading-relaxed">
        You are responsible for maintaining the confidentiality of your account credentials
        and for all activity that occurs under your account. You agree to provide accurate,
        current information and to keep your account information updated.
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">
        4. Subscriptions, Premium Features, and Trials
      </h2>
      <p className="mt-3 leading-relaxed">
        PipeKeeper may offer optional Premium features through paid subscriptions. Limited
        trial access may be offered and will be clearly displayed within the Service when
        applicable.
      </p>
      <p className="mt-3 leading-relaxed">Subscription processing depends on the platform you use:</p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong className="text-white">iOS:</strong> Subscriptions are processed through
          Apple's App Store In-App Purchase system and managed via your Apple ID.
        </li>
        <li>
          <strong className="text-white">Web and Android:</strong> Subscriptions are processed
          by PipeKeeper through secure third-party payment providers and managed through your
          account profile.
        </li>
      </ul>
      <p className="mt-3 leading-relaxed">
        Subscription features, pricing, and availability may vary by platform.
      </p>

      <h2 className="mt-10 text-2xl font-semibold text-white">5. Billing and Refunds</h2>
      <p className="mt-3 leading-relaxed">
        Billing and refund handling depend on the platform used to purchase a subscription.
        iOS purchases are subject to Apple's billing and refund policies. Web and Android
        purchases are subject to the terms disclosed at checkout.
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