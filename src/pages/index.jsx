import React, { useEffect, useMemo } from "react";
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
  // Add future gated routes here if needed:
  // "/Pairings": "recommendations",
  // "/Optimize": "optimization",
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

// Case-insensitive route lookup
const ROUTES_LOWER = Object.fromEntries(
  Object.entries(ROUTES).map(([k, v]) => [k.toLowerCase(), v])
);

const queryClient = new QueryClient();

/**
 * Normalize the incoming path:
 * - "/" => "/Home"
 * - "" => "/Home"
 * - "/index" or "/pages" variants => "/Home"
 * - unknown routes => "/Home"
 * - keep known routes as-is (case-insensitive)
 */
function normalizePath(rawPath) {
  const p = (rawPath || "/").trim();
  if (p === "/" || p === "") return "/Home";

  // Common base44 / hosting edgecases
  const lower = p.toLowerCase();
  if (lower === "/index" || lower === "/index.html" || lower === "/pages") return "/Home";

  // If route exists (case-insensitive), preserve original casing by mapping to canonical key
  if (ROUTES[p]) return p;
  if (ROUTES_LOWER[lower]) {
    const canonical =
      Object.keys(ROUTES).find((k) => k.toLowerCase() === lower) || "/Home";
    return canonical;
  }

  // Unknown route => Home
  return "/Home";
}

export default function Pages() {
  const initialPath = useMemo(() => normalizePath(window.location.pathname), []);

  // Ensure the URL reflects the normalized path without forcing a reload
  useEffect(() => {
    const current = window.location.pathname || "/";
    if (current !== initialPath) {
      window.history.replaceState({}, "", initialPath);
    }
  }, [initialPath]);

  const RawComp = ROUTES[initialPath] || ROUTES_LOWER[initialPath.toLowerCase()] || Home;
  const Comp = getAppleGatedComponent(initialPath, RawComp);

  // Derive page name for Layout
  const currentPageName = initialPath.replace("/", "") || "Home";

  return (
    <QueryClientProvider client={queryClient}>
      <Layout currentPageName={currentPageName}>
        <Comp />
      </Layout>
    </QueryClientProvider>
  );
}