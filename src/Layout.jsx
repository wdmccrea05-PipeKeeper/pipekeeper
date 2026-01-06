import React from 'react';
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { cn } from "@/lib/utils";
import { Home, Leaf, Menu, X, User, UserPlus, HelpCircle, Users, Crown, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isIOSCompanionApp } from "@/components/utils/companion";
import AgeGate from "@/pages/AgeGate";
import DocumentTitle from "@/components/DocumentTitle";


const PIPEKEEPER_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6be04be36_Screenshot2025-12-22at33829PM.png';
const PIPE_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/dd0287dd6_pipe_no_bg.png';

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
        "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors",
        isActive 
          ? "bg-[#8b3a3a] text-[#e8d5b7]" 
          : isMobile 
            ? "text-[#1a2c42] hover:bg-[#8b3a3a]/10"
            : "text-[#e8d5b7]/70 hover:bg-[#8b3a3a]/50 hover:text-[#e8d5b7]"
      )}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {item.isIconComponent ? (
        <item.icon className="w-5 h-5" />
      ) : (
        <img 
          src={item.icon} 
          alt={item.name} 
          className="w-10 h-10 object-contain"
          style={{
            filter: isActive 
              ? 'brightness(0) saturate(100%) invert(91%) sepia(13%) saturate(485%) hue-rotate(330deg) brightness(100%) contrast(91%)'
              : isMobile
                ? 'brightness(0) saturate(100%) invert(12%) sepia(24%) saturate(1391%) hue-rotate(178deg) brightness(96%) contrast(90%)'
                : 'brightness(0) saturate(100%) invert(91%) sepia(13%) saturate(485%) hue-rotate(330deg) brightness(100%) contrast(91%) opacity(0.7)'
          }}
        />
      )}
      {item.name}
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
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#243548]/60 border border-[#8b3a3a]/60 rounded-2xl p-8 text-center">
          <p className="text-[#e8d5b7] text-lg font-semibold mb-2">Login required</p>
          {isIOSCompanionApp() && (
            <p className="text-[#e8d5b7]/80 text-sm mb-4">
              In the iOS companion app, please sign in using your email and password.
            </p>
          )}
          <p className="text-[#e8d5b7]/70 mb-6">Your session may have expired. Please log in again.</p>
          <Button onClick={() => base44.auth.redirectToLogin()}>Log In</Button>
        </div>
      </div>
    );
  }

  const EXTENDED_TRIAL_END = new Date('2026-01-15T23:59:59');
  const now = new Date();
  const isBeforeExtendedTrialEnd = now < EXTENDED_TRIAL_END;
  const isWithinSevenDayTrial = user?.created_date ? 
    now.getTime() - new Date(user.created_date).getTime() < 7 * 24 * 60 * 60 * 1000 : false;
  const isWithinTrial = isBeforeExtendedTrialEnd || isWithinSevenDayTrial;
  const hasPaidAccess = user?.subscription_level === 'paid' || isWithinTrial;

  return (
    <>
      <DocumentTitle title="PipeKeeper" />
      <div className="min-h-screen bg-[#1a2c42]">
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-[#1a2c42]/95 backdrop-blur-lg border-b border-[#8b3a3a]">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="flex items-center justify-between h-16 gap-4">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3 flex-shrink-0">
              <img 
                src={PIPEKEEPER_LOGO}
                alt="PipeKeeper"
                className="w-8 h-8 object-contain"
              />
              <span className="font-bold text-xl text-[#e8d5b7]">PipeKeeper</span>
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
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#1a2c42] border-b border-[#8b3a3a]">
        <div className="flex items-center justify-between h-14 px-4">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <img 
              src={PIPEKEEPER_LOGO}
              alt="PipeKeeper"
              className="w-7 h-7 object-contain"
            />
            <span className="font-bold text-lg text-[#e8d5b7]">PipeKeeper</span>
            </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMobileOpen(prev => !prev);
            }}
            className="text-[#e8d5b7] p-2 -mr-2 active:scale-95 transition-transform"
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
        <div className="max-w-7xl mx-auto px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-[#e8d5b7]/70 hover:text-[#e8d5b7] hover:bg-[#8b3a3a]/20 mb-4 mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a2c42]/95 border-t border-[#8b3a3a] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img 
                src={PIPEKEEPER_LOGO}
                alt="PipeKeeper"
                className="w-5 h-5 object-contain"
              />
              <span className="text-sm text-[#e8d5b7]/70">© 2025 PipeKeeper. All rights reserved.</span>
            </div>
            <div className="flex gap-6">
              <a href={createPageUrl('FAQ')} className="text-sm text-[#e8d5b7]/70 hover:text-[#e8d5b7] transition-colors">
                FAQ
              </a>
              <a href={createPageUrl('Support')} className="text-sm text-[#e8d5b7]/70 hover:text-[#e8d5b7] transition-colors">
                Support
              </a>
              <a href={createPageUrl('TermsOfService')} className="text-sm text-[#e8d5b7]/70 hover:text-[#e8d5b7] transition-colors">
                Terms of Service
              </a>
              <a href={createPageUrl('PrivacyPolicy')} className="text-sm text-[#e8d5b7]/70 hover:text-[#e8d5b7] transition-colors">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
      </div>
      </>
      );
      }