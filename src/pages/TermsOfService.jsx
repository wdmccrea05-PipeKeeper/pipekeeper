import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
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
            <CardTitle className="text-3xl text-stone-900">Terms of Service</CardTitle>
            <p className="text-stone-600 mt-2">Last updated: January 2, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-stone max-w-none text-stone-800 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using PipeKeeper ("the Service"), you accept and agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">2. Description of Service</h2>
              <p>
                PipeKeeper provides digital tools for managing and organizing your pipe and tobacco collection. Features include: 
                collection management, AI-powered recommendations and identification, community features (profiles, following, 
                comments, messaging), and premium subscription services. <strong>Important:</strong> We do not sell tobacco products, 
                facilitate tobacco sales, or verify age for tobacco purchases. This is an informational and collection management 
                service only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">3. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">4. User Content & Community Guidelines</h2>
              <p className="mb-3">
                You retain ownership of the content you create. By using our service, you grant us a license to store and 
                display your content as necessary to provide our services.
              </p>
              <p className="mb-2"><strong>Prohibited Content:</strong> You may not post content that:</p>
              <ul className="list-disc pl-6 space-y-1 mb-3">
                <li>Harasses, threatens, or bullies other users</li>
                <li>Contains hate speech, discrimination, or violence</li>
                <li>Infringes on intellectual property rights</li>
                <li>Contains spam, advertising, or solicitations</li>
                <li>Is sexually explicit, obscene, or otherwise inappropriate</li>
                <li>Violates any applicable law</li>
              </ul>
              <p className="mb-3">
                <strong>Reporting & Enforcement:</strong> Users can report inappropriate content or users via the Report button. 
                All reports are reviewed by administrators. We reserve the right to remove content, hide comments, suspend accounts, 
                or terminate access for violations. Repeat offenders will have their accounts permanently terminated. For questions 
                or appeals, contact us via the <a href={createPageUrl('Support')} className="text-amber-600 hover:text-amber-700">Support Page</a>.
              </p>
              <p>
                <strong>Blocking Users:</strong> You can block other users to prevent them from seeing your profile or messaging you. 
                Blocked users cannot comment on your content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">5. AI Features Disclaimer</h2>
              <p>
                AI-powered recommendations, identifications, value estimates, and search results are provided for informational 
                purposes only. They are not professional advice and may be inaccurate, incomplete, or outdated. We make no guarantees 
                about AI accuracy. Always verify critical information (especially valuations and identifications) through independent 
                sources or professional appraisers. You use AI features at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">6. Subscriptions and Billing</h2>
              <p className="mb-3">
                Premium features require a paid subscription ($1.99/month or $19.99/year). Subscriptions renew automatically until canceled. 
                You can cancel anytime; access continues until the end of your billing period. Refunds are not provided for partial billing periods.
              </p>
              <p>
                <strong>Subscriptions:</strong> Subscription availability and billing methods may vary by platform. In companion apps,
                purchase flows may be unavailable. If you already have an active subscription, sign in to access premium features.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">7. Account Deletion</h2>
              <p>
                You may request account deletion at any time through Profile → Delete Account. This immediately removes your content 
                (pipes, blends, logs, messages, comments, connections). Your authentication record is marked for deletion and fully 
                removed within 30 days. Backups may retain data for up to 90 days for disaster recovery purposes only. For questions 
                about account deletion, contact us via the <a href={createPageUrl('Support')} className="text-amber-600 hover:text-amber-700">Support Page</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">8. Prohibited Use</h2>
              <p>
                You agree not to misuse our services, including attempting to access unauthorized areas, interfering with other users, 
                posting prohibited content (see Section 4), or violating community guidelines.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">9. Limitation of Liability</h2>
              <p>
                The Service is provided "as is" without warranties of any kind. We shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">10. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of material changes 
                via email or through the Service. Continued use after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">11. Contact</h2>
              <p>
                For questions about these Terms, community guidelines, or to report issues, visit our <a href={createPageUrl('Support')} className="text-amber-600 hover:text-amber-700">Support Page</a> or 
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