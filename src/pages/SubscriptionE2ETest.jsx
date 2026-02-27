import React from 'react';
import SubscriptionE2ETest from "@/components/debug/SubscriptionE2ETest";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ArrowLeft } from "lucide-react";

export default function SubscriptionE2ETestPage() {
  // i18n: dev-only, intentionally untranslated
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] p-6">
      <div className="max-w-4xl mx-auto">
        <a href={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </a>

        <h1 className="text-3xl font-bold text-[#e8d5b7] mb-6">
          🧪 Subscription & Permissions E2E Test Suite
        </h1>

        <p className="text-[#e8d5b7]/70 mb-6">
          This page runs comprehensive tests on the subscription and permissions system to verify that 
          paid users receive correct access to all premium and pro features. Tests run automatically on load.
        </p>

        <SubscriptionE2ETest />

        <div className="mt-8 bg-slate-800 text-white rounded-lg p-6 text-sm space-y-2">
          <h3 className="font-semibold text-lg mb-3">Test Coverage:</h3>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li>Hook data integrity (user, subscription objects)</li>
            <li>Canonical tier resolution across all sources</li>
            <li>Access flag consistency (hasPaid, hasPro, isTrial)</li>
            <li>Entitlements system calculations</li>
            <li>Limit check parameter compatibility</li>
            <li>Premium feature access (unlimited collection, pairing, matching, messaging)</li>
            <li>Pro feature access (AI identify, value lookup, optimization, exports, bulk edit)</li>
            <li>Provider detection (Stripe, Apple, manual)</li>
            <li>Plan label generation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}