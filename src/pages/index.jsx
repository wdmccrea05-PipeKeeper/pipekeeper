import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAppleBuild, FEATURES } from "@/components/utils/appVariant";
import AppleBlockedFeature from "@/components/compliance/AppleBlockedFeature";

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

const APPLE_BLOCKED_ROUTES = new Set([
  // Anything that could be interpreted as encouraging consumption:
  "/Community",

  // If AIUpdates contains Pairing/Optimization regeneration cards in your build:
  "/AIUpdates",

  // Optional: if your subscription page lists restricted features in Apple build
  // "/Subscription",
]);

function getAppleGatedComponent(path, DefaultComp) {
  if (!isAppleBuild) return DefaultComp;

  // Block entire pages (strongest: route-level removal)
  if (APPLE_BLOCKED_ROUTES.has(path)) {
    return () => (
      <AppleBlockedFeature
        title="Not available on iOS"
        message="This iOS build is a Collection & Cellar Manager. Community and recommendation-style features are not included."
      />
    );
  }

  return DefaultComp;
}

// Create case-insensitive route lookup
const ROUTES_LOWER = Object.fromEntries(
  Object.entries(ROUTES).map(([k, v]) => [k.toLowerCase(), v])
);

const queryClient = new QueryClient();

export default function Pages() {
  const path = window.location.pathname || "/";

  // Root should go to Home once
  if (path === "/") {
    window.location.replace("/Home");
    return null;
  }

  // Case-insensitive route matching for compatibility
  const BaseComp = ROUTES[path] || ROUTES_LOWER[path.toLowerCase()] || Home;
  const Comp = getAppleGatedComponent(path, BaseComp);

  // Derive page name for Layout
  const matchedKey = ROUTES[path] 
    ? path 
    : Object.keys(ROUTES).find(k => k.toLowerCase() === path.toLowerCase()) || "/Home";
  const currentPageName = matchedKey.replace("/", "");

  return (
    <QueryClientProvider client={queryClient}>
      <Layout currentPageName={currentPageName}>
        <Comp />
      </Layout>
    </QueryClientProvider>
  );
}