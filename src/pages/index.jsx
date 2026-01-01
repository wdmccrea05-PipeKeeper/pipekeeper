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

export default function Pages() {
  const path = window.location.pathname || "/";

  // Root should go to Home once
  if (path === "/") {
    window.location.replace("/Home");
    return null;
  }

  // Tolerate lowercase routes from old links/bookmarks
  const Comp =
    ROUTES[path] ||
    ROUTES["/" + path.replace("/", "").replace(/^\w/, (c) => c.toUpperCase())] ||
    Home;

  return <Comp />;
}