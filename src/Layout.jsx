import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { cn } from "@/lib/utils";
import GlobalErrorBoundary from "@/components/system/GlobalErrorBoundary";
import {
  Home,
  Menu,
  X,
  User,
  HelpCircle,
  Users,
  Crown,
  Settings,
  Shield,
  FileText,
  Target,
} from "lucide-react";
import BrandLogo from "@/components/branding/BrandLogo";
import {
  MODULE_ICONS,
  getModuleIcon as getModuleIconSrc,
} from "@/components/branding/moduleAssets";
import GlobalSearchTrigger from "@/components/search/GlobalSearchTrigger";
import BackButton from "@/components/navigation/BackButton";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";
import { MeasurementProvider } from "@/components/utils/measurementConversion";
import { Toaster } from "@/components/ui/sonner";
import { isAppleBuild, FEATURES } from "@/components/utils/appVariant";
import AgeGate from "@/pages/AgeGate";
import DocumentTitle from "@/components/DocumentTitle";
import TermsGate from "@/components/TermsGate";
import FoundingMemberPopup from "@/components/subscription/FoundingMemberPopup";
import WhatsNewPopup from "@/components/onboarding/WhatsNewPopup";
import EntitlementDebug from "@/components/debug/EntitlementDebug";
import PermissionDebugPanel from "@/components/debug/PermissionDebugPanel";
import {
  isIOSWebView,
  openAppleSubscriptions,
  openNativePaywall,
  requestNativeSubscriptionStatus,
  registerNativeSubscriptionListener,
  nativeDebugPing,
} from "@/components/utils/nativeIAPBridge";
import { useTranslation } from "@/components/i18n/safeTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import FeatureQuickAccess from "@/components/navigation/FeatureQuickAccess";

const PIPE_ICON =
  getModuleIconSrc?.("pipekeeper") || MODULE_ICONS?.pipekeeper || "";
const WHISKEY_ICON =
  getModuleIconSrc?.("whiskeykeeper") || MODULE_ICONS?.whiskeykeeper || "";

const AGE_GATE_KEY = "ck_age_confirmed";
const SUB_PROMPT_KEY = "ck_subscribe_prompt_last_shown";

function syncKey(email) {
  return `ck_stripe_sync_last_${email || "unknown"}`;
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
      const res = await base44.functions.invoke(fn, {});
      return { ok: true, fn, res };
    } catch {
      // try next
    }
  }

  return { ok: false };
}

function safeLabel(t, key, fallback) {
  const value = t(key, fallback);
  return typeof value === "string" && value.trim() ? value : fallback;
}

