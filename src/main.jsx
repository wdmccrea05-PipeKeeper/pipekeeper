// build: 2026-04-08
import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";
import "@/globals.css";
import { captureReferralFromUrl } from "@/lib/referral/referralAttribution";

// Capture referral code from URL before React mounts
captureReferralFromUrl();

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);