import React from "react";
import FAQFull from "./FAQFull";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AppleFAQ() {
  const proLaunchDateLabel = "February 1, 2026";

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">Help & FAQ</h1>
        <p className="text-sm text-[#e8d5b7]/70 mt-2">
          This iOS build is designed for collection and cellar inventory management.
        </p>
      </div>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">What is this app?</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <p>
            This iOS version helps you catalog and manage a personal collection and cellar inventory:
            items owned, quantities, jar/lot details, dates, notes, photos, and organization.
          </p>
          <p>It does not provide usage guidance or recommendation-style features.</p>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">What can I do in the iOS version?</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>Add and manage pipes and inventory items</li>
            <li>Track cellar quantities, jar dates, and storage notes</li>
            <li>Organize by tags, categories, and filters</li>
            <li>Standardize categories and metadata (Inventory Tools)</li>
            <li>Export reports for documentation (where available in your plan)</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">Why are some features missing on iOS?</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <p>
            The iOS build is intentionally limited to collection and inventory management. Features that could be
            interpreted as encouraging consumption are not included in this version.
          </p>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">What are Free, Premium, and Pro?</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <b>Free:</b> Up to 5 pipes and 10 tobacco blends. You can still view and manage anything you&apos;ve already added.
            </li>
            <li>
              <b>Premium:</b> Unlimited collection features for dedicated tracking and organization.
            </li>
            <li>
              <b>Pro:</b> Advanced AI tools, analytics, and exports. Pro is active starting <b>{proLaunchDateLabel}</b>.
            </li>
          </ul>
          <p className="text-[#e8d5b7]/70">
            If you subscribed to Premium before {proLaunchDateLabel}, you keep AI Updates and AI Identification tools.
          </p>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">How do I get support?</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <p>
            Use the Support page in the app, or contact support through the email listed in the App Store listing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FAQ() {
  if (isAppleBuild) return <AppleFAQ />;
  return <FAQFull />;
}