function NavLink({
  item,
  currentPage,
  onClick,
  hasPaidAccess,
  isMobile = false,
  isNav = false,
}) {
  const isActive = currentPage === item.page;

  return (
    <Link
      to={createPageUrl(item.page)}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 font-medium transition-all duration-200 flex-shrink-0 whitespace-nowrap",
        isNav ? "px-2 sm:px-3 py-2 text-xs" : "px-3 py-2.5 text-sm",
        isMobile && "text-[#E0D8C8]"
      )}
      style={{
        WebkitTapHighlightColor: "transparent",
        borderRadius: "0.375rem",
        ...(isActive
          ? {
              background:
                "linear-gradient(135deg, rgba(100, 70, 45, 0.7), rgba(80, 55, 35, 0.8))",
              border: "1px solid rgba(120, 90, 65, 0.5)",
              color: "#F5F1E7",
              boxShadow:
                "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180,140,100,0.15)",
            }
          : isMobile
            ? {
                color: "#E0D8C8",
              }
            : {
                color: "rgba(224, 216, 200, 0.7)",
              }),
      }}
      aria-current={isActive ? "page" : undefined}
      title={item.name}
    >
      {item.isIconComponent ? (
        <item.icon
          className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0"
          style={{
            color: isActive
              ? "rgba(180, 140, 75, 1)"
              : isMobile
                ? "rgba(224, 216, 200, 0.8)"
                : "rgba(180, 140, 75, 0.7)",
          }}
        />
      ) : (
        <img
          src={item.icon}
          alt={item.name}
          className="w-4 sm:w-5 h-4 sm:h-5 object-contain flex-shrink-0 bg-transparent"
          style={{
            backgroundColor: "transparent",
            mixBlendMode: "normal",
            opacity: isMobile ? 0.92 : isActive ? 1 : 0.78,
            filter: isActive
              ? "drop-shadow(0 1px 3px rgba(0,0,0,0.25))"
              : "drop-shadow(0 1px 2px rgba(0,0,0,0.2))",
          }}
          draggable={false}
        />
      )}

      <span
        className={cn(
          "truncate hidden sm:inline text-xs sm:text-sm",
          isMobile ? "inline" : ""
        )}
      >
        {item.name}
      </span>

      {item.isPremium && !hasPaidAccess ? (
        <Crown
          className="w-2.5 sm:w-3 h-2.5 sm:h-3 flex-shrink-0"
          style={{ color: "#D4AF37" }}
        />
      ) : null}
    </Link>
  );
}

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(AGE_GATE_KEY) === "true";
    }
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
  const { t, lang } = useTranslation();

  const {
    user,
    isLoading: userLoading,
    error: userError,
    hasPaid,
    isAdmin,
    subscription,
  } = useCurrentUser();

  const { isModuleEnabled } = useModuleVisibility();

  const navItems = useMemo(() => {
    const items = [
      {
        name: safeLabel(t, "nav.hub", "Hub"),
        page: "CollectionHub",
        icon: Home,
        isIconComponent: true,
      },
      {
        name: safeLabel(t, "nav.pipekeeper", "PipeKeeper"),
        page: "PipeKeeper",
        icon: PIPE_ICON,
        isIconComponent: false,
      },
    ];

    if (isModuleEnabled("whiskeykeeper")) {
      items.push({
        name: safeLabel(t, "nav.whiskeykeeper", "WhiskeyKeeper"),
        page: "WhiskeyKeeper",
        icon: WHISKEY_ICON,
        isIconComponent: false,
      });
    }

    items.push({
      name: safeLabel(t, "nav.curator", "Curator"),
      page: "Curator",
      icon: Target,
      isIconComponent: true,
    });

    if (FEATURES.community) {
      items.push({
        name: safeLabel(t, "nav.community", "Community"),
        page: "Community",
        icon: Users,
        isIconComponent: true,
        isPremium: true,
      });
    }

    items.push(
      {
        name: safeLabel(t, "nav.profile", "Profile"),
        page: "Profile",
        icon: User,
        isIconComponent: true,
      },
      {
        name: safeLabel(t, "nav.help", "Help"),
        page: "HelpCenter",
        icon: HelpCircle,
        isIconComponent: true,
      }
    );

    return items;
  }, [t, lang, isModuleEnabled]);

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
      ]),
    []
  );

  const adminNavItems = useMemo(
    () =>
      isAdmin
        ? [
            {
              name: safeLabel(
                t,
                "nav.subscriptionSupport",
                "Subscription Support"
              ),
              page: "SubscriptionSupport",
              icon: Settings,
              isIconComponent: true,
            },
            {
              name: safeLabel(t, "nav.userReport", "User Report"),
              page: "UserReport",
              icon: Users,
              isIconComponent: true,
            },
            {
              name: safeLabel(
                t,
                "nav.contentModeration",
                "Content Moderation"
              ),
              page: "AdminReports",
              icon: Shield,
              isIconComponent: true,
            },
            {
              name: safeLabel(t, "nav.eventsLog", "Events Log"),
              page: "SubscriptionEventsLog",
              icon: FileText,
              isIconComponent: true,
            },
            {
              name: "Curator Analytics",
              page: "CuratorAnalyticsDashboard",
              icon: Target,
              isIconComponent: true,
            },
          ]
        : [],
    [isAdmin, t, lang]
  );

  useEffect(() => {
    const handlePopState = () => {
      if (mobileOpen) setMobileOpen(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [mobileOpen]);

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
    if (hasPaid) return;
    if (!shouldRunStripeSync(user.email)) return;

    let cancelled = false;

    (async () => {
      try {
        setSyncing(true);
        const result = await tryStripeSync();
        markStripeSyncRan(user.email);

        if (!cancelled && result.ok) {
        await queryClient.invalidateQueries({ queryKey: ["current-user"], exact: true });
        await queryClient.invalidateQueries({ queryKey: ["subscription"], exact: true });
        await queryClient.refetchQueries({ queryKey: ["current-user"], exact: true });
        await queryClient.refetchQueries({ queryKey: ["subscription"], exact: true });
        }
      } catch (e) {
        console.warn("[Layout] Auto Stripe sync failed:", e?.message || e);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userLoading, user?.email, hasPaid, queryClient]);

  useEffect(() => {
    if (userLoading) return;
    if (!user?.email) return;
    if (user?.isFoundingMember) return;
    if (!hasPaid) return;
    if (!subscription) return;

    (async () => {
      try {
        const { ensureFoundingMemberStatus } = await import(
          "@/components/utils/foundingMemberBackfill"
        );
        const updated = await ensureFoundingMemberStatus(user, subscription);
        if (updated) {
          await queryClient.invalidateQueries({ queryKey: ["current-user"] });
        }
      } catch (e) {
        console.warn(
          "[Layout] Founding member backfill failed:",
          e?.message || e
        );
      }
    })();
  }, [userLoading, user, subscription, hasPaid, queryClient]);

  useEffect(() => {
    if (!ios) return undefined;

    nativeDebugPing("Layout mounted");
    requestNativeSubscriptionStatus();

    const refreshStatus = () => {
      try {
        requestNativeSubscriptionStatus();
      } catch {
        // non-fatal
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshStatus();
    };

    window.addEventListener("focus", refreshStatus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const cleanup = registerNativeSubscriptionListener(async (payload) => {
      const active = !!payload.active;
      setSubActive(active);

      try {
        const result = await base44.functions.invoke(
          "syncAppleSubscriptionForMe",
          payload
        );

        if (result?.data?.code === "ALREADY_LINKED") {
          showIAPToast(safeLabel(t, "layout.iapAlreadyLinked", "Already linked"));
          return;
        }

        await queryClient.invalidateQueries({ queryKey: ["current-user"] });
        await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      } catch (e) {
        console.error("[Layout] Apple subscription sync failed:", e);
        showIAPToast(
          safeLabel(t, "layout.iapSyncFailed", "Subscription sync failed")
        );
      }
    });

    return () => {
      window.removeEventListener("focus", refreshStatus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cleanup?.();
    };
  }, [ios, queryClient, t]);

  useEffect(() => {
    if (!ios) return undefined;

    const getClickableText = (evtTarget) => {
      try {
        const path =
          typeof evtTarget?.composedPath === "function"
            ? evtTarget.composedPath()
            : [];
        const candidates = [];

        let el = evtTarget;
        for (let i = 0; i < 8 && el; i += 1) {
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

    const shouldManage = (text) => {
      const normalized = (text || "").trim().toLowerCase();
      return (
        normalized.includes("manage subscription") ||
        normalized.includes("update subscription") ||
        normalized.includes("cancel subscription") ||
        normalized.includes("manage plan") ||
        normalized.includes("manage billing")
      );
    };

    const shouldUpgrade = (text) => {
      const normalized = (text || "").trim().toLowerCase();
      return (
        normalized === "upgrade" ||
        normalized.includes("upgrade to pro") ||
        normalized.includes("upgrade (app store)") ||
        normalized.includes("subscribe") ||
        normalized.includes("go pro")
      );
    };

    const intercept = (e, phaseLabel) => {
      const text = getClickableText(e.target);

      if (shouldManage(text)) {
        e.preventDefault();
        e.stopPropagation();
        showIAPToast(
          safeLabel(
            t,
            "layout.iapOpeningSubscriptions",
            "Opening subscriptions…"
          )
        );
        nativeDebugPing(`Intercepted manage (${phaseLabel})`);
        const ok = openAppleSubscriptions();
        if (!ok) {
          showIAPToast(
            safeLabel(
              t,
              "layout.iapBridgeUnavailableSubs",
              "Unable to open subscriptions"
            )
          );
        }
        return;
      }

      if (shouldUpgrade(text)) {
        e.preventDefault();
        e.stopPropagation();
        showIAPToast(
          safeLabel(t, "layout.iapOpeningUpgrade", "Opening upgrade…")
        );
        nativeDebugPing(`Intercepted upgrade (${phaseLabel})`);
        const ok = openNativePaywall();
        if (!ok) {
          showIAPToast(
            safeLabel(
              t,
              "layout.iapBridgeUnavailableUpgrade",
              "Unable to open upgrade"
            )
          );
        }
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
  }, [ios, t]);

  useEffect(() => {
    if (userLoading) return;
    if (!user?.email) return;
    if (hasPaid) return;
    if (PUBLIC_PAGES.has(currentPageName)) return;
    if (!shouldShowSubscribePrompt()) return;

    setShowSubscribePrompt(true);
    markSubscribePromptShown();
  }, [userLoading, user?.email, hasPaid, currentPageName, PUBLIC_PAGES]);

  useEffect(() => {
    if (userLoading) return;
    if (!user?.email) return;
    if (!hasPaid) return;
    if (user?.foundingMemberAcknowledged) return;

    const foundingCutoff = new Date("2026-02-01T00:00:00.000Z");
    const startedAt =
      subscription?.subscriptionStartedAt ||
      subscription?.started_at ||
      subscription?.current_period_start;

    if (!startedAt) return;

    const subscriptionDate = new Date(startedAt);
    if (subscriptionDate < foundingCutoff) {
      setShowFoundingMemberPopup(true);
    }
  }, [userLoading, user, hasPaid, subscription]);

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
      <div className="min-h-screen bg-gradient-to-br from-[#0f0b08] via-[#1a1410] to-[#0f0b08] flex items-center justify-center p-4">
        <div className="text-center">
          <BrandLogo
            compact={false}
            showWordmark={false}
            className="justify-center"
            imageClassName="w-24 h-24 mx-auto mb-4 animate-pulse"
          />
          <p className="text-[#e8d5b7]">
            {safeLabel(t, "common.loading", "Loading…")}
          </p>
        </div>
      </div>
    );
  }

  if ((userError || !user?.email) && !PUBLIC_PAGES.has(currentPageName)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0b08] via-[#1a1410] to-[#0f0b08] flex items-center justify-center p-4">
        <div className="text-center">
          <BrandLogo
            compact={false}
            showWordmark={false}
            className="justify-center"
            imageClassName="w-24 h-24 mx-auto mb-4"
          />
          <p className="text-[#e8d5b7] text-lg font-semibold mb-6">
            {safeLabel(t, "auth.loginPrompt", "Please log in to continue")}
          </p>
          <Button onClick={() => base44.auth.redirectToLogin()}>
            {safeLabel(t, "auth.login", "Log In")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <GlobalErrorBoundary>
      <DocumentTitle title={safeLabel(t, "layout.appTitle", "CollectionKeeper")} />
      <Toaster position="top-center" />
      <MeasurementProvider>
        <div
          className="dark min-h-screen flex flex-col"
          style={{
            colorScheme: "dark",
            background:
              "linear-gradient(135deg, #2e2620 0%, #3a2f26 50%, #2e2620 100%), radial-gradient(circle at 30% 20%, rgba(180,140,100,0.3), transparent 40%), radial-gradient(circle at 80% 70%, rgba(140,110,80,0.35), transparent 50%)",
          }}
        >
          <nav
            className="hidden md:flex fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b overflow-x-hidden shadow-[0_3px_12px_rgba(0,0,0,0.65),inset_0_-1px_0_rgba(180,140,75,0.12)]"
            style={{
              paddingTop: "var(--safe-area-top)",
              background:
                "linear-gradient(to bottom, rgba(28, 20, 14, 0.97), rgba(24, 16, 12, 0.99))",
              borderBottomColor: "rgba(120, 90, 65, 0.35)",
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 4px,
                  rgba(80, 60, 40, 0.025) 4px,
                  rgba(80, 60, 40, 0.025) 5px
                )
              `,
            }}
          >
            <div className="w-full">
              <div className="flex items-center justify-between h-16 gap-2 px-3 lg:px-6">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <BackButton currentPageName={currentPageName} />
                  <Link
                    to={createPageUrl("CollectionHub")}
                    className="flex items-center gap-2 flex-shrink-0"
                  >
                    <div className="min-w-0 flex items-center">
                      <BrandLogo
                        compact
                        hoverable
                        className="min-w-0"
                        imageClassName="w-7 h-7"
                      />
                    </div>
                  </Link>
                </div>

                <div className="flex items-center gap-1 flex-1 justify-start min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide px-2">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.page}
                      item={item}
                      currentPage={currentPageName}
                      hasPaidAccess={hasPaid}
                      isNav
                    />
                  ))}

                  {adminNavItems.length > 0 ? (
                    <>
                      <div className="h-6 w-px bg-[#E0D8C8]/20 mx-2" />
                      {adminNavItems.map((item) => (
                        <NavLink
                          key={item.page}
                          item={item}
                          currentPage={currentPageName}
                          hasPaidAccess={hasPaid}
                        />
                      ))}
                    </>
                  ) : null}
                </div>

                <div className="flex items-center gap-1 lg:gap-3 flex-shrink-0">
                  <LanguageSwitcher />
                  <GlobalSearchTrigger />
                  <button
                    onClick={() => setShowQuickAccess(true)}
                    className="text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-colors text-xs lg:text-sm font-medium px-1.5 lg:px-3 py-1.5 rounded-lg hover:bg-white/5 overflow-hidden text-ellipsis whitespace-nowrap hidden lg:block"
                  >
                    {safeLabel(t, "nav.quickAccess", "Quick Access")}
                  </button>
                  {syncing ? (
                    <span className="text-xs text-[#E0D8C8]/70 whitespace-nowrap hidden lg:inline">
                      {safeLabel(t, "nav.syncing", "Syncing…")}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </nav>

          <nav
            className="md:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b shadow-[0_3px_12px_rgba(0,0,0,0.65),inset_0_-1px_0_rgba(180,140,75,0.12)]"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              background:
                "linear-gradient(to bottom, rgba(28, 20, 14, 0.97), rgba(24, 16, 12, 0.99))",
              borderBottomColor: "rgba(120, 90, 65, 0.35)",
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 4px,
                  rgba(80, 60, 40, 0.025) 4px,
                  rgba(80, 60, 40, 0.025) 5px
                )
              `,
            }}
          >
            <div className="flex items-center justify-between h-16 px-4">
              <div className="flex items-center gap-2">
                <BackButton currentPageName={currentPageName} />
                <Link
                  to={createPageUrl("CollectionHub")}
                  className="flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <BrandLogo
                    compact
                    hoverable
                    className="min-w-0"
                    imageClassName="w-7 h-7"
                  />
                </Link>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileOpen((prev) => !prev);
                }}
                className="text-[#E0D8C8] p-2 -mr-2 hover:bg-[#A35C5C]/20 rounded-lg active:scale-95 transition-all duration-200"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label={safeLabel(t, "layout.toggleMenu", "Toggle menu")}
              >
                {mobileOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </nav>

          <div
            className={cn(
              "md:hidden fixed inset-0 bg-black/50 z-50 transition-opacity duration-200",
              mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setMobileOpen(false)}
            style={{ top: "calc(56px + var(--safe-area-top))" }}
          />

          <div
            className={cn(
              "md:hidden fixed right-0 w-64 z-50 shadow-xl overflow-y-auto transition-transform duration-200",
              mobileOpen ? "translate-x-0" : "translate-x-full"
            )}
            style={{
              background:
                "linear-gradient(145deg, rgba(30,22,16,0.98), rgba(22,15,10,0.98))",
              borderLeft: "1px solid rgba(140,105,65,0.25)",
              top: "calc(4rem + env(safe-area-inset-top, 0px))",
              height: "calc(100vh - 4rem - env(safe-area-inset-top, 0px))",
            }}
          >
            <div className="flex flex-col gap-2 p-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.page}
                  item={item}
                  currentPage={currentPageName}
                  onClick={() => setMobileOpen(false)}
                  hasPaidAccess={hasPaid}
                  isMobile
                />
              ))}

              {adminNavItems.length > 0 ? (
                <>
                  <div className="h-px bg-[#8b6239]/25 my-2" />
                  <p className="text-xs text-[#8b6239]/70 px-2 mb-1 uppercase tracking-wider">
                    {safeLabel(t, "layout.admin", "Admin")}
                  </p>
                  {adminNavItems.map((item) => (
                    <NavLink
                      key={item.page}
                      item={item}
                      currentPage={currentPageName}
                      onClick={() => setMobileOpen(false)}
                      hasPaidAccess={hasPaid}
                      isMobile
                    />
                  ))}
                </>
              ) : null}

              <div className="mt-4 pt-4 border-t border-[#8b6239]/25">
                <LanguageSwitcher />
              </div>
            </div>
          </div>

          <main
            className="flex-1 pb-20 md:pt-16"
            style={{ paddingTop: "calc(4rem + env(safe-area-inset-top, 0px))" }}
          >
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
              {children}
            </div>
          </main>

          <footer
            className="border-t mt-auto shadow-[0_-3px_12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(180,140,75,0.1)]"
            style={{
              background:
                "linear-gradient(to top, rgba(20, 14, 10, 0.99), rgba(26, 18, 13, 0.96))",
              borderTopColor: "rgba(120, 90, 65, 0.3)",
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 4px,
                  rgba(80, 60, 40, 0.02) 4px,
                  rgba(80, 60, 40, 0.02) 5px
                )
              `,
            }}
          >
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <BrandLogo
                    compact
                    showWordmark={false}
                    imageClassName="w-5 h-5"
                  />
                  <span className="text-sm text-[#E0D8C8]/70">
                    {safeLabel(
                      t,
                      "footer.copyright",
                      "© 2026 CollectionKeeper"
                    )}
                  </span>
                </div>

                <div className="flex gap-6">
                  <a
                    href={createPageUrl("FAQ")}
                    className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    {safeLabel(t, "nav.faq", "FAQ")}
                  </a>
                  <a
                    href={createPageUrl("Support")}
                    className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    {safeLabel(t, "nav.support", "Support")}
                  </a>
                  <a
                    href={createPageUrl("TermsOfService")}
                    className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    {safeLabel(t, "nav.terms", "Terms")}
                  </a>
                  <a
                    href={createPageUrl("PrivacyPolicy")}
                    className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    {safeLabel(t, "nav.privacy", "Privacy")}
                  </a>
                </div>
              </div>
            </div>
          </footer>

          <TermsGate user={user} />
          <WhatsNewPopup user={user} />

          <FoundingMemberPopup
            isOpen={showFoundingMemberPopup}
            onClose={async () => {
              setShowFoundingMemberPopup(false);
              try {
                await base44.auth.updateMe({
                  foundingMemberAcknowledged: true,
                });
                await queryClient.invalidateQueries({
                  queryKey: ["current-user"],
                });
              } catch (err) {
                console.error(
                  "Failed to update founding member status:",
                  err
                );
              }
            }}
          />

          {showSubscribePrompt ? (
            <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-2xl bg-gradient-to-br from-[#2a1f18] to-[#1f1510] border border-[#A35C5C]/60 shadow-2xl p-6">
                <h3 className="text-[#E0D8C8] text-xl font-bold mb-2">
                  {safeLabel(
                    t,
                    "subscription.trialEndedTitle",
                    "Your trial has ended"
                  )}
                </h3>
                <p className="text-[#E0D8C8]/80 mb-5">
                  {safeLabel(
                    t,
                    "subscription.trialEndedBody",
                    "Continue free or subscribe to unlock Pro features."
                  )}
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => setShowSubscribePrompt(false)}
                  >
                    {safeLabel(
                      t,
                      "subscription.continueFree",
                      "Continue Free"
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowSubscribePrompt(false);
                      navigate(createPageUrl("Subscription"));
                    }}
                  >
                    {safeLabel(t, "subscription.subscribe", "Subscribe")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {import.meta.env.DEV ? (
            <>
              <EntitlementDebug />
              <PermissionDebugPanel />
            </>
          ) : null}

          <FeatureQuickAccess
            isOpen={showQuickAccess}
            onClose={() => setShowQuickAccess(false)}
          />

          {iapToast ? (
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
          ) : null}

          {ios ? (
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
              Bridge: ✅ |{" "}
              {subActive
                ? "Pro ✅"
                : safeLabel(t, "subscription.free", "Free")}
            </div>
          ) : null}
        </div>
      </MeasurementProvider>
    </GlobalErrorBoundary>
  );
}