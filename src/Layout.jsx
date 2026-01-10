import React from 'react';
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { cn } from "@/lib/utils";
import { Home, Leaf, Menu, X, User, UserPlus, HelpCircle, Users, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { hasPremiumAccess } from "@/components/utils/premiumAccess";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isCompanionApp } from "@/components/utils/companion";
import AgeGate from "@/pages/AgeGate";
import DocumentTitle from "@/components/DocumentTitle";
import TermsGate from "@/components/TermsGate";


const PIPEKEEPER_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6be04be36_Screenshot2025-12-22at33829PM.png';
const PIPE_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/3e419d881_image.png';

const navItems = [
  { name: 'Home', page: 'Home', icon: Home, isIconComponent: true },
  { name: 'Pipes', page: 'Pipes', icon: PIPE_ICON, isIconComponent: false },
  { name: 'Tobacco', page: 'Tobacco', icon: Leaf, isIconComponent: true },
  { name: 'Community', page: 'Community', icon: Users, isIconComponent: true, isPremium: true },
  { name: 'Profile', page: 'Profile', icon: User, isIconComponent: true },
  { name: 'Help', page: 'FAQ', icon: HelpCircle, isIconComponent: true },
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
          ? "bg-gradient-to-r from-[rgb(var(--pk-cta-primary))] to-[rgb(var(--pk-cta-primary-hover))] text-[rgb(var(--pk-text-primary))] shadow-md" 
          : isMobile 
            ? "text-[rgb(var(--pk-bg-primary))] hover:bg-[rgb(var(--pk-gold))]/10"
            : "text-[rgb(var(--pk-text-secondary))] hover:bg-[rgb(var(--pk-gold))]/30 hover:text-[rgb(var(--pk-text-primary))]"
      )}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-current={isActive ? 'page' : undefined}
      role="link"
    >
      {item.isIconComponent ? (
        <item.icon className="w-5 h-5" />
      ) : (
        <img 
          src={item.icon} 
          alt={item.name} 
          className="w-10 h-10 object-contain"
          style={{
            filter: isMobile
              ? 'brightness(0)'
              : isActive 
                ? 'brightness(1.1) sepia(0.6) hue-rotate(10deg) saturate(0.5)'
                : 'brightness(0.9) sepia(0.5) hue-rotate(10deg) saturate(0.4) opacity(0.7)'
          }}
        />
      )}

      <span>{item.name}</span>

      {item.isPremium && !hasPaidAccess && (
        <Crown className="w-3 h-3 text-amber-500" />
      )}
    </Link>
  );
}

