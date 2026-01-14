import React from "react";
import SupportFull from "./SupportFull";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AppleSupport() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">Support</h1>
        <p className="text-sm text-[#e8d5b7]/70 mt-2">
          Help for collection and cellar inventory management.
        </p>
      </div>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">Before you contact support</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>Confirm you are signed in to the correct account.</li>
            <li>Close and reopen the app, then try again.</li>
            <li>Check your internet connection.</li>
            <li>Take screenshots of the issue if possible.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">What to include in your message</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>Device model and iOS version</li>
            <li>What page you were on (Pipes, Cellar, Profile, etc.)</li>
            <li>Steps to reproduce the issue</li>
            <li>Screenshots (recommended)</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">About the iOS build</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <p>
            This iOS build is designed for collection and cellar inventory management. Features that could be interpreted
            as recommendation or usage guidance are not included in this version.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Support() {
  if (isAppleBuild) return <AppleSupport />;
  return <SupportFull />;
}