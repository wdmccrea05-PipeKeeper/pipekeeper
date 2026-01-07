import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function PrivacyPolicy() {
  const P = ({ children }) => <p style={{ lineHeight: 1.7, margin: "10px 0" }}>{children}</p>;
  const H2 = ({ children }) => <h2 style={{ marginTop: 22 }}>{children}</h2>;
  const LI = ({ children }) => <li style={{ marginBottom: 6 }}>{children}</li>;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ margin: "0 0 6px 0" }}>PipeKeeper Privacy Policy</h1>
      <div style={{ opacity: 0.8, marginBottom: 18 }}>Last updated: January 2026</div>

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

      <H2>2. Payments and Subscription Data</H2>
      <P>
        If you purchase a subscription on the web, payments are processed by a third-party payment processor. We do not
        store full payment card numbers. We may store limited billing identifiers (for example, a customer ID or
        subscription ID) to confirm subscription status and provide account support.
      </P>
      <P>
        If you purchase through Apple App Store or Google Play, billing is handled by that platform. We may receive or
        store limited entitlement/status signals needed to enable Premium features.
      </P>

      <H2>3. How We Use Information</H2>
      <ul style={{ marginTop: 8 }}>
        <LI>Provide and operate the Service (account access, syncing, core features).</LI>
        <LI>Enable Premium features and verify subscription status.</LI>
        <LI>Maintain, troubleshoot, and improve performance and security.</LI>
        <LI>Respond to support requests and communicate about updates.</LI>
      </ul>

      <H2>4. How We Share Information</H2>
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

      <H2>5. Data Retention</H2>
      <P>
        We retain information as long as needed to provide the Service and for legitimate business purposes (e.g.,
        compliance, dispute resolution). You may request deletion subject to legal and operational limits.
      </P>

      <H2>6. Security</H2>
      <P>
        We use reasonable safeguards designed to protect information, but no system is 100% secure. You are responsible
        for maintaining the security of your account credentials.
      </P>

      <H2>7. Your Choices</H2>
      <ul style={{ marginTop: 8 }}>
        <LI>Access and update your account information within the app where available.</LI>
        <LI>Request deletion of your account and associated data via support, subject to applicable requirements.</LI>
      </ul>

      <H2>8. Children</H2>
      <P>The Service is not directed to children. Do not use the Service if you are under the age required by law.</P>

      <H2>9. Changes</H2>
      <P>
        We may update this Privacy Policy. If changes are material, we will take reasonable steps to notify you (for
        example, by posting within the Service).
      </P>

      <H2>10. Contact</H2>
      <P>
        Related documents:
        <ul style={{ marginTop: 8 }}>
          <li>
            <Link to={createPageUrl('TermsOfService')}>Terms of Service</Link>
          </li>
          <li>
            <Link to={createPageUrl('FAQ')}>FAQ</Link>
          </li>
        </ul>
      </P>
    </div>
  );
}