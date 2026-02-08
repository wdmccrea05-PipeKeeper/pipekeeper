import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { BUILD_VERSION } from "./components/buildVersion";
import { cn } from "@/lib/utils";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import GlobalErrorBoundary from "@/components/system/GlobalErrorBoundary";
import { Home, Leaf, Menu, X, User, HelpCircle, Users, Crown, AlertCircle, Settings, Shield, FileText } from "lucide-react";
import GlobalSearchTrigger from "@/components/search/GlobalSearchTrigger";
import BackButton from "@/components/navigation/BackButton";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { MeasurementProvider } from "@/components/utils/measurementConversion";
import { Toaster } from "@/components/ui/sonner";
import { isCompanionApp, isIOSCompanion } from "@/components/utils/companion";
import { isAppleBuild, FEATURES } from "@/components/utils/appVariant";
import AgeGate from "@/pages/AgeGate";
import DocumentTitle from "@/components/DocumentTitle";
import TermsGate from "@/components/TermsGate";
import { PK_THEME } from "@/components/utils/pkTheme";
import FoundingMemberPopup from "@/components/subscription/FoundingMemberPopup";
import EntitlementDebug from "@/components/debug/EntitlementDebug";
import {
  isIOSWebView,
  openAppleSubscriptions,
  openNativePaywall,
  requestNativeSubscriptionStatus,
  registerNativeSubscriptionListener,
  nativeDebugPing,
} from "@/components/utils/nativeIAPBridge";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import FeatureQuickAccess from "@/components/navigation/FeatureQuickAccess";
import { ui } from "@/components/i18n/ui";

const PIPEKEEPER_LOGO = "/assets/pipekeeper-logo.png";
const PIPE_ICON = "/assets/pipekeeper-pipe-icon.png";

