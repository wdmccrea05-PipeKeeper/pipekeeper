import React from "react";
import TroubleshootingFull from "./TroubleshootingFull";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AppleTroubleshooting() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">Troubleshooting</h1>
        <p className="text-sm text-[#e8d5b7]/70 mt-2">
          Common fixes for collection and inventory management features.
        </p>
      </div>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">I don't see certain features on iOS</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <p>
            The iOS build focuses on collection and cellar inventory management only. Some features present on other
            platforms are not included in this version.
          </p>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">Inventory Tools are not updating my items</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>Confirm you are signed in.</li>
            <li>Try again after a full refresh (close and reopen the app).</li>
            <li>Check that the item list is not empty and that items have names.</li>
            <li>If the issue persists, visit Support and include a screenshot.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">My inventory counts look wrong</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>Open the item and confirm the unit (oz, grams, tins, jars) and quantity fields.</li>
            <li>Verify jar/lot entries if you track multiple containers for the same item.</li>
            <li>Use export/reporting (if available) to quickly audit totals.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">Search or filters aren't returning expected results</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>Clear filters and try a simple search term.</li>
            <li>Run Inventory Tools → "Standardize Categories" to normalize metadata.</li>
            <li>Check for spelling differences in names (e.g., abbreviations).</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">Still stuck?</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <p>
            Go to Support and include: device model, iOS version, steps to reproduce, and screenshots if possible.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Troubleshooting() {
  if (isAppleBuild) return <AppleTroubleshooting />;
  return <TroubleshootingFull />;
}