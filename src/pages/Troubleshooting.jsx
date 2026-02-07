import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ChevronDown, ArrowLeft, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function Troubleshooting() {
  const { t } = useTranslation();
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (id) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 32 }}>
      <h2 className="text-2xl font-bold text-[#E0D8C8] mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const Q = ({ id, q, children }) => (
    <Card className="bg-white border-gray-200 overflow-hidden">
      <button
        onClick={() => toggleItem(id)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 pr-4">{q}</span>
        <ChevronDown 
          className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${openItems[id] ? 'rotate-180' : ''}`}
        />
      </button>
      {openItems[id] && (
        <CardContent className="px-4 pb-4 pt-0 text-gray-700 leading-relaxed space-y-3">
          {children}
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A]">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 16px" }}>
        <Link to={createPageUrl('FAQFull')} className="inline-flex items-center gap-2 text-[#8b3a3a] hover:text-[#a94747] mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to FAQ
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">Troubleshooting</h1>
          <p className="text-[#E0D8C8]/80">Solutions for common issues and errors</p>
        </div>

        <Section title="Login & Access">
          <Q id="cant-login" q="I can't log in to my account. What should I do?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Check your internet connection</li>
              <li>Try clearing your browser cache (Ctrl+Shift+Delete)</li>
              <li>Use an incognito/private window</li>
              <li>Ensure you're using the correct email address</li>
              <li>If still stuck, use "Forgot Password" to reset</li>
              <li>Still having issues? Contact support@pipekeeperapp.com</li>
            </ol>
          </Q>

          <Q id="verification-expired" q="My verification code expired. What do I do?">
            <p>Verification codes expire after 15 minutes for security:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Return to the login page</li>
              <li>Click "Send new code"</li>
              <li>Check your email (including spam folder)</li>
              <li>Enter the new 6-digit code</li>
              <li>If email doesn't arrive, check your email provider's filtering</li>
              <li>Contact support if the problem persists</li>
            </ol>
          </Q>

          <Q id="email-not-received" q="I'm not receiving verification emails.">
            <ol className="list-decimal list-inside space-y-2">
              <li>Check spam/junk/promotions folders</li>
              <li>Add admin@pipekeeperapp.com to your contacts</li>
              <li>Check email forwarding settings if you use aliases</li>
              <li>Verify you entered the email address correctly</li>
              <li>Wait 5 minutes—emails sometimes delay</li>
              <li>If still missing: contact support with your email address</li>
            </ol>
          </Q>

          <Q id="session-expired" q="My session expired. Do I lose my data?">
            <p>No—session expiration is a security measure:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Your collection data is always saved on our servers</li>
              <li>You'll be prompted to log in again</li>
              <li>Log back in and all your data appears as before</li>
              <li>Unsaved edits in progress may be lost—always click Save before leaving</li>
            </ol>
          </Q>
        </Section>

        <Section title="Data & Syncing">
          <Q id="data-not-saving" q="My changes aren't saving. What's wrong?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Check your internet connection—red signal icon appears if offline</li>
              <li>Look for a "Save" button and click it (data doesn't auto-save in all sections)</li>
              <li>Check for error messages in red text</li>
              <li>Try refreshing the page (F5) then retry</li>
              <li>Clear browser cache and try again</li>
              <li>If error persists: screenshot the error and contact support</li>
            </ol>
          </Q>

          <Q id="data-not-loading" q="My pipes or tobacco aren't loading. How do I fix this?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Refresh the page (F5 or Cmd+R)</li>
              <li>Close the tab and reopen PipeKeeper</li>
              <li>Clear browser cache: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)</li>
              <li>Try a different browser (Chrome, Firefox, Safari)</li>
              <li>Check your internet speed—slow connections may timeout</li>
              <li>Wait 30 seconds then refresh (server may be temporarily busy)</li>
              <li>Still stuck? Contact support with your browser/OS info</li>
            </ol>
          </Q>

          <Q id="duplicate-entries" q="I see duplicate pipes or blends. How do I remove them?">
            <ol className="list-decimal list-inside space-y-2">
              <li>This can happen if saves trigger twice due to connectivity</li>
              <li>Open the duplicate entry</li>
              <li>Click the "Delete" button (usually at bottom of form)</li>
              <li>Confirm deletion</li>
              <li>Refresh page to verify it's gone</li>
              <li>If you can't delete: contact support with the pipe/blend ID</li>
            </ol>
          </Q>

          <Q id="syncing-delay" q="Why is my data taking time to appear on other devices?">
            <p>Syncing is usually instant but can have small delays:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Data syncs within seconds in most cases</li>
              <li>Mobile apps may cache data and need refresh</li>
              <li>Pull down to refresh on mobile</li>
              <li>Restart the app if changes don't appear after 1 minute</li>
              <li>Check internet connectivity on all devices</li>
            </ol>
          </Q>
        </Section>

        <Section title="Photos & Images">
          <Q id="photo-not-uploading" q="My photo won't upload. What's the issue?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Check file size—max 10MB per image</li>
              <li>Confirm format is JPG, PNG, or WebP</li>
              <li>Verify internet connection is stable</li>
              <li>Try a different image file</li>
              <li>Clear browser cache and try again</li>
              <li>If error persists: contact support</li>
            </ol>
          </Q>

          <Q id="photo-blurry" q="My pipe photos appear blurry. Can I improve quality?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Use good lighting when photographing (natural light is best)</li>
              <li>Hold camera steady or use a tripod</li>
              <li>Focus on pipe details before taking photo</li>
              <li>Upload high-resolution original files (not compressed)</li>
              <li>Delete blurry photo and re-upload a better one</li>
            </ol>
          </Q>

          <Q id="delete-photo" q="How do I remove an unwanted photo?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open the pipe or blend detail</li>
              <li>Click "Edit"</li>
              <li>Scroll to Photos section</li>
              <li>Click the X icon on the photo you want to remove</li>
              <li>Click "Save Changes"</li>
            </ol>
          </Q>
        </Section>

        <Section title="AI Features">
          <Q id="ai-slow" q="AI features are running slow. What can I do?">
            <ol className="list-decimal list-inside space-y-2">
              <li>AI processing takes 10-30 seconds—be patient</li>
              <li>Don't refresh or navigate away while processing</li>
              <li>Make sure you have a fast internet connection</li>
              <li>Try again later if servers are busy</li>
              <li>Some features require Premium—check your subscription</li>
            </ol>
          </Q>

          <Q id="ai-wrong-suggestion" q="AI suggested something incorrect. How do I fix it?">
            <p>AI is a helpful guide, not perfect:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>AI bases suggestions on data you entered</li>
              <li>Review and correct collection data for better results</li>
              <li>AI learns as you add more pipes and log sessions</li>
              <li>You can manually override any suggestion</li>
              <li>Feedback helps improve recommendations over time</li>
            </ol>
          </Q>

          <Q id="ai-not-working" q="AI features aren't working. What's wrong?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Check you have Premium or Pro subscription</li>
              <li>Verify you've added at least one pipe and one tobacco</li>
              <li>Ensure good internet connection</li>
              <li>Refresh the page and try again</li>
              <li>Clear cache and reload</li>
              <li>Still failing? Contact support</li>
            </ol>
          </Q>
        </Section>

        <Section title="Subscription & Billing">
          <Q id="subscription-not-working" q="I subscribed but Premium features are locked.">
            <ol className="list-decimal list-inside space-y-2">
              <li>Log out and log back in to refresh subscription status</li>
              <li>Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)</li>
              <li>Check your subscription in Profile > Settings</li>
              <li>Verify payment was successful (check email receipt)</li>
              <li>Try a different browser if the issue persists</li>
              <li>Clear browser cache completely</li>
              <li>Still locked? Contact support with your email</li>
            </ol>
          </Q>

          <Q id="billing-issue" q="There's an issue with my payment or billing.">
            <ol className="list-decimal list-inside space-y-2">
              <li>Check your email for billing confirmations</li>
              <li>Review your bank/card statement for charges</li>
              <li>Contact your payment provider (Stripe, Apple, etc.) if charge is disputed</li>
              <li>For refunds or billing questions: contact support@pipekeeperapp.com</li>
              <li>Provide your email and order details when contacting</li>
            </ol>
          </Q>

          <Q id="cancel-subscription" q="How do I cancel my subscription?">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to Profile > Subscription Settings</li>
              <li>Click "Manage Subscription"</li>
              <li>Follow the provider's cancellation steps (Stripe/Apple)</li>
              <li>Confirm cancellation</li>
              <li>You'll retain access until current period ends</li>
              <li>Your data remains safe even after cancellation</li>
            </ol>
          </Q>
        </Section>

        <Section title="Browser & Technical">
          <Q id="app-freezes" q="The app freezes or becomes unresponsive.">
            <ol className="list-decimal list-inside space-y-2">
              <li>Wait 10 seconds—it may be processing</li>
              <li>Refresh the page (F5)</li>
              <li>Close and reopen the browser tab</li>
              <li>Restart your browser completely</li>
              <li>Clear browser cache and cookies</li>
              <li>Try a different browser to isolate the issue</li>
              <li>Check for browser extensions that might interfere</li>
            </ol>
          </Q>

          <Q id="works-on-phone-not-desktop" q="App works on my phone but not on desktop (or vice versa).">
            <ol className="list-decimal list-inside space-y-2">
              <li>This is usually a browser or cache issue</li>
              <li>Clear cache on the problematic device</li>
              <li>Try a different browser (Chrome, Firefox, Safari)</li>
              <li>Disable browser extensions temporarily</li>
              <li>Ensure both devices are updated to latest OS</li>
              <li>Check internet connection on both</li>
            </ol>
          </Q>

          <Q id="mobile-app-issues" q="I'm having issues with the mobile web app.">
            <ol className="list-decimal list-inside space-y-2">
              <li>Ensure you're using the latest browser version</li>
              <li>Close and reopen the app (hard restart)</li>
              <li>Clear app data: Settings > Apps > Browser > Storage</li>
              <li>Try a different browser (Chrome, Safari, Firefox)</li>
              <li>Update your device OS to the latest version</li>
              <li>Check you're not in airplane mode</li>
            </ol>
          </Q>
        </Section>

        <Section title="Need More Help?">
          <div className="bg-[#A35C5C]/10 border border-[#A35C5C]/40 rounded-lg p-6 text-[#E0D8C8]">
            <div className="flex gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-2">Couldn't find your answer?</p>
                <p className="text-sm mb-3">Contact our support team for personalized help:</p>
                <a href="mailto:support@pipekeeperapp.com" className="text-[#8b3a3a] hover:text-[#a94747] underline">
                  support@pipekeeperapp.com
                </a>
                <p className="text-xs text-[#E0D8C8]/70 mt-3">Include details like: browser, device, steps to reproduce, and any error messages</p>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}