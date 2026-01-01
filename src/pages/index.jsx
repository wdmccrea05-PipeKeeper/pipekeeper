import React from "react";

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
};

// Create case-insensitive route lookup
const ROUTES_LOWER = Object.fromEntries(
  Object.entries(ROUTES).map(([k, v]) => [k.toLowerCase(), v])
);

export default function Pages() {
  const path = window.location.pathname || "/";

  // Root should go to Home once
  if (path === "/") {
    window.location.replace("/Home");
    return null;
  }

  // Case-insensitive route matching for compatibility
  const Comp = ROUTES[path] || ROUTES_LOWER[path.toLowerCase()] || Home;

  return <Comp />;
}