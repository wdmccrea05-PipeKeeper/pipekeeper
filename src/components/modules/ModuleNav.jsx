import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { cn } from "@/lib/utils";
import {
  Home,
  User,
  HelpCircle,
  Target,
  Users,
  Shield,
  ClipboardList,
  Wrench,
  FileBarChart2,
  BarChart3,
  TestTube2,
} from "lucide-react";
import {
  MODULE_ICONS,
  getAssetImageStyle,
} from "@/components/branding/moduleAssets";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { isModuleEnabled } from "@/components/utils/moduleGuard";

function NavItem({ item, isActive }) {
  return (
    <Link
      to={createPageUrl(item.page)}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        isActive ? "bg-[#6b4a2d]/55" : "hover:bg-white/5"
      )}
      style={{
        color: isActive ? "#F5F1E7" : "rgba(224,216,200,0.78)",
        border: isActive
          ? "1px solid rgba(180,140,75,0.35)"
          : "1px solid transparent",
      }}
    >
      {item.image ? (
        <img
          src={item.image}
          alt={item.label}
          className="w-4 h-4 object-contain bg-transparent flex-shrink-0"
          style={getAssetImageStyle(item.assetKey, "small")}
          draggable={false}
        />
      ) : item.icon ? (
        <item.icon
          className="w-4 h-4 flex-shrink-0"
          style={{ color: isActive ? "#D4A574" : "rgba(180,140,75,0.78)" }}
        />
      ) : null}
      <span className="line-clamp-1">{item.label}</span>
    </Link>
  );
}

export default function ModuleNav({ currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAdmin } = useCurrentUser();
  const location = useLocation();

  const allItems = [
    { page: "CollectionHub", label: "Hub", icon: Home, path: "/" },
    {
      page: "PipeKeeper",
      label: "PipeKeeper",
      image: MODULE_ICONS.pipekeeper,
      assetKey: "pipekeeper",
      path: "/PipeKeeper",
      moduleKey: "pipekeeper",
    },
    {
      page: "WhiskeyKeeper",
      label: "WhiskeyKeeper",
      image: MODULE_ICONS.whiskeykeeper,
      assetKey: "whiskeykeeper",
      path: "/WhiskeyKeeper",
      moduleKey: "whiskeykeeper",
    },
    { page: "Curator", label: "Curator", icon: Target, path: "/Curator" },
    { page: "Community", label: "Community", icon: Users, path: "/Community" },
    { page: "Profile", label: "Profile", icon: User, path: "/Profile" },
    { page: "HelpCenter", label: "Help", icon: HelpCircle, path: "/HelpCenter" },
    ...(isAdmin
      ? [
          {
            page: "AdminReports",
            label: "Admin Reports",
            icon: Shield,
            path: "/AdminReports",
          },
          {
            page: "AdminSubscriptionRequests",
            label: "Subscription Requests",
            icon: ClipboardList,
            path: "/AdminSubscriptionRequests",
          },
          {
            page: "AdminSubscriptionTools",
            label: "Subscription Tools",
            icon: Wrench,
            path: "/AdminSubscriptionTools",
          },
          {
            page: "UserReport",
            label: "User Report",
            icon: FileBarChart2,
            path: "/UserReport",
          },
          {
            page: "CuratorAnalyticsDashboard",
            label: "Curator Analytics",
            icon: BarChart3,
            path: "/CuratorAnalyticsDashboard",
          },
          {
            page: "SubscriptionE2ETest",
            label: "Sub E2E Test",
            icon: TestTube2,
            path: "/SubscriptionE2ETest",
          },
        ]
      : []),
  ];

  const items = allItems.filter((item) => {
    if (item.moduleKey) {
      return isModuleEnabled(user, item.moduleKey);
    }
    return true;
  });

  return (
    <div className="flex items-center gap-1 pb-1 min-w-0">
      {/* Desktop nav */}
      <div className="hidden md:flex flex-wrap items-center gap-1">
        {items.map((item) => (
          <NavItem
            key={item.page}
            item={item}
            isActive={location.pathname.startsWith(item.path)}
          />
        ))}
      </div>

      {/* Mobile dropdown menu */}
      <div className="md:hidden relative">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
          style={{ color: "rgba(224,216,200,0.78)" }}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>

        {mobileOpen && (
          <div className="absolute top-10 left-0 bg-[#1d1511] border border-[rgba(180,140,75,0.35)] rounded-lg shadow-lg z-50 min-w-[200px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto">
            {items.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all hover:bg-white/5 border-b border-[rgba(180,140,75,0.16)] last:border-b-0 whitespace-nowrap",
                    isActive && "bg-[#6b4a2d]/55"
                  )}
                  style={{
                    color: isActive ? "#F5F1E7" : "rgba(224,216,200,0.78)",
                  }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.label}
                      className="w-4 h-4 object-contain bg-transparent flex-shrink-0"
                      style={getAssetImageStyle(item.assetKey, "small")}
                      draggable={false}
                    />
                  ) : item.icon ? (
                    <item.icon
                      className="w-4 h-4 flex-shrink-0"
                      style={{
                        color: isActive
                          ? "#D4A574"
                          : "rgba(180,140,75,0.78)",
                      }}
                    />
                  ) : null}
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}