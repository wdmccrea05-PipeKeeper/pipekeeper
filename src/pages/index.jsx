import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Layout from "../Layout";
import Home from "./Home";
import Pipes from "./Pipes";
import PipeDetail from "./PipeDetail";
import Tobacco from "./Tobacco";
import TobaccoDetail from "./TobaccoDetail";
import Community from "./Community";
import Profile from "./Profile";
import PublicProfile from "./PublicProfile";
import Import from "./Import";
import Invite from "./Invite";
import Subscription from "./Subscription";
import Support from "./Support";
import FAQ from "./FAQ";
import TermsOfService from "./TermsOfService";
import PrivacyPolicy from "./PrivacyPolicy";
import TobaccoLibrarySync from "./TobaccoLibrarySync";
import BulkLogoUpload from "./BulkLogoUpload";
import AIUpdates from "./AIUpdates";

import { isAppleBuild, FEATURES } from "@/components/utils/appVariant";
import AppleBlockedFeature from "@/components/compliance/AppleBlockedFeature";

const ROUTES = {
  "/Home": Home,
  "/Pipes": Pipes,
  "/PipeDetail": PipeDetail,
  "/Tobacco": Tobacco,
  "/TobaccoDetail": TobaccoDetail,
  "/Community": Community,
  "/Profile": Profile,
  "/PublicProfile": PublicProfile,
  "/Import": Import,
  "/Invite": Invite,
  "/Subscription": Subscription,
  "/Support": Support,
  "/FAQ": FAQ,
  "/TermsOfService": TermsOfService,
  "/PrivacyPolicy": PrivacyPolicy,
  "/TobaccoLibrarySync": TobaccoLibrarySync,
  "/BulkLogoUpload": BulkLogoUpload,
  "/AIUpdates": AIUpdates,
};

// Route → feature mapping for Apple compliance
const ROUTE_FEATURE_REQUIREMENTS = {
  "/Community": "community",
  // If you later add routes for recommendation/optimization pages, add them here:
  // "/Pairings": "recommendations",
  // "/Optimize": "optimization",
  // "/WhatIf": "optimization",
  // "/SmokingLog": "smokingLogs",
};

function getAppleGatedComponent(path, Component) {
  if (!isAppleBuild) return Component;

  const requiredFeature = ROUTE_FEATURE_REQUIREMENTS[path];
  if (!requiredFeature) return Component;

  if (FEATURES[requiredFeature] === false) {
    return function AppleBlocked() {
      return (
        <AppleBlockedFeature
          title="Not available on iOS"
          message="This iOS build is a Collection & Cellar Manager. Social/recommendation-style features are not included."
        />
      );
    };
  }

  return Component;
}

// Create case-insensitive route lookup
const ROUTES_LOWER = Object.fromEntries(
  Object.entries(ROUTES).map(([k, v]) => [k.toLowerCase(), v])
);

const queryClient = new QueryClient();

export default function Pages() {
  const path = window.location.pathname || "/";

  // Root should go to Home
  if (path === "/" || path === "/TermsOfService") {
    window.location.replace("/Home");
    return null;
  }

  // Case-insensitive route matching for compatibility
  const RawComp = ROUTES[path] || ROUTES_LOWER[path.toLowerCase()] || Home;

  // Apple compliance gate
  const Comp = getAppleGatedComponent(path, RawComp);

  // Derive page name for Layout
  const matchedKey = ROUTES[path]
    ? path
    : Object.keys(ROUTES).find((k) => k.toLowerCase() === path.toLowerCase()) || "/Home";
  const currentPageName = matchedKey.replace("/", "");

  return (
    <QueryClientProvider client={queryClient}>
      <Layout currentPageName={currentPageName}>
        <Comp />
      </Layout>
    </QueryClientProvider>
  );
}