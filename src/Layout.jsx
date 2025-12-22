import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { Home, Leaf, Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const PIPE_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/021ed482a_smoking-pipe-silhouette-vintage-accessories-icon-sign-and-symbol-tobacco-pipe-illustration-vector.jpg';
const PIPEKEEPER_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/3f43b2c60_c99ec0e5-668b-4b5a-aecc-ff0c0bd38831_15327876.png';

const navItems = [
  { name: 'Home', page: 'Home', icon: Home, isIconComponent: true },
  { name: 'Pipes', page: 'Pipes', icon: PIPE_ICON, isIconComponent: false },
  { name: 'Tobacco', page: 'Tobacco', icon: Leaf, isIconComponent: true },
  { name: 'Profile', page: 'Profile', icon: User, isIconComponent: true },
];

function NavLink({ item, currentPage, onClick }) {
  const isActive = currentPage === item.page;
  
  return (
    <Link 
      to={createPageUrl(item.page)} 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium",
        isActive 
          ? "bg-amber-100 text-amber-800" 
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
      )}
    >
      {item.isIconComponent ? (
        <item.icon className="w-5 h-5" />
      ) : (
        <img src={item.icon} alt={item.name} className="w-5 h-5 object-contain mix-blend-multiply" />
      )}
      {item.name}
    </Link>
  );
}

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <img 
                src={PIPEKEEPER_LOGO}
                alt="PipeKeeper"
                className="w-8 h-8 object-contain"
              />
              <span className="font-bold text-xl text-stone-800">PipeKeeper</span>
            </Link>
            <div className="flex items-center gap-1">
              {navItems.map(item => (
                <NavLink key={item.page} item={item} currentPage={currentPageName} />
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-200">
        <div className="flex items-center justify-between h-14 px-4">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <img 
              src={PIPEKEEPER_LOGO}
              alt="PipeKeeper"
              className="w-7 h-7 object-contain"
            />
            <span className="font-bold text-lg text-stone-800">PipeKeeper</span>
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col gap-2 mt-8">
                {navItems.map(item => (
                  <NavLink 
                    key={item.page} 
                    item={item} 
                    currentPage={currentPageName}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16 md:pt-16">
        {children}
      </main>
    </div>
  );
}