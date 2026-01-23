import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { cn } from "@/lib/utils";
import { Home, Leaf, Menu, X, User, HelpCircle, Users, Crown, AlertCircle } from "lucide-react";
import GlobalSearchTrigger from "@/components/search/GlobalSearchTrigger";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MeasurementProvider } from "@/components/utils/measurementConversion";
import { Toaster } from "@/components/ui/sonner";
import { isCompanionApp } from "@/components/utils/companion";
import { isAppleBuild, FEATURES } from "@/components/utils/appVariant";
import AgeGate from "@/pages/AgeGate";
import DocumentTitle from "@/components/DocumentTitle";
import TermsGate from "@/components/TermsGate";
import { shouldShowPurchaseUI, isIOSCompanion } from "@/components/utils/companion";
import { PK_THEME } from "@/components/utils/pkTheme";
import FoundingMemberPopup from "@/components/subscription/FoundingMemberPopup";
import EntitlementDebug from "@/components/debug/EntitlementDebug";
import { isIOSWebView, registerNativeSubscriptionListener, requestNativeSubscriptionStatus } from "@/components/utils/nativeIAPBridge";

const PIPEKEEPER_LOGO =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6be04be36_Screenshot2025-12-22at33829PM.png";
const PIPE_ICON =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/15563e4ee_PipeiconUpdated-fotor-20260110195319.png";

const navItems = [
  { name: "Home", page: "Home", icon: Home, isIconComponent: true },
  { name: "Pipes", page: "Pipes", icon: PIPE_ICON, isIconComponent: false },
  { name: isAppleBuild ? "Cellar" : "Tobacco", page: "Tobacco", icon: Leaf, isIconComponent: true },
  ...(FEATURES.community ? [{ name: "Community", page: "Community", icon: Users, isIconComponent: true, isPremium: true }] : []),
  { name: "Profile", page: "Profile", icon: User, isIconComponent: true },
  { name: "Help", page: "FAQ", icon: HelpCircle, isIconComponent: true },
];

const adminNavItems = [
  { name: "Reports", page: "AdminReports", icon: AlertCircle, isIconComponent: true },
];

