import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { isIOSCompanionApp } from "@/components/utils/companion";

export default function PrivacyPolicyPage() {
  const inCompanion = isIOSCompanionApp();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <a href={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </a>

        <Card className="border-[#e8d5b7]/30">
          <CardHeader>
            <CardTitle className="text-3xl text-stone-900">Privacy Policy</CardTitle>
            <p className="text-stone-600 mt-2">Last updated: January 2, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-stone max-w-none text-stone-800 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">1. Information We Collect</h2>
              <p>
                We collect the following types of information:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Email, display name, and authentication data when you create an account or sign in via third-party providers (Google, Microsoft, Facebook, or Apple if available).</li>
                <li><strong>Collection Data:</strong> Information about your pipes, tobacco blends, smoking logs, ratings, notes, and photos you upload.</li>
                <li><strong>Community & UGC:</strong> Public profile information (display name, bio, avatar, location if enabled), comments you post on other users' collections, friend connections, and messages you send.</li>
                <li><strong>AI Processing Data:</strong> Content you submit to our AI features (search queries, photos, prompts) is sent to third-party AI providers for processing. <strong>Warning:</strong> Do not submit sensitive personal information through AI features.</li>
                <li><strong>Payment Information:</strong> Subscription and billing data handled securely by Stripe. We do not store credit card numbers.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide core collection management features</li>
                <li>Generate AI-powered pairing recommendations, value lookups, and photo identification</li>
                <li>Enable community features (profiles, following, comments, messaging)</li>
                <li>Process subscription payments via Stripe</li>
                <li>Send service-related notifications</li>
                <li>Investigate abuse reports and enforce community guidelines</li>
                <li>Analyze usage patterns to improve user experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">3. Information Sharing</h2>
              <p>
                We do not sell your personal information. Information may be shared in the following ways:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Third-Party Service Providers:</strong> AI providers (for AI features), Stripe (for payment processing), cloud hosting providers (for data storage).</li>
                <li><strong>Public Community:</strong> If you make your profile public, your display name, bio, avatar, location (if enabled), pipes, tobacco, and logs are visible to other users.</li>
                <li><strong>External Web Lookups:</strong> When using AI search features, we fetch content from third-party websites (tobacco reviews, manufacturer info, market data). We do not control these external sources.</li>
                <li><strong>Legal Compliance:</strong> If required by law or to protect our rights and users' safety.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">4. Data Storage and Security</h2>
              <p>
                We use industry-standard security measures to protect your data, including encrypted connections, 
                secure cloud storage, and access controls. Your data is stored on cloud infrastructure with encryption 
                in transit and at rest. However, no system is 100% secure. You are responsible for maintaining the 
                confidentiality of your account credentials.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">5. AI Processing & External Lookups</h2>
              <p className="mb-3">
                <strong>AI Features:</strong> When you use AI-powered features (pairing, photo ID, value lookup, search), 
                your content (text, images) is sent to third-party AI providers for processing. These providers may retain 
                data according to their own policies. <strong>Warning:</strong> Do not submit sensitive personal information, 
                financial data, or confidential content through AI features.
              </p>
              <p>
                <strong>External Web Lookups:</strong> Our AI search features fetch content from third-party websites 
                (tobacco reviews, manufacturer info, market data). We do not control or endorse these external sources. 
                Information retrieved may be inaccurate or outdated.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">6. Payment Processing</h2>
              {inCompanion ? (
                <p>
                  The iOS companion app does not process purchases. If your account already has an active Premium subscription, 
                  Premium features will unlock automatically after you sign in.
                </p>
              ) : (
                <p>
                  Premium subscriptions are processed via Stripe. Stripe collects and processes your payment information 
                  securely. We do not store credit card numbers. Billing data (subscription status, amount, renewal dates) 
                  is stored in our system.
                </p>
              )}
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">7. Cookies and Tracking</h2>
              <p>
                We use cookies and similar technologies to maintain your session, remember preferences, and improve our services. 
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">8. Your Rights & Data Retention</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1 mb-3">
                <li>Access and download your data</li>
                <li>Update or correct your information</li>
                <li>Delete your account and content (see Account Deletion below)</li>
                <li>Make your profile public or private</li>
                <li>Disable comments or messaging</li>
                <li>Block other users</li>
              </ul>
              <p>
                <strong>Account Deletion:</strong> You can initiate account deletion in-app via Profile → Delete Account. 
                This immediately removes your content (pipes, blends, logs, messages, comments, connections). Your authentication 
                record is marked for deletion and fully removed within 30 days. Backups may retain data for an additional 90 days 
                for disaster recovery purposes only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">9. Age Requirements & Tobacco Disclaimer</h2>
              <p>
                PipeKeeper is intended for adults only. By using this service, you confirm that you are of legal age to 
                purchase and use tobacco products in your jurisdiction. We do not sell tobacco, facilitate tobacco sales, 
                or verify age for tobacco purchases. This service is solely for collection management and informational purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">10. User-Generated Content & Moderation</h2>
              <p>
                When you post comments, create public profiles, or send messages, you are creating user-generated content (UGC). 
                We may review UGC to enforce our Terms of Service and community guidelines. You can report inappropriate content 
                or users via the Report button. Abuse reports are stored and reviewed by administrators. Repeated violations may 
                result in account suspension or termination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">12. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, privacy concerns, or wish to exercise your rights, 
                contact us at: <a href={createPageUrl('Support')} className="text-amber-600 hover:text-amber-700">Support Page</a> or 
                email hello@pipekeeper.app
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-stone-200">
              <p className="text-sm text-stone-600">
                © 2026 PipeKeeper. All rights reserved.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}