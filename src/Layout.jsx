import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { cn } from "@/lib/utils";
import { Home, Menu, X, User, HelpCircle, Users, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { hasPremiumAccess } from "@/components/utils/premiumAccess";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isCompanionApp } from "@/components/utils/companion";
import AgeGate from "@/pages/AgeGate";
import DocumentTitle from "@/components/DocumentTitle";
import TermsGate from "@/components/TermsGate";
import { PipeIcon as PipeKeeperPipeIcon, TobaccoLeafIcon } from "@/components/icons/PipeKeeperIcons";

const PIPEKEEPER_LOGO =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6be04be36_Screenshot2025-12-22at33829PM.png';

const navItems = [
  { name: 'Home', page: 'Home', icon: Home },
  { name: 'Pipes', page: 'Pipes', icon: PipeKeeperPipeIcon },
  { name: 'Tobacco', page: 'Tobacco', icon: TobaccoLeafIcon },
  { name: 'Community', page: 'Community', icon: Users, isPremium: true },
  { name: 'Profile', page: 'Profile', icon: User },
  { name: 'Help', page: 'FAQ', icon: HelpCircle },
];

function NavLink({ item, currentPage, onClick, hasPaidAccess, isMobile = false }) {
  const isActive = currentPage === item.page;

  return (
    <Link
      to={createPageUrl(item.page)}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors",
        isActive
          ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow"
          : isMobile
            ? "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.10)]"
            : "text-[hsl(var(--foreground)/0.75)] hover:bg-[hsl(var(--secondary)/0.60)] hover:text-[hsl(var(--foreground))]"
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      aria-current={isActive ? 'page' : undefined}
    >
      <item.icon className="w-5 h-5" />
      <span>{item.name}</span>
      {item.isPremium && !hasPaidAccess && (
        <Crown className="w-3 h-3 text-amber-500" />
      )}
    </Link>
  );
}

const AGE_GATE_KEY = "pk_age_confirmed";

/**
 * Hard-enforced PipeKeeper theme tokens
 * Base44 sometimes injects a light theme after load; we re-apply if it changes.
 */
