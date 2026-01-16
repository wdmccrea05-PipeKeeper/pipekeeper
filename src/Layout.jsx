import React from "react";
import { Link } from "react-router-dom";
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

const PIPEKEEPER_LOGO =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6be04be36_Screenshot2025-12-22at33829PM.png";
const PIPE_ICON =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/15563e4ee_PipeiconUpdated-fotor-20260110195319.png";

const navItems = [
  { name: "Home", page: "Home", icon: Home, isIconComponent: true },
  { name: "Pipes", page: "Pipes", icon: PIPE_ICON, isIconComponent: false },
  { name: isAppleBuild ? "Cellar" : "Tobacco", page: "Tobacco", icon: Leaf, isIconComponent: true },

  ...(FEATURES.community
    ? [{ name: "Community", page: "Community", icon: Users, isIconComponent: true, isPremium: true }]
    : []),

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

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [ageConfirmed, setAgeConfirmed] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(AGE_GATE_KEY) === "true";
    }
    return false;
  });

  const queryClient = useQueryClient();

  const { data: user, error: userError } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const userData = await base44.auth.me();
      return userData;
    },
    staleTime: 10000,
    retry: 2,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

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

  const PUBLIC_PAGES = new Set([
    "FAQ",
    "Support",
    "TermsOfService",
    "PrivacyPolicy",
    "Invite",
    "PublicProfile",
    "Index",
  ]);

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
          <p className="text-[#e8d5b7]/70 mb-6">
            Your session may have expired. Please log in again.
          </p>
          <Button onClick={() => base44.auth.redirectToLogin()}>Log In</Button>
        </div>
      </div>
    );
  }

  const hasPaidAccess = hasPremiumAccess(user);

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
                <Link
                  to={createPageUrl("FAQ")}
                  className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline"
                >
                  FAQ
                </Link>

                <Link
                  to={createPageUrl("Troubleshooting")}
                  className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline"
                >
                  Troubleshooting
                </Link>

                <Link
                  to={createPageUrl("Support")}
                  className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline"
                >
                  Support
                </Link>

                {/* view=1 prevents startup-legal redirect logic from treating it as a launch route */}
                <Link
                  to={`${createPageUrl("TermsOfService")}?view=1`}
                  className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline"
                >
                  Terms of Service
                </Link>

                <Link
                  to={`${createPageUrl("PrivacyPolicy")}?view=1`}
                  className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-all duration-200 hover:underline"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Terms overlay */}
      <TermsGate user={user} />
    </>
  );
}