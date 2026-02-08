import React, { useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/components/i18n";

import { AuthProvider } from "@/components/auth/AuthContext";
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
import Auth from "./Auth";
import Subscription from "./Subscription";
import Support from "./Support";
import FAQ from "./FAQ";
import Troubleshooting from "./Troubleshooting";
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
  "/Auth": Auth,
  "/Subscription": Subscription,
  "/Support": Support,
  "/FAQ": FAQ,
  "/Troubleshooting": Troubleshooting,
  "/TermsOfService": TermsOfService,
  "/PrivacyPolicy": PrivacyPolicy,
  "/TobaccoLibrarySync": TobaccoLibrarySync,
  "/BulkLogoUpload": BulkLogoUpload,
  "/AIUpdates": AIUpdates,
};

// Route → feature mapping for Apple compliance
const ROUTE_FEATURE_REQUIREMENTS = {
  "/Community": "community",
  "/AIUpdates": "recommendations",
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

function canonicalizePath(rawPath) {
  const p = (rawPath || "/").trim();
  if (p === "/" || p === "") return "/Home";

  const lower = p.toLowerCase();

  if (ROUTES[p]) return p;
  if (ROUTES_LOWER[lower]) {
    return (
      Object.keys(ROUTES).find((k) => k.toLowerCase() === lower) || "/Home"
    );
  }

  return "/Home";
}

export default function Pages() {
  const rawPath = window.location.pathname || "/";
  const search = window.location.search || "";
  const params = new URLSearchParams(search);

  // If wrapper starts at Terms/Privacy, treat as startup route unless explicitly requested.
  const startupLegal =
    (rawPath.toLowerCase() === "/termsofservice" ||
      rawPath.toLowerCase() === "/privacypolicy") &&
    params.get("view") !== "1";

  const path = useMemo(() => {
    if (startupLegal) return "/Home";
    const canonical = canonicalizePath(rawPath);
    // Bypass Layout for Auth page to show full-screen auth form
    return canonical;
  }, [rawPath, startupLegal]);

  // Update URL without reload (prevents iOS/webcontainer race conditions)
  useEffect(() => {
    if ((window.location.pathname || "/") !== path) {
      window.history.replaceState({}, "", path);
    }
  }, [path]);

  const RawComp = ROUTES[path] || ROUTES_LOWER[path.toLowerCase()] || Home;
  const Comp = getAppleGatedComponent(path, RawComp);

  const matchedKey = ROUTES[path]
    ? path
    : Object.keys(ROUTES).find((k) => k.toLowerCase() === path.toLowerCase()) ||
      "/Home";
  const currentPageName = matchedKey.replace("/", "") || "Home";

  // Auth page renders full-screen without Layout
  const isAuthPage = currentPageName === "Auth";

  return (
    <QueryClientProvider client={queryClient}>
      {isAuthPage ? (
        <Comp />
      ) : (
        <Layout currentPageName={currentPageName}>
          <Comp />
        </Layout>
      )}
    </QueryClientProvider>
  );
}