// Build version logging for production verification
if (typeof window !== "undefined") {
  console.log("[BUILD_VERSION]", BUILD_VERSION);
  console.log("[ENV_CHECK]", {
    hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasSupabaseAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    supabaseHost: (import.meta.env.VITE_SUPABASE_URL || "").replace(/^https?:\/\//, "").split("/")[0]
  });
}

function NavLink({ item, currentPage, onClick, hasPaidAccess, isMobile = false }) {
  const isActive = currentPage === item.page;

  return (
    <Link
      to={createPageUrl(item.page)}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-2 rounded-lg font-medium text-xs transition-all duration-200 transform hover:scale-105 flex-shrink-0 whitespace-nowrap",
        isActive
          ? "bg-gradient-to-r from-[#A35C5C] to-[#8B4A4A] text-[#E0D8C8] shadow-md"
          : isMobile
          ? "text-[#1a2c42] hover:bg-[#A35C5C]/10"
          : "text-[#E0D8C8]/70 hover:bg-[#A35C5C]/30 hover:text-[#E0D8C8]"
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
      aria-current={isActive ? "page" : undefined}
      role="link"
      title={item.name}
    >
      {item.isIconComponent ? (
        <item.icon className="w-5 h-5 flex-shrink-0" />
      ) : (
        <img
          src={item.icon}
          alt={item.name}
          className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
          style={{
            filter: isMobile
              ? "brightness(0)"
              : isActive
              ? "invert(1) sepia(0.35) saturate(0.4) hue-rotate(350deg) brightness(1)"
              : "invert(1) sepia(0.35) saturate(0.4) hue-rotate(350deg) brightness(0.9) opacity(0.7)",
          }}
        />
      )}

      <span className={cn("truncate", isMobile ? "inline" : "hidden lg:inline")}>{item.name}</span>

      {item.isPremium && !hasPaidAccess && <Crown className="w-3 h-3 text-amber-500" />}
    </Link>
  );
}

const AGE_GATE_KEY = "pk_age_confirmed";
const SUB_PROMPT_KEY = "pk_subscribe_prompt_last_shown";

function syncKey(email) {
  return `pk_stripe_sync_last_${email || "unknown"}`;
}

function shouldRunStripeSync(email) {
  try {
    if (!email) return false;
    const v = localStorage.getItem(syncKey(email));
    if (!v) return true;
    const last = new Date(v).getTime();
    if (Number.isNaN(last)) return true;
    return Date.now() - last > 10 * 60 * 1000;
  } catch {
    return true;
  }
}

function markStripeSyncRan(email) {
  try {
    if (!email) return;
    localStorage.setItem(syncKey(email), new Date().toISOString());
  } catch {}
}

function shouldShowSubscribePrompt() {
  try {
    const v = localStorage.getItem(SUB_PROMPT_KEY);
    if (!v) return true;
    const last = new Date(v).getTime();
    if (Number.isNaN(last)) return true;
    return Date.now() - last > 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function markSubscribePromptShown() {
  try {
    localStorage.setItem(SUB_PROMPT_KEY, new Date().toISOString());
  } catch {}
}

async function tryStripeSync() {
  const candidates = [
    "syncFromStripe",
    "syncStripeFromStripe",
    "syncStripeSubscriptions",
    "syncSubscriptionFromStripe",
    "syncStripeForUser",
    "syncStripeForCurrentUser",
    "syncMySubscription",
  ];

  for (const fn of candidates) {
    try {
      const params = isIOSCompanion?.() ? { platform: "ios" } : {};
      const res = await base44.functions.invoke(fn, params);
      return { ok: true, fn, res };
    } catch (e) {
      // keep trying next name
    }
  }

  return { ok: false };
}

// Force deployment: entitlement check v2
export default function Layout({ children, currentPageName }) {
  // CRITICAL: Mount entitlement check immediately - runs on every render
        const { user, hasPaidAccess, isAdmin: userIsAdmin, isLoading: userLoading, error: userError } = useCurrentUser();

        // Fallback admin check for known admins
        const isAdmin = userIsAdmin || (user?.email && ["wmccrea@indario.com", "warren@pipekeeper.app"].includes((user.email || "").trim().toLowerCase()));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(AGE_GATE_KEY) === "true";
    return false;
  });
  const [showSubscribePrompt, setShowSubscribePrompt] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showFoundingMemberPopup, setShowFoundingMemberPopup] = useState(false);
  const [iapToast, setIapToast] = useState("");
  const [subActive, setSubActive] = useState(false);
  const [showQuickAccess, setShowQuickAccess] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ios = useMemo(() => isIOSWebView(), []);

  // Handle Android back button
  useEffect(() => {
    const handlePopState = (e) => {
      // Prevent default back behavior
      e.preventDefault();

      // Close mobile menu if open
      if (mobileOpen) {
        setMobileOpen(false);
        return;
      }

      // Use React Router's navigate with -1 to go back in history
      navigate(-1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [mobileOpen, navigate]);

  const navItems = useMemo(() => [
    { name: ui("nav.home"), page: "Home", icon: Home, isIconComponent: true },
    { name: ui("nav.pipes"), page: "Pipes", icon: PIPE_ICON, isIconComponent: false },
    {
      name: isAppleBuild ? ui("nav.cellar") : ui("nav.tobacco"),
      page: "Tobacco",
      icon: Leaf,
      isIconComponent: true,
    },
    ...(FEATURES.community
      ? [{ name: ui("nav.community"), page: "Community", icon: Users, isIconComponent: true, isPremium: true }]
      : []),
    { name: ui("nav.profile"), page: "Profile", icon: User, isIconComponent: true },
    { name: ui("nav.help"), page: "FAQ", icon: HelpCircle, isIconComponent: true },
  ], []);

  const PUBLIC_PAGES = useMemo(
    () =>
      new Set([
        "FAQ",
        "Support",
        "TermsOfService",
        "PrivacyPolicy",
        "Invite",
        "PublicProfile",
        "Index",
        "Subscription",
        "Auth",
      ]),
    []
  );

  const subscription = null;
  const subLoading = false;

  const adminNavItems = useMemo(() => isAdmin ? [
    { name: ui("admin.subscriptionSupport"), page: "SubscriptionSupport", icon: Settings, isIconComponent: true },
    { name: ui("admin.userReport"), page: "UserReport", icon: Users, isIconComponent: true },
    { name: ui("admin.contentModeration"), page: "AdminReports", icon: Shield, isIconComponent: true },
    { name: ui("admin.eventsLog"), page: "SubscriptionEventsLog", icon: FileText, isIconComponent: true },
  ] : [], [isAdmin]);

  // Block render until subscription is loaded (prevents Apple fallback race)
  const subscriptionReady = !userLoading && (subscription || true);

  const showIAPToast = (msg) => {
    setIapToast(msg);
    clearTimeout(showIAPToast._timer);
    showIAPToast._timer = setTimeout(() => setIapToast(""), 2600);
  };

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "logout") {
        queryClient.removeQueries({
          predicate: (query) => query.queryKey[0] !== "current-user",
        });
        setTimeout(() => window.location.reload(), 100);
      }
      // Listen for entitlement sync triggers from other tabs
      if (e.key === "pk_force_entitlement_refresh") {
        queryClient.invalidateQueries({ queryKey: ["current-user"] });
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [queryClient]);

  useEffect(() => {
    if (userLoading) return;
    if (!user?.email) return;
    if (isAppleBuild) return;
    if (hasPaidAccess) return;
    if (!shouldRunStripeSync(user.email)) return;

    let cancelled = false;

    (async () => {
      try {
        setSyncing(true);
        const result = await tryStripeSync();
        markStripeSyncRan(user.email);

        if (!cancelled && result.ok) {
          await queryClient.invalidateQueries({ queryKey: ["current-user"] });
          await queryClient.invalidateQueries({ queryKey: ["subscription"] });
          await queryClient.refetchQueries({ queryKey: ["current-user"] });
          await queryClient.refetchQueries({ queryKey: ["subscription"] });
        }
      } catch (e) {
        console.warn("[Layout] Auto Stripe sync failed (non-fatal):", e?.message || e);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userLoading, user?.email, hasPaidAccess, queryClient]);

  useEffect(() => {
    if (userLoading) return;
    if (!user?.email) return;
    if (user?.isFoundingMember) return;
    if (!hasPaidAccess) return;
    if (!subscription) return;

    (async () => {
      try {
        const { ensureFoundingMemberStatus } = await import("@/components/utils/foundingMemberBackfill");
        const updated = await ensureFoundingMemberStatus(user, subscription);
        if (updated) {
          await queryClient.invalidateQueries({ queryKey: ["current-user"] });
        }
      } catch (e) {
        console.warn("[Layout] Founding member backfill failed (non-fatal):", e?.message || e);
      }
    })();
  }, [userLoading, user, subscription, hasPaidAccess, queryClient]);

  useEffect(() => {
    if (!ios) return undefined;

    nativeDebugPing("Layout mounted (bridge ok)");
    requestNativeSubscriptionStatus();

    const cleanup = registerNativeSubscriptionListener(async (payload) => {
      console.log("[Layout] Native subscription payload:", payload);
      const active = !!payload.active;
      setSubActive(active);

      try {
        const result = await base44.functions.invoke('syncAppleSubscriptionForMe', payload);

        if (result.data?.code === 'ALREADY_LINKED') {
          showIAPToast('This Apple subscription is already linked to a different account. Please sign in with the original account or contact support.');
          return;
        }

        await queryClient.invalidateQueries({ queryKey: ["current-user"] });
        const userId = user?.id;
        const email = (user?.email || "").trim().toLowerCase();
        if (userId || email) {
          await queryClient.invalidateQueries({ queryKey: ["subscription", userId, email] });
        }
      } catch (e) {
        console.error("[Layout] Apple subscription sync failed:", e);
        showIAPToast('Failed to sync subscription. Please try again.');
      }
    });

    return cleanup;
  }, [ios, queryClient, user?.id, user?.email]);

  useEffect(() => {
    if (!ios) return undefined;

    const getClickableText = (evtTarget) => {
      try {
        const path = typeof evtTarget?.composedPath === "function" ? evtTarget.composedPath() : [];
        const candidates = [];

        let el = evtTarget;
        for (let i = 0; i < 8 && el; i++) {
          candidates.push(el);
          el = el.parentElement;
        }

        for (const p of path) {
          if (p && p.nodeType === 1) candidates.push(p);
        }

        for (const c of candidates) {
          const text = (c?.innerText || c?.textContent || "").trim();
          if (text && text.length <= 60) return text;
        }
        return "";
      } catch {
        return "";
      }
    };

    const shouldManage = (t) => {
      const text = (t || "").trim().toLowerCase();
      return (
        text.includes("manage subscription") ||
        text.includes("update subscription") ||
        text.includes("cancel subscription") ||
        text.includes("manage plan") ||
        text.includes("manage billing")
      );
    };

    const shouldUpgrade = (t) => {
      const text = (t || "").trim().toLowerCase();
      return (
        text === "upgrade" ||
        text.includes("upgrade to pro") ||
        text.includes("upgrade (app store)") ||
        text.includes("subscribe") ||
        text.includes("go pro")
      );
    };

    const intercept = (e, phaseLabel) => {
      const text = getClickableText(e.target);

      if (shouldManage(text)) {
        e.preventDefault();
        e.stopPropagation();
        showIAPToast("Opening Apple Subscriptions…");
        nativeDebugPing(`Intercepted manage (${phaseLabel})`);
        const ok = openAppleSubscriptions();
        if (!ok) showIAPToast("Bridge not available: cannot open Apple subscriptions.");
        return;
      }

      if (shouldUpgrade(text)) {
        e.preventDefault();
        e.stopPropagation();
        showIAPToast("Opening upgrade…");
        nativeDebugPing(`Intercepted upgrade (${phaseLabel})`);
        const ok = openNativePaywall();
        if (!ok) showIAPToast("Bridge not available: cannot open upgrade.");
        return;
      }
    };

    const onPointerDown = (e) => intercept(e, "pointerdown");
    const onTouchEnd = (e) => intercept(e, "touchend");
    const onClick = (e) => intercept(e, "click");

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("touchend", onTouchEnd, true);
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("touchend", onTouchEnd, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [ios]);

  useEffect(() => {
    if (userLoading) return;
    if (!user?.email) return;
    if (hasPaidAccess) return;
    if (PUBLIC_PAGES.has(currentPageName)) return;
    if (!shouldShowSubscribePrompt()) return;

    setShowSubscribePrompt(true);
    markSubscribePromptShown();
  }, [userLoading, user?.email, hasPaidAccess, currentPageName, PUBLIC_PAGES]);

  useEffect(() => {
    if (userLoading) return;
    if (!user?.email) return;
    if (!hasPaidAccess) return;
    if (user?.foundingMemberAcknowledged) return;

    const foundingCutoff = new Date("2026-02-01T00:00:00.000Z");
    const startedAt = subscription?.subscriptionStartedAt || subscription?.started_at || subscription?.current_period_start;

    if (!startedAt) return;

    const subscriptionDate = new Date(startedAt);
    if (subscriptionDate < foundingCutoff) {
      setShowFoundingMemberPopup(true);
    }
  }, [userLoading, user, hasPaidAccess, subscription]);

  if (!ageConfirmed) {
    return (
      <AgeGate
        onConfirm={() => {
          localStorage.setItem(AGE_GATE_KEY, "true");
          setAgeConfirmed(true);
        }}
      />
    );
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
            <div className="text-5xl animate-pulse">🔄</div>
          </div>
          <p className="text-[#e8d5b7]">{ui("common.loading")}</p>
        </div>
      </div>
    );
  }

  if ((userError || !user?.email) && !PUBLIC_PAGES.has(currentPageName)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
            <div className="text-5xl">🔒</div>
          </div>
          <p className="text-[#e8d5b7] text-lg font-semibold mb-6">{ui("auth.loginPrompt")}</p>
          <Button onClick={() => navigate(createPageUrl("Auth"))}>{ui("auth.login")}</Button>
        </div>
      </div>
    );
  }

  // Block render until subscription is ready (prevents provider mis-detection)
  if (!subscriptionReady) {
    return null;
  }

  return (
    <GlobalErrorBoundary>
      <ErrorBoundary>
        <DocumentTitle title="PipeKeeper" />
        <Toaster position="top-center" />
        <MeasurementProvider>
        <div className="dark min-h-screen flex flex-col bg-gradient-to-br from-[#0B1320] via-[#112133] to-[#0B1320]" style={{ colorScheme: 'dark' }}>
          <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-[#1A2B3A]/95 backdrop-blur-lg border-b border-[#A35C5C]/50 shadow-lg overflow-x-hidden" style={{ paddingTop: 'var(--safe-area-top)' }}>
            <div className="w-full">
              <div className="flex items-center justify-between h-16 gap-2 px-3 lg:px-6">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <BackButton currentPageName={currentPageName} />
                  <Link to={createPageUrl("Home")} className="flex items-center gap-2 flex-shrink-0">
                    <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="w-7 h-7 lg:w-8 lg:h-8 object-contain" />
                    <span className="font-bold text-lg lg:text-xl text-[#E0D8C8] hidden sm:inline whitespace-nowrap">PipeKeeper</span>
                  </Link>
                </div>

                <div className="flex items-center gap-1 flex-1 justify-start min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide px-2">
                   {navItems.map((item) => (
                     <NavLink
                       key={item.page}
                       item={item}
                       currentPage={currentPageName}
                       hasPaidAccess={hasPaidAccess}
                     />
                   ))}
                   {adminNavItems.length > 0 && (
                     <>
                       <div className="h-6 w-px bg-[#E0D8C8]/20 mx-2" />
                       {adminNavItems.map((item) => (
                         <NavLink
                           key={item.page}
                           item={item}
                           currentPage={currentPageName}
                           hasPaidAccess={hasPaidAccess}
                         />
                       ))}
                     </>
                   )}
                 </div>

                <div className="flex items-center gap-1 lg:gap-3 flex-shrink-0">
                  <LanguageSwitcher />
                  <GlobalSearchTrigger />
                  <button
                    onClick={() => setShowQuickAccess(true)}
                    className="text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-colors text-xs lg:text-sm font-medium px-1.5 lg:px-3 py-1.5 rounded-lg hover:bg-white/5 overflow-hidden text-ellipsis whitespace-nowrap hidden lg:block"
                  >
                    {ui("nav.quickAccess")}
                  </button>
                  {syncing ? (
                    <span className="text-xs text-[#E0D8C8]/70 whitespace-nowrap hidden lg:inline">{ui("nav.syncing")}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </nav>

          <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#1A2B3A]/95 backdrop-blur-lg border-b border-[#A35C5C]/50 shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <div className="flex items-center justify-between h-16 px-4">
              <div className="flex items-center gap-2">
                <BackButton currentPageName={currentPageName} />
                <Link to={createPageUrl("Home")} className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                  <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="w-7 h-7 object-contain" />
                  <span className="font-bold text-lg text-[#E0D8C8]">PipeKeeper</span>
                </Link>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileOpen((prev) => !prev);
                }}
                className="text-[#E0D8C8] p-2 -mr-2 hover:bg-[#A35C5C]/20 rounded-lg active:scale-95 transition-all duration-200"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </nav>

          <div
            className={cn(
              "md:hidden fixed inset-0 bg-black/50 z-50 transition-opacity duration-200",
              mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setMobileOpen(false)}
            style={{ top: 'calc(56px + var(--safe-area-top))' }}
          />

          <div
            className={cn(
              "md:hidden fixed right-0 w-64 bg-white z-50 shadow-xl overflow-y-auto transition-transform duration-200",
              mobileOpen ? "translate-x-0" : "translate-x-full"
            )}
            style={{ 
              top: 'calc(4rem + env(safe-area-inset-top, 0px))',
              height: 'calc(100vh - 4rem - env(safe-area-inset-top, 0px))'
            }}
          >
            <div className="flex flex-col gap-2 p-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.page}
                  item={item}
                  currentPage={currentPageName}
                  onClick={() => setMobileOpen(false)}
                  hasPaidAccess={hasPaidAccess}
                  isMobile={true}
                />
              ))}
              
              {adminNavItems.length > 0 && (
                <>
                  <div className="h-px bg-gray-200 my-2" />
                  <p className="text-xs text-gray-500 px-2 mb-1 uppercase tracking-wider">Admin</p>
                  {adminNavItems.map((item) => (
                    <NavLink
                      key={item.page}
                      item={item}
                      currentPage={currentPageName}
                      onClick={() => setMobileOpen(false)}
                      hasPaidAccess={hasPaidAccess}
                      isMobile={true}
                    />
                  ))}
                </>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <LanguageSwitcher />
              </div>
            </div>
          </div>

          <main className="flex-1 pb-20 md:pt-16" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
                    <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                      {/* Show logged out message if redirected from logout */}
                      {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("loggedOut") === "1" && (
                        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                          <p className="text-sm text-green-400">You've been logged out successfully.</p>
                        </div>
                      )}
                      {children}
                    </div>
                  </main>

          <footer className="bg-[#1A2B3A]/95 border-t border-[#A35C5C]/50 mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="w-5 h-5 object-contain" />
                  <span className="text-sm text-[#E0D8C8]/70">© 2025 PipeKeeper. All rights reserved.</span>
                </div>
                <div className="flex gap-6">
                  <a href={createPageUrl("FAQ")} className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline whitespace-nowrap overflow-hidden text-ellipsis">
                    {ui("nav.faq")}
                  </a>
                  <a href={createPageUrl("Support")} className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline whitespace-nowrap overflow-hidden text-ellipsis">
                    {ui("nav.support")}
                  </a>
                  <a href={createPageUrl("TermsOfService")} className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline whitespace-nowrap overflow-hidden text-ellipsis">
                    {ui("nav.terms")}
                  </a>
                  <a href={createPageUrl("PrivacyPolicy")} className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline whitespace-nowrap overflow-hidden text-ellipsis">
                    {ui("nav.privacy")}
                  </a>
                </div>
              </div>
            </div>
          </footer>

          <TermsGate user={user} />

          <FoundingMemberPopup
            isOpen={showFoundingMemberPopup}
            onClose={async () => {
              setShowFoundingMemberPopup(false);
              try {
                await base44.auth.updateMe({ foundingMemberAcknowledged: true });
                await queryClient.invalidateQueries({ queryKey: ["current-user"] });
              } catch (err) {
                console.error("Failed to update founding member status:", err);
              }
            }}
          />

          {showSubscribePrompt && (
            <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-2xl bg-[#243548] border border-[#A35C5C]/60 shadow-2xl p-6">
                <h3 className="text-[#E0D8C8] text-xl font-bold mb-2">{ui("subscription.trialEndedTitle")}</h3>
                <p className="text-[#E0D8C8]/80 mb-5">
                  {ui("subscription.trialEndedBody")}
                </p>
                <div className="flex gap-3 justify-end">
                  <Button variant="secondary" onClick={() => setShowSubscribePrompt(false)}>
                    {ui("subscription.continueFree")}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowSubscribePrompt(false);
                      navigate(createPageUrl("Subscription"));
                    }}
                  >
                    {ui("subscription.subscribe")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <EntitlementDebug />

          <FeatureQuickAccess isOpen={showQuickAccess} onClose={() => setShowQuickAccess(false)} />

          {iapToast && (
            <div
              style={{
                position: "fixed",
                left: "50%",
                bottom: "24px",
                transform: "translateX(-50%)",
                padding: "10px 14px",
                borderRadius: "12px",
                background: "rgba(0,0,0,0.85)",
                color: "white",
                zIndex: 999999,
                fontSize: "14px",
                maxWidth: "340px",
                textAlign: "center",
              }}
            >
              {iapToast}
            </div>
          )}

          {ios && (
            <div
              style={{
                position: "fixed",
                right: 10,
                bottom: 10,
                padding: "6px 10px",
                borderRadius: 10,
                background: "rgba(0,0,0,0.18)",
                fontSize: 12,
                zIndex: 999999,
                pointerEvents: "none",
              }}
            >
              Bridge: ✅ | {subActive ? "Pro ✅" : "Free"}
            </div>
          )}
        </div>
      </MeasurementProvider>
    </ErrorBoundary>
  </GlobalErrorBoundary>
  );
}