// src/components/compliance/AppleBlockedFeature.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AppleBlockedFeature({
  title = "Not available on iOS",
  message = "This iOS build is a Collection & Cellar Manager. Recommendation and usage-guidance features are not included.",
}) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="bg-[#243548]/60 border border-[#A35C5C]/35">
        <CardHeader>
          <CardTitle className="text-[#E0D8C8]">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#E0D8C8]/80 text-sm space-y-3">
          <p>{message}</p>
          <div className="flex gap-2 pt-3">
            <Button onClick={() => window.location.replace("/Home")}>Home</Button>
            <Button variant="outline" onClick={() => window.location.replace("/Tobacco")}>
              Go to Cellar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}