import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { Home, Leaf, Menu, X, User, UserPlus, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const PIPEKEEPER_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6be04be36_Screenshot2025-12-22at33829PM.png';
const PIPE_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/dd0287dd6_pipe_no_bg.png';

const navItems = [
  { name: 'Home', page: 'Home', icon: Home, isIconComponent: true },
  { name: 'Pipes', page: 'Pipes', icon: PIPE_ICON, isIconComponent: false },
  { name: 'Tobacco', page: 'Tobacco', icon: Leaf, isIconComponent: true },
  { name: 'Profile', page: 'Profile', icon: User, isIconComponent: true },
  { name: 'Help', page: 'FAQ', icon: HelpCircle, isIconComponent: true },
];

function NavLink({ item, currentPage, onClick }) {
  const isActive = currentPage === item.page;
  
  const isMobile = window.innerWidth < 768;
  
  return (
    <Link 
      to={createPageUrl(item.page)} 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium touch-manipulation",
        isActive 
          ? "bg-[#8b3a3a] text-[#e8d5b7]" 
          : isMobile 
            ? "text-[#1a2c42] hover:bg-[#8b3a3a]/10"
            : "text-[#e8d5b7]/70 hover:bg-[#8b3a3a]/50 hover:text-[#e8d5b7]"
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
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
    </Link>
  );
}

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#1a2c42]">
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-[#1a2c42]/95 backdrop-blur-lg border-b border-[#8b3a3a]">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <img 
                src={PIPEKEEPER_LOGO}
                alt="PipeKeeper"
                className="w-8 h-8 object-contain"
              />
              <span className="font-bold text-xl text-[#e8d5b7]">PipeKeeper</span>
            </Link>
            <div className="flex items-center gap-2">
              {navItems.map(item => (
                <NavLink key={item.page} item={item} currentPage={currentPageName} />
              ))}
              <Link 
                to={createPageUrl('Invite')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium",
                  currentPageName === 'Invite'
                    ? "bg-[#8b3a3a] text-[#e8d5b7]" 
                    : "text-[#e8d5b7]/70 hover:bg-[#8b3a3a]/50 hover:text-[#e8d5b7]"
                )}
              >
                <UserPlus className="w-5 h-5" />
                Invite
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#1a2c42]/95 backdrop-blur-lg border-b border-[#8b3a3a]" style={{ willChange: 'transform' }}>
        <div className="flex items-center justify-between h-14 px-4">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <img 
              src={PIPEKEEPER_LOGO}
              alt="PipeKeeper"
              className="w-7 h-7 object-contain"
            />
            <span className="font-bold text-lg text-[#e8d5b7]">PipeKeeper</span>
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[#e8d5b7] touch-manipulation">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64" style={{ willChange: 'transform' }}>
              <div className="flex flex-col gap-2 mt-8">
                {navItems.map(item => (
                  <NavLink 
                    key={item.page} 
                    item={item} 
                    currentPage={currentPageName}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
                <Link 
                  to={createPageUrl('Invite')}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium touch-manipulation",
                    currentPageName === 'Invite'
                      ? "bg-[#8b3a3a] text-[#e8d5b7]" 
                      : "text-[#1a2c42] hover:bg-[#8b3a3a]/10"
                  )}
                >
                  <UserPlus className="w-5 h-5" />
                  Invite
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16 md:pt-16 pb-20">
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
              <Link to={createPageUrl('FAQ')} className="text-sm text-[#e8d5b7]/70 hover:text-[#e8d5b7] transition-colors">
                FAQ
              </Link>
              <Link to={createPageUrl('Support')} className="text-sm text-[#e8d5b7]/70 hover:text-[#e8d5b7] transition-colors">
                Support
              </Link>
              <Link to={createPageUrl('TermsOfService')} className="text-sm text-[#e8d5b7]/70 hover:text-[#e8d5b7] transition-colors">
                Terms of Service
              </Link>
              <Link to={createPageUrl('PrivacyPolicy')} className="text-sm text-[#e8d5b7]/70 hover:text-[#e8d5b7] transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}