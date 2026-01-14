import React from "react";

export default function Privacy() {
  return (
    <div className="legal-container">
      <h1>Privacy Policy</h1>
      <p className="last-updated">Last updated: January 2026</p>

      <p>
        This Privacy Policy explains how PipeKeeper ("we," "us") collects, uses,
        and shares information when you use the PipeKeeper application and
        related services (the "Service").
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> such as email address and basic
          profile details required to operate your account.
        </li>
        <li>
          <strong>Collection data you provide:</strong> pipe and cellar inventory
          details, personal notes, photos you upload, and historical records
          associated with your collection.
        </li>
        <li>
          <strong>Device and usage data:</strong> limited analytics or diagnostic
          information (such as crash logs) used to maintain and improve the
          Service.
        </li>
      </ul>

      <h2>2. User-Generated Content and Moderation</h2>
      <p>
        PipeKeeper allows users to create, upload, and manage content such as
        notes, descriptions, images, and collection data ("User-Generated
        Content").
      </p>
      <p>
        PipeKeeper does <strong>not permit objectionable, abusive, or harmful
        content</strong>. We reserve the right to review, moderate, restrict,
        remove, or delete User-Generated Content or user accounts that violate
        our Terms of Service, applicable laws, or community standards.
      </p>
      <p>
        Users may report objectionable content or abusive behavior by contacting
        PipeKeeper support. Reports are reviewed and handled in accordance with
        our moderation policies.
      </p>

      <h2>3. Payments and Billing Information</h2>
      <p>
        PipeKeeper does not store or process payment card details.
      </p>
      <ul>
        <li>
          <strong>iOS:</strong> Subscriptions are processed by Apple through the
          App Store’s In-App Purchase system.
        </li>
        <li>
          <strong>Web and Android:</strong> Subscriptions are processed securely
          by third-party payment providers.
        </li>
      </ul>
      <p>
        PipeKeeper stores only limited identifiers required to manage
        subscription status and access.
      </p>

      <h2>4. How We Use Your Information</h2>
      <ul>
        <li>Operate and maintain the Service</li>
        <li>Display your collection and journal data to you</li>
        <li>Provide Premium features and subscription access</li>
        <li>Improve functionality, performance, and reliability</li>
        <li>Enforce our Terms of Service and community standards</li>
        <li>Respond to support requests and abuse reports</li>
      </ul>
      <p>PipeKeeper does not sell personal data.</p>

      <h2>5. How We Share Information</h2>
      <p>
        We may share information only in limited circumstances, including:
      </p>
      <ul>
        <li>
          <strong>Service providers:</strong> vendors that support hosting,
          analytics, or payment processing.
        </li>
        <li>
          <strong>Legal and safety:</strong> when required to comply with law or
          protect rights, safety, or security.
        </li>
        <li>
          <strong>Business changes:</strong> in the event of a merger,
          acquisition, or asset sale.
        </li>
      </ul>

      <h2>6. Data Retention and Account Termination</h2>
      <p>
        You may delete your account at any time. Upon deletion, personal data
        and User-Generated Content will be removed or anonymized in accordance
        with applicable law, except where retention is required for legal or
        security purposes.
      </p>

      <h2>7. Security</h2>
      <p>
        We use reasonable safeguards designed to protect information, but no
        system is completely secure. You are responsible for maintaining the
        security of your account credentials.
      </p>

      <h2>8. Your Choices</h2>
      <ul>
        <li>Access and update your account information within the app</li>
        <li>
          Request deletion of your account and associated data via support,
          subject to applicable requirements
        </li>
      </ul>

      <h2>9. Children</h2>
      <p>
        The Service is intended for adult users only and is not directed to
        children. Do not use the Service if you are under the age required by
        law.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. If changes are
        material, we will take reasonable steps to notify users, such as by
        posting within the Service.
      </p>

      <h2>11. Contact and Reporting</h2>
      <p>
        If you have questions about this Privacy Policy, wish to report
        objectionable content, or need assistance with your account, please
        contact PipeKeeper support.
      </p>

      <p className="legal-links">
        Related documents:{" "}
        <a href="/terms">Terms of Service</a> ·{" "}
        <a href="/faq">FAQ</a>
      </p>
    </div>
  );
}