function applyPipeKeeperTheme() {
  const root = document.documentElement;
  root.classList.add("dark");

  const vars = {
    "--background": "214 53% 9%",          // #0b1624
    "--foreground": "40 75% 87%",          // #f7e7c6
    "--card": "214 47% 14%",               // #132235
    "--card-foreground": "40 75% 87%",
    "--popover": "214 47% 14%",
    "--popover-foreground": "40 75% 87%",
    "--primary": "0 41% 39%",              // #8b3a3a
    "--primary-foreground": "40 75% 87%",
    "--secondary": "212 33% 21%",          // #243548
    "--secondary-foreground": "40 75% 87%",
    "--accent": "37 52% 81%",              // #e8d5b7
    "--accent-foreground": "214 53% 9%",
    "--muted": "213 43% 18%",              // #1a2c42
    "--muted-foreground": "39 45% 78%",
    "--border": "37 20% 30%",
    "--input": "37 20% 30%",
    "--ring": "37 52% 81%",
    "--radius": "1rem",
  };

  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

  // force body colors (Base44 sometimes sets body bg to white)
  document.body.style.background = `hsl(${vars["--background"]})`;
  document.body.style.color = `hsl(${vars["--foreground"]})`;
  document.body.style.minHeight = "100vh";
}

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [ageConfirmed, setAgeConfirmed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AGE_GATE_KEY) === "true";
    }
    return false;
  });

  const queryClient = useQueryClient();

  // Theme enforcement on mount + guard against later overrides
  React.useEffect(() => {
    applyPipeKeeperTheme();

    const obs = new MutationObserver(() => {
      // If Base44 (or any lib) flips body back to white, re-apply
      const bg = getComputedStyle(document.body).backgroundColor;
      // rgb(255, 255, 255) or similar
      if (bg && bg.includes("255, 255, 255")) {
        applyPipeKeeperTheme();
      }
    });

    obs.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] });
    return () => obs.disconnect();
  }, []);

  // Clear query cache on logout signal
  React.useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'logout') {
        queryClient.removeQueries({
          predicate: (query) => query.queryKey[0] !== 'current-user'
        });
        setTimeout(() => window.location.reload(), 100);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient]);

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      return userData;
    },
    staleTime: 10000,
    retry: 2,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Show age gate before authentication
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

  // Loading state
  if (userLoading) {
    return (
      <div className="pk-page flex items-center justify-center">
        <div className="text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6838e48a7_IMG_4833.jpeg"
            alt="PipeKeeper"
            className="w-32 h-32 mx-auto mb-4 object-contain animate-pulse"
          />
          <p className="text-[hsl(var(--foreground)/0.80)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Pages that should remain viewable without login
  const PUBLIC_PAGES = new Set([
    'FAQ',
    'Support',
    'TermsOfService',
    'PrivacyPolicy',
    'Invite',
    'PublicProfile',
    'Index',
  ]);

  // If logged out, do NOT render the app shell for private pages
  if ((userError || !user?.email) && !PUBLIC_PAGES.has(currentPageName)) {
    return (
      <div className="pk-page flex items-center justify-center p-4">
        <div className="pk-card max-w-md w-full p-8 text-center">
          <p className="text-[hsl(var(--foreground))] text-lg font-semibold mb-2">Login required</p>
          {isCompanionApp() && (
            <p className="text-[hsl(var(--foreground)/0.80)] text-sm mb-4">
              In the companion app, please sign in using your email and password.
            </p>
          )}
          <p className="text-[hsl(var(--foreground)/0.70)] mb-6">Your session may have expired. Please log in again.</p>
          <Button onClick={() => base44.auth.redirectToLogin()}>Log In</Button>
        </div>
      </div>
    );
  }

  const hasPaidAccess = hasPremiumAccess(user);

  return (
    <>
      <style>{`
        /* Global surfaces */
        body {
          background: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
          background-image:
            radial-gradient(1200px 600px at 20% -10%, hsl(var(--accent) / 0.12), transparent 55%),
            radial-gradient(900px 500px at 85% 0%, hsl(var(--primary) / 0.14), transparent 55%),
            radial-gradient(900px 700px at 50% 110%, hsl(var(--secondary) / 0.35), transparent 55%) !important;
          background-attachment: fixed;
        }

        /* Shared layout helpers */
        .pk-page { min-height: 100vh; }
        .pk-shell { margin: 0 auto; width: 100%; max-width: 72rem; padding-left: 1.5rem; padding-right: 1.5rem; }

        /* Core card language: used across Home + AI Tobacconist + lists */
        .pk-card {
          border-radius: 1rem;
          border: 1px solid hsl(var(--border) / 0.65);
          background: hsl(var(--card) / 0.70);
          backdrop-filter: blur(10px);
          box-shadow: 0 18px 60px -40px rgba(0, 0, 0, 0.90);
        }

        .pk-panel {
          border-radius: 1rem;
          border: 1px solid hsl(var(--border) / 0.60);
          background: hsl(var(--card) / 0.55);
          backdrop-filter: blur(10px);
        }

        /* Tabs: makes all AI Tobacconist tabs consistent */
        .pk-tabsList {
          border-radius: 0.9rem;
          border: 1px solid hsl(var(--border) / 0.60);
          background: hsl(var(--secondary) / 0.60);
          padding: 0.25rem;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .pk-tab {
          border-radius: 0.75rem;
          color: hsl(var(--foreground) / 0.72);
          transition: background 160ms ease, color 160ms ease, transform 160ms ease;
        }
        .pk-tab:hover { color: hsl(var(--foreground)); background: hsl(var(--accent) / 0.10); }
        .pk-tab[data-state="active"] {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          box-shadow: 0 8px 28px -18px rgba(0,0,0,0.80);
        }
      `}</style>

      <DocumentTitle title="PipeKeeper" />
      <TermsGate user={user}>
        <div className="pk-page">
          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b shadow"
            style={{ background: "hsl(var(--background) / 0.85)", borderColor: "hsl(var(--border) / 0.75)" }}
          >
            <div className="pk-shell">
              <div className="flex items-center justify-between h-16 gap-4">
                <Link to={createPageUrl('Home')} className="flex items-center gap-3 flex-shrink-0">
                  <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="w-8 h-8 object-contain" />
                  <span className="font-bold text-xl text-[hsl(var(--foreground))]">PipeKeeper</span>
                </Link>
                <div className="flex items-center gap-2 flex-1 justify-center max-w-3xl">
                  {navItems.map(item => (
                    <NavLink key={item.page} item={item} currentPage={currentPageName} hasPaidAccess={hasPaidAccess} />
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* Mobile Navigation */}
          <nav
            className="md:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b shadow"
            style={{ background: "hsl(var(--background) / 0.85)", borderColor: "hsl(var(--border) / 0.75)" }}
          >
            <div className="flex items-center justify-between h-14 px-4">
              <Link to={createPageUrl('Home')} className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="w-7 h-7 object-contain" />
                <span className="font-bold text-lg text-[hsl(var(--foreground))]">PipeKeeper</span>
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileOpen(prev => !prev);
                }}
                className="p-2 -mr-2 rounded-xl active:scale-95 transition-all duration-200"
                style={{ color: "hsl(var(--foreground))", WebkitTapHighlightColor: 'transparent' }}
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
            style={{ top: '56px' }}
          />

          {/* Mobile Menu Panel */}
          <div
            className={cn(
              "md:hidden fixed top-14 right-0 w-64 h-[calc(100vh-56px)] z-50 shadow-xl overflow-y-auto transition-transform duration-200",
              mobileOpen ? "translate-x-0" : "translate-x-full"
            )}
            style={{ background: "hsl(var(--background))" }}
          >
            <div className="flex flex-col gap-2 p-4">
              {navItems.map(item => (
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
          <main className="pt-16 md:pt-16 pb-20">
            {children}
          </main>

          {/* Footer */}
          <footer
            className="border-t mt-auto"
            style={{ background: "hsl(var(--background) / 0.85)", borderColor: "hsl(var(--border) / 0.75)" }}
          >
            <div className="pk-shell py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="w-5 h-5 object-contain" />
                  <span className="text-sm text-[hsl(var(--foreground)/0.70)]">© 2025 PipeKeeper. All rights reserved.</span>
                </div>
                <div className="flex gap-6">
                  <a href={createPageUrl('FAQ')} className="text-sm text-[hsl(var(--foreground)/0.70)] hover:text-[hsl(var(--foreground))] hover:underline">FAQ</a>
                  <a href={createPageUrl('Support')} className="text-sm text-[hsl(var(--foreground)/0.70)] hover:text-[hsl(var(--foreground))] hover:underline">Support</a>
                  <a href={createPageUrl('TermsOfService')} className="text-sm text-[hsl(var(--foreground)/0.70)] hover:text-[hsl(var(--foreground))] hover:underline">Terms of Service</a>
                  <a href={createPageUrl('PrivacyPolicy')} className="text-sm text-[hsl(var(--foreground)/0.70)] hover:text-[hsl(var(--foreground))] hover:underline">Privacy Policy</a>
                </div>
              </div>
            </div>
          </footer>

        </div>
      </TermsGate>
    </>
  );
}