const AGE_GATE_KEY = "pk_age_confirmed";

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [ageConfirmed, setAgeConfirmed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AGE_GATE_KEY) === "true";
    }
    return false;
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        const userData = await base44.auth.me();
        return userData;
      } catch (err) {
        console.error('[Layout] Auth error:', err);
        throw err;
      }
    },
    staleTime: 10000,
    retry: 2,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Clear query cache on logout signal, but preserve auth queries briefly
  React.useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'logout') {
        // Remove all queries except current-user to avoid auth race conditions
        queryClient.removeQueries({ 
          predicate: (query) => query.queryKey[0] !== 'current-user' 
        });
        // Reload after a brief delay to let auth state settle
        setTimeout(() => window.location.reload(), 100);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient]);

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

  // Show loading state during authentication
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[rgb(var(--pk-bg-primary))] via-[rgb(var(--pk-bg-secondary))] to-[rgb(var(--pk-bg-primary))] flex items-center justify-center">
        <div className="text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6838e48a7_IMG_4833.jpeg"
            alt="PipeKeeper"
            className="w-32 h-32 mx-auto mb-4 object-contain animate-pulse"
          />
          <p className="text-[rgb(var(--pk-text-primary))]">Loading...</p>
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

  // If the user is logged out / session expired, do NOT render the app shell for private pages
  if ((userError || !user?.email) && !PUBLIC_PAGES.has(currentPageName)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[rgb(var(--pk-bg-primary))] via-[rgb(var(--pk-bg-secondary))] to-[rgb(var(--pk-bg-primary))] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[rgb(var(--pk-bg-secondary))]/60 border border-[rgb(var(--pk-error))]/60 rounded-2xl p-8 text-center">
          <p className="text-[rgb(var(--pk-text-primary))] text-lg font-semibold mb-2">Login required</p>
          {isCompanionApp() && (
            <p className="text-[rgb(var(--pk-text-secondary))] text-sm mb-4">
              In the companion app, please sign in using your email and password.
            </p>
          )}
          <p className="text-[rgb(var(--pk-text-secondary))] mb-6">Your session may have expired. Please log in again.</p>
          <Button onClick={() => base44.auth.redirectToLogin()}>Log In</Button>
        </div>
      </div>
    );
  }

  const hasPaidAccess = hasPremiumAccess(user);

  return (
    <>
      <DocumentTitle title="PipeKeeper" />
      <TermsGate user={user}>
      <div className="min-h-screen bg-gradient-to-br from-[rgb(var(--pk-bg-primary))] via-[rgb(var(--pk-bg-secondary))] to-[rgb(var(--pk-bg-primary))]">
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-[rgb(var(--pk-bg-primary))]/95 backdrop-blur-lg border-b border-[rgb(var(--pk-gold))]/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="flex items-center justify-between h-16 gap-4">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3 flex-shrink-0">
              <img 
                src={PIPEKEEPER_LOGO}
                alt="PipeKeeper"
                className="w-8 h-8 object-contain"
              />
              <span className="font-bold text-xl text-[rgb(var(--pk-text-primary))]">PipeKeeper</span>
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
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[rgb(var(--pk-bg-primary))]/95 backdrop-blur-lg border-b border-[rgb(var(--pk-gold))]/50 shadow-lg">
        <div className="flex items-center justify-between h-14 px-4">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <img 
              src={PIPEKEEPER_LOGO}
              alt="PipeKeeper"
              className="w-7 h-7 object-contain"
            />
            <span className="font-bold text-lg text-[rgb(var(--pk-text-primary))]">PipeKeeper</span>
            </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMobileOpen(prev => !prev);
            }}
            className="text-[rgb(var(--pk-text-primary))] p-2 -mr-2 hover:bg-[rgb(var(--pk-gold))]/20 rounded-lg active:scale-95 transition-all duration-200"
            style={{ WebkitTapHighlightColor: 'transparent' }}
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
          "md:hidden fixed top-14 right-0 w-64 h-[calc(100vh-56px)] bg-white z-50 shadow-xl overflow-y-auto transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}
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
      <footer className="bg-[rgb(var(--pk-bg-primary))]/95 border-t border-[rgb(var(--pk-gold))]/50 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img 
                src={PIPEKEEPER_LOGO}
                alt="PipeKeeper"
                className="w-5 h-5 object-contain"
              />
              <span className="text-sm text-[rgb(var(--pk-text-secondary))]">© 2025 PipeKeeper. All rights reserved.</span>
            </div>
            <div className="flex gap-6">
              <a href={createPageUrl('FAQ')} className="text-sm text-[rgb(var(--pk-text-secondary))] hover:text-[rgb(var(--pk-text-primary))] transition-all duration-200 hover:underline">
                FAQ
              </a>
              <a href={createPageUrl('Support')} className="text-sm text-[rgb(var(--pk-text-secondary))] hover:text-[rgb(var(--pk-text-primary))] transition-all duration-200 hover:underline">
                Support
              </a>
              <a href={createPageUrl('TermsOfService')} className="text-sm text-[rgb(var(--pk-text-secondary))] hover:text-[rgb(var(--pk-text-primary))] transition-all duration-200 hover:underline">
                Terms of Service
              </a>
              <a href={createPageUrl('PrivacyPolicy')} className="text-sm text-[rgb(var(--pk-text-secondary))] hover:text-[rgb(var(--pk-text-primary))] transition-all duration-200 hover:underline">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
      </div>
      </TermsGate>
      </>
      );
      }