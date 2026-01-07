import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function FAQ() {
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: "0 0 10px 0" }}>{title}</h2>
      <div style={{ lineHeight: 1.6 }}>{children}</div>
    </div>
  );

  const Q = ({ q, children }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{q}</div>
      <div>{children}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ margin: "0 0 16px 0" }}>PipeKeeper FAQ</h1>

      <Section title="General">
        <Q q="What is PipeKeeper?">
          PipeKeeper helps you track your pipes, tobaccos, cellared tins, and smoking sessions—plus optional tools like
          pairing suggestions, collection insights, and reports.
        </Q>

        <Q q="Does PipeKeeper sell tobacco or facilitate tobacco sales?">
          No. PipeKeeper is a tracking and informational app. We do not sell tobacco products, process tobacco orders, or
          arrange shipments.
        </Q>
      </Section>

      <Section title="Accounts & Data">
        <Q q="Do I need an account?">
          Yes. Creating an account allows your collection and settings to be saved and synced across devices.
        </Q>

        <Q q="Can I export my data?">
          Yes. If export tools are enabled for your account, you can generate CSV/PDF reports from the app.
        </Q>
      </Section>

      <Section title="Premium, Trials & Subscriptions">
        <Q q="What is included in Premium?">
          Premium includes advanced tools such as enhanced pairing/optimization features, deeper reporting/export options,
          and other upgraded capabilities shown on the Subscription screen.
        </Q>

        <Q q="Is there a free trial?">
          PipeKeeper may offer a limited trial window that temporarily enables Premium features. If a trial is active for
          your account, the app will display the remaining time in the Subscription area.
        </Q>

        <Q q="How do I subscribe?">
          Subscriptions can be purchased on the web (through the in-app checkout flow) and/or through platform storefronts
          depending on how you installed PipeKeeper.
        </Q>

        <Q q="How do I manage, change, or cancel my subscription?">
          <div style={{ marginBottom: 8 }}>
            Management depends on where you originally subscribed:
          </div>
          <ul style={{ marginTop: 0, marginBottom: 10 }}>
            <li>
              <b>Apple App Store purchase:</b> Manage in iOS: <i>Settings → Apple ID → Subscriptions</i>.
            </li>
            <li>
              <b>Google Play purchase:</b> Manage in Play Store: <i>Payments &amp; subscriptions → Subscriptions</i>.
            </li>
            <li>
              <b>Web purchase:</b> Use the in-app subscription management link from your <b>Profile</b> (it opens your
              customer portal).
            </li>
          </ul>
          If you don't see a management link in the app, you can also contact support and we'll help point you to the
          correct place based on your account.
        </Q>

        <Q q="I already paid—when do Premium features activate?">
          If your account shows <b>Paid</b> status (for example, your account subscription level is marked as paid),
          Premium features are available immediately unless the app is currently in a time-limited testing window. If a
          testing window is active, the app will display the timing and your access level in the Subscription screen.
        </Q>

        <Q q="Refunds and billing questions">
          Refund eligibility and timing depend on where you purchased your subscription:
          <ul style={{ marginTop: 8 }}>
            <li>App Store purchases follow Apple's refund policies.</li>
            <li>Google Play purchases follow Google's refund policies.</li>
            <li>Web purchases are handled through our payment processor and support team per the Terms of Service.</li>
          </ul>
        </Q>
      </Section>

      <Section title="AI Features & Accuracy">
        <Q q="Are AI recommendations guaranteed to be correct?">
          No. AI features provide best-effort suggestions and may be incomplete or inaccurate. You should use your own
          judgment and verify important information from reliable sources.
        </Q>

        <Q q="Does PipeKeeper provide medical or professional advice?">
          No. PipeKeeper provides informational tools for hobby and collection management only.
        </Q>
      </Section>

      <Section title="Support">
        <Q q="How do I contact support?">
          Use the support link inside the app or visit{" "}
          <a href="https://pipekeeper.app" target="_blank" rel="noreferrer">
            pipekeeper.app
          </a>
          . You can also review our policies here:
          <ul style={{ marginTop: 8 }}>
            <li>
              <Link to={createPageUrl('TermsOfService')}>Terms of Service</Link>
            </li>
            <li>
              <Link to={createPageUrl('PrivacyPolicy')}>Privacy Policy</Link>
            </li>
          </ul>
        </Q>
      </Section>
    </div>
  );
}