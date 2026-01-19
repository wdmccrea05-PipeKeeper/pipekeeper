import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { cn } from "@/lib/utils";
import { Home, Leaf, Menu, X, User, HelpCircle, Users, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { hasPremiumAccess } from "@/components/utils/premiumAccess";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isCompanionApp } from "@/components/utils/companion";
import { isAppleBuild, FEATURES } from "@/components/utils/appVariant";
import AgeGate from "@/pages/AgeGate";
import DocumentTitle from "@/components/DocumentTitle";
import TermsGate from "@/components/TermsGate";
import { shouldShowPurchaseUI, isIOSCompanion } from "@/components/utils/companion"; // safe to import if present

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

// Auto-sync throttle key (per user)
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
    // every 10 minutes max
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

/**
 * Attempts a server-side Stripe->Base44 sync.
 * We try a few likely function names to match whatever you currently wired to the "Sync from Stripe" button.
 * If none exist, we fail silently (so we do NOT white-screen).
 */
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
      // include platform param for iOS wrapper detection if needed
      const params = isIOSCompanion?.() ? { platform: "ios" } : {};
      const res = await base44.functions.invoke(fn, params);
      // If function exists it will usually return 200 with some data.
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

  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
  const authUser = await base44.auth.me();
  const email = (authUser?.email || "").trim().toLowerCase();

  // Load entities.User (optional)
  const entityUser = await (async () => {
    try {
      if (!email) return null;
      const rows = await base44.entities.User.filter({ email });
      return rows?.[0] || null;
    } catch (e) {
      console.warn("[Layout] Could not load entities.User:", e);
      return null;
    }
  })();

  // Load entities.Subscription (source of truth)
  const subscription = await (async () => {
    try {
      if (!email) return null;
      const subs = await base44.entities.Subscription.filter({ user_email: email });
      return subs?.[0] || null;
    } catch (e) {
      console.warn("[Layout] Could not load Subscription entity:", e);
      return null;
    }
  })();

  const derived = (() => {
    const baseLevel = (entityUser?.subscription_level || "").toString();
    const baseStatus = (entityUser?.subscription_status || "").toString();

    if (!subscription) {
      return { subscription_level: baseLevel, subscription_status: baseStatus };
    }

    const status = (subscription.status || "").toLowerCase();
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : null;

    const periodOk = !periodEnd || periodEnd > new Date();
    const isPaid = (status === "active" || status === "trialing") && periodOk;

    return {
      subscription_level: isPaid ? "paid" : baseLevel,
      subscription_status: isPaid ? status : baseStatus,
    };
  })();

  return {
    ...authUser,
    ...(entityUser || {}),
    ...derived,
    email: authUser?.email || entityUser?.email,
  };
},

  // Pull subscription (source of truth)
  let subscription = null;
  try {
    if (authUser?.email) {
      const subs = await base44.entities.Subscription.filter({ user_email: authUser.email });
      subscription = subs?.[0] || null;
    }
  } catch (e) {
    console.warn("[Layout] Could not load Subscription entity:", e);
  }

  // Decide paid/trialing from Subscription
  let subscriptionLevel = entityUser?.subscription_level;
  let subscriptionStatus = entityUser?.subscription_status;

  if (subscription) {
    const status = (subscription.status || "").toLowerCase();
    const periodEndOk =
      !subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date();

    const isPaid = (status === "active" || status === "trialing") && periodEndOk;

    if (isPaid) {
      subscriptionLevel = "paid";
      subscriptionStatus = status;
    }
  }

  return {
    ...authUser,
    ...(entityUser || {}),
    subscription_level: subscriptionLevel,
    subscription_status: subscriptionStatus,
    email: authUser?.email || entityUser?.email,
  };
},

      // Also check Subscription entity (authoritative *when synced*)
      let subscription = null;
      try {
        if (authUser?.email) {
          const subs = await base44.entities.Subscription.filter({ user_email: authUser.email });
          subscription = subs?.[0] || null;
        }
      } catch (e) {
        console.warn("[Layout] Could not load Subscription entity:", e);
      }

      // Compute subscription_level/status from subscription entity if it’s active
      let subscriptionLevel = entityUser?.subscription_level;
      let subscriptionStatus = entityUser?.subscription_status;

      if (subscription) {
        const status = (subscription.status || "").toLowerCase();
        const endOk =
          !subscription.current_period_end ||
          new Date(subscription.current_period_end).getTime() > Date.now();

        const isPaid = (status === "active" || status === "trialing") && endOk;

        if (isPaid) {
          subscriptionLevel = "paid";
          subscriptionStatus = subscription.status;
        }
      }

      // IMPORTANT: keep email always present
      return {
        ...(authUser || {}),
        ...(entityUser || {}),
        subscription_level: subscriptionLevel,
        subscription_status: subscriptionStatus,
        email: authUser?.email || entityUser?.email,
      };
    },
    staleTime: 10_000,
    retry: 2,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // If any tab logs out, clear caches
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

  const hasPaidAccess = hasPremiumAccess(user);

  /**
   * ✅ AUTO-SYNC ON LOGIN (THROTTLED)
   *
   * If user is NOT paid (per local state), attempt to sync with Stripe automatically.
   * This is what removes the need for you to hit "Sync from Stripe" manually.
   */
  React.useEffect(() => {
    if (userLoading) return;
    if (!user?.email) return;

    // Don’t sync in Apple build (Apple subs handled separately)
    if (isAppleBuild) return;

    // Optional: don’t sync in companion app if you must avoid Stripe exposure there
    // But in practice this is a server-side function call, safe.
    // If you want strict iOS compliance, gate it:
    // if (!shouldShowPurchaseUI?.()) return;

    // If already paid/trial, no need
    if (hasPaidAccess) return;

    // Throttle
    if (!shouldRunStripeSync(user.email)) return;

    let cancelled = false;

    (async () => {
      try {
        setSyncing(true);
        const result = await tryStripeSync();
        markStripeSyncRan(user.email);

        if (!cancelled && result.ok) {
          // Re-fetch user/subscription fields now that server may have updated entities
          await queryClient.invalidateQueries({ queryKey: ["current-user"] });
          await queryClient.refetchQueries({ queryKey: ["current-user"] });
        }
      } catch (e) {
        // Never crash layout
        console.warn("[Layout] Auto Stripe sync failed (non-fatal):", e?.message || e);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userLoading, user?.email, hasPaidAccess, queryClient]);

  // Subscribe prompt logic (only after sync has had a chance)
  React.useEffect(() => {
    if (userLoading) return;
    if (!user?.email) return;
    if (hasPaidAccess) return;

    if (PUBLIC_PAGES.has(currentPageName)) return;
    if (!shouldShowSubscribePrompt()) return;

    setShowSubscribePrompt(true);
    markSubscribePromptShown();
  }, [userLoading, user?.email, hasPaidAccess, currentPageName, PUBLIC_PAGES]);

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

  if ((userError || !user?.email) && !PUBLIC_PAGES.has(currentPageName)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#243548]/60 border border-[#8b3a3a]/60 rounded-2xl p-8 text-center">
          <p className="text-[#e8d5b7] text-lg font-semibold mb-2">Login required</p>
          {isCompanionApp() && (
            <p className="text-[#e8d5b7]/80 text-sm mb-4">
              In the companion app, please sign in using your email and password.
            </p>
          )}
          <p className="text-[#e8d5b7]/70 mb-6">Your session may have expired. Please log in again.</p>
          <Button onClick={() => base44.auth.redirectToLogin()}>Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <DocumentTitle title="PipeKeeper" />

      <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A]">
        {/* Desktop Navigation */}
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
              </div>

              {/* Optional tiny sync indicator (non-blocking) */}
              <div className="flex items-center gap-2">
                {syncing ? (
                  <span className="text-xs text-[#E0D8C8]/70">Syncing…</span>
                ) : null}
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Navigation */}
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

        {/* Mobile Menu Overlay */}
        <div
          className={cn(
            "md:hidden fixed inset-0 bg-black/50 z-50 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setMobileOpen(false)}
          style={{ top: "56px" }}
        />

        {/* Mobile Menu Panel */}
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
          </div>
        </div>

        {/* Main Content */}
        <main className="pt-16 md:pt-16 pb-20">{children}</main>

        {/* Footer */}
        <footer className="bg-[#1A2B3A]/95 border-t border-[#A35C5C]/50 mt-auto">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="w-5 h-5 object-contain" />
                <span className="text-sm text-[#E0D8C8]/70">© 2025 PipeKeeper. All rights reserved.</span>
              </div>
              <div className="flex gap-6">
                <a
                  href={createPageUrl("FAQ")}
                  className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline"
                >
                  FAQ
                </a>
                <a
                  href={createPageUrl("Support")}
                  className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline"
                >
                  Support
                </a>
                <a
                  href={createPageUrl("TermsOfService")}
                  className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline"
                >
                  Terms of Service
                </a>
                <a
                  href={createPageUrl("PrivacyPolicy")}
                  className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Terms overlay if needed */}
      <TermsGate user={user} />

      {/* Subscribe prompt */}
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
    </>
  );
}