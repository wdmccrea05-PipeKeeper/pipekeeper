import React, { useEffect } from "react";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function Index() {
  useEffect(() => {
    // Redirect to home page
    window.location.href = createPageUrl('Home');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center">
      <p className="text-[#e8d5b7]">Redirecting...</p>
    </div>
  );
}