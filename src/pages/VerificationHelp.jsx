import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, AlertCircle, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function VerificationHelp() {
  const handleResendVerification = async () => {
    try {
      // Attempt to trigger email resend through Base44 auth
      await base44.auth.redirectToLogin();
    } catch (err) {
      console.error("Redirect failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-8 h-8 text-[#A35C5C]" />
              <CardTitle className="text-2xl">Email Verification Help</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#E0D8C8]">Verification Code Expired?</h3>
              <p className="text-[#E0D8C8]/70">
                If your email verification code expired or you missed the 10-minute window, you have a few options:
              </p>

              <div className="space-y-3">
                <div className="p-4 bg-[#1A2B3A]/50 rounded-lg border border-[#A35C5C]/30">
                  <h4 className="font-semibold text-[#E0D8C8] mb-2 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Option 1: Try Logging In Again
                  </h4>
                  <p className="text-sm text-[#E0D8C8]/70 mb-3">
                    Attempt to log in with your email. The system will send a new verification code automatically.
                  </p>
                  <Button onClick={handleResendVerification} className="w-full">
                    Go to Login
                  </Button>
                </div>

                <div className="p-4 bg-[#1A2B3A]/50 rounded-lg border border-[#A35C5C]/30">
                  <h4 className="font-semibold text-[#E0D8C8] mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Option 2: Contact Support
                  </h4>
                  <p className="text-sm text-[#E0D8C8]/70 mb-3">
                    If you're unable to receive a new verification code, please contact us directly:
                  </p>
                  <div className="space-y-2">
                    <a
                      href="mailto:support@pipekeeper.app"
                      className="block w-full text-center px-4 py-2 bg-[#A35C5C] text-[#E0D8C8] rounded-lg hover:bg-[#8F4E4E] transition-colors"
                    >
                      support@pipekeeper.app
                    </a>
                    <p className="text-xs text-[#E0D8C8]/60 text-center">
                      Include your email address and describe the issue you're experiencing
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-[#2EAF6F]/10 border border-[#2EAF6F]/30 rounded-lg">
                <h4 className="font-semibold text-[#E0D8C8] mb-2">Troubleshooting Tips</h4>
                <ul className="text-sm text-[#E0D8C8]/70 space-y-1 list-disc list-inside">
                  <li>Check your spam/junk folder for the verification email</li>
                  <li>Make sure you're using the correct email address</li>
                  <li>Wait a few minutes and try logging in again to receive a fresh code</li>
                  <li>Clear your browser cache and cookies if the issue persists</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <a
            href="https://pipekeeper.app"
            className="text-[#E0D8C8]/70 hover:text-[#E0D8C8] text-sm transition-colors"
          >
            ← Back to PipeKeeper
          </a>
        </div>
      </div>
    </div>
  );
}