function NavLink({ item, currentPage, onClick, hasPaidAccess, isMobile = false }) {
  const isActive = currentPage === item.page;

  return (
    <Link
      to={createPageUrl(item.page)}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 transform hover:scale-105",
        isActive
          ? "bg-gradient-to-r from-[#A35C5C] to-[#8B4A4A] text-[#E0D8C8] shadow-md"
          : isMobile
          ? "text-[#1a2c42] hover:bg-[#A35C5C]/10"
          : "text-[#E0D8C8]/70 hover:bg-[#A35C5C]/30 hover:text-[#E0D8C8]"
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
      aria-current={isActive ? "page" : undefined}
      role="link"
    >
      {item.isIconComponent ? (
        <item.icon className="w-5 h-5" />
      ) : (
        <img
          src={item.icon}
          alt={item.name}
          className="w-6 h-6 object-contain"
          style={{
            filter: isMobile
              ? "brightness(0)"
              : isActive
              ? "invert(1) sepia(0.35) saturate(0.4) hue-rotate(350deg) brightness(1)"
              : "invert(1) sepia(0.35) saturate(0.4) hue-rotate(350deg) brightness(0.9) opacity(0.7)",
          }}
        />
      )}

      <span>{item.name}</span>

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

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [ageConfirmed, setAgeConfirmed] = React.useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(AGE_GATE_KEY) === "true";
    return false;
  });
  const [showSubscribePrompt, setShowSubscribePrompt] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [showFoundingMemberPopup, setShowFoundingMemberPopup] = React.useState(false);
  const [iapToast, setIapToast] = React.useState("");

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isIOSApp = React.useMemo(() => isIOSWebView(), []);

  const PUBLIC_PAGES = React.useMemo(
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
      ]),
    []
  );

  const { user, isLoading: userLoading, error: userError, hasPremium: hasPaidAccess, isAdmin, subscription } = useCurrentUser();

  React.useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "logout") {
        queryClient.removeQueries({
          predicate: (query) => query.queryKey[0] !== "current-user",
        });
        setTimeout(() => window.location.reload(), 100);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [queryClient]);



  React.useEffect(() => {
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
          await queryClient.refetchQueries({ queryKey: ["current-user"] });
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

  // Backfill founding member status for early subscribers
  React.useEffect(() => {
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

  // Listen for native iOS subscription status updates
  React.useEffect(() => {
    if (!isIOSApp) return;

    // Request initial status
    requestNativeSubscriptionStatus();

    // Listen for updates
    const cleanup = registerNativeSubscriptionListener((status) => {
      console.log("[Layout] Native subscription status:", status);
      // Refetch user data to sync with backend
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    });

    return cleanup;
  }, [isIOSApp, queryClient]);

  // iOS WKWebView: Intercept subscription management clicks globally
  React.useEffect(() => {
    if (!isIOSApp) return;

    const showIAPToast = (msg) => {
      setIapToast(msg);
      clearTimeout(showIAPToast._timer);
      showIAPToast._timer = setTimeout(() => setIapToast(""), 2600);
    };

    const handler = (e) => {
      const target = e.target;
      const el = target?.closest?.("button, a, [role='button']");
      if (!el) return;

      const text = (el.innerText || el.textContent || "").trim().toLowerCase();

      const isManage =
        text.includes("manage subscription") ||
        text.includes("update subscription") ||
        text.includes("cancel subscription") ||
        text.includes("manage plan") ||
        text.includes("manage billing");

      const isUpgrade =
        text === "upgrade" ||
        text.includes("upgrade to pro") ||
        text.includes("upgrade (app store)") ||
        text.includes("subscribe") ||
        text.includes("go pro");

      if (isManage) {
        e.preventDefault();
        e.stopPropagation();
        const success = openAppleSubscriptions();
        if (!success) showIAPToast("Unable to open Apple subscriptions. Please try again.");
        return;
      }

      if (isUpgrade) {
        e.preventDefault();
        e.stopPropagation();
        const success = openNativePaywall();
        if (!success) showIAPToast("Unable to open upgrade screen. Please try again.");
        return;
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isIOSApp]);

  React.useEffect(() => {
    if (userLoading) return;
    if (!user?.email) return;
    if (hasPaidAccess) return;
    if (PUBLIC_PAGES.has(currentPageName)) return;
    if (!shouldShowSubscribePrompt()) return;

    setShowSubscribePrompt(true);
    markSubscribePromptShown();
  }, [userLoading, user?.email, hasPaidAccess, currentPageName, PUBLIC_PAGES]);

  // Founding Member popup for early supporters
  React.useEffect(() => {
    if (userLoading) return;
    if (!user?.email) return;
    if (!hasPaidAccess) return;
    if (user?.foundingMemberAcknowledged) return;
    
    // Check if subscription started before Feb 1, 2026 using normalized date
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
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6838e48a7_IMG_4833.jpeg"
            alt="PipeKeeper"
            className="w-32 h-32 mx-auto mb-4 object-contain animate-pulse"
          />
          <p className="text-[#e8d5b7]">Loading...</p>
        </div>
      </div>
    );
  }

  if ((userError || !user?.email) && !PUBLIC_PAGES.has(currentPageName)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center p-4">
        <div className="text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6838e48a7_IMG_4833.jpeg"
            alt="PipeKeeper"
            className="w-32 h-32 mx-auto mb-4 object-contain"
          />
          <p className="text-[#e8d5b7] text-lg font-semibold mb-6">Please log in to continue</p>
          <Button onClick={() => base44.auth.redirectToLogin()}>Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <DocumentTitle title="PipeKeeper" />
      <Toaster position="top-center" />
      <MeasurementProvider>
        <div className={`min-h-screen ${PK_THEME.pageBg}`}>
          <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-[#1A2B3A]/95 backdrop-blur-lg border-b border-[#A35C5C]/50 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <div className="flex items-center justify-between h-16 gap-4">
              <Link to={createPageUrl("Home")} className="flex items-center gap-3 flex-shrink-0">
                <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="w-8 h-8 object-contain" />
                <span className="font-bold text-xl text-[#E0D8C8]">PipeKeeper</span>
              </Link>

              <div className="flex items-center gap-2 flex-1 justify-center max-w-3xl">
                {navItems.map((item) => (
                  <NavLink
                    key={item.page}
                    item={item}
                    currentPage={currentPageName}
                    hasPaidAccess={hasPaidAccess}
                  />
                ))}
                {isAdmin && adminNavItems.map((item) => (
                  <NavLink
                    key={item.page}
                    item={item}
                    currentPage={currentPageName}
                    hasPaidAccess={hasPaidAccess}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <GlobalSearchTrigger />
                {syncing ? (
                  <span className="text-xs text-[#E0D8C8]/70">Syncing…</span>
                ) : null}
              </div>
            </div>
            </div>
          </nav>

          <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#1A2B3A]/95 backdrop-blur-lg border-b border-[#A35C5C]/50 shadow-lg">
          <div className="flex items-center justify-between h-14 px-4">
            <Link to={createPageUrl("Home")} className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
              <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="w-7 h-7 object-contain" />
              <span className="font-bold text-lg text-[#E0D8C8]">PipeKeeper</span>
            </Link>

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
            style={{ top: "56px" }}
          />

          <div
          className={cn(
            "md:hidden fixed top-14 right-0 w-64 h-[calc(100vh-56px)] bg-white z-50 shadow-xl overflow-y-auto transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "translate-x-full"
          )}
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
            {isAdmin && adminNavItems.map((item) => (
              <NavLink
                key={item.page}
                item={item}
                currentPage={currentPageName}
                onClick={() => setMobileOpen(false)}
                hasPaidAccess={hasPaidAccess}
                isMobile={true}
              />
            ))}
          </div>
          </div>

          <main className="pt-16 md:pt-16 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                <a href={createPageUrl("FAQ")} className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline">
                  FAQ
                </a>
                <a href={createPageUrl("Support")} className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline">
                  Support
                </a>
                <a href={createPageUrl("TermsOfService")} className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline">
                  Terms of Service
                </a>
                <a href={createPageUrl("PrivacyPolicy")} className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline">
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
          </footer>
        </div>

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
               <h3 className="text-[#E0D8C8] text-xl font-bold mb-2">Your free trial has ended</h3>
               <p className="text-[#E0D8C8]/80 mb-5">
                 To continue using Premium features, please start a subscription. You can keep using free collection features anytime.
               </p>
               <div className="flex gap-3 justify-end">
                 <Button variant="secondary" onClick={() => setShowSubscribePrompt(false)}>
                   Continue Free
                 </Button>
                 <Button
                   onClick={() => {
                     setShowSubscribePrompt(false);
                     navigate(createPageUrl("Subscription"));
                   }}
                 >
                   Subscribe
                 </Button>
               </div>
             </div>
           </div>
         )}

        <EntitlementDebug />

        {/* iOS IAP Toast */}
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
        </MeasurementProvider>
        </>
        );
        }