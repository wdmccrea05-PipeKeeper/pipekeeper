import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Sparkles, Users, User, HelpCircle, Shield, ClipboardList, Wrench, FileText } from "lucide-react";

function isModuleEnabled(user, key) {
  return user?.activeModules?.[key] === true;
}

export default function TopNavigation({
  user,
  languageSelector = null,
  quickAccess = null,
}) {
  const location = useLocation();

  const pipeEnabled =
    isModuleEnabled(user, "pipekeeper") || isModuleEnabled(user, "pipe");
  const whiskeyEnabled =
    isModuleEnabled(user, "whiskeykeeper") || isModuleEnabled(user, "whiskey");

  const isAdmin =
    user?.role === "admin" ||
    user?.is_admin === true ||
    user?.isAdmin === true;

  const baseLinkClass =
    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border";
  const activeClass =
    "bg-[rgba(163,92,92,0.18)] border-[rgba(180,140,75,0.35)] text-[#F5F1E7]";
  const inactiveClass =
    "bg-transparent border-transparent text-[#D8C7A6] hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(180,140,75,0.18)] hover:text-[#F5F1E7]";

  const navItems = [
    { to: "/", label: "Hub", icon: Home, match: (p) => p === "/" || p.startsWith("/hub") },

    ...(pipeEnabled
      ? [{ to: "/PipeKeeper", label: "PipeKeeper", icon: null, match: (p) => p.startsWith("/Pipe") || p.startsWith("/Tobacco") || p.startsWith("/PipeKeeper") }]
      : []),

    ...(whiskeyEnabled
      ? [{ to: "/WhiskeyKeeper", label: "WhiskeyKeeper", icon: null, match: (p) => p.startsWith("/Whiskey") || p.startsWith("/Bottle") || p.startsWith("/WhiskeyKeeper") }]
      : []),

    { to: "/Curator", label: "Curator", icon: Sparkles, match: (p) => p.startsWith("/Curator") },
    { to: "/Community", label: "Community", icon: Users, match: (p) => p.startsWith("/Community") },
    { to: "/Profile", label: "Profile", icon: User, match: (p) => p.startsWith("/Profile") },
    { to: "/Help", label: "Help", icon: HelpCircle, match: (p) => p.startsWith("/Help") },

    ...(isAdmin
      ? [
          { to: "/AdminReports", label: "Admin Reports", icon: Shield, match: (p) => p.startsWith("/AdminReports") },
          { to: "/SubscriptionRequests", label: "Subscription Requests", icon: ClipboardList, match: (p) => p.startsWith("/SubscriptionRequests") },
          { to: "/SubscriptionTools", label: "Subscription Tools", icon: Wrench, match: (p) => p.startsWith("/SubscriptionTools") },
          { to: "/UserReport", label: "User Report", icon: FileText, match: (p) => p.startsWith("/UserReport") },
        ]
      : []),
  ];

  return (
    <div className="w-full border-b border-[rgba(180,140,75,0.14)] bg-[#120a06]">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/logos/collectionkeeper.png"
            alt="CollectionKeeper"
            className="h-11 w-auto shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="text-[#F5F1E7] text-[2rem] leading-none font-semibold font-serif">
            CollectionKeeper
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {languageSelector}
          {quickAccess}
        </div>
      </div>

      <div className="px-6 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const active = item.match(location.pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                to={item.to}
                className={`${baseLinkClass} ${active ? activeClass : inactiveClass}`}
              >
                {Icon ? <Icon className="w-4 h-4" /> : null}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
