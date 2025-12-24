import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <Card className="border-[#e8d5b7]/30">
          <CardHeader>
            <CardTitle className="text-3xl text-stone-900">Terms of Service</CardTitle>
            <p className="text-stone-600 mt-2">Last updated: December 24, 2025</p>
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
                PipeKeeper provides a digital platform for managing and tracking pipe and tobacco collections. 
                The Service includes features such as collection management, AI-powered recommendations, 
                photo identification, market valuations, and pairing suggestions.
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
              <h2 className="text-xl font-semibold text-stone-900 mb-3">4. User Content</h2>
              <p>
                You retain ownership of any content you submit to the Service, including photos, descriptions, and notes. 
                By submitting content, you grant us a license to use, store, and display that content as necessary to 
                provide the Service to you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">5. AI Features Disclaimer</h2>
              <p>
                AI-powered features including pipe identification, market valuations, and pairing suggestions are provided 
                for informational purposes only. We make no guarantees about the accuracy of AI-generated information. 
                Users should verify important information independently.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">6. Subscription and Payment</h2>
              <p>
                Premium features require a paid subscription. Subscriptions automatically renew unless canceled. 
                You may cancel your subscription at any time through your account settings. Refunds are provided 
                in accordance with our refund policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">7. Prohibited Uses</h2>
              <p>
                You may not use the Service to: (a) violate any laws or regulations; (b) infringe on intellectual property rights; 
                (c) transmit harmful code or malware; (d) harass or harm others; (e) attempt to gain unauthorized access to the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">8. Limitation of Liability</h2>
              <p>
                The Service is provided "as is" without warranties of any kind. We shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">9. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of material changes 
                via email or through the Service. Continued use after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-3">10. Contact</h2>
              <p>
                For questions about these Terms of Service, please contact us through the app's support channels.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-stone-200">
              <p className="text-sm text-stone-600">
                © 2025 PipeKeeper. All rights reserved.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}