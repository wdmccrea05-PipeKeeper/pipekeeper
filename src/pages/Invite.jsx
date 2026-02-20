import React from "react";
import InviteFull from "./InviteFull";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function AppleInvite() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">Invite</h1>
        <p className="text-sm text-[#e8d5b7]/70 mt-2">
          Invite friends to use PipeKeeper as a collection and cellar inventory manager.
        </p>
      </div>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">What they can do on iOS</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-3">
          <ul className="list-disc pl-5 space-y-1">
            <li>Catalog pipes and cellar inventory</li>
            <li>Track quantities, jar dates, lot details, and storage notes</li>
            <li>Organize items with categories, tags, and filters</li>
            <li>Standardize categories and metadata for cleaner inventory records</li>
          </ul>

          <p className="text-[#e8d5b7]/70">
            Note: This iOS build does not include recommendation or usage-guidance features.
          </p>

          <div className="pt-2">
            <Button onClick={() => window.location.replace("/Home")}>Return Home</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Invite() {
  if (isAppleBuild) return <AppleInvite />;
  return <InviteFull />;
}