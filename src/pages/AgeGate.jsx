import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgeGate({ onConfirm }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-[#243548]/80 border-[#8b3a3a]/60">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-[#e8d5b7] text-center">
            Adults Only
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 text-[#e8d5b7]/90">
            <p className="text-center">
              PipeKeeper is intended for adult users only.
            </p>
            <p className="text-sm text-center text-[#e8d5b7]/70">
              This app is a collection management tool for pipe smoking enthusiasts. 
              It does not sell or facilitate the purchase of tobacco products.
            </p>
          </div>
          <Button 
            className="w-full bg-[#8b3a3a] hover:bg-[#8b3a3a]/80 text-[#e8d5b7]"
            onClick={onConfirm}
          >
            I confirm I am of legal age
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}